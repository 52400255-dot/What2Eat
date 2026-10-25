<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Tạo Food Note – What2Eat';
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
       CREATE FOOD NOTE PAGE – CUSTOM STYLES
    ============================================================ */
    * { box-sizing: border-box; }
    body {
    font-family: var(--font);
      background-color: var(--w2e-bg);
      color: var(--w2e-text);
      min-height: 100vh;
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
    .w2e-navbar .w2e-nav-title {
      font-weight: 600; font-size: 0.95rem; color: var(--w2e-text-sec);
    }
    .w2e-back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--w2e-text-sec); font-size: 0.88rem; font-weight: 500;
      text-decoration: none; padding: 6px 14px;
      border: 1px solid var(--w2e-border); border-radius: 8px;
      background: #fff; transition: all .2s;
    }
    .w2e-back-btn:hover { border-color: var(--w2e-primary); color: var(--w2e-primary); }

    /* ---- AUTOSAVE ---- */
    .w2e-autosave {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.8rem; color: var(--w2e-text-sec);
    }
    .w2e-autosave .w2e-dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--w2e-success);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    /* ---- FORM CARD ---- */
    .w2e-form-card {
      background: #fff;
      border-radius: var(--w2e-radius-card);
      border: 1px solid var(--w2e-border);
      box-shadow: var(--w2e-shadow);
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .w2e-form-card-header {
      padding: 1.1rem 1.5rem;
      border-bottom: 1px solid var(--w2e-border);
      background: var(--bg);
      font-weight: 500;
      font-size: 1rem;
      color: var(--w2e-secondary);
      display: flex; align-items: center; gap: 8px;
    }
    .w2e-form-card-body { padding: 1.5rem; }

    /* ---- UPLOAD AREA ---- */
    .w2e-upload-area {
      border: 2.5px dashed var(--w2e-border);
      border-radius: 14px;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all .25s;
      position: relative;
      background: var(--w2e-bg);
    }
    .w2e-upload-area:hover, .w2e-upload-area.drag-over {
      border-color: var(--w2e-primary);
      background: var(--primary-light);
    }
    .w2e-upload-area input[type="file"] {
      position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 2;
    }
    .w2e-upload-icon { font-size: 3rem; color: var(--w2e-primary); margin-bottom: 0.75rem; }
    .w2e-upload-title { font-weight: 500; font-size: 1.05rem; color: var(--w2e-secondary); }
    .w2e-upload-sub { font-size: 0.85rem; color: var(--w2e-text-sec); margin-top: 4px; }
    .w2e-upload-actions { display: flex; gap: 10px; justify-content: center; margin-top: 1.2rem; flex-wrap: wrap; }
    .w2e-btn-outline {
      border: 1px solid var(--w2e-primary);
      border-radius: var(--w2e-radius-btn);
      color: var(--w2e-primary);
      background: transparent;
      font-weight: 600; font-size: 0.88rem;
      padding: 0.48rem 1.2rem;
      cursor: pointer; transition: all .2s;
      display: inline-flex; align-items: center; gap: 6px;
      font-family: inherit;
    }
    .w2e-btn-outline:hover { background: var(--w2e-primary); color: #fff; }
    .w2e-btn-outline-gray {
      border: 1px solid var(--w2e-border);
      border-radius: var(--w2e-radius-btn);
      color: var(--w2e-text-sec);
      background: transparent;
      font-weight: 600; font-size: 0.88rem;
      padding: 0.48rem 1.2rem;
      cursor: pointer; transition: all .2s;
      display: inline-flex; align-items: center; gap: 6px;
      font-family: inherit;
    }
    .w2e-btn-outline-gray:hover { border-color: var(--w2e-text-sec); background: var(--border); }

    /* Preview grid */
    .w2e-preview-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;
      margin-top: 1rem;
    }
    .w2e-preview-item {
      position: relative; border-radius: 10px; overflow: hidden;
      aspect-ratio: 1; border: 1px solid var(--w2e-border);
    }
    .w2e-preview-item img { width: 100%; height: 100%; object-fit: cover; }
    .w2e-preview-remove {
      position: absolute; top: 4px; right: 4px;
      background: rgba(0,0,0,0.55); color: #fff; border: none;
      border-radius: 50%; width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 0.72rem; transition: background .2s;
    }
    .w2e-preview-remove:hover { background: var(--w2e-error); }

    /* ---- FORM CONTROLS ---- */
    .w2e-label {
      font-weight: 600; font-size: 0.88rem; color: var(--w2e-secondary);
      margin-bottom: 6px; display: block;
    }
    .w2e-label .req { color: var(--w2e-error); margin-left: 2px; }
    .w2e-input, .w2e-textarea, .w2e-select-input {
      width: 100%;
      border: 1px solid var(--w2e-border);
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.92rem;
      color: var(--w2e-text);
      background: var(--w2e-bg);
      padding: 0.6rem 1rem;
      transition: border-color .2s, box-shadow .2s;
      outline: none;
    }
    .w2e-input:focus, .w2e-textarea:focus, .w2e-select-input:focus {
      border-color: var(--w2e-primary);
      box-shadow: 0 0 0 3px rgba(212,160,23,0.12);
    }
    .w2e-textarea { resize: vertical; min-height: 110px; line-height: 1.6; }

    /* Price input with suffix */
    .w2e-price-wrap { position: relative; }
    .w2e-price-wrap input { padding-right: 50px; }
    .w2e-price-suffix {
      position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      font-size: 0.85rem; color: var(--w2e-text-sec); font-weight: 600; pointer-events: none;
    }

    /* ---- STAR RATING ---- */
    .w2e-star-rating { display: flex; gap: 8px; align-items: center; }
    .w2e-star {
    font-size: 2rem; cursor: pointer; color: var(--border);
      transition: color .15s, transform .15s;
      line-height: 1;
    }
    .w2e-star:hover, .w2e-star.active { color: var(--warning); transform: scale(1.15); }
    .w2e-star-label { font-size: 0.85rem; color: var(--w2e-text-sec); margin-left: 8px; }

    /* ---- TAG INPUT ---- */
    .w2e-tag-input-wrap {
      border: 1px solid var(--w2e-border);
      border-radius: 10px;
      padding: 8px 10px;
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
      min-height: 48px; cursor: text;
      background: var(--w2e-bg); transition: border-color .2s;
    }
    .w2e-tag-input-wrap:focus-within {
      border-color: var(--w2e-primary);
      box-shadow: 0 0 0 3px rgba(212,160,23,0.12);
    }
    .w2e-selected-tag {
      background: var(--w2e-primary); color: #fff;
      border-radius: 20px; padding: 2px 10px 2px 12px;
      font-size: 0.8rem; font-weight: 600;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .w2e-selected-tag button {
      background: rgba(255,255,255,0.3); border: none;
      border-radius: 50%; width: 16px; height: 16px; color: #fff;
      font-size: 0.65rem; display: flex; align-items: center; justify-content: center;
      cursor: pointer; padding: 0;
    }
    .w2e-tag-input-wrap input {
      border: none; outline: none; background: transparent;
      font-family: inherit; font-size: 0.88rem; color: var(--w2e-text);
      min-width: 120px; flex: 1;
    }

    /* Tag suggestions */
    .w2e-tag-suggestions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
    .w2e-tag-suggest-btn {
    background: var(--primary-light); border: 1px solid var(--border);
      border-radius: 20px; padding: 3px 13px;
      font-size: 0.8rem; font-weight: 500; color: var(--w2e-secondary);
      cursor: pointer; transition: all .2s; font-family: inherit;
    }
    .w2e-tag-suggest-btn:hover { background: var(--w2e-primary); border-color: var(--w2e-primary); color: #fff; }

    /* ---- PRIVACY OPTIONS ---- */
    .w2e-privacy-options { display: flex; flex-direction: column; gap: 10px; }
    .w2e-privacy-option {
      border: 1px solid var(--w2e-border);
      border-radius: 12px; padding: 1rem 1.2rem;
      cursor: pointer; transition: all .2s; background: var(--w2e-bg);
      display: flex; align-items: center; gap: 12px;
    }
    .w2e-privacy-option:hover { border-color: var(--w2e-primary); background: var(--primary-light); }
    .w2e-privacy-option.selected { border-color: var(--w2e-primary); background: var(--primary-light); }
    .w2e-privacy-option input[type="radio"] { accent-color: var(--w2e-primary); width: 18px; height: 18px; }
    .w2e-privacy-option .w2e-priv-label { font-weight: 600; font-size: 0.92rem; color: var(--w2e-text); }
    .w2e-privacy-option .w2e-priv-desc { font-size: 0.8rem; color: var(--w2e-text-sec); }

    /* Password input appear */
    .w2e-pw-field { display: none; margin-top: 12px; }
    .w2e-pw-field.show { display: block; }
    .w2e-pw-wrap { position: relative; }
    .w2e-pw-wrap input { padding-right: 44px; }
    .w2e-pw-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: var(--w2e-text-sec); cursor: pointer; font-size: 1rem;
    }

    /* ---- BOTTOM SUBMIT BAR ---- */
    .w2e-submit-bar {
      background: #fff; border-top: 1px solid var(--w2e-border);
      position: sticky; bottom: 0; z-index: 100;
      padding: 1rem 0;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.07);
    }
    .w2e-btn-primary {
      background: var(--w2e-primary); color: #fff;
      border: none; border-radius: var(--w2e-radius-btn);
      font-weight: 500; padding: 0.65rem 1.8rem;
      font-size: 0.95rem; transition: all .2s;
      display: inline-flex; align-items: center; gap: 7px;
      font-family: inherit; cursor: pointer;
    }
    .w2e-btn-primary:hover{ background: var(--primary-dark) }

    /* ---- RESTAURANT SEARCH DROPDOWN ---- */
    .w2e-restaurant-wrap { position: relative; }
    .w2e-restaurant-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: #fff; border: 1px solid var(--w2e-border);
      border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      z-index: 200; max-height: 260px; overflow-y: auto;
      display: none;
    }
    .w2e-restaurant-dropdown.show { display: block; }
    .w2e-restaurant-item {
      padding: 0.75rem 1rem; cursor: pointer; display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid var(--w2e-border); transition: background .15s;
      font-size: 0.88rem;
    }
    .w2e-restaurant-item:last-child { border-bottom: none; }
    .w2e-restaurant-item:hover { background: var(--primary-light); }
    .w2e-restaurant-item img {
      width: 36px; height: 36px; border-radius: 8px; object-fit: cover;
    }
    .w2e-restaurant-item .w2e-rest-name { font-weight: 600; color: var(--w2e-text); }
    .w2e-restaurant-item .w2e-rest-addr { font-size: 0.77rem; color: var(--w2e-text-sec); }
  </style>
  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>
