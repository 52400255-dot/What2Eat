/* ============================================================
   What2Eat - admin.js
   Admin panel: tables, search, sort, pagination, CRUD modals
   ============================================================ */

'use strict';

// ============================================================
// ADMIN DEMO DATA
// ============================================================
const ADMIN_DATA = {
  restaurants: [
    { id: 'r1', name: 'Phở Thìn Bờ Hồ', category: 'Phở', address: '61 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội', rating: 4.8, status: 'active', isOpen: true, isFeatured: true, reviewCount: 2341, createdAt: '2025-04-10', image: 'https://picsum.photos/seed/r1/80/80' },
    { id: 'r2', name: 'Bún Bò Huế Mệ Kính', category: 'Bún', address: '10 Lý Thường Kiệt, Phú Nhuận, TP.HCM', rating: 4.6, status: 'active', isOpen: true, isFeatured: false, reviewCount: 1872, createdAt: '2025-05-12', image: 'https://picsum.photos/seed/r2/80/80' },
    { id: 'r3', name: 'Cơm Tấm Thuận Kiều', category: 'Cơm', address: '124 Thuận Kiều, Quận 5, TP.HCM', rating: 4.5, status: 'active', isOpen: true, isFeatured: true, reviewCount: 3105, createdAt: '2025-03-08', image: 'https://picsum.photos/seed/r3/80/80' },
    { id: 'r4', name: 'Bánh Mì Phượng Hội An', category: 'Bánh mì', address: '2B Phan Châu Trinh, Hội An, Quảng Nam', rating: 4.9, status: 'inactive', isOpen: false, isFeatured: true, reviewCount: 5423, createdAt: '2025-02-14', image: 'https://picsum.photos/seed/r4/80/80' },
    { id: 'r5', name: 'Lẩu Thái Koh Samui', category: 'Lẩu', address: '45 Lê Văn Lương, Thanh Xuân, Hà Nội', rating: 4.3, status: 'active', isOpen: true, isFeatured: false, reviewCount: 987, createdAt: '2025-08-01', image: 'https://picsum.photos/seed/r5/80/80' },
    { id: 'r6', name: 'The Coffee House Signature', category: 'Cà phê', address: '86 Cao Thắng, Quận 3, TP.HCM', rating: 4.4, status: 'active', isOpen: true, isFeatured: false, reviewCount: 2156, createdAt: '2025-06-20', image: 'https://picsum.photos/seed/r6/80/80' },
    { id: 'r7', name: 'Chè Khúc Bạch Bà Dần', category: 'Tráng miệng', address: '38 Hàng Giầy, Hoàn Kiếm, Hà Nội', rating: 4.7, status: 'active', isOpen: true, isFeatured: false, reviewCount: 1543, createdAt: '2025-07-05', image: 'https://picsum.photos/seed/r7/80/80' },
    { id: 'r8', name: 'Trà Sữa Gong Cha', category: 'Đồ uống', address: '15 Nguyễn Huệ, Quận 1, TP.HCM', rating: 4.2, status: 'active', isOpen: true, isFeatured: false, reviewCount: 3876, createdAt: '2025-01-18', image: 'https://picsum.photos/seed/r8/80/80' },
  ],

  categories: [
    { id: 'c1', name: 'Phở', restaurantCount: 12, noteCount: 89, status: 'active', description: 'Các quán phở truyền thống Việt Nam' },
    { id: 'c2', name: 'Bún', restaurantCount: 18, noteCount: 134, status: 'active', description: 'Bún bò, bún riêu, bún đậu...' },
    { id: 'c3', name: 'Cơm', restaurantCount: 25, noteCount: 201, status: 'active', description: 'Cơm tấm, cơm niêu, cơm rang...' },
    { id: 'c4', name: 'Bánh mì', restaurantCount: 9, noteCount: 67, status: 'active', description: 'Bánh mì Việt Nam đặc sắc' },
    { id: 'c5', name: 'Lẩu', restaurantCount: 7, noteCount: 43, status: 'active', description: 'Lẩu Thái, lẩu bò, lẩu hải sản' },
    { id: 'c6', name: 'Cà phê', restaurantCount: 31, noteCount: 256, status: 'active', description: 'Cà phê Việt Nam và quốc tế' },
    { id: 'c7', name: 'Tráng miệng', restaurantCount: 14, noteCount: 112, status: 'active', description: 'Chè, kem, bánh ngọt' },
    { id: 'c8', name: 'Đồ uống', restaurantCount: 22, noteCount: 189, status: 'active', description: 'Trà sữa, nước ép, sinh tố' },
    { id: 'c9', name: 'Nướng', restaurantCount: 8, noteCount: 54, status: 'inactive', description: 'Các quán thịt nướng, BBQ' },
  ],

  users: [
    { id: 'u1', name: 'Nguyễn Văn An', email: 'an.nguyen@gmail.com', avatar: 'https://i.pravatar.cc/40?img=12', role: 'user', status: 'active', noteCount: 47, joinDate: '2025-03-15', lastActive: '2026-09-28' },
    { id: 'u2', name: 'Trần Thị Bích', email: 'bich.tran@gmail.com', avatar: 'https://i.pravatar.cc/40?img=5', role: 'user', status: 'active', noteCount: 32, joinDate: '2025-04-20', lastActive: '2026-09-27' },
    { id: 'u3', name: 'Lê Minh Cường', email: 'cuong.le@gmail.com', avatar: 'https://i.pravatar.cc/40?img=8', role: 'user', status: 'active', noteCount: 28, joinDate: '2025-05-08', lastActive: '2026-09-25' },
    { id: 'u4', name: 'Phạm Thị Dung', email: 'dung.pham@gmail.com', avatar: 'https://i.pravatar.cc/40?img=9', role: 'user', status: 'banned', noteCount: 5, joinDate: '2025-06-12', lastActive: '2026-08-14' },
    { id: 'u5', name: 'Hoàng Văn Em', email: 'em.hoang@gmail.com', avatar: 'https://i.pravatar.cc/40?img=11', role: 'user', status: 'active', noteCount: 19, joinDate: '2025-07-02', lastActive: '2026-09-26' },
    { id: 'u6', name: 'Ngô Thị Hoa', email: 'hoa.ngo@gmail.com', avatar: 'https://i.pravatar.cc/40?img=21', role: 'admin', status: 'active', noteCount: 61, joinDate: '2025-01-01', lastActive: '2026-09-28' },
    { id: 'u7', name: 'Vũ Đình Kiên', email: 'kien.vu@gmail.com', avatar: 'https://i.pravatar.cc/40?img=15', role: 'user', status: 'active', noteCount: 14, joinDate: '2025-08-18', lastActive: '2026-09-20' },
    { id: 'u8', name: 'Đặng Thị Lan', email: 'lan.dang@gmail.com', avatar: 'https://i.pravatar.cc/40?img=16', role: 'user', status: 'inactive', noteCount: 2, joinDate: '2025-09-01', lastActive: '2026-09-01' },
  ],

  foodNotes: [
    { id: 'n1', title: 'Tô phở tuyệt vời nhất Hà Nội', author: 'Nguyễn Văn An', restaurant: 'Phở Thìn Bờ Hồ', rating: 5, status: 'approved', isPublic: true, date: '2026-09-20' },
    { id: 'n2', title: 'Cơm tấm sườn bì chả đúng vị Sài Gòn', author: 'Trần Thị Bích', restaurant: 'Cơm Tấm Thuận Kiều', rating: 4, status: 'approved', isPublic: true, date: '2026-09-18' },
    { id: 'n3', title: 'Bánh mì Phượng - Huyền thoại Hội An', author: 'Lê Minh Cường', restaurant: 'Bánh Mì Phượng', rating: 5, status: 'approved', isPublic: true, date: '2026-09-15' },
    { id: 'n4', title: 'Bún bò Huế buổi sáng đúng vị', author: 'Nguyễn Văn An', restaurant: 'Bún Bò Huế Mệ Kính', rating: 4, status: 'pending', isPublic: true, date: '2026-09-10' },
    { id: 'n5', title: 'Quán này không ngon, dịch vụ tệ', author: 'Phạm Thị Dung', restaurant: 'Trà Sữa Gong Cha', rating: 1, status: 'rejected', isPublic: false, date: '2026-08-12' },
    { id: 'n6', title: 'Chè khúc bạch - Giải nhiệt mùa hè', author: 'Hoàng Văn Em', restaurant: 'Chè Khúc Bạch Bà Dần', rating: 5, status: 'pending', isPublic: true, date: '2026-09-05' },
    { id: 'n7', title: 'Cà phê sáng không gian làm việc', author: 'Vũ Đình Kiên', restaurant: 'The Coffee House', rating: 4, status: 'approved', isPublic: true, date: '2026-08-28' },
  ],

  stats: {
    totalRestaurants: 8,
    totalUsers: 8,
    totalNotes: 7,
    totalCategories: 9,
    pendingNotes: 2,
    activeUsers: 6,
    monthlyNewUsers: 3,
    monthlyNewNotes: 12,
  },
};

