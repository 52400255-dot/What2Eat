<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Hồ Sơ Cá Nhân – What2Eat';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= w2e_escape($pageTitle) ?></title>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet">
  <!-- Bootstrap 5 -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />

  <!-- Bootstrap Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

  <!-- What2Eat Global CSS -->
  <link rel="stylesheet" href="../assets/css/style.css" />

  <style>
    /* ===== PROFILE PAGE STYLES ===== */
    body {
      background-color: var(--w2e-bg);
      font-family: var(--font);
      padding-bottom: 90px;
    }

    /* ---- Navbar (same as dashboard) ---- */
    .w2e-navbar {
      background: #fff;
      border-bottom: 1px solid var(--w2e-border);
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
      position: sticky;
      top: 0;
      z-index: 1030;
    }
    .w2e-navbar .navbar-brand {
    font-weight: 600;
      font-size: 1.5rem;
      color: var(--w2e-secondary) !important;
      letter-spacing: -0.5px;
    }
    .w2e-navbar .navbar-brand span { color: var(--w2e-primary); }
    .w2e-navbar .nav-link {
      font-weight: 500;
      color: var(--w2e-text-muted) !important;
      padding: 0.6rem 1rem !important;
      border-radius: 8px;
      transition: color 0.2s, background 0.2s;
      font-size: 0.93rem;
    }
    .w2e-navbar .nav-link:hover {
      color: var(--w2e-primary) !important;
      background: rgba(212,160,23,0.08);
    }
    .w2e-avatar-btn {
      background: none;
      border: 2px solid var(--w2e-primary);
      border-radius: 50px;
      padding: 4px 12px 4px 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .w2e-avatar-btn:hover { box-shadow: 0 0 0 3px rgba(212,160,23,0.2); }
    .w2e-avatar-btn img {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
    }
    .w2e-avatar-btn .w2e-avatar-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--w2e-text);
    }

    /* ---- Profile Header ---- */
    .w2e-profile-header {
    background: var(--secondary);
      padding: 3rem 0 0;
      position: relative;
      overflow: hidden;
    }
    .w2e-profile-header::before {
      content: '';
      position: absolute;
      top: -80px; right: -80px;
      width: 350px; height: 350px;
      background: rgba(255,255,255,0.05);
      border-radius: 50%;
    }
    .w2e-profile-header-inner {
      position: relative;
      z-index: 1;
      color: #fff;
    }
    .w2e-profile-avatar-wrap {
      position: relative;
      display: inline-block;
    }
    .w2e-profile-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid rgba(255,255,255,0.3);
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    }
    .w2e-profile-avatar-edit {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--w2e-primary);
      border: 2px solid #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      color: #fff;
      transition: background 0.2s;
    }
    .w2e-profile-avatar-edit:hover { background: var(--w2e-primary-dark); }

    .w2e-profile-name {
      font-size: 1.6rem;
      font-weight: 600;
      margin-bottom: 0.2rem;
    }
    .w2e-profile-email {
      font-size: 0.9rem;
      opacity: 0.75;
      margin-bottom: 1rem;
    }
    .w2e-profile-stats {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .w2e-profile-stat {
      text-align: center;
    }
    .w2e-profile-stat-num {
      font-size: 1.4rem;
      font-weight: 500;
    }
    .w2e-profile-stat-label {
      font-size: 0.75rem;
      opacity: 0.75;
    }
    .w2e-stat-divider {
      width: 1px;
      background: rgba(255,255,255,0.25);
      height: 40px;
      align-self: center;
    }

    .w2e-btn-change-avatar {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      color: #fff;
      border-radius: var(--w2e-btn-radius);
      padding: 8px 18px;
      font-size: 0.85rem;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      transition: background 0.2s;
    }
    .w2e-btn-change-avatar:hover { background: rgba(255,255,255,0.28); }

    /* ---- Tabs ---- */
    .w2e-profile-tabs {
      background: rgba(255,255,255,0.12);
      margin-top: 2rem;
    }
    .w2e-profile-tabs .nav-tabs {
      border: none;
      padding: 0 1rem;
      gap: 0;
      flex-wrap: nowrap;
      overflow-x: auto;
    }
    .w2e-profile-tabs .nav-link {
      border: none;
      border-bottom: 3px solid transparent;
      border-radius: 0;
      color: rgba(255,255,255,0.7) !important;
      font-size: 0.88rem;
      font-weight: 500;
      padding: 0.8rem 1.2rem;
      white-space: nowrap;
      transition: color 0.2s, border-color 0.2s;
    }
    .w2e-profile-tabs .nav-link:hover {
      color: #fff !important;
      border-bottom-color: rgba(255,255,255,0.4);
    }
    .w2e-profile-tabs .nav-link.active {
      color: #fff !important;
      background: transparent;
      border-bottom-color: var(--w2e-primary);
      font-weight: 600;
    }

    /* ---- Tab Content Card ---- */
    .w2e-profile-content {
      background: #fff;
      border-radius: 0 0 var(--w2e-card-radius) var(--w2e-card-radius);
    }
    .w2e-tab-pane-inner {
      padding: 2.5rem;
    }
    @media (max-width: 575.98px) {
      .w2e-tab-pane-inner { padding: 1.5rem 1rem; }
    }

    /* ---- Form Styles ---- */
    .w2e-form-label {
      font-size: 0.87rem;
      font-weight: 600;
      color: var(--w2e-secondary);
      margin-bottom: 0.4rem;
    }
    .w2e-form-control {
      border: 1px solid var(--w2e-border);
      border-radius: 10px;
      padding: 10px 14px;
      font-family: inherit;
      font-size: 0.9rem;
      color: var(--w2e-text);
      background: var(--w2e-bg);
      transition: border-color 0.2s, box-shadow 0.2s;
      width: 100%;
    }
    .w2e-form-control:focus {
      outline: none;
      border-color: var(--w2e-primary);
      box-shadow: 0 0 0 3px rgba(212,160,23,0.15);
    }
    .w2e-form-control[readonly] {
    background: var(--border);
      color: var(--w2e-text-muted);
      cursor: not-allowed;
    }
    .w2e-form-control.is-invalid { border-color: var(--w2e-error); }
    .w2e-form-control.is-valid { border-color: var(--w2e-success); }

    select.w2e-form-control {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236F6258' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 36px;
    }

    .w2e-form-hint {
      font-size: 0.78rem;
      color: var(--w2e-text-muted);
      margin-top: 5px;
    }

    /* ---- Save Button ---- */
    .w2e-btn-save {
      background: var(--w2e-primary);
      color: #fff;
      border: none;
      border-radius: var(--w2e-btn-radius);
      padding: 11px 32px;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.93rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    }
    .w2e-btn-save:hover{ background: var(--w2e-primary-dark);
    box-shadow: 0 6px 20px rgba(212,160,23,0.3) }
    .w2e-btn-save:active { transform: translateY(0); }

    .w2e-btn-danger {
      background: var(--w2e-error);
      color: #fff;
      border: none;
      border-radius: var(--w2e-btn-radius);
      padding: 11px 28px;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.93rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s, transform 0.15s;
    }
    .w2e-btn-danger:hover{ background: var(--error) }
    .w2e-btn-outline-secondary {
      background: transparent;
      color: var(--w2e-text-muted);
      border: 1px solid var(--w2e-border);
      border-radius: var(--w2e-btn-radius);
      padding: 10px 24px;
      font-family: inherit;
      font-weight: 500;
      font-size: 0.9rem;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }
    .w2e-btn-outline-secondary:hover {
      border-color: var(--w2e-secondary);
      color: var(--w2e-secondary);
    }

    /* ---- Preferences / Checkboxes ---- */
    .w2e-pref-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    .w2e-pref-item {
      border: 1px solid var(--w2e-border);
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: border-color 0.2s, background 0.2s;
      user-select: none;
    }
    .w2e-pref-item:hover { border-color: var(--w2e-primary); background: rgba(212,160,23,0.04); }
    .w2e-pref-item input[type="checkbox"] { display: none; }
    .w2e-pref-item.checked {
      border-color: var(--w2e-primary);
      background: rgba(212,160,23,0.08);
    }
    .w2e-pref-check-box {
      width: 20px;
      height: 20px;
      border: 2px solid var(--w2e-border);
      border-radius: 6px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.2s, background 0.2s;
    }
    .w2e-pref-item.checked .w2e-pref-check-box {
      border-color: var(--w2e-primary);
      background: var(--w2e-primary);
    }
    .w2e-pref-check-box i { font-size: 0.75rem; color: #fff; display: none; }
    .w2e-pref-item.checked .w2e-pref-check-box i { display: block; }
    .w2e-pref-text { font-size: 0.85rem; font-weight: 500; color: var(--w2e-text); }

    /* Budget Radio */
    .w2e-budget-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }
    .w2e-budget-item {
      border: 1px solid var(--w2e-border);
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
      text-align: center;
      transition: border-color 0.2s, background 0.2s;
      user-select: none;
      position: relative;
    }
    .w2e-budget-item input[type="radio"] { position: absolute; opacity: 0; }
    .w2e-budget-item:hover { border-color: var(--w2e-primary); }
    .w2e-budget-item.selected {
      border-color: var(--w2e-primary);
      background: rgba(212,160,23,0.08);
    }
    .w2e-budget-amount { font-size: 0.88rem; font-weight: 500; color: var(--w2e-secondary); }
    .w2e-budget-label { font-size: 0.75rem; color: var(--w2e-text-muted); margin-top: 2px; }

    /* Distance Slider */
    .w2e-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, var(--w2e-primary) 0%, var(--w2e-primary) 40%, var(--border) 40%);
      outline: none;
    }
    .w2e-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--w2e-primary);
      cursor: pointer;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .w2e-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--w2e-primary);
      cursor: pointer;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .w2e-slider-value {
    font-weight: 500;
      font-size: 1.1rem;
      color: var(--w2e-primary);
    }

    /* ---- Security ---- */
    .w2e-password-strength {
      height: 4px;
      border-radius: 2px;
      margin-top: 8px;
      background: var(--border);
      overflow: hidden;
    }
    .w2e-password-strength-bar {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s, background 0.3s;
      width: 0%;
    }

    /* ---- Account Info ---- */
    .w2e-account-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid var(--w2e-border);
    }
    .w2e-account-info-row:last-of-type { border-bottom: none; }
    .w2e-account-info-label { font-size: 0.87rem; font-weight: 500; color: var(--w2e-text-muted); }
    .w2e-account-info-value { font-size: 0.93rem; font-weight: 600; color: var(--w2e-text); }
    .w2e-badge-active {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(45,155,111,0.12);
      color: var(--success);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .w2e-badge-active::before {
      content: '';
      width: 7px;
      height: 7px;
      background: var(--success);
      border-radius: 50%;
      display: inline-block;
    }

    .w2e-danger-zone {
      border: 1px solid rgba(224,90,90,0.3);
      border-radius: 12px;
      padding: 1.5rem;
      background: rgba(224,90,90,0.03);
    }
    .w2e-danger-zone h5 {
      font-size: 1rem;
      font-weight: 500;
      color: var(--error);
      margin-bottom: 0.4rem;
    }
    .w2e-danger-zone p {
      font-size: 0.87rem;
      color: var(--w2e-text-muted);
      margin-bottom: 1rem;
    }

    /* ---- Toast notification ---- */
    .w2e-toast-container {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .w2e-toast {
      background: #fff;
      border-radius: 12px;
      padding: 14px 18px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      border-left: 4px solid var(--w2e-success);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 280px;
      animation: w2e-toast-in 0.3s ease;
    }
    .w2e-toast.error { border-left-color: var(--w2e-error); }
    @keyframes w2e-toast-in {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .w2e-toast-icon { font-size: 1.2rem; }
    .w2e-toast-text { font-size: 0.88rem; font-weight: 500; color: var(--w2e-text); }

    /* ---- Section divider ---- */
    .w2e-section-divider {
      height: 1px;
      background: var(--w2e-border);
      margin: 1.5rem 0;
    }

    /* ---- Mobile Bottom Nav ---- */
    .w2e-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-top: 1px solid var(--w2e-border);
      z-index: 1040;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
    }
    .w2e-bottom-nav-inner {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 8px 0 6px;
    }
    .w2e-bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      text-decoration: none;
      color: var(--w2e-text-muted);
      font-size: 0.7rem;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 10px;
      transition: color 0.2s;
    }
    .w2e-bottom-nav-item i { font-size: 1.3rem; }
    .w2e-bottom-nav-item.active { color: var(--w2e-primary); }
    .w2e-bottom-nav-item:hover { color: var(--w2e-primary); }

    @media (max-width: 767.98px) {
      .w2e-bottom-nav { display: block; }
      .w2e-profile-stats { gap: 1.2rem; }
      .w2e-profile-name { font-size: 1.3rem; }
    }
    @media (max-width: 575.98px) {
      .w2e-profile-tabs .nav-tabs { padding: 0; }
      .w2e-profile-tabs .nav-link { padding: 0.7rem 0.8rem; font-size: 0.8rem; }
    }
  </style>
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>

<body>

<!-- ====================== NAVBAR ====================== -->
<nav class="navbar navbar-expand-lg w2e-navbar">
  <div class="container">
    <a class="navbar-brand" href="../index.php">What<span>2</span>Eat</a>

    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav2">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="mainNav2">
      <ul class="navbar-nav mx-auto gap-1">
        <li class="nav-item"><a class="nav-link" href="../index.php"><i class="bi bi-house-door me-1"></i>Trang chủ</a></li>
        <li class="nav-item"><a class="nav-link" href="./discovery.php"><i class="bi bi-compass me-1"></i>Khám phá</a></li>
        <li class="nav-item"><a class="nav-link" href="./food-notes.php"><i class="bi bi-journal-bookmark me-1"></i>Food Notes</a></li>
        <li class="nav-item"><a class="nav-link" href="./food-plans.php"><i class="bi bi-calendar3 me-1"></i>Food Plans</a></li>
        <li class="nav-item"><a class="nav-link" href="./dashboard.php"><i class="bi bi-bar-chart-line me-1"></i>Dashboard</a></li>
      </ul>

      <!-- Avatar Dropdown (active state = border gold) -->
      <div class="dropdown">
        <button class="w2e-avatar-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <img alt="Ảnh đại diện" hidden />
          <span class="w2e-avatar-name d-none d-lg-inline">Tài khoản</span>
          <i class="bi bi-chevron-down" style="font-size:0.75rem; color:var(--w2e-text-muted);"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="border-radius:12px; min-width:200px; margin-top:8px;">
          <li>
            <div class="px-4 pt-3 pb-2 border-bottom">
            <div data-w2e-user-name style="font-weight:600; font-size:0.93rem; color:var(--w2e-text);">Tài khoản</div>
              <div data-w2e-user-email style="font-size:0.8rem; color:var(--w2e-text-muted);">Đang tải…</div>
            </div>
          </li>
          <li><a class="dropdown-item py-2 active" href="./profile.php"><i class="bi bi-person me-2"></i>Hồ sơ cá nhân</a></li>
          <li><a class="dropdown-item py-2" href="./dashboard.php"><i class="bi bi-bar-chart-line me-2"></i>Dashboard</a></li>
          <li><a class="dropdown-item py-2" href="./food-plans.php"><i class="bi bi-calendar3 me-2"></i>Food Plans</a></li>
          <li><hr class="dropdown-divider" /></li>
          <li><a class="dropdown-item py-2 text-danger" href="./login.php"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
        </ul>
      </div>
    </div>
  </div>
</nav>

<!-- ====================== TOAST CONTAINER ====================== -->
<div class="w2e-toast-container" id="toastContainer" aria-live="polite"></div>

<!-- ====================== PROFILE HEADER ====================== -->
<section class="w2e-profile-header" aria-label="Thông tin cá nhân">
  <div class="container">
    <div class="w2e-profile-header-inner">
      <div class="d-flex flex-column flex-md-row align-items-md-center gap-4 pb-4">

        <!-- Avatar -->
        <div class="flex-shrink-0">
          <div class="w2e-profile-avatar-wrap">
            <img
              class="w2e-profile-avatar"
              alt="Ảnh đại diện"
              id="profileAvatarImg"
              hidden
            />
            <div class="w2e-profile-avatar-edit" id="avatarEditButton" role="button" tabindex="0" title="Thay đổi ảnh đại diện" aria-label="Thay đổi ảnh đại diện">
              <i class="bi bi-camera-fill"></i>
            </div>
            <input type="file" id="avatarFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;" />
          </div>
        </div>

        <!-- Info -->
        <div class="flex-grow-1">
          <h1 class="w2e-profile-name">Tài khoản</h1>
          <p class="w2e-profile-email">
            Đang tải…
          </p>

          <!-- Stats -->
          <div class="w2e-profile-stats mb-3">
            <div class="w2e-profile-stat">
              <div class="w2e-profile-stat-num">—</div>
              <div class="w2e-profile-stat-label">Food Notes</div>
            </div>
            <div class="w2e-stat-divider"></div>
            <div class="w2e-profile-stat">
              <div class="w2e-profile-stat-num">—</div>
              <div class="w2e-profile-stat-label">Yêu thích</div>
            </div>
            <div class="w2e-stat-divider"></div>
            <div class="w2e-profile-stat">
              <div class="w2e-profile-stat-num">—</div>
              <div class="w2e-profile-stat-label">Food Plans</div>
            </div>
          </div>

          <!-- Change Avatar Button -->
          <button type="button" class="w2e-btn-change-avatar" id="profileAvatarButton">
            <i class="bi bi-camera"></i>
            Thay đổi ảnh đại diện
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Tab Nav (inside header footer) -->
  <div class="w2e-profile-tabs">
    <div class="container">
      <ul class="nav nav-tabs" id="profileTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="tab-info-btn" data-bs-toggle="tab" data-bs-target="#tab-info" type="button" role="tab" aria-controls="tab-info" aria-selected="true">
            <i class="bi bi-person me-1"></i>Thông tin cá nhân
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tab-pref-btn" data-bs-toggle="tab" data-bs-target="#tab-pref" type="button" role="tab" aria-controls="tab-pref" aria-selected="false">
            <i class="bi bi-heart me-1"></i>Sở thích ăn uống
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tab-security-btn" data-bs-toggle="tab" data-bs-target="#tab-security" type="button" role="tab" aria-controls="tab-security" aria-selected="false">
            <i class="bi bi-shield-lock me-1"></i>Bảo mật
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tab-account-btn" data-bs-toggle="tab" data-bs-target="#tab-account" type="button" role="tab" aria-controls="tab-account" aria-selected="false">
            <i class="bi bi-gear me-1"></i>Tài khoản
          </button>
        </li>
      </ul>
    </div>
  </div>
</section>

<!-- ====================== TAB CONTENT ====================== -->
<section class="container py-4">
  <div class="w2e-profile-content shadow-sm">
    <div class="tab-content" id="profileTabContent">

      <!-- ========== TAB 1: THÔNG TIN CÁ NHÂN ========== -->
      <div class="tab-pane fade show active" id="tab-info" role="tabpanel" aria-labelledby="tab-info-btn">
        <div class="w2e-tab-pane-inner">
        <h2 style="font-size:1.15rem; font-weight: 500; color:var(--w2e-secondary); margin-bottom:0.3rem;">
            <i class="bi bi-person-badge me-2" style="color:var(--w2e-primary);"></i>Thông tin cá nhân
          </h2>
          <p style="font-size:0.85rem; color:var(--w2e-text-muted); margin-bottom:1.5rem;">
            Cập nhật thông tin hồ sơ và địa chỉ email của bạn.
          </p>

          <form id="infoForm" novalidate>
            <div class="row g-4">

              <!-- Họ và tên -->
              <div class="col-12 col-md-6">
                <label class="w2e-form-label" for="fullName">
                  <i class="bi bi-person me-1"></i>Họ và tên <span style="color:var(--w2e-error);">*</span>
                </label>
                <input
                  type="text"
                  class="w2e-form-control"
                  id="fullName"
                  name="fullName"
                  placeholder="Nhập họ và tên đầy đủ"
                  required
                />
              </div>

              <!-- Email -->
              <div class="col-12 col-md-6">
                <label class="w2e-form-label" for="email">
                  <i class="bi bi-envelope me-1"></i>Email
                </label>
                <input
                  type="email"
                  class="w2e-form-control"
                  id="email"
                  name="email"
                  readonly
                />
                <div class="w2e-form-hint">
                  <i class="bi bi-info-circle me-1"></i>Email không thể thay đổi. Liên hệ hỗ trợ nếu cần.
                </div>
              </div>

              <!-- Số điện thoại -->
              <div class="col-12 col-md-6">
                <label class="w2e-form-label" for="phone">
                  <i class="bi bi-telephone me-1"></i>Số điện thoại
                </label>
                <input
                  type="tel"
                  class="w2e-form-control"
                  id="phone"
                  name="phone"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <!-- Ngày sinh -->
              <div class="col-12 col-md-6">
                <label class="w2e-form-label" for="dob">
                  <i class="bi bi-calendar me-1"></i>Ngày sinh
                </label>
                <input
                  type="date"
                  class="w2e-form-control"
                  id="dob"
                  name="dob"
                />
              </div>

              <!-- Giới tính -->
              <div class="col-12 col-md-6">
                <label class="w2e-form-label" for="gender">
                  <i class="bi bi-gender-ambiguous me-1"></i>Giới tính
                </label>
                <select class="w2e-form-control" id="gender" name="gender">
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <!-- Địa chỉ -->
              <div class="col-12 col-md-6">
                <label class="w2e-form-label" for="address">
                  <i class="bi bi-geo-alt me-1"></i>Địa chỉ
                </label>
                <input
                  type="text"
                  class="w2e-form-control"
                  id="address"
                  name="address"
                  placeholder="Quận/Huyện, Tỉnh/Thành phố"
                />
              </div>

              <!-- Submit -->
              <div class="col-12">
                <div class="w2e-section-divider"></div>
                <div class="d-flex gap-3 align-items-center flex-wrap">
                  <button type="submit" class="w2e-btn-save">
                    <i class="bi bi-check2-circle"></i>Lưu thông tin
                  </button>
                  <button type="button" class="w2e-btn-outline-secondary" id="resetInfoButton">
                    Hủy thay đổi
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- ========== TAB 2: SỞ THÍCH ĂN UỐNG ========== -->
      <div class="tab-pane fade" id="tab-pref" role="tabpanel" aria-labelledby="tab-pref-btn">
        <div class="w2e-tab-pane-inner">
        <h2 style="font-size:1.15rem; font-weight: 500; color:var(--w2e-secondary); margin-bottom:0.3rem;">
            <i class="bi bi-heart me-2" style="color:var(--w2e-primary);"></i>Sở thích ăn uống
          </h2>
          <p style="font-size:0.85rem; color:var(--w2e-text-muted); margin-bottom:1.5rem;">
            Giúp chúng tôi gợi ý nhà hàng và món ăn phù hợp với bạn hơn.
          </p>

          <form id="prefForm" novalidate>

            <!-- Loại ẩm thực -->
            <div class="mb-4">
              <label class="w2e-form-label mb-3">
                <i class="bi bi-bowl me-1"></i>Loại ẩm thực yêu thích <span style="font-size:0.78rem; font-weight:400; color:var(--w2e-text-muted);">(chọn nhiều)</span>
              </label>
              <div class="w2e-pref-grid" id="cuisineGrid">

                <label class="w2e-pref-item">
                  <input type="checkbox" name="cuisine" value="viet" />
                  <div class="w2e-pref-check-box"><i class="bi bi-check"></i></div>
                  <span class="w2e-pref-text">Món Việt</span>
                </label>

                <label class="w2e-pref-item">
                  <input type="checkbox" name="cuisine" value="bbq" />
                  <div class="w2e-pref-check-box"><i class="bi bi-check"></i></div>
                  <span class="w2e-pref-text">BBQ/Lẩu</span>
                </label>

                <label class="w2e-pref-item">
                  <input type="checkbox" name="cuisine" value="coffee" />
                  <div class="w2e-pref-check-box"><i class="bi bi-check"></i></div>
                  <span class="w2e-pref-text">Cà phê</span>
                </label>

                <label class="w2e-pref-item">
                  <input type="checkbox" name="cuisine" value="japanese" />
                  <div class="w2e-pref-check-box"><i class="bi bi-check"></i></div>
                  <span class="w2e-pref-text">Nhật Bản</span>
                </label>

                <label class="w2e-pref-item">
                  <input type="checkbox" name="cuisine" value="korean" />
                  <div class="w2e-pref-check-box"><i class="bi bi-check"></i></div>
                  <span class="w2e-pref-text">Hàn Quốc</span>
                </label>

                <label class="w2e-pref-item">
                  <input type="checkbox" name="cuisine" value="fastfood" />
                  <div class="w2e-pref-check-box"><i class="bi bi-check"></i></div>
                  <span class="w2e-pref-text">Ăn nhanh</span>
                </label>

                <label class="w2e-pref-item">
                  <input type="checkbox" name="cuisine" value="dessert" />
                  <div class="w2e-pref-check-box"><i class="bi bi-check"></i></div>
                  <span class="w2e-pref-text">Tráng miệng</span>
                </label>
              </div>
            </div>

            <div class="w2e-section-divider"></div>

            <!-- Budget thường ngày -->
            <div class="mb-4">
              <label class="w2e-form-label mb-3">
                <i class="bi bi-wallet2 me-1"></i>Ngân sách ăn uống thường ngày
              </label>
              <div class="w2e-budget-grid" id="budgetGrid">

                <label class="w2e-budget-item">
                  <input type="radio" name="budget" value="under50k" />
                  <div class="w2e-budget-amount">Dưới 50K</div>
                  <div class="w2e-budget-label">/ bữa ăn</div>
                </label>

                <label class="w2e-budget-item">
                  <input type="radio" name="budget" value="50to100k" />
                  <div class="w2e-budget-amount">50K – 100K</div>
                  <div class="w2e-budget-label">/ bữa ăn</div>
                </label>

                <label class="w2e-budget-item">
                  <input type="radio" name="budget" value="100to200k" />
                  <div class="w2e-budget-amount">100K – 200K</div>
                  <div class="w2e-budget-label">/ bữa ăn</div>
                </label>

                <label class="w2e-budget-item">
                  <input type="radio" name="budget" value="over200k" />
                  <div class="w2e-budget-amount">Trên 200K</div>
                  <div class="w2e-budget-label">/ bữa ăn</div>
                </label>
              </div>
            </div>

            <div class="w2e-section-divider"></div>

            <!-- Khoảng cách -->
            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <label class="w2e-form-label mb-0" for="distanceSlider">
                  <i class="bi bi-geo me-1"></i>Khoảng cách tối đa
                </label>
                <div>
                  <span class="w2e-slider-value" id="distanceValue">2</span>
                  <span style="font-size:0.85rem; color:var(--w2e-text-muted);"> km</span>
                </div>
              </div>
              <input
                type="range"
                class="w2e-slider"
                id="distanceSlider"
                min="0.5"
                max="10"
                step="0.5"
                value="2"
              />
              <div class="d-flex justify-content-between mt-1">
                <span style="font-size:0.75rem; color:var(--w2e-text-muted);">0.5 km</span>
                <span style="font-size:0.75rem; color:var(--w2e-text-muted);">10 km</span>
              </div>
            </div>

            <!-- Submit -->
            <div class="w2e-section-divider"></div>
            <div class="d-flex gap-3 align-items-center flex-wrap">
              <button type="submit" class="w2e-btn-save">
                <i class="bi bi-check2-circle"></i>Cập nhật sở thích
              </button>
              <button type="button" class="w2e-btn-outline-secondary" id="resetPrefButton">
                Đặt lại mặc định
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========== TAB 3: BẢO MẬT ========== -->
      <div class="tab-pane fade" id="tab-security" role="tabpanel" aria-labelledby="tab-security-btn">
        <div class="w2e-tab-pane-inner">
        <h2 style="font-size:1.15rem; font-weight: 500; color:var(--w2e-secondary); margin-bottom:0.3rem;">
            <i class="bi bi-shield-lock me-2" style="color:var(--w2e-primary);"></i>Bảo mật tài khoản
          </h2>
          <p style="font-size:0.85rem; color:var(--w2e-text-muted); margin-bottom:1.5rem;">
            Đổi mật khẩu thường xuyên để bảo vệ tài khoản của bạn.
          </p>

          <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-6">

              <form id="securityForm" novalidate>

                <!-- Mật khẩu hiện tại -->
                <div class="mb-4">
                  <label class="w2e-form-label" for="currentPwd">
                    <i class="bi bi-lock me-1"></i>Mật khẩu hiện tại <span style="color:var(--w2e-error);">*</span>
                  </label>
                  <div style="position:relative;">
                    <input
                      type="password"
                      class="w2e-form-control"
                      id="currentPwd"
                      name="currentPwd"
                      placeholder="Nhập mật khẩu hiện tại"
                      required
                    />
                    <button type="button" class="btn-toggle-pwd" data-target="currentPwd" aria-label="Hiện mật khẩu" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--w2e-text-muted);padding:0;">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                </div>

                <!-- Mật khẩu mới -->
                <div class="mb-4">
                  <label class="w2e-form-label" for="newPwd">
                    <i class="bi bi-lock-fill me-1"></i>Mật khẩu mới <span style="color:var(--w2e-error);">*</span>
                  </label>
                  <div style="position:relative;">
                    <input
                      type="password"
                      class="w2e-form-control"
                      id="newPwd"
                      name="newPwd"
                      placeholder="Tối thiểu 8 ký tự"
                      required
                    />
                    <button type="button" class="btn-toggle-pwd" data-target="newPwd" aria-label="Hiện mật khẩu" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--w2e-text-muted);padding:0;">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                  <!-- Strength bar -->
                  <div class="w2e-password-strength" id="strengthBar">
                    <div class="w2e-password-strength-bar" id="strengthBarFill"></div>
                  </div>
                  <div style="font-size:0.78rem; margin-top:4px;" id="strengthText"></div>
                  <div class="w2e-form-hint">Mật khẩu mạnh: tối thiểu 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.</div>
                </div>

                <!-- Xác nhận mật khẩu mới -->
                <div class="mb-4">
                  <label class="w2e-form-label" for="confirmPwd">
                    <i class="bi bi-lock-fill me-1"></i>Xác nhận mật khẩu mới <span style="color:var(--w2e-error);">*</span>
                  </label>
                  <div style="position:relative;">
                    <input
                      type="password"
                      class="w2e-form-control"
                      id="confirmPwd"
                      name="confirmPwd"
                      placeholder="Nhập lại mật khẩu mới"
                      required
                    />
                    <button type="button" class="btn-toggle-pwd" data-target="confirmPwd" aria-label="Hiện mật khẩu" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--w2e-text-muted);padding:0;">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                  <div style="font-size:0.78rem; margin-top:5px;" id="confirmMsg"></div>
                </div>

                <!-- Submit -->
                <div class="w2e-section-divider"></div>
                <button type="submit" class="w2e-btn-save w-100">
                  <i class="bi bi-shield-check"></i>Đổi mật khẩu
                </button>
              </form>

              <!-- Tips -->
              <div class="mt-4 p-3" style="background:rgba(45,155,111,0.07); border-radius:12px; border:1px solid rgba(45,155,111,0.2);">
              <h6 style="font-size:0.87rem; font-weight: 500; color:var(--success); margin-bottom:0.5rem;"><i class="bi bi-lightbulb me-1"></i>Mẹo bảo mật</h6>
                <ul style="font-size:0.8rem; color:var(--w2e-text-muted); margin:0; padding-left:1.2rem;">
                  <li>Không dùng cùng mật khẩu trên nhiều trang web.</li>
                  <li>Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.</li>
                  <li>Tránh dùng tên, ngày sinh hoặc thông tin cá nhân.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== TAB 4: TÀI KHOẢN ========== -->
      <div class="tab-pane fade" id="tab-account" role="tabpanel" aria-labelledby="tab-account-btn">
        <div class="w2e-tab-pane-inner">
        <h2 style="font-size:1.15rem; font-weight: 500; color:var(--w2e-secondary); margin-bottom:0.3rem;">
            <i class="bi bi-gear me-2" style="color:var(--w2e-primary);"></i>Thông tin tài khoản
          </h2>
          <p style="font-size:0.85rem; color:var(--w2e-text-muted); margin-bottom:1.5rem;">
            Xem thông tin tài khoản và thực hiện các thao tác quản lý.
          </p>

          <!-- Account info rows -->
          <div class="mb-4" style="max-width:580px;">
            <div class="w2e-account-info-row">
              <span class="w2e-account-info-label"><i class="bi bi-calendar-check me-2"></i>Ngày tạo tài khoản</span>
              <span class="w2e-account-info-value" id="accountCreatedAt">Đang tải…</span>
            </div>
            <div class="w2e-account-info-row">
              <span class="w2e-account-info-label"><i class="bi bi-activity me-2"></i>Trạng thái</span>
              <span class="w2e-account-info-value" id="accountStatus">Đang tải…</span>
            </div>
            <div class="w2e-account-info-row">
              <span class="w2e-account-info-label"><i class="bi bi-envelope me-2"></i>Email xác thực</span>
              <span class="w2e-account-info-value" id="accountEmailVerified">Đang tải…</span>
            </div>
            <div class="w2e-account-info-row">
              <span class="w2e-account-info-label"><i class="bi bi-clock-history me-2"></i>Lần đăng nhập cuối</span>
              <span class="w2e-account-info-value" id="accountLastLogin">—</span>
            </div>
            <div class="w2e-account-info-row">
              <span class="w2e-account-info-label"><i class="bi bi-star me-2"></i>Gói dịch vụ</span>
              <span style="display:inline-flex;align-items:center;gap:6px;background:rgba(212,160,23,0.12);color:var(--w2e-primary);border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:600;">
                <i class="bi bi-star-fill" style="font-size:0.75rem;"></i>Tài khoản thường
              </span>
            </div>
          </div>

          <div class="w2e-section-divider"></div>

          <!-- Xuất dữ liệu -->
          <div class="mb-4">
          <h5 style="font-size:1rem; font-weight: 500; color:var(--w2e-secondary); margin-bottom:0.4rem;">
              <i class="bi bi-download me-1"></i>Xuất dữ liệu cá nhân
            </h5>
            <p style="font-size:0.87rem; color:var(--w2e-text-muted); margin-bottom:1rem;">
              Tải hồ sơ, Food Notes, địa điểm yêu thích, Food Plans và địa điểm bạn đã đóng góp dưới dạng JSON. Tệp đính kèm được xuất dưới dạng liên kết, không nhúng vào file.
            </p>
            <button type="button" class="w2e-btn-outline-secondary" id="exportDataButton">
              <i class="bi bi-file-earmark-arrow-down me-2"></i>Xuất dữ liệu
            </button>
          </div>

          <div class="w2e-section-divider"></div>

          <!-- Xóa tài khoản -->
          <div class="w2e-danger-zone">
            <h5><i class="bi bi-exclamation-triangle-fill me-1"></i>Vùng nguy hiểm</h5>
            <p>
            Food Notes, tệp đính kèm, địa điểm yêu thích và Food Plans của bạn sẽ bị xóa. Địa điểm đã đóng góp vào thư mục dùng chung có thể được giữ lại sau khi tách khỏi tài khoản. Hành động này <strong>không thể hoàn tác</strong>.
            </p>
            <button class="w2e-btn-danger" data-bs-toggle="modal" data-bs-target="#deleteModal">
              <i class="bi bi-trash3-fill"></i>Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div><!-- /tab-content -->
  </div><!-- /w2e-profile-content -->
