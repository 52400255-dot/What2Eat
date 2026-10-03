/* ============================================================
   What2Eat - discovery.js
   Restaurant discovery: filter, sort, search, random picker
   ============================================================ */

'use strict';

// ============================================================
// DEMO DATA: 8 quán ăn Việt Nam thực tế
// ============================================================
const RESTAURANTS_DATA = [
  {
    id: 'r1',
    name: 'Phở Thìn Bờ Hồ',
    category: 'pho',
    categoryLabel: 'Phở',
    address: '61 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội',
    district: 'Hoàn Kiếm',
    city: 'Hà Nội',
    rating: 4.8,
    reviewCount: 2341,
    priceMin: 50000,
    priceMax: 85000,
    priceLabel: '50k – 85k',
    distance: 0.8,
    distanceLabel: '0.8 km',
    isOpen: true,
    openTime: '06:00 – 21:00',
    isFeatured: true,
    isNew: false,
    image: 'https://i.pinimg.com/1200x/99/50/27/9950273e9585c72e830a00403dbdafd7.jpg',
    tags: ['Phở bò', 'Truyền thống', 'Nổi tiếng'],
    description: 'Quán phở truyền thống Hà Nội nổi tiếng hơn 50 năm với nước dùng đậm đà, thịt bò tươi ngon.',
  },
  {
    id: 'r2',
    name: 'Bún Bò Huế Mệ Kính',
    category: 'bun',
    categoryLabel: 'Bún',
    address: '10 Lý Thường Kiệt, Phú Nhuận, TP.HCM',
    district: 'Phú Nhuận',
    city: 'TP.HCM',
    rating: 4.6,
    reviewCount: 1872,
    priceMin: 55000,
    priceMax: 90000,
    priceLabel: '55k – 90k',
    distance: 1.2,
    distanceLabel: '1.2 km',
    isOpen: true,
    openTime: '06:30 – 21:30',
    isFeatured: false,
    isNew: false,
    image: 'https://i.pinimg.com/1200x/b8/1a/2f/b81a2f4a1859aaaea67c15bf3a315b28.jpg',
    tags: ['Bún bò', 'Huế', 'Cay đậm'],
    description: 'Bún bò Huế chính thống với sả, mắm ruốc thơm lừng, giò heo mềm tan trong miệng.',
  },
  {
    id: 'r3',
    name: 'Cơm Tấm Thuận Kiều',
    category: 'com',
    categoryLabel: 'Cơm',
    address: '124 Thuận Kiều, Quận 5, TP.HCM',
    district: 'Quận 5',
    city: 'TP.HCM',
    rating: 4.5,
    reviewCount: 3105,
    priceMin: 40000,
    priceMax: 75000,
    priceLabel: '40k – 75k',
    distance: 0.5,
    distanceLabel: '0.5 km',
    isOpen: true,
    openTime: '05:30 – 22:00',
    isFeatured: true,
    isNew: false,
    image: 'https://i.pinimg.com/736x/e4/28/63/e42863c629fdc54f6a6710b65f45eae0.jpg',
    tags: ['Cơm tấm', 'Sườn nướng', 'Bì chả'],
    description: 'Cơm tấm sườn bì chả thơm ngon, nước mắm pha đặc sánh đúng vị Sài Gòn đặc trưng.',
  },
  {
    id: 'r4',
    name: 'Bánh Mì Huynh Hoa',
    category: 'banh',
    categoryLabel: 'Bánh mì',
    address: '2B Phan Châu Trinh, Hội An, Quảng Nam',
    district: 'Hội An',
    city: 'Quảng Nam',
    rating: 4.9,
    reviewCount: 5423,
    priceMin: 25000,
    priceMax: 45000,
    priceLabel: '25k – 45k',
    distance: 2.3,
    distanceLabel: '2.3 km',
    isOpen: false,
    openTime: '06:30 – 21:30',
    isFeatured: true,
    isNew: false,
    image: 'https://i.pinimg.com/1200x/66/17/05/6617057729402290d2c4a1e228b63cec.jpg',
    tags: ['Bánh mì', 'Hội An', 'Nổi tiếng thế giới'],
    description: 'Bánh mì Phượng nổi tiếng thế giới, được Anthony Bourdain ca ngợi là "sandwich ngon nhất thế giới".',
  },
  {
    id: 'r5',
    name: 'Lẩu Thái ',
    category: 'lau',
    categoryLabel: 'Lẩu',
    address: '45 Lê Văn Lương, Thanh Xuân, Hà Nội',
    district: 'Thanh Xuân',
    city: 'Hà Nội',
    rating: 4.3,
    reviewCount: 987,
    priceMin: 150000,
    priceMax: 350000,
    priceLabel: '150k – 350k',
    distance: 3.1,
    distanceLabel: '3.1 km',
    isOpen: true,
    openTime: '11:00 – 23:00',
    isFeatured: false,
    isNew: true,
    image: 'https://i.pinimg.com/1200x/24/ad/59/24ad597e28ab57d9be26f551230e198b.jpg',
    tags: ['Lẩu Thái', 'Tom Yum', 'Hải sản'],
    description: 'Lẩu Thái chua cay đúng chất, nước dùng Tom Yum tươi ngon với hải sản tươi sống nhập hàng ngày.',
  },
  {
    id: 'r6',
    name: 'The Coffee House',
    category: 'cafe',
    categoryLabel: 'Cà phê',
    address: '86 Cao Thắng, Quận 3, TP.HCM',
    district: 'Quận 3',
    city: 'TP.HCM',
    rating: 4.4,
    reviewCount: 2156,
    priceMin: 45000,
    priceMax: 95000,
    priceLabel: '45k – 95k',
    distance: 1.7,
    distanceLabel: '1.7 km',
    isOpen: true,
    openTime: '07:00 – 23:00',
    isFeatured: false,
    isNew: false,
    image: 'https://cafef.vn/the-coffee-house-4-lan-thay-tuong-tu-ngay-nha-sang-lap-nguyen-hai-ninh-roi-di-van-lien-tuc-thua-lo-188250221071303688.chn',
    tags: ['Cà phê', 'Không gian đẹp', 'Wifi'],
    description: 'Không gian ấm cúng với cà phê rang xay tươi, nhiều loại đồ uống đặc biệt phù hợp làm việc và họp nhóm.',
  },
  {
    id: 'r7',
    name: 'Chè Khúc Bạch Bà Dần',
    category: 'trangmieng',
    categoryLabel: 'Tráng miệng',
    address: '38 Hàng Giầy, Hoàn Kiếm, Hà Nội',
    district: 'Hoàn Kiếm',
    city: 'Hà Nội',
    rating: 4.7,
    reviewCount: 1543,
    priceMin: 30000,
    priceMax: 55000,
    priceLabel: '30k – 55k',
    distance: 1.0,
    distanceLabel: '1.0 km',
    isOpen: true,
    openTime: '09:00 – 22:00',
    isFeatured: false,
    isNew: false,
    image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80',
    tags: ['Chè', 'Khúc bạch', 'Ngọt mát'],
    description: 'Chè khúc bạch béo mịn, thạch đủ màu đẹp mắt, trân châu dẻo dai, ăn mùa hè ngon tuyệt.',
  },
  {
    id: 'r8',
    name: 'Trà Sữa Gong Cha',
    category: 'nuoc',
    categoryLabel: 'Đồ uống',
    address: '15 Nguyễn Huệ, Quận 1, TP.HCM',
    district: 'Quận 1',
    city: 'TP.HCM',
    rating: 4.2,
    reviewCount: 3876,
    priceMin: 45000,
    priceMax: 80000,
    priceLabel: '45k – 80k',
    distance: 0.9,
    distanceLabel: '0.9 km',
    isOpen: true,
    openTime: '09:00 – 22:30',
    isFeatured: false,
    isNew: false,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    tags: ['Trà sữa', 'Topping', 'Đài Loan'],
    description: 'Thương hiệu trà sữa Đài Loan nổi tiếng với nhiều lựa chọn trà, topping phong phú theo ý thích.',
  },
];

