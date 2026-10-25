/* Live restaurant locations from OpenStreetMap, with sequential Overpass failover. */
(function () {
  'use strict';

  const DEFAULT_CENTER = [10.7769, 106.7009];
  const SEARCH_RADIUS_METERS = 2000;
  const REQUEST_TIMEOUT_MS = 12000;

  document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('map-container');
    if (!mapElement) return;
    const status = document.getElementById('mapStatus');
    const locateButton = document.getElementById('locateMapBtn');
    const refreshButton = document.getElementById('refreshMapBtn');
    if (!window.L) {
      status.textContent = 'Không tải được Leaflet từ CDN. Hãy kiểm tra kết nối rồi tải lại trang.';
      return;
    }

    const focusParams = new URLSearchParams(location.search);
    const focusLat = Number(focusParams.get('lat'));
    const focusLon = Number(focusParams.get('lon'));
    const hasFocus = focusParams.get('focus') === '1' && Number.isFinite(focusLat) && Number.isFinite(focusLon) && Math.abs(focusLat) <= 90 && Math.abs(focusLon) <= 180;
    const initialCenter = hasFocus ? [focusLat, focusLon] : DEFAULT_CENTER;
    const map = L.map(mapElement).setView(initialCenter, hasFocus ? 17 : 14);
    const markers = L.layerGroup().addTo(map);
    const managedMarkers = L.layerGroup().addTo(map);
    const osmMarkerById = new Map();
    const managedMarkerById = new Map();
    let currentOsmData = null;
    let managedRestaurants = [];
    let visiblePlaceIds = null;
    let osmErrorMessage = '';
    let osmIsLoading = true;
    const tileNotice = document.createElement('div');
    tileNotice.className = 'w2e-map-tile-notice';
    tileNotice.hidden = true;
    tileNotice.textContent = 'Không tải được ảnh nền bản đồ. Kiểm tra kết nối mạng hoặc VPN.';
    mapElement.appendChild(tileNotice);
    const legend = document.createElement('div');
    legend.className = 'w2e-map-legend';
    const osmLegend = document.createElement('span');
    osmLegend.className = 'w2e-map-legend__item';
    const osmSwatch = document.createElement('i'); osmSwatch.className = 'w2e-map-legend__swatch w2e-map-legend__swatch--osm';
    osmLegend.append(osmSwatch, document.createTextNode('OpenStreetMap'));
    const managedLegend = document.createElement('span');
    managedLegend.className = 'w2e-map-legend__item';
    const managedSwatch = document.createElement('i'); managedSwatch.className = 'w2e-map-legend__swatch w2e-map-legend__swatch--managed';
    managedLegend.append(managedSwatch, document.createTextNode('What2Eat đã duyệt'));
    legend.append(osmLegend, managedLegend);
    mapElement.appendChild(legend);
    let searchCenter = initialCenter;
    let userMarker;
    let activeController;

    const tileLayer = L.tileLayer('/tiles/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Tiles <a href="https://www.hotosm.org/">HOT</a>',
    }).addTo(map);
    if (hasFocus) {
      const focusPopup = document.createElement('div');
      focusPopup.textContent = focusParams.get('name') || 'Địa điểm được chọn ngẫu nhiên';
      L.circleMarker(initialCenter, { radius: 10, color: '#fff', weight: 3, fillColor: '#c58b00', fillOpacity: 1 }).addTo(map).bindPopup(focusPopup).openPopup();
    }
    let tileErrors = 0;
    tileLayer.on('tileerror', () => {
      tileErrors += 1;
      if (tileErrors >= 3) tileNotice.hidden = false;
    });
    tileLayer.on('load', () => {
      tileErrors = 0;
      tileNotice.hidden = true;
    });

    function setStatus(message, busy) {
      status.textContent = message;
      mapElement.setAttribute('aria-busy', String(Boolean(busy)));
    }

    function normalizedName(value) {
      return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function distanceMeters(first, second) {
      if (!first || !second || ![...first, ...second].every(Number.isFinite)) return Infinity;
      const radians = value => value * Math.PI / 180;
      const dLat = radians(second[0] - first[0]), dLon = radians(second[1] - first[1]);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(first[0])) * Math.cos(radians(second[0])) * Math.sin(dLon / 2) ** 2;
      return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function managedOsmKey(restaurant) {
      const reference = `${restaurant?.source_id || ''} ${restaurant?.source_url || ''}`;
      const match = reference.match(/\b(node|way|relation)[/:](\d+)\b/i);
      return match ? `${match[1].toLowerCase()}:${match[2]}` : '';
    }

    function isManagedOsmDuplicate(element, restaurant) {
      const managedKey = managedOsmKey(restaurant);
      if (managedKey && managedKey === `${String(element.type).toLowerCase()}:${element.id}`) return true;
      const osmName = normalizedName(element.tags?.name || element.tags?.['name:vi']);
      const managedName = normalizedName(restaurant?.name);
      if (osmName.length < 4 || osmName !== managedName) return false;
      return distanceMeters(coordinatesOf(element), [Number(restaurant.latitude), Number(restaurant.longitude)]) <= 30;
    }

    function isClosedOsmPlace(tags) {
      return tags.disused === 'yes' || tags.abandoned === 'yes' || tags.demolished === 'yes'
        || tags['disused:amenity'] || tags['abandoned:amenity'] || tags['demolished:amenity']
        || tags['disused:shop'] || tags['abandoned:shop'] || tags['demolished:shop'];
    }

    function statusForData(osmCount, managedCount) {
      if (osmErrorMessage) {
        return `${osmErrorMessage}${managedCount ? ` Đang hiển thị thêm ${managedCount} quán What2Eat đã được duyệt.` : ''}`;
      }
      if (!currentOsmData) {
        return managedCount
          ? `Đang tải địa điểm OSM. Hiện đã có ${managedCount} quán What2Eat đã được duyệt trên bản đồ.`
          : 'Đang truy vấn OpenStreetMap…';
      }
      const total = osmCount + managedCount;
      const updatedAt = currentOsmData.osm3s?.timestamp_osm_base
        ? ` Dữ liệu OSM cập nhật đến ${new Date(currentOsmData.osm3s.timestamp_osm_base).toLocaleString('vi-VN')}.` : '';
      const cacheAt = currentOsmData.cache_updated_at
        ? new Date(`${String(currentOsmData.cache_updated_at).replace(' ', 'T')}Z`).toLocaleString('vi-VN') : '';
      const snapshotNotice = currentOsmData.snapshot
        ? ` Overpass không phản hồi; đang dùng snapshot OSM ngày ${currentOsmData.snapshot_date || 'không rõ'}. Trạng thái quán chưa được xác minh ngoài thực tế.`
        : currentOsmData.stale
          ? ` Máy chủ OSM không phản hồi; đang dùng dữ liệu lưu lúc ${cacheAt}.`
          : currentOsmData.cached ? ` Kết quả OSM lưu tại máy chủ lúc ${cacheAt}. Bấm “Tải lại” để làm mới.` : '';
      const sources = [osmCount ? `${osmCount} địa điểm OSM` : '', managedCount ? `${managedCount} quán What2Eat đã duyệt` : ''].filter(Boolean).join(' và ');
      return `${total ? `Hiển thị ${total} địa điểm (${sources}) trong khu vực tìm kiếm.` : 'Không tìm thấy địa điểm ăn uống trong khu vực tìm kiếm.'}${updatedAt}${snapshotNotice}`;
    }

    function renderMarkers() {
      markers.clearLayers();
      managedMarkers.clearLayers();
      osmMarkerById.clear();
      managedMarkerById.clear();
      let osmCount = 0;
      let managedCount = 0;
      (currentOsmData?.elements || []).forEach((element) => {
        const tags = element.tags || {};
        if (isClosedOsmPlace(tags)) return;
        const coords = coordinatesOf(element);
        if (!coords || managedRestaurants.some(restaurant => isManagedOsmDuplicate(element, restaurant))) return;
        const id = `${element.type}:${element.id}`;
        if (visiblePlaceIds && !visiblePlaceIds.has(id)) return;
        const marker = L.marker(coords).bindPopup(popupFor(element)).addTo(markers);
        osmMarkerById.set(id, marker);
        osmCount += 1;
      });
      managedRestaurants.forEach((restaurant) => {
        const lat = Number(restaurant.latitude), lon = Number(restaurant.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        const id = `managed:${restaurant.id}`;
        if (visiblePlaceIds && !visiblePlaceIds.has(id)) return;
        const popup = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = restaurant.name || 'Địa điểm What2Eat';
        const address = document.createElement('div'); address.textContent = restaurant.address || 'Chưa có địa chỉ';
        const details = [restaurant.category_name, restaurant.cuisine].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' · ');
        popup.append(name, address);
        if(restaurant.sponsored){const sponsored=document.createElement('div');sponsored.textContent='Tài trợ';sponsored.className='w2e-sponsored-label';popup.appendChild(sponsored);}
        if (details) { const detail = document.createElement('small'); detail.textContent = details; popup.appendChild(detail); }
        if (Array.isArray(restaurant.public_food_names) && restaurant.public_food_names.length) {
          const dishes = document.createElement('small');
          dishes.textContent = `Món thành viên ghi trong Food Note công khai: ${restaurant.public_food_names.join(', ')}`;
          popup.appendChild(dishes);
        }
        const link = document.createElement('a'); link.href = `./restaurant.php?id=${encodeURIComponent(restaurant.id)}`; link.textContent = 'Xem thông tin đã duyệt';
        popup.append(document.createElement('br'), link);
        const marker = L.circleMarker([lat, lon], { radius: 9, color: '#fff', weight: 3, fillColor: '#c58b00', fillOpacity: 1 }).bindPopup(popup).addTo(managedMarkers);
        managedMarkerById.set(id, marker);
        managedCount += 1;
      });
      setStatus(statusForData(osmCount, managedCount), osmIsLoading);
    }

    function coordinatesOf(element) {
      if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) return [element.lat, element.lon];
      if (element.center && Number.isFinite(element.center.lat) && Number.isFinite(element.center.lon)) {
        return [element.center.lat, element.center.lon];
      }
      return null;
    }

    function popupFor(element) {
      const tags = element.tags || {};
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = tags.name || 'Địa điểm ăn uống chưa có tên trong OpenStreetMap';
      popup.appendChild(name);

      const addressParts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean);
      const addressText = element.address || addressParts.join(', ');
      if (addressText) {
        const address = document.createElement('div');
        address.textContent = addressText;
        popup.appendChild(address);
      }
      const type = tags.cuisine || tags.amenity || element.category;
      if (type) {
        const detail = document.createElement('small');
        detail.textContent = `Loại: ${type}`;
        popup.appendChild(detail);
      }
      if (Array.isArray(element.public_food_names) && element.public_food_names.length) {
        const dishes = document.createElement('small');
        dishes.textContent = `Món thành viên ghi trong Food Note công khai: ${element.public_food_names.join(', ')}`;
        popup.appendChild(dishes);
      }
      const link = document.createElement('a');
      const coords = coordinatesOf(element);
      const query = new URLSearchParams({osm:`${element.type}:${element.id}`,lat:String(coords[0]),lon:String(coords[1])});
      link.href = `./restaurant.php?${query}`;
      link.textContent = 'Xem chi tiết trên What2Eat';
      popup.append(document.createElement('br'), link);
      return popup;
    }

    function drawPlaces(data) {
      currentOsmData = data;
      osmErrorMessage = '';
      osmIsLoading = false;
      renderMarkers();
      window.dispatchEvent(new CustomEvent('w2e:osm-data', { detail: { data, center: { lat: searchCenter[0], lon: searchCenter[1] } } }));
    }

    window.addEventListener('w2e:managed-data', (event) => {
      managedRestaurants = (event.detail?.restaurants || []).filter(restaurant => restaurant.latitude !== null && restaurant.latitude !== '' && restaurant.longitude !== null && restaurant.longitude !== '' && Number.isFinite(Number(restaurant.latitude)) && Number.isFinite(Number(restaurant.longitude)));
      if (event.detail?.center && Number.isFinite(event.detail.center.lat) && Number.isFinite(event.detail.center.lon)) {
        searchCenter = [event.detail.center.lat, event.detail.center.lon];
      }
      renderMarkers();
    });

    window.addEventListener('w2e:discovery-filter', (event) => {
      visiblePlaceIds = new Set(event.detail?.placeIds || []);
      renderMarkers();
    });

    async function loadPlaces(center = [map.getCenter().lat(), map.getCenter().lng()], forceRefresh = false) {
      searchCenter = center;
      if (activeController) activeController.abort();
      activeController = new AbortController();
      const controller = activeController;
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      osmIsLoading = true;
      setStatus(forceRefresh ? 'Đang yêu cầu dữ liệu OSM mới…' : 'Đang truy vấn OpenStreetMap…', true);
      try {
        const params = new URLSearchParams({ lat: center[0], lon: center[1], radius: SEARCH_RADIUS_METERS });
        if (forceRefresh) params.set('refresh', '1');
        const response = await fetch(`/api/restaurants?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Máy chủ cục bộ trả về HTTP ${response.status}`);
        if (!Array.isArray(data.elements)) throw new Error('Phản hồi dữ liệu OSM không hợp lệ.');
        drawPlaces(data);
      } catch (error) {
        if (controller.signal.aborted && activeController !== controller) return;
        console.error('Không lấy được địa điểm OSM:', error);
        const message = timedOut
          ? `Máy chủ dữ liệu chưa phản hồi sau ${REQUEST_TIMEOUT_MS / 1000} giây.`
          : (error.message === 'Failed to fetch' || error instanceof TypeError
            ? 'Không gọi được máy chủ dự án. Hãy chạy node server.js rồi mở http://127.0.0.1:4173/pages/discovery.php.'
            : error.message);
        osmIsLoading = false;
        osmErrorMessage = `Không tải được dữ liệu OpenStreetMap: ${message}`;
        renderMarkers();
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    function locateUser() {
      if (window.isSecureContext === false) {
        const secureUrl = new URL(location.href);
        const localHost = secureUrl.hostname.toLowerCase();
        if (localHost.endsWith('.local')) {
          secureUrl.hostname = `${localHost.slice(0, -'.local'.length)}.localhost`;
          secureUrl.searchParams.set('w2e_locate', '1');
          setStatus('Đang chuyển sang địa chỉ hỗ trợ GPS…', true);
          location.assign(secureUrl.href);
        } else {
          setStatus('Trình duyệt chặn định vị trên HTTP. Hãy mở trang qua HTTPS hoặc localhost để dùng GPS; bạn vẫn có thể di chuyển bản đồ rồi tải lại.', false);
        }
        return;
      }
      if (!navigator.geolocation) {
        setStatus('Trình duyệt không cấp quyền định vị cho trang này. Hãy dùng HTTPS/localhost, kiểm tra quyền vị trí của trang rồi thử lại.', false);
        return;
      }
      setStatus('Đang xin vị trí từ trình duyệt. Nếu có hộp thoại quyền vị trí, hãy chọn “Cho phép”…', true);
      navigator.geolocation.getCurrentPosition((position) => {
        searchCenter = [position.coords.latitude, position.coords.longitude];
        map.setView(searchCenter, 15);
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker(searchCenter, {
          radius: 8, color: '#fff', weight: 3, fillColor: '#c58b00', fillOpacity: 1,
        }).addTo(map).bindPopup('Vị trí của bạn');
        loadPlaces(searchCenter, true);
      }, (error) => {
        const fallbackMessage = error?.code === 1
          ? 'Quyền Vị trí đang bị từ chối cho trang này. Hãy cho phép Vị trí trong cài đặt của trình duyệt rồi thử lại.'
          : (error?.code === 2 || error?.code === 3
            ? 'Trình duyệt chưa nhận được tọa độ. Hãy bật Dịch vụ vị trí của Windows; hoặc kéo bản đồ đến khu vực cần tìm rồi bấm “Tải lại”.'
            : 'Không lấy được vị trí. Hãy kiểm tra quyền định vị hoặc di chuyển bản đồ đến nơi cần tìm.');
        if (navigator.permissions?.query) {
          navigator.permissions.query({ name: 'geolocation' }).then(({ state }) => {
            const message = state === 'prompt'
              ? 'Trình duyệt chưa cấp quyền Vị trí cho what2eat.localhost. Hãy chọn “Cho phép” trong hộp thoại quyền vị trí rồi thử lại.'
              : (state === 'denied'
                ? 'Quyền Vị trí đang bị chặn cho what2eat.localhost. Hãy bật quyền Vị trí trong cài đặt trang của trình duyệt rồi thử lại.'
                : fallbackMessage);
            setStatus(message, false);
          }).catch(() => setStatus(fallbackMessage, false));
        } else {
          setStatus(fallbackMessage, false);
        }
      }, { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
    }

    locateButton.addEventListener('click', locateUser);
    refreshButton.addEventListener('click', () => loadPlaces(undefined, true));

    setStatus('Đang tải địa điểm OpenStreetMap quanh khu vực bản đồ…', true);
    window.dispatchEvent(new CustomEvent('w2e:map-ready', {
      detail: { center: { lat: initialCenter[0], lon: initialCenter[1] }, hasOsmData: false },
    }));
    loadPlaces(initialCenter);
    if (focusParams.get('w2e_locate') === '1' && window.isSecureContext !== false) {
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('w2e_locate');
      history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
      window.setTimeout(locateUser, 0);
    }
  });
})();