// ============================================================
// TABLE STATE
// ============================================================
const adminTableState = {
  restaurants: { data: [], filtered: [], sortCol: 'name', sortDir: 'asc', page: 1, perPage: 5, search: '' },
  categories:  { data: [], filtered: [], sortCol: 'name', sortDir: 'asc', page: 1, perPage: 8, search: '' },
  users:       { data: [], filtered: [], sortCol: 'name', sortDir: 'asc', page: 1, perPage: 5, search: '' },
  foodNotes:   { data: [], filtered: [], sortCol: 'date', sortDir: 'desc', page: 1, perPage: 5, search: '' },
};

// ============================================================
// ADMIN STATS CARDS
// ============================================================
function updateAdminStats() {
  const { stats } = ADMIN_DATA;
  const mapping = {
    'adminStatRestaurants': stats.totalRestaurants,
    'adminStatUsers':       stats.totalUsers,
    'adminStatNotes':       stats.totalNotes,
    'adminStatCategories':  stats.totalCategories,
    'adminStatPending':     stats.pendingNotes,
    'adminStatActiveUsers': stats.activeUsers,
    'adminStatNewUsers':    stats.monthlyNewUsers,
    'adminStatNewNotes':    stats.monthlyNewNotes,
  };
  Object.entries(mapping).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '0';
      if (window.animateCounter) {
        animateCounter(el, 0, val, '', 800);
      } else {
        el.textContent = val;
      }
    }
  });
}

// ============================================================
// GENERIC TABLE SEARCH
// ============================================================
function initTableSearch(tableKey, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const state = adminTableState[tableKey];
  const debouncedSearch = debounce((q) => {
    state.search = q.toLowerCase();
    state.page = 1;
    filterTable(tableKey);
    renderTable(tableKey);
  }, 300);

  input.addEventListener('input', (e) => debouncedSearch(e.target.value));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      state.search = '';
      state.page = 1;
      filterTable(tableKey);
      renderTable(tableKey);
    }
  });
}

// ============================================================
// FILTER TABLE
// ============================================================
function filterTable(tableKey) {
  const state = adminTableState[tableKey];
  const q = state.search;

  if (!q) {
    state.filtered = [...state.data];
    return;
  }

  state.filtered = state.data.filter(row => {
    return Object.values(row).some(v =>
      String(v).toLowerCase().includes(q)
    );
  });
}