// ============================================================
// CATEGORIES
// ============================================================
const CATEGORIES_DATA = [
  { id: 'all',       label: 'Tất cả', },
  { id: 'pho',       label: 'Phở', },
  { id: 'bun',       label: 'Bún', },
  { id: 'com',       label: 'Cơm', },
  { id: 'banh',      label: 'Bánh mì', },
  { id: 'lau',       label: 'Lẩu', },
  { id: 'cafe',      label: 'Cà phê', },
  { id: 'trangmieng',label: 'Tráng miệng', },
  { id: 'nuoc',      label: 'Đồ uống', },
];

// ============================================================
// STATE
// ============================================================
const discoveryState = {
  allRestaurants: [...RESTAURANTS_DATA],
  filtered: [...RESTAURANTS_DATA],
  searchQuery: '',
  activeCategory: 'all',
  sortBy: 'best',
  priceRange: { min: 0, max: 500000 },
  ratingFilter: 0,
  showOpenOnly: false,
  page: 1,
  perPage: 6,
};

// ============================================================
// RENDER RESTAURANT CARD
// ============================================================
function renderRestaurantCard(r) {
  const isFav = (getLS('w2e_favorites') || []).includes(r.id);
  return `
    <div class="w2e-restaurant-card w2e-fade-in-up" data-id="${r.id}" onclick="openRestaurant('${r.id}')">
      <div class="w2e-restaurant-card__img-wrap">
        <img
          class="w2e-restaurant-card__img"
          src="${r.image}"
          alt="${r.name}"
          loading="lazy"
          onerror="this.src='https://picsum.photos/seed/${r.id}/600/400'"
        />
        <div class="w2e-restaurant-card__badges">
          <span class="w2e-badge w2e-badge--${r.isOpen ? 'open' : 'closed'}">
            <i class="bi bi-circle-fill" style="font-size:6px"></i>
            ${r.isOpen ? 'Đang mở' : 'Đã đóng'}
          </span>
          ${r.isFeatured ? '<span class="w2e-badge w2e-badge--featured">Nổi bật</span>' : ''}
          ${r.isNew ? '<span class="w2e-badge w2e-badge--new">Mới</span>' : ''}
        </div>
        <button
          class="w2e-restaurant-card__fav ${isFav ? 'active' : ''}"
          data-fav-id="${r.id}"
          data-fav-name="${r.name}"
          onclick="event.stopPropagation()"
          aria-label="${isFav ? 'Bỏ yêu thích' : 'Thêm yêu thích'}"
        >
          <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
        </button>
      </div>

      <div class="w2e-restaurant-card__body">
        <div class="w2e-restaurant-card__name" title="${r.name}">${r.name}</div>
        <div class="w2e-restaurant-card__category">
          ${r.categoryLabel} · ${r.district}
        </div>
        <div class="w2e-restaurant-card__meta">
          <div class="w2e-restaurant-card__rating">
            <i class="bi bi-star-fill"></i>
            ${r.rating.toFixed(1)}
            <span>(${r.reviewCount.toLocaleString('vi-VN')})</span>
          </div>
          <div class="w2e-restaurant-card__distance">
            <i class="bi bi-geo-alt"></i>
            ${r.distanceLabel}
          </div>
        </div>
      </div>

      <div class="w2e-restaurant-card__footer">
        <div>
          <div class="w2e-restaurant-card__price">${r.priceLabel}</div>
          <div class="w2e-restaurant-card__price-range">
            <i class="bi bi-clock" style="font-size:10px"></i> ${r.openTime}
          </div>
        </div>
        <a
          href="./restaurant.html?id=${r.id}"
          class="w2e-btn w2e-btn--outline w2e-btn--sm"
          onclick="event.stopPropagation()"
        >
          Xem chi tiết
        </a>
      </div>
    </div>
  `;
}