</section>

<!-- ====================== DELETE ACCOUNT MODAL ====================== -->
<div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content" style="border-radius:16px; border:none; overflow:hidden;">

      <!-- Header -->
      <div class="modal-header" style="background:var(--error); border-bottom:none; padding:1.5rem 1.5rem 1rem;">
      <h5 class="modal-title" id="deleteModalLabel" style="font-weight: 500; color:#fff; font-size:1.1rem;">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>Xác nhận xóa tài khoản
        </h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Đóng"></button>
      </div>

      <!-- Body -->
      <div class="modal-body" style="padding:1.5rem;">
        <div class="text-center mb-4">
          <p style="font-size:0.93rem; color:var(--w2e-text); margin-bottom:0.5rem;">
            Bạn có <strong>chắc chắn</strong> muốn xóa tài khoản <strong id="deleteAccountEmail">đang tải…</strong>?
          </p>
          <p style="font-size:0.84rem; color:var(--w2e-text-muted);">
            Thao tác này sẽ xóa <strong id="deleteNoteCount">—</strong> Food Notes, <strong id="deleteFavoriteCount">—</strong> địa điểm yêu thích và các Food Plans liên quan. Đóng góp địa điểm dùng chung và nhật ký bảo mật có thể được giữ lại. Không thể hoàn tác.
          </p>
        </div>

        <div class="mb-3">
          <label class="w2e-form-label" for="deletePassword">Mật khẩu hiện tại</label>
          <input type="password" class="w2e-form-control" id="deletePassword" autocomplete="current-password" required />
        </div>

        <!-- Confirm input -->
        <div class="mb-3">
          <label class="w2e-form-label" for="deleteConfirmInput">
            Nhập <strong>XÓA TÀI KHOẢN</strong> để xác nhận:
          </label>
          <input
            type="text"
            class="w2e-form-control"
            id="deleteConfirmInput"
            placeholder="XÓA TÀI KHOẢN"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer" style="border-top:1px solid var(--w2e-border); padding:1rem 1.5rem;">
        <button type="button" class="w2e-btn-outline-secondary" data-bs-dismiss="modal">
          Hủy bỏ
        </button>
        <button
          type="button"
          class="w2e-btn-danger"
          id="confirmDeleteBtn"
          disabled
          style="opacity:0.5; cursor:not-allowed;"
        >
          <i class="bi bi-trash3-fill"></i>Xóa vĩnh viễn
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ====================== MOBILE BOTTOM NAV ====================== -->
<nav class="w2e-bottom-nav" aria-label="Mobile navigation">
  <div class="w2e-bottom-nav-inner">
    <a class="w2e-bottom-nav-item" href="../index.php">
      <i class="bi bi-house-door"></i>
      <span>Trang chủ</span>
    </a>
    <a class="w2e-bottom-nav-item" href="./discovery.php">
      <i class="bi bi-compass"></i>
      <span>Khám phá</span>
    </a>
    <a class="w2e-bottom-nav-item" href="./food-notes.php">
      <i class="bi bi-journal-bookmark"></i>
      <span>Food Notes</span>
    </a>
    <a class="w2e-bottom-nav-item" href="./dashboard.php">
      <i class="bi bi-bar-chart-line"></i>
      <span>Dashboard</span>
    </a>
    <a class="w2e-bottom-nav-item active" href="./profile.php">
      <i class="bi bi-person-circle"></i>
      <span>Hồ sơ</span>
    </a>
  </div>
</nav>

<!-- Bootstrap 5 JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

  <script src="../assets/js/site.js"></script>
</body>
</html>
