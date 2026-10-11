<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Admin Dashboard – What2Eat';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title><?= w2e_escape($pageTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet"/>
  <link rel="stylesheet" href="../assets/css/style.css"/>
  <link rel="stylesheet" href="../assets/css/admin.css"/>
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body class="admin-body">

<!-- Sidebar -->
<div class="admin-sidebar" id="adminSidebar">
  <div class="sidebar-brand">

    <span class="brand-name">What2Eat</span>
    <span class="badge bg-warning text-dark ms-1" style="font-size:10px;">Admin</span>
  </div>
  <nav class="sidebar-nav">
    <a href="./index.php" class="sidebar-link active">
      <i class="bi bi-speedometer2"></i> Dashboard
    </a>
    <a href="./restaurants.php" class="sidebar-link">
      <i class="bi bi-shop"></i> Quản lý Quán ăn
    </a>
    <a href="./categories.php" class="sidebar-link">
      <i class="bi bi-grid-3x3-gap"></i> Danh mục
    </a>
    <a href="./users.php" class="sidebar-link">
      <i class="bi bi-people"></i> Người dùng
    </a>
    <a href="./food-notes.php" class="sidebar-link">
      <i class="bi bi-journal-text"></i> Food Note
    </a>
    <a href="./audit-logs.php" class="sidebar-link">
      <i class="bi bi-clock-history"></i> Nhật ký hoạt động
    </a>
    <hr class="sidebar-divider"/>
    <a href="../pages/login.php" class="sidebar-link text-danger">
      <i class="bi bi-box-arrow-left"></i> Đăng xuất
    </a>
  </nav>
</div>

<!-- Main Content -->
<div class="admin-main" id="adminMain">
  <!-- Top Bar -->
  <div class="admin-topbar">
    <button class="btn btn-link sidebar-toggle" id="sidebarToggle">
      <i class="bi bi-list fs-4 text-dark"></i>
    </button>
    <h5 class="topbar-title mb-0">Dashboard</h5>
    <div class="topbar-right">
      <span class="text-secondary small me-3">Đang tải…</span>
      <div class="d-flex align-items-center gap-2">
        <img data-admin-avatar="true" class="rounded-circle" width="36" height="36" alt="Admin"/>
        <div>
          <div class="fw-600 small">Admin</div>
          <span class="badge bg-warning text-dark" style="font-size:10px;">Admin</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="admin-content">

    <!-- Stat Cards -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="admin-stat-card">
          <div class="stat-icon bg-primary-soft"><i class="bi bi-people-fill text-primary"></i></div>
          <div class="stat-body">
            <div class="stat-value">—</div>
            <div class="stat-label">Tổng Người Dùng</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="admin-stat-card">
          <div class="stat-icon bg-warning-soft"><i class="bi bi-shop-window text-warning"></i></div>
          <div class="stat-body">
            <div class="stat-value">—</div>
            <div class="stat-label">Tổng Quán Ăn</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="admin-stat-card">
          <div class="stat-icon bg-info-soft"><i class="bi bi-journal-richtext text-info"></i></div>
          <div class="stat-body">
            <div class="stat-value">—</div>
            <div class="stat-label">Food Notes</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="admin-stat-card">
          <div class="stat-icon bg-danger-soft"><i class="bi bi-clock-history text-danger"></i></div>
          <div class="stat-body">
            <div class="stat-value">—</div>
            <div class="stat-label">Chờ Kiểm Duyệt</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-7">
        <div class="admin-card">
          <div class="admin-card-header">
            <h6 class="mb-0 fw-600">Người dùng mới theo ngày</h6>
            <span class="text-secondary small">7 ngày gần nhất</span>
          </div>
          <div class="admin-card-body">
            <canvas id="usersChart" height="110"></canvas>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-5">
        <div class="admin-card">
          <div class="admin-card-header">
            <h6 class="mb-0 fw-600">Food Note theo tháng</h6>
            <span class="text-secondary small">6 tháng gần nhất</span>
          </div>
          <div class="admin-card-body">
            <canvas id="notesChart" height="145"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Row -->
    <div class="row g-4">
      <!-- Recent Activity -->
      <div class="col-12 col-lg-7">
        <div class="admin-card">
          <div class="admin-card-header">
            <h6 class="mb-0 fw-600">Hoạt động gần đây</h6>
            <a href="./audit-logs.php" class="small">Xem toàn bộ nhật ký</a>
          </div>
          <div class="admin-card-body p-0">
            <div class="table-responsive">
              <table class="table admin-table mb-0">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hoạt động</th>
                    <th>Người dùng</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
              <tbody id="activityTableBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Food Notes -->
      <div class="col-12 col-lg-5">
        <div class="admin-card">
          <div class="admin-card-header">
            <h6 class="mb-0 fw-600">Food Note chờ duyệt</h6>
            <a href="./food-notes.php" class="text-primary small">Xem danh sách</a>
          </div>
          <div class="admin-card-body">
            <div id="pendingNoteList" aria-live="polite"><p class="text-secondary small mb-0">Đang tải nội dung chờ duyệt…</p></div>
            <div class="text-center mt-3">
              <a href="./food-notes.php" class="btn btn-outline-primary btn-sm w-100">Xem tất cả →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div><!-- /admin-content -->
</div><!-- /admin-main -->

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="../assets/js/app.js"></script>
<script>
// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', function() {
  document.getElementById('adminSidebar').classList.toggle('collapsed');
  document.getElementById('adminMain').classList.toggle('expanded');
});

// Users chart
const usersCtx = document.getElementById('usersChart').getContext('2d');
new Chart(usersCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Người dùng mới',
      data: [],
      borderColor: '#D4A017',
      backgroundColor: 'rgba(212,160,23,0.1)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#D4A017',
      pointRadius: 4
    }]
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0ebe3' } }, x: { grid: { display: false } } } }
});

// Notes bar chart
const notesCtx = document.getElementById('notesChart').getContext('2d');
new Chart(notesCtx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Food Notes',
      data: [],
      backgroundColor: '#D4A017',
      borderRadius: 6
    }]
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0ebe3' } }, x: { grid: { display: false } } } }
});
</script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