// ============================================================
// OPEN RESTAURANT DETAIL
// ============================================================
function openRestaurant(id) {
  window.location.href = `./restaurant.html?id=${id}`;
}

// ============================================================
// FILTER LOGIC
// ============================================================
function applyFilters() {
  let result = [...discoveryState.allRestaurants];

  // Search
  if (discoveryState.searchQuery) {
    const q = discoveryState.searchQuery.toLowerCase();
    result = result.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.categoryLabel.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      r.district.toLowerCase().includes(q)
    );
  }

  // Category
  if (discoveryState.activeCategory !== 'all') {
    result = result.filter(r => r.category === discoveryState.activeCategory);
  }

  // Rating
  if (discoveryState.ratingFilter > 0) {
    result = result.filter(r => r.rating >= discoveryState.ratingFilter);
  }

  // Price range
  result = result.filter(r =>
    r.priceMax >= discoveryState.priceRange.min &&
    r.priceMin <= discoveryState.priceRange.max
  );

  // Open only
  if (discoveryState.showOpenOnly) {
    result = result.filter(r => r.isOpen);
  }

  discoveryState.filtered = result;
  discoveryState.page = 1;
  applySort();
  renderResults();
}

// ============================================================
// SORT LOGIC
// ============================================================
function applySort() {
  const sortMap = {
    best:        (a, b) => (b.isFeatured - a.isFeatured) || (b.rating - a.rating),
    rating:      (a, b) => b.rating - a.rating,
    nearest:     (a, b) => a.distance - b.distance,
    lowprice:    (a, b) => a.priceMin - b.priceMin,
    highprice:   (a, b) => b.priceMax - a.priceMax,
    reviews:     (a, b) => b.reviewCount - a.reviewCount,
  };
  const fn = sortMap[discoveryState.sortBy] || sortMap.best;
  discoveryState.filtered.sort(fn);
}

