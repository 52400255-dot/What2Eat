/* What2Eat production client: same-origin PHP API, session auth and real records. */
(function () {
  'use strict';

  const API_ROOT = '/api/v1';
  const OSM_CENTER = { lat: 10.7769, lon: 106.7009 };
  const state = { csrf: '', user: null, authChecked: false, osm: [], places: [], managed: [], favoriteKeys: new Set(), center: OSM_CENTER, notes: [], notePage: 1, noteTotal: 0, noteStats: null, plans: [], adminRestaurants: [], adminCategories: [], userPage: 1, userPages: 1, userTotal: 0, userSearchTimer: null, auditPage: 1, auditPages: 1, auditTotal: 0, auditSearchTimer: null, foodNoteFilter: 'all', foodNotePage: 1, foodNotePages: 1, foodNoteTotal: 0, editRestaurantId: null, editCategoryId: null, requestedCategory: '' };
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
    if (options.body && !isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
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
    if (!response.ok) throw new Error(result?.error || `Yêu cầu thất bại (HTTP ${response.status}).`);
    if (result?.csrf_token) state.csrf = result.csrf_token;
    return result || {};
  }

  const text = (value) => value == null ? '' : String(value);
  const normalizeText = (value) => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLocaleLowerCase('vi');
  const cuisinePatterns={viet:/vietnam|viet|pho|banh|bun|com.?tam/,bbq:/barbecue|\bbbq\b|hot.?pot|shabu/,japanese:/japan|sushi|ramen|udon/,korean:/korean|kimchi|bulgogi/,fastfood:/fast.?food|burger|pizza/,cafe:/cafe|coffee|tea|bubble.?tea/,dessert:/dessert|ice.?cream|cake|bakery|confectionery/};
  const categoryAliases={viet:{label:'Món Việt',pattern:/vietnam|viet/},bbq:{label:'BBQ / Lẩu',pattern:/barbecue|\bbbq\b|hot.?pot|shabu/},cafe:{label:'Cà phê',pattern:/cafe|coffee/},nhat:{label:'Nhật Bản',pattern:/japan|sushi|ramen|udon/},han:{label:'Hàn Quốc',pattern:/korean|kimchi|bulgogi/},fast:{label:'Ăn nhanh',pattern:/fast.?food|burger|pizza/},dessert:{label:'Tráng miệng',pattern:/dessert|ice.?cream|cake|bakery|confectionery/},drink:{label:'Đồ uống',pattern:/drink|beverage|tea|juice|bubble.?tea/}};
  const money = (value) => value == null || value === '' ? 'Chưa có dữ liệu giá' : new Intl.NumberFormat('vi-VN').format(Number(value)) + ' ₫';
  const localDate = (value) => { if (!value) return 'Chưa ghi ngày'; const d = new Date(`${String(value).slice(0, 10)}T00:00:00`); return Number.isNaN(d.getTime()) ? text(value) : d.toLocaleDateString('vi-VN'); };
  const todayLocal = () => { const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
  const element = (tag, cls, value) => { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined) node.textContent = value; return node; };
  const placeName = (place) => place?.tags?.name?.trim() || '';
  const placeId = (place) => `${place.type}:${place.id}`;
  const placeUrl = (place) => place?.managed_record ? `${location.pathname.includes('/pages/')?'./':'./pages/'}restaurant.php?id=${encodeURIComponent(place.id)}` : `https://www.openstreetmap.org/${encodeURIComponent(place.type)}/${encodeURIComponent(place.id)}`;
  const placeCoords = (place) => {
    const coords=Number.isFinite(place?.lat)?[place.lat,place.lon]:[place?.center?.lat,place?.center?.lon];
    // Ignore the common placeholder near 0,0; What2Eat's restaurant catalog is Vietnam-focused.
    return coords.every(Number.isFinite)&&!(Math.abs(coords[0])<0.01&&Math.abs(coords[1])<0.01)?coords:[Number.NaN,Number.NaN];
  };
  const managedPlacesCache = new Map();
  const managedPlacesRequests = new Map();
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
      if (!navigator.geolocation) return resolve(OSM_CENTER);
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        () => resolve(OSM_CENTER), { timeout: 6000, maximumAge: 300000, enableHighAccuracy: false }
      );
    });
  }

  async function nearby(center = state.center, radius = 2500) {
    const params = new URLSearchParams({ lat: String(center.lat), lon: String(center.lon), radius: String(radius) });
    const response = await fetch(`/api/restaurants?${params}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Không tải được dữ liệu OpenStreetMap.');
    if (!Array.isArray(data.elements)) throw new Error('Dữ liệu OpenStreetMap trả về không hợp lệ.');
    state.osm = data.elements.filter((p) => placeName(p) && placeCoords(p).every(Number.isFinite));
    state.center = center;
    return data;
  }

  function favoriteButton(place) {
    const button = element('button', 'w2e-live-favorite');
    button.type = 'button'; button.setAttribute('aria-label', `Lưu ${placeName(place)} vào yêu thích`); button.title = 'Lưu địa điểm này';const key=favoriteKey(place);const saved=state.favoriteKeys.has(key);button.classList.toggle('active',saved);button.innerHTML = `<i class="bi bi-heart${saved?'-fill':''}"></i>`;
    button.addEventListener('click', async (event) => {
      event.preventDefault(); event.stopPropagation();
      try {
        if (!state.user) throw new Error('Đăng nhập để lưu địa điểm yêu thích.');
        const coords=placeCoords(place);const source=place.managed_record?(place.source||'admin'):'osm';const sourceId=place.managed_record?`managed:${place.id}`:placeId(place);const result = await api('/favorites', { method: 'POST', body: JSON.stringify({ source, source_id: sourceId, name: placeName(place), address: place.managed_record?place.restaurant.address:addressOf(place.tags,place), latitude:Number.isFinite(coords[0])?coords[0]:null, longitude:Number.isFinite(coords[1])?coords[1]:null, source_url: place.source_url||placeUrl(place), restaurant_id:place.managed_record?place.id:null }) });
        if(result.favorite)state.favoriteKeys.add(key);else state.favoriteKeys.delete(key);
        button.classList.toggle('active', result.favorite); button.innerHTML = `<i class="bi bi-heart${result.favorite ? '-fill' : ''}"></i>`;
        toast(result.favorite ? 'Đã lưu địa điểm vào mục yêu thích.' : 'Đã bỏ địa điểm khỏi mục yêu thích.', 'success');
      } catch (error) { toast(error.message, 'warning'); if (!state.user) window.location.href = `${location.pathname.includes('/pages/') ? './login.php' : './pages/login.php'}`; }
    });
    return button;
  }

  function nearbyCard(place, index = 0) {
    const [lat, lon] = placeCoords(place);
    const card = element('article', 'w2e-live-place-card');
    card.dataset.placeId = placeFilterKey(place);
    card.dataset.name = placeName(place).toLowerCase();
    card.dataset.cuisine = cuisineOf(place.tags, place).toLowerCase();
    card.dataset.search = placeSearchText(place);
    card.dataset.rawSearch = placeSearchRawText(place);
    card.dataset.distance = Number.isFinite(lat)&&Number.isFinite(lon)?String((distanceKm(state.center.lat, state.center.lon, lat, lon)).toFixed(2)):'';
    const header = element('div', 'w2e-live-place-card__top');
    const badge = element('span', 'w2e-live-place-card__type', cuisineOf(place.tags, place) || (place.managed_record?'Địa điểm What2Eat':'Địa điểm OSM'));
    header.append(badge, favoriteButton(place));
    const title = element('h3', 'w2e-live-place-card__name', placeName(place));
    const address = element('p', 'w2e-live-place-card__address', place.managed_record?place.restaurant.address:(addressOf(place.tags,place)||'OpenStreetMap chưa ghi địa chỉ cụ thể.'));
    const provenance=place.managed_record?({osm:'OpenStreetMap',user:'Thành viên What2Eat',admin:'Quản trị viên'})[place.source]||'Nguồn chưa ghi rõ':(place.snapshot?`OSM snapshot ${place.snapshot_date||''} · chưa xác minh hoạt động`:'OpenStreetMap');
    const distanceText=card.dataset.distance?`${card.dataset.distance} km từ tâm tìm kiếm`:'Chưa có tọa độ';const detail = element('p', 'w2e-live-place-card__meta', `${distanceText} · ${provenance}`);
    const link = element('a', 'w2e-live-place-card__source', place.managed_record?'Xem thông tin ↗':'Mở nguồn OSM ↗');
    link.href = placeUrl(place); if(!place.managed_record){link.target='_blank';link.rel='noopener noreferrer';}
    card.append(header, title, address, detail, link);
    if(Array.isArray(place.public_food_names)&&place.public_food_names.length)card.appendChild(element('p','w2e-live-place-card__meta',`Món thành viên ghi trong Food Note công khai: ${place.public_food_names.join(', ')}`));
    if(place.managed_record&&place.source_url){const evidence=element('a','w2e-live-place-card__source d-block mt-1','Đối chiếu nguồn ↗');evidence.href=place.source_url;evidence.target='_blank';evidence.rel='noopener noreferrer';card.appendChild(evidence);}
    card.dataset.index = String(index);
    return card;
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => v * Math.PI / 180; const dLat = toRad(lat2-lat1); const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  async function drawDiscovery(data, center) {
    const grid = document.getElementById('restaurantGrid'); if (!grid) return;
    const elements = (data.elements || []).filter((p) => placeName(p) && placeCoords(p).every(Number.isFinite)).map((place)=>data.snapshot?{...place,snapshot:true,snapshot_date:data.snapshot_date}:place);
    state.center = center || state.center;
    state.managed = await loadManagedPlaces(state.center, 2000);
    state.osm = elements.filter(osmPlace => !state.managed.some(place => isManagedOsmDuplicate(osmPlace, place.restaurant)));
    state.places = [...state.osm, ...state.managed];
    window.dispatchEvent(new CustomEvent('w2e:managed-data',{detail:{restaurants:state.managed.map(place=>place.restaurant),center:state.center}}));
    grid.replaceChildren();document.body.classList.add('w2e-live-ready');
    state.places.forEach((place, index) => {const col=element('div','col-12 col-sm-6 col-xl-4');col.appendChild(nearbyCard(place,index));grid.appendChild(col);});
    const count = document.getElementById('resultCount'); if (count) count.textContent = String(state.places.length);
    const empty = document.getElementById('emptyState'); if (empty) { empty.style.display = state.places.length ? 'none' : 'block'; const p=empty.querySelector('p'); if(p)p.textContent='Chưa có địa điểm có dữ liệu quanh vị trí đang tìm. Hãy di chuyển bản đồ hoặc thử lại sau.'; }
    const pages = document.getElementById('paginationWrap'); if (pages) pages.style.display = 'none';
    const tabs = document.getElementById('categoryTabs');
    if (tabs) {
      const types = [...new Set(state.places.map((p) => cuisineOf(p.tags, p)).filter(Boolean))].slice(0, 9);
      tabs.replaceChildren();
      const all = element('button', 'w2e-cat-tab active', 'Tất cả'); all.dataset.filter = ''; tabs.appendChild(all);
      const requested=categoryAliases[state.requestedCategory];if(requested){const button=element('button','w2e-cat-tab active',requested.label);button.dataset.filter=`alias:${state.requestedCategory}`;all.classList.remove('active');tabs.appendChild(button);}
      types.forEach((type) => { const button=element('button','w2e-cat-tab',type);button.dataset.filter=type.toLowerCase();tabs.appendChild(button); });
      tabs.querySelectorAll('.w2e-cat-tab').forEach((button)=>button.addEventListener('click',()=>{tabs.querySelectorAll('.w2e-cat-tab').forEach((b)=>b.classList.toggle('active',b===button));filterDiscovery();}));
    }
    ['priceFilter','ratingFilter','openToggle'].forEach((id) => { const control=document.getElementById(id); if(control){control.disabled=true;control.title='Nguồn dữ liệu hiện có không cung cấp nhất quán trường này.';} });
    const sort=document.getElementById('sortFilter');if(sort){sort.querySelectorAll('option[value="rating"],option[value="price"]').forEach(option=>{if(!option.disabled){option.disabled=true;option.textContent+= ' (không có trong nguồn)';}});if(!sort.dataset.w2eBound){sort.addEventListener('change',sortDiscovery);sort.dataset.w2eBound='true';}}
    const gridButton=document.getElementById('gridViewBtn'),listButton=document.getElementById('listViewBtn');if(gridButton&&!gridButton.dataset.w2eBound){gridButton.addEventListener('click',()=>setDiscoveryView('grid'));gridButton.dataset.w2eBound='true';}if(listButton&&!listButton.dataset.w2eBound){listButton.addEventListener('click',()=>setDiscoveryView('list'));listButton.dataset.w2eBound='true';}
    document.getElementById('paginationWrap')?.setAttribute('hidden','');
    sortDiscovery();
    filterDiscovery();
  }

  function sortDiscovery(){const grid=document.getElementById('restaurantGrid');if(!grid)return;const mode=document.getElementById('sortFilter')?.value||'relevant';const items=[...grid.children];if(mode==='distance')items.sort((a,b)=>{const da=Number(a.querySelector('.w2e-live-place-card')?.dataset.distance)||Infinity;const db=Number(b.querySelector('.w2e-live-place-card')?.dataset.distance)||Infinity;return da-db;});items.forEach(item=>grid.appendChild(item));}
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
    const items=[...state.osm.filter(placeName).slice(0,4),...state.managed.slice(0,4)];
    if(!items.length){const note=element('p','text-secondary','Chưa có địa điểm thực trong dữ liệu. Hãy bật định vị hoặc khám phá trên bản đồ.');grid.appendChild(note);return;}
    items.forEach((place,index)=>{const col=element('div','col-12 col-sm-6 col-lg-3');col.appendChild(nearbyCard(place,index));grid.appendChild(col);});
  }

  async function loadNearby() {
    const mapStatus=document.getElementById('mapStatus');
    if(mapStatus)return; // The map owns location/search and emits its successful result.
    if(!document.querySelector('#randomResult')&&!document.querySelector('#homePlacesGrid'))return;
    const center=await chosenCenter();
    try { const data=await nearby(center,3000);state.center=center;state.managed=await loadManagedPlaces(center,3000);state.osm=(data.elements||[]).filter(p=>placeName(p)&&placeCoords(p).every(Number.isFinite)&&!state.managed.some(place=>isManagedOsmDuplicate(p,place.restaurant)));state.places=[...state.osm,...state.managed];renderHomePlaces();document.body.classList.add('w2e-live-ready'); }
    catch(error) { const grid=document.getElementById('homePlacesGrid');if(grid){grid.replaceChildren(element('p','text-secondary',error.message));} }
  }

  window.refreshNearbyPlaces = loadNearby;
  window.getRandomNearbyPlace = (filters = {}) => {
    if (!state.places.length) return null;
    let candidates=state.places;
    if(filters.type&&cuisinePatterns[filters.type])candidates=candidates.filter((place)=>cuisinePatterns[filters.type].test(normalizeText(cuisineOf(place.tags,place))));
    if(filters.distance){candidates=candidates.filter((place)=>{const [lat,lon]=placeCoords(place);if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;const distance=distanceKm(state.center.lat,state.center.lon,lat,lon);if(filters.distance==='under1')return distance<1;if(filters.distance==='1to3')return distance>=1&&distance<=3;if(filters.distance==='over3')return distance>3;return true;});}
    if(!candidates.length)return null;
    const place = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      name: placeName(place),
      address: place.managed_record ? place.restaurant.address : (addressOf(place.tags,place) || 'OpenStreetMap chưa ghi địa chỉ cụ thể.'),
      url: placeUrl(place), mapUrl: placeMapUrl(place), sourceUrl: place.source_url||placeUrl(place),
      source: place.managed_record ? 'Thông tin do What2Eat lưu; xem nguồn đối chiếu nếu có.' : 'Dữ liệu OpenStreetMap',
    };
  };

  function renderNotes(notes) {
    state.notes=notes;document.body.classList.add('w2e-live-ready');
    const grid=document.getElementById('gridView');const list=document.getElementById('listView');if(!grid)return;
    grid.replaceChildren(); if(list) list.replaceChildren();
    const pinned=document.querySelector('.w2e-pinned-section .w2e-notes-grid');if(pinned)pinned.replaceChildren();
    const tagNames=[...new Set(notes.flatMap((n)=>n.tags||[]))];const tagWrap=document.querySelector('.w2e-tag-filter');if(tagWrap){tagWrap.replaceChildren(element('span','', 'Lọc nhãn: '));const all=element('button','w2e-tag-btn active','Tất cả');all.dataset.tag='';tagWrap.appendChild(all);tagNames.forEach((tag)=>{const b=element('button','w2e-tag-btn','#'+tag);b.dataset.tag=tag;tagWrap.appendChild(b);});tagWrap.querySelectorAll('button').forEach((b)=>b.addEventListener('click',()=>{tagWrap.querySelectorAll('button').forEach((x)=>x.classList.toggle('active',x===b));applyNoteFilters();}));}
    notes.forEach((note)=>{
      const card=element('article',`w2e-note-card${note.is_pinned?' pinned':''}`);card.dataset.noteId=String(note.id);card.dataset.rating=text(note.rating||'');card.dataset.tags=(note.tags||[]).join(' ').toLocaleLowerCase('vi');card.dataset.search=`${note.food_name} ${note.restaurant_name||''} ${note.review||''}`.toLocaleLowerCase('vi');
      const image=note.media?.find((m)=>String(m.mime_type||'').startsWith('image/'));if(image){const img=element('img','w2e-card-img');img.src=image.url;img.alt=note.food_name;card.appendChild(img);}
      const body=element('div','w2e-card-body');body.appendChild(element('div','w2e-food-name',note.food_name));
      if(note.rating!=null)body.appendChild(element('div','w2e-rating',`★ ${note.rating} / 5`));if(note.restaurant_name)body.appendChild(element('div','w2e-note-restaurant',note.restaurant_name));if(note.price!=null)body.appendChild(element('div','w2e-price',money(note.price)));if(note.review)body.appendChild(element('p','w2e-comment',note.review));
      const tags=element('div','w2e-tags');(note.tags||[]).forEach((t)=>tags.appendChild(element('span','w2e-tag-badge','#'+t)));body.appendChild(tags);const noteStateLabel=({pending:'Chờ duyệt',rejected:'Bị từ chối',hidden:'Đã ẩn',draft:'Bản nháp'})[note.status]||(note.privacy==='public'?'Công khai':note.privacy==='link'?'Có liên kết':'Riêng tư');body.appendChild(element('span',`w2e-privacy-badge w2e-privacy-${note.privacy}`,noteStateLabel));
      card.dataset.date=note.eaten_at||note.created_at||'';const footer=element('div','w2e-card-footer');footer.appendChild(element('span','w2e-date',localDate(note.eaten_at||note.created_at)));const actions=element('div','w2e-actions');
      const fav=element('button','w2e-action-btn',note.is_favorite?'♥':'♡');fav.type='button';fav.title='Đổi yêu thích';fav.setAttribute('aria-label','Đổi yêu thích');fav.addEventListener('click',()=>changeNote(note,{is_favorite:!note.is_favorite}));const pin=element('button','w2e-action-btn',note.is_pinned?'Bỏ ghim':'Ghim');pin.type='button';pin.title=note.is_pinned?'Bỏ ghim':'Ghim';pin.addEventListener('click',()=>changeNote(note,{is_pinned:!note.is_pinned}));const edit=element('a','w2e-action-btn','Sửa');edit.href=`./create-food-note.php?edit=${encodeURIComponent(note.id)}`;edit.title='Sửa Food Note';const del=element('button','w2e-action-btn w2e-danger','Xóa');del.type='button';del.addEventListener('click',()=>deleteNote(note));actions.append(fav,pin,edit,del);footer.appendChild(actions);card.append(body,footer);grid.appendChild(card);if(note.is_pinned&&pinned)pinned.appendChild(card.cloneNode(true));
      if(list){const row=element('article','w2e-note-item',`${note.food_name} · ${note.rating==null?'Chưa đánh giá':note.rating+'/5'} · ${localDate(note.eaten_at||note.created_at)}`);list.appendChild(row);}
    });
    const empty=document.getElementById('emptyState');if(empty)empty.classList.toggle('w2e-hidden',notes.length>0);
    const stats=state.noteStats||{};[['foodNoteCount',stats.total],['pinnedFoodNoteCount',stats.pinned],['foodNoteAverage',stats.average_rating==null?'—':Number(stats.average_rating).toFixed(1)],['favoriteFoodNoteCount',stats.favorites]].forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=value==null?'0':String(value);});const loadMore=document.getElementById('loadMoreNotes');if(loadMore)loadMore.hidden=state.noteTotal<=notes.length;
    applyNoteFilters();
  }

  function applyNoteFilters() {
    const query=(document.getElementById('noteSearch')?.value||'').toLocaleLowerCase('vi');const rating=Number(document.getElementById('ratingFilter')?.value||0);const tag=document.querySelector('.w2e-tag-filter .w2e-tag-btn.active')?.dataset.tag||'';let shown=0;
    const sort=document.getElementById('timeFilter')?.value||'newest';const grid=document.getElementById('gridView');if(grid){[...grid.children].sort((a,b)=>sort==='oldest'?a.dataset.date.localeCompare(b.dataset.date):b.dataset.date.localeCompare(a.dataset.date)).forEach(card=>grid.appendChild(card));}
    document.querySelectorAll('#gridView .w2e-note-card').forEach((card)=>{const r=Number(card.dataset.rating||0);const ok=(!query||card.dataset.search.includes(query))&&(!rating||r>=rating)&&(!tag||card.dataset.tags.includes(tag.toLocaleLowerCase('vi')));card.hidden=!ok;if(ok)shown++;});
    const empty=document.getElementById('emptyState');if(empty)empty.classList.toggle('w2e-hidden',shown>0);
  }

  async function changeNote(note, update) {
    try { const payload={food_name:note.food_name,eaten_at:note.eaten_at,price:note.price,rating:note.rating,review:note.review,privacy:note.privacy,tags:note.tags,is_favorite:note.is_favorite,is_pinned:note.is_pinned,is_draft:note.status==='draft',restaurant_id:note.restaurant_id,restaurant_source:note.restaurant_source,restaurant_source_id:note.restaurant_source_id,restaurant_name:note.restaurant_name,restaurant_address:note.restaurant_address_snapshot,...update};await api(`/food-notes/${note.id}`,{method:'PUT',body:JSON.stringify(payload)});await loadNotes(); }
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

  function planCard(plan) {
    const col=element('div','col-12 col-md-6 col-lg-4');const card=element('article','w2e-plan-card');
    const statuses={open:'Đang bình chọn',decided:'Đã chốt',closed:'Đã đóng',cancelled:'Đã hủy'};card.append(element('div','w2e-plan-name',plan.name),element('p','w2e-plan-description',plan.description||'Chưa có mô tả.'),element('p','w2e-plan-meta',`${plan.member_count} thành viên · ${plan.proposal_count} đề xuất · ${statuses[plan.status]||plan.status}`));
    if(plan.event_at)card.appendChild(element('p','w2e-plan-date',new Date(plan.event_at.replace(' ','T')+'Z').toLocaleString('vi-VN')));
    const actions=element('div','w2e-plan-actions');if(plan.member_role==='owner'){const invite=element('button','w2e-btn-outline','Tạo liên kết mời mới');invite.type='button';invite.addEventListener('click',async(event)=>{event.stopPropagation();try{const d=await api(`/food-plans/${plan.id}/invite`,{method:'POST',body:'{}'});const url=new URL(d.invite_url,location.origin).href;try{await navigator.clipboard.writeText(url);toast('Đã tạo và sao chép liên kết mời.','success');}catch(_){toast(`Liên kết mời: ${url}`,'success');}}catch(error){toast(error.message,'error');}});actions.appendChild(invite);const remove=element('button','btn btn-sm btn-outline-danger ms-2','Xóa kế hoạch');remove.type='button';remove.addEventListener('click',async(event)=>{event.stopPropagation();if(!window.confirm(`Xóa Food Plan “${plan.name}”?`))return;try{await api(`/food-plans/${plan.id}`,{method:'DELETE'});toast('Food Plan đã được xóa.','success');await loadPlans();}catch(error){toast(error.message,'error');}});actions.appendChild(remove);}
    card.addEventListener('click',()=>showPlan(plan.id));col.append(card,actions);return col;
  }

  async function loadPlans() {
    const grid=document.getElementById('foodPlanGrid');if(!grid)return;grid.replaceChildren(element('p','text-secondary','Đang tải Food Plan…'));
    try{const result=await api('/food-plans');document.body.classList.add('w2e-live-ready');state.plans=result.data||[];grid.replaceChildren();if(!state.plans.length){grid.appendChild(element('p','text-secondary','Bạn chưa có Food Plan nào. Tạo kế hoạch để mời thành viên và bình chọn địa điểm.'));return;}state.plans.forEach((p)=>grid.appendChild(planCard(p)));}
    catch(error){grid.replaceChildren(element('p','text-danger',error.message));toast(error.message,'error');}
  }

  async function loadSharedNote(){
    const token=new URLSearchParams(location.search).get('share');const root=document.getElementById('sharedFoodNote');if(!root)return;if(!token){root.textContent='Liên kết Food Note không hợp lệ.';return;}
    try{const result=await api(`/food-notes/share/${encodeURIComponent(token)}`);const note=result.data;root.replaceChildren(element('h1','',note.food_name),element('p','',`Chia sẻ bởi ${note.author_name||'người dùng What2Eat'} · ${localDate(note.eaten_at||note.created_at)}`));if(note.restaurant_name)root.appendChild(element('p','',`Địa điểm: ${note.restaurant_name}`));if(note.rating!=null)root.appendChild(element('p','',`Đánh giá cá nhân: ${note.rating}/5`));if(note.review)root.appendChild(element('p','',note.review));const media=element('div','shared-food-note-media');(note.media||[]).forEach((m)=>{if(String(m.mime_type).startsWith('image/')){const img=element('img');img.src=m.url;img.alt=note.food_name;img.loading='lazy';media.appendChild(img);}else if(String(m.mime_type).startsWith('video/')){const video=element('video');video.controls=true;video.src=m.url;media.appendChild(video);}});root.appendChild(media);}catch(error){root.replaceChildren(element('p','',error.message));}
  }

  async function loadManagedRestaurantDetail(){
    const root=element('main','container py-5');root.id='restaurantDetail';document.body.replaceChildren(root);document.documentElement.classList.remove('w2e-restaurant-route');
    const back=element('a','btn btn-outline-secondary mb-4','← Khám phá địa điểm');back.href='./discovery.php';root.appendChild(back);
    const id=new URLSearchParams(location.search).get('id');if(!id||!/^\d+$/.test(id)){root.append(element('h1','', 'Địa điểm'),element('p','text-secondary','Chọn một địa điểm đã được quản trị viên duyệt hoặc khám phá dữ liệu OpenStreetMap.'),back.cloneNode(true));return;}
    root.appendChild(element('p','text-secondary','Đang tải thông tin đã được duyệt…'));
    try{const result=await api(`/restaurants/managed/${encodeURIComponent(id)}`);const restaurant=result.data;root.replaceChildren(back,element('h1','display-5 fw-bold',restaurant.name),element('p','lead',restaurant.address||'Chưa có địa chỉ trong dữ liệu.'),element('p','text-secondary',restaurant.category_name||restaurant.cuisine||'Chưa phân loại'));
      const detail=element('section','card p-4 mt-3');const fields=[['Mô tả',restaurant.description],['Ẩm thực',restaurant.cuisine],['Điện thoại',restaurant.phone],['Khoảng giá',restaurant.price_range],['Giờ mở cửa',restaurant.opening_hours?.text],['Website',restaurant.website]];fields.forEach(([label,value])=>{const row=element('p','mb-2');row.appendChild(element('strong','me-2',`${label}:`));row.appendChild(element('span','',value||'Chưa có dữ liệu được xác minh.'));detail.appendChild(row);});
      const provenance=({osm:'OpenStreetMap',user:'Thành viên What2Eat',admin:'Quản trị viên'})[restaurant.source]||'Nguồn chưa được ghi rõ';detail.appendChild(element('p','small text-secondary mb-0',`Nguồn dữ liệu: ${provenance}`));root.appendChild(detail);
      const links=element('div','d-flex flex-wrap gap-2 mt-4');if(restaurant.source_url&&/^https?:\/\//i.test(restaurant.source_url)){const source=element('a','btn btn-outline-primary','Đối chiếu nguồn ↗');source.href=restaurant.source_url;source.target='_blank';source.rel='noopener noreferrer';links.appendChild(source);}const [latitude,longitude]=placeCoords({lat:restaurant.latitude,lon:restaurant.longitude});if(Number.isFinite(latitude)&&Number.isFinite(longitude)){const map=element('a','btn btn-outline-secondary','Xem trên OpenStreetMap ↗');map.href=`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;map.target='_blank';map.rel='noopener noreferrer';links.appendChild(map);}root.appendChild(links);document.title=`${restaurant.name} | What2Eat`;
    }catch(error){root.replaceChildren(back,element('h1','', 'Không tải được địa điểm'),element('p','text-danger',error.message),element('a','btn btn-primary','Quay lại khám phá'));root.querySelector('a.btn-primary').href='./discovery.php';}
  }

  async function showPlan(id) {
    try {
      const result=await api(`/food-plans/${id}`);const plan=result.data;let panel=document.getElementById('w2ePlanLiveDetail');
      if(!panel){panel=element('section','w2e-detail-section');panel.id='w2ePlanLiveDetail';document.querySelector('.w2e-section-title')?.after(panel);}
      panel.replaceChildren(element('h2','w2e-detail-title',plan.name),element('p','',plan.description||''),element('p','w2e-plan-meta',`Trạng thái: ${plan.status==='open'?'Đang bình chọn':plan.status} · ${plan.event_at?new Date(plan.event_at.replace(' ','T')+'Z').toLocaleString('vi-VN'):'Chưa đặt thời gian'}`));
      if(plan.member_role==='owner'&&plan.status==='open'){
        const close=element('button','btn btn-outline-secondary mb-3','Chốt kết quả và đóng bình chọn');close.type='button';close.addEventListener('click',async()=>{const eventAt=plan.event_at?new Date(`${plan.event_at.replace(' ','T')}Z`).toISOString():null;try{await api(`/food-plans/${plan.id}`,{method:'PATCH',body:JSON.stringify({name:plan.name,description:plan.description||'',event_at:eventAt,status:'decided'})});await loadPlans();await showPlan(plan.id);toast('Food Plan đã chốt bình chọn.','success');}catch(error){toast(error.message,'error');}});panel.appendChild(close);
      }
      const list=element('div','w2e-live-proposals');
      (plan.proposals||[]).forEach((proposal)=>{
        const row=element('div','w2e-vote-item');const info=element('div','w2e-vote-info');info.append(element('strong','',proposal.name),element('div','w2e-vote-meta',`${proposal.address||'Địa chỉ chưa có'} · ${proposal.votes} phiếu`));
        if(proposal.source_url){const source=element('a','small','Nguồn địa điểm ↗');source.href=proposal.source_url;source.target='_blank';source.rel='noopener noreferrer';info.appendChild(source);}
        const vote=element('button','w2e-vote-btn',proposal.my_vote?'Đã bình chọn':'Bình chọn');vote.type='button';vote.disabled=Boolean(proposal.my_vote)||plan.status!=='open';vote.addEventListener('click',async()=>{try{await api(`/food-plans/${plan.id}/vote`,{method:'POST',body:JSON.stringify({proposal_id:proposal.id})});await showPlan(plan.id);await loadPlans();}catch(error){toast(error.message,'error');}});row.append(info,vote);list.appendChild(row);
      });
      panel.appendChild(element('h3','w2e-section-title','Địa điểm được đề xuất'));panel.appendChild(list);
      if(plan.status==='open'){
        const finder=element('div','w2e-plan-place-finder mt-4');finder.appendChild(element('h3','w2e-section-title','Thêm địa điểm từ OpenStreetMap'));
        const form=element('form','d-flex gap-2 flex-wrap');const input=element('input','form-control');input.type='search';input.placeholder='Tìm theo tên trong khu vực của bạn';input.setAttribute('aria-label','Tìm địa điểm OpenStreetMap');const searchButton=element('button','btn w2e-btn-primary','Tìm quanh tôi');searchButton.type='submit';form.append(input,searchButton);finder.appendChild(form);finder.appendChild(element('small','text-secondary','Kết quả và liên kết nguồn do OpenStreetMap cung cấp.'));
        const results=element('div','w2e-live-proposals mt-3');finder.appendChild(results);form.addEventListener('submit',event=>{event.preventDefault();searchPlanPlaces(plan, input.value, results, searchButton);});panel.appendChild(finder);
      }
      panel.appendChild(element('h3','w2e-section-title','Thành viên'));(plan.members||[]).forEach(member=>panel.appendChild(element('p','w2e-member-item',member.name+(member.role==='owner'?' · Chủ kế hoạch':''))));panel.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){toast(error.message,'error');}
  }

  async function searchPlanPlaces(plan,query,results,button){
    if(!plan||plan.status!=='open')return;
    const term=query.trim().toLocaleLowerCase('vi');
    results.replaceChildren(element('p','text-secondary','Đang tìm địa điểm quanh vị trí hiện tại…'));
    button.disabled=true;
    try{
      const center=await chosenCenter();
      const [osm,managed]=await Promise.all([nearby(center,3000),loadManagedPlaces()]);
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
        const sourceUrl=placeUrl(place);
        const key=`${sourceName}:${sourceId}`;
        const row=element('div','w2e-vote-item');
        const info=element('div','w2e-vote-info');
        info.append(element('strong','',placeName(place)),element('div','w2e-vote-meta',address||'Chưa ghi địa chỉ.'));
        const source=element('a','small',place.managed_record?'Xem địa điểm What2Eat ↗':'Nguồn OpenStreetMap ↗');
        source.href=sourceUrl;source.target='_blank';source.rel='noopener noreferrer';info.appendChild(source);
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
    const nav=document.querySelector('.w2e-nav-auth');if(nav){nav.replaceChildren();const dashboard=element('a','btn-login','Bảng điều khiển');dashboard.href=location.pathname.includes('/pages/')?'./dashboard.php':'./pages/dashboard.php';nav.appendChild(dashboard);if(user.role==='admin'){const admin=element('a','btn-login','Quản trị');admin.href=location.pathname.includes('/pages/')?'../admin/index.php':'./admin/index.php';nav.appendChild(admin);}nav.appendChild(element('span','small fw-semibold',user.name));const logout=element('a','btn-signup','Đăng xuất');logout.href='#logout';nav.appendChild(logout);}
  }

  async function loadProfileData(){
    const response=await api('/profile');const user=response.user;state.user=user;fillIdentity(user);const phone=document.getElementById('phone');if(phone)phone.value=user.phone||'';
    const preferences=Array.isArray(user.preferences)?user.preferences:[];document.querySelectorAll('#prefForm input[type="checkbox"],#prefForm input[type="radio"]').forEach((input)=>{input.checked=preferences.includes(input.value);input.closest('label')?.classList.toggle(input.type==='radio'?'selected':'checked',input.checked);});const distance=preferences.find(value=>/^distance:(?:0\.5|[1-9](?:\.5)?|10)$/.test(value));const slider=document.getElementById('distanceSlider');if(slider&&distance){slider.value=distance.split(':')[1];window.updateSlider?.(slider);}
    ['dob','gender','address'].forEach((id)=>{const field=document.getElementById(id);if(field)field.closest('.col-12')?.setAttribute('hidden','');});
    const created=document.getElementById('accountCreatedAt');if(created)created.textContent=localDate(user.created_at);const status=document.getElementById('accountStatus');if(status)status.textContent=({active:'Đang hoạt động',pending:'Chưa xác thực',suspended:'Đã tạm khóa'})[user.status]||'Không rõ';const verified=document.getElementById('accountEmailVerified');if(verified){verified.textContent=user.email_verified_at?'Đã xác thực':'Chưa xác thực';verified.style.color=user.email_verified_at?'var(--w2e-success)':'var(--w2e-warning)';}const lastLogin=document.getElementById('accountLastLogin');if(lastLogin)lastLogin.textContent=user.last_login_at?new Date(`${String(user.last_login_at).replace(' ','T')}Z`).toLocaleString('vi-VN'):'Chưa ghi nhận';const deleteEmail=document.getElementById('deleteAccountEmail');if(deleteEmail)deleteEmail.textContent=user.email;const deleteZone=document.querySelector('.w2e-danger-zone');if(deleteZone&&user.role==='admin')deleteZone.hidden=true;
    const [d,noteCount]=await Promise.all([api('/dashboard'),api('/food-notes?page=1&limit=1')]);const stats=document.querySelectorAll('.w2e-profile-stat-num');if(stats.length>=3){stats[0].textContent=String(d.stats?.total_notes||0);stats[1].textContent=String(d.stats?.total_favorites||0);stats[2].textContent=String(d.stats?.food_plans||0);}const deleteNotes=document.getElementById('deleteNoteCount'),deleteFavorites=document.getElementById('deleteFavoriteCount');if(deleteNotes)deleteNotes.textContent=String(noteCount.total||0);if(deleteFavorites)deleteFavorites.textContent=String(d.stats?.total_favorites||0);document.body.classList.add('w2e-profile-stats-ready','w2e-live-ready');
  }

  async function renderDashboard() {
    try{
      const d=await api('/dashboard');document.body.classList.add('w2e-live-ready');const s=d.stats||{};const stats=document.querySelectorAll('.w2e-stat-value');if(stats.length>=4){stats[0].textContent=String(s.total_notes??0);stats[1].textContent=money(s.total_spent??0);stats[2].textContent=s.average_rating==null?'—':Number(s.average_rating).toFixed(1);stats[3].textContent=d.top_restaurants?.[0]?.name||'—';}
      const wrap=document.getElementById('dashboardRecentNotes');if(wrap){wrap.replaceChildren();(d.recent_notes||[]).forEach((n)=>{const row=element('article','w2e-note-item',`${n.food_name} · ${n.rating==null?'Chưa đánh giá':n.rating+'/5'} · ${localDate(n.eaten_at)}`);if(n.price!=null)row.appendChild(element('span','w2e-note-meta',money(n.price)));wrap.appendChild(row);});if(!d.recent_notes?.length)wrap.appendChild(element('p','text-secondary','Chưa có Food Note để thống kê.'));}
      const favSection=[...document.querySelectorAll('section')].find((s)=>s.getAttribute('aria-label')==='Quán ăn yêu thích');if(favSection){const cards=favSection.querySelector('.row');if(cards){cards.replaceChildren();const favorites=await loadAllFavorites();const badge=document.getElementById('favoriteCountBadge');if(badge)badge.textContent=`${favorites.length} địa điểm`;favorites.forEach((f)=>{const col=element('div','col-12 col-sm-6 col-lg-3');const card=element('article','w2e-fav-card');card.append(element('div','w2e-fav-card-name',f.name),element('p','w2e-fav-card-rating',f.address||'Địa chỉ chưa được ghi.'));const a=element('a','btn btn-outline-secondary','Xem nguồn');a.href=f.source_url||'#';a.target='_blank';a.rel='noopener noreferrer';card.appendChild(a);col.appendChild(card);cards.appendChild(col);});if(!favorites.length)cards.appendChild(element('p','text-secondary','Bạn chưa lưu địa điểm nào.'));document.body.classList.add('w2e-favorites-ready');}}
      const charts=[['spendingLineChart',(d.monthly||[]).map(x=>x.month),(d.monthly||[]).map(x=>Number(x.spent)),(d.monthly||[]).map(x=>Number(x.notes))],['foodCatPieChart',(d.categories||[]).map(x=>x.category),(d.categories||[]).map(x=>Number(x.total))],['topRestoBarChart',(d.top_restaurants||[]).map(x=>x.name),(d.top_restaurants||[]).map(x=>Number(x.visits))]];
      charts.forEach(([id,labels,data,second])=>{const canvas=document.getElementById(id);const chart=canvas&&window.Chart?.getChart(canvas);if(chart){chart.data.labels=labels;if(id==='spendingLineChart'&&chart.data.datasets.length>1){chart.data.datasets[0].data=data;chart.data.datasets[1].data=second;}else chart.data.datasets.forEach(ds=>{ds.data=data;});chart.update();}});
      const pieLegend=document.getElementById('pieLegend');if(pieLegend){const colors=['#D4A017','#4A2C1A','#2D9B6F','#5B8DEF','#C47E5A','#8E6F55','#607D8B','#9C7C38'];pieLegend.replaceChildren();(d.categories||[]).forEach((category,index)=>{const item=element('span','d-inline-flex align-items-center gap-1 small');const swatch=element('span');swatch.style.cssText=`display:inline-block;width:10px;height:10px;border-radius:3px;background:${colors[index%colors.length]}`;item.append(swatch,document.createTextNode(`${category.category} (${category.total})`));pieLegend.appendChild(item);});if(!d.categories?.length)pieLegend.appendChild(element('span','text-secondary small','Chưa có Food Note để phân loại.'));}
    }catch(error){toast(error.message,'error');}
  }

  function renderAdminPendingNotes(notes){const wrap=document.getElementById('pendingNoteList');if(!wrap)return;wrap.replaceChildren();(notes||[]).forEach(note=>{const row=element('div','pending-note-item');const details=element('div','flex-grow-1');details.append(element('div','fw-600 small',note.food_name),element('div','text-secondary',`${note.author_name} · ${localDate(note.created_at)}`));const actions=element('div','d-flex gap-1');[['published','Duyệt','btn-success'],['rejected','Từ chối','btn-outline-secondary']].forEach(([status,label,style])=>{const button=element('button',`btn btn-sm ${style} py-0 px-2`,label);button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{await api(`/admin/food-notes/${note.id}`,{method:'PATCH',body:JSON.stringify({status})});toast('Đã cập nhật trạng thái Food Note.','success');await adminLoad();}catch(error){toast(error.message,'error');button.disabled=false;}});actions.appendChild(button);});row.append(details,actions);wrap.appendChild(row);});if(!notes?.length)wrap.appendChild(element('p','text-secondary small mb-0','Không có Food Note chờ duyệt.'));}

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
      const [restaurants,categories]=await Promise.all([api('/admin/restaurants?status=all'),api('/admin/categories')]);
      state.adminRestaurants=restaurants.data||[];state.adminCategories=categories.data||[];
      fillCategoryOptions(document.getElementById('restaurantCategory'),state.adminCategories,true);fillCategoryOptions(document.getElementById('catFilter'),state.adminCategories,false);
      document.body.classList.add('w2e-live-ready');renderAdminRestaurants();
      const notice=document.getElementById('restaurantLoadNotice');if(notice)notice.hidden=true;
    }else if(path.endsWith('/admin/users.php')){
      const body=document.getElementById('userTableBody');if(!body)return;const query=new URLSearchParams({page:String(state.userPage),per_page:'50'});[['q','userSearch'],['role','roleFilter'],['status','statusFilter']].forEach(([key,id])=>{const value=document.getElementById(id)?.value.trim();if(value)query.set(key,value);});const d=await api(`/admin/users?${query}`);document.body.classList.add('w2e-live-ready');state.userPage=d.pagination?.page||1;state.userPages=d.pagination?.pages||1;state.userTotal=d.pagination?.total||0;const counts=d.counts||{};[['usersTotalCount',counts.total],['usersActiveCount',counts.active],['usersSuspendedCount',counts.suspended],['usersAdminCount',counts.admins]].forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=new Intl.NumberFormat('vi-VN').format(value||0);});body.replaceChildren();(d.data||[]).forEach((u,i)=>{const tr=document.createElement('tr');tr.appendChild(element('td','',String((state.userPage-1)*50+i+1)));const name=element('td','',u.name);name.title=u.email;tr.appendChild(name);tr.appendChild(element('td','text-secondary',u.email));tr.appendChild(element('td','',u.role==='admin'?'Admin':'User'));tr.appendChild(element('td','',String(u.notes_count||0)));const statusCell=element('td');statusCell.appendChild(element('span',`w2e-badge ${u.status==='active'?'badge-open':'badge-closed'}`,u.status==='active'?'Hoạt động':'Bị khóa'));tr.appendChild(statusCell);tr.appendChild(element('td','text-secondary small',localDate(u.created_at)));const td=element('td');if(u.role==='user'){const b=element('button',`btn btn-sm ${u.status==='suspended'?'btn-outline-success':'btn-outline-danger'}`,u.status==='suspended'?'Mở khóa':'Khóa');b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await api(`/admin/users/${u.id}`,{method:'PATCH',body:JSON.stringify({status:u.status==='suspended'?'active':'suspended'})});await adminLoad();}catch(error){toast(error.message,'error');b.disabled=false;}});td.appendChild(b);}else td.appendChild(element('span','text-secondary small','Quản trị viên'));tr.appendChild(td);body.appendChild(tr);});if(!d.data?.length)body.appendChild(emptyRow(8,'Không có tài khoản khớp bộ lọc.'));const start=(state.userTotal===0)?0:(state.userPage-1)*50+1;const end=Math.min(state.userPage*50,state.userTotal);const label=document.getElementById('userRecordCount');if(label)label.textContent=`Hiển thị ${start}–${end} / ${new Intl.NumberFormat('vi-VN').format(state.userTotal)} tài khoản`;const pageLabel=document.getElementById('userPageLabel');if(pageLabel)pageLabel.textContent=`${state.userPage} / ${state.userPages}`;const previous=document.getElementById('userPrevPage'),next=document.getElementById('userNextPage');if(previous)previous.disabled=state.userPage<=1;if(next)next.disabled=state.userPage>=state.userPages;
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
    };
    [['restaurantTotalCount', counts.total], ['restaurantPublishedCount', counts.published],
      ['restaurantPendingCount', counts.pending], ['restaurantHiddenCount', counts.hidden]].forEach(([id, value]) => {
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

  function setupRestaurantProposal(){
    const grid=document.getElementById('restaurantGrid');if(!grid||document.getElementById('w2eRestaurantProposalModal'))return;
    const trigger=element('button','btn btn-outline-primary my-3','Đóng góp địa điểm');trigger.type='button';trigger.addEventListener('click',()=>openModal('w2eRestaurantProposalModal'));grid.before(trigger);
    const modal=element('div','modal fade');modal.id='w2eRestaurantProposalModal';modal.tabIndex=-1;modal.setAttribute('aria-labelledby','w2eRestaurantProposalTitle');
    const dialog=element('div','modal-dialog modal-lg');const content=element('div','modal-content');const header=element('div','modal-header');const heading=element('h2','modal-title fs-5','Đóng góp địa điểm');heading.id='w2eRestaurantProposalTitle';header.appendChild(heading);const close=element('button','btn-close');close.type='button';close.dataset.bsDismiss='modal';close.setAttribute('aria-label','Đóng');header.appendChild(close);content.appendChild(header);
    const body=element('div','modal-body');body.appendChild(element('p','text-secondary','Chỉ gửi thông tin bạn biết hoặc đã đối chiếu. Quản trị viên sẽ kiểm tra trước khi địa điểm xuất hiện công khai.'));
    const form=element('form','');form.id='w2eRestaurantProposalForm';const field=(label,id,type='text',required=false)=>{const wrap=element('div','mb-3');const caption=element('label','form-label',label);caption.htmlFor=id;const input=element(type==='textarea'?'textarea':'input','form-control');input.id=id;input.name=id;if(type!=='textarea')input.type=type==='url'?'text':type;if(type==='url')input.inputMode='url';input.maxLength=500;if(required)input.required=true;wrap.append(caption,input);return wrap;};
    form.append(field('Tên địa điểm *','proposalName','text',true),field('Địa chỉ *','proposalAddress','text',true),field('Loại hình / ẩm thực','proposalCuisine'),field('Điện thoại','proposalPhone','tel'),field('Website chính thức','proposalWebsite','url'),field('Nguồn để đối chiếu (nếu có)','proposalSourceUrl','url'),field('Ghi chú / thông tin đã xác nhận','proposalDescription','textarea'));
    const coords=element('div','row g-2 mb-3');[['Vĩ độ','proposalLatitude',-90,90],['Kinh độ','proposalLongitude',-180,180]].forEach(([label,id,min,max])=>{const col=element('div','col-md-6');const input=element('input','form-control');input.type='number';input.step='0.0000001';input.min=String(min);input.max=String(max);input.id=id;input.placeholder=label;input.setAttribute('aria-label',label);col.appendChild(input);coords.appendChild(col);});form.appendChild(coords);
    const submit=element('button','btn btn-primary','Gửi để quản trị viên kiểm tra');submit.type='submit';form.appendChild(submit);body.appendChild(form);content.appendChild(body);dialog.appendChild(content);modal.appendChild(dialog);document.body.appendChild(modal);
    form.addEventListener('submit',async(event)=>{event.preventDefault();if(!state.user){const next=encodeURIComponent(location.pathname+location.search);location.href=`./login.php?next=${next}`;return;}const latitude=document.getElementById('proposalLatitude').value||null;const longitude=document.getElementById('proposalLongitude').value||null;if((latitude===null)!==(longitude===null)){toast('Hãy điền cả hai tọa độ hoặc để trống cả hai.','warning');return;}submit.disabled=true;try{const result=await api('/restaurants/proposals',{method:'POST',body:JSON.stringify({name:document.getElementById('proposalName').value.trim(),address:document.getElementById('proposalAddress').value.trim(),cuisine:document.getElementById('proposalCuisine').value.trim()||null,phone:document.getElementById('proposalPhone').value.trim()||null,website:document.getElementById('proposalWebsite').value.trim()||null,source_url:document.getElementById('proposalSourceUrl').value.trim()||null,description:document.getElementById('proposalDescription').value.trim()||null,latitude,longitude})});form.reset();window.bootstrap?.Modal.getInstance(modal)?.hide();toast(result.message||'Đề xuất đã được gửi để quản trị viên kiểm tra.','success');}catch(error){toast(error.message,'error');}finally{submit.disabled=false;}});
  }

  async function start() {
    const path=location.pathname.toLowerCase();
    try { const me=await api('/auth/me');state.authChecked=true;state.user=me.user;state.csrf=me.csrf_token||'';fillIdentity(state.user);if(state.user){try{const favorites=await loadAllFavorites();state.favoriteKeys=new Set(favorites.map(f=>`${f.source}:${f.source_id}`));}catch(_){}} }
    catch(error){ state.authChecked=true;if(!path.includes('/admin/')&&!path.endsWith('/login.php')&&!path.endsWith('/register.php'))toast(error.message,'error'); }
    if(new URLSearchParams(location.search).get('account')==='deleted'){toast('Tài khoản và dữ liệu liên quan đã được xóa.','success');history.replaceState({},'',location.pathname);}
    const protectedPage=/\/(?:food-notes|food-plans|dashboard|profile|create-food-note)\.php$/.test(path);
    if(protectedPage&&!state.user&&state.authChecked){const base=path.includes('/pages/')?'./login.php':'login.php';const next=location.pathname+location.search;window.location.replace(`${base}?next=${encodeURIComponent(next)}`);return;}
    if(path.includes('/admin/')){
      if(state.user?.role!=='admin'){document.body.replaceChildren(element('main','container py-5','Khu vực quản trị cần tài khoản admin. Đăng nhập bằng tài khoản quản trị đã được tạo từ lệnh CLI trên máy chủ.'));return;}
      setupAdminForms();setupAdminGeocoder();setupRestaurantAdminRetry();
      try{await adminLoad();}catch(error){if(path.endsWith('/admin/restaurants.php'))showRestaurantAdminError(error);else toast(error.message,'error');}
    }
    if(path.endsWith('/food-notes.php')){await loadNotes();document.getElementById('noteSearch')?.addEventListener('input',applyNoteFilters);document.getElementById('ratingFilter')?.addEventListener('change',applyNoteFilters);document.getElementById('timeFilter')?.addEventListener('change',applyNoteFilters);document.getElementById('loadMoreNotes')?.addEventListener('click',()=>loadNotes(false));}
    if(path.endsWith('/food-plans.php'))await loadPlans();
    if(path.endsWith('/food-note.php'))await loadSharedNote();
    if(path.endsWith('/dashboard.php'))await renderDashboard();
    if(path.endsWith('/discovery.php')){
      setupRestaurantProposal();
      const discoverySearch=document.getElementById('searchInput');discoverySearch?.addEventListener('input',filterDiscovery);discoverySearch?.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();filterDiscovery();}});document.getElementById('distanceFilter')?.addEventListener('change',filterDiscovery);
      filterDiscovery();
      ['priceFilter','ratingFilter'].forEach((id)=>{const x=document.getElementById(id);if(x){x.disabled=true;x.title='Nguồn OSM hiện không cung cấp dữ liệu này.';}});
    }
    if(path.endsWith('/restaurant.php'))await loadManagedRestaurantDetail();
    if(path.endsWith('/create-food-note.php'))setupNoteComposer();
    if(path.endsWith('/profile.php')){setupProfile();if(state.user)await loadProfileData().catch((error)=>toast(error.message,'error'));}
    if(document.querySelector('#randomResult')||document.querySelector('#homePlacesGrid'))loadNearby();
    const joinToken=new URLSearchParams(location.search).get('join');if(joinToken&&state.user&&path.endsWith('/food-plans.php')){try{await api('/food-plans/join',{method:'POST',body:JSON.stringify({token:joinToken})});history.replaceState({},'',location.pathname);toast('Bạn đã tham gia Food Plan.','success');await loadPlans();}catch(error){toast(error.message,'error');}}
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
        try{const result=await api('/auth/register',{method:'POST',body:JSON.stringify({name,email,password,preferences})});document.getElementById('registerFormWrap')?.setAttribute('hidden','');const success=document.getElementById('successScreen');if(success){success.hidden=false;success.style.display='block';const confirmed=document.getElementById('confirmedEmail');if(confirmed)confirmed.textContent=email;}toast(result.message,'success');}
        catch(error){toast(error.message,'error');if(button){button.disabled=false;button.textContent='Tạo tài khoản miễn phí';}}
      }else if(form.id==='resetPasswordForm'){
        event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();const password=document.getElementById('newPassword')?.value||'';const confirm=document.getElementById('confirmPassword')?.value||'';const token=new URLSearchParams(location.search).get('token')||'';if(password.length<8||password!==confirm){toast('Mật khẩu cần ít nhất 8 ký tự và hai ô phải trùng nhau.','warning');return;}try{const result=await api('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})});toast(result.message,'success');setTimeout(()=>location.replace('./login.php'),800);}catch(error){toast(error.message,'error');}
      }
    },true);
    const remembered=localStorage.getItem('w2e_remember_email');const login=document.getElementById('loginEmail');if(login&&remembered){login.value=remembered;const check=document.getElementById('rememberMe');if(check)check.checked=true;}
    document.addEventListener('click',async(event)=>{const button=event.target.closest('#sendForgotBtn');if(!button)return;event.preventDefault();event.stopImmediatePropagation();const emailInput=document.getElementById('forgotEmail'),email=emailInput?.value.trim()||'';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){emailInput?.classList.add('is-invalid');toast('Nhập địa chỉ email hợp lệ.','warning');return;}emailInput?.classList.remove('is-invalid');button.disabled=true;try{const result=await api('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})});toast(result.message,'success');window.bootstrap?.Modal.getInstance(document.getElementById('forgotModal'))?.hide();}catch(error){toast(error.message,'error');}finally{button.disabled=false;}},true);
    document.addEventListener('click',async(event)=>{const link=event.target.closest('a');if(!link||!(/đăng xuất/i.test(link.textContent)||link.getAttribute('href')==='#logout'))return;event.preventDefault();try{await api('/auth/logout',{method:'POST',body:'{}'});}catch(_){}localStorage.removeItem('w2e_remember_email');location.href=link.getAttribute('href')==='#logout'?(location.pathname.includes('/pages/')?'./login.php':'./pages/login.php'):link.href;},true);
  }

  function setupNoteComposer() {
    const dropdown=document.getElementById('restaurantDropdown');const search=document.getElementById('restaurantSearch');const status=document.getElementById('autosaveText');let selected=null;let savedRestaurant=null;let timer=null;
    if(dropdown)dropdown.replaceChildren();
    const dateField=document.getElementById('foodDate');if(dateField)dateField.value=todayLocal();
    window.searchRestaurant=async(query)=>{
      if(!dropdown)return;clearTimeout(timer);timer=setTimeout(async()=>{if(!query||query.trim().length<2){dropdown.replaceChildren();return;}try{const center=await chosenCenter();const data=await nearby(center,3000);const managed=await loadManagedPlaces();const matches=[...(data.elements||[]),...managed].filter((place)=>placeName(place).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))).slice(0,10);dropdown.replaceChildren();matches.forEach((place)=>{const item=element('button','w2e-restaurant-item');item.type='button';item.append(element('span','w2e-rest-name',placeName(place)),element('span','w2e-rest-addr',place.managed_record?place.restaurant.address:(addressOf(place.tags,place)||'Địa chỉ chưa có trong OSM')),element('span','small text-secondary',place.managed_record?'Địa điểm What2Eat đã lưu':'Nguồn OpenStreetMap'));item.addEventListener('click',()=>{selected=place;search.value=placeName(place);dropdown.classList.remove('show');window.markFoodNoteDirty?.();});dropdown.appendChild(item);});if(!matches.length)dropdown.appendChild(element('p','w2e-restaurant-addr','Không tìm thấy địa điểm có tên trong dữ liệu quanh vị trí của bạn.'));dropdown.classList.add('show');}catch(error){toast(error.message,'error');}},350);
    };
    window.showRestaurantDropdown=()=>{if(dropdown)dropdown.classList.add('show');};
    let editingNoteId=new URLSearchParams(location.search).get('edit');
    async function persistNote(isDraft=false) {
      const foodName=document.getElementById('foodName')?.value.trim()||'';if(!foodName){toast('Nhập tên món ăn trước khi lưu.','warning');return;}
      const selectedMedia=[...(document.getElementById('fileInput')?.files||[]),...(document.getElementById('videoInput')?.files||[])];const oversizedMedia=selectedMedia.find((file)=>file.size>50*1024*1024);if(oversizedMedia){toast(`Tệp “${oversizedMedia.name}” vượt quá giới hạn 50 MB.`, 'warning');return;}
      const tags=[...document.querySelectorAll('.w2e-selected-tag')].map((x)=>x.textContent.replace('✕','').replace(/^#/,'').trim()).filter(Boolean);
      const privacy=document.querySelector('input[name="privacy"]:checked')?.value||'private';
      const chosen=selected;const payload={food_name:foodName,eaten_at:document.getElementById('foodDate')?.value||todayLocal(),price:document.getElementById('foodPrice')?.value||null,rating:Number(document.getElementById('ratingValue')?.value||0)||null,review:document.getElementById('noteComment')?.value.trim()||null,privacy,tags,is_draft:isDraft};
      if(chosen?.managed_record){payload.restaurant_id=chosen.id;payload.restaurant_source=chosen.source;payload.restaurant_source_id=String(chosen.id);payload.restaurant_name=placeName(chosen);payload.restaurant_address=chosen.restaurant.address||null;}else if(chosen){payload.restaurant_source='osm';payload.restaurant_source_id=placeId(chosen);payload.restaurant_name=placeName(chosen);payload.restaurant_address=addressOf(chosen.tags,chosen)||null;}else if(savedRestaurant){payload.restaurant_id=savedRestaurant.restaurant_id;payload.restaurant_source=savedRestaurant.restaurant_source;payload.restaurant_source_id=savedRestaurant.restaurant_source_id;payload.restaurant_name=savedRestaurant.restaurant_name;payload.restaurant_address=savedRestaurant.restaurant_address;}
      const saveButtons=document.querySelectorAll('.w2e-submit-bar button');saveButtons.forEach((b)=>b.disabled=true);
      try{const result=editingNoteId?await api(`/food-notes/${editingNoteId}`,{method:'PUT',body:JSON.stringify(payload)}):await api('/food-notes',{method:'POST',body:JSON.stringify(payload)});const note=result.data;const files=[...(document.getElementById('fileInput')?.files||[]),...(document.getElementById('videoInput')?.files||[])];for(const file of files){const form=new FormData();form.append('media',file);await api(`/food-notes/${note.id}/media`,{method:'POST',body:form});}if(result.share_url){const link=new URL(result.share_url,location.origin).href;let copied=false;try{await navigator.clipboard.writeText(link);copied=true;}catch(_){}if(status){const anchor=element('a','d-block mt-2','Mở Food Note được chia sẻ');anchor.href=link;anchor.target='_blank';anchor.rel='noopener noreferrer';status.replaceChildren(element('span','',copied?'Đã lưu và sao chép liên kết chia sẻ.':'Đã lưu. Bạn có thể mở liên kết chia sẻ bên dưới.'),anchor);}editingNoteId=note.id;history.replaceState({},'',`?edit=${note.id}`);toast('Đã lưu Food Note có liên kết chia sẻ.','success');saveButtons.forEach((b)=>b.disabled=false);}else{if(status)status.textContent=isDraft?'Đã lưu bản nháp.':(privacy==='public'?'Đã gửi, đang chờ admin duyệt.':'Đã lưu trên tài khoản của bạn.');toast(isDraft?'Đã lưu bản nháp.':(privacy==='public'?'Food Note đã gửi, chờ quản trị viên duyệt.':'Food Note đã lưu.'),'success');location.href='./food-notes.php';}}
      catch(error){toast(error.message,'error');saveButtons.forEach((b)=>b.disabled=false);}
    }
    window.publishNote=()=>persistNote(false);window.saveDraft=()=>persistNote(true);document.getElementById('publishNoteButton')?.addEventListener('click',()=>window.publishNote());document.getElementById('saveDraftButton')?.addEventListener('click',()=>window.saveDraft());document.querySelectorAll('.w2e-submit-bar button').forEach((button)=>button.disabled=false);
    if(editingNoteId){api(`/food-notes/${editingNoteId}`).then(({data})=>{document.getElementById('foodName').value=data.food_name||'';document.getElementById('foodPrice').value=data.price||'';document.getElementById('ratingValue').value=data.rating||0;document.getElementById('noteComment').value=data.review||'';if(dateField)dateField.value=data.eaten_at||todayLocal();if(data.restaurant_name){search.value=data.restaurant_name;savedRestaurant={restaurant_id:data.restaurant_id,restaurant_source:data.restaurant_source,restaurant_source_id:data.restaurant_source_id,restaurant_name:data.restaurant_name,restaurant_address:data.restaurant_address_snapshot};}const privacy=document.querySelector(`input[name="privacy"][value="${data.privacy}"]`);if(privacy){privacy.checked=true;privacy.dispatchEvent(new Event('change',{bubbles:true}));}if(data.tags?.length){data.tags.forEach((tag)=>window.addSuggestedTag?.('#'+tag));}if(status)status.textContent='Đang chỉnh sửa Food Note đã lưu.';}).catch((error)=>toast(error.message,'error'));}
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
    window.deleteAccount=async()=>{const button=document.getElementById('confirmDeleteBtn');if(button)button.disabled=true;try{await api('/profile',{method:'DELETE',body:JSON.stringify({password:document.getElementById('deletePassword')?.value||'',confirmation:document.getElementById('deleteConfirmInput')?.value||''})});localStorage.removeItem('w2e_remember_email');location.replace('./login.php?account=deleted');}catch(error){toast(error.message,'error');if(button)button.disabled=false;}};
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
    window.createPlan=async()=>{const name=document.getElementById('planName')?.value.trim()||'';if(!name){toast('Nhập tên Food Plan.','warning');return;}const date=document.getElementById('planDate')?.value;const time=document.getElementById('planTime')?.value;const eventAt=date?new Date(`${date}T${time||'00:00'}`).toISOString():null;try{const result=await api('/food-plans',{method:'POST',body:JSON.stringify({name,description:document.getElementById('planDesc')?.value||'',event_at:eventAt})});closeCreateModal();toast(`Đã tạo Food Plan: ${name}`,'success');await loadPlans();if(result.id){await showPlan(result.id);const panel=document.getElementById('w2ePlanLiveDetail');if(panel&&result.invite_url){const invite=element('div','alert alert-info mt-3');invite.appendChild(element('strong','d-block mb-2','Liên kết mời thành viên'));const row=element('div','d-flex gap-2');const input=element('input','form-control');input.readOnly=true;input.value=new URL(result.invite_url,location.origin).href;const copy=element('button','btn btn-outline-primary','Sao chép');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(input.value);toast('Đã sao chép liên kết mời.','success');}catch(_){input.select();document.execCommand('copy');toast('Đã chọn liên kết; hãy sao chép nếu trình duyệt chặn clipboard.','info');}});row.append(input,copy);invite.appendChild(row);panel.prepend(invite);}}}catch(error){toast(error.message,'error');}};
    const chipInput=document.getElementById('emailChipInput');if(chipInput){chipInput.disabled=true;chipInput.placeholder='Mời người khác bằng liên kết chia sẻ sau khi tạo kế hoạch.';}
  }

  function setupRandomPicker() {
    const budget=document.getElementById('filterBudget');if(budget){budget.disabled=true;budget.title='OpenStreetMap không cung cấp dữ liệu giá nhất quán.';}
    window.randomFood=async()=>{if(!state.places.length)await loadNearby();const item=window.getRandomNearbyPlace?.({type:document.getElementById('filterType')?.value||'',distance:document.getElementById('filterDist')?.value||''});if(!item){toast('Không có địa điểm nào khớp bộ lọc trong dữ liệu hiện có. Thử bỏ bớt bộ lọc hoặc tải lại.','warning');return;}const result=document.getElementById('randomResult');if(result)result.style.display='block';const img=document.getElementById('rImg');if(img){img.removeAttribute('src');img.alt='Nguồn chưa cung cấp ảnh';img.hidden=true;}const name=document.getElementById('rName');if(name)name.textContent=item.name;const addr=document.getElementById('rAddr');if(addr)addr.textContent=item.address;const rate=document.getElementById('rRating');if(rate){rate.textContent=item.source;rate.hidden=false;}const price=document.getElementById('rPrice');if(price){price.textContent='Giá và đánh giá chỉ hiển thị khi nguồn cung cấp dữ liệu.';price.hidden=false;}const open=result?.querySelector('.open-badge');if(open)open.hidden=true;const link=result?.querySelector('#rLink');if(link){link.href=item.mapUrl||item.url;link.textContent=item.mapUrl?'Xem trên bản đồ What2Eat':'Xem địa điểm';link.removeAttribute('target');link.removeAttribute('rel');}let sourceLink=result?.querySelector('#rSourceLink');if(!sourceLink&&link){sourceLink=element('a','btn-outline-w2e','Đối chiếu nguồn ↗');sourceLink.id='rSourceLink';link.after(sourceLink);}if(sourceLink){sourceLink.href=item.sourceUrl||item.url;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.hidden=!item.sourceUrl;}result?.scrollIntoView({behavior:'smooth',block:'center'});};
    window.rollLucky=async()=>{if(!state.places.length)await loadNearby();const place=window.getRandomNearbyPlace?.();const modal=document.getElementById('luckyModal');if(!place||!modal){toast('Chưa tải được địa điểm có dữ liệu. Hãy thử lại sau.','warning');return;}const body=modal.querySelector('.modal-body');if(body){const title=element('h3','h5',place.name),address=element('p','text-secondary',place.address),source=element('p','small text-secondary',place.source),link=element('a','btn btn-primary','Xem trên bản đồ What2Eat');link.href=place.mapUrl||place.url;const sourceLink=element('a','btn btn-outline-secondary ms-2','Đối chiếu nguồn ↗');sourceLink.href=place.sourceUrl||place.url;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';body.replaceChildren(title,address,source,link,sourceLink);}window.bootstrap?.Modal.getOrCreateInstance(modal).show();};
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
