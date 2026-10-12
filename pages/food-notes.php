<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Food Note Của Tôi – What2Eat';
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
       FOOD NOTES PAGE – CUSTOM STYLES
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
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }
    .w2e-navbar .navbar-brand {
    font-weight: 600;
      font-size: 1.3rem;
      color: var(--w2e-secondary) !important;
      letter-spacing: -0.5px;
    }
    .w2e-navbar .navbar-brand span { color: var(--w2e-primary); }
    .w2e-navbar .nav-link {
      color: var(--w2e-text-sec) !important;
      font-weight: 500;
      font-size: 0.92rem;
      padding: 0.5rem 0.9rem !important;
      border-radius: 8px;
      transition: all .2s;
    }
    .w2e-navbar .nav-link:hover { color: var(--w2e-primary) !important; background: var(--primary-light); }
    .w2e-navbar .nav-link.w2e-active { color: var(--w2e-primary) !important; font-weight: 500; background: var(--primary-light); }
    .w2e-navbar .w2e-btn-create {
      background: var(--w2e-primary);
      color: #fff;
      border: none;
      border-radius: var(--w2e-radius-btn);
      padding: 0.45rem 1.1rem;
      font-size: 0.88rem;
      font-weight: 600;
      transition: all .2s;
    }
    .w2e-navbar .w2e-btn-create:hover { background: var(--primary-dark); color: #fff; }

    /* ---- PAGE HEADER ---- */
    .w2e-page-header {
    background: var(--bg);
    border-bottom: 1px solid var(--w2e-border);
      padding: 2.2rem 0 1.8rem;
    }
    .w2e-page-header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--w2e-secondary);
    }
    .w2e-page-header p {
      color: var(--w2e-text-sec);
      font-size: 0.95rem;
      margin-bottom: 0;
    }
    .w2e-btn-primary {
      background: var(--w2e-primary);
      color: #fff;
      border: none;
      border-radius: var(--w2e-radius-btn);
      font-weight: 600;
      padding: 0.6rem 1.4rem;
      font-size: 0.92rem;
      transition: all .2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .w2e-btn-primary:hover{ background: var(--primary-dark); color: #fff }

    /* ---- TOOLBAR ---- */
    .w2e-toolbar {
      background: #fff;
      border: 1px solid var(--w2e-border);
      border-radius: var(--w2e-radius-card);
      padding: 1.2rem 1.4rem;
      box-shadow: var(--w2e-shadow);
      margin: 1.6rem 0 1rem;
    }
    .w2e-search-wrap { position: relative; }
    .w2e-search-wrap .w2e-search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--w2e-text-sec);
      font-size: 1rem;
    }
    .w2e-search-wrap input {
      padding-left: 40px;
      border: 1px solid var(--w2e-border);
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.9rem;
      background: var(--w2e-bg);
      color: var(--w2e-text);
      transition: border-color .2s;
    }
    .w2e-search-wrap input:focus {
      border-color: var(--w2e-primary);
      box-shadow: 0 0 0 3px rgba(212,160,23,0.12);
      outline: none;
    }
    .w2e-select {
      border: 1px solid var(--w2e-border);
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.88rem;
      color: var(--w2e-text);
      background: var(--w2e-bg);
      padding: 0.45rem 0.85rem;
      cursor: pointer;
    }
    .w2e-select:focus { border-color: var(--w2e-primary); outline: none; }

    /* Tags filter */
    .w2e-tag-filter { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 0.9rem; align-items: center; }
    .w2e-tag-filter span { font-size: 0.82rem; color: var(--w2e-text-sec); font-weight: 500; }
    .w2e-tag-btn {
    background: var(--primary-light);
      border: 1px solid var(--w2e-border);
      border-radius: 20px;
      padding: 3px 14px;
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--w2e-text-sec);
      cursor: pointer;
      transition: all .2s;
    }
    .w2e-tag-btn:hover, .w2e-tag-btn.active {
      background: var(--w2e-primary);
      border-color: var(--w2e-primary);
      color: #fff;
    }

    /* View toggle */
    .w2e-view-toggle { display: flex; gap: 4px; }
    .w2e-view-btn {
      width: 36px; height: 36px;
      border: 1px solid var(--w2e-border);
      border-radius: 8px;
      background: #fff;
      color: var(--w2e-text-sec);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all .2s;
      font-size: 1rem;
    }
    .w2e-view-btn.active, .w2e-view-btn:hover {
      background: var(--w2e-primary);
      border-color: var(--w2e-primary);
      color: #fff;
    }

    /* ---- SECTION HEADING ---- */
    .w2e-section-title {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--w2e-secondary);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ---- NOTE CARD (GRID) ---- */
    .w2e-note-card {
      background: #fff;
      border-radius: var(--w2e-radius-card);
      border: 1px solid var(--w2e-border);
      box-shadow: var(--w2e-shadow);
      overflow: hidden;
      transition: all .25s;
      position: relative;
      cursor: pointer;
    }
    .w2e-note-card:hover{ box-shadow: 0 8px 28px rgba(0,0,0,0.11);
    border-color: var(--w2e-primary) }
    .w2e-note-card .w2e-card-img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      display: block;
    }
    .w2e-note-card .w2e-card-body { padding: 1rem 1rem 0.85rem; }
    .w2e-note-card .w2e-food-name {
    font-weight: 500;
      font-size: 1rem;
      color: var(--w2e-text);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .w2e-note-card .w2e-rating {
      font-size: 0.85rem;
      color: var(--warning);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
    }
    .w2e-note-card .w2e-rating span { color: var(--w2e-text); font-weight: 600; font-size: 0.88rem; }
    .w2e-note-card .w2e-price {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--w2e-primary);
      margin-bottom: 5px;
    }
    .w2e-note-card .w2e-comment {
      font-size: 0.83rem;
      color: var(--w2e-text-sec);
      line-height: 1.45;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .w2e-note-card .w2e-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
    .w2e-tag-badge {
    background: var(--primary-light);
    border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2px 10px;
      font-size: 0.75rem;
      color: var(--w2e-secondary);
      font-weight: 500;
    }
    .w2e-note-card .w2e-card-footer {
      border-top: 1px solid var(--w2e-border);
      padding: 0.6rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .w2e-note-card .w2e-date {
      font-size: 0.78rem;
      color: var(--w2e-text-sec);
    }
    .w2e-note-card .w2e-actions { display: flex; gap: 6px; }
    .w2e-action-btn {
      width: 28px; height: 28px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--w2e-text-sec);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all .2s;
      padding: 0;
    }
    .w2e-action-btn:hover { background: var(--primary-light); color: var(--w2e-primary); }
    .w2e-action-btn.w2e-danger:hover { background: #FFEEEE; color: var(--w2e-error); }

    /* Privacy badge */
    .w2e-privacy-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .w2e-privacy-public { background: rgba(45,155,111,0.88); color: #fff; }
    .w2e-privacy-private { background: rgba(74,44,26,0.88); color: #fff; }

    /* PIN badge */
    .w2e-pin-ribbon {
      position: absolute;
      top: 12px;
      left: 12px;
      background: var(--w2e-primary);
      color: #fff;
      border-radius: 8px;
      padding: 2px 9px;
      font-size: 0.72rem;
      font-weight: 500;
    }

    /* ---- PINNED SECTION ---- */
    .w2e-pinned-section {
    background: var(--bg);
      border: 1px dashed #E8C97A;
      border-radius: var(--w2e-radius-card);
      padding: 1.2rem 1.4rem;
      margin-bottom: 1.8rem;
    }

    /* ---- LIST VIEW ---- */
    .w2e-note-list-item {
      background: #fff;
      border-radius: var(--w2e-radius-card);
      border: 1px solid var(--w2e-border);
      box-shadow: var(--w2e-shadow);
      overflow: hidden;
      display: flex;
      align-items: stretch;
      margin-bottom: 1rem;
      transition: all .2s;
      position: relative;
    }
    .w2e-note-list-item:hover {
      border-color: var(--w2e-primary);
      box-shadow: 0 6px 24px rgba(0,0,0,0.09);
    }
    .w2e-note-list-item .w2e-list-img {
      width: 140px;
      min-height: 120px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .w2e-note-list-item .w2e-list-body {
      flex: 1;
      padding: 0.9rem 1.1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .w2e-note-list-item .w2e-list-actions {
      padding: 0.9rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: space-between;
      gap: 8px;
    }

    /* ---- EMPTY STATE ---- */
    .w2e-empty-state {
      text-align: center;
      padding: 4rem 1rem;
    }
    .w2e-empty-state h3 {
      font-size: 1.2rem;
      font-weight: 500;
      color: var(--w2e-secondary);
      margin-bottom: 0.5rem;
    }
    .w2e-empty-state p {
      color: var(--w2e-text-sec);
      font-size: 0.9rem;
    }

    /* ---- MOBILE BOTTOM NAV ---- */
    .w2e-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: #fff;
      border-top: 1px solid var(--w2e-border);
      z-index: 999;
      padding: 0.4rem 0 0.5rem;
    }
    .w2e-bottom-nav-inner {
      display: flex;
      justify-content: space-around;
    }
    .w2e-bnav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-decoration: none;
      color: var(--w2e-text-sec);
      font-size: 0.68rem;
      font-weight: 500;
      padding: 4px 10px;
    }
    .w2e-bnav-item i { font-size: 1.2rem; }
    .w2e-bnav-item.active { color: var(--w2e-primary); }

    @media (max-width: 768px) {
      .w2e-bottom-nav { display: block; }
      body { padding-bottom: 70px; }
      .w2e-page-header h1 { font-size: 1.5rem; }
    }
    @media (max-width: 576px) {
      .w2e-toolbar { padding: 1rem; }
    }

    /* grid helpers */
    .w2e-notes-grid { display: grid; gap: 1.2rem; }
    .w2e-notes-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
    .w2e-notes-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 992px) {
      .w2e-notes-grid.grid-3 { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 576px) {
      .w2e-notes-grid.grid-3,
      .w2e-notes-grid.grid-2 { grid-template-columns: 1fr; }
    }
    .w2e-hidden { display: none !important; }

    /* Stats bar */
    .w2e-stats-bar {
      display: flex; gap: 1.5rem; flex-wrap: wrap;
      margin-bottom: 1.2rem;
      align-items: center;
    }
    .w2e-stat-chip {
      background: #fff;
      border: 1px solid var(--w2e-border);
      border-radius: 30px;
      padding: 5px 16px;
      font-size: 0.83rem;
      font-weight: 500;
      color: var(--w2e-text-sec);
      display: flex; align-items: center; gap: 6px;
    }
    .w2e-stat-chip strong { color: var(--w2e-text); }
  </style>
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body>

<!-- ===================== NAVBAR ===================== -->
<nav class="navbar navbar-expand-lg w2e-navbar">
  <div class="container">
    <a class="navbar-brand" href="../index.php">
      What<span>2</span>Eat
    </a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav ms-auto align-items-lg-center gap-1 mb-2 mb-lg-0">
        <li class="nav-item"><a class="nav-link" href="../index.php"><i class="bi bi-house me-1"></i>Trang Chủ</a></li>
        <li class="nav-item"><a class="nav-link" href="./discovery.php"><i class="bi bi-compass me-1"></i>Khám Phá</a></li>
        <li class="nav-item"><a class="nav-link w2e-active" href="./food-notes.php"><i class="bi bi-journal-text me-1"></i>Food Note</a></li>
        <li class="nav-item"><a class="nav-link" href="./food-plans.php"><i class="bi bi-calendar3 me-1"></i>Food Plan</a></li>
        <li class="nav-item"><a class="nav-link" href="./dashboard.php"><i class="bi bi-grid me-1"></i>Dashboard</a></li>
        <li class="nav-item ms-lg-2">
          <a href="./create-food-note.php" class="w2e-btn-create">
            <i class="bi bi-plus-lg"></i> Tạo Food Note
          </a>
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
      <h1 class="mb-1">Food Note Của Tôi</h1>
        <p>Lưu lại những trải nghiệm ăn uống đáng nhớ</p>
      </div>
      <a href="./create-food-note.php" class="w2e-btn-primary">
        <i class="bi bi-plus-lg"></i> Tạo Food Note
      </a>
    </div>
  </div>
</div>

<!-- ===================== MAIN CONTENT ===================== -->
<div class="container mt-0">

  <!-- TOOLBAR -->
  <div class="w2e-toolbar">
    <div class="row g-2 align-items-center">
      <!-- Search -->
      <div class="col-12 col-md-5">
        <div class="w2e-search-wrap">
          <i class="bi bi-search w2e-search-icon"></i>
          <input type="text" id="noteSearch" class="form-control w2e-search-wrap" placeholder="Tìm kiếm ghi chú..." />
        </div>
      </div>
      <!-- Rating filter -->
      <div class="col-6 col-md-2">
        <select class="form-select w2e-select w-100" id="ratingFilter">
        <option value="">Tất cả sao</option>
        <option value="5">5 sao</option>
        <option value="4">4+ sao</option>
        <option value="3">3+ sao</option>
        </select>
      </div>
      <!-- Time filter -->
      <div class="col-6 col-md-2">
        <select class="form-select w2e-select w-100" id="timeFilter">
        <option value="newest">Mới nhất</option>
        <option value="oldest">Cũ nhất</option>
        </select>
      </div>
      <!-- View toggle -->
      <div class="col-12 col-md-3 d-flex justify-content-md-end gap-2 align-items-center">
        <span style="font-size:.8rem;color:var(--w2e-text-sec)">Hiển thị:</span>
        <div class="w2e-view-toggle">
          <button class="w2e-view-btn active" id="btnGrid" title="Dạng lưới" onclick="setView('grid')">
            <i class="bi bi-grid-3x3-gap"></i>
          </button>
          <button class="w2e-view-btn" id="btnList" title="Dạng danh sách" onclick="setView('list')">
            <i class="bi bi-list-ul"></i>
          </button>
        </div>
      </div>
    </div>
    <!-- Tags filter -->
    <div class="w2e-tag-filter" aria-label="Bộ lọc thẻ"></div>
  </div>

  <!-- STATS BAR -->
  <div class="w2e-stats-bar">
    <div class="w2e-stat-chip"><i class="bi bi-journal-text" style="color:var(--w2e-primary)"></i><strong id="foodNoteCount">—</strong> ghi chú</div>
    <div class="w2e-stat-chip"><i class="bi bi-pin-angle" style="color:var(--w2e-primary)"></i><strong id="pinnedFoodNoteCount">—</strong> đã ghim</div>
    <div class="w2e-stat-chip"><i class="bi bi-star-fill" style="color:var(--warning)"></i>TB <strong id="foodNoteAverage">—</strong> / 5</div>
    <div class="w2e-stat-chip"><i class="bi bi-heart-fill" style="color:var(--w2e-error)"></i><strong id="favoriteFoodNoteCount">—</strong> yêu thích</div>
  </div>

  <!-- ====== PINNED NOTES ====== -->
  <div class="w2e-pinned-section"><div class="w2e-section-title">Đã Ghim</div><div class="w2e-notes-grid grid-2"></div></div>

  <!-- ====== FOOD NOTE GRID ====== -->
  <div class="w2e-section-title">Tất Cả Ghi Chú</div>

  <!-- GRID VIEW -->
  <div id="gridView" class="w2e-notes-grid grid-3">
  </div><!-- /#gridView -->

  <!-- LIST VIEW (hidden by default) -->
  <div id="listView" class="w2e-hidden">
  </div><!-- /#listView -->

  <div class="text-center my-4">
    <button id="loadMoreNotes" class="w2e-btn-outline" type="button" hidden>Tải thêm ghi chú</button>
  </div>

  <!-- EMPTY STATE (hidden by default) -->
  <div id="emptyState" class="w2e-empty-state w2e-hidden">
    <h3>Chưa có ghi chú nào</h3>
    <p>Hãy bắt đầu lưu lại những trải nghiệm ăn uống đáng nhớ của bạn!</p>
    <a href="./create-food-note.php" class="w2e-btn-primary mt-3 mx-auto" style="width:fit-content">
      <i class="bi bi-plus-lg"></i> Tạo Food Note Đầu Tiên
    </a>
  </div>
</div><!-- /.container -->

<!-- ===================== MOBILE BOTTOM NAV ===================== -->
<nav class="w2e-bottom-nav">
  <div class="w2e-bottom-nav-inner">
    <a class="w2e-bnav-item" href="../index.php"><i class="bi bi-house"></i><span>Trang Chủ</span></a>
    <a class="w2e-bnav-item" href="./discovery.php"><i class="bi bi-compass"></i><span>Khám Phá</span></a>
    <a class="w2e-bnav-item active" href="./food-notes.php"><i class="bi bi-journal-text"></i><span>Notes</span></a>
    <a class="w2e-bnav-item" href="./food-plans.php"><i class="bi bi-calendar3"></i><span>Plans</span></a>
    <a class="w2e-bnav-item" href="./dashboard.php"><i class="bi bi-person"></i><span>Cá Nhân</span></a>
  </div>
</nav>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
  // ---- VIEW TOGGLE ----
  function setView(mode) {
    const grid = document.getElementById('gridView');
    const list = document.getElementById('listView');
    const btnGrid = document.getElementById('btnGrid');
    const btnList = document.getElementById('btnList');
    if (mode === 'grid') {
      grid.classList.remove('w2e-hidden');
      list.classList.add('w2e-hidden');
      btnGrid.classList.add('active');
      btnList.classList.remove('active');
    } else {
      list.classList.remove('w2e-hidden');
      grid.classList.add('w2e-hidden');
      btnList.classList.add('active');
      btnGrid.classList.remove('active');
    }
  }

  // ---- TAG FILTER ----
  function toggleTag(el, tag) {
    document.querySelectorAll('.w2e-tag-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }

  // ---- HEART TOGGLE ----
  document.querySelectorAll('.w2e-action-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const icon = this.querySelector('i');
      if (icon && icon.classList.contains('bi-heart')) {
        icon.classList.replace('bi-heart', 'bi-heart-fill');
        icon.style.color = '#E05A5A';
      } else if (icon && icon.classList.contains('bi-heart-fill')) {
        icon.classList.replace('bi-heart-fill', 'bi-heart');
        icon.style.color = '';
      }
    });
  });

  // ---- PIN TOGGLE ----
  document.querySelectorAll('.w2e-action-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const icon = this.querySelector('i');
      if (icon && icon.classList.contains('bi-pin-angle')) {
        icon.classList.replace('bi-pin-angle', 'bi-pin-angle-fill');
        icon.style.color = 'var(--w2e-primary)';
      }
    });
  });
</script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