// ============================================================
// RENDER RESULTS
// ============================================================
function renderResults() {
  const grid = document.getElementById('restaurantGrid');
  const countEl = document.getElementById('resultCount');
  const emptyEl = document.getElementById('emptyState');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  if (!grid) return;

  const { filtered, page, perPage } = discoveryState;
  const totalShown = page * perPage;
  const items = filtered.slice(0, totalShown);

  if (countEl) {
    countEl.textContent = `${filtered.length} quán ăn`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  grid.innerHTML = items.map(r => renderRestaurantCard(r)).join('');

  if (loadMoreBtn) {
    loadMoreBtn.style.display = totalShown < filtered.length ? 'flex' : 'none';
  }

  // Re-init favorite buttons
  initFavoriteButtons();
}

// ============================================================
// LOAD MORE
// ============================================================
function loadMore() {
  discoveryState.page += 1;
  renderResults();
}

// ============================================================
// CATEGORY FILTER UI
// ============================================================
function renderCategories() {
  const container = document.getElementById('categoryGrid');
  if (!container) return;

  container.innerHTML = CATEGORIES_DATA.map(cat => `
    <div
      class="w2e-category-card ${discoveryState.activeCategory === cat.id ? 'active' : ''}"
      data-category="${cat.id}"
      onclick="selectCategory('${cat.id}')"
      role="button"
      tabindex="0"
      aria-pressed="${discoveryState.activeCategory === cat.id}"
    >
      <div class="w2e-category-card__icon">${initialLetter(cat.label)}</div>
      <div class="w2e-category-card__name">${cat.label}</div>
      <div class="w2e-category-card__count">
        ${cat.id === 'all'
          ? RESTAURANTS_DATA.length + ' quán'
          : RESTAURANTS_DATA.filter(r => r.category === cat.id).length + ' quán'}
      </div>
    </div>
  `).join('');
}

function selectCategory(id) {
  discoveryState.activeCategory = id;

  document.querySelectorAll('[data-category]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-category') === id);
    el.setAttribute('aria-pressed', el.getAttribute('data-category') === id);
  });

  applyFilters();
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  const debouncedSearch = debounce((val) => {
    discoveryState.searchQuery = val;
    applyFilters();
  }, 350);

  searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      discoveryState.searchQuery = e.target.value.trim();
      applyFilters();
    }
    if (e.key === 'Escape') {
      searchInput.value = '';
      discoveryState.searchQuery = '';
      applyFilters();
    }
  });

  // Clear button
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      discoveryState.searchQuery = '';
      applyFilters();
      searchInput.focus();
    });
  }
}

