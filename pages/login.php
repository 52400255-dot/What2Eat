<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Đăng nhập – What2Eat';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= w2e_escape($pageTitle) ?></title>
  <meta name="description" content="Đăng nhập What2Eat để khám phá quán ăn và lưu nhật ký ẩm thực." />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/css/style.css" />
  <link rel="stylesheet" href="../assets/css/auth.css" />

  <link rel="stylesheet" href="../assets/css/live-data.css">
</head>

<body class="w2e-auth-page">
  <div class="w2e-toast-container" id="toastContainer"></div>

  <div class="w2e-auth-wrap">
    <aside class="w2e-auth-visual">
      <a href="../index.php" class="w2e-auth-back">
        <i class="bi bi-arrow-left"></i>
        Trang chủ
      </a>

      <div class="w2e-auth-visual__content">
        <div class="w2e-auth-kicker">What2Eat</div>
        <h2>Không biết ăn gì?</h2>
        <p>Đăng nhập để What2Eat đồng hành cùng bạn trong việc tìm món ngon, quán ăn phù hợp và lưu lại những trải nghiệm đáng nhớ.</p>

        <div class="w2e-auth-points">
          <div class="w2e-auth-point">Lọc quán theo món, giá và khoảng cách</div>
          <div class="w2e-auth-point">Lưu Food Note và nhật ký ẩm thực</div>
          <div class="w2e-auth-point">Tạo Food Plan và vote cùng bạn bè</div>
        </div>
      </div>
    </aside>

    <main class="w2e-auth-panel">
      <div class="w2e-auth-form">
        <a href="../index.php" class="w2e-auth-wordmark mb-4" aria-label="What2Eat - Trang chủ">What<span>2</span>Eat</a>

        <h1 class="w2e-auth-title">Chào mừng trở lại</h1>
        <p class="w2e-auth-sub">Đăng nhập để tiếp tục hành trình ẩm thực của bạn.</p>

        <form id="loginForm" novalidate>
          <div class="w2e-form-group">
            <label class="w2e-label" for="loginEmail">Email</label>
            <input type="email" id="loginEmail" class="w2e-input" placeholder="ban@email.com" autocomplete="email" required />
            <div class="w2e-err-msg" id="emailError">Vui lòng nhập email hợp lệ</div>
          </div>

          <div class="w2e-form-group">
            <div class="d-flex justify-content-between align-items-center">
              <label class="w2e-label mb-0" for="loginPassword">Mật khẩu</label>
              <a href="#" class="w2e-forgot-link" id="forgotLink">Quên mật khẩu?</a>
            </div>

            <div class="w2e-pass-wrap mt-2">
              <input type="password" id="loginPassword" class="w2e-input" placeholder="Nhập mật khẩu" autocomplete="current-password" required />
              <button type="button" class="w2e-pass-toggle" id="passToggle" aria-label="Hiện mật khẩu" title="Hiện mật khẩu">
                <i class="bi bi-eye"></i>
              </button>
            </div>
            <div class="w2e-err-msg" id="passError">Vui lòng nhập mật khẩu</div>
          </div>

          <div class="w2e-form-group mb-4">
            <label class="w2e-check">
              <input type="checkbox" id="rememberMe" />
              <span>Ghi nhớ email trên thiết bị này</span>
            </label>
          </div>

          <button type="submit" class="w2e-btn-primary w-100" id="loginBtn">Đăng nhập</button>
        </form>

        <div class="w2e-auth-footer-link">
          Chưa có tài khoản? <a href="./register.php">Tạo tài khoản miễn phí</a>
        </div>

        <p class="w2e-auth-legal">
          Bằng việc đăng nhập, bạn đồng ý với
          <a href="./terms.php">Điều khoản</a> và <a href="./privacy.php">Chính sách bảo mật</a>.
        </p>
      </div>
    </main>
  </div>

  <!-- Modal quên mật khẩu: giữ nguyên chức năng -->
  <div class="modal fade w2e-auth-modal" id="forgotModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header pb-0">
          <h5 class="modal-title">Đặt lại mật khẩu</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
        </div>

        <div class="modal-body">
          <p class="w2e-auth-modal__intro">
            Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
          <label class="w2e-label" for="forgotEmail">Email</label>
          <input type="email" id="forgotEmail" class="w2e-input" placeholder="ban@email.com" />
        </div>

        <div class="modal-footer pt-0">
          <button class="w2e-btn-outline px-4" data-bs-dismiss="modal" type="button">Hủy</button>
          <button class="w2e-btn-primary px-4" type="button" id="sendForgotBtn">Gửi liên kết</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../assets/js/app.js"></script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
