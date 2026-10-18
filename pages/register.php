<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Đăng ký – What2Eat';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= w2e_escape($pageTitle) ?></title>
  <meta name="description" content="Tạo tài khoản What2Eat miễn phí để khám phá ẩm thực và lưu giữ kỷ niệm." />

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

  <main class="w2e-register-page">
    <section class="w2e-register-card">

      <header class="w2e-register-top">
        <a href="../index.php" class="w2e-auth-wordmark" aria-label="Về trang chủ What2Eat">What<span>2</span>Eat</a>

        <h1 class="w2e-auth-title">Tạo tài khoản mới</h1>
        <p class="w2e-auth-sub">Miễn phí, nhanh chóng và giúp What2Eat gợi ý món ăn phù hợp hơn.</p>
      </header>

      <div class="w2e-register-body">

        <a href="../index.php" class="w2e-back-link">
          <i class="bi bi-arrow-left"></i>
          Về trang chủ
        </a>

        <div id="successScreen" class="w2e-success-screen">
          <div class="w2e-success-icon"><i class="bi bi-check2-circle"></i></div>
          <h2 class="w2e-success-title">Tài khoản đã được tạo!</h2>
          <p class="w2e-success-copy">Chúng tôi đã gửi email xác nhận đến</p>
          <p id="confirmedEmail" class="w2e-confirm-email">—</p>

          <div class="w2e-success-box">
          <strong>Kiểm tra hộp thư của bạn</strong>
            <ul>
              <li>Nhấn vào link xác nhận trong email</li>
              <li>Link có hiệu lực trong 24 giờ</li>
              <li>Kiểm tra thư mục Spam nếu không thấy</li>
            </ul>
          </div>

          <a href="./login.php" class="w2e-btn-primary d-flex align-items-center justify-content-center text-decoration-none">
            Đăng nhập ngay
          </a>

          <div class="w2e-auth-footer-link">
            Không nhận được email?
            <a href="#" id="resendVerificationLink">Gửi lại</a>
          </div>
        </div>

        <div id="registerFormWrap">
          <form id="registerForm" novalidate>
            <div class="w2e-form-grid">

              <div class="w2e-form-group">
                <label class="w2e-label" for="regName">Họ và tên</label>
                <input type="text" id="regName" class="w2e-input" placeholder="Nguyễn Văn A" autocomplete="name" required />
                <div class="w2e-err-msg" id="nameError">Vui lòng nhập họ và tên (ít nhất 2 ký tự)</div>
              </div>

              <div class="w2e-form-group">
                <label class="w2e-label" for="regEmail">Địa chỉ email</label>
                <input type="email" id="regEmail" class="w2e-input" placeholder="example@gmail.com" autocomplete="email" required />
                <div class="w2e-err-msg" id="regEmailError">Vui lòng nhập email hợp lệ</div>
              </div>

              <div class="w2e-form-group">
                <label class="w2e-label" for="regPassword">Mật khẩu</label>
                <div class="w2e-input-wrap">
                  <input type="password" id="regPassword" class="w2e-input" placeholder="Ít nhất 8 ký tự" autocomplete="new-password" required />
                  <button type="button" class="w2e-pass-toggle" id="regPassToggle" aria-label="Hiện mật khẩu">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>

                <div class="w2e-strength" aria-hidden="true">
                  <span id="seg1"></span>
                  <span id="seg2"></span>
                  <span id="seg3"></span>
                  <span id="seg4"></span>
                </div>
                <div class="w2e-strength-text" id="strengthText">Nhập mật khẩu để kiểm tra độ mạnh</div>
                <div class="w2e-err-msg" id="passErr">Mật khẩu phải có ít nhất 8 ký tự</div>
              </div>

              <div class="w2e-form-group">
                <label class="w2e-label" for="regConfirm">Xác nhận mật khẩu</label>
                <div class="w2e-input-wrap">
                  <input type="password" id="regConfirm" class="w2e-input" placeholder="Nhập lại mật khẩu" autocomplete="new-password" required />
                  <button type="button" class="w2e-pass-toggle" id="confirmPassToggle" aria-label="Hiện mật khẩu xác nhận">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
                <div class="w2e-err-msg" id="confirmErr">Mật khẩu xác nhận không khớp</div>
              </div>
            </div>

            <div class="w2e-form-group">
              <div class="w2e-section-label">Sở thích ẩm thực của bạn</div>
              <div class="w2e-section-help">Chọn một hoặc nhiều loại để What2Eat gợi ý phù hợp hơn.</div>

              <div class="w2e-pref-grid">
                <label class="w2e-pref-item">
                  <input type="checkbox" name="pref" value="viet" />
                  <span>Món Việt</span>
                </label>
                <label class="w2e-pref-item">
                  <input type="checkbox" name="pref" value="bbq" />
                  <span>BBQ / Lẩu</span>
                </label>
                <label class="w2e-pref-item">
                  <input type="checkbox" name="pref" value="coffee" />
                  <span>Cà phê</span>
                </label>
                <label class="w2e-pref-item">
                  <input type="checkbox" name="pref" value="japanese" />
                  <span>Nhật Bản</span>
                </label>
                <label class="w2e-pref-item">
                  <input type="checkbox" name="pref" value="korean" />
                  <span>Hàn Quốc</span>
                </label>
                <label class="w2e-pref-item">
                  <input type="checkbox" name="pref" value="fastfood" />
                  <span>Ăn nhanh</span>
                </label>
                <label class="w2e-pref-item">
                  <input type="checkbox" name="pref" value="dessert" />
                  <span>Tráng miệng</span>
                </label>
              </div>
            </div>

            <div class="w2e-form-group">
              <label class="w2e-terms">
                <input type="checkbox" id="agreeTerms" />
                <span>
                  Tôi đã đọc và đồng ý với
                  <a href="./terms.php">Điều khoản dịch vụ</a>
                  và
                  <a href="./privacy.php">Chính sách bảo mật</a>
                  của What2Eat.
                </span>
              </label>
              <div class="w2e-err-msg" id="termsErr">Vui lòng đồng ý với điều khoản để tiếp tục</div>
            </div>

            <button type="submit" class="w2e-btn-primary" id="registerBtn">
              Tạo tài khoản miễn phí
            </button>
          </form>

          <div class="w2e-auth-footer-link">
            Đã có tài khoản?
            <a href="./login.php">Đăng nhập</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../assets/js/app.js"></script>
  <script src="../assets/js/site.js"></script>
</body>
</html>
