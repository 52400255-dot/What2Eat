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
  <meta name="description" content="Thông tin địa điểm ăn uống đã được What2Eat lưu trữ và công khai.">
  <title><?= w2e_escape($pageTitle) ?></title>
  <script>document.documentElement.classList.add('w2e-restaurant-route');</script>
  <style>html.w2e-restaurant-route body{visibility:hidden}</style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="../assets/css/style.css">
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body>
  <main id="restaurantDetail" class="container py-5" aria-live="polite">
    <p class="text-secondary">Đang tải thông tin địa điểm…</p>
  </main>
  <script src="../assets/js/app.js"></script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
