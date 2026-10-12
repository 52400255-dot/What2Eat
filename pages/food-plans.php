<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Food Plan – What2Eat';
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
  <link rel="stylesheet" href="../assets/css/style.css" />
  <style>
    /* ============================================================
       FOOD PLANS PAGE – CUSTOM STYLES
    ============================================================ */
    * { box-sizing: border-box; }
    body {
    font-family: var(--font);
      background-color: var(--w2e-bg);
      color: var(--w2e-text);
      padding-bottom: 80px;
    }

    /* ---- NAVBAR ---- */
    .w2e-navbar {
      background: #fff;
      border-bottom: 1px solid var(--w2e-border);
      position: sticky; top: 0; z-index: 1000;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }
    .w2e-navbar .navbar-brand {
    font-weight: 600; font-size: 1.3rem;
      color: var(--w2e-secondary) !important; letter-spacing: -0.5px;
    }
    .w2e-navbar .navbar-brand span { color: var(--w2e-primary); }
    .w2e-navbar .nav-link {
      color: var(--w2e-text-sec) !important; font-weight: 500;
      font-size: 0.92rem; padding: 0.5rem 0.9rem !important;
      border-radius: 8px; transition: all .2s;
    }
    .w2e-navbar .nav-link:hover { color: var(--w2e-primary) !important; background: var(--primary-light); }
    .w2e-navbar .nav-link.w2e-active { color: var(--w2e-primary) !important; font-weight: 500; background: var(--primary-light); }
    .w2e-btn-primary {
      background: var(--w2e-primary); color: #fff;
      border: none; border-radius: var(--w2e-radius-btn);
      font-weight: 600; padding: 0.6rem 1.4rem;
      font-size: 0.92rem; transition: all .2s;
      text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
      font-family: inherit; cursor: pointer;
    }
    .w2e-btn-primary:hover{ background: var(--primary-dark); color: #fff }
    .w2e-btn-outline {
      border: 1px solid var(--w2e-primary); border-radius: var(--w2e-radius-btn);
      color: var(--w2e-primary); background: transparent;
      font-weight: 600; font-size: 0.88rem; padding: 0.48rem 1.2rem;
      cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 6px;
      font-family: inherit;
    }
    .w2e-btn-outline:hover { background: var(--w2e-primary); color: #fff; }

    /* ---- PAGE HEADER ---- */
    .w2e-page-header {
    background: var(--bg);
      border-bottom: 1px solid var(--w2e-border);
      padding: 2.2rem 0 1.8rem;
    }
    .w2e-page-header h1 { font-size: 2rem; font-weight: 600; color: var(--w2e-secondary); }
    .w2e-page-header p { color: var(--w2e-text-sec); font-size: 0.95rem; margin-bottom: 0; }

    /* ---- PLAN CARD ---- */
    .w2e-plan-card {
      background: #fff;
      border-radius: var(--w2e-radius-card);
      border: 1px solid var(--w2e-border);
      box-shadow: var(--w2e-shadow);
      overflow: hidden;
      transition: all .25s;
      cursor: pointer;
    }
    .w2e-plan-card:hover{ box-shadow: 0 10px 32px rgba(0,0,0,0.12);
    border-color: var(--w2e-primary) }
    .w2e-plan-card.active-detail { border-color: var(--w2e-primary); box-shadow: 0 0 0 3px rgba(212,160,23,0.2); }

    .w2e-plan-card-header {
      padding: 1.2rem 1.3rem 0.8rem;
      border-bottom: 1px solid var(--w2e-border);
      background: var(--bg);
    }
    .w2e-plan-name {
    font-size: 1.05rem; font-weight: 600; color: var(--w2e-secondary);
      margin-bottom: 4px;
    }
    .w2e-plan-body { padding: 1rem 1.3rem; }

    /* Status badge */
    .w2e-status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      border-radius: 20px; padding: 3px 12px; font-size: 0.78rem; font-weight: 500;
    }
    .w2e-status-voting { background: #FFF3CD; color: #856404; }
    .w2e-status-decided { background: #D1E7DD; color: #0A5033; }

    /* Member avatars */
    .w2e-avatar-stack { display: flex; margin-top: 0.5rem; }
    .w2e-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      border: 2.5px solid #fff;
      object-fit: cover; margin-left: -8px;
      font-size: 0.75rem; font-weight: 500;
      display: flex; align-items: center; justify-content: center;
    }
    .w2e-avatar:first-child { margin-left: 0; }
    .w2e-avatar-count {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--w2e-border); color: var(--w2e-text-sec);
      border: 2.5px solid #fff; margin-left: -8px;
      font-size: 0.72rem; font-weight: 500;
      display: flex; align-items: center; justify-content: center;
    }

    .w2e-plan-meta { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.6rem; }
    .w2e-plan-meta-item {
      font-size: 0.82rem; color: var(--w2e-text-sec);
      display: flex; align-items: center; gap: 5px;
    }
    .w2e-plan-meta-item i { color: var(--w2e-primary); }

    .w2e-plan-winner {
    background: var(--success-light);
      border-radius: 10px; padding: 8px 12px; margin-top: 0.6rem;
      display: flex; align-items: center; gap: 8px;
      font-size: 0.85rem;
    }
    .w2e-plan-winner .w2e-winner-name { font-weight: 500; color: #0A5033; }
    .w2e-plan-winner .w2e-winner-sub { font-size: 0.77rem; color: #1A7050; }

    .w2e-plan-card-footer {
      padding: 0.75rem 1.3rem;
      border-top: 1px solid var(--w2e-border);
      background: var(--w2e-bg);
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px;
    }
    .w2e-plan-date { font-size: 0.78rem; color: var(--w2e-text-sec); }
    .w2e-see-detail-btn {
      font-size: 0.82rem; font-weight: 600; color: var(--w2e-primary);
      background: none; border: none; cursor: pointer;
      display: flex; align-items: center; gap: 4px; padding: 0;
      font-family: inherit; transition: gap .2s;
    }
    .w2e-see-detail-btn:hover { gap: 8px; }

    /* ---- DETAIL SECTION ---- */
    .w2e-detail-section {
      background: #fff;
      border: 1px solid var(--w2e-primary);
      border-radius: var(--w2e-radius-card);
      box-shadow: 0 8px 32px rgba(212,160,23,0.12);
      overflow: hidden;
      margin-top: 2rem;
      display: none;
    }
    .w2e-detail-section.show { display: block; animation: slideIn .3s ease; }
    @keyframes slideIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:none} }

    .w2e-detail-header {
    background: var(--bg);
      padding: 1.3rem 1.5rem;
      border-bottom: 1px solid var(--w2e-border);
      display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
    }
    .w2e-detail-title { font-size: 1.25rem; font-weight: 600; color: var(--w2e-secondary); }
    .w2e-detail-close {
      background: none; border: 1px solid var(--w2e-border);
      border-radius: 8px; padding: 5px 10px; cursor: pointer;
      color: var(--w2e-text-sec); font-size: 0.85rem; transition: all .2s;
      font-family: inherit;
    }
    .w2e-detail-close:hover { border-color: var(--w2e-error); color: var(--w2e-error); }
    .w2e-detail-body { padding: 1.5rem; }

    /* Vote restaurant item */
    .w2e-vote-item {
      background: var(--w2e-bg);
      border: 1px solid var(--w2e-border);
      border-radius: 14px; padding: 1rem 1.2rem;
      margin-bottom: 0.9rem;
      display: flex; align-items: center; gap: 1rem;
      transition: all .2s;
    }
    .w2e-vote-item:hover { border-color: var(--w2e-primary); }
    .w2e-vote-item .w2e-vote-info { flex: 1; min-width: 0; }
    .w2e-vote-item .w2e-vote-rest-name {
    font-weight: 500; font-size: 0.95rem; color: var(--w2e-text);
      text-decoration: none; display: block;
    }
    .w2e-vote-item .w2e-vote-rest-name:hover { color: var(--w2e-primary); text-decoration: underline; }
    .w2e-vote-item .w2e-vote-meta {
      font-size: 0.8rem; color: var(--w2e-text-sec); display: flex; gap: 1rem; flex-wrap: wrap;
      margin-top: 3px;
    }
    .w2e-vote-item .w2e-vote-meta span { display: flex; align-items: center; gap: 4px; }
    .w2e-vote-bar-wrap { flex-shrink: 0; text-align: right; }
    .w2e-vote-bar-bg {
      background: var(--w2e-border); border-radius: 20px; height: 8px;
      width: 100px; overflow: hidden; margin-bottom: 4px;
    }
    .w2e-vote-bar { height: 100%; border-radius: 20px; background: var(--w2e-primary); transition: width .5s; }
    .w2e-vote-count { font-size: 0.8rem; font-weight: 500; color: var(--w2e-text-sec); }
    .w2e-vote-btn {
      background: var(--w2e-primary); color: #fff;
      border: none; border-radius: 8px; padding: 6px 16px;
      font-size: 0.82rem; font-weight: 500; cursor: pointer;
      transition: all .2s; font-family: inherit;
      white-space: nowrap; flex-shrink: 0;
    }
    .w2e-vote-btn:hover { background: var(--primary-dark); transform: scale(1.04); }
    .w2e-vote-btn.voted {
      background: var(--w2e-success); cursor: default;
    }
    .w2e-vote-btn.voted:hover { transform: none; background: var(--w2e-success); }

    /* Members list */
    .w2e-member-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 0; border-bottom: 1px solid var(--w2e-border);
      font-size: 0.88rem;
    }
    .w2e-member-item:last-child { border-bottom: none; }
    .w2e-member-avatar {
      width: 38px; height: 38px; border-radius: 50%; object-fit: cover;
      flex-shrink: 0;
    }
    .w2e-member-name { font-weight: 600; color: var(--w2e-text); }
    .w2e-member-role { font-size: 0.77rem; color: var(--w2e-text-sec); }
    .w2e-host-badge {
      background: #FFF3CD; color: #856404; font-size: 0.7rem;
      font-weight: 500; border-radius: 20px; padding: 1px 9px; margin-left: 6px;
    }

    /* Invite input */
    .w2e-invite-wrap {
      display: flex; gap: 8px;
      background: var(--w2e-bg); border: 1px solid var(--w2e-border);
      border-radius: 10px; overflow: hidden; padding: 4px;
    }
    .w2e-invite-wrap input {
      flex: 1; border: none; outline: none; background: transparent;
      font-family: inherit; font-size: 0.88rem; color: var(--w2e-text);
      padding: 6px 10px;
    }
    .w2e-invite-wrap button {
      background: var(--w2e-primary); color: #fff; border: none;
      border-radius: 8px; padding: 6px 16px; font-weight: 600;
      font-size: 0.85rem; cursor: pointer; font-family: inherit;
      transition: background .2s;
    }
    .w2e-invite-wrap button:hover { background: var(--primary-dark); }

    /* ---- MODAL: TẠO FOOD PLAN ---- */
    .w2e-modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.45); z-index: 2000;
      align-items: center; justify-content: center; padding: 1rem;
    }
    .w2e-modal-overlay.show { display: flex; }
    .w2e-modal-box {
      background: #fff; border-radius: var(--w2e-radius-card);
      box-shadow: 0 16px 60px rgba(0,0,0,0.2); width: 100%; max-width: 520px;
      max-height: 90vh; overflow-y: auto;
      animation: modalIn .25s ease;
    }
    @keyframes modalIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:none} }
    .w2e-modal-header {
      padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--w2e-border);
      background: var(--bg);
      display: flex; align-items: center; justify-content: space-between;
    }
    .w2e-modal-title { font-size: 1.1rem; font-weight: 600; color: var(--w2e-secondary); }
    .w2e-modal-close {
      background: none; border: none; font-size: 1.2rem;
      color: var(--w2e-text-sec); cursor: pointer; padding: 4px 8px; border-radius: 6px;
    }
    .w2e-modal-close:hover { background: var(--border); }
    .w2e-modal-body { padding: 1.5rem; }
    .w2e-modal-footer {
      padding: 1rem 1.5rem; border-top: 1px solid var(--w2e-border);
      display: flex; justify-content: flex-end; gap: 10px; background: var(--w2e-bg);
    }
    .w2e-modal-cancel {
      background: none; border: 1px solid var(--w2e-border);
      border-radius: 8px; padding: 8px 18px; cursor: pointer;
      font-size: 0.88rem; font-weight: 600; color: var(--w2e-text-sec);
      font-family: inherit; transition: all .2s;
    }
    .w2e-modal-cancel:hover { border-color: var(--w2e-text-sec); }

    .w2e-form-label { font-weight: 600; font-size: 0.88rem; color: var(--w2e-secondary); margin-bottom: 6px; display: block; }
    .w2e-form-input, .w2e-form-textarea {
      width: 100%; border: 1px solid var(--w2e-border); border-radius: 10px;
      font-family: inherit; font-size: 0.9rem; color: var(--w2e-text);
      background: var(--w2e-bg); padding: 0.6rem 1rem; outline: none; transition: border-color .2s;
    }
    .w2e-form-input:focus, .w2e-form-textarea:focus {
      border-color: var(--w2e-primary); box-shadow: 0 0 0 3px rgba(212,160,23,0.12);
    }
    .w2e-form-textarea { resize: vertical; min-height: 80px; }

    /* Email chips */
    .w2e-email-chips {
      border: 1px solid var(--w2e-border); border-radius: 10px;
      padding: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
      min-height: 48px; cursor: text; background: var(--w2e-bg);
    }
    .w2e-email-chips:focus-within { border-color: var(--w2e-primary); box-shadow: 0 0 0 3px rgba(212,160,23,0.12); }
    .w2e-email-chip {
      background: #E8F5F0; color: var(--w2e-success); border-radius: 20px;
      padding: 3px 10px 3px 12px; font-size: 0.8rem; font-weight: 600;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .w2e-email-chip button {
      background: rgba(45,155,111,0.2); border: none; border-radius: 50%;
      width: 16px; height: 16px; color: var(--w2e-success);
      font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;
    }
    .w2e-email-chips input {
      border: none; outline: none; background: transparent;
      font-family: inherit; font-size: 0.88rem; color: var(--w2e-text);
      min-width: 160px; flex: 1;
    }

    /* ---- MOBILE BOTTOM NAV ---- */
    .w2e-bottom-nav {
      display: none; position: fixed; bottom: 0; left: 0; right: 0;
      background: #fff; border-top: 1px solid var(--w2e-border);
      z-index: 999; padding: 0.4rem 0 0.5rem;
    }
    .w2e-bottom-nav-inner { display: flex; justify-content: space-around; }
    .w2e-bnav-item {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      text-decoration: none; color: var(--w2e-text-sec); font-size: 0.68rem; font-weight: 500; padding: 4px 10px;
    }
    .w2e-bnav-item i { font-size: 1.2rem; }
    .w2e-bnav-item.active { color: var(--w2e-primary); }

    @media (max-width: 768px) {
      .w2e-bottom-nav { display: block; }
      body { padding-bottom: 70px; }
      .w2e-page-header h1 { font-size: 1.5rem; }
      .w2e-vote-bar-bg { width: 70px; }
    }
    @media (max-width: 480px) {
      .w2e-vote-item { flex-wrap: wrap; }
    }

    /* Section heading */
    .w2e-section-title {
    font-size: 1.1rem; font-weight: 500; color: var(--w2e-secondary);
      margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;
    }

    /* Color chips for avatars */
    .av-blue { background: var(--info); color: #fff; }
    .av-green { background: var(--success); color: #fff; }
    .av-orange { background: var(--primary); color: #fff; }
    .av-pink { background: var(--error); color: #fff; }
    .av-purple { background: #7C5CBF; color: #fff; }
    .av-teal { background: #17A589; color: #fff; }
  </style>
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body>

<!-- ===================== NAVBAR ===================== -->
<nav class="navbar navbar-expand-lg w2e-navbar">
  <div class="container">
    <a class="navbar-brand" href="../index.php">What<span>2</span>Eat</a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav ms-auto align-items-lg-center gap-1 mb-2 mb-lg-0">
        <li class="nav-item"><a class="nav-link" href="../index.php"><i class="bi bi-house me-1"></i>Trang Chủ</a></li>
        <li class="nav-item"><a class="nav-link" href="./discovery.php"><i class="bi bi-compass me-1"></i>Khám Phá</a></li>
        <li class="nav-item"><a class="nav-link" href="./food-notes.php"><i class="bi bi-journal-text me-1"></i>Food Note</a></li>
        <li class="nav-item"><a class="nav-link w2e-active" href="./food-plans.php"><i class="bi bi-calendar3 me-1"></i>Food Plan</a></li>
        <li class="nav-item"><a class="nav-link" href="./dashboard.php"><i class="bi bi-grid me-1"></i>Dashboard</a></li>
        <li class="nav-item ms-lg-2">
          <button class="w2e-btn-primary" onclick="openCreateModal()">
            <i class="bi bi-plus-lg"></i> Tạo Food Plan Mới
          </button>
        </li>
      </ul>
    </div>
  </div>
</nav>

<!-- ===================== PAGE HEADER ===================== -->
<div class="w2e-page-header">
  <div class="container">
    <div class="d-flex align-items-start align-items-md-center justify-content-between flex-column flex-md-row gap-3">
      <div>
      <h1 class="mb-1">Food Plan</h1>
        <p>Lên kế hoạch ăn uống cùng bạn bè, vote quán và chốt địa điểm dễ dàng</p>
      </div>
      <button class="w2e-btn-primary" onclick="openCreateModal()">
        <i class="bi bi-plus-lg"></i> Tạo Food Plan Mới
      </button>
    </div>
  </div>
</div>

<!-- ===================== MAIN CONTENT ===================== -->
<div class="container mt-4">

  <!-- ====== FOOD PLAN CARDS ====== -->
  <div class="w2e-section-title">Danh Sách Food Plan</div>
  <div class="row g-4 mb-4" id="foodPlanGrid" aria-live="polite">
    <p class="text-secondary">Đang tải Food Plan của bạn…</p>
  </div>
</div><!-- /.container -->
<!-- ===================== MODAL: TẠO FOOD PLAN ===================== -->
<div class="w2e-modal-overlay" id="createModal" onclick="closeModalOutside(event)">
  <div class="w2e-modal-box">
    <div class="w2e-modal-header">
    <div class="w2e-modal-title">Tạo Food Plan Mới</div>
      <button class="w2e-modal-close" onclick="closeCreateModal()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="w2e-modal-body">

      <!-- Tên nhóm -->
      <div class="mb-3">
        <label class="w2e-form-label" for="planName">Tên Nhóm / Sự Kiện <span style="color:var(--w2e-error)">*</span></label>
        <input type="text" id="planName" class="w2e-form-input" placeholder="VD: Birthday Dinner, Họp mặt cuối năm..." />
      </div>

      <!-- Mô tả -->
      <div class="mb-3">
        <label class="w2e-form-label" for="planDesc">Mô Tả</label>
        <textarea id="planDesc" class="w2e-form-textarea" placeholder="Mô tả ngắn về kế hoạch ăn uống của nhóm bạn..."></textarea>
      </div>

      <!-- Ngày -->
      <div class="mb-3">
        <label class="w2e-form-label" for="planDate">Ngày Dự Kiến</label>
        <input type="date" id="planDate" class="w2e-form-input" />
      </div>

      <!-- Giờ -->
      <div class="mb-3">
        <label class="w2e-form-label" for="planTime">Giờ Dự Kiến</label>
        <input type="time" id="planTime" class="w2e-form-input" />
      </div>

      <!-- Thêm thành viên -->
      <div class="mb-3">
        <label class="w2e-form-label">Thêm Thành Viên</label>
        <div class="w2e-email-chips" id="emailChipsWrap" onclick="document.getElementById('emailChipInput').focus()">
          <input type="email" id="emailChipInput" placeholder="Nhập email thành viên, nhấn Enter..." />
        </div>
        <div style="font-size:0.77rem;color:var(--w2e-text-sec);margin-top:4px">
          Sau khi tạo, sao chép liên kết mời để thêm thành viên vào kế hoạch.
        </div>
      </div>
    </div>
    <div class="w2e-modal-footer">
      <button class="w2e-modal-cancel" onclick="closeCreateModal()">Hủy</button>
      <button class="w2e-btn-primary" onclick="createPlan()">
        <i class="bi bi-plus-circle"></i> Tạo Nhóm
      </button>
    </div>
  </div>
</div>

<!-- ===================== MOBILE BOTTOM NAV ===================== -->
<nav class="w2e-bottom-nav">
  <div class="w2e-bottom-nav-inner">
    <a class="w2e-bnav-item active" href="../index.php"><i class="bi bi-house"></i><span>Trang Chủ</span></a>
    <a class="w2e-bnav-item" href="./discovery.php"><i class="bi bi-compass"></i><span>Khám Phá</span></a>
    <a class="w2e-bnav-item" href="./food-notes.php"><i class="bi bi-journal-text"></i><span>Notes</span></a>
    <a class="w2e-bnav-item" href="./food-plans.php"><i class="bi bi-calendar3"></i><span>Plans</span></a>
    <a class="w2e-bnav-item" href="./dashboard.php"><i class="bi bi-person"></i><span>Cá Nhân</span></a>
  </div>
</nav>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
  // CREATE MODAL
  // ============================================================
  function openCreateModal() {
    document.getElementById('createModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeCreateModal() {
    document.getElementById('createModal').classList.remove('show');
    document.body.style.overflow = '';
  }
  function closeModalOutside(e) {
    if (e.target === document.getElementById('createModal')) closeCreateModal();
  }


</script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
