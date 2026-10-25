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
  <link rel="stylesheet" href="../assets/css/live-data.css?v=20261018-adminrestaurants1">
</head>
<body class="admin-body admin-restaurants-page">

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

    <section class="restaurant-admin-guide mb-4" aria-labelledby="restaurantGuideTitle">
      <div class="restaurant-admin-guide__icon"><i class="bi bi-shop-window"></i></div>
      <div class="flex-grow-1">
        <h2 id="restaurantGuideTitle" class="h5 mb-2">Trang này dùng để quản lý địa điểm của What2Eat</h2>
        <p class="mb-2">Thêm quán đã được xác minh, sửa thông tin, hoặc duyệt/ẩn đề xuất từ thành viên. Dữ liệu ở đây bổ sung cho OpenStreetMap; quán chỉ được ghim lên bản đồ What2Eat khi đang hiển thị và có đủ tọa độ.</p>
        <div class="restaurant-admin-guide__steps">
          <span><b>1.</b> Thêm hoặc tìm quán</span>
          <span><b>2.</b> Đối chiếu địa chỉ và nguồn</span>
          <span><b>3.</b> Tra tọa độ, kiểm tra ghim rồi mới hiển thị</span>
        </div>
      </div>
    </section>

    <div class="restaurant-admin-stats mb-3" aria-label="Tổng quan địa điểm">
      <article class="restaurant-admin-stat"><span>Tổng địa điểm</span><strong id="restaurantTotalCount">—</strong></article>
      <article class="restaurant-admin-stat"><span>Đang hiển thị</span><strong id="restaurantPublishedCount">—</strong></article>
      <article class="restaurant-admin-stat"><span>Chờ duyệt</span><strong id="restaurantPendingCount">—</strong></article>
      <article class="restaurant-admin-stat"><span>Ẩn / từ chối</span><strong id="restaurantHiddenCount">—</strong></article>
      <article class="restaurant-admin-stat"><span>Tài trợ đang chạy</span><strong id="restaurantSponsoredCount">—</strong></article>
    </div>

    <div class="alert alert-info restaurant-admin-notice mb-3" id="restaurantLoadNotice" role="status">
      <span id="restaurantLoadMessage">Đang tải danh sách địa điểm…</span>
      <button type="button" class="btn btn-sm btn-outline-primary" id="restaurantRetryButton" hidden>Thử tải lại</button>
    </div>

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
                <th>Ghim bản đồ</th>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Ngày thêm</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr data-empty="true"><td colspan="9" class="text-center text-secondary py-4">Đang tải danh sách địa điểm…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Pagination -->
      <div class="admin-card-footer d-flex justify-content-between align-items-center">
        <span class="text-secondary small" id="restaurantCount">Đang tải địa điểm…</span>
      </div>
    </div>

    <section class="w2e-place-review-section" aria-labelledby="placeReportsTitle">
      <div class="d-flex align-items-baseline justify-content-between gap-3 flex-wrap">
        <h2 id="placeReportsTitle">Báo cáo địa điểm <span id="placeReportCount" class="text-secondary"></span></h2>
        <a href="./audit-logs.php" class="small">Xem nhật ký xử lý</a>
      </div>
      <div id="placeReportQueue" aria-live="polite"></div>
    </section>
    <section class="w2e-place-review-section" aria-labelledby="blockedPlacesTitle">
      <h2 id="blockedPlacesTitle">Địa điểm OSM đã ẩn</h2>
      <div id="blockedPlaceList" aria-live="polite"></div>
    </section>
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
            <button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="restaurantGeocodeButton">Tra tọa độ từ địa chỉ</button>
            <div class="form-text" id="restaurantGeocodeStatus" role="status">Tra tọa độ để nhận một kết quả gợi ý; hãy đối chiếu trước khi lưu.</div>
            <div class="form-text">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · Nominatim · <a href="https://operations.osmfoundation.org/policies/nominatim/" target="_blank" rel="noopener noreferrer">Chính sách sử dụng</a>.</div>
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
            <input type="text" inputmode="url" class="form-control w2e-input" id="restaurantWebsite" maxlength="500" placeholder="Địa chỉ website (có thể để trống)"/>
          </div>
          <div class="col-12">
            <label class="form-label fw-500">Nguồn xác minh (tùy chọn)</label>
            <input type="text" inputmode="url" class="form-control w2e-input" id="restaurantSourceUrl" maxlength="500" placeholder="URL trang chính thức hoặc nguồn đối chiếu"/>
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
              <small class="text-secondary">Chỉ nhập thông tin đã đối chiếu. Quán cần trạng thái “Đang hiển thị” và cả vĩ độ lẫn kinh độ hợp lệ mới có ghim trên bản đồ.</small>
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

<div class="modal fade" id="sponsorshipModal" tabindex="-1" aria-labelledby="sponsorshipModalTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="sponsorshipModalTitle">Vị trí tài trợ</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
      </div>
      <div class="modal-body">
        <p class="text-secondary small">Chỉ kích hoạt khi đã có thỏa thuận với quán. Vị trí đang chạy sẽ có nhãn “Tài trợ” trên What2Eat.</p>
        <label class="form-label" for="sponsorName">Tên bên tài trợ</label>
        <input class="form-control mb-3" id="sponsorName" maxlength="180" required>
        <label class="form-label" for="sponsorReference">Mã thỏa thuận hoặc hóa đơn</label>
        <input class="form-control mb-3" id="sponsorReference" maxlength="120">
        <div class="row g-3 mb-3">
          <div class="col-sm-6"><label class="form-label" for="sponsorStart">Bắt đầu</label><input class="form-control" id="sponsorStart" type="datetime-local" required></div>
          <div class="col-sm-6"><label class="form-label" for="sponsorEnd">Kết thúc</label><input class="form-control" id="sponsorEnd" type="datetime-local" required></div>
        </div>
        <label class="form-label" for="sponsorStatus">Trạng thái</label>
        <select class="form-select" id="sponsorStatus"><option value="paused">Tạm dừng</option><option value="active">Kích hoạt</option></select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Hủy</button>
        <button class="btn w2e-btn-primary" type="button" id="saveSponsorshipButton">Lưu vị trí tài trợ</button>
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
<script src="../assets/js/site.js?v=20261018-adminrestaurants1"></script>
</body>
</html>
