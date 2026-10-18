<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Khám Phá Quán Ăn – What2Eat';
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
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link href="../assets/css/style.css" rel="stylesheet" />
  <style>
    /* ===== DISCOVERY PAGE SPECIFIC STYLES ===== */
    body {
    font-family: var(--font);
    background-color: var(--bg);
    color: var(--text);
      padding-bottom: 80px;
    }

    /* ---------- NAVBAR ---------- */
    .w2e-navbar {
      background: #fff;
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
      position: sticky;
      top: 0;
      z-index: 1030;
    }
    .w2e-navbar .navbar-brand {
    font-weight: 600;
      font-size: 1.4rem;
      color: var(--primary);
      letter-spacing: -0.5px;
    }
    .w2e-navbar .navbar-brand span {
    color: var(--secondary);
    }
    .w2e-navbar .nav-link {
      font-weight: 500;
      color: var(--text-secondary);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .w2e-navbar .nav-link:hover {
    color: var(--primary);
      background: rgba(212,160,23,0.08);
    }
    .w2e-navbar .nav-link.w2e-active {
    color: var(--primary);
      font-weight: 600;
    }
    .w2e-avatar-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--primary);
      cursor: pointer;
    }
    .w2e-avatar-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* ---------- PAGE HEADER ---------- */
    .w2e-page-header {
    background: var(--secondary);
      padding: 56px 0 72px;
      position: relative;
      overflow: hidden;
    }
    .w2e-page-header::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 280px; height: 280px;
      background: rgba(255,255,255,0.04);
      border-radius: 50%;
    }
    .w2e-page-header::after {
      content: '';
      position: absolute;
      bottom: -80px; left: -40px;
      width: 220px; height: 220px;
      background: rgba(255,255,255,0.03);
      border-radius: 50%;
    }
    .w2e-page-header h1 {
      color: #fff;
      font-weight: 600;
      font-size: 2.4rem;
      margin-bottom: 0.4rem;
    }
    .w2e-page-header p {
      color: rgba(255,255,255,0.82);
      font-size: 1.05rem;
      margin-bottom: 1.8rem;
    }
    .w2e-search-box {
      position: relative;
      max-width: 620px;
      margin: 0 auto;
    }
    .w2e-search-box input {
      width: 100%;
      padding: 16px 60px 16px 52px;
      border: none;
      border-radius: 14px;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text);
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      outline: none;
      background: #fff;
    }
    .w2e-search-box input::placeholder {
    color: var(--text-muted);
      font-weight: 400;
    }
    .w2e-search-box .w2e-search-icon {
      position: absolute;
      left: 18px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--primary);
      font-size: 1.2rem;
    }
    .w2e-search-box .w2e-search-btn {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      background: var(--primary);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 8px 18px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .w2e-search-box .w2e-search-btn:hover {
    background: var(--primary-dark);
    }

    /* ---------- FILTER SECTION ---------- */
    .w2e-filter-section {
      background: #fff;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 65px;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .w2e-category-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 16px 0 12px;
      scrollbar-width: none;
    }
    .w2e-category-tabs::-webkit-scrollbar { display: none; }
    .w2e-cat-tab {
      white-space: nowrap;
      padding: 8px 18px;
      border-radius: 24px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;
    }
    .w2e-cat-tab:hover {
    border-color: var(--primary);
    color: var(--primary);
      background: rgba(212,160,23,0.06);
    }
    .w2e-cat-tab.active {
    background: var(--primary);
    border-color: var(--primary);
      color: #fff;
      font-weight: 600;
    }
    .w2e-filter-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0 14px;
      flex-wrap: wrap;
    }
    .w2e-filter-select {
      padding: 7px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s;
    }
    .w2e-filter-select:hover, .w2e-filter-select:focus {
    border-color: var(--primary);
    }
    .w2e-toggle-open {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .w2e-toggle-open.active {
    border-color: var(--success);
      background: rgba(45,155,111,0.08);
      color: var(--success);
    }
    .w2e-sort-label {
      font-size: 0.82rem;
      color: var(--text-secondary);
      font-weight: 500;
      white-space: nowrap;
    }
    .w2e-clear-btn {
      background: none;
      border: none;
      color: var(--error);
      font-family: inherit;
      font-size: 0.83rem;
      font-weight: 500;
      cursor: pointer;
      padding: 7px 12px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .w2e-clear-btn:hover { background: rgba(224,90,90,0.08); }

    /* ---------- MAIN CONTENT ---------- */
    .w2e-content-area { padding: 28px 0 40px; }

    /* ---------- LUCKY WIDGET ---------- */
    .w2e-lucky-widget {
    background: var(--primary);
      border-radius: 16px;
      padding: 20px 22px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 20px rgba(212,160,23,0.25);
    }
    .w2e-lucky-widget h6 {
    color: var(--secondary);
    font-weight: 500;
      margin-bottom: 4px;
      font-size: 1rem;
    }
    .w2e-lucky-widget p {
      color: rgba(74,44,26,0.75);
      font-size: 0.82rem;
      margin: 0;
    }
    .w2e-lucky-btn {
    background: var(--secondary);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .w2e-lucky-btn:hover{ background: var(--text) }

    /* ---------- RESULTS BAR ---------- */
    .w2e-results-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .w2e-results-count {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .w2e-results-count span {
    color: var(--primary);
    font-weight: 500;
    }
    .w2e-view-toggle {
      display: flex;
      gap: 4px;
    }
    .w2e-view-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
    }
    .w2e-view-btn.active, .w2e-view-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
      background: rgba(212,160,23,0.08);
    }

    /* ---------- RESTAURANT CARD ---------- */
    .w2e-restaurant-card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      overflow: hidden;
      transition: transform 0.25s, box-shadow 0.25s;
      cursor: pointer;
      text-decoration: none;
      display: block;
      position: relative;
      border: 1px solid var(--border);
      height: 100%;
    }
    .w2e-restaurant-card:hover{ box-shadow: 0 12px 36px rgba(0,0,0,0.12);
    text-decoration: none }
    .w2e-card-img-wrap {
      position: relative;
      overflow: hidden;
      height: 185px;
    }
    .w2e-card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s;
    }
    .w2e-restaurant-card:hover .w2e-card-img-wrap img {
      transform: scale(1.05);
    }
    .w2e-card-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .w2e-badge-open {
      background: rgba(45,155,111,0.9);
      color: #fff;
      backdrop-filter: blur(4px);
    }
    .w2e-badge-closed {
      background: rgba(224,90,90,0.9);
      color: #fff;
      backdrop-filter: blur(4px);
    }
    .w2e-fav-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      color: var(--gray-2);
      cursor: pointer;
      transition: all 0.2s;
      backdrop-filter: blur(4px);
      z-index: 2;
    }
    .w2e-fav-btn:hover, .w2e-fav-btn.active {
    color: var(--error);
      background: #fff;
      transform: scale(1.1);
    }
    .w2e-card-body {
      padding: 14px 16px 16px;
    }
    .w2e-card-category {
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .w2e-card-title {
      font-size: 0.98rem;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .w2e-card-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .w2e-card-rating {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text);
    }
    .w2e-card-rating i { color: var(--primary-light); font-size: 0.85rem; }
    .w2e-card-dist {
      font-size: 0.8rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .w2e-card-dist i { color: var(--primary); }
    .w2e-card-price {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--secondary);
    }

    /* ---------- EMPTY STATE ---------- */
    .w2e-empty-state {
      text-align: center;
      padding: 80px 20px;
      display: none;
    }
    .w2e-empty-state h5 {
    color: var(--secondary);
    font-weight: 500;
      margin-bottom: 8px;
    }
    .w2e-empty-state p { color: var(--text-secondary); font-size: 0.95rem; }

    /* ---------- PAGINATION ---------- */
    .w2e-pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin-top: 40px;
    }
    .w2e-page-btn {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text);
      font-family: inherit;
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .w2e-page-btn:hover { border-color: var(--primary); color: var(--primary); }
    .w2e-page-btn.active {
    background: var(--primary);
    border-color: var(--primary);
      color: #fff;
      font-weight: 500;
    }
    .w2e-page-btn.w2e-page-nav { width: auto; padding: 0 14px; gap: 5px; }
    .w2e-page-btn.disabled { opacity: 0.4; pointer-events: none; }

    /* ---------- MOBILE BOTTOM NAV ---------- */
    .w2e-bottom-nav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: #fff;
      border-top: 1px solid var(--border);
      display: none;
      z-index: 1000;
      padding: 8px 0 10px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
    }
    .w2e-bottom-nav .w2e-bnav-items {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
    .w2e-bnav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      text-decoration: none;
      color: var(--text-muted);
      font-size: 0.68rem;
      font-weight: 500;
      transition: color 0.2s;
    }
    .w2e-bnav-item i { font-size: 1.3rem; }
    .w2e-bnav-item.active { color: var(--primary); }
    .w2e-bnav-add {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 1.4rem;
      box-shadow: 0 4px 16px rgba(212,160,23,0.4);
      margin-top: -18px;
      text-decoration: none;
      transition: transform 0.2s;
    }
    .w2e-bnav-add:hover { transform: scale(1.08); color: #fff; }

    /* ---------- LUCKY MODAL ---------- */
    .w2e-lucky-modal-content {
      border-radius: 20px;
      border: none;
      overflow: hidden;
    }
    .w2e-lucky-modal-header {
    background: var(--primary);
      padding: 24px;
      text-align: center;
      border: none;
    }
    .w2e-lucky-modal-header h5 {
    color: var(--secondary);
    font-weight: 600;
      font-size: 1.3rem;
    }
    .w2e-lucky-result-card {
    background: var(--bg);
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
      margin: 16px;
    }
    .w2e-lucky-result-card img {
      width: 100%;
      height: 180px;
      object-fit: cover;
    }

    /* ---------- RESPONSIVE ---------- */
    @media (max-width: 991px) {
      .w2e-page-header h1 { font-size: 1.9rem; }
      .w2e-filter-row { flex-wrap: wrap; }
    }
    @media (max-width: 767px) {
      .w2e-bottom-nav { display: block; }
      .w2e-page-header { padding: 36px 0 52px; }
      .w2e-page-header h1 { font-size: 1.6rem; }
      .w2e-lucky-widget { flex-direction: column; gap: 14px; text-align: center; }
      .w2e-results-bar { flex-direction: column; align-items: flex-start; gap: 10px; }
    }
    @media (max-width: 575px) {
      .w2e-card-img-wrap { height: 160px; }
    }
    .w2e-live-map-section { margin: 1.5rem 0 2rem; padding: 1.25rem; background: #fff; border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.04); }
    .w2e-live-map-heading { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1rem; }
    .w2e-live-map-heading h2 { margin:0 0 .3rem; color:var(--text); font-size:1.2rem; font-weight:700; }
    .w2e-live-map-heading p { margin:0; color:var(--text-secondary); font-size:.86rem; }
    .w2e-live-map-actions { display:flex; gap:.5rem; flex-shrink:0; }
    .w2e-live-map-btn { display:inline-flex; align-items:center; gap:.4rem; padding:.6rem .85rem; border:1px solid var(--border); border-radius:10px; background:#fff; color:var(--text); font:inherit; font-size:.85rem; font-weight:600; cursor:pointer; }
    .w2e-live-map-btn--primary { border-color:var(--primary); background:var(--primary); color:#fff; }
    #map-container { position:relative; width:100%; height:420px; border-radius:12px; background:#f2eee7; z-index:0; }
    .w2e-map-tile-notice { position:absolute; z-index:500; top:12px; left:50%; transform:translateX(-50%); max-width:calc(100% - 24px); padding:.55rem .8rem; border:1px solid #e8ded2; border-radius:10px; background:#fffdf8; box-shadow:0 3px 14px rgba(0,0,0,.12); color:#4a2c1a; font-size:.82rem; }
    .w2e-map-legend { position:absolute; z-index:450; left:12px; bottom:12px; display:flex; flex-wrap:wrap; gap:.45rem .8rem; max-width:calc(100% - 24px); padding:.45rem .65rem; border:1px solid #e8ded2; border-radius:9px; background:rgba(255,253,248,.96); box-shadow:0 2px 8px rgba(0,0,0,.12); color:#4a2c1a; font-size:.74rem; pointer-events:none; }
    .w2e-map-legend__item { display:inline-flex; align-items:center; gap:.35rem; white-space:nowrap; }
    .w2e-map-legend__swatch { display:inline-block; width:10px; height:10px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 0 1px #777; }
    .w2e-map-legend__swatch--osm { background:#3388ff; }
    .w2e-map-legend__swatch--managed { background:#c58b00; }
    .w2e-live-map-footer { display:flex; justify-content:space-between; gap:1rem; margin-top:.65rem; color:var(--text-secondary); font-size:.78rem; }
    .w2e-live-map-footer a { color:inherit; }
    @media (max-width:600px) { .w2e-live-map-section { padding:.85rem; } .w2e-live-map-heading { align-items:flex-start; flex-direction:column; } .w2e-live-map-actions { width:100%; } .w2e-live-map-btn { flex:1; justify-content:center; } #map-container { height:340px; } .w2e-live-map-footer { flex-direction:column; gap:.2rem; } }
  </style>
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body>

  <!-- ===== NAVBAR ===== -->
  <nav class="w2e-navbar navbar navbar-expand-lg">
    <div class="container">
      <a class="navbar-brand" href="../index.php">
      What<span>2</span>Eat
      </a>
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav mx-auto gap-1">
          <li class="nav-item">
            <a class="nav-link" href="../index.php">
              <i class="bi bi-house me-1"></i>Trang chủ
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link w2e-active" href="./discovery.php">
              <i class="bi bi-compass me-1"></i>Khám phá
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="./food-notes.php">
              <i class="bi bi-journal-text me-1"></i>Food Notes
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="./food-plans.php">
              <i class="bi bi-calendar3 me-1"></i>Kế hoạch ăn
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="./dashboard.php">
              <i class="bi bi-bar-chart-line me-1"></i>Dashboard
            </a>
          </li>
        </ul>
        <div class="d-flex align-items-center gap-3">
        <a href="./create-food-note.php" class="btn btn-sm fw-600 px-3" style="background:var(--primary);color:#fff;border-radius:10px;font-family: inherit;font-weight:600;">
            <i class="bi bi-plus-lg me-1"></i>Thêm ghi chú
          </a>
          <!-- Avatar dropdown -->
          <div class="dropdown">
            <button class="w2e-avatar-btn border-0 p-0" data-bs-toggle="dropdown" aria-expanded="false">
              <img data-w2e-user-avatar="true" alt="Avatar người dùng" hidden />
            </button>
            <ul class="dropdown-menu dropdown-menu-end" style="border-radius:14px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.1);min-width:200px;">
              <li>
              <div class="px-3 py-2 border-bottom" style="border-color:var(--border) !important;">
              <p class="mb-0 fw-600" data-w2e-user-name="true" style="font-size:0.9rem;color:var(--text);font-weight:600;">Khách</p>
              <p class="mb-0" data-w2e-user-email="true" style="font-size:0.78rem;color:var(--text-secondary);">Chưa đăng nhập</p>
                </div>
              </li>
              <li><a class="dropdown-item py-2" href="./profile.php"><i class="bi bi-person me-2 text-warning"></i>Hồ sơ của tôi</a></li>
              <li><a class="dropdown-item py-2" href="./food-notes.php"><i class="bi bi-journal me-2 text-warning"></i>Food Notes</a></li>
              <li><a class="dropdown-item py-2" href="./dashboard.php"><i class="bi bi-bar-chart me-2 text-warning"></i>Dashboard</a></li>
              <li><hr class="dropdown-divider" style="border-color:var(--border);" /></li>
              <li><a class="dropdown-item py-2 text-danger" href="./login.php"><i class="bi bi-box-arrow-right me-2"></i>Đăng nhập</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- ===== PAGE HEADER ===== -->
  <header class="w2e-page-header">
    <div class="container text-center">
      <h1><i class="bi bi-compass me-2"></i>Khám Phá Quán Ăn</h1>
      <p>Tìm quán phù hợp với khẩu vị và ngân sách của bạn</p>
      <div class="w2e-search-box">
        <i class="bi bi-search w2e-search-icon"></i>
        <input
          type="text"
          id="searchInput"
          placeholder="Tìm món đã được ghi nhận, tên quán hoặc loại hình..."
          autocomplete="off"
        />
        <button class="w2e-search-btn" onclick="window.runDiscoverySearch?.()">
          <i class="bi bi-search me-1"></i>Tìm
        </button>
      </div>
      <small class="d-block mt-2">Món ăn lấy từ Food Note công khai đã duyệt hoặc thẻ OSM thực tế; đây không phải thực đơn đầy đủ.</small>
    </div>
  </header>

  <!-- ===== FILTER BAR ===== -->
  <section class="w2e-filter-section">
    <div class="container">
      <!-- Category tabs -->
      <div class="w2e-category-tabs" id="categoryTabs"><button class="w2e-cat-tab active" data-filter="">Tất cả</button></div>

      <!-- Filter row -->
      <div class="w2e-filter-row">
        <!-- Price -->
        <select class="w2e-filter-select" id="priceFilter" aria-label="Lọc theo giá">
        <option value="">Mức giá</option>
          <option value="cheap">Dưới 100k</option>
          <option value="mid">100k – 200k</option>
          <option value="high">Trên 200k</option>
        </select>

        <!-- Rating -->
        <select class="w2e-filter-select" id="ratingFilter" aria-label="Lọc theo đánh giá">
        <option value="">Đánh giá</option>
          <option value="4.5">4.5+ sao</option>
          <option value="4.0">4.0+ sao</option>
          <option value="3.5">3.5+ sao</option>
        </select>

        <!-- Distance -->
        <select class="w2e-filter-select" id="distanceFilter" aria-label="Lọc theo khoảng cách">
        <option value="">Khoảng cách</option>
          <option value="0.5">Dưới 0.5km</option>
          <option value="1">Dưới 1km</option>
          <option value="2">Dưới 2km</option>
          <option value="5">Dưới 5km</option>
        </select>

        <!-- Sort -->
        <select class="w2e-filter-select" id="sortFilter" aria-label="Sắp xếp">
        <option value="relevant">Phù hợp nhất</option>
        <option value="rating">Đánh giá cao</option>
        <option value="distance">Gần nhất</option>
        <option value="price">Giá thấp</option>
        </select>

        <!-- Open toggle -->
        <button class="w2e-toggle-open" id="openToggle" >
          <i class="bi bi-clock"></i> Đang mở
        </button>

        <!-- Clear -->
        <button class="w2e-clear-btn" onclick="window.clearDiscoveryFilters?.()">
          <i class="bi bi-x-circle me-1"></i>Xóa bộ lọc
        </button>
      </div>
    </div>
  </section>

  <!-- ===== MAIN CONTENT ===== -->
  <main class="w2e-content-area">
    <div class="container">

      <!-- Lucky Widget -->
      <div class="w2e-lucky-widget">
        <div>
          <h6><i class="bi bi-dice-5 me-2"></i>Không biết ăn gì hôm nay?</h6>
          <p>Để What2Eat chọn giúp bạn một quán ngẫu nhiên!</p>
        </div>
        <button class="w2e-lucky-btn" type="button" onclick="rollLucky()">
          <i class="bi bi-shuffle"></i> Thử may mắn!
        </button>
      </div>

      <!-- Results bar -->
      <div class="w2e-results-bar">
        <p class="w2e-results-count mb-0">
          Tìm thấy <span id="resultCount">—</span> địa điểm có dữ liệu
        </p>
        <div class="d-flex align-items-center gap-2">
          <div class="w2e-view-toggle">
            <button class="w2e-view-btn active" id="gridViewBtn" title="Dạng lưới" >
              <i class="bi bi-grid-3x3-gap"></i>
            </button>
            <button class="w2e-view-btn" id="listViewBtn" title="Dạng danh sách" >
              <i class="bi bi-list-ul"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Live OpenStreetMap restaurant data -->
      <section class="w2e-live-map-section" aria-labelledby="liveMapTitle">
        <div class="w2e-live-map-heading">
          <div>
            <h2 id="liveMapTitle"><i class="bi bi-geo-alt me-2"></i>Quán ăn quanh bạn</h2>
              <p>Địa điểm được truy vấn từ OpenStreetMap; dữ liệu do cộng đồng đóng góp.</p>
          </div>
          <div class="w2e-live-map-actions">
            <button type="button" class="w2e-live-map-btn" id="locateMapBtn"><i class="bi bi-crosshair"></i> Vị trí của tôi</button>
            <button type="button" class="w2e-live-map-btn w2e-live-map-btn--primary" id="refreshMapBtn"><i class="bi bi-arrow-clockwise"></i> Tải lại</button>
          </div>
        </div>
        <div id="map-container" role="region" aria-label="Bản đồ quán ăn thực tế" aria-busy="true"></div>
        <div class="w2e-live-map-footer">
          <span id="mapStatus" role="status" aria-live="polite">Đang tải địa điểm…</span>
          <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">© OpenStreetMap contributors · Humanitarian OpenStreetMap Team · Báo lỗi bản đồ</a>
        </div>
      </section>

      <!-- Restaurant Grid -->
      <div class="row g-3 g-md-4" id="restaurantGrid">
        <p class="text-secondary">Đang tải dữ liệu OpenStreetMap…</p>
      </div><!-- /restaurantGrid -->

      <!-- Empty State -->
      <div class="w2e-empty-state" id="emptyState">
        <h5>Không tìm thấy quán phù hợp</h5>
        <p>Hãy thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác nhé!</p>
        <button class="btn mt-3 px-4 py-2" style="background:var(--primary);color:#fff;border-radius:10px;font-weight:600;" onclick="window.clearDiscoveryFilters?.()">
          <i class="bi bi-arrow-counterclockwise me-1"></i>Đặt lại bộ lọc
        </button>
      </div>

      <!-- Pagination -->
      <div class="w2e-pagination" id="paginationWrap" hidden></div>
  </main>

  <!-- ===== LUCKY MODAL ===== -->
  <div class="modal fade" id="luckyModal" tabindex="-1" aria-labelledby="luckyModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title" id="luckyModalLabel">Chọn địa điểm ngẫu nhiên</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
      <div class="modal-body"><p class="text-secondary mb-0">Chọn ngẫu nhiên từ dữ liệu OpenStreetMap đang tải.</p></div>
    </div></div>
  </div>
  <!-- ===== MOBILE BOTTOM NAV ===== -->
  <nav class="w2e-bottom-nav" aria-label="Điều hướng di động">
    <div class="w2e-bnav-items">
      <a href="../index.php" class="w2e-bnav-item">
        <i class="bi bi-house-fill"></i>
        <span>Home</span>
      </a>
      <a href="./discovery.php" class="w2e-bnav-item active">
        <i class="bi bi-compass-fill"></i>
        <span>Explore</span>
      </a>
      <a href="./create-food-note.php" class="w2e-bnav-add" aria-label="Thêm mới">
        <i class="bi bi-plus-lg"></i>
      </a>
      <a href="./food-notes.php" class="w2e-bnav-item">
        <i class="bi bi-journal-text"></i>
        <span>Notes</span>
      </a>
      <a href="./profile.php" class="w2e-bnav-item">
        <i class="bi bi-person-fill"></i>
        <span>Profile</span>
      </a>
    </div>
  </nav>

  <!-- ===== SCRIPTS ===== -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../assets/js/app.js"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="../assets/js/restaurant-map.js?v=20261018-gps4"></script>
  <script src="../assets/js/site.js?v=20261018"></script>
</body>
</html>
