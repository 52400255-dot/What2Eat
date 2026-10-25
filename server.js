'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = 4173;
const ROOT = __dirname;
const APP_ORIGIN = `http://${HOST}:${PORT}/`;
const OVERPASS_ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const CACHE_TTL_MS = 10 * 60 * 1000;
const restaurantCache = new Map();
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function buildRestaurantQuery(latitude, longitude, radius) {
  return `[out:json][timeout:20];(node["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${radius},${latitude},${longitude});way["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${radius},${latitude},${longitude});relation["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${radius},${latitude},${longitude}););out center 150;`;
}

async function getRestaurants(latitude, longitude, radius) {
  const cacheKey = `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${radius}`;
  const cached = restaurantCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return { ...cached.data, cached: true };

  const query = buildRestaurantQuery(latitude, longitude, radius);
  const failures = [];
  const controllers = [];
  const requests = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const controller = new AbortController();
    controllers.push(controller);
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'What2Eat/1.0 (OpenStreetMap community data)',
          'Referer': APP_ORIGIN,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!upstream.ok) throw new Error(`${new URL(endpoint).hostname}: HTTP ${upstream.status}`);
      const data = await upstream.json();
      if (!Array.isArray(data.elements)) throw new Error(`${new URL(endpoint).hostname}: dữ liệu trả về không hợp lệ`);
      return data;
    } catch (error) {
      failures.push(error.name === 'AbortError'
        ? `${new URL(endpoint).hostname}: quá thời gian chờ`
        : (error.message || `${new URL(endpoint).hostname}: lỗi kết nối`));
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  });

  try {
    const data = await Promise.any(requests);
    controllers.forEach((controller) => controller.abort());
    restaurantCache.set(cacheKey, { savedAt: Date.now(), data });
    return data;
  } catch (_) {
    if (cached && Date.now() - cached.savedAt < 24 * 60 * 60 * 1000) return { ...cached.data, cached: true, stale: true };
    throw new Error(failures.length ? failures.join(' · ') : 'Các máy chủ Overpass không phản hồi.');
  }
}

async function proxyTile(response, zoom, x, y) {
  if (zoom > 19 || x >= 2 ** zoom || y >= 2 ** zoom) {
    response.writeHead(400);
    response.end('Invalid tile coordinates');
    return;
  }
  const upstreamUrls = [
    `https://a.tile.openstreetmap.fr/hot/${zoom}/${x}/${y}.png`,
    `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
  ];
  const failures = [];
  for (const upstreamUrl of upstreamUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    try {
      const upstream = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
          'User-Agent': 'What2Eat local map integration',
          'Referer': APP_ORIGIN,
        },
        signal: controller.signal,
      });
      if (!upstream.ok) throw new Error(`${new URL(upstreamUrl).hostname}: HTTP ${upstream.status}`);
      const headers = { 'Content-Type': upstream.headers.get('content-type') || 'image/png' };
      for (const name of ['cache-control', 'expires', 'etag', 'last-modified']) {
        const value = upstream.headers.get(name);
        if (value) headers[name] = value;
      }
      if (!headers['cache-control']) headers['cache-control'] = 'public, max-age=604800';
      response.writeHead(200, headers);
      response.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    } catch (error) {
      failures.push(error.name === 'AbortError' ? `${new URL(upstreamUrl).hostname}: timeout` : error.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }
  console.error('Map tile providers failed:', failures.join(' · '));
  response.writeHead(502, { 'Cache-Control': 'no-store' });
  response.end(`Map tile unavailable: ${failures.join(' · ')}`);
}

function serveStatic(response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (_) {
    response.writeHead(400);
    response.end('Bad path');
    return;
  }
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const physicalPath = requestedPath.toLowerCase().endsWith('.php')
    ? `${requestedPath.slice(0, -4)}.html`
    : requestedPath;
  const filePath = path.resolve(ROOT, `.${physicalPath}`);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  const relativePath = path.relative(ROOT, filePath);
  const pathParts = relativePath.split(path.sep);
  const topLevel = (pathParts[0] || '').toLowerCase();
  const publicRoots = new Set(['assets', 'pages', 'admin']);
  const isHomePage = ['index.html', 'index.php'].includes(relativePath.toLowerCase());
  const publicTopLevelFiles = new Set(['manifest.json', 'sw.js', 'offline.html']);
  if ((!isHomePage && !publicTopLevelFiles.has(relativePath.toLowerCase()) && !publicRoots.has(topLevel)) || pathParts.some((part) => part.startsWith('.'))
      || pathParts.some((part) => part.toLowerCase() === 'api' || part.toLowerCase() === 'storage')) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, APP_ORIGIN);
  if (request.method === 'GET' && requestUrl.pathname === '/api/restaurants') {
    const latitude = Number(requestUrl.searchParams.get('lat'));
    const longitude = Number(requestUrl.searchParams.get('lon'));
    const radius = Number(requestUrl.searchParams.get('radius') || 1500);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
      || !Number.isFinite(radius) || radius < 100 || radius > 5000) {
      sendJson(response, 400, { error: 'Tọa độ hoặc bán kính tìm kiếm không hợp lệ.' });
      return;
    }
    try {
      sendJson(response, 200, await getRestaurants(latitude, longitude, radius));
    } catch (error) {
      sendJson(response, 502, { error: `Không lấy được dữ liệu OSM: ${error.message}` });
    }
    return;
  }

  const tileMatch = request.method === 'GET' && requestUrl.pathname.match(/^\/tiles\/(\d{1,2})\/(\d{1,8})\/(\d{1,8})\.png$/);
  if (tileMatch) {
    await proxyTile(response, Number(tileMatch[1]), Number(tileMatch[2]), Number(tileMatch[3]));
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }
  serveStatic(response, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`What2Eat is running at http://${HOST}:${PORT}/`);
  console.log(`Discovery map: http://${HOST}:${PORT}/pages/discovery.php`);
});

server.on('error', (error) => {
  console.error(`What2Eat server failed: ${error.message}`);
  process.exitCode = 1;
});
