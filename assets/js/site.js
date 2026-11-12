/* What2Eat production client: same-origin PHP API, session auth and real records. */
(function () {
  'use strict';

  const API_ROOT = '/api/v1';
  const OSM_CENTER = { lat: 10.7769, lon: 106.7009 };
  const state = { csrf: '', user: null, authChecked: false, backendAvailable: null, osm: [], places: [], managed: [], favoriteKeys: new Set(), center: OSM_CENTER, notes: [], notePage: 1, noteTotal: 0, noteStats: null, plans: [], adminRestaurants: [], adminCategories: [], userPage: 1, userPages: 1, userTotal: 0, userSearchTimer: null, auditPage: 1, auditPages: 1, auditTotal: 0, foodNoteFilter: 'all', foodNotePage: 1, foodNotePages: 1, foodNoteTotal: 0, editRestaurantId: null, editCategoryId: null, sponsorRestaurantId: null, requestedCategory: '' };
  window.W2EApp = state;

  function toast(message, type = 'info') {
    if (window.toast && typeof window.toast[type] === 'function') window.toast[type](message);
    else {
      let box = document.getElementById('w2eApiNotice');
      if (!box) { box = document.createElement('div'); box.id = 'w2eApiNotice'; box.setAttribute('role', 'status'); box.style.cssText = 'position:fixed;z-index:2000;right:18px;bottom:18px;max-width:min(440px,calc(100vw - 36px));padding:12px 16px;border-radius:12px;background:#2b2118;color:#fff;box-shadow:0 8px 28px #0002'; document.body.appendChild(box); }
      box.textContent = message; box.hidden = false; clearTimeout(box._timer); box._timer = setTimeout(() => { box.hidden = true; }, 4500);
    }
  }

  async function api(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    const isForm = options.body instanceof FormData;
    if (options.body && !isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!state.csrf) {
        const csrfResponse = await fetch(`${API_ROOT}/auth/csrf`, { credentials: 'same-origin', cache: 'no-store' });
        if (csrfResponse.ok) state.csrf = (await csrfResponse.json()).csrf_token || '';
      }
      if (state.csrf) headers.set('X-CSRF-Token', state.csrf);
    }
    let response;
    try { response = await fetch(`${API_ROOT}${path}`, { ...options, method, headers, credentials: 'same-origin', cache: 'no-store' }); }
    catch (_) { throw new Error('Không kết nối được máy chủ What2Eat. Hãy kiểm tra kết nối rồi thử lại.'); }
    const type = response.headers.get('content-type') || '';
    const result = type.includes('application/json') ? await response.json() : null;
    if (!response.ok) { const error = new Error(result?.error || `Yêu cầu thất bại (HTTP ${response.status}).`); error.status = response.status; throw error; }
    if (result?.csrf_token) state.csrf = result.csrf_token;
    return result || {};
  }

  function clearLocalNoteDrafts() {
    for (const key of Object.keys(localStorage)) if (key.startsWith('w2e_note_draft_')) localStorage.removeItem(key);
  }

  const text = (value) => value == null ? '' : String(value);
  const normalizeText = (value) => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLocaleLowerCase('vi');
  const cuisinePatterns={viet:/vietnam|viet|pho|banh|bun|com.?tam|do chay/,bbq:/barbecue|\bbbq\b|hot.?pot|shabu|lau|nuong/,japanese:/japan|nhat|sushi|ramen|udon/,korean:/korean|han|kimchi|bulgogi/,fastfood:/fast.?food|do an nhanh|an vat|burger|pizza/,cafe:/cafe|ca phe|caphe|coffee|tea|tra sua|do uong|bubble.?tea/,dessert:/dessert|che|trang mieng|ice.?cream|cake|bakery|confectionery|tiem banh/};
  const categoryAliases={viet:{label:'Món Việt',pattern:/vietnam|viet|pho|bun|banh.?mi|mon viet|do chay/},bbq:{label:'BBQ / Lẩu',pattern:/barbecue|\bbbq\b|hot.?pot|shabu|lau|nuong/},cafe:{label:'Cà phê',pattern:/cafe|ca phe|caphe|coffee/},nhat:{label:'Món Nhật',pattern:/japan|nhat|sushi|ramen|udon/},han:{label:'Món Hàn',pattern:/korean|han|kimchi|bulgogi/},thai:{label:'Món Thái',pattern:/thai|tom.?yum|pad.?thai/},fast:{label:'Ăn nhanh',pattern:/fast.?food|do an nhanh|an vat|burger|pizza/},dessert:{label:'Tráng miệng',pattern:/dessert|che|trang mieng|ice.?cream|cake|bakery|confectionery|tiem banh/},drink:{label:'Đồ uống',pattern:/drink|beverage|tea|tra sua|do uong|juice|bubble.?tea/}};
  const money = (value) => value == null || value === '' ? 'Chưa có dữ liệu giá' : new Intl.NumberFormat('vi-VN').format(Number(value)) + ' ₫';
  const localDate = (value) => { if (!value) return 'Chưa ghi ngày'; const d = new Date(`${String(value).slice(0, 10)}T00:00:00`); return Number.isNaN(d.getTime()) ? text(value) : d.toLocaleDateString('vi-VN'); };
  const todayLocal = () => { const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
  const element = (tag, cls, value) => { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined) node.textContent = value; return node; };
  const placeName = (place) => place?.tags?.name?.trim() || '';
  const placeId = (place) => `${place.type}:${place.id}`;
  const placeCoords = (place) => {
    const coords=Number.isFinite(place?.lat)?[place.lat,place.lon]:[place?.center?.lat,place?.center?.lon];
    // Ignore the common placeholder near 0,0; What2Eat's restaurant catalog is Vietnam-focused.
    return coords.every(Number.isFinite)&&!(Math.abs(coords[0])<0.01&&Math.abs(coords[1])<0.01)?coords:[Number.NaN,Number.NaN];
  };
  const placeUrl = (place) => {
    const url=new URL(location.pathname.includes('/pages/')?'./restaurant.php':'./pages/restaurant.php',location.href);
    if(place?.managed_record)url.searchParams.set('id',String(place.id));
    else{const [lat,lon]=placeCoords(place);url.searchParams.set('osm',placeId(place));if(Number.isFinite(lat)&&Number.isFinite(lon)){url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));}}
    return url.pathname+url.search;
  };
  const savedPlaceUrl = (place) => {
    const prefix=location.pathname.includes('/pages/')?'./':'./pages/';
    if(place.restaurant_id)return `${prefix}restaurant.php?id=${encodeURIComponent(place.restaurant_id)}`;
    if(place.source==='osm'&&/^(node|way|relation):[1-9]\d{0,17}$/.test(String(place.source_id))){
      const lat=Number(place.latitude),lon=Number(place.longitude);
      if(place.latitude!=null&&place.longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lon))return `${prefix}restaurant.php?${new URLSearchParams({osm:place.source_id,lat:String(lat),lon:String(lon)})}`;
    }
    return `${prefix}discovery.php`;
  };
  const managedPlacesCache = new Map();
  const managedPlacesRequests = new Map();
  let publicRestaurantSnapshotRequest = null;
  const normalizedVenueName = (value) => normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
  const osmEntityKey = (place) => `${String(place?.type || '').toLowerCase()}:${String(place?.id || '')}`;
  function managedOsmEntityKey(restaurant) {
    const reference = `${restaurant?.source_id || ''} ${restaurant?.source_url || ''}`;
    const match = reference.match(/\b(node|way|relation)[/:](\d+)\b/i);
    return match ? `${match[1].toLowerCase()}:${match[2]}` : '';
  }
  function distanceMeters(first, second) {
    const [lat1, lon1] = first || [], [lat2, lon2] = second || [];
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Infinity;
    const radians = value => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1), dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function isManagedOsmDuplicate(osmPlace, restaurant) {
    const osmKey = osmEntityKey(osmPlace), managedKey = managedOsmEntityKey(restaurant);
    if (managedKey && osmKey === managedKey) return true;
    const osmName = normalizedVenueName(osmPlace?.tags?.name || osmPlace?.tags?.['name:vi'] || '');
    const managedName = normalizedVenueName(restaurant?.name || '');
    if (osmName.length < 4 || osmName !== managedName) return false;
    return distanceMeters(placeCoords(osmPlace), [Number(restaurant.latitude), Number(restaurant.longitude)]) <= 30;
  }
  const placeMapUrl = (place) => { if(place?.managed_record)return placeUrl(place);const [lat,lon]=placeCoords(place);if(!Number.isFinite(lat)||!Number.isFinite(lon))return './pages/discovery.php';const target=new URL(location.pathname.includes('/pages/')?'./discovery.php':'./pages/discovery.php',location.href);target.searchParams.set('focus','1');target.searchParams.set('lat',String(lat));target.searchParams.set('lon',String(lon));target.searchParams.set('name',placeName(place));return target.href; };
  const addressOf = (tags = {}, place = null) => place?.address || tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ');
  const cuisineOf = (tags = {}, place = null) => tags.cuisine || tags.amenity || ({restaurant:'Nhà hàng/quán ăn',cafe:'Cà phê',fast_food:'Đồ ăn nhanh',bakery:'Tiệm bánh',dessert:'Tráng miệng',other:'Khác'})[place?.category] || '';
  const cuisineLabel = (value) => { const first=String(value||'').split(';')[0].trim();return ({vietnamese:'Món Việt',thai:'Món Thái',japanese:'Món Nhật',korean:'Món Hàn',coffee_shop:'Cà phê',cafe:'Cà phê',fast_food:'Ăn nhanh',restaurant:'Nhà hàng',burger:'Burger',pizza:'Pizza',bakery:'Tiệm bánh',dessert:'Tráng miệng'})[first]||first.replaceAll('_',' '); };
  const discoveryPalettes = {
    viet: [{accent:'#ad5737',wash:'#fbefe7',line:'#e8cdbd'},{accent:'#a56d24',wash:'#f8f0df',line:'#e7d8b9'},{accent:'#884c38',wash:'#f5ece6',line:'#e1ccc0'}],
    cafe: [{accent:'#765747',wash:'#f3eeeb',line:'#ded2ca'},{accent:'#92613e',wash:'#f7f0e5',line:'#e7d8c3'},{accent:'#65725e',wash:'#eff1e9',line:'#d7ddcf'}],
    thai: [{accent:'#bd593f',wash:'#fbede8',line:'#ebccc3'},{accent:'#a7524c',wash:'#f7eded',line:'#e7d0d0'},{accent:'#b37a31',wash:'#f8f0e2',line:'#e8d9bb'}],
    japanese: [{accent:'#a8443d',wash:'#f8ece9',line:'#e8ceca'},{accent:'#8e554d',wash:'#f5eeea',line:'#e0d0c9'},{accent:'#9a713d',wash:'#f7f1e5',line:'#e6d9c1'}],
    korean: [{accent:'#914757',wash:'#f6ecef',line:'#e4cdd4'},{accent:'#8b5143',wash:'#f5eeea',line:'#e1d0c7'},{accent:'#765a78',wash:'#f2eef4',line:'#dcd3e1'}],
    poke: [{accent:'#317b78',wash:'#eaf3f1',line:'#c9dfda'},{accent:'#39758b',wash:'#eaf2f5',line:'#cadde4'},{accent:'#668050',wash:'#eff2e9',line:'#d5dfc9'}],
    bbq: [{accent:'#a34e37',wash:'#f8ede8',line:'#e7cec4'},{accent:'#86543c',wash:'#f4eee8',line:'#dfd0c3'},{accent:'#a36b30',wash:'#f7f0e3',line:'#e7d9bd'}],
    burger: [{accent:'#a94f3c',wash:'#f9ede8',line:'#e9cec5'},{accent:'#8b5736',wash:'#f6efe7',line:'#e3d3c2'},{accent:'#a17a37',wash:'#f6f1e4',line:'#e3dbbf'}],
    dessert: [{accent:'#aa6475',wash:'#f7edf0',line:'#e8d1d9'},{accent:'#966541',wash:'#f7f0e7',line:'#e6d7c7'},{accent:'#7e6b8d',wash:'#f1eef4',line:'#dbd4e4'}],
    drink: [{accent:'#438078',wash:'#edf4f1',line:'#d0e1db'},{accent:'#528092',wash:'#edf3f5',line:'#d0dfe4'},{accent:'#94703c',wash:'#f6f1e5',line:'#e5dbc2'}],
    general: [{accent:'#8c6445',wash:'#f5efe7',line:'#e2d4c3'},{accent:'#65775e',wash:'#eff2eb',line:'#d7dfd1'},{accent:'#8d5962',wash:'#f6edef',line:'#e5d1d5'},{accent:'#6d708c',wash:'#efeff5',line:'#d7d8e5'}],
  };
  function discoveryPalette(place) {
    const identity=normalizeText([cuisineOf(place?.tags,place),place?.category,place?.restaurant?.category_name,place?.restaurant?.cuisine,placeName(place)].filter(Boolean).join(' '));
    const theme=/poke/.test(identity)?'poke':/thai|tom yum|pad thai/.test(identity)?'thai':/japan|nhat|sushi|ramen|udon/.test(identity)?'japanese':/korean|han|kimchi|bulgogi/.test(identity)?'korean':/vietnam|viet|pho|bun|banh|com tam/.test(identity)?'viet':/cafe|ca phe|coffee|tea|bubble tea/.test(identity)?'cafe':/barbecue|bbq|hot pot|shabu|lau/.test(identity)?'bbq':/burger|fast food|pizza/.test(identity)?'burger':/dessert|ice cream|cake|bakery|confectionery/.test(identity)?'dessert':/drink|beverage|juice|tra sua/.test(identity)?'drink':'general';
    const seed=normalizeText(`${placeName(place)} ${place?.tags?.brand||place?.restaurant?.brand||placeId(place)}`);
    let hash=0;for(const character of seed)hash=(hash*31+character.charCodeAt(0))>>>0;
    return discoveryPalettes[theme][hash%discoveryPalettes[theme].length];
  }
  const placeSearchValues = (place) => {
    const tags = place?.tags || {};
    const keys = ['name','name:vi','alt_name','official_name','brand','operator','cuisine','amenity','shop','food','description'];
    const values = keys.map((key) => tags[key]).filter((value) => typeof value === 'string');
    values.push(place?.category, place?.address, place?.restaurant?.name, place?.restaurant?.address, place?.restaurant?.cuisine, place?.restaurant?.category_name, place?.restaurant?.description);
    if (Array.isArray(place?.public_food_names)) values.push(...place.public_food_names);
    return values.filter(Boolean);
  };
  const placeSearchText = (place) => normalizeText(placeSearchValues(place).join(' ')).replace(/[-_]+/g, ' ');
  const placeSearchRawText = (place) => placeSearchValues(place).join(' ').normalize('NFC').toLocaleLowerCase('vi').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const placeFilterKey = (place) => place?.managed_record ? `managed:${place.id}` : placeId(place);
  const favoriteKey = (place) => place?.managed_record ? `${place.source||'admin'}:managed:${place.id}` : `osm:${placeId(place)}`;

  async function loadManagedPlaces(center = state.center, radius = 2500){
    const lat = Number(center?.lat), lon = Number(center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const key = `${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}`;
    const cached = managedPlacesCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.places;
    if (managedPlacesRequests.has(key)) return managedPlacesRequests.get(key);
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radius: String(radius) });
    const request = api(`/restaurants/managed?${params}`).then(result => {
      const places = (result.data || []).filter(restaurant => restaurant.latitude !== null && restaurant.latitude !== '' && restaurant.longitude !== null && restaurant.longitude !== '' && Number.isFinite(Number(restaurant.latitude)) && Number.isFinite(Number(restaurant.longitude))).map(restaurant => ({source:restaurant.source||'admin',managed_record:true,id:restaurant.id,lat:Number(restaurant.latitude),lon:Number(restaurant.longitude),source_url:restaurant.source_url,public_food_names:restaurant.public_food_names||[],tags:{name:restaurant.name,'addr:street':restaurant.address,cuisine:restaurant.cuisine||restaurant.category_name||''},restaurant}));
      managedPlacesCache.set(key, { expiresAt: Date.now() + 30000, places });
      return places;
    }).catch(error => {
      console.warn('Không tải được quán What2Eat đã duyệt:', error);
      return [];
    }).finally(() => managedPlacesRequests.delete(key));
    managedPlacesRequests.set(key, request);
    return request;
  }
  async function loadAllFavorites(){const first=await api('/favorites?page=1&limit=200');const rows=[...(first.data||[])];for(let page=2;rows.length<(first.total||0);page++){const result=await api(`/favorites?page=${page}&limit=200`);if(!result.data?.length)break;rows.push(...result.data);}return rows;}

  function chosenCenter() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {toast('Trình duyệt không hỗ trợ vị trí. Đang dùng tâm TP. Hồ Chí Minh.','info');return resolve(OSM_CENTER);}
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        () => {toast('Không lấy được vị trí. Đang dùng tâm TP. Hồ Chí Minh (10.7769, 106.7009).','info');resolve(OSM_CENTER);}, { timeout: 6000, maximumAge: 300000, enableHighAccuracy: false }
      );
    });
  }

  async function nearby(center = state.center, radius = 2500) {
    const params = new URLSearchParams({ lat: String(center.lat), lon: String(center.lon), radius: String(radius) });
    let apiData = null;
    let apiError = null;
    try {
      const response = await fetch(`/api/restaurants?${params}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Không tải được dữ liệu địa điểm.');
      if (!Array.isArray(result.elements)) throw new Error('Dữ liệu địa điểm trả về không hợp lệ.');
      apiData = result;
    } catch (error) {
      apiError = error;
    }
    let snapshotData = null;
    if (!apiData?.static_fallback) {
      try { snapshotData = await publicSnapshotNearbyPlaces(center, radius); }
      catch (error) { if (!apiData) throw new Error(apiError?.message || error.message || 'Không tải được địa điểm quanh bạn.'); }
    }
    if (!apiData && !snapshotData) throw new Error(apiError?.message || 'Không tải được địa điểm quanh bạn.');
    const places = new Map();
    for (const place of snapshotData?.elements || []) places.set(placeId(place), place);
    for (const place of apiData?.elements || []) places.set(placeId(place), place);
    const origin = [Number(center.lat), Number(center.lon)];
    const elements = Array.from(places.values()).map((place) => ({
      place,
      distance: distanceMeters(origin, placeCoords(place)),
    })).filter((entry) => entry.distance <= radius)
      .sort((first, second) => first.distance - second.distance)
      .slice(0, 5000)
      .map(({ place }) => place);
    const data = {
      ...(snapshotData || {}),
      ...(apiData || {}),
      elements,
      snapshot: Boolean(apiData?.snapshot || snapshotData?.snapshot),
      static_fallback: Boolean(apiData?.static_fallback || !apiData),
      snapshot_date: apiData?.snapshot_date || snapshotData?.snapshot_date,
      source: apiData?.source || snapshotData?.source,
    };
    state.osm = data.elements.filter((p) => placeName(p) && placeCoords(p).every(Number.isFinite));
    state.center = center;
    return data;
  }

  async function publicSnapshotNearbyPlaces(center, radius) {
    if (!publicRestaurantSnapshotRequest) {
      publicRestaurantSnapshotRequest = fetch('/assets/data/hcm-food-places.json', { cache: 'force-cache' }).then(async (response) => {
        if (!response.ok) throw new Error(`Không tải được dữ liệu địa điểm dự phòng (HTTP ${response.status}).`);
        const snapshot = await response.json();
        if (!Array.isArray(snapshot.elements)) throw new Error('Dữ liệu địa điểm dự phòng không hợp lệ.');
        return snapshot;
      }).catch((error) => {
        publicRestaurantSnapshotRequest = null;
        throw error;
      });
    }
    const snapshot = await publicRestaurantSnapshotRequest;
    const origin = [Number(center.lat), Number(center.lon)];
    const elements = snapshot.elements.map((place) => ({
      place,
      distance: distanceMeters(origin, placeCoords(place)),
    })).filter((entry) => entry.distance <= radius)
      .sort((first, second) => first.distance - second.distance)
      .slice(0, 5000)
      .map(({ place }) => place);
    return { elements, snapshot: true, static_fallback: true, snapshot_date: snapshot.snapshot_date, imported_at: snapshot.import_summary?.imported_at, source: snapshot.source };
  }

  function favoriteButton(place, textOnly = false) {
    const button = element('button', `w2e-live-favorite${textOnly?' w2e-live-favorite--text':''}`);
    button.type = 'button';const key=favoriteKey(place);const saved=state.favoriteKeys.has(key);const updateLabel=isSaved=>{button.classList.toggle('active',isSaved);button.setAttribute('aria-label',`${isSaved?'Bỏ lưu':'Lưu'} ${placeName(place)} ${isSaved?'khỏi':'vào'} mục yêu thích`);button.title=isSaved?'Bỏ khỏi mục yêu thích':'Lưu địa điểm này';if(textOnly)button.textContent=isSaved?'Đã lưu':'Lưu';else button.innerHTML=`<i class="bi bi-heart${isSaved?'-fill':''}"></i>`;};updateLabel(saved);
    button.addEventListener('click', async (event) => {
      event.preventDefault(); event.stopPropagation();
      try {
        if (!state.user) { toast('Đăng nhập để lưu địa điểm yêu thích.', 'warning'); return; }
        const coords=placeCoords(place);const source=place.managed_record?(place.source||'admin'):'osm';const sourceId=place.managed_record?`managed:${place.id}`:placeId(place);const result = await api('/favorites', { method: 'POST', body: JSON.stringify({ source, source_id: sourceId, name: placeName(place), address: place.managed_record?place.restaurant.address:addressOf(place.tags,place), latitude:Number.isFinite(coords[0])?coords[0]:null, longitude:Number.isFinite(coords[1])?coords[1]:null, source_url: place.source_url||placeUrl(place), restaurant_id:place.managed_record?place.id:null }) });
        if(result.favorite)state.favoriteKeys.add(key);else state.favoriteKeys.delete(key);
        updateLabel(result.favorite);
        toast(result.favorite ? 'Đã lưu địa điểm vào mục yêu thích.' : 'Đã bỏ địa điểm khỏi mục yêu thích.', 'success');
      } catch (error) { toast(error.message, 'warning'); }
    });
    return button;
  }

  function nearbyCard(place, index = 0, discovery = false) {
    const [lat, lon] = placeCoords(place);
    const card = element('article', `w2e-live-place-card${discovery?' w2e-live-place-card--discovery':''}`);
    if(discovery){const palette=discoveryPalette(place);card.style.setProperty('--place-accent',palette.accent);card.style.setProperty('--place-wash',palette.wash);card.style.setProperty('--place-line',palette.line);}
    card.dataset.placeId = placeFilterKey(place);
    card.dataset.name = placeName(place).toLowerCase();
    card.dataset.cuisine = cuisineOf(place.tags, place).toLowerCase();
    card.dataset.search = placeSearchText(place);
    card.dataset.rawSearch = placeSearchRawText(place);
    card.dataset.distance = Number.isFinite(lat)&&Number.isFinite(lon)?String((distanceKm(state.center.lat, state.center.lon, lat, lon)).toFixed(2)):'';
    const header = element('div', 'w2e-live-place-card__top');
    const badge = element('span', 'w2e-live-place-card__type', cuisineLabel(cuisineOf(place.tags, place)) || (place.managed_record?'Địa điểm What2Eat':'Địa điểm OSM'));
    header.appendChild(badge);
    if(place.managed_record&&place.restaurant.sponsored){card.dataset.sponsored='1';header.appendChild(element('span','w2e-sponsored-label','Tài trợ'));}
    header.appendChild(favoriteButton(place, discovery));
    const title = element('h3', 'w2e-live-place-card__name', placeName(place));
    const address = element('p', 'w2e-live-place-card__address', place.managed_record?place.restaurant.address:(addressOf(place.tags,place)||'OpenStreetMap chưa ghi địa chỉ cụ thể.'));
    const verificationStatus = place.managed_record ? 'verified_active' : (place.verification_status || 'unverified');
    const verificationDate = place.verified_at ? new Date(`${String(place.verified_at).replace(' ','T')}Z`).toLocaleDateString('vi-VN') : '';
    const provenance=place.managed_record
      ? ({osm:'OpenStreetMap',user:'Thành viên What2Eat',admin:'Quản trị viên'})[place.source]||'Nguồn chưa ghi rõ'
      : place.import_id
        ? verificationStatus === 'verified_active'
          ? `Đã xác minh hoạt động${verificationDate ? ` · ${verificationDate}` : ''}`
          : verificationStatus === 'reported_closed' ? 'Đã báo đóng cửa' : `${place.data_source || 'Dữ liệu bổ sung'} · chờ xác minh`
      : verificationStatus === 'verified_active'
        ? `Đã xác minh hoạt động${verificationDate ? ` · ${verificationDate}` : ''}`
        : verificationStatus === 'reported_closed'
          ? 'Đã báo đóng cửa · tạm ngừng hiển thị'
          : 'OpenStreetMap';
    const distanceText=card.dataset.distance?`${card.dataset.distance} km từ tâm tìm kiếm`:'Chưa có tọa độ';const detail = element('p', 'w2e-live-place-card__meta', `${distanceText} · ${provenance}`);
    const link = element('a', 'w2e-live-place-card__source', discovery?'Xem chi tiết':'Xem chi tiết ↗');
    link.href = placeUrl(place);
    card.append(header, title, address, detail, link);
    if (!place.managed_record && state.user?.role === 'admin' && verificationStatus !== 'verified_active') {
      const verify = element('button', 'w2e-verify-activity', verificationStatus === 'reported_closed' ? 'Ghi nhận đang hoạt động' : 'Xác minh hoạt động');
      verify.type = 'button';
      verify.addEventListener('click', () => {
        const dialog=element('dialog','w2e-verify-dialog');
        const form=element('form');
        const heading=element('h2','','Xác minh hoạt động');
        heading.className='h5';
        const sourceLabel=element('label','w2e-verify-label','Nguồn kiểm tra');
        const sourceInput=element('input','form-control');
        sourceInput.type='url';sourceInput.name='verification_source';sourceInput.required=true;sourceInput.maxLength=255;
        sourceInput.placeholder='https://...';
        sourceInput.setAttribute('aria-label','URL nguồn kiểm tra');
        sourceLabel.appendChild(sourceInput);
        const noteLabel=element('label','w2e-verify-label','Bằng chứng và ghi chú');
        const noteInput=element('textarea','form-control');
        noteInput.name='verification_note';noteInput.required=true;noteInput.minLength=10;noteInput.maxLength=1000;noteInput.rows=4;
        noteInput.placeholder='Ghi tên quán khớp, địa chỉ và dấu hiệu đang hoạt động trên nguồn.';
        noteLabel.appendChild(noteInput);
        const actions=element('div','w2e-verify-dialog-actions');
        const cancel=element('button','w2e-chip','Hủy');cancel.type='button';cancel.addEventListener('click',()=>dialog.close());
        const submit=element('button','w2e-chip','Xác nhận hoạt động');submit.type='submit';
        actions.append(cancel,submit);form.append(heading,element('p','small text-secondary',`Địa điểm: ${placeName(place)} · ${addressOf(place.tags,place)||'Chưa có địa chỉ'}`),sourceLabel,noteLabel,actions);dialog.appendChild(form);document.body.appendChild(dialog);
        dialog.addEventListener('close',()=>dialog.remove(),{once:true});
        form.addEventListener('submit',async(event)=>{
          event.preventDefault();submit.disabled=true;
          try{
            await api('/admin/osm-verifications',{method:'POST',body:JSON.stringify({source_id:placeId(place),status:'verified_active',verification_source:sourceInput.value.trim(),verification_note:noteInput.value.trim()})});
            place.verification_status='verified_active';place.verified_at=new Date().toISOString();
            detail.textContent=`${distanceText} · Đã xác minh hoạt động · hôm nay`;verify.remove();dialog.close();
            toast('Đã ghi nhận trạng thái quán đang hoạt động.','success');
          }catch(error){toast(error.message,'error');submit.disabled=false;}
        });
        dialog.showModal();sourceInput.focus();
      });
      card.appendChild(verify);
    }
    if(Array.isArray(place.public_food_names)&&place.public_food_names.length)card.appendChild(element('p','w2e-live-place-card__meta',`Món thành viên ghi trong Food Note công khai: ${place.public_food_names.join(', ')}`));
    card.dataset.index = String(index);
    return card;
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => v * Math.PI / 180; const dLat = toRad(lat2-lat1); const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  let discoveryRequest = 0;
  async function drawDiscovery(data, center) {
    const request = ++discoveryRequest;
    const grid = document.getElementById('restaurantGrid'); if (!grid) return;
    const elements = (data.elements || []).filter((p) => placeName(p) && placeCoords(p).every(Number.isFinite)).map((place)=>data.snapshot?{...place,snapshot:true,snapshot_date:data.snapshot_date}:place);
    const requestedCenter = center || state.center;
    const managed = await loadManagedPlaces(requestedCenter, 2000);
    if (request !== discoveryRequest) return;
    state.center = requestedCenter;
    state.managed = managed;
    state.osm = elements.filter(osmPlace => !state.managed.some(place => isManagedOsmDuplicate(osmPlace, place.restaurant)));
    state.places = [...state.osm, ...state.managed].sort((a,b)=>Number(Boolean(b.restaurant?.sponsored))-Number(Boolean(a.restaurant?.sponsored)));
    window.dispatchEvent(new CustomEvent('w2e:managed-data',{detail:{restaurants:state.managed.map(place=>place.restaurant),center:state.center}}));
    grid.replaceChildren();document.body.classList.add('w2e-live-ready');
    state.places.forEach((place, index) => {const col=element('div','col-12 col-sm-6 col-xl-4');col.appendChild(nearbyCard(place,index,true));grid.appendChild(col);});
    const count = document.getElementById('resultCount'); if (count) count.textContent = String(state.places.length);
    const empty = document.getElementById('emptyState'); if (empty) { empty.style.display = state.places.length ? 'none' : 'block'; const p=empty.querySelector('p'); if(p)p.textContent='Chưa có địa điểm có dữ liệu quanh vị trí đang tìm. Hãy di chuyển bản đồ hoặc thử lại sau.'; }
    const pages = document.getElementById('paginationWrap'); if (pages) pages.style.display = 'none';
    const tabs = document.getElementById('categoryTabs');
    if (tabs) {
      const types = Object.entries(categoryAliases).filter(([key,category])=>key===state.requestedCategory||state.places.some((place)=>category.pattern.test(normalizeText(cuisineOf(place.tags,place)))));
      tabs.replaceChildren();
      const all = element('button', 'w2e-cat-tab active', 'Tất cả'); all.dataset.filter = ''; tabs.appendChild(all);
      if(state.requestedCategory&&categoryAliases[state.requestedCategory])all.classList.remove('active');
      types.forEach(([key,category]) => { const button=element('button',`w2e-cat-tab${state.requestedCategory===key?' active':''}`,category.label);button.dataset.filter=`alias:${key}`;tabs.appendChild(button); });
      tabs.querySelectorAll('.w2e-cat-tab').forEach((button)=>button.addEventListener('click',()=>{tabs.querySelectorAll('.w2e-cat-tab').forEach((b)=>b.classList.toggle('active',b===button));filterDiscovery();}));
    }
    ['priceFilter','ratingFilter','openToggle'].forEach((id) => { const control=document.getElementById(id); if(control){control.disabled=true;control.title='Nguồn dữ liệu hiện có không cung cấp nhất quán trường này.';} });
    const sort=document.getElementById('sortFilter');if(sort){sort.querySelectorAll('option[value="rating"],option[value="price"]').forEach(option=>{if(!option.disabled){option.disabled=true;option.textContent+= ' (không có trong nguồn)';}});if(!sort.dataset.w2eBound){sort.addEventListener('change',sortDiscovery);sort.dataset.w2eBound='true';}}
    const gridButton=document.getElementById('gridViewBtn'),listButton=document.getElementById('listViewBtn');if(gridButton&&!gridButton.dataset.w2eBound){gridButton.addEventListener('click',()=>setDiscoveryView('grid'));gridButton.dataset.w2eBound='true';}if(listButton&&!listButton.dataset.w2eBound){listButton.addEventListener('click',()=>setDiscoveryView('list'));listButton.dataset.w2eBound='true';}
    document.getElementById('paginationWrap')?.setAttribute('hidden','');
    sortDiscovery();
    filterDiscovery();
  }

  function sortDiscovery(){const grid=document.getElementById('restaurantGrid');if(!grid)return;const mode=document.getElementById('sortFilter')?.value||'relevant';const items=[...grid.children];if(mode==='distance')items.sort((a,b)=>{const da=Number(a.querySelector('.w2e-live-place-card')?.dataset.distance)||Infinity;const db=Number(b.querySelector('.w2e-live-place-card')?.dataset.distance)||Infinity;return da-db;});else items.sort((a,b)=>Number(b.querySelector('.w2e-live-place-card')?.dataset.sponsored||0)-Number(a.querySelector('.w2e-live-place-card')?.dataset.sponsored||0)||Number(a.querySelector('.w2e-live-place-card')?.dataset.index)-Number(b.querySelector('.w2e-live-place-card')?.dataset.index));items.forEach(item=>grid.appendChild(item));}
  function setDiscoveryView(mode){const grid=document.getElementById('restaurantGrid');if(!grid)return;grid.querySelectorAll(':scope > div').forEach(col=>{col.classList.toggle('col-sm-6',mode==='grid');col.classList.toggle('col-xl-4',mode==='grid');col.classList.toggle('col-12',mode==='list');});document.getElementById('gridViewBtn')?.classList.toggle('active',mode==='grid');document.getElementById('listViewBtn')?.classList.toggle('active',mode==='list');}

  function filterDiscovery() {
    const grid=document.getElementById('restaurantGrid');if(!grid)return;
    const inputQuery=(document.getElementById('searchInput')?.value||'').trim();
    const rawQuery=inputQuery.normalize('NFC').toLocaleLowerCase('vi').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
    const queryHasDiacritics=rawQuery.normalize('NFD')!==rawQuery;
    const query=normalizeText(inputQuery).replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
    const queryPattern=({vietnamese:cuisinePatterns.viet,viet:cuisinePatterns.viet,bbq:cuisinePatterns.bbq,barbecue:cuisinePatterns.bbq,'hot pot':cuisinePatterns.bbq,cafe:/cafe|coffee/,coffee:/cafe|coffee/,'ca phe':/cafe|coffee/,'quan ca phe':/cafe|coffee/,japanese:cuisinePatterns.japanese,sushi:cuisinePatterns.japanese,korean:cuisinePatterns.korean,'fast food':cuisinePatterns.fastfood,dessert:cuisinePatterns.dessert,drink:/drink|beverage|tea|juice|bubble.?tea/})[query]||null;
    const selected=document.querySelector('#categoryTabs .w2e-cat-tab.active')?.dataset.filter||'';
    const distance=Number(document.getElementById('distanceFilter')?.value||0);
    let shown=0;const visiblePlaceIds=[];
    grid.querySelectorAll('.w2e-live-place-card').forEach((card)=>{
      const cuisine=normalizeText(card.dataset.cuisine).replace(/[-_]+/g,' '),search=card.dataset.search||'',rawSearch=card.dataset.rawSearch||'';const selectedAlias=selected.startsWith('alias:')?categoryAliases[selected.slice(6)]?.pattern:null;const categoryMatch=selectedAlias?selectedAlias.test(cuisine):(!selected||normalizeText(card.dataset.cuisine)===normalizeText(selected));const queryMatch=!query||(queryHasDiacritics?rawSearch.includes(rawQuery):search.includes(query))||(queryPattern&&queryPattern.test(search));const ok=queryMatch&&categoryMatch&&(!distance||!card.dataset.distance||Number(card.dataset.distance)<=distance);
      card.hidden=!ok;const wrapper=card.parentElement;if(wrapper&&wrapper!==grid)wrapper.hidden=!ok;if(ok){shown++;visiblePlaceIds.push(card.dataset.placeId);}
    });
    const count=document.getElementById('resultCount');if(count)count.textContent=String(shown);
    const empty=document.getElementById('emptyState');if(empty){empty.style.display=shown?'none':'block';const description=empty.querySelector('p');if(description)description.textContent=query?'Không có địa điểm nào khớp với dữ liệu tên, món hoặc loại hình đã được ghi nhận quanh khu vực này. Hãy thử từ khóa khác hoặc di chuyển bản đồ rồi tải lại.':'Chưa có địa điểm phù hợp trong dữ liệu quanh khu vực này. Hãy tải lại hoặc di chuyển bản đồ đến khu vực cần tìm.';}
    window.dispatchEvent(new CustomEvent('w2e:discovery-filter',{detail:{placeIds:visiblePlaceIds}}));
  }
  window.runDiscoverySearch=filterDiscovery;
  window.clearDiscoveryFilters=()=>{const search=document.getElementById('searchInput'),distance=document.getElementById('distanceFilter'),price=document.getElementById('priceFilter'),rating=document.getElementById('ratingFilter'),sort=document.getElementById('sortFilter');if(search)search.value='';if(distance)distance.value='';if(price)price.value='';if(rating)rating.value='';if(sort)sort.value='relevant';document.querySelectorAll('#categoryTabs .w2e-cat-tab').forEach((button,index)=>button.classList.toggle('active',index===0));filterDiscovery();sortDiscovery();};

  function renderHomePlaces() {
    const grid=document.getElementById('homePlacesGrid'); if(!grid)return;
    grid.replaceChildren();
    const items=[...state.managed.filter(place=>place.restaurant.sponsored),...state.osm.filter(placeName).slice(0,4),...state.managed.filter(place=>!place.restaurant.sponsored).slice(0,4)].slice(0,8);
    if(!items.length){const note=element('p','text-secondary','Chưa có địa điểm thực trong dữ liệu. Hãy bật định vị hoặc khám phá trên bản đồ.');grid.appendChild(note);return;}
    items.forEach((place,index)=>{const col=element('div','col-12 col-sm-6 col-lg-3');col.appendChild(nearbyCard(place,index));grid.appendChild(col);});
  }

  async function loadNearby() {
    const mapStatus=document.getElementById('mapStatus');
    if(mapStatus)return; // The map owns location/search and emits its successful result.
    if(!document.querySelector('#randomResult')&&!document.querySelector('#homePlacesGrid'))return;
    const center=await chosenCenter();
    try { const data=await nearby(center,5000);state.center=center;state.managed=await loadManagedPlaces(center,5000);state.osm=(data.elements||[]).filter(p=>placeName(p)&&placeCoords(p).every(Number.isFinite)&&!state.managed.some(place=>isManagedOsmDuplicate(p,place.restaurant)));state.places=[...state.osm,...state.managed];renderHomePlaces();document.body.classList.add('w2e-live-ready'); }
    catch(error) { const grid=document.getElementById('homePlacesGrid');if(grid){grid.replaceChildren(element('p','text-secondary',error.message));} }
  }

  window.refreshNearbyPlaces = loadNearby;
  window.getRandomNearbyPlace = (filters = {}) => {
    if (!state.places.length) return null;
    let candidates=state.places;
    if(filters.type&&cuisinePatterns[filters.type])candidates=candidates.filter((place)=>cuisinePatterns[filters.type].test(normalizeText([cuisineOf(place.tags,place),place.category,place.tags?.['w2e:category'],place.tags?.amenity].filter(Boolean).join(' '))));
    if(filters.distance){candidates=candidates.filter((place)=>{const [lat,lon]=placeCoords(place);if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;const distance=distanceKm(state.center.lat,state.center.lon,lat,lon);if(Number(filters.distance)>0)return distance<=Number(filters.distance);if(filters.distance==='under1')return distance<1;if(filters.distance==='1to3')return distance>=1&&distance<=3;if(filters.distance==='over3')return distance>3;return true;});}
    if(filters.budget){const [min,max]=filters.budget.split(':').map(Number);candidates=candidates.filter(place=>{const raw=place.restaurant?.price_range||place.tags?.price_range;const match=String(raw||'').replaceAll('.','').replaceAll(',','').match(/\d+/g);if(!match)return !!filters.unknown;const prices=match.map(Number);if(prices.some(p=>p<1000))return !!filters.unknown;return Math.min(...prices)>=min&&Math.max(...prices)<max;});}
    if(!candidates.length)return null;
    const place = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      name: placeName(place),
      address: place.managed_record ? place.restaurant.address : (addressOf(place.tags,place) || 'OpenStreetMap chưa ghi địa chỉ cụ thể.'),
      url: placeUrl(place), mapUrl: placeMapUrl(place),
      source: place.managed_record ? 'Thông tin do What2Eat lưu; xem nguồn đối chiếu nếu có.' : place.import_id ? `${place.data_source || 'Dữ liệu bổ sung'} · ${place.verification_status === 'verified_active' ? 'đã xác minh' : 'chờ xác minh'}` : 'Dữ liệu OpenStreetMap',
      priceRange: place.restaurant?.price_range || place.tags?.price_range || '',
      openingHours: place.tags?.opening_hours || '',
      phone: place.tags?.phone || place.tags?.['contact:phone'] || '',
    };
  };

  function renderNotes(notes) {
    state.notes=notes;document.body.classList.add('w2e-live-ready');
    const grid=document.getElementById('gridView');const list=document.getElementById('listView');if(!grid)return;
    grid.replaceChildren(); if(list) list.replaceChildren();
    const pinned=document.querySelector('.w2e-pinned-section .w2e-notes-grid');if(pinned)pinned.replaceChildren();const pinnedSection=document.querySelector('.w2e-pinned-section');if(pinnedSection)pinnedSection.hidden=!notes.some(note=>note.is_pinned);
    const notesMain=document.querySelector('.w2e-notes-main');if(notesMain)notesMain.classList.toggle('has-notes',notes.length>0);
    const recentRail=document.querySelector('.w2e-notes-rail--recent'),latestRail=document.querySelector('.w2e-notes-rail--latest');if(recentRail)recentRail.hidden=!notes.length;if(latestRail)latestRail.hidden=!notes.length;
    const railCount=document.getElementById('noteRailCount');if(railCount)railCount.textContent=String(state.noteTotal||notes.length);
    const recentList=document.getElementById('noteRecentList');if(recentList){recentList.replaceChildren();notes.slice(0,4).forEach(note=>{const link=element('a','w2e-notes-rail__item');link.href=`#food-note-${note.id}`;link.append(element('span','w2e-notes-rail__item-name',note.food_name),element('span','w2e-notes-rail__item-date',localDate(note.eaten_at||note.created_at)));recentList.appendChild(link);});if(!notes.length)recentList.append(element('span','w2e-notes-rail__empty','Chưa có ghi chú.'));}
    const latest=notes[0];if(latest){const latestDate=document.getElementById('noteLatestDate'),latestName=document.getElementById('noteLatestName'),latestRestaurant=document.getElementById('noteLatestRestaurant'),latestReview=document.getElementById('noteLatestReview'),latestLink=document.getElementById('noteLatestLink');if(latestDate)latestDate.textContent=localDate(latest.eaten_at||latest.created_at);if(latestName)latestName.textContent=latest.food_name||'Food Note';if(latestRestaurant)latestRestaurant.textContent=latest.restaurant_name||'Chưa ghi địa điểm';if(latestReview)latestReview.textContent=latest.review||'Chưa có nhận xét cho ghi chú này.';if(latestLink)latestLink.href=`#food-note-${latest.id}`;}
    const tagNames=[...new Set(notes.flatMap((n)=>n.tags||[]))];const tagWrap=document.querySelector('.w2e-tag-filter');if(tagWrap){tagWrap.replaceChildren(element('span','', 'Lọc nhãn: '));const all=element('button','w2e-tag-btn active','Tất cả');all.dataset.tag='';tagWrap.appendChild(all);tagNames.forEach((tag)=>{const b=element('button','w2e-tag-btn','#'+tag);b.dataset.tag=tag;tagWrap.appendChild(b);});tagWrap.querySelectorAll('button').forEach((b)=>b.addEventListener('click',()=>{tagWrap.querySelectorAll('button').forEach((x)=>x.classList.toggle('active',x===b));applyNoteFilters();}));}
    const noteCard=(note)=>{
      const card=element('article',`w2e-note-card${note.is_pinned?' pinned':''}`);card.id=`food-note-${note.id}`;card.dataset.noteId=String(note.id);card.dataset.rating=text(note.rating||'');card.dataset.tags=(note.tags||[]).join(' ').toLocaleLowerCase('vi');card.dataset.search=`${note.food_name} ${note.restaurant_name||''} ${note.review||''}`.toLocaleLowerCase('vi');
      const image=note.media?.find((m)=>String(m.mime_type||'').startsWith('image/'));if(image){const img=element('img','w2e-card-img');img.src=image.url;img.alt=note.food_name;card.appendChild(img);}
      const body=element('div','w2e-card-body');body.appendChild(element('div','w2e-food-name',note.food_name));
      if(note.rating!=null)body.appendChild(element('div','w2e-rating',`Đánh giá cá nhân: ${note.rating} / 5`));if(note.restaurant_name)body.appendChild(element('div','w2e-note-restaurant',note.restaurant_name));if(note.price!=null)body.appendChild(element('div','w2e-price',money(note.price)));if(note.review)body.appendChild(element('p','w2e-comment',note.review));
      const tags=element('div','w2e-tags');(note.tags||[]).forEach((t)=>tags.appendChild(element('span','w2e-tag-badge','#'+t)));body.appendChild(tags);const noteStateLabel=({pending:'Chờ duyệt',rejected:'Bị từ chối',hidden:'Đã ẩn',draft:'Bản nháp'})[note.status]||(note.privacy==='public'?'Công khai':note.privacy==='link'?'Có liên kết':'Riêng tư');body.appendChild(element('span',`w2e-privacy-badge w2e-privacy-${note.privacy}`,noteStateLabel));
      card.dataset.date=note.eaten_at||note.created_at||'';const footer=element('div','w2e-card-footer');footer.appendChild(element('span','w2e-date',localDate(note.eaten_at||note.created_at)));const actions=element('div','w2e-actions');
      const fav=element('button','w2e-action-btn',note.is_favorite?'Đã thích':'Yêu thích');fav.type='button';fav.title=note.is_favorite?'Bỏ khỏi mục yêu thích':'Thêm vào mục yêu thích';fav.setAttribute('aria-pressed',String(Boolean(note.is_favorite)));fav.addEventListener('click',()=>changeNote(note,{is_favorite:!note.is_favorite}));const pin=element('button','w2e-action-btn',note.is_pinned?'Bỏ ghim':'Ghim');pin.type='button';pin.title=note.is_pinned?'Bỏ ghim':'Ghim ghi chú';pin.setAttribute('aria-pressed',String(Boolean(note.is_pinned)));pin.addEventListener('click',()=>changeNote(note,{is_pinned:!note.is_pinned}));const edit=element('a','w2e-action-btn','Sửa');edit.href=`./create-food-note.php?edit=${encodeURIComponent(note.id)}`;edit.title='Sửa Food Note';const del=element('button','w2e-action-btn w2e-danger','Xóa');del.type='button';del.addEventListener('click',()=>deleteNote(note));actions.append(fav,pin,edit);
      if(note.privacy==='link'&&note.status==='published'){
        const share=element('button','w2e-action-btn','Liên kết');share.type='button';share.title='Tạo liên kết mới; liên kết trước đó sẽ hết hiệu lực';
        share.addEventListener('click',async()=>{if(!window.confirm('Tạo liên kết chia sẻ mới? Liên kết cũ sẽ hết hiệu lực.'))return;share.disabled=true;try{const result=await api(`/food-notes/${note.id}/share`,{method:'POST',body:'{}'});const url=new URL(result.share_url,location.origin).href;try{await navigator.clipboard.writeText(url);toast('Đã sao chép liên kết mới.','success');}catch(_){window.prompt('Liên kết chia sẻ mới:',url);}}catch(error){toast(error.message,'error');}finally{share.disabled=false;}});actions.appendChild(share);
      }
      actions.appendChild(del);footer.appendChild(actions);card.append(body,footer);return card;
    };
    notes.forEach((note)=>{
      grid.appendChild(noteCard(note));if(note.is_pinned&&pinned){const pinnedCard=noteCard(note);pinnedCard.id=`food-note-pinned-${note.id}`;pinned.appendChild(pinnedCard);}
      if(list){const row=element('article','w2e-note-item',`${note.food_name} · ${note.rating==null?'Chưa đánh giá':note.rating+'/5'} · ${localDate(note.eaten_at||note.created_at)}`);list.appendChild(row);}
    });
    const empty=document.getElementById('emptyState');if(empty)empty.classList.toggle('w2e-hidden',notes.length>0);
    const stats=state.noteStats||{};[['foodNoteCount',stats.total],['pinnedFoodNoteCount',stats.pinned],['foodNoteAverage',stats.average_rating==null?'—':Number(stats.average_rating).toFixed(1)],['favoriteFoodNoteCount',stats.favorites]].forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=value==null?'0':String(value);});const loadMore=document.getElementById('loadMoreNotes');if(loadMore)loadMore.hidden=state.noteTotal<=notes.length;
    applyNoteFilters();
  }

  function applyNoteFilters() {
    const query=(document.getElementById('noteSearch')?.value||'').toLocaleLowerCase('vi');const rating=Number(document.getElementById('ratingFilter')?.value||0);const tag=document.querySelector('.w2e-tag-filter .w2e-tag-btn.active')?.dataset.tag||'';let shown=0;
    const sort=document.getElementById('timeFilter')?.value||'newest';const grid=document.getElementById('gridView');if(grid){[...grid.children].sort((a,b)=>sort==='oldest'?a.dataset.date.localeCompare(b.dataset.date):b.dataset.date.localeCompare(a.dataset.date)).forEach(card=>grid.appendChild(card));}
    document.querySelectorAll('#gridView .w2e-note-card').forEach((card)=>{const r=Number(card.dataset.rating||0);const ok=(!query||card.dataset.search.includes(query))&&(!rating||r>=rating)&&(!tag||card.dataset.tags.includes(tag.toLocaleLowerCase('vi')));card.hidden=!ok;if(ok)shown++;});const resultLabel=document.getElementById('noteResultsLabel');if(resultLabel)resultLabel.textContent=`${shown} ghi chú phù hợp`;
    const empty=document.getElementById('emptyState');if(empty)empty.classList.toggle('w2e-hidden',shown>0);
  }

  async function changeNote(note, update) {
    try { await api(`/food-notes/${note.id}/flags`,{method:'PATCH',body:JSON.stringify(update)});await loadNotes(); }
    catch(error){toast(error.message,'error');}
  }
  async function deleteNote(note) {
    if(!window.confirm(`Xóa ghi chú “${note.food_name}”?`))return;
    try{await api(`/food-notes/${note.id}`,{method:'DELETE'});await loadNotes();toast('Đã xóa Food Note.','success');}catch(error){toast(error.message,'error');}
  }
  async function loadNotes(reset=true) {
    if(reset){state.notePage=1;state.notes=[];}else state.notePage++;
    try { const result=await api(`/food-notes?page=${state.notePage}&limit=50`);state.noteTotal=result.total||0;state.noteStats=result.stats||null;state.notes=reset?(result.data||[]):[...state.notes,...(result.data||[])];renderNotes(state.notes); }
    catch(error){if(error.message.includes('đăng nhập')){state.user=null;window.location.href='./login.php';return;}toast(error.message,'error');}
  }

  function planCard(plan,index) {
    const cell=element('div','w2e-plan-cell');
    const card=element('article',`w2e-plan-card w2e-plan-card--${index%3}`);
    const statuses={open:'Đang bình chọn',decided:'Đã chốt',closed:'Đã đóng',cancelled:'Đã hủy'};
    const top=element('div','w2e-plan-card-top');
    top.append(element('span','w2e-plan-index',`KẾ HOẠCH ${String(index+1).padStart(2,'0')}`),element('span',`w2e-plan-status w2e-plan-status--${plan.status||'open'}`,statuses[plan.status]||plan.status||'Đang mở'));
    const title=element('h3','w2e-plan-name',plan.name);title.title=plan.name;
    const description=element('p','w2e-plan-description',plan.description||'Chưa có mô tả. Thêm vài dòng để cả nhóm biết buổi hẹn này dành cho dịp gì.');
    const facts=element('div','w2e-plan-facts');
    const members=element('div','w2e-plan-fact');members.append(element('span','','THÀNH VIÊN'),element('strong','',String(Number(plan.member_count)||0)));
    const proposals=element('div','w2e-plan-fact');proposals.append(element('span','','ĐỊA ĐIỂM ĐỀ XUẤT'),element('strong','',String(Number(plan.proposal_count)||0)));
    facts.append(members,proposals);
    const eventDate=parsePlanDate(plan.event_at);
    const dateText=eventDate&&!Number.isNaN(eventDate.getTime())?eventDate.toLocaleString('vi-VN',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'}):'Chưa chọn ngày — cập nhật trong chi tiết kế hoạch';
    const date=element('div','w2e-plan-date-row');date.append(element('span','','NGÀY HẸN DỰ KIẾN'),element('strong','',dateText));
    const actions=element('div','w2e-plan-actions');
    const detail=element('button','w2e-plan-open','Xem kế hoạch');detail.type='button';detail.addEventListener('click',(event)=>{event.stopPropagation();showPlan(plan.id);});
    actions.appendChild(detail);
    if(plan.member_role==='owner'){
      const ownerActions=element('div','w2e-plan-owner-actions');
      const invite=element('button','w2e-plan-invite','Tạo liên kết mời');invite.type='button';invite.addEventListener('click',async(event)=>{event.stopPropagation();try{const d=await api(`/food-plans/${plan.id}/invite`,{method:'POST',body:'{}'});const url=new URL(d.invite_url,location.origin).href;showInvite(url,ownerActions);}catch(error){toast(error.message,'error');}});
      const remove=element('button','w2e-plan-delete','Xóa kế hoạch');remove.type='button';remove.addEventListener('click',async(event)=>{event.stopPropagation();if(!window.confirm(`Xóa Food Plan “${plan.name}”?`))return;try{await api(`/food-plans/${plan.id}`,{method:'DELETE'});toast('Food Plan đã được xóa.','success');await loadPlans();}catch(error){toast(error.message,'error');}});
      ownerActions.append(invite,remove);actions.appendChild(ownerActions);
    }
    card.append(top,title,description,facts,date,actions);
    card.addEventListener('click',()=>showPlan(plan.id));
    cell.appendChild(card);return cell;
  }

  function updatePlanOverview(plans) {
    const set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value;};
    const open=plans.filter(plan=>plan.status==='open').length;
    const members=plans.reduce((sum,plan)=>sum+(Number(plan.member_count)||0),0);
    set('planCount',String(plans.length));set('openPlanCount',String(open));set('planMemberCount',String(members));
    set('planCollectionCount',`${plans.length} kế hoạch`);
    const now=Date.now();
    const next=plans.map(plan=>({plan,date:parsePlanDate(plan.event_at)})).filter(item=>item.date&&item.date.getTime()>=now).sort((a,b)=>a.date-b.date)[0];
    set('nextEventName',next?next.plan.name:'Chưa có lịch hẹn');
    set('nextEventDate',next?next.date.toLocaleString('vi-VN',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'}):'Chọn ngày dự kiến để cả nhóm dễ chốt lịch.');
  }

  function parsePlanDate(value) {
    if(!value)return null;
    const normalized=String(value).trim().replace(' ','T');
    const date=new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)?normalized:`${normalized}Z`);
    return Number.isNaN(date.getTime())?null:date;
  }

  async function loadPlans() {
    const grid=document.getElementById('foodPlanGrid');if(!grid)return;grid.replaceChildren(element('p','w2e-plan-loading','Đang tải kế hoạch…'));
    try{
      const result=await api('/food-plans');document.body.classList.add('w2e-live-ready');state.plans=result.data||[];updatePlanOverview(state.plans);grid.replaceChildren();
      if(!state.plans.length){
        const empty=element('div','w2e-plan-empty');empty.append(element('p','w2e-list-kicker','MỘT CUỘC HẸN ĐANG CHỜ BẮT ĐẦU'),element('h3','','Rủ mọi người đi ăn nhé.'),element('p','','Tạo kế hoạch đầu tiên, chọn thời gian rồi mời bạn bè cùng đề xuất địa điểm.'));
        const create=element('button','w2e-btn-primary','Tạo kế hoạch đầu tiên');create.type='button';create.addEventListener('click',openCreateModal);empty.appendChild(create);grid.appendChild(empty);return;
      }
      state.plans.forEach((plan,index)=>grid.appendChild(planCard(plan,index)));
    }catch(error){grid.replaceChildren(element('p','w2e-plan-loading w2e-plan-error',error.message));toast(error.message,'error');}
  }

  async function loadSharedNote(){
    const token=new URLSearchParams(location.search).get('share');const root=document.getElementById('sharedFoodNote');if(!root)return;if(!token){root.textContent='Liên kết Food Note không hợp lệ.';return;}
    try{const result=await api(`/food-notes/share/${encodeURIComponent(token)}`);const note=result.data;root.replaceChildren(element('h1','',note.food_name),element('p','',`Chia sẻ bởi ${note.author_name||'người dùng What2Eat'} · ${localDate(note.eaten_at||note.created_at)}`));if(note.restaurant_name)root.appendChild(element('p','',`Địa điểm: ${note.restaurant_name}`));if(note.rating!=null)root.appendChild(element('p','',`Đánh giá cá nhân: ${note.rating}/5`));if(note.review)root.appendChild(element('p','',note.review));const media=element('div','shared-food-note-media');(note.media||[]).forEach((m)=>{if(String(m.mime_type).startsWith('image/')){const img=element('img');img.src=m.url;img.alt=note.food_name;img.loading='lazy';media.appendChild(img);}else if(String(m.mime_type).startsWith('video/')){const video=element('video');video.controls=true;video.src=m.url;media.appendChild(video);}});root.appendChild(media);}catch(error){root.replaceChildren(element('p','',error.message));}
  }

  function promptPlaceAuth(actionName) {
    const dialog=document.getElementById('placeAuthDialog');
    const title=document.getElementById('placeAuthTitle');
    const message=document.getElementById('placeAuthMessage');
    const login=document.getElementById('placeAuthLogin');
    if(!dialog||!title||!message||!login)return;
    const backendAvailable=state.backendAvailable===true;
    title.textContent=backendAvailable?'Đăng nhập để tiếp tục':'Chức năng này cần máy chủ PHP và cơ sở dữ liệu';
    message.textContent=backendAvailable
      ? `${actionName} cần tài khoản What2Eat. Bạn có thể đăng nhập rồi quay lại trang quán này.`
      : 'Bản xem thử hiện chưa kết nối được API PHP/MySQL nên chưa thể lưu hoặc gửi dữ liệu. Hãy bật backend rồi thử lại.';
    login.href=`./login.php?next=${encodeURIComponent(location.pathname+location.search)}`;
    login.hidden=!backendAvailable;
    if(!dialog.open)dialog.showModal();
  }

  function recoverPlaceAuth(error, actionName) {
    if(error?.status!==401)return false;
    state.user=null;
    promptPlaceAuth(actionName);
    return true;
  }

  async function localOsmDetail(type, id) {
    const response = await fetch('/assets/data/hcm-food-places.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Không tải được dữ liệu địa điểm lưu trên website.');
    const snapshot = await response.json();
    if (!Array.isArray(snapshot.elements)) throw new Error('Dữ liệu địa điểm lưu trên website không hợp lệ.');
    const item = snapshot.elements.find(place => place.type === type && String(place.id) === id);
    if (!item) throw new Error('Địa điểm này không có trong dữ liệu lưu trên website.');
    const center = placeCoords(item);
    const nearby = snapshot.elements.filter(place => place !== item && distanceMeters(center, placeCoords(place)) <= 1000)
      .sort((a, b) => distanceMeters(center, placeCoords(a)) - distanceMeters(center, placeCoords(b))).slice(0, 4);
    return { data: item, nearby, snapshot_date: snapshot.snapshot_date, static_fallback: true };
  }

  async function loadRestaurantDetail(){
    const root=document.getElementById('restaurantDetail');if(!root)return;
    const params=new URLSearchParams(location.search),managedId=params.get('id'),osm=params.get('osm');
    const osmMatch=osm?.match(/^(node|way|relation):([1-9]\d{0,17})$/);
    if(!managedId&&!osmMatch){root.replaceChildren(element('h1','','Không tìm thấy địa điểm'),element('p','w2e-place-empty','Hãy chọn một quán trên bản đồ Khám phá.'));return;}
    try{
      let place,notesRoute,alternatives=[];
      if(osmMatch){
        const lat=Number(params.get('lat')),lon=Number(params.get('lon'));
        if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('Liên kết địa điểm thiếu tọa độ. Hãy mở lại từ trang Khám phá.');
        let result;
        try {
          result=await api(`/restaurants/osm/${osmMatch[1]}/${osmMatch[2]}?${new URLSearchParams({lat:String(lat),lon:String(lon)})}`);
          if (!result?.data?.tags) throw new Error('Phản hồi địa điểm không hợp lệ.');
        } catch (error) {
          if (error.status && error.status < 500) {
            if (error.status !== 404 || /ẩn/i.test(error.message)) throw error;
            const local = await localOsmDetail(osmMatch[1],osmMatch[2]);
            if (!local.data.import_id) throw error;
            result = local;
          } else {
            result=await localOsmDetail(osmMatch[1],osmMatch[2]);
          }
        }
        const item=result.data,[latitude,longitude]=placeCoords(item);
        alternatives=result.nearby||[];
        const activityStatus=item.verification_status||'unverified';
        const imported=Boolean(item.import_id);
        const verifiedLabel=activityStatus==='verified_active'?`Đã xác minh hoạt động${item.verified_at?' · '+new Date(String(item.verified_at).replace(' ','T')+'Z').toLocaleDateString('vi-VN'):''}`:activityStatus==='reported_closed'?'Đã báo đóng cửa':'Chờ xác minh';
        place={source:'osm',sourceId:`${osmMatch[1]}:${osmMatch[2]}`,name:placeName(item),address:addressOf(item.tags,item)+(item.address_source?' ('+item.address_source+')':''),category:item.category||item.tags?.['w2e:category']||null,cuisine:cuisineLabel(cuisineOf(item.tags,item)),latitude,longitude,phone:item.tags?.phone||item.tags?.['contact:phone']||null,website:item.tags?.website||item.tags?.['contact:website']||null,opening:item.tags?.opening_hours||null,price:item.tags?.price_range||null,sourceUrl:item.source_url||null,dataSource:item.data_source||null,sourceUpdatedAt:item.source_updated_at||null,description:null,sponsored:false,verificationStatus:activityStatus,verificationSource:item.verification_source||null,verificationNote:item.verification_note||null,verifiedAt:item.verified_at||null,sourceLabel:imported?`${item.data_source||'Dữ liệu bổ sung'} · ${verifiedLabel}`:result.static_fallback?`OpenStreetMap · dữ liệu lưu ngày ${result.snapshot_date||'không rõ'} · chưa xác minh hoạt động`:verifiedLabel==='Chờ xác minh'?'OpenStreetMap':verifiedLabel};
        notesRoute=`/restaurants/osm/${osmMatch[1]}/${osmMatch[2]}/notes`;
      }else{
        if(!/^\d+$/.test(managedId))throw new Error('Mã địa điểm không hợp lệ.');
        const result=await api(`/restaurants/managed/${managedId}`),item=result.data;
        place={source:'managed',sourceId:String(item.id),restaurantId:item.id,favoriteSource:item.source,name:item.name,address:item.address,cuisine:item.category_name||cuisineLabel(item.cuisine),latitude:item.latitude,longitude:item.longitude,phone:item.phone,website:item.website,opening:item.opening_hours?.text||null,price:item.price_range,description:item.description,sponsored:item.sponsored,sourceLabel:'Thông tin được What2Eat duyệt'};
        notesRoute=`/restaurants/managed/${managedId}/notes`;
      }
      let notes=[],notesUnavailable=false;
      try { notes=(await api(notesRoute)).data||[]; }
      catch(error) { notesUnavailable=true; console.warn('Không tải được Food Note của địa điểm:',error); }
      root.replaceChildren();document.title=`${place.name} | What2Eat`;
      const heading=element('div','w2e-place-heading');const kicker=element('div','w2e-place-kicker');kicker.appendChild(element('span','',place.sourceLabel));if(place.sponsored)kicker.appendChild(element('span','w2e-sponsored-label','Tài trợ'));
      heading.append(kicker,element('h1','',place.name),element('p','w2e-place-address',place.address||'Địa chỉ chưa được ghi nhận.'));
      const actions=element('div','w2e-place-actions');
       const action=(tag,label,primary=false)=>element(tag,`w2e-place-button${primary?' w2e-place-button--primary':''}`,label);
       const favorite=action('button','Lưu quán');favorite.type='button';
      const key=place.source==='osm'?`osm:${place.sourceId}`:`${place.favoriteSource}:managed:${place.restaurantId}`;
       const updateFavorite=()=>{const saved=state.favoriteKeys.has(key);favorite.textContent=saved?'Đã lưu':'Lưu quán';favorite.setAttribute('aria-pressed',String(saved));};updateFavorite();
       favorite.addEventListener('click',async()=>{if(!state.user){promptPlaceAuth('Lưu quán');return;}favorite.disabled=true;try{const result=await api('/favorites',{method:'POST',body:JSON.stringify({source:place.source==='osm'?'osm':place.favoriteSource,source_id:place.source==='osm'?place.sourceId:`managed:${place.restaurantId}`,restaurant_id:place.restaurantId||null,name:place.name,address:place.address||null,latitude:Number.isFinite(Number(place.latitude))?Number(place.latitude):null,longitude:Number.isFinite(Number(place.longitude))?Number(place.longitude):null})});if(result.favorite)state.favoriteKeys.add(key);else state.favoriteKeys.delete(key);updateFavorite();toast(result.favorite?'Đã lưu quán.':'Đã bỏ lưu quán.','success');}catch(error){if(!recoverPlaceAuth(error,'Lưu quán'))toast(error.message,'error');}finally{favorite.disabled=false;}});
       const note=action('a','Viết Food Note',true);const noteParams=new URLSearchParams({place:place.source==='osm'?`osm:${place.sourceId}`:`managed:${place.restaurantId}`});if(place.source==='osm'){noteParams.set('lat',String(place.latitude));noteParams.set('lon',String(place.longitude));}note.href=`./create-food-note.php?${noteParams}`;note.addEventListener('click',async event=>{event.preventDefault();try{const session=await api('/auth/me');state.backendAvailable=true;state.user=session.user;state.csrf=session.csrf_token||state.csrf;if(!state.user){promptPlaceAuth('Viết Food Note');return;}location.assign(note.href);}catch(_){state.backendAvailable=false;state.user=null;promptPlaceAuth('Viết Food Note');}});
      actions.append(favorite,note);
      const coords=[Number(place.latitude),Number(place.longitude)],hasCoords=place.latitude!=null&&place.longitude!=null&&coords.every(Number.isFinite);
       if(hasCoords){const mapLink=action('a','Xem trên bản đồ');mapLink.href=`./discovery.php?${new URLSearchParams({focus:'1',lat:String(coords[0]),lon:String(coords[1]),name:place.name})}`;actions.appendChild(mapLink);}
       if(place.address){const copy=action('button','Sao chép địa chỉ');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(place.address);toast('Đã sao chép địa chỉ.','success');}catch(_){toast('Trình duyệt không cho phép sao chép.','warning');}});actions.appendChild(copy);}
       const report=action('button','Báo thông tin sai');report.type='button';report.addEventListener('click',()=>{if(!state.user){promptPlaceAuth('Gửi báo cáo thông tin');return;}document.getElementById('placeReportDialog').showModal();});actions.appendChild(report);
       correctionForm(place,actions);root.append(heading,actions);
      const layout=element('div','w2e-place-layout'),content=element('div');
      const info=element('section','w2e-place-section');info.appendChild(element('h2','','Thông tin địa điểm'));
      const facts=element('dl','w2e-place-facts');[['Danh mục',place.category],['Món / loại hình',place.cuisine],['Giờ mở cửa',place.opening],['Khoảng giá',place.price],['Điện thoại',place.phone],['Ngày cập nhật nguồn',place.sourceUpdatedAt]].forEach(([label,value])=>{if(!value)return;const item=element('div','w2e-place-fact');item.append(element('dt','',label),element('dd','',value||'Chưa có dữ liệu'));facts.appendChild(item);});info.appendChild(facts);
      if(place.description)info.appendChild(element('p','mt-3 mb-0',place.description));
       if(place.website&&/^https?:\/\//i.test(place.website)){const website=element('a','d-inline-block mt-3','Website của quán');website.href=place.website;website.target='_blank';website.rel='noopener noreferrer';info.appendChild(website);}
       if(place.sourceUrl&&/^https?:\/\//i.test(place.sourceUrl)){const source=element('a','d-block mt-2','Mở URL nguồn');source.href=place.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';info.appendChild(source);}
       else if(place.dataSource)info.appendChild(element('p','small text-secondary mt-2',`Nguồn trong tệp: ${place.dataSource} · chưa có URL đối chiếu.`));
      info.append(element('p','small text-secondary','Thông tin còn thiếu? Chọn Bổ sung/sửa thông tin để đóng góp.'));content.appendChild(info);
      const community=element('section','w2e-place-section');community.appendChild(element('h2','',`Food Note từ cộng đồng (${notes.length})`));
      const list=element('div','w2e-place-note-list');notes.forEach((item)=>{const card=element('article','w2e-place-note');card.appendChild(element('strong','',item.food_name));card.appendChild(element('div','w2e-place-note-meta',`${item.author_name||'Thành viên'} · ${item.rating==null?'Chưa chấm điểm':`${item.rating}/5`} · ${localDate(item.eaten_at||item.created_at)}`));if(item.review)card.appendChild(element('p','',item.review));const image=item.media?.find(media=>String(media.mime_type).startsWith('image/'));if(image){const img=element('img');img.src=image.url;img.alt=item.food_name;img.loading='lazy';card.appendChild(img);}list.appendChild(card);});
       if(!notes.length)list.appendChild(element('p','w2e-place-empty',notesUnavailable?'Food Note tạm thời không tải được.':'Chưa có Food Note công khai về quán này.'));
      community.appendChild(list);content.appendChild(community);
      if(alternatives.length){const nearby=element('section','w2e-place-section');nearby.appendChild(element('h2','','Quán gần đây'));alternatives.forEach((candidate)=>{const row=element('div','w2e-place-nearby'),link=element('a','',placeName(candidate));link.href=placeUrl(candidate);const [otherLat,otherLon]=placeCoords(candidate);const distance=distanceKm(coords[0],coords[1],otherLat,otherLon);row.append(link,element('span','',Number.isFinite(distance)?`${Math.round(distance*1000)} m`:'Gần đây'));nearby.appendChild(row);});content.appendChild(nearby);}
      const mapWrap=element('aside','w2e-place-map-wrap');const mapElement=element('div','w2e-place-map');mapElement.id='placeDetailMap';mapElement.setAttribute('role','region');mapElement.setAttribute('aria-label',`Bản đồ vị trí ${place.name}`);mapWrap.appendChild(mapElement);mapWrap.appendChild(element('p','w2e-place-map-caption','© OpenStreetMap contributors · Vị trí và thông tin cộng đồng có thể chưa cập nhật.'));
      layout.append(content,mapWrap);root.appendChild(layout);
      if(hasCoords&&window.L){const map=L.map(mapElement,{scrollWheelZoom:false}).setView(coords,16);L.tileLayer('/tiles/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const marker=L.marker(coords).addTo(map);marker.bindPopup(element('strong','',place.name));setTimeout(()=>map.invalidateSize(),0);}else mapElement.textContent='Chưa có bản đồ cho địa điểm này.';
      const dialog=document.getElementById('placeReportDialog'),form=document.getElementById('placeReportForm');document.getElementById('cancelPlaceReport').onclick=()=>dialog.close();
       form.onsubmit=async(event)=>{event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;try{await api('/place-reports',{method:'POST',body:JSON.stringify({source:place.source,source_id:place.sourceId,place_name:place.name,address:place.address||null,latitude:hasCoords?coords[0]:null,longitude:hasCoords?coords[1]:null,reason:document.getElementById('placeReportReason').value,details:document.getElementById('placeReportDetails').value.trim()||null})});dialog.close();form.reset();toast('Đã gửi báo cáo để quản trị viên kiểm tra.','success');}catch(error){if(!recoverPlaceAuth(error,'Gửi báo cáo thông tin'))toast(error.message,'error');}finally{submit.disabled=false;}};
    }catch(error){root.replaceChildren(element('h1','','Không tải được địa điểm'),element('p','w2e-place-empty',error.message));}
  }

  async function showPlan(id) {
    try {
      const result=await api(`/food-plans/${id}`);const plan=result.data;let panel=document.getElementById('w2ePlanLiveDetail');
      if(!panel){panel=element('section','w2e-detail-section');panel.id='w2ePlanLiveDetail';document.querySelector('.w2e-plans-section')?.append(panel);}
      panel.classList.add('show');panel.replaceChildren();
      const heading=element('div','w2e-detail-header');const title=element('h2','w2e-detail-title',plan.name);const dismiss=element('button','w2e-detail-close','Đóng');dismiss.type='button';dismiss.addEventListener('click',()=>panel.classList.remove('show'));heading.append(title,dismiss);
      const content=element('div','w2e-detail-body');const eventDate=parsePlanDate(plan.event_at);content.append(element('p','',plan.description||''),element('p','w2e-plan-meta',`Trạng thái: ${plan.status==='open'?'Đang bình chọn':plan.status} · ${eventDate?eventDate.toLocaleString('vi-VN'):'Chưa đặt thời gian'}`));panel.append(heading,content);
      if(plan.member_role==='owner'&&plan.status==='open'){
        const close=element('button','btn btn-outline-secondary mb-3','Chốt kết quả và đóng bình chọn');close.type='button';close.addEventListener('click',async()=>{const eventAt=parsePlanDate(plan.event_at)?.toISOString()||null;try{await api(`/food-plans/${plan.id}`,{method:'PATCH',body:JSON.stringify({name:plan.name,description:plan.description||'',event_at:eventAt,status:'decided'})});await loadPlans();await showPlan(plan.id);toast('Food Plan đã chốt bình chọn.','success');}catch(error){toast(error.message,'error');}});content.appendChild(close);
      }
      const list=element('div','w2e-live-proposals');
      (plan.proposals||[]).forEach((proposal)=>{
        const row=element('div','w2e-vote-item');const info=element('div','w2e-vote-info');info.append(element('strong','',proposal.name),element('div','w2e-vote-meta',`${proposal.address||'Địa chỉ chưa có'} · ${proposal.votes} phiếu`));
        const source=element('a','small','Xem chi tiết trên What2Eat ↗');source.href=savedPlaceUrl(proposal);info.appendChild(source);
        const vote=element('button','w2e-vote-btn',proposal.my_vote?'Đã bình chọn':'Bình chọn');vote.type='button';vote.disabled=Boolean(proposal.my_vote)||plan.status!=='open';vote.addEventListener('click',async()=>{try{await api(`/food-plans/${plan.id}/vote`,{method:'POST',body:JSON.stringify({proposal_id:proposal.id})});await showPlan(plan.id);await loadPlans();}catch(error){toast(error.message,'error');}});row.append(info,vote);list.appendChild(row);
      });
      content.appendChild(element('h3','w2e-section-title','Địa điểm được đề xuất'));content.appendChild(list);
      if(plan.status==='open'){
        const finder=element('div','w2e-plan-place-finder mt-4');finder.appendChild(element('h3','w2e-section-title','Thêm địa điểm từ OpenStreetMap'));
        const form=element('form','d-flex gap-2 flex-wrap');const input=element('input','form-control');input.type='search';input.placeholder='Tìm theo tên trong khu vực của bạn';input.setAttribute('aria-label','Tìm địa điểm OpenStreetMap');const searchButton=element('button','btn w2e-btn-primary','Tìm quanh tôi');searchButton.type='submit';form.append(input,searchButton);finder.appendChild(form);finder.appendChild(element('small','text-secondary','Kết quả và liên kết nguồn do OpenStreetMap cung cấp.'));
        const results=element('div','w2e-live-proposals mt-3');finder.appendChild(results);form.addEventListener('submit',event=>{event.preventDefault();searchPlanPlaces(plan, input.value, results, searchButton);});content.appendChild(finder);
      }
      content.appendChild(element('h3','w2e-section-title','Thành viên'));(plan.members||[]).forEach(member=>content.appendChild(element('p','w2e-member-item',member.name+(member.role==='owner'?' · Chủ kế hoạch':''))));panel.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){toast(error.message,'error');}
  }

  async function searchPlanPlaces(plan,query,results,button){
    if(!plan||plan.status!=='open')return;
    const term=query.trim().toLocaleLowerCase('vi');
    results.replaceChildren(element('p','text-secondary','Đang tìm địa điểm quanh vị trí hiện tại…'));
    button.disabled=true;
    try{
      const center=await chosenCenter();
      const [osm,managed]=await Promise.all([nearby(center,5000),loadManagedPlaces()]);
      const places=[...(osm.elements||[]),...managed].filter(place=>{
        const coords=placeCoords(place);
        const name=placeName(place);
        const address=place.managed_record?place.restaurant.address:addressOf(place.tags,place);
        return name&&coords.every(Number.isFinite)&&(!term||`${name} ${address||''} ${cuisineOf(place.tags,place)}`.toLocaleLowerCase('vi').includes(term));
      }).slice(0,10);
      results.replaceChildren();
      if(!places.length){results.appendChild(element('p','text-secondary','Không tìm thấy địa điểm khớp trong OpenStreetMap hoặc danh mục What2Eat ở khu vực hiện tại.'));return;}
      const existing=new Set((plan.proposals||[]).map(proposal=>`${proposal.source}:${proposal.source_id}`));
      places.forEach(place=>{
        const sourceName=place.managed_record?(place.source||'admin'):'osm';
        const sourceId=place.managed_record?`managed:${place.id}`:placeId(place);
        const address=place.managed_record?place.restaurant.address:addressOf(place.tags,place);
        const sourceUrl=new URL(placeUrl(place),location.origin).href;
        const key=`${sourceName}:${sourceId}`;
        const row=element('div','w2e-vote-item');
        const info=element('div','w2e-vote-info');
        info.append(element('strong','',placeName(place)),element('div','w2e-vote-meta',address||'Chưa ghi địa chỉ.'));
        const source=element('a','small','Xem chi tiết trên What2Eat ↗');
        source.href=placeUrl(place);info.appendChild(source);
        const alreadyAdded=existing.has(key);
        const add=element('button','btn btn-sm btn-outline-primary',alreadyAdded?'Đã đề xuất':'Thêm vào bình chọn');
        add.type='button';add.disabled=alreadyAdded;
        add.addEventListener('click',async()=>{
          const coords=placeCoords(place);add.disabled=true;
          try{
            await api(`/food-plans/${plan.id}/proposals`,{method:'POST',body:JSON.stringify({source:sourceName,source_id:sourceId,name:placeName(place),address:address||null,latitude:coords[0],longitude:coords[1],source_url:sourceUrl,restaurant_id:place.managed_record?place.id:null})});
            toast('Đã thêm địa điểm vào Food Plan.','success');await showPlan(plan.id);
          }catch(error){add.disabled=false;toast(error.message,'error');}
        });
        row.append(info,add);results.appendChild(row);
      });
    }catch(error){results.replaceChildren(element('p','text-danger',error.message));}
    finally{button.disabled=false;}
  }

  function fillIdentity(user) {
    const adminLinks=document.querySelectorAll('a[href*="/admin"],a[href^="./admin"]');adminLinks.forEach((a)=>{if(user?.role!=='admin')a.hidden=true;});
    if(!user)return;
    document.querySelectorAll('.w2e-avatar-name,.w2e-profile-name,.w2e-topbar-admin-name,.w2e-sidebar-admin-name,.topbar-right .fw-600.small,[data-w2e-user-name]').forEach((n)=>n.textContent=user.name);
    document.querySelectorAll('.w2e-profile-email,[data-w2e-user-email]').forEach((n)=>n.textContent=user.email);
    document.querySelectorAll('.w2e-avatar-btn img,.w2e-profile-avatar,.w2e-topbar-admin img,.admin-topbar-right img,img[data-admin-avatar],img[data-w2e-user-avatar]').forEach((img)=>{if(user.avatar_url){img.hidden=false;img.src=user.avatar_url;}else{img.hidden=true;}});
    const adminDate=document.querySelector('.admin-topbar-right .text-secondary.small.me-3');if(adminDate)adminDate.textContent=new Date().toLocaleDateString('vi-VN');
    const nameInput=document.getElementById('fullName');if(nameInput)nameInput.value=user.name;
    const emailInput=document.getElementById('email');if(emailInput)emailInput.value=user.email;
    const guestLogout=document.querySelector('.dropdown-menu a[href="./login.php"]');if(guestLogout&&guestLogout.closest('.dropdown')){guestLogout.href='#logout';guestLogout.innerHTML='<i class="bi bi-box-arrow-right me-2"></i>Đăng xuất';}
    const nav=document.querySelector('.w2e-nav-auth');if(nav){nav.replaceChildren();const dashboard=element('a','btn-login','Bảng điều khiển');dashboard.href=location.pathname.includes('/pages/')?'./dashboard.php':'./pages/dashboard.php';nav.appendChild(dashboard);if(user.role==='admin'){const admin=element('a','btn-login','Quản trị');admin.href=location.pathname.includes('/pages/')?'../admin/index.php':'./admin/index.php';nav.appendChild(admin);}const profile=element('a','small fw-semibold',user.name);profile.href='/pages/profile.php';nav.appendChild(profile);const logout=element('a','btn-signup','Đăng xuất');logout.href='#logout';nav.appendChild(logout);}
  }

  async function loadProfileData(){
    const response=await api('/profile');const user=response.user;state.user=user;fillIdentity(user);const phone=document.getElementById('phone');if(phone)phone.value=user.phone||'';
    const preferences=Array.isArray(user.preferences)?user.preferences:[];document.querySelectorAll('#prefForm input[type="checkbox"],#prefForm input[type="radio"]').forEach((input)=>{input.checked=preferences.includes(input.value);input.closest('label')?.classList.toggle(input.type==='radio'?'selected':'checked',input.checked);});const distance=preferences.find(value=>/^distance:(?:0\.5|[1-9](?:\.5)?|10)$/.test(value));const slider=document.getElementById('distanceSlider');if(slider&&distance){slider.value=distance.split(':')[1];window.updateSlider?.(slider);}
    ['dob','gender','address'].forEach((id)=>{const field=document.getElementById(id);if(field)field.closest('.col-12')?.setAttribute('hidden','');});
    const created=document.getElementById('accountCreatedAt');if(created)created.textContent=localDate(user.created_at);const status=document.getElementById('accountStatus');if(status)status.textContent=({active:'Đang hoạt động',pending:'Chưa xác thực',suspended:'Đã tạm khóa'})[user.status]||'Không rõ';const verified=document.getElementById('accountEmailVerified');if(verified){verified.textContent=user.email_verified_at?'Đã xác thực':'Chưa xác thực';verified.style.color=user.email_verified_at?'var(--w2e-success)':'var(--w2e-warning)';}const lastLogin=document.getElementById('accountLastLogin');if(lastLogin)lastLogin.textContent=user.last_login_at?new Date(`${String(user.last_login_at).replace(' ','T')}Z`).toLocaleString('vi-VN'):'Chưa ghi nhận';const deleteEmail=document.getElementById('deleteAccountEmail');if(deleteEmail)deleteEmail.textContent=user.email;const deleteZone=document.querySelector('.w2e-danger-zone');if(deleteZone&&user.role==='admin')deleteZone.hidden=true;
    const [d,noteCount]=await Promise.all([api('/dashboard'),api('/food-notes?page=1&limit=1')]);const stats=document.querySelectorAll('.w2e-profile-stat-num');if(stats.length>=3){stats[0].textContent=String(d.stats?.total_notes||0);stats[1].textContent=String(d.stats?.total_favorites||0);stats[2].textContent=String(d.stats?.food_plans||0);}const deleteNotes=document.getElementById('deleteNoteCount'),deleteFavorites=document.getElementById('deleteFavoriteCount');if(deleteNotes)deleteNotes.textContent=String(noteCount.total||0);if(deleteFavorites)deleteFavorites.textContent=String(d.stats?.total_favorites||0);document.body.classList.add('w2e-profile-stats-ready','w2e-live-ready');
    const host=document.getElementById('tab-info');
    if(host&&!document.getElementById('profileCollections')){
      const section=element('section','w2e-profile-activity');section.id='profileCollections';section.setAttribute('aria-labelledby','profileCollectionsTitle');
      const heading=element('div','w2e-profile-activity__heading');
      const intro=element('div','w2e-profile-activity__intro');
      intro.append(element('p','w2e-profile-activity__eyebrow','DẤU ẤN CỦA BẠN'),element('h3','w2e-profile-activity__title','Hoạt động của tôi'),element('p','w2e-profile-activity__description','Những quán, món ăn và cuộc hẹn bạn đã lưu lại.'));
      const role=element('span','w2e-profile-activity__role',user.role==='admin'?'QUẢN TRỊ VIÊN':'THÀNH VIÊN');heading.append(intro,role);section.appendChild(heading);
      const [favorites,notes,plans]=await Promise.all([loadAllFavorites(),api('/food-notes?page=1&limit=10'),api('/food-plans')]);
      const categories=[
        {number:'01',eyebrow:'ĐỊA ĐIỂM',title:'Quán đã lưu',description:'Những nơi bạn muốn ghé lại.',items:favorites,count:favorites.length,name:item=>item.name,detail:item=>item.address||'',url:item=>savedPlaceUrl(item),allUrl:'./dashboard.php',empty:'Chưa có quán nào được lưu.'},
        {number:'02',eyebrow:'NHẬT KÝ ĂN UỐNG',title:'Food Note của tôi',description:'Món ăn và trải nghiệm gần đây.',items:notes.data||[],count:Number(notes.total)||notes.data?.length||0,name:item=>item.food_name,detail:item=>item.restaurant_name||(item.eaten_at?localDate(item.eaten_at):''),url:item=>'/pages/create-food-note.php?edit='+item.id,allUrl:'./food-notes.php',empty:'Food Note đầu tiên của bạn sẽ xuất hiện ở đây.'},
        {number:'03',eyebrow:'CUỘC HẸN',title:'Kế hoạch của tôi',description:'Những lần hẹn ăn cùng mọi người.',items:plans.data||[],count:(plans.data||[]).length,name:item=>item.name,detail:item=>{const date=parsePlanDate(item.event_at);return date?date.toLocaleDateString('vi-VN',{day:'2-digit',month:'short'}):'';},url:item=>'/pages/food-plans.php?plan='+item.id,allUrl:'./food-plans.php',empty:'Chưa có kế hoạch ăn uống nào.'}
      ];
      const grid=element('div','w2e-profile-activity__grid');
      categories.forEach((category)=>{
        const card=element('article',`w2e-profile-activity__card w2e-profile-activity__card--${category.number}`);
        const cardHead=element('div','w2e-profile-activity__card-head');cardHead.append(element('span','w2e-profile-activity__card-eyebrow',`${category.number} / ${category.eyebrow}`),element('span','w2e-profile-activity__count',`${category.count} mục`));
        card.append(cardHead,element('h4','w2e-profile-activity__card-title',category.title),element('p','w2e-profile-activity__card-description',category.description));
        const list=element('div','w2e-profile-activity__list');
        if(!category.items.length)list.appendChild(element('p','w2e-profile-activity__empty',category.empty));
        category.items.slice(0,4).forEach((item,index)=>{
          const link=element('a','w2e-profile-activity__row');link.href=category.url(item);
          const copy=element('span','w2e-profile-activity__row-copy');copy.appendChild(element('strong','',category.name(item)||'Chưa có tiêu đề'));
          const detail=category.detail(item);if(detail)copy.appendChild(element('small','',detail));
          link.append(element('span','w2e-profile-activity__row-number',String(index+1).padStart(2,'0')),copy,element('span','w2e-profile-activity__row-action','Mở'));list.appendChild(link);
        });
        const all=element('a','w2e-profile-activity__all','Xem danh sách');all.href=category.allUrl;card.append(list,all);grid.appendChild(card);
      });
      section.appendChild(grid);host.appendChild(section);
    }

  }

  async function renderDashboard() {
    try{
      const d=await api('/dashboard');document.body.classList.add('w2e-live-ready');const s=d.stats||{};const stats=document.querySelectorAll('.w2e-stat-value');if(stats.length>=4){stats[0].textContent=String(s.total_notes??0);stats[1].textContent=money(s.total_spent??0);stats[2].textContent=s.average_rating==null?'—':Number(s.average_rating).toFixed(1);stats[3].textContent=d.top_restaurants?.[0]?.name||'—';}
      const wrap=document.getElementById('dashboardRecentNotes');if(wrap){wrap.replaceChildren();(d.recent_notes||[]).forEach((n)=>{const row=element('article','w2e-note-item',`${n.food_name} · ${n.rating==null?'Chưa đánh giá':n.rating+'/5'} · ${localDate(n.eaten_at)}`);if(n.price!=null)row.appendChild(element('span','w2e-note-meta',money(n.price)));wrap.appendChild(row);});if(!d.recent_notes?.length)wrap.appendChild(element('p','text-secondary','Chưa có Food Note để thống kê.'));}
      const favSection=[...document.querySelectorAll('section')].find((s)=>s.getAttribute('aria-label')==='Quán ăn yêu thích');if(favSection){const cards=favSection.querySelector('.row');if(cards){cards.replaceChildren();const favorites=await loadAllFavorites();const badge=document.getElementById('favoriteCountBadge');if(badge)badge.textContent=`${favorites.length} địa điểm`;favorites.forEach((f)=>{const col=element('div','col-12 col-sm-6 col-lg-3');const card=element('article','w2e-fav-card');card.append(element('div','w2e-fav-card-name',f.name),element('p','w2e-fav-card-rating',f.address||'Địa chỉ chưa được ghi.'));const a=element('a','btn btn-outline-secondary','Xem chi tiết');a.href=savedPlaceUrl(f);card.appendChild(a);col.appendChild(card);cards.appendChild(col);});if(!favorites.length)cards.appendChild(element('p','text-secondary','Bạn chưa lưu địa điểm nào.'));document.body.classList.add('w2e-favorites-ready');}}
      const charts=[['spendingLineChart',(d.monthly||[]).map(x=>x.month),(d.monthly||[]).map(x=>Number(x.spent)),(d.monthly||[]).map(x=>Number(x.notes))],['foodCatPieChart',(d.categories||[]).map(x=>x.category),(d.categories||[]).map(x=>Number(x.total))],['topRestoBarChart',(d.top_restaurants||[]).map(x=>x.name),(d.top_restaurants||[]).map(x=>Number(x.visits))]];
      charts.forEach(([id,labels,data,second])=>{const canvas=document.getElementById(id);const chart=canvas&&window.Chart?.getChart(canvas);if(chart){chart.data.labels=labels;if(id==='spendingLineChart'&&chart.data.datasets.length>1){chart.data.datasets[0].data=data;chart.data.datasets[1].data=second;}else chart.data.datasets.forEach(ds=>{ds.data=data;});chart.update();}});
      const pieLegend=document.getElementById('pieLegend');if(pieLegend){const colors=['#D4A017','#4A2C1A','#2D9B6F','#5B8DEF','#C47E5A','#8E6F55','#607D8B','#9C7C38'];pieLegend.replaceChildren();(d.categories||[]).forEach((category,index)=>{const item=element('span','d-inline-flex align-items-center gap-1 small');const swatch=element('span');swatch.style.cssText=`display:inline-block;width:10px;height:10px;border-radius:3px;background:${colors[index%colors.length]}`;item.append(swatch,document.createTextNode(`${category.category} (${category.total})`));pieLegend.appendChild(item);});if(!d.categories?.length)pieLegend.appendChild(element('span','text-secondary small','Chưa có Food Note để phân loại.'));}
    }catch(error){toast(error.message,'error');}
  }

  function renderAdminPendingNotes(notes){const wrap=document.getElementById('pendingNoteList');if(!wrap)return;wrap.replaceChildren();(notes||[]).forEach(note=>{const row=element('div','pending-note-item');const details=element('div','flex-grow-1');details.append(element('div','fw-600 small',note.food_name),element('div','text-secondary',`${note.author_name} · ${localDate(note.created_at)}`));const actions=element('div','d-flex gap-1');[['published','Duyệt','btn-success'],['rejected','Từ chối','btn-outline-secondary']].forEach(([status,label,style])=>{const button=element('button',`btn btn-sm ${style} py-0 px-2`,label);button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{await api(`/admin/food-notes/${note.id}`,{method:'PATCH',body:JSON.stringify({status})});toast('Đã cập nhật trạng thái Food Note.','success');await adminLoad();}catch(error){toast(error.message,'error');button.disabled=false;}});actions.appendChild(button);});row.append(details,actions);wrap.appendChild(row);});if(!notes?.length)wrap.appendChild(element('p','text-secondary small mb-0','Không có Food Note chờ duyệt.'));}
  function renderPlaceReports(reports,blocks){
    const queue=document.getElementById('placeReportQueue'),blocked=document.getElementById('blockedPlaceList');if(!queue||!blocked)return;
    const labels={closed:'Đã đóng cửa',moved:'Đã chuyển địa chỉ',wrong_info:'Thông tin chưa đúng',other:'Vấn đề khác'};
    document.getElementById('placeReportCount').textContent=`(${reports.length} chờ xử lý)`;
    queue.replaceChildren();blocked.replaceChildren();
    reports.forEach((report)=>{
      const row=element('div','w2e-place-review-row'),info=element('div');info.appendChild(element('strong','',report.place_name));
      info.appendChild(element('p','',`${labels[report.reason]||report.reason} · ${report.reporter_name} · ${localDate(report.created_at)}`));
      if(report.details)info.appendChild(element('p','',report.details));
      const actions=element('div','w2e-place-review-actions');
      const coords=[Number(report.latitude),Number(report.longitude)];
      if(report.source==='managed'||(report.latitude!=null&&report.longitude!=null&&coords.every(Number.isFinite))){const link=element('a','btn btn-sm btn-outline-secondary','Xem địa điểm');link.href=report.source==='managed'?`../pages/restaurant.php?id=${encodeURIComponent(report.source_id)}`:`../pages/restaurant.php?${new URLSearchParams({osm:report.source_id,lat:String(coords[0]),lon:String(coords[1])})}`;link.target='_blank';link.rel='noopener noreferrer';actions.appendChild(link);}
      [['resolved','Đã xử lý',false],['resolved','Ẩn địa điểm',true],['dismissed','Không xác nhận',false]].forEach(([status,label,hide])=>{const button=element('button',`btn btn-sm ${hide?'btn-outline-danger':'btn-outline-primary'}`,label);button.type='button';button.addEventListener('click',async()=>{if(hide&&!window.confirm(`Ẩn “${report.place_name}” khỏi Khám phá sau khi xác minh?`))return;button.disabled=true;try{await api(`/admin/place-reports/${report.id}`,{method:'PATCH',body:JSON.stringify({status,hide_place:hide})});toast('Đã xử lý báo cáo.','success');await adminLoad();}catch(error){toast(error.message,'error');button.disabled=false;}});actions.appendChild(button);});
      row.append(info,actions);queue.appendChild(row);
    });
    if(!reports.length)queue.appendChild(element('p','text-secondary small','Không có báo cáo chờ kiểm tra.'));
    blocks.forEach((item)=>{const row=element('div','w2e-place-review-row'),info=element('div');info.append(element('strong','',item.source_id),element('p','',`Lý do: ${labels[item.reason]||item.reason||'Đã xác minh'} · ${localDate(item.created_at)}`));const restore=element('button','btn btn-sm btn-outline-success','Khôi phục');restore.type='button';restore.addEventListener('click',async()=>{if(!window.confirm(`Hiển thị lại ${item.source_id} trên Khám phá?`))return;restore.disabled=true;try{await api(`/admin/osm-place-blocks/${item.source_id}`,{method:'DELETE',body:'{}'});toast('Đã khôi phục địa điểm.','success');await adminLoad();}catch(error){toast(error.message,'error');restore.disabled=false;}});row.append(info,restore);blocked.appendChild(row);});
    if(!blocks.length)blocked.appendChild(element('p','text-secondary small','Chưa có địa điểm OSM nào bị ẩn.'));
  }

  async function adminLoad() {
    const path=location.pathname.toLowerCase();
    if(path.endsWith('/admin/index.php')){
      const [d,pending]=await Promise.all([api('/admin/dashboard'),api('/admin/food-notes?status=pending')]);document.body.classList.add('w2e-live-ready');document.querySelectorAll('.admin-stat-card .stat-value').forEach((node,i)=>{const key=['users','restaurants','food_notes','pending_notes'][i];node.textContent=new Intl.NumberFormat('vi-VN').format(d.counts?.[key]??0);});renderAdminPendingNotes(pending.data||[]);
      [['usersChart',d.user_series||[],x=>x.day,x=>Number(x.total)],['notesChart',d.note_series||[],x=>x.month,x=>Number(x.total)]].forEach(([id,rows,label,value])=>{const chart=window.Chart?.getChart(document.getElementById(id));if(chart){chart.data.labels=rows.map(label);chart.data.datasets.forEach(ds=>ds.data=rows.map(value));chart.update();}});
      const activity=document.getElementById('activityTableBody');if(activity){activity.replaceChildren();(d.activity||[]).forEach((row)=>{const tr=document.createElement('tr');[localDate(row.created_at),`${row.action} · ${row.entity_type}`,row.actor_name||'Hệ thống',row.action].forEach(v=>tr.appendChild(element('td','',text(v))));activity.appendChild(tr);});if(!d.activity?.length)activity.appendChild(emptyRow(4,'Chưa có hoạt động được ghi nhận.'));}return;
    }
    if(path.endsWith('/admin/restaurants.php')){
      const body=document.getElementById('tableBody');if(!body)return;
      setRestaurantAdminNotice('Đang tải danh sách địa điểm từ cơ sở dữ liệu…','info',false);
      const [restaurants,categories,reports,blocks]=await Promise.all([api('/admin/restaurants?status=all'),api('/admin/categories'),api('/admin/place-reports'),api('/admin/osm-place-blocks')]);
      state.adminRestaurants=restaurants.data||[];state.adminCategories=categories.data||[];
      fillCategoryOptions(document.getElementById('restaurantCategory'),state.adminCategories,true);fillCategoryOptions(document.getElementById('catFilter'),state.adminCategories,false);
      document.body.classList.add('w2e-live-ready');renderAdminRestaurants();renderPlaceReports(reports.data||[],blocks.data||[]);
      const notice=document.getElementById('restaurantLoadNotice');if(notice)notice.hidden=true;
    }else if(path.endsWith('/admin/users.php')){
      const body=document.getElementById('userTableBody');if(!body)return;const query=new URLSearchParams({page:String(state.userPage),per_page:'50'});[['q','userSearch'],['role','roleFilter'],['status','statusFilter']].forEach(([key,id])=>{const value=document.getElementById(id)?.value.trim();if(value)query.set(key,value);});const d=await api(`/admin/users?${query}`);document.body.classList.add('w2e-live-ready');state.userPage=d.pagination?.page||1;state.userPages=d.pagination?.pages||1;state.userTotal=d.pagination?.total||0;const counts=d.counts||{};[['usersTotalCount',counts.total],['usersActiveCount',counts.active],['usersSuspendedCount',counts.suspended],['usersAdminCount',counts.admins]].forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=new Intl.NumberFormat('vi-VN').format(value||0);});body.replaceChildren();(d.data||[]).forEach((u,i)=>{const tr=document.createElement('tr');tr.appendChild(element('td','',String((state.userPage-1)*50+i+1)));const name=element('td','',u.name);name.title=u.email;tr.appendChild(name);tr.appendChild(element('td','text-secondary',u.email));tr.appendChild(element('td','',u.role==='admin'?'Admin':'User'));tr.appendChild(element('td','',String(u.notes_count||0)));const statusCell=element('td');statusCell.appendChild(element('span',`w2e-badge ${u.status==='active'?'badge-open':'badge-closed'}`,u.status==='active'?'Hoạt động':'Bị khóa'));tr.appendChild(statusCell);tr.appendChild(element('td','text-secondary small',localDate(u.created_at)));const td=element('td');if(u.role==='user'){const b=element('button',`btn btn-sm ${u.status==='suspended'?'btn-outline-success':'btn-outline-danger'}`,u.status==='suspended'?'Mở khóa':'Khóa');b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await api(`/admin/users/${u.id}`,{method:'PATCH',body:JSON.stringify({status:u.status==='suspended'?'active':'suspended'})});await adminLoad();}catch(error){toast(error.message,'error');b.disabled=false;}});td.appendChild(b);}else td.appendChild(element('span','text-secondary small','Quản trị viên'));tr.appendChild(td);body.appendChild(tr);});if(!d.data?.length)body.appendChild(emptyRow(8,'Không có tài khoản khớp bộ lọc.'));const start=(state.userTotal===0)?0:(state.userPage-1)*50+1;const end=Math.min(state.userPage*50,state.userTotal);const label=document.getElementById('userRecordCount');if(label)label.textContent=`Hiển thị ${start}–${end} / ${new Intl.NumberFormat('vi-VN').format(state.userTotal)} tài khoản`;const pageLabel=document.getElementById('userPageLabel');if(pageLabel)pageLabel.textContent=`${state.userPage} / ${state.userPages}`;const previous=document.getElementById('userPrevPage'),next=document.getElementById('userNextPage');if(previous)previous.disabled=state.userPage<=1;if(next)next.disabled=state.userPage>=state.userPages;
      (d.data||[]).forEach((u,index)=>{
        const row=body.children[index];
        if(u.status==='pending'){
          const badge=row?.querySelector('.w2e-badge');
          if(badge){badge.classList.remove('badge-closed');badge.classList.add('badge-pending');badge.textContent='Chờ xác nhận';}
        }
        if(u.role!=='user')return;
        const cell=row?.lastElementChild;
        if(!cell)return;
        const remove=element('button','btn btn-sm btn-outline-danger ms-1');
        remove.type='button';remove.title='Xóa vĩnh viễn tài khoản';remove.setAttribute('aria-label',`Xóa tài khoản ${u.email}`);
        remove.appendChild(element('i','bi bi-trash3'));
        remove.addEventListener('click',()=>openAdminUserDeletion(u));
        cell.appendChild(remove);
      });
    }else if(path.endsWith('/admin/food-notes.php')){
      const query=new URLSearchParams({status:state.foodNoteFilter,page:String(state.foodNotePage),per_page:'50'});const [d,summary]=await Promise.all([api(`/admin/food-notes?${query}`),api('/admin/dashboard')]);document.body.classList.add('w2e-live-ready');const counts=summary.counts||{};const tabs=document.querySelectorAll('#fnTabs button');[counts.food_notes||0,counts.pending_notes||0,counts.published_notes||0,counts.hidden_notes||0].forEach((count,i)=>{const span=tabs[i]?.querySelector('span');if(span)span.textContent=`(${new Intl.NumberFormat('vi-VN').format(count)})`;});const pendingBadge=document.getElementById('pendingNoteBadge');if(pendingBadge)pendingBadge.textContent=new Intl.NumberFormat('vi-VN').format(counts.pending_notes||0);[['approvedNoteCount',counts.published_notes],['pendingNoteCount',counts.pending_notes],['hiddenNoteCount',counts.hidden_notes]].forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=new Intl.NumberFormat('vi-VN').format(value||0);});const donut=window.Chart?.getChart(document.getElementById('donutChart'));if(donut){donut.data.datasets[0].data=[counts.published_notes||0,counts.pending_notes||0,counts.hidden_notes||0];donut.update();}state.foodNotePage=d.pagination?.page||1;state.foodNotePages=d.pagination?.pages||1;state.foodNoteTotal=d.pagination?.total||0;const body=document.querySelector('#fnTable tbody');if(body){body.replaceChildren();(d.data||[]).forEach((n,i)=>{const tr=document.createElement('tr');tr.dataset.status=n.status;const check=document.createElement('td');const input=element('input','w2e-checkbox fn-check');input.type='checkbox';input.value=n.id;input.addEventListener('change',updateFoodNoteBulkBar);check.appendChild(input);tr.appendChild(check);tr.appendChild(element('td','',String((state.foodNotePage-1)*50+i+1)));tr.appendChild(element('td','',n.food_name));tr.appendChild(element('td','',n.author_name));tr.appendChild(element('td','text-center',n.rating==null?'Chưa đánh giá':`${n.rating} / 5`));tr.appendChild(element('td','',n.restaurant_name||'Chưa ghi địa điểm'));tr.appendChild(element('td','',localDate(n.created_at)));tr.appendChild(element('td','',foodNoteStatusLabel(n.status)));const td=element('td','text-nowrap');if(n.status==='pending'){[['published','Duyệt'],['rejected','Từ chối']].forEach(([status,label])=>{const b=element('button','btn btn-sm btn-outline-primary me-1',label);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await api(`/admin/food-notes/${n.id}`,{method:'PATCH',body:JSON.stringify({status})});toast('Đã cập nhật trạng thái Food Note.','success');await adminLoad();}catch(error){toast(error.message,'error');b.disabled=false;}});td.appendChild(b);});}else{const b=element('button','btn btn-sm btn-outline-secondary',n.status==='hidden'?'Hiện':'Ẩn');b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await api(`/admin/food-notes/${n.id}`,{method:'PATCH',body:JSON.stringify({status:n.status==='hidden'?'published':'hidden'})});await adminLoad();}catch(error){toast(error.message,'error');b.disabled=false;}});td.appendChild(b);}tr.appendChild(td);body.appendChild(tr);});if(!d.data?.length)body.appendChild(emptyRow(9,'Không có Food Note trong mục này.'));}const start=state.foodNoteTotal?(state.foodNotePage-1)*50+1:0;const end=Math.min(state.foodNotePage*50,state.foodNoteTotal);const summaryLabel=document.getElementById('fnResultsSummary');if(summaryLabel)summaryLabel.textContent=`Hiển thị ${start}–${end} / ${new Intl.NumberFormat('vi-VN').format(state.foodNoteTotal)} ghi chú`;const pageLabel=document.getElementById('fnPageLabel');if(pageLabel)pageLabel.textContent=`${state.foodNotePage} / ${state.foodNotePages}`;const previous=document.getElementById('fnPrevPage'),next=document.getElementById('fnNextPage');if(previous)previous.disabled=state.foodNotePage<=1;if(next)next.disabled=state.foodNotePage>=state.foodNotePages;clearFoodNoteSelection();
    }else if(path.endsWith('/admin/categories.php')){
      const d=await api('/admin/categories');state.adminCategories=d.data||[];document.body.classList.add('w2e-live-ready');const cards=document.querySelector('.admin-content .row');if(cards){cards.replaceChildren();state.adminCategories.forEach((c)=>{const col=element('div','col-12 col-sm-6 col-md-4 col-xl-3');const card=element('div','admin-card text-center p-4');card.append(element('div','cat-icon-big mb-2',c.name.slice(0,1).toLocaleUpperCase('vi')),element('h6','fw-700 mb-1',c.name),element('p','text-secondary small mb-2',c.description||'Chưa có mô tả.'),element('span','w2e-badge',c.status==='active'?'Hiện':'Ẩn'),element('p','text-secondary small',`${c.restaurant_count} địa điểm`));const actions=element('div','d-flex justify-content-center gap-2 mt-3');const edit=element('button','btn btn-sm btn-outline-primary','Sửa');edit.type='button';edit.addEventListener('click',()=>editCategory(c));const toggle=element('button','btn btn-sm btn-outline-secondary',c.status==='active'?'Ẩn':'Hiện');toggle.type='button';toggle.addEventListener('click',()=>saveCategoryStatus(c,c.status==='active'?'hidden':'active'));const hide=element('button','btn btn-sm btn-outline-danger','Ẩn danh mục');hide.type='button';hide.disabled=c.status==='hidden';hide.addEventListener('click',()=>hideCategory(c));actions.append(edit,toggle,hide);card.appendChild(actions);col.appendChild(card);cards.appendChild(col);});if(!state.adminCategories.length)cards.appendChild(element('p','text-secondary','Chưa có danh mục. Thêm danh mục từ công cụ quản trị.'));}
      const body=document.getElementById('categoryTableBody');if(body){body.replaceChildren();state.adminCategories.forEach((c,i)=>{const tr=document.createElement('tr');[i+1,c.name,c.description||'Chưa có mô tả.',c.restaurant_count,restaurantStatusLabel(c.status==='active'?'published':'hidden')].forEach(v=>tr.appendChild(element('td','',text(v))));body.appendChild(tr);});if(!state.adminCategories.length)body.appendChild(emptyRow(5,'Chưa có danh mục.'));}
    }else if(path.endsWith('/admin/audit-logs.php')){
      const body=document.getElementById('auditLogBody');if(!body)return;const query=new URLSearchParams({page:String(state.auditPage),per_page:'50'}),search=document.getElementById('auditSearch')?.value.trim();if(search)query.set('q',search);const d=await api(`/admin/audit-logs?${query}`);state.auditPage=d.pagination?.page||1;state.auditPages=d.pagination?.pages||1;state.auditTotal=d.pagination?.total||0;document.body.classList.add('w2e-live-ready');body.replaceChildren();(d.data||[]).forEach((entry)=>{const row=document.createElement('tr');const created=new Date(`${String(entry.created_at).replace(' ','T')}Z`);row.appendChild(element('td','text-nowrap',Number.isNaN(created.getTime())?text(entry.created_at):created.toLocaleString('vi-VN')));row.appendChild(element('td','',entry.actor_name||'Tài khoản đã xóa'));row.appendChild(element('td','',entry.action));row.appendChild(element('td','',`${entry.entity_type}${entry.entity_id?` · ${entry.entity_id}`:''}`));const details=element('td','small text-secondary',entry.metadata?JSON.stringify(typeof entry.metadata==='string'?JSON.parse(entry.metadata):entry.metadata):'—');row.appendChild(details);body.appendChild(row);});if(!d.data?.length)body.appendChild(emptyRow(5,'Không có nhật ký nào khớp bộ lọc.'));const start=state.auditTotal?(state.auditPage-1)*50+1:0,end=Math.min(state.auditPage*50,state.auditTotal),summary=document.getElementById('auditRecordCount');if(summary)summary.textContent=`Hiển thị ${start}–${end} / ${new Intl.NumberFormat('vi-VN').format(state.auditTotal)} hoạt động`;const pageLabel=document.getElementById('auditPageLabel');if(pageLabel)pageLabel.textContent=`${state.auditPage} / ${state.auditPages}`;const previous=document.getElementById('auditPrevPage'),next=document.getElementById('auditNextPage');if(previous)previous.disabled=state.auditPage<=1;if(next)next.disabled=state.auditPage>=state.auditPages;
    }
  }
  function foodNoteStatusLabel(status){return ({pending:'Chờ duyệt',published:'Đã duyệt',hidden:'Đã ẩn',rejected:'Bị từ chối',draft:'Bản nháp'})[status]||status;}
  function clearFoodNoteSelection(){document.querySelectorAll('#fnTable .fn-check,#selectAll').forEach((checkbox)=>{checkbox.checked=false;checkbox.indeterminate=false;});const bar=document.getElementById('bulkBar');if(bar)bar.style.display='none';}
  function updateFoodNoteBulkBar(){const checks=[...document.querySelectorAll('#fnTable .fn-check')],selected=checks.filter((checkbox)=>checkbox.checked),master=document.getElementById('selectAll'),bar=document.getElementById('bulkBar'),label=document.getElementById('selectedCount');if(bar)bar.style.display=selected.length?'block':'none';if(label)label.textContent=`${selected.length} mục đã chọn`;if(master){master.checked=checks.length>0&&selected.length===checks.length;master.indeterminate=selected.length>0&&selected.length<checks.length;}}
  async function changeSelectedFoodNotes(status){const ids=[...document.querySelectorAll('#fnTable .fn-check:checked')].map((checkbox)=>checkbox.value);if(!ids.length)return;document.querySelectorAll('#bulkBar button').forEach((button)=>button.disabled=true);let failed=0;for(const id of ids){try{await api(`/admin/food-notes/${id}`,{method:'PATCH',body:JSON.stringify({status})});}catch(_){failed++;}}clearFoodNoteSelection();await adminLoad();toast(failed?`${ids.length-failed} ghi chú đã cập nhật; ${failed} mục bị lỗi.`:`Đã cập nhật ${ids.length} ghi chú.` ,failed?'warning':'success');}
  function emptyRow(cols,message){const tr=document.createElement('tr');tr.dataset.empty='true';const td=element('td','text-center text-secondary',message);td.colSpan=cols;tr.appendChild(td);return tr;}
  function setRestaurantAdminNotice(message, variant = 'info', showRetry = false) {
    const notice = document.getElementById('restaurantLoadNotice');
    const label = document.getElementById('restaurantLoadMessage');
    const retry = document.getElementById('restaurantRetryButton');
    if (!notice || !label) return;
    notice.className = `alert alert-${variant} restaurant-admin-notice mb-3`;
    label.textContent = message;
    notice.hidden = false;
    if (retry) retry.hidden = !showRetry;
  }

  function showRestaurantAdminError(error) {
    const message = error?.message || 'Lỗi không xác định.';
    document.body.classList.add('w2e-live-ready');
    const body = document.getElementById('tableBody');
    if (body) body.replaceChildren(emptyRow(9, 'Không tải được danh sách địa điểm. Hãy kiểm tra kết nối hoặc đăng nhập lại tài khoản admin.'));
    const count = document.getElementById('restaurantCount');
    if (count) count.textContent = 'Không tải được dữ liệu địa điểm';
    setRestaurantAdminNotice(`Không tải được dữ liệu: ${message}`, 'danger', true);
  }

  function updateRestaurantAdminSummary() {
    const rows = state.adminRestaurants;
    const counts = {
      total: rows.length,
      published: rows.filter(restaurant => restaurant.status === 'published').length,
      pending: rows.filter(restaurant => restaurant.status === 'pending').length,
      hidden: rows.filter(restaurant => ['hidden', 'rejected'].includes(restaurant.status)).length,
      sponsored: rows.filter(restaurant => restaurant.sponsored).length,
    };
    [['restaurantTotalCount', counts.total], ['restaurantPublishedCount', counts.published],
      ['restaurantPendingCount', counts.pending], ['restaurantHiddenCount', counts.hidden],
      ['restaurantSponsoredCount', counts.sponsored]].forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = new Intl.NumberFormat('vi-VN').format(value);
    });
  }

  function renderAdminRestaurants() {
    const body = document.getElementById('tableBody');
    if (!body) return;
    body.replaceChildren();

    state.adminRestaurants.forEach((restaurant, index) => {
      const row = document.createElement('tr');
      row.dataset.search = normalizeText([
        restaurant.name, restaurant.address, restaurant.category_name, restaurant.cuisine,
        restaurant.phone, restaurant.website, restaurant.source_url,
      ].filter(Boolean).join(' '));
      row.dataset.category = String(restaurant.category_id || '');
      row.dataset.status = restaurant.status;
      [index + 1, restaurant.name, restaurant.category_name || 'Chưa phân loại', restaurant.address]
        .forEach(value => row.appendChild(element('td', '', text(value))));
      if(restaurant.sponsored)row.children[1].appendChild(element('span','w2e-sponsored-label ms-2','Tài trợ'));

      const latitude = restaurant.latitude == null || restaurant.latitude === '' ? NaN : Number(restaurant.latitude);
      const longitude = restaurant.longitude == null || restaurant.longitude === '' ? NaN : Number(restaurant.longitude);
      const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
        && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
      const mapCell = element('td');
      mapCell.className = 'restaurant-map-state';
      if (!hasCoordinates) {
        mapCell.appendChild(element('span', 'text-secondary small', 'Thiếu tọa độ'));
      } else if (restaurant.status !== 'published') {
        mapCell.appendChild(element('span', 'text-secondary small', 'Chưa hiển thị'));
      } else {
        const mapLink = element('a', '', 'Xem ghim ↗');
        const params = new URLSearchParams({ focus: '1', lat: String(latitude), lon: String(longitude), name: restaurant.name });
        mapLink.href = `../pages/discovery.php?${params.toString()}`;
        mapLink.target = '_blank';
        mapLink.rel = 'noopener noreferrer';
        mapCell.appendChild(mapLink);
      }
      row.appendChild(mapCell);

      const sourceCell = element('td');
      sourceCell.appendChild(element('span', '', ({ osm: 'OpenStreetMap', user: 'Thành viên', admin: 'Quản trị viên' })[restaurant.source] || 'Không rõ'));
      if (restaurant.source_url) {
        const sourceLink = element('a', 'ms-1', 'Nguồn ↗');
        sourceLink.href = restaurant.source_url;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceCell.appendChild(sourceLink);
      }
      row.appendChild(sourceCell);
      [restaurantStatusLabel(restaurant.status), localDate(restaurant.created_at)]
        .forEach(value => row.appendChild(element('td', '', text(value))));

      const actions = element('td', 'text-nowrap');
      const edit = element('button', 'btn btn-sm btn-outline-primary me-1', 'Sửa');
      edit.type = 'button';
      edit.addEventListener('click', () => editRestaurant(restaurant));
      actions.appendChild(edit);
      if (restaurant.status === 'pending' || restaurant.status === 'rejected') {
        const publish = element('button', 'btn btn-sm btn-success me-1', 'Duyệt');
        publish.type = 'button';
        publish.addEventListener('click', () => adminRestaurantStatus(restaurant.id, 'published'));
        actions.appendChild(publish);
      }
      const toggle = element('button', 'btn btn-sm btn-outline-secondary', restaurant.status === 'hidden' ? 'Hiện' : 'Ẩn');
      toggle.type = 'button';
      toggle.addEventListener('click', () => adminRestaurantStatus(restaurant.id, restaurant.status === 'hidden' ? 'published' : 'hidden'));
      actions.appendChild(toggle);
      if((restaurant.status==='published'&&hasCoordinates)||restaurant.sponsorship_status){
        const sponsor=element('button','btn btn-sm btn-outline-success ms-1',restaurant.sponsorship_status?'Sửa tài trợ':'Tài trợ');sponsor.type='button';sponsor.title='Quản lý vị trí tài trợ có thời hạn';
        sponsor.addEventListener('click',()=>openSponsorshipModal(restaurant));actions.appendChild(sponsor);
      }
      row.appendChild(actions);
      body.appendChild(row);
    });

    if (!state.adminRestaurants.length) {
      body.appendChild(emptyRow(9, 'Chưa có địa điểm. Bạn có thể thêm quán đã xác minh hoặc duyệt đề xuất của thành viên.'));
    }
    updateRestaurantAdminSummary();
    filterAdminRestaurants();
  }

  function setupRestaurantAdminRetry() {
    const button = document.getElementById('restaurantRetryButton');
    if (!button || button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', async () => {
      button.disabled = true;
      setRestaurantAdminNotice('Đang thử tải lại danh sách địa điểm…', 'info', false);
      try {
        await adminLoad();
      } catch (error) {
        showRestaurantAdminError(error);
      } finally {
        button.disabled = false;
      }
    });
  }
  async function adminRestaurantStatus(id,status){try{await api(`/admin/restaurants/${id}`,{method:'PATCH',body:JSON.stringify({status})});toast('Đã cập nhật trạng thái.','success');await adminLoad();}catch(error){toast(error.message,'error');}}

  function openSponsorshipModal(restaurant){
    state.sponsorRestaurantId=restaurant.id;
    document.getElementById('sponsorshipModalTitle').textContent=`Vị trí tài trợ: ${restaurant.name}`;
    document.getElementById('sponsorName').value=restaurant.sponsor_name||restaurant.name;
    document.getElementById('sponsorReference').value=restaurant.contract_reference||'';
    const toInput=(date)=>{const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);};
    const start=restaurant.sponsorship_starts_at?new Date(`${restaurant.sponsorship_starts_at.replace(' ','T')}Z`):new Date();
    const end=restaurant.sponsorship_ends_at?new Date(`${restaurant.sponsorship_ends_at.replace(' ','T')}Z`):new Date(start.getTime()+30*86400000);
    document.getElementById('sponsorStart').value=toInput(start);document.getElementById('sponsorEnd').value=toInput(end);
    document.getElementById('sponsorStatus').value=restaurant.sponsorship_status||'paused';
    openModal('sponsorshipModal');
  }
  function setupSponsorshipForm(){
    const button=document.getElementById('saveSponsorshipButton');if(!button)return;
    button.addEventListener('click',async()=>{
      const start=document.getElementById('sponsorStart').value,end=document.getElementById('sponsorEnd').value;
      if(!start||!end||!document.getElementById('sponsorName').value.trim()){toast('Nhập tên bên tài trợ và thời gian bắt đầu/kết thúc.','warning');return;}
      const payload={sponsor_name:document.getElementById('sponsorName').value.trim(),contract_reference:document.getElementById('sponsorReference').value.trim()||null,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),status:document.getElementById('sponsorStatus').value};
      button.disabled=true;
      try{await api(`/admin/restaurants/${state.sponsorRestaurantId}/sponsorship`,{method:'PUT',body:JSON.stringify(payload)});window.bootstrap?.Modal.getInstance(document.getElementById('sponsorshipModal'))?.hide();toast('Vị trí tài trợ đã được cập nhật.','success');await adminLoad();}
      catch(error){toast(error.message,'error');}finally{button.disabled=false;}
    });
  }

  function restaurantStatusLabel(status){return({pending:'Chờ duyệt',published:'Đang hiển thị',hidden:'Đã ẩn',rejected:'Từ chối'})[status]||text(status);}
  function fillCategoryOptions(select,categories,includeEmpty){if(!select)return;const selected=select.value;select.replaceChildren();if(includeEmpty)select.appendChild(new Option('Chưa phân loại',''));else select.appendChild(new Option('Tất cả danh mục',''));categories.forEach((category)=>{if(category.status==='active')select.appendChild(new Option(category.name,String(category.id)));});if([...select.options].some(option=>option.value===selected))select.value=selected;}
  function filterAdminRestaurants() {
    const query = normalizeText((document.getElementById('searchInput')?.value || '').trim());
    const category = document.getElementById('catFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    let shown = 0;
    document.querySelectorAll('#tableBody tr').forEach(row => {
      if (row.dataset.empty) return;
      const visible = (!query || row.dataset.search.includes(query))
        && (!category || row.dataset.category === category)
        && (!status || row.dataset.status === status);
      row.hidden = !visible;
      if (visible) shown++;
    });
    const filterEmpty = document.getElementById('restaurantFilterEmpty');
    if (shown === 0 && state.adminRestaurants.length > 0) {
      if (!filterEmpty) {
        const row = emptyRow(9, 'Không có địa điểm khớp bộ lọc. Hãy đổi từ khóa hoặc chọn lại bộ lọc.');
        row.id = 'restaurantFilterEmpty';
        document.getElementById('tableBody')?.appendChild(row);
      }
    } else {
      filterEmpty?.remove();
    }
    const count = document.getElementById('restaurantCount');
    if (count) count.textContent = `Đang hiển thị ${shown} / ${state.adminRestaurants.length} địa điểm`;
  }
  function openModal(id){const modal=document.getElementById(id);if(modal)window.bootstrap?.Modal.getOrCreateInstance(modal).show();}
  function editRestaurant(restaurant){state.editRestaurantId=restaurant.id;const statusSelect=document.getElementById('restaurantStatus');if(['pending','rejected'].includes(restaurant.status)&&statusSelect&&!Array.from(statusSelect.options).some(option=>option.value===restaurant.status))statusSelect.add(new Option(restaurantStatusLabel(restaurant.status),restaurant.status));const categorySelect=document.getElementById('restaurantCategory');if(restaurant.category_id&&categorySelect&&![...categorySelect.options].some(o=>o.value===String(restaurant.category_id))){const option=new Option(restaurant.category_name||'Danh mục đã ẩn',String(restaurant.category_id));categorySelect.appendChild(option);}const fields={restaurantName:restaurant.name,restaurantCategory:restaurant.category_id||'',restaurantDescription:restaurant.description||'',restaurantAddress:restaurant.address,restaurantCuisine:restaurant.cuisine||'',restaurantPhone:restaurant.phone||'',restaurantWebsite:restaurant.website||'',restaurantSourceUrl:restaurant.source_url||'',restaurantStatus:restaurant.status||'published',restaurantLatitude:restaurant.latitude??'',restaurantLongitude:restaurant.longitude??''};Object.entries(fields).forEach(([id,value])=>{const input=document.getElementById(id);if(input)input.value=value;});const priceParts=(restaurant.price_range||'').match(/[\d]+(?:[.,][\d]+)*/g)||[];const min=document.getElementById('restaurantPriceMin'),max=document.getElementById('restaurantPriceMax');if(min)min.value=priceParts[0]?.replace(/[.,]/g,'')||'';if(max)max.value=priceParts[1]?.replace(/[.,]/g,'')||'';const opening=document.getElementById('restaurantOpening');if(opening)opening.value=restaurant.opening_hours?.text||'';const title=document.getElementById('restaurantModalTitle');if(title)title.textContent=`Sửa: ${restaurant.name}`;openModal('restaurantModal');}
  async function saveRestaurant(){const name=document.getElementById('restaurantName'),address=document.getElementById('restaurantAddress'),min=document.getElementById('restaurantPriceMin'),max=document.getElementById('restaurantPriceMax'),lat=document.getElementById('restaurantLatitude')?.value||null,lon=document.getElementById('restaurantLongitude')?.value||null;if(!name?.reportValidity()||!address?.reportValidity())return;const low=min?.value?Number(min.value):null,high=max?.value?Number(max.value):null;if(low!==null&&high!==null&&low>high){toast('Giá thấp nhất không thể lớn hơn giá cao nhất.','warning');return;}if((lat===null)!==(lon===null)){toast('Hãy nhập cả vĩ độ lẫn kinh độ, hoặc để trống cả hai.','warning');return;}const price=low===null&&high===null?null:[low,high].filter(v=>v!==null).map(v=>new Intl.NumberFormat('en-US').format(v)).join('–')+' VND';const openingText=document.getElementById('restaurantOpening')?.value.trim()||'';const payload={name:name.value.trim(),category_id:document.getElementById('restaurantCategory')?.value||null,address:address.value.trim(),latitude:lat,longitude:lon,cuisine:document.getElementById('restaurantCuisine')?.value.trim()||null,phone:document.getElementById('restaurantPhone')?.value.trim()||null,website:document.getElementById('restaurantWebsite')?.value.trim()||null,source_url:document.getElementById('restaurantSourceUrl')?.value.trim()||null,opening_hours:openingText?{text:openingText}:null,price_range:price,description:document.getElementById('restaurantDescription')?.value.trim()||null,status:document.getElementById('restaurantStatus')?.value||'published'};const button=document.getElementById('saveRestaurantButton');if(button)button.disabled=true;try{await api(state.editRestaurantId?`/admin/restaurants/${state.editRestaurantId}`:'/admin/restaurants',{method:state.editRestaurantId?'PUT':'POST',body:JSON.stringify(payload)});window.bootstrap?.Modal.getInstance(document.getElementById('restaurantModal'))?.hide();toast('Địa điểm đã được lưu.','success');state.editRestaurantId=null;await adminLoad();}catch(error){toast(error.message,'error');}finally{if(button)button.disabled=false;}}
  function resetRestaurantForm(){state.editRestaurantId=null;document.getElementById('restaurantModalTitle').textContent='Thêm Quán Ăn Mới';['restaurantName','restaurantDescription','restaurantAddress','restaurantCuisine','restaurantPhone','restaurantWebsite','restaurantSourceUrl','restaurantPriceMin','restaurantPriceMax','restaurantOpening','restaurantLatitude','restaurantLongitude'].forEach(id=>{const field=document.getElementById(id);if(field)field.value='';});const category=document.getElementById('restaurantCategory');if(category)category.value='';const status=document.getElementById('restaurantStatus');if(status){Array.from(status.options).filter(option=>!['published','hidden'].includes(option.value)).forEach(option=>option.remove());status.value='published';}const geocodeStatus=document.getElementById('restaurantGeocodeStatus');if(geocodeStatus)geocodeStatus.textContent='Tra tọa độ để nhận một kết quả gợi ý; hãy đối chiếu trước khi lưu.';}
  function setupAdminGeocoder(){const button=document.getElementById('restaurantGeocodeButton'),address=document.getElementById('restaurantAddress'),latitude=document.getElementById('restaurantLatitude'),longitude=document.getElementById('restaurantLongitude'),status=document.getElementById('restaurantGeocodeStatus');if(!button||!address)return;button.addEventListener('click',async()=>{const query=address.value.trim();if(query.length<5){toast('Nhập địa chỉ đầy đủ hơn trước khi tra tọa độ.','warning');address.focus();return;}button.disabled=true;button.textContent='Đang tra…';if(status)status.textContent='Đang tra một kết quả gợi ý từ OpenStreetMap Nominatim…';try{const result=await api('/admin/geocode',{method:'POST',body:JSON.stringify({address:query})});if(!result.found){if(status)status.textContent='Không tìm thấy kết quả. Bạn có thể nhập tọa độ thủ công hoặc sửa địa chỉ.';return;}latitude.value=String(result.latitude);longitude.value=String(result.longitude);if(status)status.textContent=`Kết quả gợi ý: ${result.label||'địa chỉ phù hợp'}. Hãy đối chiếu địa chỉ và tọa độ trước khi lưu.`;}catch(error){if(status)status.textContent=error.message;toast(error.message,'warning');}finally{button.disabled=false;button.textContent='Tra tọa độ từ địa chỉ';}});address.addEventListener('input',()=>{latitude.value='';longitude.value='';if(status)status.textContent='Địa chỉ đã đổi. Hãy tra lại tọa độ hoặc nhập cặp tọa độ đã xác minh.';});}
  function editCategory(category){state.editCategoryId=category.id;document.getElementById('catModalTitle').textContent=`Sửa: ${category.name}`;document.getElementById('catName').value=category.name;document.getElementById('catDescription').value=category.description||'';document.getElementById('catStatus').value=category.status;openModal('categoryModal');}
  async function persistCategory(){const name=document.getElementById('catName')?.value.trim()||'';if(name.length<1){toast('Nhập tên danh mục.','warning');return;}const payload={name,description:document.getElementById('catDescription')?.value.trim()||null,status:document.getElementById('catStatus')?.value||'active'};try{await api(state.editCategoryId?`/admin/categories/${state.editCategoryId}`:'/admin/categories',{method:state.editCategoryId?'PUT':'POST',body:JSON.stringify(payload)});window.bootstrap?.Modal.getInstance(document.getElementById('categoryModal'))?.hide();toast('Danh mục đã được lưu.','success');state.editCategoryId=null;await adminLoad();}catch(error){toast(error.message,'error');}}
  async function saveCategoryStatus(category,status){try{await api(`/admin/categories/${category.id}`,{method:'PATCH',body:JSON.stringify({status})});toast('Trạng thái danh mục đã được cập nhật.','success');await adminLoad();}catch(error){toast(error.message,'error');}}
  async function hideCategory(category){if(!window.confirm(`Ẩn danh mục “${category.name}”?`))return;try{await api(`/admin/categories/${category.id}`,{method:'DELETE'});toast('Danh mục đã được ẩn.','success');await adminLoad();}catch(error){toast(error.message,'error');}}
  function setupAdminForms(){if(document.getElementById('auditLogBody')){const search=()=>{state.auditPage=1;clearTimeout(state.auditSearchTimer);state.auditSearchTimer=setTimeout(()=>adminLoad().catch(error=>toast(error.message,'error')),250);};document.getElementById('auditSearch')?.addEventListener('input',search);document.getElementById('auditPrevPage')?.addEventListener('click',()=>{if(state.auditPage>1){state.auditPage--;adminLoad().catch(error=>toast(error.message,'error'));}});document.getElementById('auditNextPage')?.addEventListener('click',()=>{if(state.auditPage<state.auditPages){state.auditPage++;adminLoad().catch(error=>toast(error.message,'error'));}});}if(document.getElementById('saveRestaurantButton')){document.getElementById('saveRestaurantButton').addEventListener('click',saveRestaurant);document.getElementById('addRestaurantButton')?.addEventListener('click',resetRestaurantForm);document.getElementById('restaurantModal')?.addEventListener('hidden.bs.modal',resetRestaurantForm);document.getElementById('searchInput')?.addEventListener('input',filterAdminRestaurants);document.getElementById('catFilter')?.addEventListener('change',filterAdminRestaurants);document.getElementById('statusFilter')?.addEventListener('change',filterAdminRestaurants);window.filterTable=filterAdminRestaurants;}if(document.getElementById('categoryModal')){window.saveCat=persistCategory;document.querySelector('[data-bs-target="#categoryModal"]')?.addEventListener('click',()=>{state.editCategoryId=null;document.getElementById('catModalTitle').textContent='Thêm Danh Mục Mới';document.getElementById('catName').value='';document.getElementById('catDescription').value='';document.getElementById('catStatus').value='active';});document.getElementById('categoryModal')?.addEventListener('hidden.bs.modal',()=>{state.editCategoryId=null;});}if(document.getElementById('userTableBody')){const apply=()=>{state.userPage=1;clearTimeout(state.userSearchTimer);state.userSearchTimer=setTimeout(()=>adminLoad().catch(error=>toast(error.message,'error')),250);};document.getElementById('userSearch')?.addEventListener('input',apply);document.getElementById('roleFilter')?.addEventListener('change',apply);document.getElementById('statusFilter')?.addEventListener('change',apply);document.getElementById('userPrevPage')?.addEventListener('click',()=>{if(state.userPage>1){state.userPage--;adminLoad().catch(error=>toast(error.message,'error'));}});document.getElementById('userNextPage')?.addEventListener('click',()=>{if(state.userPage<state.userPages){state.userPage++;adminLoad().catch(error=>toast(error.message,'error'));}});window.filterUsers=apply;}if(document.getElementById('fnTable')){window.filterTab=(button,status)=>{state.foodNoteFilter=({approved:'published'})[status]||status;state.foodNotePage=1;document.querySelectorAll('#fnTabs .w2e-tab-btn').forEach((tab)=>tab.classList.toggle('active',tab===button));const labels={all:'Tất cả',pending:'Chờ duyệt',published:'Đã duyệt',hidden:'Đã ẩn'};const label=document.getElementById('currentFilter');if(label)label.textContent=labels[state.foodNoteFilter]||'Tất cả';clearFoodNoteSelection();adminLoad().catch(error=>toast(error.message,'error'));};window.toggleSelectAll=(master)=>{document.querySelectorAll('#fnTable .fn-check').forEach((checkbox)=>checkbox.checked=master.checked);updateFoodNoteBulkBar();};window.clearSelection=clearFoodNoteSelection;window.bulkApprove=()=>changeSelectedFoodNotes('published');window.bulkHide=()=>changeSelectedFoodNotes('hidden');document.getElementById('fnPrevPage')?.addEventListener('click',()=>{if(state.foodNotePage>1){state.foodNotePage--;adminLoad().catch(error=>toast(error.message,'error'));}});document.getElementById('fnNextPage')?.addEventListener('click',()=>{if(state.foodNotePage<state.foodNotePages){state.foodNotePage++;adminLoad().catch(error=>toast(error.message,'error'));}});}}

  function openAdminUserDeletion(user) {
    const modal=document.getElementById('deleteUserModal');
    if(!modal)return;
    modal.dataset.userId=String(user.id);
    modal.dataset.email=user.email;
    document.getElementById('deleteUserTarget').textContent=`${user.name} (${user.email})`;
    document.getElementById('deleteUserForm').reset();
    document.getElementById('deleteUserSubmitBtn').disabled=true;
    modal.addEventListener('shown.bs.modal',()=>document.getElementById('deleteUserConfirmEmail').focus(),{once:true});
    window.bootstrap?.Modal.getOrCreateInstance(modal).show();
  }

  function setupAdminUserDeletion() {
    const modal=document.getElementById('deleteUserModal');
    const form=document.getElementById('deleteUserForm');
    if(!modal||!form)return;
    const email=document.getElementById('deleteUserConfirmEmail');
    const password=document.getElementById('deleteUserAdminPassword');
    const submit=document.getElementById('deleteUserSubmitBtn');
    const emailHelp=document.getElementById('deleteUserEmailHelp');
    const update=()=>{
      const matches=email.value.trim().toLowerCase()===String(modal.dataset.email||'').toLowerCase();
      email.classList.toggle('is-invalid',Boolean(email.value.trim())&&!matches);
      email.classList.toggle('is-valid',matches);
      if(emailHelp){
        emailHelp.textContent=matches?'Email đã khớp. Nhập mật khẩu admin để bật nút xóa.':'Nhập đúng email của người dùng đang hiển thị phía trên, không phải email admin.';
        emailHelp.className=`form-text ${email.value.trim()&&!matches?'text-danger':matches?'text-success':'text-secondary'}`;
      }
      submit.disabled=!matches||!password.value;
    };
    form.addEventListener('input',update);
    modal.addEventListener('hidden.bs.modal',()=>{form.reset();delete modal.dataset.userId;delete modal.dataset.email;submit.disabled=true;});
    form.addEventListener('submit',async(event)=>{
      event.preventDefault();
      if(submit.disabled||!modal.dataset.userId)return;
      submit.disabled=true;
      try{
        const result=await api(`/admin/users/${modal.dataset.userId}`,{method:'DELETE',body:JSON.stringify({confirmation_email:email.value.trim(),admin_password:password.value})});
        window.bootstrap?.Modal.getInstance(modal).hide();
        toast(result.message,'success');
        await adminLoad();
      }catch(error){toast(error.message,'error');update();}
    });
  }

  function setupRestaurantProposal(){
    const grid=document.getElementById('restaurantGrid');if(!grid||document.getElementById('w2eRestaurantProposalModal'))return;
    const trigger=element('button','btn btn-outline-primary my-3','Đóng góp địa điểm');trigger.type='button';trigger.addEventListener('click',()=>openModal('w2eRestaurantProposalModal'));grid.before(trigger);
    const modal=element('div','modal fade');modal.id='w2eRestaurantProposalModal';modal.tabIndex=-1;modal.setAttribute('aria-labelledby','w2eRestaurantProposalTitle');
    const dialog=element('div','modal-dialog modal-lg');const content=element('div','modal-content');const header=element('div','modal-header');const heading=element('h2','modal-title fs-5','Đóng góp địa điểm');heading.id='w2eRestaurantProposalTitle';header.appendChild(heading);const close=element('button','btn-close');close.type='button';close.dataset.bsDismiss='modal';close.setAttribute('aria-label','Đóng');header.appendChild(close);content.appendChild(header);
    const body=element('div','modal-body');body.appendChild(element('p','text-secondary','Chỉ gửi thông tin bạn biết hoặc đã đối chiếu. Quản trị viên sẽ kiểm tra trước khi địa điểm xuất hiện công khai.'));
    const form=element('form','');form.id='w2eRestaurantProposalForm';const field=(label,id,type='text',required=false)=>{const wrap=element('div','mb-3');const caption=element('label','form-label',label);caption.htmlFor=id;const input=element(type==='textarea'?'textarea':'input','form-control');input.id=id;input.name=id;if(type!=='textarea')input.type=type==='url'?'text':type;if(type==='url')input.inputMode='url';input.maxLength=500;if(required)input.required=true;wrap.append(caption,input);return wrap;};
    form.append(field('Tên địa điểm *','proposalName','text',true),field('Địa chỉ *','proposalAddress','text',true),field('Loại hình / ẩm thực','proposalCuisine'),field('Điện thoại','proposalPhone','tel'),field('Website chính thức','proposalWebsite','url'),field('Nguồn để đối chiếu (nếu có)','proposalSourceUrl','url'),field('Ghi chú / thông tin đã xác nhận','proposalDescription','textarea'));
    const coords=element('div','row g-2 mb-2');[['Vĩ độ','proposalLatitude',-90,90],['Kinh độ','proposalLongitude',-180,180]].forEach(([label,id,min,max])=>{const col=element('div','col-md-6');const input=element('input','form-control');input.type='number';input.step='0.0000001';input.min=String(min);input.max=String(max);input.id=id;input.placeholder=label;input.setAttribute('aria-label',label);col.appendChild(input);coords.appendChild(col);});form.appendChild(coords);
    const mapWrap=element('div','mb-3');const mapNode=element('div');mapNode.id='proposalLocationMap';mapNode.style.cssText='height:260px;min-height:220px;background:#eee;border-radius:.375rem;';const mapHelp=element('p','small text-secondary mt-2 mb-0','Bấm trên bản đồ để ghim vị trí. Tọa độ sẽ được điền tự động; bạn cũng có thể nhập tọa độ thủ công.');mapWrap.append(mapNode,mapHelp);form.appendChild(mapWrap);
    const submit=element('button','btn btn-primary','Gửi để quản trị viên kiểm tra');submit.type='submit';form.appendChild(submit);body.appendChild(form);content.appendChild(body);dialog.appendChild(content);modal.appendChild(dialog);document.body.appendChild(modal);
    let proposalMap=null,proposalMarker=null;
    const placeProposalMarker=(latlng)=>{document.getElementById('proposalLatitude').value=latlng.lat.toFixed(7);document.getElementById('proposalLongitude').value=latlng.lng.toFixed(7);if(proposalMarker)proposalMarker.setLatLng(latlng);else proposalMarker=L.marker(latlng).addTo(proposalMap);};
    const syncProposalMarker=()=>{const latInput=document.getElementById('proposalLatitude'),lonInput=document.getElementById('proposalLongitude');if(!latInput.value||!lonInput.value)return;const lat=Number(latInput.value),lon=Number(lonInput.value);if(Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180&&proposalMap){const latlng=L.latLng(lat,lon);placeProposalMarker(latlng);proposalMap.setView(latlng,Math.max(proposalMap.getZoom(),15));}};
    ['proposalLatitude','proposalLongitude'].forEach(id=>document.getElementById(id).addEventListener('change',syncProposalMarker));
    modal.addEventListener('shown.bs.modal',()=>{if(!window.L)return;if(!proposalMap){proposalMap=L.map(mapNode,{scrollWheelZoom:false}).setView([state.center.lat,state.center.lon],14);const attribution='© OpenStreetMap contributors · HOT';const tiles=L.tileLayer('https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',{maxZoom:19,attribution}).addTo(proposalMap);tiles.on('tileerror',()=>{if(proposalMap._proposalFallback)return;proposalMap._proposalFallback=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(proposalMap);});proposalMap.on('click',event=>placeProposalMarker(event.latlng));}setTimeout(()=>{proposalMap.invalidateSize();syncProposalMarker();},100);});
    modal.addEventListener('hidden.bs.modal',()=>{proposalMap?.remove();proposalMap=null;proposalMarker=null;});
    form.addEventListener('submit',async(event)=>{event.preventDefault();if(!state.user){const next=encodeURIComponent(location.pathname+location.search);location.href=`./login.php?next=${next}`;return;}const latitude=document.getElementById('proposalLatitude').value||null;const longitude=document.getElementById('proposalLongitude').value||null;if((latitude===null)!==(longitude===null)){toast('Hãy điền cả hai tọa độ hoặc để trống cả hai.','warning');return;}submit.disabled=true;try{const result=await api('/restaurants/proposals',{method:'POST',body:JSON.stringify({name:document.getElementById('proposalName').value.trim(),address:document.getElementById('proposalAddress').value.trim(),cuisine:document.getElementById('proposalCuisine').value.trim()||null,phone:document.getElementById('proposalPhone').value.trim()||null,website:document.getElementById('proposalWebsite').value.trim()||null,source_url:document.getElementById('proposalSourceUrl').value.trim()||null,description:document.getElementById('proposalDescription').value.trim()||null,latitude,longitude})});form.reset();window.bootstrap?.Modal.getInstance(modal)?.hide();toast(result.message||'Đề xuất đã được gửi để quản trị viên kiểm tra.','success');}catch(error){toast(error.message,'error');}finally{submit.disabled=false;}});
  }

  async function start() {
    const path=location.pathname.toLowerCase();
    try { const me=await api('/auth/me');state.authChecked=true;state.backendAvailable=true;state.user=me.user;state.csrf=me.csrf_token||'';fillIdentity(state.user);await setupNotifications();if(state.user){try{const favorites=await loadAllFavorites();state.favoriteKeys=new Set(favorites.map(f=>`${f.source}:${f.source_id}`));}catch(_){}} }
    catch(error){ state.authChecked=true;state.backendAvailable=false;if(!path.includes('/admin/')&&!path.endsWith('/login.php')&&!path.endsWith('/register.php'))toast(error.message,'error'); }
    if(new URLSearchParams(location.search).get('account')==='deleted'){toast('Tài khoản và dữ liệu liên quan đã được xóa.','success');history.replaceState({},'',location.pathname);}
    if(path.endsWith('/login.php')){const verification=new URLSearchParams(location.search).get('verification');if(verification){toast(verification==='success'?'Email đã được xác nhận. Bạn có thể đăng nhập.':'Liên kết xác nhận không hợp lệ hoặc đã hết hạn.',verification==='success'?'success':'warning');history.replaceState({},'',location.pathname);}}
    const protectedPage=/\/(?:food-notes|food-plans|dashboard|profile|create-food-note)\.php$/.test(path);
    if(protectedPage&&!state.user&&state.authChecked){const base=path.includes('/pages/')?'./login.php':'login.php';const next=location.pathname+location.search;window.location.replace(`${base}?next=${encodeURIComponent(next)}`);return;}
    if(path.includes('/admin/')){
      if(state.user?.role!=='admin'){document.body.replaceChildren(element('main','container py-5','Khu vực quản trị cần tài khoản admin. Đăng nhập bằng tài khoản quản trị đã được tạo từ lệnh CLI trên máy chủ.'));return;}
      await reviewCorrections();await reviewOsmActivity();setupAdminForms();setupAdminUserDeletion();setupAdminGeocoder();setupRestaurantAdminRetry();setupSponsorshipForm();
      try{await adminLoad();}catch(error){if(path.endsWith('/admin/restaurants.php'))showRestaurantAdminError(error);else toast(error.message,'error');}
    }
    if(path.endsWith('/food-notes.php')){await loadNotes();document.getElementById('noteSearch')?.addEventListener('input',applyNoteFilters);document.getElementById('ratingFilter')?.addEventListener('change',applyNoteFilters);document.getElementById('timeFilter')?.addEventListener('change',applyNoteFilters);document.getElementById('loadMoreNotes')?.addEventListener('click',()=>loadNotes(false));}
    if(path.endsWith('/food-plans.php')){await loadPlans();const planId=new URLSearchParams(location.search).get('plan');if(/^\d+$/.test(planId||''))await showPlan(Number(planId));}
    if(path.endsWith('/food-note.php'))await loadSharedNote();
    if(path.endsWith('/dashboard.php'))await renderDashboard();
    if(path.endsWith('/discovery.php')){
      setupRestaurantProposal();
      const discoverySearch=document.getElementById('searchInput');discoverySearch?.addEventListener('input',filterDiscovery);discoverySearch?.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();filterDiscovery();}});document.getElementById('distanceFilter')?.addEventListener('change',filterDiscovery);
      filterDiscovery();
      ['priceFilter','ratingFilter'].forEach((id)=>{const x=document.getElementById(id);if(x){x.disabled=true;x.title='Nguồn OSM hiện không cung cấp dữ liệu này.';}});
    }
    if(path.endsWith('/restaurant.php'))await loadRestaurantDetail();
    if(path.endsWith('/create-food-note.php'))setupNoteComposer();
    if(path.endsWith('/profile.php')){setupProfile();if(state.user)await loadProfileData().catch((error)=>toast(error.message,'error'));}
    if(document.querySelector('#randomResult')||document.querySelector('#homePlacesGrid'))loadNearby();
    const joinToken=new URLSearchParams(location.search).get('join');if(joinToken&&state.user&&path.endsWith('/food-plans.php')){try{const joined=await api('/food-plans/join',{method:'POST',body:JSON.stringify({token:joinToken})});history.replaceState({},'',location.pathname);toast(joined.message,'success');await loadPlans();}catch(error){toast(error.message,'error');}}
    const verifyToken=new URLSearchParams(location.search).get('verify');if(verifyToken){try{const result=await api(`/auth/verify?token=${encodeURIComponent(verifyToken)}`);toast(result.message,'success');history.replaceState({},'',location.pathname);}catch(error){toast(error.message,'error');}}
  }

  function setupAuthForms() {
    window.resendVerification=async()=>{const link=document.querySelector('#successScreen .w2e-auth-footer-link a');const email=document.getElementById('confirmedEmail')?.textContent.trim()||document.getElementById('regEmail')?.value.trim()||'';if(!email||email==='—'){toast('Không tìm thấy địa chỉ email cần xác nhận.','warning');return;}if(link)link.setAttribute('aria-disabled','true');try{const result=await api('/auth/resend-verification',{method:'POST',body:JSON.stringify({email})});toast(result.message,'success');}catch(error){toast(error.message,'error');}finally{if(link)link.removeAttribute('aria-disabled');}};
    const loginEmail=document.getElementById('loginEmail'),loginPassword=document.getElementById('loginPassword');
    const setLoginError=(input,id,visible)=>{input?.classList.toggle('is-invalid',visible);document.getElementById(id)?.classList.toggle('is-on',visible);};
    document.getElementById('passToggle')?.addEventListener('click',(event)=>{const button=event.currentTarget,visible=loginPassword?.type==='password';if(loginPassword)loginPassword.type=visible?'text':'password';button.querySelector('i')?.classList.toggle('bi-eye',!visible);button.querySelector('i')?.classList.toggle('bi-eye-slash',visible);button.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');});
    document.getElementById('forgotLink')?.addEventListener('click',(event)=>{event.preventDefault();window.bootstrap?.Modal.getOrCreateInstance(document.getElementById('forgotModal'))?.show();});
    [[loginEmail,'emailError'],[loginPassword,'passError']].forEach(([input,id])=>input?.addEventListener('input',()=>setLoginError(input,id,false)));
    const registerToggle=(buttonId,inputId)=>document.getElementById(buttonId)?.addEventListener('click',(event)=>{const button=event.currentTarget,input=document.getElementById(inputId),visible=input?.type==='password';if(input)input.type=visible?'text':'password';const icon=button.querySelector('i');if(icon){icon.classList.toggle('bi-eye',!visible);icon.classList.toggle('bi-eye-slash',visible);}button.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');});
    registerToggle('regPassToggle','regPassword');registerToggle('confirmPassToggle','regConfirm');
    const registerErrors={regName:'nameError',regEmail:'regEmailError',regPassword:'passErr',regConfirm:'confirmErr'};
    Object.entries(registerErrors).forEach(([inputId,errorId])=>document.getElementById(inputId)?.addEventListener('input',()=>{document.getElementById(inputId)?.classList.remove('invalid');document.getElementById(errorId)?.classList.remove('show');if(inputId==='regPassword')strength();if(inputId==='regConfirm')validateConfirm();}));
    const strength=()=>{const value=document.getElementById('regPassword')?.value||'';const score=[value.length>=8,/[A-Z]/.test(value),/\d/.test(value),/[^A-Za-z0-9]/.test(value)].filter(Boolean).length;const segments=[1,2,3,4].map((n)=>document.getElementById(`seg${n}`));segments.forEach((node)=>node.className='');const label=document.getElementById('strengthText');if(!label)return;if(!value){label.textContent='Nhập mật khẩu để kiểm tra độ mạnh';label.style.color='var(--gray-2)';return;}const group=score<=1?1:score===2?2:score===3?3:4;for(let i=0;i<group;i++)segments[i]?.classList.add('active',group<=1?'weak':group===2?'medium':'strong');label.textContent=['','Yếu – nên thêm ký tự','Trung bình – có thể mạnh hơn','Mạnh – khá an toàn','Rất mạnh'][group];label.style.color=group<=1?'var(--red)':group===2?'var(--gold-dark)':'var(--green)';};
    const validateConfirm=()=>{const password=document.getElementById('regPassword')?.value||'',confirm=document.getElementById('regConfirm')?.value||'';if(confirm)document.getElementById('confirmErr')?.classList.toggle('show',password!==confirm);};
    document.getElementById('forgotEmail')?.addEventListener('input',(event)=>event.currentTarget.classList.remove('is-invalid'));
    document.getElementById('resendVerificationLink')?.addEventListener('click',(event)=>{event.preventDefault();window.resendVerification();});
    document.addEventListener('submit',async(event)=>{
      const form=event.target;if(!(form instanceof HTMLFormElement))return;
      if(form.id==='loginForm'){
        event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();const email=loginEmail?.value.trim()||'';const password=loginPassword?.value||'';const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);setLoginError(loginEmail,'emailError',!validEmail);setLoginError(loginPassword,'passError',!password);if(!validEmail||!password)return;const button=document.getElementById('loginBtn');if(button){button.disabled=true;button.textContent='Đang đăng nhập…';}
        try{const result=await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});state.user=result.user;state.csrf=result.csrf_token||'';localStorage.setItem('w2e_remember_email',document.getElementById('rememberMe')?.checked?email:'');toast('Đăng nhập thành công.','success');const next=new URLSearchParams(location.search).get('next');let target='../index.php';if(next){try{const candidate=new URL(next,location.origin);if(candidate.origin===location.origin)target=candidate.href;}catch(_){}}location.replace(target);}
        catch(error){toast(error.message,'error');if(button){button.disabled=false;button.textContent='Đăng nhập';}}
      }else if(form.id==='registerForm'){
        event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();const name=document.getElementById('regName').value.trim();const email=document.getElementById('regEmail').value.trim();const password=document.getElementById('regPassword').value;const confirm=document.getElementById('regConfirm').value;const emailOkay=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);[['regName','nameError',name.length<2],['regEmail','regEmailError',!emailOkay],['regPassword','passErr',password.length<8],['regConfirm','confirmErr',password!==confirm||!confirm]].forEach(([inputId,errorId,invalid])=>{document.getElementById(inputId)?.classList.toggle('invalid',invalid);document.getElementById(errorId)?.classList.toggle('show',invalid);});const termsOkay=document.getElementById('agreeTerms').checked;document.getElementById('termsErr')?.classList.toggle('show',!termsOkay);if(name.length<2||!emailOkay||password.length<8||password!==confirm||!termsOkay)return;
        const preferences=[...document.querySelectorAll('input[name="pref"]:checked')].map((input)=>input.value);const button=document.getElementById('registerBtn');if(button){button.disabled=true;button.textContent='Đang tạo tài khoản…';}
        try{const result=await api('/auth/register',{method:'POST',body:JSON.stringify({name,email,password,preferences})});document.getElementById('registerFormWrap')?.setAttribute('hidden','');const success=document.getElementById('successScreen');if(success){success.hidden=false;success.style.display='block';const confirmed=document.getElementById('confirmedEmail');if(confirmed)confirmed.textContent=email;const copy=success.querySelector('.w2e-success-copy');if(copy)copy.textContent=result.message;}toast(result.message,'success');}
        catch(error){toast(error.message,'error');if(button){button.disabled=false;button.textContent='Tạo tài khoản miễn phí';}}
      }else if(form.id==='resetPasswordForm'){
        event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();const password=document.getElementById('newPassword')?.value||'';const confirm=document.getElementById('confirmPassword')?.value||'';const token=new URLSearchParams(location.search).get('token')||'';if(password.length<8||password!==confirm){toast('Mật khẩu cần ít nhất 8 ký tự và hai ô phải trùng nhau.','warning');return;}try{const result=await api('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})});toast(result.message,'success');setTimeout(()=>location.replace('./login.php'),800);}catch(error){toast(error.message,'error');}
      }
    },true);
    const remembered=localStorage.getItem('w2e_remember_email');const login=document.getElementById('loginEmail');if(login&&remembered){login.value=remembered;const check=document.getElementById('rememberMe');if(check)check.checked=true;}
    document.addEventListener('click',async(event)=>{const button=event.target.closest('#sendForgotBtn');if(!button)return;event.preventDefault();event.stopImmediatePropagation();const emailInput=document.getElementById('forgotEmail'),email=emailInput?.value.trim()||'';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){emailInput?.classList.add('is-invalid');toast('Nhập địa chỉ email hợp lệ.','warning');return;}emailInput?.classList.remove('is-invalid');button.disabled=true;try{const result=await api('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})});toast(result.message,'success');window.bootstrap?.Modal.getInstance(document.getElementById('forgotModal'))?.hide();}catch(error){toast(error.message,'error');}finally{button.disabled=false;}},true);
    document.addEventListener('click',async(event)=>{const link=event.target.closest('a');if(!link||!(/đăng xuất/i.test(link.textContent)||link.getAttribute('href')==='#logout'))return;event.preventDefault();try{await api('/auth/logout',{method:'POST',body:'{}'});}catch(_){}localStorage.removeItem('w2e_remember_email');clearLocalNoteDrafts();location.href=link.getAttribute('href')==='#logout'?(location.pathname.includes('/pages/')?'./login.php':'./pages/login.php'):link.href;},true);
  }

  function setupNoteComposer() {
    const dropdown=document.getElementById('restaurantDropdown');const search=document.getElementById('restaurantSearch');const status=document.getElementById('autosaveText');let selected=null;let savedRestaurant=null;let timer=null;
    if(dropdown)dropdown.replaceChildren();
    search?.addEventListener('input',()=>{selected=null;savedRestaurant=null;});
    const dateField=document.getElementById('foodDate');if(dateField)dateField.value=todayLocal();
    window.searchRestaurant=async(query)=>{
      if(!dropdown)return;clearTimeout(timer);timer=setTimeout(async()=>{if(!query||query.trim().length<2){dropdown.replaceChildren();return;}try{const data=await api('/restaurants/search?q='+encodeURIComponent(query.trim()));if(search.value.trim()!==query.trim())return;const matches=data.data||[];dropdown.replaceChildren();matches.forEach((place)=>{const item=element('button','w2e-restaurant-item');item.type='button';item.append(element('span','w2e-rest-name',placeName(place)),element('span','w2e-rest-addr',place.managed_record?place.restaurant.address:(addressOf(place.tags,place)||'Địa chỉ chưa có trong OSM')),element('span','small text-secondary',place.managed_record?'Địa điểm What2Eat đã lưu':'Nguồn OpenStreetMap'));item.addEventListener('click',()=>{selected=place;search.value=placeName(place);suggestDishes(place).catch(e=>toast(e.message,'error'));dropdown.classList.remove('show');window.markFoodNoteDirty?.();});dropdown.appendChild(item);});if(!matches.length)dropdown.appendChild(element('p','w2e-restaurant-addr','Chưa tìm thấy quán này trong danh mục. Bạn có thể thêm quán mới.'));const add=element('button','w2e-chip','＋ Thêm quán mới');add.type='button';add.onclick=()=>newNoteRestaurant(query,place=>{selected=place;search.value=placeName(place);dropdown.classList.remove('show');window.markFoodNoteDirty?.();});dropdown.append(add);dropdown.classList.add('show');}catch(error){toast(error.message,'error');}},350);
    };
    window.showRestaurantDropdown=()=>{if(dropdown)dropdown.classList.add('show');};
    let editingNoteId=new URLSearchParams(location.search).get('edit');
    const uploadedFiles=new Set();
    const draftKey=()=>`w2e_note_draft_${state.user.id}_${editingNoteId||'new'}`;
    let draftTimer;
    const captureDraft=()=>({
      savedAt:Date.now(),foodName:document.getElementById('foodName')?.value||'',
      price:document.getElementById('foodPrice')?.value||'',rating:document.getElementById('ratingValue')?.value||'',
      review:document.getElementById('noteComment')?.value||'',date:dateField?.value||'',
      privacy:document.querySelector('input[name="privacy"]:checked')?.value||'private',
      tags:[...document.querySelectorAll('.w2e-selected-tag')].map((x)=>x.firstChild?.textContent||''),
      restaurant:selected?.managed_record?{restaurant_id:selected.id,restaurant_source:selected.source,restaurant_source_id:String(selected.id),restaurant_name:placeName(selected),restaurant_address:selected.restaurant.address||null}:selected?{restaurant_source:'osm',restaurant_source_id:placeId(selected),restaurant_name:placeName(selected),restaurant_address:addressOf(selected.tags,selected)||null}:savedRestaurant,
    });
    const saveLocalDraft=()=>{try{localStorage.setItem(draftKey(),JSON.stringify(captureDraft()));if(status)status.textContent='Đã lưu nội dung trên thiết bị. Ảnh/video cần bấm Lưu Nháp.';}catch(_){if(status)status.textContent='Không lưu được trên thiết bị. Hãy bấm Lưu Nháp.';}};
    const scheduleDraft=()=>{clearTimeout(draftTimer);draftTimer=setTimeout(saveLocalDraft,800);};
    ['foodName','foodPrice','noteComment','foodDate','restaurantSearch','tagInput'].forEach((id)=>document.getElementById(id)?.addEventListener('input',scheduleDraft));
    document.querySelectorAll('input[name="privacy"],.w2e-star').forEach((node)=>{node.addEventListener('change',scheduleDraft);node.addEventListener('click',scheduleDraft);});
    const tagWrap=document.getElementById('tagInputWrap');if(tagWrap)new MutationObserver(scheduleDraft).observe(tagWrap,{childList:true});
    const originalMarkDirty=window.markFoodNoteDirty;window.markFoodNoteDirty=()=>{originalMarkDirty?.();scheduleDraft();};
    const restoreLocalDraft=(serverUpdatedAt=null)=>{
      let draft;try{draft=JSON.parse(localStorage.getItem(draftKey())||'null');}catch(_){return;}
      if(!draft?.savedAt)return;
      const serverTime=serverUpdatedAt?Date.parse(`${String(serverUpdatedAt).replace(' ','T')}Z`):0;
      if(serverTime&&draft.savedAt<=serverTime)return;
      if(!window.confirm('Khôi phục nội dung chưa gửi đã lưu trên thiết bị này?'))return;
      document.getElementById('foodName').value=draft.foodName||'';
      document.getElementById('foodPrice').value=draft.price||'';
      document.getElementById('ratingValue').value=draft.rating||0;
      document.getElementById('noteComment').value=draft.review||'';
      if(dateField)dateField.value=draft.date||todayLocal();
      const privacy=document.querySelector(`input[name="privacy"][value="${draft.privacy}"]`);if(privacy){privacy.checked=true;privacy.dispatchEvent(new Event('change',{bubbles:true}));}
      window.replaceFoodNoteTags?.(draft.tags||[]);
      savedRestaurant=draft.restaurant||null;selected=null;if(search)search.value=savedRestaurant?.restaurant_name||'';
      if(status)status.textContent='Đã khôi phục bản nháp trên thiết bị.';
      toast('Đã khôi phục nội dung chưa gửi.','info');
    };
    const existingMedia=document.getElementById('existingMedia');
    const renderExistingMedia=(media)=>{if(!existingMedia)return;existingMedia.replaceChildren();(media||[]).forEach((item)=>{
      const tile=element('div','w2e-preview-item');const preview=String(item.mime_type).startsWith('video/')?element('video'):element('img');preview.src=item.url;
      if(preview.tagName==='VIDEO')preview.controls=true;else preview.alt='Ảnh Food Note đã lưu';
      preview.style.cssText='width:100%;height:100%;object-fit:cover';
      const remove=element('button','w2e-preview-remove','✕');remove.type='button';remove.title='Xóa tệp đã lưu';remove.setAttribute('aria-label','Xóa tệp đã lưu');
      remove.addEventListener('click',async()=>{if(!window.confirm('Xóa ảnh hoặc video này khỏi Food Note?'))return;remove.disabled=true;try{await api(`/media/${item.id}`,{method:'DELETE',body:'{}'});tile.remove();toast('Đã xóa tệp.','success');}catch(error){remove.disabled=false;toast(error.message,'error');}});
      tile.append(preview,remove);existingMedia.appendChild(tile);
    });};
    async function persistNote(isDraft=false) {
      const foodName=document.getElementById('foodName')?.value.trim()||'';if(!foodName){toast('Nhập tên món ăn trước khi lưu.','warning');return;}
      const selectedMedia=[...(document.getElementById('fileInput')?.files||[]),...(document.getElementById('videoInput')?.files||[])];const oversizedMedia=selectedMedia.find((file)=>file.size>50*1024*1024);if(oversizedMedia){toast(`Tệp “${oversizedMedia.name}” vượt quá giới hạn 50 MB.`, 'warning');return;}
      const tags=[...document.querySelectorAll('.w2e-selected-tag')].map((x)=>x.textContent.replace('✕','').replace(/^#/,'').trim()).filter(Boolean);
      const privacy=document.querySelector('input[name="privacy"]:checked')?.value||'private';
      const chosen=selected;const payload={food_name:foodName,eaten_at:document.getElementById('foodDate')?.value||todayLocal(),price:document.getElementById('foodPrice')?.value||null,rating:Number(document.getElementById('ratingValue')?.value||0)||null,review:document.getElementById('noteComment')?.value.trim()||null,privacy,tags,is_draft:isDraft};
      if(chosen?.managed_record){payload.restaurant_id=chosen.id;payload.restaurant_source=chosen.source;payload.restaurant_source_id=String(chosen.id);payload.restaurant_name=placeName(chosen);payload.restaurant_address=chosen.restaurant.address||null;}else if(chosen){payload.restaurant_source='osm';payload.restaurant_source_id=placeId(chosen);payload.restaurant_name=placeName(chosen);payload.restaurant_address=addressOf(chosen.tags,chosen)||null;}else if(savedRestaurant){payload.restaurant_id=savedRestaurant.restaurant_id;payload.restaurant_source=savedRestaurant.restaurant_source;payload.restaurant_source_id=savedRestaurant.restaurant_source_id;payload.restaurant_name=savedRestaurant.restaurant_name;payload.restaurant_address=savedRestaurant.restaurant_address;}
      const saveButtons=document.querySelectorAll('.w2e-submit-bar button');saveButtons.forEach((b)=>b.disabled=true);
      let savedNote=false;
      try{
        const oldKey=draftKey();
        const result=editingNoteId?await api(`/food-notes/${editingNoteId}`,{method:'PUT',body:JSON.stringify(payload)}):await api('/food-notes',{method:'POST',body:JSON.stringify(payload)});
        const note=result.data;savedNote=true;editingNoteId=note.id;history.replaceState({},'',`?edit=${note.id}`);clearTimeout(draftTimer);try{localStorage.removeItem(oldKey);}catch(_){}
        if(result.share_url){const link=new URL(result.share_url,location.origin).href;let copied=false;try{await navigator.clipboard.writeText(link);copied=true;}catch(_){}if(status){const anchor=element('a','d-block mt-2','Mở Food Note được chia sẻ');anchor.href=link;anchor.target='_blank';anchor.rel='noopener noreferrer';status.replaceChildren(element('span','',copied?'Đã lưu và sao chép liên kết chia sẻ.':'Đã lưu. Bạn có thể mở liên kết chia sẻ bên dưới.'),anchor);}}
        const files=[...(document.getElementById('fileInput')?.files||[]),...(document.getElementById('videoInput')?.files||[])];const currentMedia=[...(note.media||[])];
        for(const file of files){if(uploadedFiles.has(file))continue;const form=new FormData();form.append('media',file);const media=await api(`/food-notes/${note.id}/media`,{method:'POST',body:form});uploadedFiles.add(file);currentMedia.push(media);renderExistingMedia(currentMedia);}
        if(privacy==='link'&&!isDraft){if(!result.share_url&&status)status.textContent='Đã cập nhật. Bạn có thể tạo liên kết mới trong danh sách Food Note.';toast('Food Note đã lưu.','success');}
        else{if(status)status.textContent=isDraft?'Đã lưu bản nháp.':(privacy==='public'?'Đã gửi, đang chờ admin duyệt.':'Đã lưu trên tài khoản của bạn.');toast(isDraft?'Đã lưu bản nháp.':(privacy==='public'?'Food Note đã gửi, chờ quản trị viên duyệt.':'Food Note đã lưu.'),'success');location.href='./food-notes.php';}
      }catch(error){if(savedNote&&status)status.textContent='Ghi chú đã lưu; một tệp tải lên lỗi. Bấm lưu lại để thử tiếp.';toast(error.message,'error');}
      finally{saveButtons.forEach((b)=>b.disabled=false);}
    }
    window.publishNote=()=>persistNote(false);window.saveDraft=()=>persistNote(true);document.getElementById('publishNoteButton')?.addEventListener('click',()=>window.publishNote());document.getElementById('saveDraftButton')?.addEventListener('click',()=>window.saveDraft());document.querySelectorAll('.w2e-submit-bar button').forEach((button)=>button.disabled=false);
    if(editingNoteId){api(`/food-notes/${editingNoteId}`).then(({data})=>{document.getElementById('foodName').value=data.food_name||'';document.getElementById('foodPrice').value=data.price||'';document.getElementById('ratingValue').value=data.rating||0;document.getElementById('noteComment').value=data.review||'';if(dateField)dateField.value=data.eaten_at||todayLocal();if(data.restaurant_name){search.value=data.restaurant_name;savedRestaurant={restaurant_id:data.restaurant_id,restaurant_source:data.restaurant_source,restaurant_source_id:data.restaurant_source_id,restaurant_name:data.restaurant_name,restaurant_address:data.restaurant_address_snapshot};}const privacy=document.querySelector(`input[name="privacy"][value="${data.privacy}"]`);if(privacy){privacy.checked=true;privacy.dispatchEvent(new Event('change',{bubbles:true}));}window.replaceFoodNoteTags?.(data.tags||[]);renderExistingMedia(data.media);if(status)status.textContent='Đang chỉnh sửa Food Note đã lưu.';restoreLocalDraft(data.updated_at);}).catch((error)=>toast(error.message,'error'));}
    else{
      restoreLocalDraft();
      const params=new URLSearchParams(location.search),placeRef=params.get('place')||'';
      const osm=placeRef.match(/^osm:(node|way|relation):([1-9]\d{0,17})$/),managed=placeRef.match(/^managed:(\d+)$/);
      if(osm||managed){
        const path=osm?`/restaurants/osm/${osm[1]}/${osm[2]}?${new URLSearchParams({lat:params.get('lat')||'',lon:params.get('lon')||''})}`:`/restaurants/managed/${managed[1]}`;
        api(path).then(({data})=>{if(search.value.trim())return;savedRestaurant=osm?{restaurant_source:'osm',restaurant_source_id:`${osm[1]}:${osm[2]}`,restaurant_name:placeName(data),restaurant_address:addressOf(data.tags,data)||null}:{restaurant_id:data.id,restaurant_source:data.source,restaurant_source_id:String(data.id),restaurant_name:data.name,restaurant_address:data.address||null};search.value=savedRestaurant.restaurant_name;if(status)status.textContent=`Đã chọn quán: ${savedRestaurant.restaurant_name}`;}).catch((error)=>toast(error.message,'warning'));
      }
    }
  }

  function setupProfile() {
    window.updateSlider=(slider)=>{const value=Number(slider.value),min=Number(slider.min||0),max=Number(slider.max||100);const valueNode=document.getElementById('distanceValue');if(valueNode)valueNode.textContent=Number.isInteger(value)?String(value):value.toFixed(1);const range=max-min;slider.style.background=`linear-gradient(to right, var(--w2e-primary) 0%, var(--w2e-primary) ${range?((value-min)/range)*100:0}%, var(--w2e-border) ${range?((value-min)/range)*100:0}%, var(--w2e-border) 100%)`;};
    window.togglePwd=(id,button)=>{const input=document.getElementById(id);if(!input)return;const visible=input.type==='password';input.type=visible?'text':'password';const icon=button?.querySelector('i');if(icon){icon.classList.toggle('bi-eye',!visible);icon.classList.toggle('bi-eye-slash',visible);}button?.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');};
    window.checkStrength=(input)=>{const value=input.value;const score=[value.length>=8,/[a-z]/.test(value),/[A-Z]/.test(value),/\d/.test(value),/[^A-Za-z0-9]/.test(value)].filter(Boolean).length;const fill=document.getElementById('strengthBarFill'),label=document.getElementById('strengthText');const colors=['#c94a4a','#c94a4a','#e29b24','#78a94a','#27835d','#27835d'];const labels=['','Rất yếu','Yếu','Trung bình','Khá mạnh','Mạnh'];if(fill){fill.style.width=`${score*20}%`;fill.style.backgroundColor=colors[score];}if(label){label.textContent=value?labels[score]:'';label.style.color=colors[score]||'';}window.checkConfirm?.(document.getElementById('confirmPwd'));};
    window.checkConfirm=(input)=>{const label=document.getElementById('confirmMsg');if(!label)return;const value=input.value,original=document.getElementById('newPwd')?.value||'';if(!value){label.textContent='';label.style.color='';return;}const match=value===original;label.textContent=match?'Mật khẩu khớp.':'Mật khẩu chưa khớp.';label.style.color=match?'var(--w2e-success)':'var(--w2e-error)';};
    window.resetInfoForm=()=>{const name=document.getElementById('fullName'),phone=document.getElementById('phone');if(name)name.value=state.user?.name||'';if(phone)phone.value=state.user?.phone||'';};
    window.resetPrefForm=()=>{const preferences=Array.isArray(state.user?.preferences)?state.user.preferences:[];document.querySelectorAll('#prefForm input[type="checkbox"],#prefForm input[type="radio"]').forEach((input)=>{input.checked=preferences.includes(input.value);input.closest('label')?.classList.toggle(input.type==='radio'?'selected':'checked',input.checked);});const distance=preferences.find(value=>value.startsWith('distance:'));const slider=document.getElementById('distanceSlider');if(slider){slider.value=distance?.split(':')[1]||'2';window.updateSlider?.(slider);}};
    window.checkDeleteConfirm=(input)=>{const button=document.getElementById('confirmDeleteBtn');if(!button)return;const ready=input.value==='XÓA TÀI KHOẢN'&&Boolean(document.getElementById('deletePassword')?.value);button.disabled=!ready;button.style.opacity=ready?'1':'0.5';button.style.cursor=ready?'pointer':'not-allowed';};
    window.exportData=async()=>{const button=document.getElementById('exportDataButton');if(button)button.disabled=true;const warnings=[];try{const paths=[['profile','/profile'],['food_plans','/food-plans'],['restaurant_contributions','/restaurants/proposals'],['food_notes','/food-notes?page=1&limit=50'],['favorites','/favorites?page=1&limit=500']];const settled=await Promise.allSettled(paths.map(([,path])=>api(path)));const results={};settled.forEach((entry,index)=>{const key=paths[index][0];if(entry.status==='fulfilled')results[key]=entry.value;else{results[key]=null;warnings.push(`${key}: ${entry.reason?.message||'không tải được'}`);}});if(!results.profile)throw new Error(warnings.find(w=>w.startsWith('profile:'))||'Không tải được hồ sơ.');const collectPages=async(key,endpoint,first,limit)=>{if(!first)return[];const rows=[...(first.data||[])],total=Number(first.total)||rows.length;for(let page=2;rows.length<total&&page<=1000;page++){try{const next=await api(`${endpoint}?page=${page}&limit=${limit}`);if(!next.data?.length){warnings.push(`${key}: API trả trang rỗng trước khi xuất đủ ${total} mục.`);break;}rows.push(...next.data);}catch(error){warnings.push(`${key} trang ${page}: ${error.message}`);break;}}if(rows.length<total&&!warnings.some(message=>message.startsWith(`${key}:`)||message.startsWith(`${key} trang`)))warnings.push(`${key}: giới hạn phân trang khiến chỉ xuất ${rows.length}/${total} mục.`);return rows;};const [notes,favorites]=await Promise.all([collectPages('food_notes','/food-notes',results.food_notes,50),collectPages('favorites','/favorites',results.favorites,500)]);const plans=[];for(const plan of results.food_plans?.data||[]){try{const detail=await api(`/food-plans/${plan.id}`);plans.push(detail.data||plan);}catch(error){warnings.push(`food_plan ${plan.id}: ${error.message}`);plans.push(plan);}}const data={exported_at:new Date().toISOString(),complete:warnings.length===0,export_warnings:warnings,profile:results.profile.user,food_notes:notes,favorites,food_plans:plans,restaurant_contributions:results.restaurant_contributions?.data||[]};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`what2eat-data-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(warnings.length?`Đã xuất dữ liệu một phần. Kiểm tra mục export_warnings (${warnings.length} lỗi).`:'Đã xuất đầy đủ dữ liệu hiện có trong tài khoản.','success');}catch(error){toast(error.message,'error');}finally{if(button)button.disabled=false;}};
    window.deleteAccount=async()=>{const button=document.getElementById('confirmDeleteBtn');if(button)button.disabled=true;try{await api('/profile',{method:'DELETE',body:JSON.stringify({password:document.getElementById('deletePassword')?.value||'',confirmation:document.getElementById('deleteConfirmInput')?.value||''})});localStorage.removeItem('w2e_remember_email');clearLocalNoteDrafts();location.replace('./login.php?account=deleted');}catch(error){toast(error.message,'error');if(button)button.disabled=false;}};
    document.getElementById('deletePassword')?.addEventListener('input',()=>window.checkDeleteConfirm(document.getElementById('deleteConfirmInput')));
    document.getElementById('deleteConfirmInput')?.addEventListener('input',(event)=>window.checkDeleteConfirm(event.currentTarget));
    document.getElementById('confirmDeleteBtn')?.addEventListener('click',()=>window.deleteAccount());
    document.getElementById('exportDataButton')?.addEventListener('click',()=>window.exportData());
    document.getElementById('resetInfoButton')?.addEventListener('click',()=>window.resetInfoForm());
    document.getElementById('resetPrefButton')?.addEventListener('click',()=>window.resetPrefForm());
    const openAvatarPicker=()=>document.getElementById('avatarFileInput')?.click();document.getElementById('profileAvatarButton')?.addEventListener('click',openAvatarPicker);const avatarEdit=document.getElementById('avatarEditButton');avatarEdit?.addEventListener('click',openAvatarPicker);avatarEdit?.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openAvatarPicker();}});
    document.querySelectorAll('#securityForm .btn-toggle-pwd').forEach((button)=>button.addEventListener('click',()=>window.togglePwd(button.dataset.target,button)));
    document.getElementById('newPwd')?.addEventListener('input',(event)=>window.checkStrength(event.currentTarget));
    document.getElementById('confirmPwd')?.addEventListener('input',(event)=>window.checkConfirm(event.currentTarget));
    const initialSlider=document.getElementById('distanceSlider');if(initialSlider)window.updateSlider(initialSlider);
    document.addEventListener('change',(event)=>{const input=event.target;if(input.matches('#prefForm input[type="checkbox"],#prefForm input[type="radio"]')){input.closest('label')?.classList.toggle(input.type==='radio'?'selected':'checked',input.checked);}});
    document.addEventListener('input',(event)=>{if(event.target?.id==='distanceSlider')window.updateSlider?.(event.target);});
    document.addEventListener('submit',async(event)=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;
      if(form.id==='infoForm'){
        event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();try{const result=await api('/profile',{method:'PUT',body:JSON.stringify({name:document.getElementById('fullName')?.value||'',phone:document.getElementById('phone')?.value||'',preferences:state.user?.preferences||[]})});state.user=result.user;fillIdentity(state.user);toast('Thông tin hồ sơ đã được cập nhật.','success');}catch(error){toast(error.message,'error');}
      }else if(form.id==='prefForm'){
        event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();const preferences=[...form.querySelectorAll('input:checked')].map((x)=>x.value);const distance=document.getElementById('distanceSlider')?.value;if(distance)preferences.push(`distance:${distance}`);try{const result=await api('/profile',{method:'PUT',body:JSON.stringify({name:state.user?.name||'',phone:state.user?.phone||'',preferences})});state.user=result.user;toast('Sở thích đã được lưu.','success');}catch(error){toast(error.message,'error');}
      }else if(form.id==='securityForm'){
        event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();const newPassword=document.getElementById('newPwd')?.value||'',confirmation=document.getElementById('confirmPwd')?.value||'';if(newPassword!==confirmation){toast('Mật khẩu mới và ô xác nhận chưa khớp.','warning');return;}try{await api('/profile/password',{method:'POST',body:JSON.stringify({current_password:document.getElementById('currentPwd')?.value||'',new_password:newPassword})});form.reset();const strength=document.getElementById('strengthBarFill'),strengthText=document.getElementById('strengthText'),confirmText=document.getElementById('confirmMsg');if(strength)strength.style.width='0%';if(strengthText)strengthText.textContent='';if(confirmText)confirmText.textContent='';toast('Mật khẩu đã được cập nhật.','success');}catch(error){toast(error.message,'error');}
      }
    },true);
    document.addEventListener('change',async(event)=>{if(event.target?.id!=='avatarFileInput')return;event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();const file=event.target.files?.[0];if(!file)return;const form=new FormData();form.append('avatar',file);try{const result=await api('/profile/avatar',{method:'POST',body:form});state.user=result.user;fillIdentity(state.user);document.querySelectorAll('.w2e-profile-avatar,.w2e-avatar-btn img,.w2e-topbar-admin img').forEach((img)=>{img.hidden=false;img.src=`${result.user.avatar_url}?v=${Date.now()}`;});event.target.value='';toast('Ảnh hồ sơ đã được cập nhật.','success');}catch(error){event.target.value='';toast(error.message,'error');}},true);
  }

  function setupPlans() {
    window.createPlan=async()=>{const name=document.getElementById('planName')?.value.trim()||'';if(!name){toast('Nhập tên Food Plan.','warning');return;}const date=document.getElementById('planDate')?.value;const time=document.getElementById('planTime')?.value;const eventAt=date?new Date(`${date}T${time||'00:00'}`).toISOString():null;try{const result=await api('/food-plans',{method:'POST',body:JSON.stringify({name,description:document.getElementById('planDesc')?.value||'',event_at:eventAt})});closeCreateModal();toast(`Đã tạo Food Plan: ${name}`,'success');await loadPlans();if(result.id){await showPlan(result.id);const panel=document.getElementById('w2ePlanLiveDetail');if(panel&&result.invite_url){const invite=element('div','alert alert-info mt-3');invite.appendChild(element('strong','d-block mb-2','Liên kết mời thành viên'));const row=element('div','d-flex gap-2');const input=element('input','form-control');input.readOnly=true;input.value=new URL(result.invite_url,location.origin).href;const copy=element('button','btn btn-outline-primary','Sao chép');copy.type='button';copy.addEventListener('click',async()=>{await copyLink(input);});row.append(input,copy);invite.appendChild(row);panel.querySelector('.w2e-detail-body')?.prepend(invite);}}}catch(error){toast(error.message,'error');}};
    const chipInput=document.getElementById('emailChipInput');if(chipInput){chipInput.disabled=true;chipInput.placeholder='Mời người khác bằng liên kết chia sẻ sau khi tạo kế hoạch.';}
  }


  function newNoteRestaurant(name,onSaved){
    const dialog=element('dialog','w2e-filter-dialog'),form=element('form');form.append(element('h3','','Thêm quán mới'));const fields={};for(const [key,label,value] of [['name','Tên quán',name],['address','Địa chỉ',''],['latitude','Vĩ độ',''],['longitude','Kinh độ','']]){const l=element('label','d-block mb-2',label),input=element('input','form-control');input.name=key;input.value=value;input.required=true;if(key==='latitude'||key==='longitude'){input.type='number';input.step='any';input.min=key==='latitude'?-90:-180;input.max=key==='latitude'?90:180;}l.append(input);form.append(l);fields[key]=input;}
    const mapNode=element('div');mapNode.style.cssText='height:220px;min-height:220px;background:#eee';const mapHelp=element('p','small','Bấm trên bản đồ để ghim vị trí. Quán dùng được ngay trong Food Note của bạn và chờ duyệt để công khai.'),mapStatus=element('p','small text-danger');mapStatus.hidden=true;form.append(mapNode,mapHelp,mapStatus);const save=element('button','w2e-chip','Lưu quán'),close=element('button','w2e-chip','Đóng');save.type='submit';close.type='button';close.onclick=()=>dialog.close();form.append(save,close);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{const data=Object.fromEntries(new FormData(form));const r=await api('/restaurants/proposals',{method:'POST',body:JSON.stringify(data)});onSaved({managed_record:true,source:'user',id:r.id,tags:{name:data.name},restaurant:{address:data.address}});dialog.close();toast('Đã lưu quán. Bạn có thể viết Food Note ngay.','success');}catch(error){toast(error.message,'error');}finally{save.disabled=false;}};dialog.append(form);document.body.append(dialog);dialog.showModal();let map;if(window.L){map=L.map(mapNode).setView([state.center.lat,state.center.lon],14);const attribution='© OpenStreetMap contributors';const tiles=L.tileLayer('/tiles/{z}/{x}/{y}.png',{maxZoom:19,attribution}).addTo(map);let fallbackTiles=null;tiles.on('tileerror',()=>{if(fallbackTiles)return;map.removeLayer(tiles);mapStatus.hidden=false;mapStatus.textContent='Máy chủ bản đồ local không phản hồi; đang thử tải bản đồ trực tiếp…';fallbackTiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution}).addTo(map);fallbackTiles.on('tileload',()=>{mapStatus.hidden=true;});fallbackTiles.on('tileerror',()=>{mapStatus.hidden=false;mapStatus.textContent='Không tải được nền bản đồ. Bạn vẫn có thể bấm vào vị trí cần ghim hoặc nhập tọa độ.';});});let marker;const setMarker=(latlng)=>{fields.latitude.value=latlng.lat.toFixed(7);fields.longitude.value=latlng.lng.toFixed(7);if(marker)marker.setLatLng(latlng);else marker=L.marker(latlng).addTo(map);};map.on('click',e=>setMarker(e.latlng));const syncManualCoordinates=()=>{const lat=Number(fields.latitude.value),lon=Number(fields.longitude.value);if(fields.latitude.value!==''&&fields.longitude.value!==''&&Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180)setMarker(L.latLng(lat,lon));};fields.latitude.addEventListener('change',syncManualCoordinates);fields.longitude.addEventListener('change',syncManualCoordinates);setTimeout(()=>map.invalidateSize(),0);}dialog.onclose=()=>{map?.remove();dialog.remove();};
  }

  async function copyLink(input) {
    try { if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(input.value);toast('Đã sao chép liên kết','success');return;} } catch (_) {}
    const area=element('textarea');area.value=input.value;area.style.cssText='position:fixed;left:-9999px';document.body.append(area);area.select();let copied=false;try{copied=document.execCommand('copy');}catch(_){}area.remove();
    if(copied)toast('Đã sao chép liên kết','success');else{input.focus();input.select();toast('Chưa sao chép tự động được. Nhấn Ctrl+C hoặc giữ để sao chép liên kết đã chọn.','warning');}
  }
  function showInvite(url,container) {
    container.querySelector('.w2e-invite-link')?.remove();const row=element('div','w2e-invite-link');const input=element('input','form-control');input.readOnly=true;input.value=url;input.setAttribute('aria-label','Liên kết mời');const copy=element('button','w2e-btn-outline','Sao chép');copy.type='button';copy.onclick=()=>copyLink(input);row.append(input,copy);container.append(row);copyLink(input);
  }
  function enhancedFilters(){
    const definitions={filterType:[['','Tất cả'],['viet','Món Việt'],['bbq','BBQ / Lẩu'],['japanese','Món Nhật'],['korean','Món Hàn'],['fastfood','Ăn nhanh'],['cafe','Cà phê'],['dessert','Tráng miệng']],filterBudget:[['','Bất kỳ'],['0:30000','Dưới 30k'],['30000:60000','30–60k'],['60000:100000','60–100k'],['100000:Infinity','Từ 100k']],filterDist:[['','Tất cả trong vùng 5 km'],['0.5','500 m'],['1','1 km'],['2','2 km'],['5','5 km']]};
    for(const [id,choices] of Object.entries(definitions)){
      const old=document.getElementById(id);if(!old)continue;const value=element('input');value.type='hidden';value.id=id;old.replaceWith(value);
      const trigger=element('button','filter-select w2e-filter-trigger',choices[0][1]+' ▾');trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');value.after(trigger);
      const dialog=element('dialog','w2e-filter-dialog');const title=element('h3','',id==='filterType'?'Hôm nay bạn thèm gì?':id==='filterBudget'?'Một bữa ăn vừa túi tiền':'Bạn muốn đi bao xa?');title.id=id+'Title';dialog.setAttribute('aria-labelledby',title.id);const close=element('button','w2e-chip','Xong');close.type='button';close.onclick=()=>dialog.close();dialog.append(title);const chips=element('div','w2e-chips');
      choices.forEach(([key,label])=>{const b=element('button','w2e-chip',label);b.type='button';b.setAttribute('aria-pressed',String(!key));b.onclick=()=>{value.value=key;trigger.textContent=label+' ▾';chips.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(id!=='filterBudget')dialog.close();};chips.append(b);});dialog.append(chips);
      if(id==='filterBudget'){const label=element('label','w2e-budget-toggle');const checkbox=element('input');checkbox.type='checkbox';checkbox.id='includeUnknownPrice';checkbox.checked=true;label.append(checkbox,document.createTextNode(' Gồm cả quán chưa có giá'));dialog.append(label);}
      if(id==='filterDist')dialog.append(element('p','small','Khoảng cách tính từ vị trí của bạn. Nếu không lấy được vị trí, dùng tâm TP. Hồ Chí Minh (10.7769, 106.7009).'));
      dialog.append(close);document.body.append(dialog);trigger.onclick=()=>{dialog.showModal();trigger.setAttribute('aria-expanded','true');};dialog.onclose=()=>{trigger.setAttribute('aria-expanded','false');trigger.focus();};dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
    }
  }
  async function setupNotifications(){
    document.querySelectorAll('.w2e-avatar-btn,.w2e-topbar-admin').forEach(button=>{button.removeAttribute('data-bs-toggle');button.setAttribute('role','link');button.tabIndex=0;button.onclick=e=>{e.preventDefault();location.href='/pages/profile.php';};button.onkeydown=e=>{if(e.key==='Enter')button.click();};});
    if(!state.user)return;let buttons=[...document.querySelectorAll('.w2e-topbar-notify')];if(!buttons.length){const nav=document.querySelector('.w2e-nav-auth,.navbar .navbar-collapse,.navbar .container,.navbar .container-fluid,.topbar-right,.w2e-topbar-right');if(nav){const b=element('button','w2e-topbar-notify','Thông báo');b.type='button';const dot=element('span','w2e-topbar-notify-dot');dot.hidden=true;b.append(dot);nav.append(b);buttons=[b];}}
    for(const button of buttons){button.setAttribute('role','button');button.tabIndex=0;button.setAttribute('aria-label','Thông báo');button.setAttribute('aria-expanded','false');const panel=element('div','w2e-notifications');panel.hidden=true;document.body.append(panel);
      const refresh=async()=>{const d=await api('/notifications');button.querySelectorAll('.w2e-topbar-notify-dot').forEach(dot=>dot.hidden=!d.unread);button.setAttribute('aria-label',`Thông báo, ${d.unread} chưa đọc`);panel.replaceChildren(element('strong','','Thông báo'));const all=element('button','w2e-chip','Đánh dấu tất cả đã đọc');all.onclick=async()=>{await api('/notifications/read',{method:'POST',body:'{}'});await refresh();};panel.append(all);if(!d.data.length)panel.append(element('p','','Chưa có thông báo'));d.data.forEach(n=>{const link=element('a',n.read_at?'':'w2e-unread',n.message);link.href=n.url;link.onclick=async e=>{e.preventDefault();try{await api('/notifications/read',{method:'POST',body:JSON.stringify({id:n.id})});location.href=n.url;}catch(error){toast(error.message,'error');}};panel.append(link);});};
      button.onclick=async()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)try{await refresh();}catch(e){panel.textContent=e.message;}};button.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();button.click();}};document.addEventListener('click',e=>{if(!button.contains(e.target)&&!panel.contains(e.target)){panel.hidden=true;button.setAttribute('aria-expanded','false');}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;button.setAttribute('aria-expanded','false');}});await refresh().catch(()=>{});
    }
  }
  async function suggestDishes(place){
    const input=document.getElementById('foodName');if(!input)return;let list=document.getElementById('w2eDishes');if(!list){list=element('datalist');list.id='w2eDishes';input.after(list);input.setAttribute('list',list.id);}list.replaceChildren();
    const d=await api('/restaurants/dishes?'+new URLSearchParams({source:place.managed_record?'managed':'osm',id:place.managed_record?place.id:placeId(place)}));for(const dish of d.data){const option=element('option');option.value=dish.food_name;option.label=dish.price==null?'':money(dish.price);list.append(option);}input.onchange=()=>{const dish=d.data.find(x=>x.food_name===input.value);if(dish?.price!=null)document.getElementById('foodPrice').value=dish.price;};
  }
  function correctionForm(place,container){
    if(place.source!=='osm')return;const b=element('button','w2e-place-button','Bổ sung/sửa thông tin');b.type='button';container.append(b);b.onclick=()=>{
      if(!state.user){promptPlaceAuth('Bổ sung hoặc sửa thông tin quán');return;}
      const dialog=element('dialog','w2e-place-dialog');const form=element('form');form.append(element('h2','','Bổ sung thông tin quán'));for(const [key,label,value] of [['address','Địa chỉ',place.address],['phone','Số điện thoại',place.phone],['opening_hours','Giờ mở cửa',place.opening],['price_range','Khoảng giá (đồng)',place.price]]){const l=element('label','',label),input=element('input','');input.name=key;input.value=value||'';input.maxLength=key==='address'?500:key==='phone'?40:key==='price_range'?80:255;l.append(input);form.append(l);}const actions=element('div','w2e-place-dialog-actions'),save=element('button','w2e-place-button w2e-place-button--primary','Gửi để duyệt');save.type='submit';const cancel=element('button','w2e-place-button w2e-place-button--quiet','Đóng');cancel.type='button';cancel.onclick=()=>dialog.close();actions.append(save,cancel);form.append(actions);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{const data=Object.fromEntries(new FormData(form));data.source_id=place.sourceId;const r=await api('/place-corrections',{method:'POST',body:JSON.stringify(data)});toast(r.message,'success');dialog.close();}catch(error){if(!recoverPlaceAuth(error,'Bổ sung hoặc sửa thông tin quán'))toast(error.message,'error');}finally{save.disabled=false;}};dialog.append(form);document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
    };
  }
  async function reviewCorrections(){
    if(!location.pathname.endsWith('/admin/restaurants.php'))return;const section=element('section','w2e-place-section');section.append(element('h2','','Thông tin quán chờ duyệt'));document.querySelector('main')?.append(section);const d=await api('/admin/place-corrections');if(!d.data.length)section.append(element('p','','Chưa có đóng góp mới.'));for(const row of d.data){const item=element('article','mb-3');item.append(element('strong','',row.name||row.source_id));const fields=typeof row.fields==='string'?JSON.parse(row.fields):row.fields;const labels={address:'Địa chỉ',phone:'Điện thoại',opening_hours:'Giờ mở cửa',price_range:'Khoảng giá'};for(const [k,v] of Object.entries(fields))item.append(element('p','',`${labels[k]}: ${v}`));for(const [status,label] of [['approved','Duyệt'],['rejected','Từ chối']]){const b=element('button','w2e-chip',label);b.onclick=async()=>{try{await api('/admin/place-corrections/'+row.id,{method:'PATCH',body:JSON.stringify({status})});item.remove();}catch(e){toast(e.message,'error');}};item.append(b);}section.append(item);}
  }
  async function reviewOsmActivity(){
    if(!location.pathname.endsWith('/admin/restaurants.php'))return;
    const host=document.querySelector('.admin-content');if(!host||document.getElementById('osmActivityQueue'))return;
    const section=element('section','w2e-place-review-section');section.id='osmActivityQueue';section.append(element('h2','','Xác minh hoạt động OSM'),element('p','small text-secondary','Chỉ xác nhận sau khi đối chiếu một nguồn thực tế. OSM có bản ghi không đồng nghĩa quán đang mở.'));
    const list=element('div','w2e-osm-activity-list');section.append(list);host.append(section);
    try{
      const result=await api('/admin/osm-verifications?status=unverified');
      if(!result.data?.length){list.append(element('p','text-secondary','Không còn địa điểm OSM đang chờ xác minh trong danh sách hiện tại.'));return;}
      result.data.slice(0,50).forEach(row=>{
        const item=element('article','w2e-osm-activity-item');item.append(element('strong','',row.name),element('p','small text-secondary',row.address||'Chưa có địa chỉ'));
        const verify=element('button','w2e-chip','Xác minh đang hoạt động');verify.type='button';verify.onclick=()=>{
          const dialog=element('dialog','w2e-verify-dialog');const form=element('form');form.append(element('h2','h5','Xác minh hoạt động'),element('p','small text-secondary',`${row.name} · ${row.address||'Chưa có địa chỉ'}`));
          const sourceLabel=element('label','w2e-verify-label','Nguồn kiểm tra'),source=element('input','form-control');source.type='url';source.required=true;source.maxLength=255;source.placeholder='https://www.google.com/maps/...';sourceLabel.append(source);
          const noteLabel=element('label','w2e-verify-label','Bằng chứng và ghi chú'),note=element('textarea','form-control');note.required=true;note.minLength=10;note.maxLength=1000;note.rows=4;noteLabel.append(note);
          const actions=element('div','w2e-verify-dialog-actions'),cancel=element('button','w2e-chip','Hủy'),submit=element('button','w2e-chip','Xác nhận hoạt động');cancel.type='button';cancel.onclick=()=>dialog.close();submit.type='submit';actions.append(cancel,submit);form.append(sourceLabel,noteLabel,actions);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();source.focus();
          form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{await api('/admin/osm-verifications',{method:'POST',body:JSON.stringify({source_id:row.source_id,status:'verified_active',verification_source:source.value.trim(),verification_note:note.value.trim()})});item.remove();dialog.close();toast('Đã ghi nhận xác minh hoạt động.','success');}catch(error){toast(error.message,'error');submit.disabled=false;}};
        };item.append(verify);list.append(item);
      });
    }catch(error){list.append(element('p','text-danger',error.message));}
  }

  function setupRandomPicker() {
    enhancedFilters();
    window.randomFood=async()=>{if(!state.places.length)await loadNearby();const item=window.getRandomNearbyPlace?.({type:document.getElementById('filterType')?.value||'',distance:document.getElementById('filterDist')?.value||'',budget:document.getElementById('filterBudget')?.value||'',unknown:document.getElementById('includeUnknownPrice')?.checked});if(!item){const previous=document.getElementById('randomResult');if(previous)previous.style.display='none';toast('Không có địa điểm nào khớp bộ lọc trong dữ liệu hiện có. Thử bỏ bớt bộ lọc hoặc tải lại.','warning');return;}const result=document.getElementById('randomResult');if(result)result.style.display='block';const img=document.getElementById('rImg');if(img){img.removeAttribute('src');img.alt='Nguồn chưa cung cấp ảnh';img.hidden=true;}const name=document.getElementById('rName');if(name)name.textContent=item.name;const addr=document.getElementById('rAddr');if(addr)addr.textContent=item.address;const rate=document.getElementById('rRating');if(rate){rate.textContent=item.source;rate.hidden=false;}const price=document.getElementById('rPrice');if(price){price.textContent=[item.priceRange?`Khoảng giá: ${item.priceRange}`:'',item.openingHours?`Giờ: ${item.openingHours}`:'',item.phone?`Điện thoại: ${item.phone}`:''].filter(Boolean).join(' · ')||'Chưa có thông tin giá hoặc liên hệ.';price.hidden=false;}const open=result?.querySelector('.open-badge');if(open){open.hidden=true;}const link=result?.querySelector('#rLink');if(link){link.href=item.url;link.textContent='Xem chi tiết';link.removeAttribute('target');link.removeAttribute('rel');}result?.scrollIntoView({behavior:'smooth',block:'center'});};
    window.rollLucky=async()=>{if(!state.places.length)await loadNearby();const place=window.getRandomNearbyPlace?.();const modal=document.getElementById('luckyModal');if(!place||!modal){toast('Chưa tải được địa điểm có dữ liệu. Hãy thử lại sau.','warning');return;}const body=modal.querySelector('.modal-body');if(body){const title=element('h3','h5',place.name),address=element('p','text-secondary',place.address),source=element('p','small text-secondary',place.source),link=element('a','btn btn-primary','Xem chi tiết');link.href=place.url;body.replaceChildren(title,address,source,link);}window.bootstrap?.Modal.getOrCreateInstance(modal).show();};
  }

  function installLiveStyles() {
    const style=document.createElement('style');style.textContent=`.w2e-live-place-card{height:100%;padding:18px;background:#fff;border:1px solid #eadfce;border-radius:16px;box-shadow:0 4px 18px #3020100c}.w2e-live-place-card__top{display:flex;justify-content:space-between;align-items:center;gap:12px}.w2e-live-place-card__type{font-size:.76rem;color:#84631b;background:#f8f0dc;padding:5px 9px;border-radius:20px}.w2e-live-place-card__name{font-size:1.04rem;margin:14px 0 7px;color:#34281d}.w2e-live-place-card__address,.w2e-live-place-card__meta{font-size:.84rem;color:#77685d}.w2e-live-place-card__source{font-size:.82rem;color:#775710}.w2e-live-favorite{border:1px solid #eadfce;background:#fff;border-radius:50%;width:36px;height:36px;color:#a33}.w2e-live-favorite.active{color:#c33}.w2e-plan-actions{margin-top:12px}.w2e-live-proposals{display:grid;gap:10px}.w2e-restaurant-item{display:flex;width:100%;gap:4px;flex-direction:column;text-align:left;border:0;background:#fff;padding:10px}.w2e-restaurant-item:hover{background:#faf3e3}.w2e-restaurant-addr{font-size:.8rem;color:#75685e}`;document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('What2Eat offline support unavailable:',error)));
    installLiveStyles();setupAuthForms();setupRandomPicker();setupPlans();const discoverySearch=document.getElementById('searchInput');if(discoverySearch){const params=new URLSearchParams(location.search);state.requestedCategory=categoryAliases[params.get('category')]?params.get('category'):'';discoverySearch.value=params.get('q')||'';}
    start().catch((error)=>toast(error.message,'error'));
  });
  window.addEventListener('w2e:map-ready',(event)=>{
    if(event.detail?.hasOsmData)return;
    drawDiscovery({elements:[]},event.detail?.center).catch((error)=>toast(error.message,'error'));
  });
  window.addEventListener('w2e:osm-data',(event)=>drawDiscovery(event.detail.data,event.detail.center));
})();