<body>

<!-- ===================== NAVBAR ===================== -->
<nav class="navbar w2e-navbar">
  <div class="container d-flex align-items-center justify-content-between">
    <a class="navbar-brand" href="../index.php">What<span>2</span>Eat</a>
    <span class="w2e-nav-title d-none d-md-inline">
      <i class="bi bi-journal-plus me-1" style="color:var(--w2e-primary)"></i>Tạo Food Note
    </span>
    <div class="d-flex align-items-center gap-3">
      <div class="w2e-autosave" id="autosaveStatus">
        <span class="w2e-dot"></span> Đang lưu nháp...
      </div>
      <a href="./food-notes.php" class="w2e-back-btn">
        <i class="bi bi-arrow-left"></i> Quay lại
      </a>
    </div>
  </div>
</nav>

<!-- ===================== MAIN CONTENT ===================== -->
<div class="container py-4">
  <div class="row justify-content-center">
    <div class="col-12" style="max-width: 760px;">

      <!-- Page heading -->
      <div class="mb-4">
      <h1 style="font-size:1.7rem;font-weight: 600;color:var(--w2e-secondary)">
      Tạo Food Note Mới
        </h1>
        <p style="color:var(--w2e-text-sec);font-size:0.9rem;margin:0">
          Ghi lại trải nghiệm ăn uống của bạn để lưu giữ và chia sẻ cùng bạn bè.
        </p>
      </div>

      <!-- ====== SECTION 1: ẢNH / VIDEO ====== -->
      <div class="w2e-form-card">
        <div class="w2e-form-card-header">
          <i class="bi bi-images" style="color:var(--w2e-primary)"></i> Ảnh &amp; Video
        </div>
        <div class="w2e-form-card-body">

          <div class="w2e-upload-area" id="uploadArea">
            <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif" multiple />
            <div class="w2e-upload-icon"><i class="bi bi-cloud-upload"></i></div>
            <div class="w2e-upload-title">Kéo &amp; Thả ảnh vào đây</div>
            <div class="w2e-upload-sub">Hoặc nhấn để chọn ảnh từ máy tính của bạn</div>
            <div class="w2e-upload-sub mt-1" style="font-size:0.78rem">Hỗ trợ: JPEG, PNG, WEBP, GIF – Tối đa 50 MB/ảnh</div>
            <div class="w2e-upload-actions">
              <button type="button" class="w2e-btn-outline" onclick="document.getElementById('fileInput').click()">
                <i class="bi bi-image"></i> Chọn Ảnh
              </button>
              <button type="button" class="w2e-btn-outline-gray" onclick="document.getElementById('videoInput').click()">
                <i class="bi bi-camera-video"></i> Thêm Video
              </button>
              <input type="file" id="videoInput" accept="video/*" style="display:none" />
            </div>
          </div>

          <!-- Image Previews -->
          <div class="w2e-preview-grid" id="previewGrid"></div>
          <div class="w2e-preview-grid" id="existingMedia"></div>
        </div>
      </div>

      <!-- ====== SECTION 2: THÔNG TIN ====== -->
      <div class="w2e-form-card">
        <div class="w2e-form-card-header">
          <i class="bi bi-info-circle" style="color:var(--w2e-primary)"></i> Thông Tin Món Ăn
        </div>
        <div class="w2e-form-card-body">

          <!-- Tên món ăn -->
          <div class="mb-4">
            <label class="w2e-label" for="foodName">Tên Món Ăn <span class="req">*</span></label>
            <input type="text" id="foodName" class="w2e-input" placeholder="VD: Phở Bò Tái Gân, Bún Chả Hà Nội..." required />
          </div>

          <div class="mb-4">
            <label class="w2e-label" for="foodDate">Ngày trải nghiệm</label>
            <input type="date" id="foodDate" class="w2e-input" />
          </div>
          <!-- Chọn quán ăn -->
          <div class="mb-4">
            <label class="w2e-label" for="restaurantSearch">Chọn Quán Ăn</label>
            <div class="w2e-restaurant-wrap">
              <input type="text" id="restaurantSearch" class="w2e-input"
                placeholder="Tìm tên quán..." autocomplete="off"
                oninput="searchRestaurant(this.value)"
                onfocus="showRestaurantDropdown()" />
              <i class="bi bi-shop" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--w2e-text-sec);pointer-events:none"></i>
              <div class="w2e-restaurant-dropdown" id="restaurantDropdown" role="listbox" aria-label="Kết quả tìm địa điểm"></div>
            </div>
          </div>

          <!-- Giá tiền -->
          <div class="mb-4">
            <label class="w2e-label" for="foodPrice">Giá Tiền</label>
            <div class="w2e-price-wrap">
              <input type="number" id="foodPrice" class="w2e-input" placeholder="VD: 65000" min="0" step="1000" />
              <span class="w2e-price-suffix">₫</span>
            </div>
          </div>

          <!-- Rating -->
          <div class="mb-4">
            <label class="w2e-label">Đánh Giá <span class="req">*</span></label>
            <div class="w2e-star-rating">
              <span class="w2e-star" data-val="1" onclick="setRating(1)">★</span>
              <span class="w2e-star" data-val="2" onclick="setRating(2)">★</span>
              <span class="w2e-star" data-val="3" onclick="setRating(3)">★</span>
              <span class="w2e-star" data-val="4" onclick="setRating(4)">★</span>
              <span class="w2e-star" data-val="5" onclick="setRating(5)">★</span>
              <span class="w2e-star-label" id="starLabel">Chưa đánh giá</span>
            </div>
            <input type="hidden" id="ratingValue" value="0" />
          </div>

          <!-- Nhận xét -->
          <div class="mb-0">
            <label class="w2e-label" for="noteComment">Nhận Xét Chi Tiết</label>
            <textarea id="noteComment" class="w2e-textarea" placeholder="Chia sẻ cảm nhận của bạn về món ăn này: hương vị, không gian, dịch vụ, giá cả có tương xứng không..."></textarea>
            <div style="text-align:right;font-size:0.78rem;color:var(--w2e-text-sec);margin-top:4px">
              <span id="charCount">0</span>/500 ký tự
            </div>
          </div>
        </div>
      </div>

      <!-- ====== SECTION 3: TAGS ====== -->
      <div class="w2e-form-card">
        <div class="w2e-form-card-header">
          <i class="bi bi-tags" style="color:var(--w2e-primary)"></i> Tags
        </div>
        <div class="w2e-form-card-body">

          <label class="w2e-label">Tags Gợi Ý</label>
          <div class="w2e-tag-suggestions mb-3">
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#giá_rẻ')">#giá_rẻ</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#ngon')">#ngon</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#phải_quay_lại')">#phải_quay_lại</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#hẹn_hò')">#hẹn_hò</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#đi_với_bạn')">#đi_với_bạn</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#đồ_uống')">#đồ_uống</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#bbq')">#bbq</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#cơm_tấm')">#cơm_tấm</button>
            <button type="button" class="w2e-tag-suggest-btn" onclick="addSuggestedTag('#tráng_miệng')">#tráng_miệng</button>
          </div>

          <label class="w2e-label">Tags Đã Chọn / Thêm Mới</label>
          <div class="w2e-tag-input-wrap" id="tagInputWrap" onclick="document.getElementById('tagInput').focus()">
            <!-- selected tags will appear here -->
            <input type="text" id="tagInput" placeholder="Nhập tag rồi nhấn Enter hoặc dấu phẩy..." />
          </div>
          <div style="font-size:0.78rem;color:var(--w2e-text-sec);margin-top:5px">
            Nhấn <kbd>Enter</kbd> hoặc dấu <kbd>,</kbd> để thêm tag
          </div>
        </div>
      </div>

      <!-- ====== SECTION 4: PRIVACY ====== -->
      <div class="w2e-form-card">
        <div class="w2e-form-card-header">
          <i class="bi bi-shield-check" style="color:var(--w2e-primary)"></i> Quyền Riêng Tư
        </div>
        <div class="w2e-form-card-body">
          <div class="w2e-privacy-options">

            <!-- Public -->
            <label class="w2e-privacy-option" id="opt-public">
              <input type="radio" name="privacy" value="public" onchange="onPrivacyChange('public')" />
              <div>
                <div class="w2e-priv-label">Công Khai</div>
                <div class="w2e-priv-desc">Mọi người đều có thể xem food note này</div>
              </div>
            </label>

            <!-- Private -->
            <label class="w2e-privacy-option selected" id="opt-private">
              <input type="radio" name="privacy" value="private" checked onchange="onPrivacyChange('private')" />
              <div>
                <div class="w2e-priv-label">Riêng Tư</div>
                <div class="w2e-priv-desc">Chỉ mình bạn có thể xem</div>
              </div>
            </label>

            <!-- Link shared -->
            <label class="w2e-privacy-option" id="opt-link">
              <input type="radio" name="privacy" value="link" onchange="onPrivacyChange('link')" />
              <div style="flex:1">
                <div class="w2e-priv-label">Chia sẻ bằng liên kết</div>
                <div class="w2e-priv-desc">Chỉ người có liên kết riêng mới mở được Food Note này.</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Bottom padding to avoid overlap with submit bar -->
      <div style="height: 80px;"></div>
    </div>
  </div>