// ============================================================
// SORT TABLE
// ============================================================
function sortTable(tableKey, col) {
  const state = adminTableState[tableKey];
  if (state.sortCol === col) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortCol = col;
    state.sortDir = 'asc';
  }
  state.page = 1;
  applySortToTable(tableKey);
  renderTable(tableKey);
}

function applySortToTable(tableKey) {
  const state = adminTableState[tableKey];
  const { sortCol, sortDir } = state;
  state.filtered.sort((a, b) => {
    const av = a[sortCol];
    const bv = b[sortCol];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const aStr = String(av).toLowerCase();
    const bStr = String(bv).toLowerCase();
    const cmp = isNaN(av) ? aStr.localeCompare(bStr, 'vi') : (parseFloat(av) - parseFloat(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

// ============================================================
// RENDER ADMIN TABLE
// ============================================================
function renderTable(tableKey) {
  switch (tableKey) {
    case 'restaurants': renderRestaurantsTable(); break;
    case 'categories':  renderCategoriesTable();  break;
    case 'users':       renderUsersTable();        break;
    case 'foodNotes':   renderFoodNotesTable();    break;
  }
}

// ============================================================
// SORT ICON HELPER
// ============================================================
function getSortIcon(tableKey, col) {
  const state = adminTableState[tableKey];
  if (state.sortCol !== col) return '<i class="bi bi-arrow-down-up sort-icon"></i>';
  return state.sortDir === 'asc'
    ? '<i class="bi bi-arrow-up sort-icon"></i>'
    : '<i class="bi bi-arrow-down sort-icon"></i>';
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination(tableKey, containerId) {
  const state = adminTableState[tableKey];
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = state.filtered.length;
  const totalPages = Math.ceil(total / state.perPage);
  const { page } = state;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button class="w2e-page-item ${page <= 1 ? 'disabled' : ''}" onclick="changePage('${tableKey}', ${page - 1})">
      <i class="bi bi-chevron-left"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      html += `<button class="w2e-page-item ${i === page ? 'active' : ''}" onclick="changePage('${tableKey}', ${i})">${i}</button>`;
    } else if (Math.abs(i - page) === 2) {
      html += `<span style="padding:0 .25rem;color:var(--text-muted);font-size:.875rem">…</span>`;
    }
  }

  html += `
    <button class="w2e-page-item ${page >= totalPages ? 'disabled' : ''}" onclick="changePage('${tableKey}', ${page + 1})">
      <i class="bi bi-chevron-right"></i>
    </button>
  `;

  container.innerHTML = html;
}

function changePage(tableKey, page) {
  const state = adminTableState[tableKey];
  const totalPages = Math.ceil(state.filtered.length / state.perPage);
  state.page = Math.max(1, Math.min(page, totalPages));
  renderTable(tableKey);
}

function getPagedData(tableKey) {
  const state = adminTableState[tableKey];
  const start = (state.page - 1) * state.perPage;
  return state.filtered.slice(start, start + state.perPage);
}

function updateTableInfo(tableKey, infoId) {
  const state = adminTableState[tableKey];
  const el = document.getElementById(infoId);
  if (!el) return;
  const start = (state.page - 1) * state.perPage + 1;
  const end = Math.min(state.page * state.perPage, state.filtered.length);
  el.textContent = `Hiển thị ${start}–${end} / ${state.filtered.length} kết quả`;
}

// ============================================================
// RESTAURANTS TABLE
// ============================================================
function initRestaurantsTable() {
  const state = adminTableState.restaurants;
  state.data = [...ADMIN_DATA.restaurants];
  state.filtered = [...state.data];
  applySortToTable('restaurants');
  renderRestaurantsTable();
  initTableSearch('restaurants', 'restaurantSearchInput');
}

function renderRestaurantsTable() {
  const tbody = document.getElementById('restaurantsTbody');
  if (!tbody) return;

  const rows = getPagedData('restaurants');

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">
        <i class="bi bi-search" style="font-size:1.5rem;display:block;margin-bottom:.5rem"></i>
        Không tìm thấy quán ăn nào.
      </td></tr>`;
    renderPagination('restaurants', 'restaurantsPagination');
    updateTableInfo('restaurants', 'restaurantsInfo');
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <input type="checkbox" data-id="${r.id}" onchange="handleRowSelect('restaurants', '${r.id}', this.checked)">
      </td>
      <td>
        <div class="w2e-table-entity">
          <img class="w2e-table-entity__img" src="${r.image}" alt="${r.name}" onerror="this.src='https://picsum.photos/seed/${r.id}/80'">
          <div>
            <div class="w2e-table-entity__name">${r.name}</div>
            <div class="w2e-table-entity__sub"><i class="bi bi-geo-alt"></i> ${r.address.slice(0, 35)}${r.address.length > 35 ? '…' : ''}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="w2e-admin-badge w2e-admin-badge--active">${r.category}</span>
      </td>
      <td>
        <div class="w2e-table-rating">
          <i class="bi bi-star-fill"></i> ${r.rating.toFixed(1)}
          <span style="color:var(--text-muted);font-weight:400">(${r.reviewCount.toLocaleString('vi-VN')})</span>
        </div>
      </td>
      <td>
        <label class="w2e-toggle-switch" title="${r.isOpen ? 'Đang mở' : 'Đã đóng'}">
          <input type="checkbox" ${r.isOpen ? 'checked' : ''} onchange="toggleRestaurantStatus('${r.id}', 'isOpen', this.checked)">
          <span class="w2e-toggle-slider"></span>
        </label>
      </td>
      <td>
        <span class="w2e-admin-badge w2e-admin-badge--${r.status}">
          ${r.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
        </span>
      </td>
      <td>
        <label class="w2e-toggle-switch">
          <input type="checkbox" ${r.isFeatured ? 'checked' : ''} onchange="toggleRestaurantStatus('${r.id}', 'isFeatured', this.checked)">
          <span class="w2e-toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="w2e-admin-actions">
          <button class="w2e-admin-action-btn w2e-admin-action-btn--view" onclick="viewRestaurant('${r.id}')" title="Xem">
            <i class="bi bi-eye"></i>
          </button>
          <button class="w2e-admin-action-btn w2e-admin-action-btn--edit" onclick="editRestaurant('${r.id}')" title="Sửa">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="w2e-admin-action-btn w2e-admin-action-btn--delete" onclick="deleteRestaurant('${r.id}')" title="Xóa">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination('restaurants', 'restaurantsPagination');
  updateTableInfo('restaurants', 'restaurantsInfo');
}

function toggleRestaurantStatus(id, field, value) {
  const r = ADMIN_DATA.restaurants.find(r => r.id === id);
  if (!r) return;
  r[field] = value;

  const labels = { isOpen: value ? 'mở cửa' : 'đóng cửa', isFeatured: value ? 'nổi bật' : 'bỏ nổi bật', status: value ? 'kích hoạt' : 'tạm dừng' };
  toast.success(`Đã cập nhật trạng thái "${r.name}" → ${labels[field] || value}.`);
  adminTableState.restaurants.data = [...ADMIN_DATA.restaurants];
  filterTable('restaurants');
  renderRestaurantsTable();
}

function viewRestaurant(id) {
  window.open(`../pages/restaurant.html?id=${id}`, '_blank');
}

function editRestaurant(id) {
  const r = ADMIN_DATA.restaurants.find(r => r.id === id);
  if (!r) return;
  openRestaurantModal(r);
}

function deleteRestaurant(id) {
  const r = ADMIN_DATA.restaurants.find(r => r.id === id);
  if (!r) return;
  showConfirm({
    title: 'Xóa quán ăn?',
    message: `Bạn có chắc muốn xóa quán "<strong>${r.name}</strong>"? Toàn bộ ghi chú liên quan cũng sẽ bị xóa.`,
    confirmText: 'Xóa',
    type: 'danger',
    onConfirm: () => {
      ADMIN_DATA.restaurants = ADMIN_DATA.restaurants.filter(r => r.id !== id);
      adminTableState.restaurants.data = [...ADMIN_DATA.restaurants];
      filterTable('restaurants');
      renderRestaurantsTable();
      toast.success(`Đã xóa quán "${r.name}"!`);
    }
  });
}

// ============================================================
// RESTAURANT ADD/EDIT MODAL
// ============================================================
function openRestaurantModal(data = null) {
  let modal = document.getElementById('restaurantFormModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'w2e-modal-overlay';
    modal.id = 'restaurantFormModal';
    modal.innerHTML = `
      <div class="w2e-modal w2e-modal--lg">
        <div class="w2e-modal__header">
          <div class="w2e-modal__title" id="restaurantFormTitle">Thêm quán ăn</div>
          <button class="w2e-modal__close" onclick="hideModal('restaurantFormModal')"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="w2e-modal__body">
          <form id="restaurantAdminForm">
            <div class="w2e-admin-form-grid">
              <div class="w2e-form-group">
                <label class="w2e-form-label">Tên quán <span class="required">*</span></label>
                <input class="w2e-form-control" name="name" data-validate="required" data-label="Tên quán" placeholder="VD: Phở Thìn Bờ Hồ">
              </div>
              <div class="w2e-form-group">
                <label class="w2e-form-label">Danh mục <span class="required">*</span></label>
                <select class="w2e-form-control w2e-form-select" name="category" data-validate="required">
                  <option value="">-- Chọn danh mục --</option>
                  <option value="Phở">Phở</option>
                  <option value="Bún">Bún</option>
                  <option value="Cơm">Cơm</option>
                  <option value="Bánh mì">Bánh mì</option>
                  <option value="Lẩu">Lẩu</option>
                  <option value="Cà phê">Cà phê</option>
                  <option value="Tráng miệng">Tráng miệng</option>
                  <option value="Đồ uống">Đồ uống</option>
                </select>
              </div>
            </div>
            <div class="w2e-form-group">
              <label class="w2e-form-label">Địa chỉ <span class="required">*</span></label>
              <input class="w2e-form-control" name="address" data-validate="required" data-label="Địa chỉ" placeholder="Số nhà, tên đường, quận, thành phố">
            </div>
            <div class="w2e-admin-form-grid">
              <div class="w2e-form-group">
                <label class="w2e-form-label">Giờ mở cửa</label>
                <input class="w2e-form-control" name="openTime" placeholder="VD: 06:00 – 22:00">
              </div>
              <div class="w2e-form-group">
                <label class="w2e-form-label">Khoảng giá (VNĐ)</label>
                <input class="w2e-form-control" name="priceRange" placeholder="VD: 50.000 – 150.000">
              </div>
            </div>
            <div class="w2e-form-group">
              <label class="w2e-form-label">Mô tả</label>
              <textarea class="w2e-form-control w2e-form-textarea" name="description" rows="3" placeholder="Mô tả ngắn về quán ăn..."></textarea>
            </div>
            <div class="w2e-form-group">
              <label class="w2e-form-label">Ảnh đại diện (URL)</label>
              <input class="w2e-form-control" name="image" placeholder="https://...">
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
              <label class="w2e-check-label">
                <input type="checkbox" name="isFeatured"> Đánh dấu nổi bật
              </label>
              <label class="w2e-check-label">
                <input type="checkbox" name="isOpen" checked> Đang mở cửa
              </label>
            </div>
          </form>
        </div>
        <div class="w2e-modal__footer">
          <button class="w2e-btn w2e-btn--ghost" onclick="hideModal('restaurantFormModal')">Hủy</button>
          <button class="w2e-btn w2e-btn--primary" onclick="submitRestaurantForm()">
            <i class="bi bi-check-lg"></i> Lưu
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const form = document.getElementById('restaurantAdminForm');
  const title = document.getElementById('restaurantFormTitle');

  form.reset();
  form.setAttribute('data-edit-id', data ? data.id : '');

  if (data) {
    title.textContent = 'Chỉnh sửa quán ăn';
    form.querySelector('[name="name"]').value = data.name || '';
    form.querySelector('[name="category"]').value = data.category || '';
    form.querySelector('[name="address"]').value = data.address || '';
    form.querySelector('[name="openTime"]').value = data.openTime || '';
    form.querySelector('[name="image"]').value = data.image || '';
    form.querySelector('[name="isFeatured"]').checked = !!data.isFeatured;
    form.querySelector('[name="isOpen"]').checked = !!data.isOpen;
  } else {
    title.textContent = 'Thêm quán ăn mới';
  }

  showModal('restaurantFormModal');
}

function submitRestaurantForm() {
  const form = document.getElementById('restaurantAdminForm');
  if (!form) return;
  if (!validateForm(form)) {
    toast.error('Vui lòng điền đầy đủ thông tin!');
    return;
  }

  const editId = form.getAttribute('data-edit-id');
  const formData = {
    name:        form.querySelector('[name="name"]').value,
    category:    form.querySelector('[name="category"]').value,
    address:     form.querySelector('[name="address"]').value,
    openTime:    form.querySelector('[name="openTime"]').value,
    priceRange:  form.querySelector('[name="priceRange"]').value,
    description: form.querySelector('[name="description"]').value,
    image:       form.querySelector('[name="image"]').value || `https://picsum.photos/seed/${Date.now()}/80/80`,
    isFeatured:  form.querySelector('[name="isFeatured"]').checked,
    isOpen:      form.querySelector('[name="isOpen"]').checked,
    status:      'active',
    rating:      0,
    reviewCount: 0,
  };

  if (editId) {
    const idx = ADMIN_DATA.restaurants.findIndex(r => r.id === editId);
    if (idx !== -1) {
      ADMIN_DATA.restaurants[idx] = { ...ADMIN_DATA.restaurants[idx], ...formData };
      toast.success(`Đã cập nhật quán "${formData.name}"!`);
    }
  } else {
    const newRest = { id: 'r' + Date.now(), createdAt: new Date().toISOString().split('T')[0], ...formData };
    ADMIN_DATA.restaurants.unshift(newRest);
    toast.success(`Đã thêm quán "${formData.name}"!`);
  }

  adminTableState.restaurants.data = [...ADMIN_DATA.restaurants];
  filterTable('restaurants');
  renderRestaurantsTable();
  hideModal('restaurantFormModal');
}

// ============================================================
// CATEGORIES TABLE
// ============================================================
function initCategoriesTable() {
  const state = adminTableState.categories;
  state.data = [...ADMIN_DATA.categories];
  state.filtered = [...state.data];
  applySortToTable('categories');
  renderCategoriesTable();
  initTableSearch('categories', 'categorySearchInput');
}

function renderCategoriesTable() {
  const tbody = document.getElementById('categoriesTbody');
  if (!tbody) return;

  const rows = getPagedData('categories');

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Không tìm thấy danh mục nào.</td></tr>`;
    renderPagination('categories', 'categoriesPagination');
    return;
  }

  tbody.innerHTML = rows.map(cat => `
    <tr>
      <td>
        <div class="w2e-table-entity">
          <div class="w2e-monogram">${initialLetter(cat.name)}</div>
          <div>
            <div class="w2e-table-entity__name">${cat.name}</div>
            <div class="w2e-table-entity__sub">${cat.description}</div>
          </div>
        </div>
      </td>
      <td style="text-align:center">
        <strong>${cat.restaurantCount}</strong> quán
      </td>
      <td style="text-align:center">
        <strong>${cat.noteCount}</strong> ghi chú
      </td>
      <td>
        <span class="w2e-admin-badge w2e-admin-badge--${cat.status}">
          ${cat.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
        </span>
      </td>
      <td>
        <label class="w2e-toggle-switch">
          <input type="checkbox" ${cat.status === 'active' ? 'checked' : ''} onchange="toggleCategoryStatus('${cat.id}', this.checked)">
          <span class="w2e-toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="w2e-admin-actions">
          <button class="w2e-admin-action-btn w2e-admin-action-btn--edit" onclick="editCategory('${cat.id}')" title="Sửa">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="w2e-admin-action-btn w2e-admin-action-btn--delete" onclick="deleteCategory('${cat.id}')" title="Xóa">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination('categories', 'categoriesPagination');
  updateTableInfo('categories', 'categoriesInfo');
}

function toggleCategoryStatus(id, active) {
  const cat = ADMIN_DATA.categories.find(c => c.id === id);
  if (!cat) return;
  cat.status = active ? 'active' : 'inactive';
  adminTableState.categories.data = [...ADMIN_DATA.categories];
  filterTable('categories');
  renderCategoriesTable();
  toast.success(`Danh mục "${cat.name}" đã được ${active ? 'kích hoạt' : 'tạm dừng'}.`);
}

function editCategory(id) {
  const cat = ADMIN_DATA.categories.find(c => c.id === id);
  if (!cat) return;
  openCategoryModal(cat);
}

function deleteCategory(id) {
  const cat = ADMIN_DATA.categories.find(c => c.id === id);
  if (!cat) return;
  showConfirm({
    title: 'Xóa danh mục?',
    message: `Bạn có chắc muốn xóa danh mục "<strong>${cat.name}</strong>"?`,
    confirmText: 'Xóa',
    type: 'danger',
    onConfirm: () => {
      ADMIN_DATA.categories = ADMIN_DATA.categories.filter(c => c.id !== id);
      adminTableState.categories.data = [...ADMIN_DATA.categories];
      filterTable('categories');
      renderCategoriesTable();
      toast.success(`Đã xóa danh mục "${cat.name}"!`);
    }
  });
}

function openCategoryModal(data = null) {
  let modal = document.getElementById('categoryFormModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'w2e-modal-overlay';
    modal.id = 'categoryFormModal';
    modal.innerHTML = `
      <div class="w2e-modal w2e-modal--sm">
        <div class="w2e-modal__header">
          <div class="w2e-modal__title" id="categoryFormTitle">Thêm danh mục</div>
          <button class="w2e-modal__close" onclick="hideModal('categoryFormModal')"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="w2e-modal__body">
          <form id="categoryAdminForm">
            <div class="w2e-form-group">
              <label class="w2e-form-label">Tên danh mục <span class="required">*</span></label>
              <input class="w2e-form-control" name="name" data-validate="required" data-label="Tên danh mục" placeholder="VD: Phở">
            </div>
            <div class="w2e-form-group">
              <label class="w2e-form-label">Mô tả</label>
              <textarea class="w2e-form-control w2e-form-textarea" name="description" rows="3" placeholder="Mô tả về danh mục..."></textarea>
            </div>
          </form>
        </div>
        <div class="w2e-modal__footer">
          <button class="w2e-btn w2e-btn--ghost" onclick="hideModal('categoryFormModal')">Hủy</button>
          <button class="w2e-btn w2e-btn--primary" onclick="submitCategoryForm()">
            <i class="bi bi-check-lg"></i> Lưu
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const form = document.getElementById('categoryAdminForm');
  form.reset();
  form.setAttribute('data-edit-id', data ? data.id : '');
  document.getElementById('categoryFormTitle').textContent = data ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới';

  if (data) {
    form.querySelector('[name="name"]').value = data.name || '';
    form.querySelector('[name="description"]').value = data.description || '';
  }

  showModal('categoryFormModal');
}

function submitCategoryForm() {
  const form = document.getElementById('categoryAdminForm');
  if (!form || !validateForm(form)) {
    toast.error('Vui lòng điền đầy đủ thông tin!');
    return;
  }

  const editId = form.getAttribute('data-edit-id');
  const formData = {
    name:        form.querySelector('[name="name"]').value.trim(),
    description: form.querySelector('[name="description"]').value.trim(),
    status:      'active',
  };

  if (editId) {
    const idx = ADMIN_DATA.categories.findIndex(c => c.id === editId);
    if (idx !== -1) ADMIN_DATA.categories[idx] = { ...ADMIN_DATA.categories[idx], ...formData };
    toast.success(`Đã cập nhật danh mục "${formData.name}"!`);
  } else {
    ADMIN_DATA.categories.unshift({ id: 'c' + Date.now(), restaurantCount: 0, noteCount: 0, ...formData });
    toast.success(`Đã thêm danh mục "${formData.name}"!`);
  }

  adminTableState.categories.data = [...ADMIN_DATA.categories];
  filterTable('categories');
  renderCategoriesTable();
  hideModal('categoryFormModal');
}

// ============================================================
// USERS TABLE
// ============================================================
function initUsersTable() {
  const state = adminTableState.users;
  state.data = [...ADMIN_DATA.users];
  state.filtered = [...state.data];
  applySortToTable('users');
  renderUsersTable();
  initTableSearch('users', 'userSearchInput');
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTbody');
  if (!tbody) return;

  const rows = getPagedData('users');

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Không tìm thấy người dùng.</td></tr>`;
    renderPagination('users', 'usersPagination');
    return;
  }

  tbody.innerHTML = rows.map(u => `
    <tr>
      <td>
        <div class="w2e-table-entity">
          <img class="w2e-table-entity__img w2e-table-entity__img-circle" src="${u.avatar}" alt="${u.name}" onerror="this.src='https://i.pravatar.cc/40?img=1'">
          <div>
            <div class="w2e-table-entity__name">${u.name}</div>
            <div class="w2e-table-entity__sub">${u.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="w2e-admin-badge w2e-admin-badge--${u.role}">${u.role === 'admin' ? 'Quản trị' : 'Người dùng'}</span>
      </td>
      <td>
        <span class="w2e-admin-badge w2e-admin-badge--${u.status}">
          ${u.status === 'active' ? 'Hoạt động' : u.status === 'banned' ? 'Đã cấm' : 'Không hoạt động'}
        </span>
      </td>
      <td style="text-align:center">${u.noteCount} bài</td>
      <td>${formatDateVN(u.joinDate)}</td>
      <td>${formatDateVN(u.lastActive)}</td>
      <td>
        <div class="w2e-admin-actions">
          <button
            class="w2e-admin-action-btn w2e-admin-action-btn--${u.status === 'banned' ? 'unban' : 'ban'}"
            onclick="toggleUserBan('${u.id}')"
            title="${u.status === 'banned' ? 'Bỏ cấm' : 'Cấm người dùng'}"
          >
            <i class="bi bi-${u.status === 'banned' ? 'shield-check' : 'shield-x'}"></i>
          </button>
          <button class="w2e-admin-action-btn w2e-admin-action-btn--view" onclick="viewUserNotes('${u.id}')" title="Xem ghi chú">
            <i class="bi bi-journal-text"></i>
          </button>
          <button class="w2e-admin-action-btn w2e-admin-action-btn--delete" onclick="deleteUser('${u.id}')" title="Xóa tài khoản">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination('users', 'usersPagination');
  updateTableInfo('users', 'usersInfo');
}

function toggleUserBan(id) {
  const u = ADMIN_DATA.users.find(u => u.id === id);
  if (!u) return;

  if (u.role === 'admin') {
    toast.error('Không thể cấm tài khoản quản trị viên!');
    return;
  }

  const isBanned = u.status === 'banned';
  showConfirm({
    title: isBanned ? 'Bỏ cấm người dùng?' : 'Cấm người dùng?',
    message: `${isBanned ? 'Bỏ cấm' : 'Cấm'} tài khoản "<strong>${u.name}</strong>" (${u.email})?`,
    confirmText: isBanned ? 'Bỏ cấm' : 'Cấm',
    type: isBanned ? 'warning' : 'danger',
    onConfirm: () => {
      u.status = isBanned ? 'active' : 'banned';
      adminTableState.users.data = [...ADMIN_DATA.users];
      filterTable('users');
      renderUsersTable();
      toast.success(`Đã ${isBanned ? 'bỏ cấm' : 'cấm'} người dùng "${u.name}"!`);
    }
  });
}

function viewUserNotes(id) {
  const u = ADMIN_DATA.users.find(u => u.id === id);
  toast.info(`Đang xem ghi chú của ${u ? u.name : 'người dùng'}...`);
}

function deleteUser(id) {
  const u = ADMIN_DATA.users.find(u => u.id === id);
  if (!u) return;
  if (u.role === 'admin') {
    toast.error('Không thể xóa tài khoản quản trị viên!');
    return;
  }
  showConfirm({
    title: 'Xóa tài khoản?',
    message: `Bạn có chắc muốn xóa tài khoản "<strong>${u.name}</strong>"? Hành động không thể hoàn tác.`,
    confirmText: 'Xóa',
    type: 'danger',
    onConfirm: () => {
      ADMIN_DATA.users = ADMIN_DATA.users.filter(u => u.id !== id);
      adminTableState.users.data = [...ADMIN_DATA.users];
      filterTable('users');
      renderUsersTable();
      toast.success(`Đã xóa tài khoản "${u.name}"!`);
    }
  });
}

// ============================================================
// FOOD NOTES TABLE (ADMIN)
// ============================================================
function initFoodNotesAdminTable() {
  const state = adminTableState.foodNotes;
  state.data = [...ADMIN_DATA.foodNotes];
  state.filtered = [...state.data];
  applySortToTable('foodNotes');
  renderFoodNotesTable();
  initTableSearch('foodNotes', 'noteSearchInput');
}

function renderFoodNotesTable() {
  const tbody = document.getElementById('foodNotesTbody');
  if (!tbody) return;

  const rows = getPagedData('foodNotes');

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Không tìm thấy ghi chú nào.</td></tr>`;
    renderPagination('foodNotes', 'notesPagination');
    return;
  }

  tbody.innerHTML = rows.map(n => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text);margin-bottom:2px">${n.title}</div>
        <div style="font-size:.75rem;color:var(--text-secondary)"><i class="bi bi-shop"></i> ${n.restaurant}</div>
      </td>
      <td>${n.author}</td>
      <td>
        <div class="w2e-stars-text">${'★'.repeat(n.rating)}${'☆'.repeat(5 - n.rating)}</div>
      </td>
      <td>
        <span class="w2e-admin-badge w2e-admin-badge--${n.status}">
          ${n.status === 'approved' ? 'Đã duyệt' : n.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
        </span>
      </td>
      <td>
        <span class="w2e-admin-badge w2e-admin-badge--${n.isPublic ? 'public' : 'private'}">
          ${n.isPublic ? 'Công khai' : 'Riêng tư'}
        </span>
      </td>
      <td>${formatDateVN(n.date)}</td>
      <td>
        <div class="w2e-admin-actions">
          ${n.status === 'pending' ? `
            <button class="w2e-admin-action-btn w2e-admin-action-btn--approve" onclick="approveNote('${n.id}')" title="Duyệt">
              <i class="bi bi-check-lg"></i>
            </button>
            <button class="w2e-admin-action-btn w2e-admin-action-btn--ban" onclick="rejectNote('${n.id}')" title="Từ chối">
              <i class="bi bi-x-lg"></i>
            </button>
          ` : ''}
          <button class="w2e-admin-action-btn w2e-admin-action-btn--view" onclick="previewNote('${n.id}')" title="Xem">
            <i class="bi bi-eye"></i>
          </button>
          <button class="w2e-admin-action-btn w2e-admin-action-btn--${n.isPublic ? 'feature' : 'approve'}" onclick="toggleNoteVisibility('${n.id}')" title="${n.isPublic ? 'Ẩn' : 'Hiện'}">
            <i class="bi bi-${n.isPublic ? 'eye-slash' : 'eye'}"></i>
          </button>
          <button class="w2e-admin-action-btn w2e-admin-action-btn--delete" onclick="adminDeleteNote('${n.id}')" title="Xóa">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination('foodNotes', 'notesPagination');
  updateTableInfo('foodNotes', 'notesInfo');
}

function approveNote(id) {
  const note = ADMIN_DATA.foodNotes.find(n => n.id === id);
  if (!note) return;
  note.status = 'approved';
  adminTableState.foodNotes.data = [...ADMIN_DATA.foodNotes];
  filterTable('foodNotes');
  renderFoodNotesTable();
  toast.success(`Đã duyệt ghi chú "${note.title}"!`);
}

function rejectNote(id) {
  const note = ADMIN_DATA.foodNotes.find(n => n.id === id);
  if (!note) return;
  showConfirm({
    title: 'Từ chối ghi chú?',
    message: `Từ chối ghi chú "<strong>${note.title}</strong>" của ${note.author}?`,
    confirmText: 'Từ chối',
    type: 'danger',
    onConfirm: () => {
      note.status = 'rejected';
      adminTableState.foodNotes.data = [...ADMIN_DATA.foodNotes];
      filterTable('foodNotes');
      renderFoodNotesTable();
      toast.success(`Đã từ chối ghi chú "${note.title}".`);
    }
  });
}

function toggleNoteVisibility(id) {
  const note = ADMIN_DATA.foodNotes.find(n => n.id === id);
  if (!note) return;
  note.isPublic = !note.isPublic;
  adminTableState.foodNotes.data = [...ADMIN_DATA.foodNotes];
  filterTable('foodNotes');
  renderFoodNotesTable();
  toast.success(`Ghi chú đã được ${note.isPublic ? 'hiển thị công khai' : 'ẩn'}.`);
}

function previewNote(id) {
  const note = ADMIN_DATA.foodNotes.find(n => n.id === id);
  toast.info(`Xem trước: "${note ? note.title : id}"`);
}

function adminDeleteNote(id) {
  const note = ADMIN_DATA.foodNotes.find(n => n.id === id);
  if (!note) return;
  showConfirm({
    title: 'Xóa ghi chú?',
    message: `Xóa ghi chú "<strong>${note.title}</strong>" của <strong>${note.author}</strong>?`,
    confirmText: 'Xóa',
    type: 'danger',
    onConfirm: () => {
      ADMIN_DATA.foodNotes = ADMIN_DATA.foodNotes.filter(n => n.id !== id);
      adminTableState.foodNotes.data = [...ADMIN_DATA.foodNotes];
      filterTable('foodNotes');
      renderFoodNotesTable();
      toast.success(`Đã xóa ghi chú "${note.title}"!`);
    }
  });
}

// ============================================================
// SIDEBAR TOGGLE (ADMIN)
// ============================================================
function initAdminSidebar() {
  const sidebar    = document.querySelector('.w2e-sidebar');
  const toggleBtn  = document.querySelector('.w2e-sidebar__toggle');
  const overlay    = document.querySelector('.w2e-sidebar-overlay');
  const mainArea   = document.querySelector('.w2e-admin-main');

  if (!sidebar) return;

  // Desktop collapse/expand
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      if (mainArea) mainArea.classList.toggle('collapsed', isCollapsed);
      setLS('w2e_sidebar_collapsed', isCollapsed);
    });
  }

  // Restore sidebar state on desktop
  const savedCollapsed = getLS('w2e_sidebar_collapsed');
  if (savedCollapsed && window.innerWidth > 1024) {
    sidebar.classList.add('collapsed');
    if (mainArea) mainArea.classList.add('collapsed');
  }

  // Mobile open/close
  const mobileToggle = document.querySelector('.w2e-admin-mobile-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // Active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.w2e-sidebar__nav-item').forEach(item => {
    const href = item.getAttribute('href') || item.getAttribute('data-href') || '';
    const fileName = currentPath.split('/').pop();
    if (href && href.includes(fileName) && fileName) {
      item.classList.add('active');
    }
  });
}

// ============================================================
// FILTER BY STATUS (ADMIN TABLES)
// ============================================================
function initAdminStatusFilter(tableKey) {
  document.querySelectorAll(`[data-admin-filter-${tableKey}]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute(`data-admin-filter-${tableKey}`);
      document.querySelectorAll(`[data-admin-filter-${tableKey}]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const state = adminTableState[tableKey];
      if (filter === 'all') {
        state.filtered = [...state.data];
      } else {
        state.filtered = state.data.filter(row => {
          return row.status === filter || row.isOpen === (filter === 'open') || row.role === filter;
        });
      }
      state.page = 1;
      renderTable(tableKey);
    });
  });
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initAdminSidebar();
  updateAdminStats();

  // Init tables based on current page
  if (document.getElementById('restaurantsTbody'))  initRestaurantsTable();
  if (document.getElementById('categoriesTbody'))   initCategoriesTable();
  if (document.getElementById('usersTbody'))        initUsersTable();
  if (document.getElementById('foodNotesTbody'))    initFoodNotesAdminTable();

  // Status filters
  initAdminStatusFilter('restaurants');
  initAdminStatusFilter('users');
  initAdminStatusFilter('foodNotes');

  // Add buttons
  document.getElementById('addRestaurantBtn')?.addEventListener('click', () => openRestaurantModal());
  document.getElementById('addCategoryBtn')?.addEventListener('click',  () => openCategoryModal());
});

// ============================================================
// EXPOSE TO GLOBAL
// ============================================================
window.sortTable = sortTable;
window.changePage = changePage;
window.toggleRestaurantStatus = toggleRestaurantStatus;
window.viewRestaurant = viewRestaurant;
window.editRestaurant = editRestaurant;
window.deleteRestaurant = deleteRestaurant;
window.submitRestaurantForm = submitRestaurantForm;
window.toggleCategoryStatus = toggleCategoryStatus;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.submitCategoryForm = submitCategoryForm;
window.toggleUserBan = toggleUserBan;
window.viewUserNotes = viewUserNotes;
window.deleteUser = deleteUser;
window.approveNote = approveNote;
window.rejectNote = rejectNote;
window.toggleNoteVisibility = toggleNoteVisibility;
window.previewNote = previewNote;
window.adminDeleteNote = adminDeleteNote;
window.openRestaurantModal = openRestaurantModal;
window.openCategoryModal = openCategoryModal;
window.ADMIN_DATA = ADMIN_DATA;
window.adminTableState = adminTableState;
