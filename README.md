# What2Eat

What2Eat là website khám phá quán ăn và ghi chép trải nghiệm ẩm thực. Các trang được xây dựng bằng PHP tại `index.php`, `pages/*.php` và `admin/*.php`; CSS và JavaScript đảm nhiệm giao diện, tương tác, còn Leaflet hiển thị bản đồ. API sử dụng PHP 8.1+ và MySQL 8 hoặc MariaDB tương thích. Bản đồ dùng dữ liệu OpenStreetMap, không cần khóa Google Maps API. Thông tin quán ăn đến từ OpenStreetMap hoặc do người dùng và quản trị viên cung cấp.

## Chức năng đã triển khai

- Khám phá quán ăn gần vị trí tìm kiếm, xem ghim bản đồ và trang chi tiết ngay trong What2Eat, lưu quán, xem quán lân cận và chọn ngẫu nhiên. Bản đồ vẫn ghi công OpenStreetMap.
- Đăng ký có xác nhận email, đăng nhập, đăng xuất, đặt lại mật khẩu, quản lý hồ sơ và tải ảnh đại diện.
- Tạo Food Note, lưu bản nháp trên máy chủ, khôi phục nội dung chưa gửi trên thiết bị, gắn nhãn, chấm điểm cá nhân, tải ảnh/video và chọn chế độ riêng tư, công khai hoặc chia sẻ bằng liên kết.
- Tạo Food Plan, mời thành viên bằng liên kết, đề xuất địa điểm, bình chọn và chốt kết quả.
- Quản trị người dùng, danh mục, quán ăn và Food Note công khai; xem nhật ký hoạt động.
- Báo quán đóng cửa, chuyển địa chỉ hoặc sai thông tin. Quản trị viên có thể xem xét báo cáo, ẩn địa điểm khỏi Khám phá và khôi phục địa điểm OSM sau đó.
- Quản lý vị trí tài trợ có thời hạn cho quán đã công khai. Vị trí tài trợ luôn có nhãn "Tài trợ" trên trang Khám phá, popup bản đồ và trang chi tiết. Thỏa thuận và thanh toán hiện được xử lý bên ngoài website.
- Kiểm tra quyền truy cập ở máy chủ, bảo vệ CSRF, truy vấn SQL có tham số, giới hạn tần suất yêu cầu, lưu tệp riêng tư và kiểm duyệt nội dung.

Cơ sở dữ liệu không có tài khoản, quán ăn, đánh giá, giá hay thống kê mẫu sau khi khởi tạo. Quán công khai trên bản đồ được truy vấn từ OpenStreetMap; đề xuất của người dùng và bản ghi do quản trị viên nhập chỉ được lưu khi có người cung cấp. Trường nào chưa có dữ liệu sẽ được hiển thị là chưa có dữ liệu.

Khi phát triển bằng PHP trên máy cá nhân, đặt `W2E_ENV=development` và `W2E_BASE_URL` thành địa chỉ website cục bộ. Email xác nhận và đặt lại mật khẩu được ghi vào `storage/dev-mail.log`; website chặn truy cập trực tiếp thư mục `storage/`. Mở liên kết tương ứng trong tệp log bằng trình duyệt. Không dùng chế độ `development` cho website công khai.

Chức năng tra tọa độ địa chỉ trong trang quản trị chỉ gửi yêu cầu tới OpenStreetMap Nominatim khi quản trị viên bấm tra cứu. Kết quả được lưu tạm 30 ngày; các yêu cầu chưa có trong bộ nhớ đệm được giãn cách tối thiểu một giây. Giao diện hiển thị thông tin ghi công và yêu cầu đối chiếu kết quả trước khi lưu. Có thể đặt `W2E_NOMINATIM_URL` để dùng dịch vụ tương thích hoặc máy chủ tự vận hành.

## Xem thử trên máy cá nhân

Chạy `node server.js`, sau đó mở `http://127.0.0.1:4173/`. Máy chủ xem thử này phục vụ giao diện và chuyển tiếp yêu cầu bản đồ OSM. Nó **không chạy API PHP** cho tài khoản, Food Note, Food Plan hoặc trang quản trị. Muốn thử các chức năng đó cần PHP và MySQL theo hướng dẫn tại [`api/README.md`](api/README.md).

## Triển khai website

