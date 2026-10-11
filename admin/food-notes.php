<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Food Notes – What2Eat Admin';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= w2e_escape($pageTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="../assets/css/style.css" />
  <link rel="stylesheet" href="../assets/css/admin.css" />
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body>

<div class="w2e-sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>

<div class="w2e-admin-wrapper">

  <!-- ===== SIDEBAR ===== -->
  <aside class="w2e-sidebar" id="sidebar">
    <a href="./index.php" class="w2e-sidebar-brand">

      <div class="w2e-sidebar-brand-text">
        <span class="w2e-sidebar-brand-title">What2Eat</span>
        <span class="w2e-sidebar-brand-sub">Admin Panel</span>
      </div>
    </a>
    <nav class="w2e-sidebar-nav">
      <div class="w2e-sidebar-section-title">Tổng quan</div>
      <a href="./index.php" class="w2e-sidebar-link">
      Dashboard
      </a>
      <div class="w2e-sidebar-section-title">Quản lý</div>
      <a href="./restaurants.php" class="w2e-sidebar-link">
      Quản lý Quán ăn
      </a>
      <a href="./categories.php" class="w2e-sidebar-link">
      Danh mục
      </a>
      <a href="./users.php" class="w2e-sidebar-link">
      Người dùng
      </a>
      <a href="./food-notes.php" class="w2e-sidebar-link active">
      Food Note
        <span class="w2e-link-badge" id="pendingNoteBadge">—</span>
      </a>
      <a href="./audit-logs.php" class="w2e-sidebar-link">Nhật ký hoạt động</a>
      <div class="w2e-sidebar-divider"></div>
    </nav>
    <div class="w2e-sidebar-footer">
      <div class="w2e-sidebar-admin">
        <img data-admin-avatar="true" alt="Admin" class="w2e-sidebar-admin-avatar" />
        <div class="w2e-sidebar-admin-info">
          <div class="w2e-sidebar-admin-name">Admin</div>
          <div class="w2e-sidebar-admin-role">Quản trị viên</div>
        </div>
      </div>
      <a href="../pages/login.php" class="w2e-sidebar-link">
      Đăng xuất
      </a>
    </div>
  </aside>

  <!-- ===== MAIN ===== -->
  <main class="w2e-main">

    <!-- Top Bar -->
    <div class="w2e-topbar">
      <div class="w2e-topbar-left">
        <button class="w2e-hamburger" onclick="toggleSidebar()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div>
          <div class="w2e-topbar-title">Kiểm duyệt Food Note</div>
          <div class="w2e-topbar-breadcrumb">Admin / Food Note</div>
        </div>
      </div>
      <div class="w2e-topbar-right">
      <div class="w2e-topbar-notify"><i class="bi bi-bell"></i><span class="w2e-topbar-notify-dot"></span></div>
        <div class="w2e-topbar-admin">
          <img data-admin-avatar="true" alt="Admin" class="w2e-topbar-admin-avatar" />
          <div>
            <div class="w2e-topbar-admin-name">Admin</div>
            <span class="w2e-topbar-admin-badge">Admin</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Page Content -->
    <div class="w2e-page-content">

      <!-- TOP ROW: Tabs + Chart -->
      <div class="row g-3 mb-4">

        <!-- Tabs + Bulk Actions -->
        <div class="col-12 col-xl-8">

          <!-- Filter Tabs -->
          <div class="w2e-admin-card mb-3">
            <div class="w2e-admin-card-body" style="padding: 14px 18px;">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div class="w2e-tabs" id="fnTabs">
                  <button class="w2e-tab-btn active" onclick="filterTab(this, 'all')">Tất cả <span>(—)</span></button>
                  <button class="w2e-tab-btn" onclick="filterTab(this, 'pending')">Chờ duyệt <span>(—)</span></button>
                  <button class="w2e-tab-btn" onclick="filterTab(this, 'approved')">Đã duyệt <span>(—)</span></button>
                  <button class="w2e-tab-btn" onclick="filterTab(this, 'hidden')">Đã ẩn <span>(—)</span></button>
                </div>
                <div style="font-size: 13px; color: var(--w2e-text-secondary);">
                  Bộ lọc đang hoạt động: <strong id="currentFilter" style="color: var(--w2e-primary);">Tất cả</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Bulk Actions Bar -->
          <div class="w2e-admin-card mb-3" id="bulkBar" style="display: none;">
            <div class="w2e-admin-card-body" style="padding: 12px 18px; background: rgba(212,160,23,0.06);">
              <div class="d-flex align-items-center gap-12 flex-wrap" style="gap: 12px;">
                <span id="selectedCount" style="font-size: 13px; font-weight: 600; color: var(--w2e-primary);">0 mục đã chọn</span>
                <button class="w2e-btn w2e-btn-success w2e-btn-sm" onclick="bulkApprove()">Duyệt tất cả đã chọn</button>
                <button class="w2e-btn w2e-btn-warning w2e-btn-sm" onclick="bulkHide()">Ẩn tất cả đã chọn</button>
                <button class="w2e-btn w2e-btn-outline w2e-btn-sm" onclick="clearSelection()">Bỏ chọn</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Donut Chart -->
        <div class="col-12 col-xl-4">
          <div class="w2e-admin-card h-100">
            <div class="w2e-admin-card-header" style="padding: 14px 18px;">
            <div class="w2e-admin-card-title" style="font-size: 14px;">Phân bổ Food Note</div>
            </div>
            <div class="w2e-admin-card-body" style="display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;">
              <div style="width: 130px; height: 130px; position: relative;">
                <canvas id="donutChart"></canvas>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width:12px;height:12px;border-radius:3px;background:var(--success);"></div>
                  <span style="font-size:13px; color: var(--w2e-text);">Đã duyệt: <strong id="approvedNoteCount">0</strong></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width:12px;height:12px;border-radius:3px;background:var(--warning);"></div>
                  <span style="font-size:13px; color: var(--w2e-text);">Chờ duyệt: <strong id="pendingNoteCount">0</strong></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width:12px;height:12px;border-radius:3px;background:var(--text-secondary);"></div>
                  <span style="font-size:13px; color: var(--w2e-text);">Đã ẩn: <strong id="hiddenNoteCount">0</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Food Note Table -->
      <div class="w2e-admin-card">
        <div class="w2e-admin-card-header">
        <div class="w2e-admin-card-title">Danh sách Food Note</div>
                <div id="fnTableDescription" style="font-size: 13px; color: var(--w2e-text-secondary);">Danh sách Food Note trong hệ thống</div>
        </div>

        <div class="w2e-table-wrapper">
          <table class="w2e-table" id="fnTable">
            <thead>
              <tr>
                <th style="width:40px;">
                  <input type="checkbox" class="w2e-checkbox" id="selectAll" onchange="toggleSelectAll(this)" title="Chọn tất cả" />
                </th>
                <th style="width:40px;">#</th>
                <th>Tên Món</th>
                <th>Người đăng</th>
                <th style="text-align:center;">Rating</th>
                <th>Địa điểm</th>
                <th>Ngày đăng</th>
                <th>Trạng thái</th>
                <th style="width:130px;">Thao tác</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="w2e-pagination">
          <div class="w2e-page-info" id="fnResultsSummary">Đang tải danh sách…</div>
          <div class="w2e-page-btns">
            <button id="fnPrevPage" class="w2e-page-btn" type="button" aria-label="Trang trước">‹</button>
            <span id="fnPageLabel" class="w2e-page-btn">—</span>
            <button id="fnNextPage" class="w2e-page-btn" type="button" aria-label="Trang sau">›</button>
          </div>
        </div>
      </div><!-- end table card -->
    </div><!-- end page content -->
  </main>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
