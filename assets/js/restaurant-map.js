/* Live restaurant locations from OpenStreetMap, with sequential Overpass failover. */
(function () {
  'use strict';

  const DEFAULT_CENTER = [10.7769, 106.7009];
  const SEARCH_RADIUS_METERS = 1500;
  const CACHE_TTL_MS = 10 * 60 * 1000;

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

    const map = L.map(mapElement).setView(DEFAULT_CENTER, 14);
    const markers = L.layerGroup().addTo(map);
    const managedMarkers = L.layerGroup().addTo(map);
    const tileNotice = document.createElement('div');
    tileNotice.className = 'w2e-map-tile-notice';
    tileNotice.hidden = true;
    tileNotice.textContent = 'Không tải được ảnh nền bản đồ. Kiểm tra kết nối mạng hoặc VPN.';
    mapElement.appendChild(tileNotice);
    let searchCenter = DEFAULT_CENTER;
    let userMarker;
    let activeController;

    const tileLayer = L.tileLayer('/tiles/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Tiles <a href="https://www.hotosm.org/">HOT</a>',
    }).addTo(map);
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
      mapElement.setAttribute('aria-busy', String(busy));
    }

    function cacheKey(center) {
      return `w2e-osm-restaurants-v2-${center[0].toFixed(3)}-${center[1].toFixed(3)}`;
    }

    function getCached(center) {
      try {
        const cached = JSON.parse(sessionStorage.getItem(cacheKey(center)) || 'null');
        return cached && Date.now() - cached.savedAt < CACHE_TTL_MS ? cached.data : null;
      } catch (_) {
        return null;
      }
    }

    function saveCache(center, data) {
      try {
        sessionStorage.setItem(cacheKey(center), JSON.stringify({ savedAt: Date.now(), data }));
      } catch (_) { /* Storage may be disabled; the live request still succeeds. */ }
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
      if (addressParts.length) {
        const address = document.createElement('div');
        address.textContent = addressParts.join(', ');
        popup.appendChild(address);
      }
      const type = tags.cuisine || tags.amenity;
      if (type) {
        const detail = document.createElement('small');
        detail.textContent = `Loại: ${type}`;
        popup.appendChild(detail);
      }
      const link = document.createElement('a');
      link.href = `https://www.openstreetmap.org/${encodeURIComponent(element.type)}/${encodeURIComponent(element.id)}`;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Xem dữ liệu OpenStreetMap';
      popup.append(document.createElement('br'), link);
      return popup;
    }

    function drawPlaces(data) {
      markers.clearLayers();
      let count = 0;
      (data.elements || []).forEach((element) => {
        const coords = coordinatesOf(element);
        if (!coords) return;
        L.marker(coords).bindPopup(popupFor(element)).addTo(markers);
        count += 1;
      });
      const updatedAt = data.osm3s && data.osm3s.timestamp_osm_base
        ? ` Cơ sở dữ liệu OSM cập nhật đến ${new Date(data.osm3s.timestamp_osm_base).toLocaleString('vi-VN')}.`
        : '';
      setStatus(count
        ? `Hiển thị ${count} địa điểm trong bán kính 1,5 km.${updatedAt} Thông tin có thể thiếu do dữ liệu cộng đồng.`
        : 'Không tìm thấy địa điểm ăn uống được ghi nhận gần đây trong OpenStreetMap.', false);
      window.dispatchEvent(new CustomEvent('w2e:osm-data', { detail: { data, center: { lat: searchCenter[0], lon: searchCenter[1] } } }));
    }

    window.addEventListener('w2e:managed-data', (event) => {
      managedMarkers.clearLayers();
      let count = 0;
      (event.detail?.restaurants || []).forEach((restaurant) => {
        if (!Number.isFinite(restaurant.latitude) || !Number.isFinite(restaurant.longitude)) return;
        const popup = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = restaurant.name || 'Địa điểm What2Eat';
        const address = document.createElement('div'); address.textContent = restaurant.address || 'Chưa có địa chỉ';
        const link = document.createElement('a'); link.href = `./restaurant.php?id=${encodeURIComponent(restaurant.id)}`; link.textContent = 'Xem thông tin đã duyệt';
        popup.append(name, address, link);
        L.marker([restaurant.latitude, restaurant.longitude]).bindPopup(popup).addTo(managedMarkers);
        count += 1;
      });
      if (count) status.textContent += ` Có thêm ${count} địa điểm được quản trị viên duyệt.`;
    });

    async function loadPlaces(center = [map.getCenter().lat(), map.getCenter().lng()]) {
      searchCenter = center;
      if (activeController) activeController.abort();
      activeController = new AbortController();
      const controller = activeController;
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 70000);

      const cached = getCached(center);
      if (cached) {
        window.clearTimeout(timeoutId);
        drawPlaces(cached);
        status.textContent += ' (dữ liệu tạm lưu trong phiên, tối đa 10 phút).';
        return;
      }

      setStatus('Đang truy vấn OpenStreetMap…', true);
      try {
        const params = new URLSearchParams({ lat: center[0], lon: center[1], radius: SEARCH_RADIUS_METERS });
        const response = await fetch(`/api/restaurants?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Máy chủ cục bộ trả về HTTP ${response.status}`);
        if (!Array.isArray(data.elements)) throw new Error('Phản hồi dữ liệu OSM không hợp lệ.');
        saveCache(center, data);
        drawPlaces(data);
      } catch (error) {
        if (controller.signal.aborted && activeController !== controller) return;
        console.error('Không lấy được địa điểm OSM:', error);
        const message = timedOut
          ? 'Máy chủ cục bộ chưa phản hồi sau 70 giây.'
          : (error.message === 'Failed to fetch' || error instanceof TypeError
            ? 'Không gọi được máy chủ dự án. Hãy chạy node server.js rồi mở http://127.0.0.1:4173/pages/discovery.php.'
            : error.message);
        setStatus(`Không tải được địa điểm: ${message}`, false);
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    function locateUser() {
      if (!navigator.geolocation) {
        setStatus('Trình duyệt không hỗ trợ định vị. Di chuyển bản đồ rồi bấm Tải lại.', false);
        return;
      }
      setStatus('Đang xác định vị trí của bạn…', true);
      navigator.geolocation.getCurrentPosition((position) => {
        searchCenter = [position.coords.latitude, position.coords.longitude];
        map.setView(searchCenter, 15);
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker(searchCenter, {
          radius: 8, color: '#fff', weight: 3, fillColor: '#c58b00', fillOpacity: 1,
        }).addTo(map).bindPopup('Vị trí của bạn');
        loadPlaces(searchCenter);
      }, () => {
        setStatus('Không lấy được vị trí. Hãy cho phép định vị hoặc di chuyển bản đồ đến nơi cần tìm.', false);
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    }

    locateButton.addEventListener('click', locateUser);
    refreshButton.addEventListener('click', () => loadPlaces());
    loadPlaces(DEFAULT_CENTER);
  });
})();
