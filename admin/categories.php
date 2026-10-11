<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Quản lý Danh Mục – What2Eat Admin';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
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

<div class="admin-sidebar" id="adminSidebar">
<div class="sidebar-brand"><span class="brand-name">What2Eat</span><span class="badge bg-warning text-dark ms-1" style="font-size:10px;">Admin</span></div>
  <nav class="sidebar-nav">
    <a href="./index.php" class="sidebar-link"><i class="bi bi-speedometer2"></i> Dashboard</a>
    <a href="./restaurants.php" class="sidebar-link"><i class="bi bi-shop"></i> Quản lý Quán ăn</a>
    <a href="./categories.php" class="sidebar-link active"><i class="bi bi-grid-3x3-gap"></i> Danh mục</a>
    <a href="./users.php" class="sidebar-link"><i class="bi bi-people"></i> Người dùng</a>
    <a href="./food-notes.php" class="sidebar-link"><i class="bi bi-journal-text"></i> Food Note</a>
    <a href="./audit-logs.php" class="sidebar-link"><i class="bi bi-clock-history"></i> Nhật ký hoạt động</a>
    <hr class="sidebar-divider"/>
    <a href="../pages/login.php" class="sidebar-link text-danger"><i class="bi bi-box-arrow-left"></i> Đăng xuất</a>
  </nav>
</div>

<div class="admin-main" id="adminMain">
  <div class="admin-topbar">
    <button class="btn btn-link sidebar-toggle" id="sidebarToggle"><i class="bi bi-list fs-4 text-dark"></i></button>
    <h5 class="topbar-title mb-0">Quản lý Danh Mục</h5>
    <div class="topbar-right">
      <img data-admin-avatar="true" class="rounded-circle" width="36" height="36" alt="Admin"/>
    </div>
  </div>

  <div class="admin-content">

    <div class="d-flex justify-content-between align-items-center mb-4">
      <p class="text-secondary mb-0">Quản lý các nhóm danh mục món ăn trên hệ thống</p>
      <button class="btn w2e-btn-primary" data-bs-toggle="modal" data-bs-target="#categoryModal">
        <i class="bi bi-plus-lg me-1"></i> Thêm Danh Mục
      </button>
    </div>

    <!-- Category Cards Grid -->
    <div class="row g-4 mb-4"></div>

    <!-- Summary Table -->
    <div class="admin-card">
      <div class="admin-card-header"><h6 class="mb-0 fw-600">Bảng tóm tắt danh mục</h6></div>
      <div class="admin-card-body p-0">
        <div class="table-responsive">
          <table class="table admin-table mb-0">
            <thead>
            <tr><th>#</th><th>Tên Danh Mục</th><th>Mô tả</th><th>Số Quán</th><th>Trạng thái</th></tr>
            </thead>
            <tbody id="categoryTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modal Add/Edit Category -->
<div class="modal fade" id="categoryModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content" style="border-radius:16px;">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title fw-700" id="catModalTitle">Thêm Danh Mục Mới</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
        <div class="col-12">
            <label class="form-label fw-500">Tên danh mục <span class="text-danger">*</span></label>
            <input type="text" class="form-control w2e-input" id="catName" placeholder="VD: Món Việt"/>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Mô tả</label>
            <textarea class="form-control w2e-input" id="catDescription" rows="2" maxlength="500" placeholder="Mô tả ngắn về danh mục..."></textarea>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Trạng thái</label>
            <select class="form-select w2e-input" id="catStatus">
              <option value="active">Hiện</option>
              <option value="hidden">Ẩn</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer border-0">
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Hủy</button>
        <button class="btn w2e-btn-primary" onclick="saveCat()">Lưu Danh Mục</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
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
