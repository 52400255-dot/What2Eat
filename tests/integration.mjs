import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const php = process.env.W2E_TEST_PHP || (process.platform === 'win32' ? 'C:\\xampp\\php\\php.exe' : 'php');
const mysql = process.env.W2E_TEST_MYSQL || (process.platform === 'win32' ? 'C:\\xampp\\mysql\\bin\\mysql.exe' : 'mysql');
const dbUser = process.env.W2E_TEST_DB_USER || 'root';
const dbHost = process.env.W2E_TEST_DB_HOST || '127.0.0.1';
const dbPort = process.env.W2E_TEST_DB_PORT || '3306';
const dbName = `w2e_it_${process.pid}_${Date.now().toString(36)}`;
const mailLogName = `${dbName}.log`;
const mailLogPath = path.join(root, 'storage', mailLogName);
const password = randomBytes(24).toString('hex');
const email = 'integration-admin@example.test';
const mediaKeys = new Set();
const mysqlEnv = { ...process.env, MYSQL_PWD: process.env.W2E_TEST_DB_PASSWORD || '' };

function sql(query, database = null) {
  const args = ['--host', dbHost, '--port', dbPort, '-u', dbUser, '--batch', '--skip-column-names'];
  if (database) args.push('-D', database);
  args.push('-e', query);
  return execFileSync(mysql, args, { cwd: root, env: mysqlEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

let server;
let databaseCreated = false;
try {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env, W2E_MAIL_TRANSPORT: 'log', W2E_ENV: 'development', W2E_BASE_URL: base,
    W2E_APP_SECRET: randomBytes(32).toString('hex'), W2E_DB_HOST: dbHost,
    W2E_DB_PORT: dbPort, W2E_DB_NAME: dbName,
    W2E_DB_USER: dbUser, W2E_DB_PASSWORD: process.env.W2E_TEST_DB_PASSWORD || '', W2E_GOOGLE_CLIENT_ID: '',
    W2E_ADMIN_PASSWORD: password, W2E_ADMIN_NAME: 'Integration Admin', W2E_DEV_MAIL_LOG: mailLogName,
  };
  sql(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  databaseCreated = true;
  execFileSync(php, ['api/bin/migrate.php'], { cwd: root, env, stdio: 'pipe' });
  execFileSync(php, ['api/bin/create-admin.php', email], { cwd: root, env, stdio: 'pipe' });
  server = spawn(php, ['-S', `127.0.0.1:${port}`, '-t', root, path.join(root, 'api/index.php')], { cwd: root, env, stdio: 'ignore' });

  for (let attempt = 0; attempt < 50; attempt++) {
    try { const ready = await fetch(`${base}/api/v1/health`); if (ready.ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  function makeClient() {
    let cookie = '';
    let csrf = '';
    const send = async (route, method = 'GET', body = undefined, expected = 200) => {
      const headers = { Accept: 'application/json' };
      if (cookie) headers.Cookie = cookie;
      if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
      if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
      const response = await fetch(`${base}/api/v1${route}`, { method, headers, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';', 1)[0];
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.text().then(raw=>{try{return JSON.parse(raw);}catch{throw new Error(`${method} ${route}: ${raw.slice(0,2000)}`);}}) : null;
      assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
      if (data?.csrf_token) csrf = data.csrf_token;
      return data;
    };
    send.cookie = () => cookie;
    return send;
  }
  const request = makeClient();
  const userRequest = makeClient();
  const guestRequest = makeClient();

  assert.equal((await request('/health')).schema_version, '20261028_completion');
  await request('/auth/csrf');
  await guestRequest('/auth/csrf');
  assert.equal((await request('/site-info')).google_client_id, '');
  await request('/auth/google', 'POST', { credential: 'invalid-test-token' }, 503);
  await request('/auth/login', 'POST', { email, password });
  await userRequest('/auth/csrf');
  const userEmail = 'integration-user@example.test';
  const userPassword = randomBytes(16).toString('hex');
  await userRequest('/auth/register', 'POST', { name: 'Integration User', email: userEmail, password: userPassword }, 201);
  const mail = readFileSync(mailLogPath, 'utf8');
  const verifyToken = mail.match(/\/api\/v1\/auth\/verify\?token=([A-Za-z0-9_-]+)/)?.[1];
  assert.ok(verifyToken, 'Registration must send a verification link');
  const verifyPage = await fetch(`${base}/api/v1/auth/verify?token=${verifyToken}`, { headers: { Accept: 'text/html' }, redirect: 'manual' });
  assert.equal(verifyPage.status, 303);
  assert.equal(verifyPage.headers.get('location'), '/pages/login.php?verification=success');
  await userRequest('/auth/login', 'POST', { email: userEmail, password: userPassword });
  assert.equal((await userRequest('/auth/me')).user.role, 'user');

  execFileSync(php,['api/bin/import-catalog.php'],{cwd:root,env,stdio:'pipe'});
  const newPlace=await userRequest('/restaurants/proposals','POST',{name:'Cơm quê Dượng kiểm thử',address:'Địa chỉ kiểm thử',latitude:10.7,longitude:106.7},201);
  await guestRequest('/food-notes','POST',{food_name:'Ghi chú không đăng nhập'},401);
  const found=await userRequest('/restaurants/search?q='+encodeURIComponent('COM QUE DUONG'));
  assert.ok(found.data.some(p=>p.id===newPlace.id));
  assert.ok(!(await request('/restaurants/search?q='+encodeURIComponent('COM QUE DUONG'))).data.some(p=>p.id===newPlace.id));
  const pendingNote=await userRequest('/food-notes','POST',{food_name:'Món kiểm thử',price:65000,restaurant_id:newPlace.id,privacy:'private'},201);
  const dishes=await userRequest('/restaurants/dishes?source=managed&id='+newPlace.id);
  assert.equal(dishes.data[0].food_name,'Món kiểm thử');
  assert.equal((await request('/restaurants/dishes?source=managed&id='+newPlace.id)).data.length,0);
  await request('/food-notes','POST',{food_name:'Không được phép',restaurant_id:newPlace.id},422);
  await userRequest('/food-notes/'+pendingNote.data.id,'DELETE',{});
  const snapshot = JSON.parse(readFileSync(path.join(root, 'storage/datasets/hcm-osm-food/hcm_food_places.geojson'), 'utf8'));
  const osmFeature = snapshot.features.find((item) => /^(node|way|relation)\/[1-9]\d*$/.test(item.properties?.source_id || '') && Array.isArray(item.geometry?.coordinates));
  assert.ok(osmFeature, 'OSM snapshot must contain an addressable place');
  const [osmType, osmId] = osmFeature.properties.source_id.split('/');
  const [osmLon, osmLat] = osmFeature.geometry.coordinates;
  const osmRoute = `/restaurants/osm/${osmType}/${osmId}`;
  const osmDetail = await request(`${osmRoute}?lat=${osmLat}&lon=${osmLon}`);
  assert.equal(String(osmDetail.data.id), osmId);
  assert.equal(osmDetail.snapshot, true);
  await guestRequest('/place-corrections','POST',{source_id:osmType+':'+osmId,phone:'0900000000'},401);
  await guestRequest('/favorites','POST',{source:'osm',source_id:osmType+':'+osmId,name:osmDetail.data.tags.name},401);
  await userRequest('/place-corrections','POST',{source_id:osmType+':'+osmId,phone:'0900000000',price_range:'45000'},201);
  const corrections=(await request('/admin/place-corrections')).data;
  await userRequest('/admin/place-corrections/'+corrections[0].id,'PATCH',{status:'approved'},403);
  await request('/admin/place-corrections/'+corrections[0].id,'PATCH',{status:'approved'});
  const enriched=await request(osmRoute+'?lat='+osmLat+'&lon='+osmLon);
  assert.equal(enriched.data.tags.phone,'0900000000');
  assert.equal(enriched.data.tags.price_range,'45000');  assert.equal(enriched.data.verification_status,'unverified');
  await userRequest('/admin/osm-verifications','POST',{source_id:osmType+':'+osmId,status:'verified_active',verification_source:'Kiểm tra trực tiếp',verification_note:'Đã kiểm tra thực tế và ghi nhận quán đang hoạt động.'},403);
  await request('/admin/osm-verifications','POST',{source_id:osmType+':'+osmId,status:'verified_active',verification_source:'Kiểm tra trực tiếp',verification_note:'Đã kiểm tra thực tế và ghi nhận quán đang hoạt động.'});
  const verified=await request(osmRoute+'?lat='+osmLat+'&lon='+osmLon);
  assert.equal(verified.data.verification_status,'verified_active');
  assert.ok(verified.data.verified_at);
  assert.ok(Array.isArray(osmDetail.nearby));
  assert.ok(osmDetail.nearby.every((place) => `${place.type}:${place.id}` !== `${osmType}:${osmId}`));
  const radius = 150;
  const cacheKey = createHash('sha256').update(`osm:${Math.round(osmLat*1000)/1000}:${Math.round(osmLon*1000)/1000}:${radius}`).digest('hex');
  const cachedBody = Buffer.from(JSON.stringify({ elements: [osmDetail.data] }), 'utf8').toString('hex');
  sql(`INSERT INTO api_cache(cache_key,body,cached_at,expires_at) VALUES('${cacheKey}',CONVERT(0x${cachedBody} USING utf8mb4),UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))`, dbName);
  const nearbyRoute = `/restaurants?lat=${osmLat}&lon=${osmLon}&radius=${radius}`;
  assert.equal((await request(nearbyRoute)).elements.length, 1);

  const noteBody = { food_name: 'Integration note', eaten_at: '2026-10-25', price: 45000, rating: 4.5, review: null, privacy: 'public', tags: ['ngon'] };
  const publicNote = await request('/food-notes', 'POST', noteBody, 201);
  const publicId = publicNote.data.id;
  assert.equal(publicNote.data.status, 'pending');
  await request(`/admin/food-notes/${publicId}`, 'PATCH', { status: 'published' });
  assert.equal((await request(`/food-notes/${publicId}/flags`, 'PATCH', { is_pinned: true, is_favorite: true })).data.status, 'published');
  const unchanged = await request(`/food-notes/${publicId}`, 'PUT', noteBody);
  assert.equal(unchanged.data.status, 'published');
  assert.equal(unchanged.data.is_pinned, true);
  assert.equal((await request(`/food-notes/${publicId}`, 'PUT', { ...noteBody, review: 'Updated review' })).data.status, 'pending');
  const osmNote = await userRequest('/food-notes', 'POST', { ...noteBody, food_name: 'Community dish', restaurant_source: 'osm', restaurant_source_id: `${osmType}:${osmId}`, restaurant_name: osmDetail.data.tags.name }, 201);
  await request(`/admin/food-notes/${osmNote.data.id}`, 'PATCH', { status: 'published' });
  assert.equal((await request(`${osmRoute}/notes`)).data[0].food_name, 'Community dish');
  await userRequest(`/food-notes/${osmNote.data.id}`, 'DELETE', {});

  const linked = await request('/food-notes', 'POST', { ...noteBody, food_name: 'Shared note', privacy: 'link' }, 201);
  const linkId = linked.data.id;
  const oldToken = new URL(linked.share_url, base).searchParams.get('share');
  assert.equal((await request(`/food-notes/share/${oldToken}`)).data.id, linkId);
  const rotated = await request(`/food-notes/${linkId}/share`, 'POST', {});
  const newToken = new URL(rotated.share_url, base).searchParams.get('share');
  await request(`/food-notes/share/${oldToken}`, 'GET', undefined, 404);
  assert.equal((await request(`/food-notes/share/${newToken}`)).data.id, linkId);
  assert.equal((await request(`/food-notes/${linkId}/share`, 'DELETE', {})).data.privacy, 'private');
  await request(`/food-notes/share/${newToken}`, 'GET', undefined, 404);

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=', 'base64');
  async function upload() {
    const form = new FormData();
    form.append('media', new Blob([png], { type: 'image/png' }), 'test.png');
    const result = await request(`/food-notes/${linkId}/media`, 'POST', form, 201);
    const key = sql(`SELECT storage_key FROM food_note_media WHERE id=${result.id}`, dbName);
    if (key) mediaKeys.add(key);
    return result;
  }
  const firstMedia = await upload();
  assert.equal((await fetch(`${base}${firstMedia.url}`, { headers: { Cookie: request.cookie() } })).status, 200);
  await request(`/media/${firstMedia.id}`, 'DELETE', {});
  const deletedKey = sql(`SELECT storage_key FROM food_note_media WHERE id=${firstMedia.id}`, dbName);
  assert.equal(deletedKey, '');
  await request(`/media/${firstMedia.id}`, 'GET', undefined, 404);
  await upload();
  const key = sql(`SELECT storage_key FROM food_note_media WHERE food_note_id=${linkId} LIMIT 1`, dbName);
  assert.match(key, /^[a-f0-9]{48}\.png$/);
  assert.equal(existsSync(path.join(root, 'storage/uploads/notes', key)), true);
  await request(`/food-notes/${linkId}`, 'DELETE', {});
  assert.equal(existsSync(path.join(root, 'storage/uploads/notes', key)), false);
  mediaKeys.delete(key);
  await request(`/food-notes/${publicId}`, 'DELETE', {});

  const restaurant = await request('/admin/restaurants', 'POST', { name: 'Integration restaurant', address: 'Test address', latitude: 10.7769, longitude: 106.7009, status: 'published' }, 201);
  const restaurantId = restaurant.id;
  const managedNote = await userRequest('/food-notes', 'POST', { ...noteBody, food_name: 'Managed dish', restaurant_id: restaurantId, restaurant_name: 'Integration restaurant' }, 201);
  await request(`/admin/food-notes/${managedNote.data.id}`, 'PATCH', { status: 'published' });
  assert.equal((await request(`/restaurants/managed/${restaurantId}/notes`)).data[0].food_name, 'Managed dish');
  const starts_at = new Date(Date.now() - 60000).toISOString();
  const ends_at = new Date(Date.now() + 86400000).toISOString();
  await request(`/admin/restaurants/${restaurantId}/sponsorship`, 'PUT', { sponsor_name: 'Integration restaurant', contract_reference: 'TEST-001', starts_at, ends_at, status: 'active' });
  assert.equal((await request(`/restaurants/managed/${restaurantId}`)).data.sponsored, true);
  const nearby = await request('/restaurants/managed?lat=10.7769&lon=106.7009&radius=2000');
  assert.equal(nearby.data.find((item) => item.id === restaurantId)?.sponsored, true);
  await request(`/admin/restaurants/${restaurantId}`, 'PATCH', { status: 'hidden' });
  await request(`/restaurants/managed/${restaurantId}`, 'GET', undefined, 404);
  const hiddenRecord = (await request('/admin/restaurants')).data.find((item) => item.id === restaurantId);
  assert.equal(hiddenRecord.sponsorship_status, 'paused');
  await request(`/admin/restaurants/${restaurantId}`, 'PATCH', { status: 'published' });
  assert.equal((await request(`/restaurants/managed/${restaurantId}`)).data.sponsored, false);
  await request(`/admin/restaurants/${restaurantId}/sponsorship`, 'PUT', { sponsor_name: 'Integration restaurant', starts_at, ends_at, status: 'active' });
  await request(`/admin/restaurants/${restaurantId}/sponsorship`, 'DELETE', {});
  assert.equal((await request(`/restaurants/managed/${restaurantId}`)).data.sponsored, false);
  const reportBody = { source: 'osm', source_id: `${osmType}:${osmId}`, place_name: osmDetail.data.tags.name, latitude: osmLat, longitude: osmLon, reason: 'closed', details: 'Test report' };
  await guestRequest('/place-reports','POST',reportBody,401);
  const report = await userRequest('/place-reports', 'POST', reportBody, 201);
  await userRequest('/place-reports', 'POST', reportBody, 409);
  await userRequest('/admin/place-reports', 'GET', undefined, 403);
  assert.equal((await request('/admin/place-reports')).data[0].id, report.id);
  await request(`/admin/place-reports/${report.id}`, 'PATCH', { status: 'resolved', review_note: 'Checked', hide_place: true });
  assert.equal((await request('/admin/place-reports')).data.length, 0);
  assert.equal((await request('/admin/osm-place-blocks')).data[0].source_id, `${osmType}:${osmId}`);
  await request(`${osmRoute}?lat=${osmLat}&lon=${osmLon}`, 'GET', undefined, 404);
  assert.equal((await request(nearbyRoute)).elements.length, 0);
  await request(`/admin/osm-place-blocks/${osmType}:${osmId}`, 'DELETE', {});
  assert.equal((await request(`${osmRoute}?lat=${osmLat}&lon=${osmLon}`)).data.id, Number(osmId));
  assert.equal((await request(nearbyRoute)).elements.length, 1);
  const favorite = { source: 'admin', source_id: `managed:${restaurantId}`, restaurant_id: restaurantId, name: 'Integration restaurant' };
  assert.equal((await userRequest('/favorites', 'POST', favorite)).favorite, true);
  assert.equal((await userRequest('/favorites')).total, 1);
  assert.equal((await userRequest('/favorites', 'POST', favorite)).favorite, false);
  await userRequest(`/food-notes/${managedNote.data.id}`, 'DELETE', {});

  const plan = await userRequest('/food-plans', 'POST', { name: 'Integration plan' }, 201);
  assert.equal((await request('/food-plans/join', 'POST', { token: plan.invite_token })).id, plan.id);
  const notices=await userRequest('/notifications');assert.equal(notices.unread,1);
  const otherNotice=(await request('/notifications')).data[0];
  await userRequest('/notifications/read','POST',{id:otherNotice.id});assert.equal((await request('/notifications')).unread,1);
  await userRequest('/notifications/read','POST',{});assert.equal((await userRequest('/notifications')).unread,0);
  await request('/food-plans/join','POST',{token:plan.invite_token});assert.equal((await userRequest('/notifications')).unread,0);
  const rotatedInvite=await userRequest('/food-plans/'+plan.id+'/invite','POST',{});assert.ok(rotatedInvite.invite_url.startsWith(base));
  await request('/food-plans/join','POST',{token:plan.invite_token},404);
  const proposal = await userRequest(`/food-plans/${plan.id}/proposals`, 'POST', { source: 'admin', source_id: `managed:${restaurantId}`, restaurant_id: restaurantId, name: 'Integration restaurant' }, 201);
  await request(`/food-plans/${plan.id}/vote`, 'POST', { proposal_id: proposal.id });
  assert.equal((await userRequest(`/food-plans/${plan.id}`)).data.proposals[0].votes, 1);
  await userRequest(`/food-plans/${plan.id}`, 'PATCH', { name: 'Integration plan', status: 'decided' });
  assert.equal((await userRequest(`/food-plans/${plan.id}`)).data.status, 'decided');
  await userRequest('/profile', 'PUT', { name: 'Updated Integration User', preferences: ['viet'] });
  assert.equal((await userRequest('/profile')).user.name, 'Updated Integration User');
  assert.ok((await userRequest('/dashboard')).stats);
  const oldSession = makeClient();
  await oldSession('/auth/csrf');
  await oldSession('/auth/login', 'POST', { email: userEmail, password: userPassword });
  const changedPassword = randomBytes(16).toString('hex');
  await userRequest('/profile/password', 'POST', { current_password: userPassword, new_password: changedPassword });
  assert.equal((await userRequest('/profile')).user.name, 'Updated Integration User');
  await oldSession('/profile', 'GET', undefined, 401);
  await userRequest('/auth/forgot-password', 'POST', { email: userEmail });
  const resetTokens = [...readFileSync(mailLogPath, 'utf8').matchAll(/\/pages\/reset-password\.php\?token=([A-Za-z0-9_-]+)/g)];
  const resetToken = resetTokens.at(-1)?.[1];
  assert.ok(resetToken, 'Password reset must send a token');
  const resetPassword = randomBytes(16).toString('hex');
  await userRequest('/auth/reset-password', 'POST', { token: resetToken, password: resetPassword });
  await userRequest('/profile', 'GET', undefined, 401);
  const newSession = makeClient();await newSession('/auth/csrf');await newSession('/auth/login', 'POST', { email: userEmail, password: resetPassword });
  assert.equal((await newSession('/profile')).user.email, userEmail);
  const userId = (await request(`/admin/users?q=${encodeURIComponent(userEmail)}`)).data.find((item) => item.email === userEmail)?.id;
  const adminId = (await request('/admin/users?role=admin')).data.find((item) => item.email === email)?.id;
  assert.ok(userId && adminId);
  await newSession(`/admin/users/${userId}`, 'DELETE', { confirmation_email: userEmail, admin_password: password }, 403);
  await request(`/admin/users/${adminId}`, 'DELETE', { confirmation_email: email, admin_password: password }, 409);
  await request(`/admin/users/${userId}`, 'DELETE', { confirmation_email: userEmail, admin_password: 'wrong-password' }, 401);
  await request(`/admin/users/${userId}`, 'DELETE', { confirmation_email: 'other@example.test', admin_password: password }, 422);

  const deletionNote = await newSession('/food-notes', 'POST', { food_name: 'Account deletion media', privacy: 'private' }, 201);
  const deletionMedia = new FormData();
  deletionMedia.append('media', new Blob([png], { type: 'image/png' }), 'test.png');
  const uploadedMedia = await newSession(`/food-notes/${deletionNote.data.id}/media`, 'POST', deletionMedia, 201);
  const deletionKey = sql(`SELECT storage_key FROM food_note_media WHERE id=${uploadedMedia.id}`, dbName);
  mediaKeys.add(deletionKey);
  assert.equal(existsSync(path.join(root, 'storage/uploads/notes', deletionKey)), true);

  await request(`/admin/users/${userId}`, 'DELETE', { confirmation_email: userEmail, admin_password: password });
  assert.equal(sql(`SELECT COUNT(*) FROM users WHERE id=${userId}`, dbName), '0');
  assert.equal(sql(`SELECT COUNT(*) FROM food_notes WHERE id=${deletionNote.data.id}`, dbName), '0');
  assert.equal(sql(`SELECT COUNT(*) FROM food_plans WHERE id=${plan.id}`, dbName), '0');
  assert.equal(existsSync(path.join(root, 'storage/uploads/notes', deletionKey)), false);
  mediaKeys.delete(deletionKey);
  await newSession('/profile', 'GET', undefined, 401);
  await request('/auth/register', 'POST', { name: 'Re-registered User', email: userEmail, password: userPassword }, 201);
  const pendingReplacement = (await request('/admin/users?status=pending')).data.find((item) => item.email === userEmail);
  assert.ok(pendingReplacement);
  await request(`/admin/users/${pendingReplacement.id}`, 'PATCH', { status: 'active' }, 422);
  const secondToken = [...readFileSync(mailLogPath, 'utf8').matchAll(/\/api\/v1\/auth\/verify\?token=([A-Za-z0-9_-]+)/g)].at(-1)?.[1];
  assert.ok(secondToken);
  await request(`/auth/verify?token=${secondToken}`);
  const replacement = makeClient();await replacement('/auth/csrf');await replacement('/auth/login', 'POST', { email: userEmail, password: userPassword });
  assert.notEqual((await replacement('/auth/me')).user.id, userId);
  console.log('Integration checks passed: accounts, sessions, admin deletion and email reuse, place details/reports, notes, media, sponsorship, favorites, plans, profile, dashboard.');
} finally {
  if (server) server.kill();
  if (existsSync(mailLogPath)) unlinkSync(mailLogPath);
  for (const key of mediaKeys) {
    const file = path.join(root, 'storage/uploads/notes', key);
    if (existsSync(file)) unlinkSync(file);
  }
  if (databaseCreated) sql(`DROP DATABASE \`${dbName}\``);
}
