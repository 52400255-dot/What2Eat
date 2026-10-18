<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Nhật ký hoạt động – What2Eat Admin';
?>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= w2e_escape($pageTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/style.css">
  <link rel="stylesheet" href="../assets/css/admin.css">
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body class="admin-body">
  <div class="admin-sidebar" id="adminSidebar">
    <div class="sidebar-brand"><span class="brand-name">What2Eat</span><span class="badge bg-warning text-dark ms-1" style="font-size:10px">Admin</span></div>
    <nav class="sidebar-nav" aria-label="Quản trị">
      <a href="./index.php" class="sidebar-link"><i class="bi bi-speedometer2"></i> Dashboard</a>
      <a href="./restaurants.php" class="sidebar-link"><i class="bi bi-shop"></i> Quản lý Quán ăn</a>
      <a href="./categories.php" class="sidebar-link"><i class="bi bi-grid-3x3-gap"></i> Danh mục</a>
      <a href="./users.php" class="sidebar-link"><i class="bi bi-people"></i> Người dùng</a>
      <a href="./food-notes.php" class="sidebar-link"><i class="bi bi-journal-text"></i> Food Note</a>
      <a href="./audit-logs.php" class="sidebar-link active" aria-current="page"><i class="bi bi-clock-history"></i> Nhật ký hoạt động</a>
      <hr class="sidebar-divider">
      <a href="../pages/login.php" class="sidebar-link text-danger"><i class="bi bi-box-arrow-left"></i> Đăng xuất</a>
    </nav>
  </div>

  <main class="admin-main" id="adminMain">
    <header class="admin-topbar">
      <button class="btn btn-link sidebar-toggle" id="sidebarToggle" type="button" aria-label="Mở menu quản trị"><i class="bi bi-list fs-4 text-dark"></i></button>
      <h1 class="topbar-title mb-0">Nhật ký hoạt động</h1>
      <div class="topbar-right"><img data-admin-avatar="true" class="rounded-circle" width="36" height="36" alt="Ảnh đại diện quản trị viên"></div>
    </header>

    <section class="admin-content">
      <p class="text-secondary mb-4">Theo dõi các thao tác quản trị và hoạt động bảo mật được hệ thống ghi nhận.</p>
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <label class="visually-hidden" for="auditSearch">Tìm trong nhật ký hoạt động</label>
        <div class="input-group" style="max-width:420px">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-secondary"></i></span>
          <input id="auditSearch" class="form-control border-start-0" type="search" maxlength="100" placeholder="Tìm theo thao tác, tài khoản hoặc đối tượng">
        </div>
        <span id="auditRecordCount" class="text-secondary small ms-md-auto">Đang tải nhật ký…</span>
      </div>
      <div class="admin-card">
        <div class="admin-card-body p-0">
          <div class="table-responsive">
            <table class="table admin-table mb-0">
              <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead>
              <tbody id="auditLogBody"><tr><td colspan="5" class="text-secondary">Đang tải nhật ký…</td></tr></tbody>
            </table>
          </div>
        </div>
        <footer class="admin-card-footer d-flex justify-content-between align-items-center">
          <span class="text-secondary small">Nhật ký không chứa địa chỉ IP gốc.</span>
          <nav aria-label="Phân trang nhật ký">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item"><button id="auditPrevPage" class="page-link" type="button" aria-label="Trang trước">‹</button></li>
              <li class="page-item"><span id="auditPageLabel" class="page-link">—</span></li>
              <li class="page-item"><button id="auditNextPage" class="page-link" type="button" aria-label="Trang sau">›</button></li>
            </ul>
          </nav>
        </footer>
      </div>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../assets/js/app.js"></script>
  <script>
    document.getElementById('sidebarToggle').addEventListener('click',function(){
      document.getElementById('adminSidebar').classList.toggle('collapsed');
      document.getElementById('adminMain').classList.toggle('expanded');
    });
  </script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