1. Chuẩn bị tên miền dùng HTTPS, PHP 8.1+ với `pdo_mysql`, `curl`, `fileinfo`, `mbstring`, `json` và session; cơ sở dữ liệu MySQL 8 hoặc MariaDB tương thích.
2. Đặt thư mục gốc của website Apache tại thư mục dự án này và bật các module rewrite, headers. Tệp `.htaccess` đã cấu hình đường dẫn cho API và ảnh nền bản đồ.
3. Sao chép `.env.example` thành `.env` trên máy chủ. Điền URL website thật, mã bí mật ứng dụng đủ mạnh, thông tin kết nối cơ sở dữ liệu, địa chỉ gửi email và email hỗ trợ. Giữ `.env` riêng tư, không đưa lên Git.
4. Tạo cơ sở dữ liệu trống, rồi chạy `php api/bin/migrate.php` trong thư mục dự án. Khi cập nhật bản cài đặt cũ, chạy lại lệnh này để bổ sung các bảng mới.
5. Tạo quản trị viên đầu tiên trong terminal đáng tin cậy: đặt `W2E_ADMIN_PASSWORD` thành mật khẩu dùng một lần, rồi chạy `php api/bin/create-admin.php admin@example.com`. Xóa mật khẩu tạm khỏi biến môi trường sau đó.
6. Cấu hình dịch vụ gửi email và HTTPS, cấp quyền ghi vào `storage/uploads` cho PHP, rồi kiểm tra `/api/v1/health`.

Máy chủ cần lưu trữ MySQL và tệp tải lên lâu dài, truy cập HTTPS ra ngoài cho OSM và một hệ thống gửi email hoạt động để xác nhận tài khoản, đặt lại mật khẩu. Các dịch vụ bản đồ cộng đồng có thể giới hạn yêu cầu hoặc tạm ngừng. API thử máy chủ Overpass khác và dùng dữ liệu đã lưu gần đây khi có thể.

## Vị trí tài trợ

Quản trị viên mở **Admin → Quản lý Quán ăn → Tài trợ** tại một quán đã công khai và có tọa độ. Nhập tên bên tài trợ, mã thỏa thuận nội bộ, thời gian bắt đầu/kết thúc, rồi kích hoạt. API công khai chỉ đánh dấu quán là tài trợ trong thời gian đã định; giao diện luôn hiển thị nhãn "Tài trợ". Tạm dừng vị trí sẽ gỡ nhãn và mức ưu tiên hiển thị ngay. Đây là quy trình quản lý thỏa thuận thủ công, **chưa phải cổng thanh toán** và không xác nhận rằng website đã nhận tiền.

## Kiểm thử tích hợp

Chạy `node tests/integration.mjs` để kiểm tra các luồng chính trên một cơ sở dữ liệu tạm. Máy cần có lệnh PHP và MySQL CLI, cùng quyền tạo/xóa cơ sở dữ liệu thử nghiệm. Nếu không dùng XAMPP, đặt các biến `W2E_TEST_PHP`, `W2E_TEST_MYSQL`, `W2E_TEST_DB_USER`, `W2E_TEST_DB_PASSWORD` và `W2E_TEST_DB_PORT` theo môi trường của bạn. Lệnh kiểm thử tự tạo và xóa cơ sở dữ liệu tạm sau khi chạy.

## Tạo bộ dữ liệu OSM cho TP. Hồ Chí Minh

Công cụ nhập tệp PBF tạo CSV, GeoJSON, bản tóm tắt và báo cáo chất lượng từ dữ liệu Geofabrik Việt Nam. Công cụ dùng ranh giới hành chính TP. Hồ Chí Minh có trong tệp trích xuất. Dữ liệu **không xác nhận quán còn hoạt động**: mọi bản ghi ban đầu có trạng thái `unverified`; các quán có khả năng trùng nhau ở khoảng cách gần được liệt kê để kiểm tra thủ công.

1. Tải `vietnam-latest.osm.pbf` từ [Geofabrik Việt Nam](https://download.geofabrik.de/asia/vietnam.html) vào `storage/imports/osm/`.
2. Với Python 3.12, cài các gói trong `requirements-osm-import.txt` vào thư mục phục vụ nhập dữ liệu:

   ```powershell
   python -m pip install --target storage/imports/osm/vendor -r requirements-osm-import.txt
   ```

3. Tìm quan hệ ranh giới TP. Hồ Chí Minh có `admin_level=4` trong tệp trích xuất, rồi tạo bộ dữ liệu:

   ```powershell
   python scripts/build_hcm_food_dataset.py --list-boundaries
   python scripts/build_hcm_food_dataset.py --boundary-relation RELATION_ID
   ```

Tệp kết quả nằm trong `storage/datasets/hcm-osm-food/`. Đọc `data_quality_report.md` và `sources_and_license.md` trước khi nhập hoặc phân phối lại dữ liệu. Dữ liệu có nguồn gốc OSM phải ghi công và tuân thủ [giấy phép ODbL](https://www.openstreetmap.org/copyright).

Xem [`database_design.md`](database_design.md) để tham khảo thiết kế cơ sở dữ liệu ban đầu và [`api/README.md`](api/README.md) để biết thêm về môi trường chạy, API và vận hành.
