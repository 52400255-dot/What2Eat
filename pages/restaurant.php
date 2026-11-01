<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Địa điểm | What2Eat';
?>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Thông tin địa điểm ăn uống, bản đồ và ghi chú cộng đồng trên What2Eat.">
  <title><?= w2e_escape($pageTitle) ?></title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <link rel="stylesheet" href="../assets/css/style.css?v=20261030-typography">
  <link rel="stylesheet" href="../assets/css/live-data.css?v=20261028-activity">
  <link rel="stylesheet" href="../assets/css/place-detail.css?v=20261030-place-detail">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=Manrope:wght@200..800&display=swap" rel="stylesheet">
</head>
<body class="w2e-place-page">
  <header class="w2e-place-topbar">
    <div class="container w2e-place-topbar-inner">
      <a class="w2e-place-brand" href="../index.php">What<span>2</span>Eat</a>
      <a class="w2e-place-back" href="./discovery.php"><i class="bi bi-arrow-left" aria-hidden="true"></i> Khám phá</a>
    </div>
  </header>
  <main id="restaurantDetail" class="container w2e-place-main" aria-live="polite">
    <p class="text-secondary">Đang tải địa điểm…</p>
  </main>
  <dialog id="placeReportDialog" class="w2e-place-dialog" aria-labelledby="placeReportTitle">
    <form id="placeReportForm">
      <h2 id="placeReportTitle">Báo thông tin địa điểm</h2>
      <label for="placeReportReason">Vấn đề</label>
      <select id="placeReportReason" required>
        <option value="closed">Quán đã đóng cửa</option>
        <option value="moved">Quán đã chuyển địa chỉ</option>
        <option value="wrong_info">Thông tin chưa đúng</option>
        <option value="other">Vấn đề khác</option>
      </select>
      <label for="placeReportDetails">Thông tin giúp kiểm tra</label>
      <textarea id="placeReportDetails" rows="4" maxlength="1000" placeholder="Mô tả điều bạn thấy tại địa điểm này"></textarea>
      <div class="w2e-place-dialog-actions">
        <button type="button" class="w2e-place-button w2e-place-button--quiet" id="cancelPlaceReport">Hủy</button>
        <button type="submit" class="w2e-place-button w2e-place-button--primary">Gửi báo cáo</button>
      </div>
    </form>
  </dialog>
  <dialog id="placeAuthDialog" class="w2e-place-dialog w2e-place-auth-dialog" aria-labelledby="placeAuthTitle">
    <form method="dialog">
      <p class="w2e-place-auth-kicker">TÀI KHOẢN WHAT2EAT</p>
      <h2 id="placeAuthTitle">Đăng nhập để tiếp tục</h2>
      <p id="placeAuthMessage" class="w2e-place-auth-message"></p>
      <div class="w2e-place-dialog-actions">
        <button type="submit" class="w2e-place-button w2e-place-button--quiet">Để sau</button>
        <a href="./login.php" id="placeAuthLogin" class="w2e-place-button w2e-place-button--primary">Đăng nhập</a>
      </div>
    </form>
  </dialog>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="../assets/js/app.js"></script>
  <script src="../assets/js/site.js?v=20261030-place-detail"></script>
</body>
</html>
