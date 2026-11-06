/* Live restaurant locations from OpenStreetMap, with sequential Overpass failover. */
(function () {
  'use strict';

  const DEFAULT_CENTER = [10.7769, 106.7009];
  const SEARCH_RADIUS_METERS = 2000;
  const REQUEST_TIMEOUT_MS = 12000;
  const PUBLIC_SNAPSHOT_URL = '/assets/data/hcm-food-places.json';

  document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('map-container');
    if (!mapElement) return;
    // Local .local hosts are not trusted origins for browser geolocation.
    if (!window.isSecureContext && location.hostname.toLowerCase().endsWith('.local')) {
      const localUrl = new URL(location.href);
      localUrl.hostname = `${localUrl.hostname.slice(0, -'.local'.length)}.localhost`;
      location.replace(localUrl.href);
      return;
    }
    const status = document.getElementById('mapStatus');
    const locateButton = document.getElementById('locateMapBtn');
    const refreshButton = document.getElementById('refreshMapBtn');
    const pickButton = document.getElementById('pickMapLocationBtn');
    const locationStatus = document.getElementById('locationStatus');
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
    let accuracyCircle;
    let locating = false;
    let locationWatch = null;
    let locationTimer;
    let hasLocationFix = false;
    let lastScannedCenter = null;
    let lastScannedAt = 0;
    let lastScannedAccuracy = Infinity;
    let pickingLocation = false;
    let activeController;
    let publicSnapshotRequest;

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

    function statusForData(osmCount, managedCount, importedCount, verifiedImportCount) {
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
        ? currentOsmData.static_fallback
          ? ` Đang dùng dữ liệu địa điểm lưu trên website; OSM đến ${currentOsmData.snapshot_date || 'không rõ'}, dữ liệu bổ sung nhập ngày ${currentOsmData.imported_at || 'không rõ'} và chờ xác minh.`
          : ` Overpass không phản hồi; đang dùng snapshot OSM ngày ${currentOsmData.snapshot_date || 'không rõ'}. Trạng thái quán chưa được xác minh ngoài thực tế.`
        : currentOsmData.stale
          ? ` Máy chủ OSM không phản hồi; đang dùng dữ liệu lưu lúc ${cacheAt}.`
          : currentOsmData.cached ? ` Kết quả OSM lưu tại máy chủ lúc ${cacheAt}. Bấm “Tải lại” để làm mới.` : '';
      const sourceCount = Math.max(0, osmCount - importedCount);
      const sources = [sourceCount ? `${sourceCount} địa điểm OSM` : '', importedCount ? `${importedCount} địa điểm nhập bổ sung${verifiedImportCount ? `, ${verifiedImportCount} đã xác minh` : ', đang chờ xác minh'}` : '', managedCount ? `${managedCount} quán What2Eat đã duyệt` : ''].filter(Boolean).join(' và ');
      return `${total ? `Hiển thị ${total} địa điểm (${sources}) trong khu vực tìm kiếm.` : 'Không tìm thấy địa điểm ăn uống trong khu vực tìm kiếm.'}${updatedAt}${snapshotNotice}`;
    }

    function renderMarkers() {
      markers.clearLayers();
      managedMarkers.clearLayers();
      osmMarkerById.clear();
      managedMarkerById.clear();
      let osmCount = 0;
      let importedCount = 0;
      let verifiedImportCount = 0;
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
        if (element.import_id) {
          importedCount += 1;
          if (element.verification_status === 'verified_active') verifiedImportCount += 1;
        }
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
      setStatus(statusForData(osmCount, managedCount, importedCount, verifiedImportCount), osmIsLoading);
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
      const line = (label, value) => {
        if (!value) return;
        const row = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `${label}: `;
        row.append(title, document.createTextNode(String(value)));
        popup.appendChild(row);
      };
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
      line('Danh mục', element.category || tags['w2e:category'] || tags.amenity);
      line('Món / loại hình', tags.cuisine);
      line('Khoảng giá', tags.price_range);
      line('Giờ mở cửa', tags.opening_hours);
      line('Điện thoại', tags.phone || tags['contact:phone']);
      line('Nguồn dữ liệu', element.data_source || 'OpenStreetMap');
      line('Ngày cập nhật nguồn', element.source_updated_at);
      line('Trạng thái', element.verification_status === 'verified_active' ? 'Đã xác minh hoạt động' : element.verification_status === 'reported_closed' ? 'Đã báo đóng cửa' : element.import_id ? 'Chờ xác minh' : 'Chưa xác minh hoạt động');
      const websiteUrl = tags.website || tags['contact:website'];
      if (websiteUrl && /^https?:\/\//i.test(websiteUrl)) {
        const website = document.createElement('a');
        website.href = websiteUrl;
        website.target = '_blank';
        website.rel = 'noopener noreferrer';
        website.textContent = 'Website';
        popup.append(document.createElement('div'), website);
      }
      if (element.source_url && /^https?:\/\//i.test(element.source_url)) {
        const source = document.createElement('a');
        source.href = element.source_url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.textContent = 'Mở nguồn dữ liệu';
        popup.append(document.createElement('div'), source);
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
      renderMarkers();
    });

    window.addEventListener('w2e:discovery-filter', (event) => {
      visiblePlaceIds = new Set(event.detail?.placeIds || []);
      renderMarkers();
    });

    async function publicSnapshotPlaces(center) {
      if (!publicSnapshotRequest) {
        publicSnapshotRequest = fetch(PUBLIC_SNAPSHOT_URL, { cache: 'no-store' }).then(async (response) => {
          if (!response.ok) throw new Error(`Không tải được dữ liệu dự phòng (HTTP ${response.status}).`);
          const data = await response.json();
          if (!Array.isArray(data.elements)) throw new Error('Dữ liệu dự phòng không hợp lệ.');
          return data;
        }).catch((error) => {
          publicSnapshotRequest = null;
          throw error;
        });
      }
      const data = await publicSnapshotRequest;
      const elements = data.elements.map((element) => ({
        element,
        distance: distanceMeters(center, [Number(element.lat), Number(element.lon)]),
      })).filter((place) => place.distance <= SEARCH_RADIUS_METERS)
        .sort((first, second) => first.distance - second.distance)
        .slice(0, 5000).map((place) => place.element);
      return { elements, snapshot: true, snapshot_date: data.snapshot_date, imported_at: data.import_summary?.imported_at, source: data.source, static_fallback: true };
    }

    async function loadPlaces(center = [map.getCenter().lat, map.getCenter().lng], forceRefresh = false) {
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
        if (activeController !== controller) return;
        if (!data.static_fallback) {
          try {
            const snapshot = await publicSnapshotPlaces(center);
            if (activeController !== controller) return;
            const merged = new Map(snapshot.elements.map((place) => [`${place.type}:${place.id}`, place]));
            for (const place of data.elements) merged.set(`${place.type}:${place.id}`, place);
            data.elements = Array.from(merged.values()).map((place) => ({
              place,
              distance: distanceMeters(center, coordinatesOf(place)),
            })).filter((entry) => entry.distance <= SEARCH_RADIUS_METERS)
              .sort((first, second) => first.distance - second.distance)
              .slice(0, 5000)
              .map(({ place }) => place);
          } catch (snapshotError) {
            console.warn('Không gộp được dữ liệu địa điểm lưu trên website:', snapshotError);
          }
        }
        drawPlaces(data);
      } catch (error) {
        if (controller.signal.aborted && activeController !== controller) return;
        window.clearTimeout(timeoutId);
        console.error('Không lấy được địa điểm OSM:', error);
        try {
          const snapshot = await publicSnapshotPlaces(center);
          if (activeController !== controller) return;
          if (snapshot.elements.length) {
            drawPlaces(snapshot);
            return;
          }
        } catch (snapshotError) {
          console.warn('Không tải được dữ liệu OSM lưu trên website:', snapshotError);
        }
        if (activeController !== controller) return;
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

    function stopLocating() {
      if (locationWatch !== null) navigator.geolocation.clearWatch(locationWatch);
      locationWatch = null;
      locating = false;
      window.clearTimeout(locationTimer);
      locationTimer = null;
      locateButton.disabled = false;
      locateButton.removeAttribute('aria-busy');
      locateButton.setAttribute('aria-pressed', 'false');
      locateButton.setAttribute('aria-label', 'Bật theo dõi vị trí của tôi');
    }

    function showLocation(center, accuracy, follow = false) {
      const coordinates = `${center[0].toFixed(5)}, ${center[1].toFixed(5)}`;
      const label = `Tọa độ thiết bị: ${coordinates} · sai số trình duyệt báo ±${Math.ceil(accuracy)} m`;
      if (!userMarker) {
        userMarker = L.circleMarker(center, {
          radius: 9, color: '#fff', weight: 3, fillColor: '#1769d2', fillOpacity: 1,
        }).addTo(map).bindPopup(label);
      } else {
        userMarker.setLatLng(center);
        userMarker.setPopupContent(label);
      }
      if (!accuracyCircle) {
        accuracyCircle = L.circle(center, { radius: accuracy, color: '#1769d2', weight: 1, fillOpacity: 0.12 }).addTo(map);
      } else {
        accuracyCircle.setLatLng(center).setRadius(accuracy);
      }
      locateButton.removeAttribute('aria-busy');
      if (follow && !hasLocationFix) map.setView(center, accuracy <= 100 ? 16 : accuracy <= 1000 ? 14 : 12);
      else if (follow) map.panTo(center, { animate: true, duration: 0.35 });
      hasLocationFix = true;
    }

    function scanLocation(center, accuracy, initial = false) {
      const improvedAccuracy = accuracy < lastScannedAccuracy * 0.65
        && Date.now() - lastScannedAt >= 15000;
      const movedEnough = lastScannedCenter && distanceMeters(lastScannedCenter, center) >= 250;
      if (!initial && !movedEnough && !improvedAccuracy) return;
      lastScannedCenter = center;
      lastScannedAt = Date.now();
      lastScannedAccuracy = accuracy;
      const coordinates = `${center[0].toFixed(5)}, ${center[1].toFixed(5)}`;
      locationStatus.textContent = accuracy > 1000
        ? `Thiết bị báo tọa độ ${coordinates}, sai số khoảng ±${Math.ceil(accuracy)} m. Đang bám ghim và quét quanh tọa độ này; bật Vị trí chính xác để thu hẹp sai số. Bấm lại nút để tắt.`
        : `Thiết bị báo tọa độ ${coordinates}, sai số khoảng ±${Math.ceil(accuracy)} m. Đang theo dõi và quét quán quanh bạn. Bấm lại nút để tắt.`;
      loadPlaces(center, initial);
    }

    function finishLocating(error) {
      if (!locating) return;
      if (error?.code === 1) {
        stopLocating();
        locationStatus.textContent = 'Quyền Vị trí của trang đang bị từ chối. Bấm biểu tượng bên trái địa chỉ trang, cho phép Vị trí, tải lại trang rồi thử lại.';
      } else {
        locateButton.removeAttribute('aria-busy');
        locationStatus.textContent = error?.code === 3
          ? hasLocationFix
            ? 'Chưa nhận được tọa độ mới. Ghim giữ vị trí thiết bị báo lần cuối; trang vẫn tiếp tục theo dõi.'
            : 'Chưa nhận được tọa độ từ thiết bị. Bản đồ vẫn ở tâm mặc định Quận 1, đây không phải vị trí của bạn. Hãy bật Dịch vụ vị trí; trang vẫn tiếp tục thử.'
          : hasLocationFix
            ? 'Thiết bị chưa gửi tọa độ mới. Ghim giữ vị trí lần cuối và trang vẫn tiếp tục theo dõi.'
            : 'Thiết bị chưa gửi tọa độ. Tâm bản đồ Quận 1 vẫn là mặc định, chưa phải vị trí của bạn.';
      }
    }

    function locateUser() {
      if (locating) {
        stopLocating();
        locationStatus.textContent = 'Đã tắt theo dõi vị trí. Bản đồ giữ nguyên vị trí cuối cùng.';
        return;
      }
      pickingLocation = false;
      pickButton.setAttribute('aria-pressed', 'false');
      if (!window.isSecureContext) {
        locationStatus.textContent = 'Trình duyệt chỉ cho phép định vị trên HTTPS hoặc localhost. Hãy mở trang bằng địa chỉ đó rồi thử lại.';
        return;
      }
      if (!navigator.geolocation) {
        locationStatus.textContent = 'Trình duyệt không hỗ trợ định vị. Bạn có thể chọn vị trí trên bản đồ.';
        return;
      }
      stopLocating();
      locating = true;
      locateButton.setAttribute('aria-busy', 'true');
      locateButton.setAttribute('aria-pressed', 'true');
      locateButton.setAttribute('aria-label', 'Tắt theo dõi vị trí của tôi');
      locationStatus.textContent = 'Đang yêu cầu tọa độ từ trình duyệt… Nếu chưa nhận được tọa độ mới, tâm Quận 1 vẫn chỉ là vị trí mặc định.';
      locationTimer = window.setTimeout(() => {
        if (locating && !hasLocationFix) finishLocating({ code: 3 });
      }, 30000);
      try {
        locationWatch = navigator.geolocation.watchPosition((position) => {
          if (!locating) return;
          const { latitude, longitude, accuracy } = position.coords;
          if (![latitude, longitude, accuracy, position.timestamp].every(Number.isFinite)
            || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0
            || position.timestamp < Date.now() - 120000) return;
          const center = [latitude, longitude];
          const initial = !hasLocationFix;
          showLocation(center, accuracy, true);
          if (locationTimer) {
            window.clearTimeout(locationTimer);
            locationTimer = null;
          }
          scanLocation(center, accuracy, initial);
        }, finishLocating, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
      } catch (error) {
        finishLocating(error);
      }
    }

    pickButton.addEventListener('click', () => {
      stopLocating();
      pickingLocation = !pickingLocation;
      pickButton.setAttribute('aria-pressed', String(pickingLocation));
      locationStatus.textContent = pickingLocation
        ? 'Bấm vào vị trí của bạn trên bản đồ để tìm quán quanh đó.'
        : 'Đã hủy chọn vị trí. Khu vực tìm kiếm vẫn giữ nguyên.';
    });
    map.on('click', (event) => {
      if (!pickingLocation) return;
      pickingLocation = false;
      pickButton.setAttribute('aria-pressed', 'false');
      const center = [event.latlng.lat, event.latlng.lng];
      if (userMarker) map.removeLayer(userMarker);
      if (accuracyCircle) map.removeLayer(accuracyCircle);
      userMarker = L.circleMarker(center, { radius: 9, color: '#fff', weight: 3, fillColor: '#c58b00', fillOpacity: 1 }).addTo(map).bindPopup('Vị trí bạn chọn trên bản đồ').openPopup();
      accuracyCircle = null;
      map.setView(center, 16);
      locationStatus.textContent = 'Đang tìm quanh vị trí bạn chọn trên bản đồ.';
      lastScannedCenter = center;
      lastScannedAt = Date.now();
      loadPlaces(center, true);
    });
    window.addEventListener('pagehide', stopLocating);

    locateButton.addEventListener('click', locateUser);
    refreshButton.addEventListener('click', () => loadPlaces(undefined, true));

    setStatus('Đang tải địa điểm OpenStreetMap quanh khu vực bản đồ…', true);
    if (window.isSecureContext && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
        if (permission.state === 'denied' && !locating) {
          locationStatus.textContent = 'Trình duyệt đang chặn quyền Vị trí của trang này. Bấm biểu tượng bên trái địa chỉ trang để cho phép, rồi tải lại.';
        } else if (permission.state === 'granted' && !locating) {
          locationStatus.textContent = 'Quyền Vị trí đã được cấp cho trang này. Bấm “Vị trí của tôi” để lấy tọa độ hiện tại.';
        }
      }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('w2e:map-ready', {
      detail: { center: { lat: initialCenter[0], lon: initialCenter[1] }, hasOsmData: false },
    }));
    loadPlaces(initialCenter);
    if (focusParams.get('w2e_locate') === '1') {
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('w2e_locate');
      history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
      locationStatus.textContent = 'Bấm “Vị trí của tôi” để trình duyệt xin quyền Vị trí.';
    }
  });
})();
