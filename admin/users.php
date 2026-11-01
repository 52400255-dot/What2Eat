<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Quản lý Người Dùng – What2Eat Admin';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title><?= w2e_escape($pageTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=Manrope:wght@200..800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet"/>
  <link rel="stylesheet" href="../assets/css/style.css?v=20261030-typography"/>
  <link rel="stylesheet" href="../assets/css/admin.css"/>
  <link rel="stylesheet" href="../assets/css/live-data.css?v=20261028-activity">
</head>
<body class="admin-body">

<div class="admin-sidebar" id="adminSidebar">
<div class="sidebar-brand"><span class="brand-name">What2Eat</span><span class="badge bg-warning text-dark ms-1" style="font-size:10px;">Admin</span></div>
  <nav class="sidebar-nav">
    <a href="./index.php" class="sidebar-link"><i class="bi bi-speedometer2"></i> Dashboard</a>
    <a href="./restaurants.php" class="sidebar-link"><i class="bi bi-shop"></i> Quản lý Quán ăn</a>
    <a href="./categories.php" class="sidebar-link"><i class="bi bi-grid-3x3-gap"></i> Danh mục</a>
    <a href="./users.php" class="sidebar-link active"><i class="bi bi-people"></i> Người dùng</a>
    <a href="./food-notes.php" class="sidebar-link"><i class="bi bi-journal-text"></i> Food Note</a>
    <a href="./audit-logs.php" class="sidebar-link"><i class="bi bi-clock-history"></i> Nhật ký hoạt động</a>
    <hr class="sidebar-divider"/>
    <a href="../pages/login.php" class="sidebar-link text-danger"><i class="bi bi-box-arrow-left"></i> Đăng xuất</a>
  </nav>
</div>

<div class="admin-main" id="adminMain">
  <div class="admin-topbar">
    <button class="btn btn-link sidebar-toggle" id="sidebarToggle"><i class="bi bi-list fs-4 text-dark"></i></button>
    <h5 class="topbar-title mb-0">Quản lý Người Dùng</h5>
    <div class="topbar-right">
      <img data-admin-avatar="true" class="rounded-circle" width="36" height="36" alt="Admin"/>
    </div>
  </div>

  <div class="admin-content">

    <!-- Stat mini -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="admin-card p-3 text-center">
        <div id="usersTotalCount" class="fw-700 fs-4 text-primary" style="color:var(--primary) !important;">—</div>
          <div class="text-secondary small">Tổng người dùng</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="admin-card p-3 text-center">
        <div id="usersActiveCount" class="fw-700 fs-4" style="color:var(--success);">—</div>
          <div class="text-secondary small">Hoạt động</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="admin-card p-3 text-center">
        <div id="usersSuspendedCount" class="fw-700 fs-4" style="color:var(--error);">—</div>
          <div class="text-secondary small">Bị khóa</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="admin-card p-3 text-center">
        <div id="usersAdminCount" class="fw-700 fs-4" style="color:var(--secondary);">—</div>
          <div class="text-secondary small">Quản trị viên</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="d-flex flex-wrap gap-2 mb-4">
      <div class="input-group" style="width:280px;">
        <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-secondary"></i></span>
        <input type="text" class="form-control border-start-0" placeholder="Tên, email người dùng..." id="userSearch" oninput="filterUsers()"/>
      </div>
      <select class="form-select" style="width:140px;" id="roleFilter" onchange="filterUsers()">
        <option value="">Tất cả vai trò</option>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <select class="form-select" style="width:160px;" id="statusFilter" onchange="filterUsers()">
        <option value="">Tất cả trạng thái</option>
        <option value="pending">Chờ xác nhận</option>
        <option value="active">Hoạt động</option>
        <option value="suspended">Bị khóa</option>
      </select>
    </div>

    <!-- Table -->
    <div class="admin-card">
      <div class="admin-card-body p-0">
        <div class="table-responsive">
          <table class="table admin-table mb-0" id="userTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Food Notes</th>
                <th>Trạng thái</th>
                <th>Ngày đăng ký</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody id="userTableBody"></tbody>
          </table>
        </div>
      </div>
      <div class="admin-card-footer d-flex justify-content-between align-items-center">
        <span id="userRecordCount" class="text-secondary small">Đang tải danh sách…</span>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item"><button id="userPrevPage" class="page-link" type="button" aria-label="Trang trước">‹</button></li>
            <li class="page-item"><span id="userPageLabel" class="page-link">—</span></li>
            <li class="page-item"><button id="userNextPage" class="page-link" type="button" aria-label="Trang sau">›</button></li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="deleteUserModal" tabindex="-1" aria-labelledby="deleteUserModalTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <form id="deleteUserForm" class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title fs-5" id="deleteUserModalTitle">Xóa tài khoản người dùng</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
      </div>
      <div class="modal-body">
        <p class="mb-2">Bạn sắp xóa vĩnh viễn <strong id="deleteUserTarget"></strong>.</p>
        <p class="text-secondary small mb-3">Food Notes, ảnh đính kèm, địa điểm yêu thích và Food Plans của tài khoản sẽ bị xóa. Email này có thể đăng ký tài khoản mới sau đó.</p>
        <div class="mb-3">
          <label class="form-label" for="deleteUserConfirmEmail">Nhập email của người dùng cần xóa</label>
          <input class="form-control" id="deleteUserConfirmEmail" type="email" autocomplete="off" required>
          <div class="form-text" id="deleteUserEmailHelp">Email này phải khớp với tài khoản đang hiển thị phía trên, không phải email admin.</div>
        </div>
        <div>
          <label class="form-label" for="deleteUserAdminPassword">Mật khẩu quản trị của bạn</label>
          <input class="form-control" id="deleteUserAdminPassword" type="password" autocomplete="current-password" required>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Hủy</button>
        <button type="submit" class="btn btn-danger" id="deleteUserSubmitBtn" disabled><i class="bi bi-trash3 me-1"></i>Xóa vĩnh viễn</button>
      </div>
    </form>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="../assets/js/app.js"></script>
<script>
document.getElementById('sidebarToggle').addEventListener('click',function(){
  document.getElementById('adminSidebar').classList.toggle('collapsed');
  document.getElementById('adminMain').classList.toggle('expanded');
});
function filterUsers(){ window.filterUsers?.(); }

</script>
  <script src="../assets/js/site.js?v=20261101-user-delete2"></script>
</body>
</html>