// ============================================================
// SORT SELECT
// ============================================================
function initSortSelect() {
  const sortSelect = document.getElementById('sortSelect');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', (e) => {
    discoveryState.sortBy = e.target.value;
    applySort();
    renderResults();
  });
}

// ============================================================
// RATING FILTER CHIPS
// ============================================================
function initRatingFilter() {
  document.querySelectorAll('[data-rating-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = parseFloat(chip.getAttribute('data-rating-filter'));
      discoveryState.ratingFilter = discoveryState.ratingFilter === val ? 0 : val;
      document.querySelectorAll('[data-rating-filter]').forEach(c => {
        c.classList.toggle('active', parseFloat(c.getAttribute('data-rating-filter')) === discoveryState.ratingFilter);
      });
      applyFilters();
    });
  });
}

// ============================================================
// PRICE RANGE FILTER
// ============================================================
function initPriceFilter() {
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');

  if (priceMin) {
    priceMin.addEventListener('input', debounce(() => {
      discoveryState.priceRange.min = parseInt(priceMin.value) || 0;
      updatePriceLabel();
      applyFilters();
    }, 300));
  }

  if (priceMax) {
    priceMax.addEventListener('input', debounce(() => {
      discoveryState.priceRange.max = parseInt(priceMax.value) || 500000;
      updatePriceLabel();
      applyFilters();
    }, 300));
  }
}

function updatePriceLabel() {
  const label = document.getElementById('priceRangeLabel');
  if (label) {
    const { min, max } = discoveryState.priceRange;
    label.textContent = `${formatVNDShort(min)} – ${formatVNDShort(max)}`;
  }
}

// ============================================================
// OPEN ONLY FILTER
// ============================================================
function initOpenOnlyFilter() {
  const toggle = document.getElementById('openOnlyToggle');
  if (!toggle) return;

  toggle.addEventListener('change', () => {
    discoveryState.showOpenOnly = toggle.checked;
    applyFilters();
  });
}

// ============================================================
// RANDOM FOOD PICKER
// ============================================================
function initRandomPicker() {
  const pickerBtn = document.getElementById('randomPickerBtn');
  const pickerWheel = document.getElementById('pickerWheel');
  const pickerResult = document.getElementById('pickerResult');
  if (!pickerBtn) return;

  pickerBtn.addEventListener('click', () => {
    const pool = discoveryState.filtered.length > 0
      ? discoveryState.filtered
      : RESTAURANTS_DATA;

    pickerBtn.disabled = true;
    pickerBtn.textContent = 'Đang quay...';
    if (pickerWheel) pickerWheel.classList.add('spinning');
    if (pickerResult) pickerResult.classList.remove('show');

    let count = 0;
    const maxCount = 20; // 1500ms / 75ms
    const interval = setInterval(() => {
      count++;
      const rand = pool[Math.floor(Math.random() * pool.length)];
      if (pickerWheel) pickerWheel.textContent = initialLetter(rand.name);

      if (count >= maxCount) {
        clearInterval(interval);
        if (pickerWheel) pickerWheel.classList.remove('spinning');

        const result = pool[Math.floor(Math.random() * pool.length)];
        showPickerResult(result);
        pickerBtn.disabled = false;
        pickerBtn.innerHTML = '<i class="bi bi-shuffle"></i> Chọn lại';
      }
    }, 75);
  });
}

