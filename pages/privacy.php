<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/page-template.php';
$pageTitle = 'Quyền riêng tư – What2Eat';
?>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="description" content="Thông tin về dữ liệu What2Eat xử lý khi bạn sử dụng website." />
  <title><?= w2e_escape($pageTitle) ?></title>
  <link rel="stylesheet" href="../assets/css/style.css?v=20261030-typography" />
  <style>
    body{background:#fcfaf6;color:#30261e}.policy-shell{max-width:900px;margin:32px auto;padding:clamp(22px,5vw,48px);background:#fff;border:1px solid #eadfce;border-radius:20px;box-shadow:0 12px 36px #3020100b}.policy-shell h1{font-size:clamp(1.8rem,4vw,2.5rem)}.policy-shell h2{font-size:1.2rem;margin-top:2rem}.policy-shell p,.policy-shell li{line-height:1.75;color:#574a40}.policy-notice{padding:14px 16px;background:#fbf4e3;border-radius:12px;color:#67502b}
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=Manrope:wght@200..800&display=swap" rel="stylesheet">
</head>
<body>
  <main class="policy-shell">
    <a href="../index.php" class="text-decoration-none">← What2Eat</a>
    <h1 class="mt-4">Quyền riêng tư và dữ liệu</h1>
    <p class="text-secondary">Tài liệu này mô tả cách phiên bản What2Eat hiện tại xử lý dữ liệu. Cập nhật lần cuối: 05/10/2026.</p>
    <p class="policy-notice">What2Eat đang được chuẩn bị triển khai. Trước khi mở đăng ký công khai, chủ website cần bổ sung thông tin pháp nhân/chủ thể vận hành và kiểm tra lại tài liệu này cho đúng với nơi lưu trữ, nhà cung cấp email và cấu hình thực tế.</p>

    <h2>Dữ liệu tài khoản và nội dung</h2>
    <p>Tài khoản lưu tên, email, mật khẩu ở dạng mã băm, số điện thoại nếu bạn cung cấp, tùy chọn ăn uống, ảnh đại diện, trạng thái xác thực và thời điểm tạo/đăng nhập. What2Eat lưu Food Notes, nhãn, đánh giá, ngày ăn, giá do bạn nhập, tệp ảnh/video, địa điểm yêu thích, Food Plans và báo cáo sai thông tin địa điểm do bạn gửi.</p>

    <h2>Đăng nhập bằng Google</h2>
    <p>Nếu chọn đăng nhập bằng Google, trình duyệt tải Google Identity Services từ Google. Sau khi bạn chọn tài khoản, Google trả về một ID token; trình duyệt gửi token đó đến máy chủ What2Eat để xác minh chữ ký, đơn vị phát hành, thời hạn và Client ID. What2Eat dùng thông tin định danh cơ bản trong token để đăng nhập hoặc tạo tài khoản.</p>
    <p>What2Eat lưu mã định danh tài khoản Google ổn định, tên và email trong hồ sơ để nhận diện tài khoản ở những lần đăng nhập sau. Nếu email đã thuộc một tài khoản What2Eat, việc liên kết tuân theo các quy tắc xác minh email của dịch vụ. Token chỉ được dùng để xác minh trong yêu cầu đăng nhập, không được lưu làm thông tin đăng nhập lâu dài. What2Eat không nhận mật khẩu Google và luồng này không yêu cầu quyền truy cập Gmail, Drive, Danh bạ hoặc dữ liệu Google khác. Việc Google xử lý thông tin khi bạn chọn tài khoản tuân theo <a href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">Chính sách quyền riêng tư của Google</a>.</p>

    <h2>Vị trí và bản đồ</h2>
    <p>Nếu bạn cho phép trình duyệt lấy vị trí hoặc chọn một vị trí trên bản đồ, tọa độ được gửi đến dịch vụ What2Eat để tìm địa điểm ăn uống từ OpenStreetMap. Máy chủ lưu bộ nhớ đệm kết quả bản đồ theo khu vực trong thời gian ngắn; tọa độ không được ghi vào hồ sơ tài khoản. Bản đồ và dữ liệu địa điểm phụ thuộc vào OpenStreetMap, các máy chủ Overpass và nhà cung cấp bản đồ được cấu hình.</p>

    <h2>Quyền xem Food Note</h2>
    <ul>
      <li><strong>Riêng tư:</strong> chỉ chủ tài khoản xem được.</li>
      <li><strong>Công khai:</strong> gửi vào hàng chờ kiểm duyệt; chỉ xuất hiện công khai sau khi quản trị viên duyệt.</li>
      <li><strong>Chia sẻ bằng liên kết:</strong> bất kỳ ai có liên kết riêng đều có thể mở nội dung; hãy chia sẻ liên kết như một bí mật.</li>
    </ul>
    <p>Quản trị viên có thể xem nội dung cần kiểm duyệt, xử lý báo cáo vận hành và quản lý các địa điểm do người dùng đề xuất.</p>

    <h2>Cookie, bộ nhớ trình duyệt và nhà cung cấp</h2>
    <p>Đăng nhập dùng cookie phiên bảo mật và mã CSRF. Nếu chọn “Ghi nhớ email trên thiết bị này”, địa chỉ email được lưu trên trình duyệt để điền lại; mật khẩu không được lưu ở đó. Nội dung Food Note chưa gửi có thể được lưu tạm trên chính thiết bị bằng bộ nhớ trình duyệt để khôi phục khi tải lại trang; ảnh/video chỉ được lưu sau khi bạn bấm Lưu Nháp hoặc Đăng Food Note. Bản nháp trên thiết bị được xóa khi đăng xuất hoặc xóa tài khoản. Website hiện tải một số thư viện/giao diện từ CDN và dùng Google Identity Services cho đăng nhập tự nguyện cùng dịch vụ OpenStreetMap/HOT; các nhà cung cấp này nhận yêu cầu mạng từ trình duyệt hoặc máy chủ theo cách dịch vụ của họ hoạt động. Địa điểm được tài trợ, nếu có, được gắn nhãn “Tài trợ”; phiên bản hiện tại không tích hợp hệ thống phân tích hành vi.</p>

    <h2>Xuất và xóa dữ liệu</h2>
    <p>Trong Hồ sơ, bạn có thể tải JSON gồm hồ sơ, Food Notes, địa điểm yêu thích và Food Plans mà tài khoản được phép xem. Xóa tài khoản cần xác nhận bằng mật khẩu; Food Notes, yêu thích, Food Plans và tệp đính kèm liên quan bị xóa. Quản trị viên cũng có thể xóa tài khoản người dùng sau khi xác nhận bằng mật khẩu quản trị; dữ liệu liên quan được xử lý như khi người dùng tự xóa và email có thể đăng ký lại. Địa điểm đã gửi vào thư mục dùng chung có thể được giữ lại sau khi tách khỏi tài khoản người đóng góp. Nhật ký bảo mật có thể được giữ lại phục vụ vận hành.</p>

    <h2>Liên hệ</h2>
    <p id="supportContact">Địa chỉ hỗ trợ sẽ hiển thị khi chủ website cấu hình.</p>
    <p><a href="./terms.php">Điều khoản sử dụng</a></p>
  </main>
  <script>
    fetch('/api/v1/site-info',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(info=>{if(!info?.support_email)return;const p=document.getElementById('supportContact'),a=document.createElement('a');a.href=`mailto:${info.support_email}`;a.textContent=info.support_email;p.replaceChildren(a);}).catch(()=>{});
  </script>
</body>
</html>
