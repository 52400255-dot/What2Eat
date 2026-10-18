<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Điều khoản sử dụng – What2Eat';
?>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="description" content="Điều khoản sử dụng What2Eat." />
  <title><?= w2e_escape($pageTitle) ?></title>
  <link rel="stylesheet" href="../assets/css/style.css" />
  <style>
    body{background:#fcfaf6;color:#30261e}.policy-shell{max-width:900px;margin:32px auto;padding:clamp(22px,5vw,48px);background:#fff;border:1px solid #eadfce;border-radius:20px;box-shadow:0 12px 36px #3020100b}.policy-shell h1{font-size:clamp(1.8rem,4vw,2.5rem)}.policy-shell h2{font-size:1.2rem;margin-top:2rem}.policy-shell p,.policy-shell li{line-height:1.75;color:#574a40}.policy-notice{padding:14px 16px;background:#fbf4e3;border-radius:12px;color:#67502b}
  </style>
</head>
<body>
  <main class="policy-shell">
    <a href="../index.php" class="text-decoration-none">← What2Eat</a>
    <h1 class="mt-4">Điều khoản sử dụng</h1>
    <p class="text-secondary">Phiên bản: 05/10/2026.</p>
    <p class="policy-notice">Đây là mô tả quy tắc sử dụng của sản phẩm hiện tại, không xác nhận thay cho việc rà soát pháp lý của chủ website. Trước khi mở dịch vụ, hãy công bố thông tin chủ thể vận hành và cập nhật các điều khoản theo cách website được triển khai thực tế.</p>

    <h2>Tài khoản</h2>
    <p>Bạn cần dùng email của mình, xác nhận email để kích hoạt tài khoản và giữ bí mật mật khẩu. Bạn chịu trách nhiệm với thao tác được thực hiện trong phiên đăng nhập của mình; hãy đăng xuất khỏi thiết bị dùng chung.</p>

    <h2>Nội dung và đóng góp</h2>
    <p>Chỉ đăng thông tin bạn có cơ sở để ghi nhận. Không gửi nội dung trái pháp luật, gây hại, xâm phạm quyền riêng tư hoặc quyền của người khác. Chỉ tải ảnh/video mà bạn có quyền chia sẻ. Quản trị viên có thể duyệt, ẩn hoặc từ chối Food Notes công khai và địa điểm do người dùng gửi.</p>

    <h2>Chia sẻ và dữ liệu bản đồ</h2>
    <p>Food Note công khai chỉ hiện sau khi được duyệt. Food Note chia sẻ bằng liên kết có thể được xem bởi bất kỳ ai nhận liên kết. Địa điểm OpenStreetMap do cộng đồng đóng góp, có thể thiếu, cũ hoặc sai; What2Eat hiển thị nguồn để bạn đối chiếu. Không coi dữ liệu bản đồ là xác nhận về giá, giờ mở cửa, tình trạng kinh doanh hay an toàn thực phẩm.</p>

    <h2>Quyền và quản lý tài khoản</h2>
    <p>Bạn có thể sửa/xóa Food Notes, xuất dữ liệu và yêu cầu xóa tài khoản từ Hồ sơ. Khi xóa tài khoản, các địa điểm đã đóng góp vào thư mục dùng chung có thể được giữ lại sau khi bỏ thông tin người đóng góp. Các quy tắc về dữ liệu được trình bày trong <a href="./privacy.php">trang quyền riêng tư</a>.</p>

    <h2>Tính năng và chi phí</h2>
    <p>Phiên bản hiện tại không có quy trình thanh toán hoặc gói dịch vụ trả phí. Việc khám phá địa điểm dùng dữ liệu OpenStreetMap và các nhà cung cấp bản đồ bên ngoài; các dịch vụ này có thể tạm thời không phản hồi hoặc giới hạn truy cập.</p>

    <h2>Liên hệ</h2>
    <p id="supportContact">Địa chỉ hỗ trợ sẽ hiển thị khi chủ website cấu hình.</p>
    <p><a href="./privacy.php">Quyền riêng tư và dữ liệu</a></p>
  </main>
  <script>
    fetch('/api/v1/site-info',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(info=>{if(!info?.support_email)return;const p=document.getElementById('supportContact'),a=document.createElement('a');a.href=`mailto:${info.support_email}`;a.textContent=info.support_email;p.replaceChildren(a);}).catch(()=>{});
  </script>
</body>
</html>
