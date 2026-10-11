<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Quản lý Quán Ăn – What2Eat Admin';
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

<!-- Sidebar -->
<div class="admin-sidebar" id="adminSidebar">
  <div class="sidebar-brand">

    <span class="brand-name">What2Eat</span>
    <span class="badge bg-warning text-dark ms-1" style="font-size:10px;">Admin</span>
  </div>
  <nav class="sidebar-nav">
    <a href="./index.php" class="sidebar-link"><i class="bi bi-speedometer2"></i> Dashboard</a>
    <a href="./restaurants.php" class="sidebar-link active"><i class="bi bi-shop"></i> Quản lý Quán ăn</a>
    <a href="./categories.php" class="sidebar-link"><i class="bi bi-grid-3x3-gap"></i> Danh mục</a>
    <a href="./users.php" class="sidebar-link"><i class="bi bi-people"></i> Người dùng</a>
    <a href="./food-notes.php" class="sidebar-link"><i class="bi bi-journal-text"></i> Food Note</a>
    <a href="./audit-logs.php" class="sidebar-link"><i class="bi bi-clock-history"></i> Nhật ký hoạt động</a>
    <hr class="sidebar-divider"/>
    <a href="../pages/login.php" class="sidebar-link text-danger"><i class="bi bi-box-arrow-left"></i> Đăng xuất</a>
  </nav>
</div>

<!-- Main -->
<div class="admin-main" id="adminMain">
  <div class="admin-topbar">
    <button class="btn btn-link sidebar-toggle" id="sidebarToggle"><i class="bi bi-list fs-4 text-dark"></i></button>
    <h5 class="topbar-title mb-0">Quản lý Quán Ăn</h5>
    <div class="topbar-right">
      <img data-admin-avatar="true" class="rounded-circle" width="36" height="36" alt="Admin"/>
    </div>
  </div>

  <div class="admin-content">

    <!-- Actions Bar -->
    <div class="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
      <div class="d-flex gap-2 flex-wrap">
        <div class="input-group" style="width:280px;">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-secondary"></i></span>
          <input type="text" class="form-control border-start-0" placeholder="Tìm kiếm quán ăn..." id="searchInput" oninput="filterTable()"/>
        </div>
        <select class="form-select" style="width:160px;" id="catFilter">
          <option value="">Tất cả danh mục</option>
        </select>
        <select class="form-select" style="width:140px;" id="statusFilter">
          <option value="">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="published">Đang hiện</option>
          <option value="hidden">Đã ẩn</option>
          <option value="rejected">Từ chối</option>
        </select>
      </div>
      <button class="btn w2e-btn-primary" id="addRestaurantButton" data-bs-toggle="modal" data-bs-target="#restaurantModal">
        <i class="bi bi-plus-lg me-1"></i> Thêm Quán Ăn
      </button>
    </div>

    <!-- Table -->
    <div class="admin-card">
      <div class="admin-card-body p-0">
        <div class="table-responsive">
          <table class="table admin-table mb-0" id="restaurantTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên Quán</th>
                <th>Danh mục</th>
                <th>Địa chỉ</th>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Ngày thêm</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
      </div>
      <!-- Pagination -->
      <div class="admin-card-footer d-flex justify-content-between align-items-center">
        <span class="text-secondary small" id="restaurantCount">Đang tải địa điểm…</span>
      </div>
    </div>
  </div>
</div>

<!-- Modal Thêm/Sửa Quán Ăn -->
<div class="modal fade" id="restaurantModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content" style="border-radius:16px;">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title fw-700" id="restaurantModalTitle">Thêm Quán Ăn Mới</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-500">Tên quán <span class="text-danger">*</span></label>
            <input type="text" class="form-control w2e-input" id="restaurantName" maxlength="180" required placeholder="Nhập tên quán ăn"/>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-500">Danh mục</label>
            <select class="form-select w2e-input" id="restaurantCategory">
              <option value="">Chưa phân loại</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Mô tả</label>
            <textarea class="form-control w2e-input" id="restaurantDescription" rows="3" maxlength="4000" placeholder="Mô tả dựa trên thông tin đã xác thực..."></textarea>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Địa chỉ <span class="text-danger">*</span></label>
            <input type="text" class="form-control w2e-input" id="restaurantAddress" maxlength="500" required placeholder="Số nhà, đường, quận, thành phố"/>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-500">Loại hình / ẩm thực</label>
            <input type="text" class="form-control w2e-input" id="restaurantCuisine" maxlength="255" placeholder="Chỉ nhập nếu có nguồn xác thực"/>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-500">Điện thoại</label>
            <input type="tel" class="form-control w2e-input" id="restaurantPhone" maxlength="40"/>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Website chính thức</label>
            <input type="url" class="form-control w2e-input" id="restaurantWebsite" maxlength="500" placeholder="https://"/>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Nguồn xác minh (tùy chọn)</label>
            <input type="url" class="form-control w2e-input" id="restaurantSourceUrl" maxlength="500" placeholder="URL trang chính thức hoặc nguồn đối chiếu"/>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-500">Giá từ (đ)</label>
            <input type="number" class="form-control w2e-input" id="restaurantPriceMin" min="0" step="1000" placeholder="Giá thấp nhất (nếu có nguồn)"/>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-500">Giá đến (đ)</label>
            <input type="number" class="form-control w2e-input" id="restaurantPriceMax" min="0" step="1000" placeholder="Giá cao nhất (nếu có nguồn)"/>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-500">Giờ mở cửa</label>
            <input type="text" class="form-control w2e-input" id="restaurantOpening" maxlength="300" placeholder="Chỉ nhập giờ do quán / nguồn xác nhận"/>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-500">Trạng thái</label>
            <select class="form-select w2e-input" id="restaurantStatus">
              <option value="published">Hiện</option>
              <option value="hidden">Ẩn</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Tọa độ (tùy chọn)</label>
            <div class="row g-2">
              <div class="col-md-6"><input type="number" class="form-control w2e-input" id="restaurantLatitude" min="-90" max="90" step="0.0000001" placeholder="Vĩ độ"/></div>
              <div class="col-md-6"><input type="number" class="form-control w2e-input" id="restaurantLongitude" min="-180" max="180" step="0.0000001" placeholder="Kinh độ"/></div>
            </div>
            <small class="text-secondary">Không điền rating hoặc giờ mở cửa ước đoán. Địa điểm chỉ xuất hiện sau khi bạn nhập dữ liệu và lưu.</small>
          </div>
        </div>
      </div>
      <div class="modal-footer border-0">
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Hủy</button>
        <button type="button" class="btn w2e-btn-primary" id="saveRestaurantButton">Lưu Quán Ăn</button>
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
function filterTable(){
  const s=document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('#tableBody tr').forEach(r=>{
    const txt=r.innerText.toLowerCase();
    r.style.display=txt.includes(s)?'':'none';
  });
}
</script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