// Sidebar
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

// Donut Chart
const donutCtx = document.getElementById('donutChart').getContext('2d');
new Chart(donutCtx, {
  type: 'doughnut',
  data: {
    labels: ['Đã duyệt', 'Chờ duyệt', 'Đã ẩn'],
    datasets: [{
      data: [],
      backgroundColor: ['#2D9B6F', '#F0A500', '#6F6258'],
      borderWidth: 3,
      borderColor: '#fff',
      hoverOffset: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#4A2C1A',
        titleFont: { family: "'Be Vietnam Pro', sans-serif", size: 12 },
        bodyFont: { family: "'Be Vietnam Pro', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8
      }
    }
  }
});

// Tab filtering
const filterLabels = { all: 'Tất cả', pending: 'Chờ duyệt', approved: 'Đã duyệt', hidden: 'Đã ẩn' };

function filterTab(btn, status) {
  document.querySelectorAll('.w2e-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('currentFilter').textContent = filterLabels[status];

  const rows = document.querySelectorAll('#fnTable tbody tr');
  rows.forEach(row => {
    if (status === 'all' || row.dataset.status === status) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });

  // Clear checkboxes when switching tab
  clearSelection();
}

// Checkbox Select All
function toggleSelectAll(master) {
  const visibleChecks = getVisibleChecks();
  visibleChecks.forEach(cb => cb.checked = master.checked);
  updateBulkBar();
}

function getVisibleChecks() {
  return Array.from(document.querySelectorAll('.fn-check')).filter(cb => {
    return cb.closest('tr').style.display !== 'none';
  });
}

function updateBulkBar() {
  const checked = document.querySelectorAll('.fn-check:checked');
  const bulkBar = document.getElementById('bulkBar');
  const selectedCount = document.getElementById('selectedCount');

  if (checked.length > 0) {
    bulkBar.style.display = 'block';
    selectedCount.textContent = `${checked.length} mục đã chọn`;
  } else {
    bulkBar.style.display = 'none';
  }

  // Sync select all state
  const allVisible = getVisibleChecks();
  const allChecked = allVisible.length > 0 && allVisible.every(cb => cb.checked);
  document.getElementById('selectAll').checked = allChecked;
  document.getElementById('selectAll').indeterminate = !allChecked && checked.length > 0;
}

function clearSelection() {
  document.querySelectorAll('.fn-check, #selectAll').forEach(cb => cb.checked = false);
  document.getElementById('selectAll').indeterminate = false;
  document.getElementById('bulkBar').style.display = 'none';
}

// Approve single
function approveFn(btn) {
  const row = btn.closest('tr');
  const badge = row.querySelector('.w2e-badge');
  badge.className = 'w2e-badge w2e-badge-approved';
  badge.textContent = 'Đã duyệt';
  row.dataset.status = 'approved';
  // Remove approve btn
  btn.remove();
}

// Hide single
function hideFn(btn) {
  const row = btn.closest('tr');
  const badge = row.querySelector('.w2e-badge');
  badge.className = 'w2e-badge w2e-badge-hidden';
  badge.textContent = 'Đã ẩn';
  row.dataset.status = 'hidden';
  btn.remove();
}

// Bulk approve
function bulkApprove() {
  document.querySelectorAll('.fn-check:checked').forEach(cb => {
    const row = cb.closest('tr');
    const badge = row.querySelector('.w2e-badge');
    if (badge) {
      badge.className = 'w2e-badge w2e-badge-approved';
      badge.textContent = 'Đã duyệt';
      row.dataset.status = 'approved';
    }
    cb.checked = false;
  });
  clearSelection();
}

// Bulk hide
function bulkHide() {
  document.querySelectorAll('.fn-check:checked').forEach(cb => {
    const row = cb.closest('tr');
    const badge = row.querySelector('.w2e-badge');
    if (badge) {
      badge.className = 'w2e-badge w2e-badge-hidden';
      badge.textContent = 'Đã ẩn';
      row.dataset.status = 'hidden';
    }
    cb.checked = false;
  });
  clearSelection();
}

// Pagination
document.querySelectorAll('.w2e-page-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    if (this.textContent === '‹' || this.textContent === '›') return;
    document.querySelectorAll('.w2e-page-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});
</script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