function showPickerResult(restaurant) {
  const resultEl = document.getElementById('pickerResult');
  if (!resultEl) return;

  resultEl.innerHTML = `
    <div class="w2e-picker__result-name">${restaurant.name}</div>
    <div class="w2e-picker__result-restaurant">
      <i class="bi bi-geo-alt"></i> ${restaurant.district} · ${restaurant.priceLabel}
    </div>
    <a href="./restaurant.html?id=${restaurant.id}" class="w2e-btn w2e-btn--primary w2e-btn--sm" style="margin-top:.875rem">
      <i class="bi bi-arrow-right"></i> Xem chi tiết
    </a>
  `;
  resultEl.classList.add('show');

  toast.success(`Hôm nay ăn "${restaurant.name}" nhé!`);
}

// ============================================================
// FILTER CHIPS TAGS DISPLAY
// ============================================================
function renderActiveFilters() {
  const container = document.getElementById('activeFilters');
  if (!container) return;

  const chips = [];
  if (discoveryState.searchQuery) {
    chips.push({
      label: `Tìm: "${discoveryState.searchQuery}"`,
      clear: () => {
        discoveryState.searchQuery = '';
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
        applyFilters();
      }
    });
  }
  if (discoveryState.activeCategory !== 'all') {
    const cat = CATEGORIES_DATA.find(c => c.id === discoveryState.activeCategory);
    chips.push({
      label: `Loại: ${cat ? cat.label : discoveryState.activeCategory}`,
      clear: () => selectCategory('all'),
    });
  }
  if (discoveryState.ratingFilter > 0) {
    chips.push({
      label: `Từ ${discoveryState.ratingFilter} sao`,
      clear: () => {
        discoveryState.ratingFilter = 0;
        document.querySelectorAll('[data-rating-filter]').forEach(c => c.classList.remove('active'));
        applyFilters();
      }
    });
  }
  if (discoveryState.showOpenOnly) {
    chips.push({
      label: 'Đang mở cửa',
      clear: () => {
        discoveryState.showOpenOnly = false;
        const toggle = document.getElementById('openOnlyToggle');
        if (toggle) toggle.checked = false;
        applyFilters();
      }
    });
  }

  container.innerHTML = chips.map((chip, i) => `
    <span class="w2e-filter-chip active" onclick="activeFiltersHandlers[${i}]()">
      ${chip.label}
      <span class="w2e-filter-chip__close">×</span>
    </span>
  `).join('');

  window.activeFiltersHandlers = chips.map(c => c.clear);

  // Clear all
  const clearAll = document.getElementById('clearAllFilters');
  if (clearAll) {
    clearAll.style.display = chips.length > 0 ? 'inline-flex' : 'none';
  }
}

// ============================================================
// CLEAR ALL FILTERS
// ============================================================
function clearAllFilters() {
  discoveryState.searchQuery = '';
  discoveryState.activeCategory = 'all';
  discoveryState.ratingFilter = 0;
  discoveryState.showOpenOnly = false;
  discoveryState.priceRange = { min: 0, max: 500000 };
  discoveryState.sortBy = 'best';

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'best';

  const openToggle = document.getElementById('openOnlyToggle');
  if (openToggle) openToggle.checked = false;

  document.querySelectorAll('[data-rating-filter]').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('[data-category]').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-category') === 'all');
  });

  applyFilters();
}

// ============================================================
// INIT DISCOVERY PAGE
// ============================================================
function initDiscovery() {
  renderCategories();
  applyFilters();
  initSearch();
  initSortSelect();
  initRatingFilter();
  initPriceFilter();
  initOpenOnlyFilter();
  initRandomPicker();

  // Load more button
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMore);
  }

  // Clear all filters button
  const clearAllBtn = document.getElementById('clearAllFilters');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllFilters);
  }

  // Override applyFilters to also update active filters display
  const _originalApplyFilters = applyFilters;
  window.applyFilters = function() {
    _originalApplyFilters();
    renderActiveFilters();
  };
}

// ============================================================
// START ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', initDiscovery);

// Expose to global
window.selectCategory = selectCategory;
window.openRestaurant = openRestaurant;
window.loadMore = loadMore;
window.clearAllFilters = clearAllFilters;
window.RESTAURANTS_DATA = RESTAURANTS_DATA;
window.discoveryState = discoveryState;