</div><!-- /.container -->

<!-- ===================== STICKY SUBMIT BAR ===================== -->
<div class="w2e-submit-bar">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-12" style="max-width:760px">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div class="w2e-autosave" id="autosaveStatus2">
            <span class="w2e-dot"></span>
            <span id="autosaveText">Chưa lưu</span>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="w2e-btn-outline" id="saveDraftButton" disabled>
              <i class="bi bi-floppy2"></i> Lưu Nháp
            </button>
            <button type="button" class="w2e-btn-primary" id="publishNoteButton" disabled>
              <i class="bi bi-send-fill"></i> Đăng Food Note
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
  // ============================================================
  // STAR RATING
  // ============================================================
  const starLabels = ['', 'Tệ', 'Bình thường', 'Ổn', 'Ngon', 'Tuyệt vời'];
  function setRating(val) {
    document.getElementById('ratingValue').value = val;
    document.querySelectorAll('.w2e-star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
    document.getElementById('starLabel').textContent = starLabels[val];
    triggerAutoSave();
  }
  document.querySelectorAll('.w2e-star').forEach(s => {
    s.addEventListener('mouseover', () => {
      const v = parseInt(s.dataset.val);
      document.querySelectorAll('.w2e-star').forEach(ss => {
        ss.style.color = parseInt(ss.dataset.val) <= v ? '#F5A623' : '#E0D5C8';
      });
    });
    s.addEventListener('mouseout', () => {
      const cur = parseInt(document.getElementById('ratingValue').value);
      document.querySelectorAll('.w2e-star').forEach(ss => {
        ss.style.color = parseInt(ss.dataset.val) <= cur ? '#F5A623' : '#E0D5C8';
      });
    });
  });

  // ============================================================
  // TAG INPUT
  // ============================================================
  let selectedTags = [];
  const tagInput = document.getElementById('tagInput');
  const tagWrap = document.getElementById('tagInputWrap');

  function addTag(raw) {
    const tag = raw.trim().replace(/^#/, '').replace(/[,\s]+/g,'_').toLowerCase();
    if (!tag || selectedTags.includes('#'+tag)) return;
    selectedTags.push('#'+tag);
    renderTags();
  }
  function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderTags();
  }
  function renderTags() {
    const existing = tagWrap.querySelectorAll('.w2e-selected-tag');
    existing.forEach(e => e.remove());
    selectedTags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'w2e-selected-tag';
      span.appendChild(document.createTextNode(tag));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', `Xóa nhãn ${tag}`);
      remove.addEventListener('click', () => removeTag(tag));
      span.appendChild(remove);
      tagWrap.insertBefore(span, tagInput);
    });
    triggerAutoSave();
  }
  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.value.trim()) { addTag(tagInput.value); tagInput.value = ''; }
    } else if (e.key === 'Backspace' && !tagInput.value && selectedTags.length) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  });
  function addSuggestedTag(tag) {
    addTag(tag);
  }
  window.replaceFoodNoteTags = (tags) => {
    selectedTags = [];
    (tags || []).forEach((tag) => {
      const clean = String(tag).trim().replace(/^#/, '').replace(/[,\s]+/g, '_').toLowerCase();
      if (clean && !selectedTags.includes('#' + clean)) selectedTags.push('#' + clean);
    });
    renderTags();
  };

  // ============================================================
  // FILE UPLOAD & PREVIEW
  // ============================================================
  const fileInput = document.getElementById('fileInput');
  const previewGrid = document.getElementById('previewGrid');
  const uploadArea = document.getElementById('uploadArea');
  let selectedImageFiles = [];
  let previewObjectUrls = [];

  fileInput.addEventListener('change', handleFiles);
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFileList(e.dataTransfer.files);
  });

  function fileKey(file) { return `${file.name}:${file.size}:${file.lastModified}`; }
  function handleFiles(e) { handleFileList(e.target.files); }
  function handleFileList(files) {
    const unique = new Map(selectedImageFiles.map(file => [fileKey(file), file]));
    Array.from(files).filter(file => file.type.startsWith('image/')).forEach(file => unique.set(fileKey(file), file));
    selectedImageFiles = [...unique.values()];
    const oversized = selectedImageFiles.find(file => file.size > 50 * 1024 * 1024);
    if (oversized) window.alert(`Ảnh “${oversized.name}” vượt quá giới hạn 50 MB.`);
    const transfer = new DataTransfer();
    selectedImageFiles.forEach(file => transfer.items.add(file));
    fileInput.files = transfer.files;
    renderImagePreviews();
    triggerAutoSave();
  }
  function renderImagePreviews() {
    previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
    previewObjectUrls = [];
    previewGrid.replaceChildren();
    selectedImageFiles.filter(file => file.size <= 50 * 1024 * 1024).forEach(addPreview);
  }
  function addPreview(file) {
    const src = URL.createObjectURL(file);
    previewObjectUrls.push(src);
    const div = document.createElement('div');
    div.className = 'w2e-preview-item';
    const image = document.createElement('img'); image.src = src; image.alt = file.name; image.loading = 'lazy';
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'w2e-preview-remove'; remove.title = 'Xóa ảnh'; remove.textContent = '✕';
    remove.addEventListener('click', () => { const key = fileKey(file); selectedImageFiles = selectedImageFiles.filter(item => fileKey(item) !== key); const transfer = new DataTransfer(); selectedImageFiles.forEach(item => transfer.items.add(item)); fileInput.files = transfer.files; renderImagePreviews(); triggerAutoSave(); });
    div.append(image, remove);
    previewGrid.appendChild(div);
  }

  // ============================================================
  // RESTAURANT SEARCH DROPDOWN
  // ============================================================
  function searchRestaurant(val) {
    const dd = document.getElementById('restaurantDropdown');
    dd.classList.toggle('show', val.length > 0);
    const items = dd.querySelectorAll('.w2e-restaurant-item');
    items.forEach(item => {
      const name = item.querySelector('.w2e-rest-name').textContent.toLowerCase();
      item.style.display = name.includes(val.toLowerCase()) ? '' : 'none';
    });
  }
  function showRestaurantDropdown() {
    document.getElementById('restaurantDropdown').classList.add('show');
  }
  function selectRestaurant(name, addr) {
    document.getElementById('restaurantSearch').value = name;
    document.getElementById('restaurantDropdown').classList.remove('show');
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('.w2e-restaurant-wrap')) {
      document.getElementById('restaurantDropdown').classList.remove('show');
    }
  });

  // ============================================================
  // PRIVACY
  // ============================================================
  function onPrivacyChange(val) {
    document.querySelectorAll('.w2e-privacy-option').forEach(o => o.classList.remove('selected'));
    document.getElementById('opt-'+val)?.classList.add('selected');
    triggerAutoSave();
  }

  // ============================================================
  // CHAR COUNT
  // ============================================================
  document.getElementById('noteComment').addEventListener('input', function() {
    document.getElementById('charCount').textContent = this.value.length;
  });

  // ============================================================
  // A save action is required before this note is sent to the server.
  // ============================================================
  let autoSaveTimer;
  function triggerAutoSave() {
    const txt = document.getElementById('autosaveText');
    if (txt) { txt.textContent = 'Có thay đổi chưa lưu'; }
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      const dot = document.querySelector('#autosaveStatus2 .w2e-dot');
      if (dot) dot.style.background = 'var(--warning)';
    }, 1800);
  }
  window.markFoodNoteDirty = triggerAutoSave;
  ['foodName','foodPrice','noteComment','restaurantSearch','foodDate','tagInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', triggerAutoSave);
  });
  const initialStatus = document.getElementById('autosaveText');
  if (initialStatus) initialStatus.textContent = 'Chưa lưu';
  document.getElementById('videoInput')?.addEventListener('change',triggerAutoSave);

  // ============================================================
  // DRAFT / PUBLISH
  // ============================================================
</script>
  <script src="../assets/js/site.js?v=20261018"></script>
</body>
</html>
