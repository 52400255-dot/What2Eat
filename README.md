# What2Eat

What2Eat là ứng dụng web tiếng Việt giúp khám phá địa điểm ăn uống, lưu lại trải nghiệm qua **Food Note** và cùng bạn bè chọn quán qua **Food Plan**. Dự án ưu tiên dữ liệu có nguồn: địa điểm được lấy từ OpenStreetMap (OSM) hoặc do người dùng/quản trị viên cung cấp; thông tin chưa có nguồn được để trống thay vì tự tạo.

## Tính năng

- **Khám phá địa điểm:** tìm quán quanh vị trí, xem bản đồ và trang chi tiết, lưu quán yêu thích, xem lựa chọn gần đó và chọn quán ngẫu nhiên theo khoảng cách/ngân sách. Bản đồ sử dụng Leaflet và dữ liệu OSM, có ghi công nguồn.
- **Danh mục địa điểm:** dùng dữ liệu OSM trực tiếp và snapshot địa điểm TP. Hồ Chí Minh; lưu địa điểm OSM được phát hiện vào danh mục để hỗ trợ tìm kiếm, chi tiết và đóng góp. Địa chỉ, điện thoại, giờ mở cửa, giá và trạng thái hoạt động chỉ hiển thị khi có dữ liệu phù hợp. Địa điểm OSM không mặc định là đang hoạt động.
- **Food Note:** tạo ghi chú món ăn, đánh giá và nhận xét; đính kèm ảnh/video; gắn thẻ, ghim, yêu thích; lưu nháp; chọn chế độ riêng tư, công khai hoặc chia sẻ bằng liên kết. Nội dung công khai và đóng góp địa điểm có thể cần quản trị viên duyệt.
- **Food Plan:** lập kế hoạch ăn uống, mời thành viên bằng liên kết, đề xuất quán, bình chọn và đóng kế hoạch. Tạo liên kết mời mới sẽ vô hiệu liên kết cũ.
- **Tài khoản:** đăng ký và xác minh email, đăng nhập bằng mật khẩu hoặc Google, đặt lại mật khẩu, quản lý hồ sơ và ảnh đại diện.
- **Quản trị:** quản lý người dùng, danh mục, địa điểm, Food Note, báo cáo địa điểm, nội dung chờ duyệt, xác minh trạng thái hoạt động và xem nhật ký kiểm toán.
- **Thông báo:** nhận thông báo về hoạt động liên quan đến kế hoạch và đề xuất địa điểm.
- **PWA:** có manifest, service worker và trang ngoại tuyến cho trải nghiệm cài đặt/sử dụng cơ bản trên thiết bị hỗ trợ.

## Công nghệ

- PHP 8.1+, MySQL 8 hoặc MariaDB tương thích; API JSON cùng origin, xử lý ở `api/`.
- Giao diện dùng PHP templates, HTML, CSS và JavaScript thuần; Leaflet hiển thị bản đồ.
- PHPMailer gửi email qua SMTP. Google Identity Services cung cấp đăng nhập Google bằng ID token được xác minh phía máy chủ.
- OpenStreetMap cung cấp dữ liệu bản đồ/địa điểm; công cụ nhập PBF dùng Python 3.12, PyOsmium và Shapely.
- Kiểm thử hồi quy/integration dùng Node.js và PHP CLI.

## Cấu trúc dự án

```text
admin/                 Trang quản trị
api/                   API, schema và lệnh migration/import/vận hành
assets/css/, assets/js/ Giao diện và logic phía trình duyệt
includes/              Thành phần dùng chung cho trang PHP
pages/                 Khám phá, tài khoản, Food Note và Food Plan
scripts/               Công cụ tạo snapshot dữ liệu OSM
storage/datasets/       Snapshot và báo cáo dữ liệu có nguồn
tests/                 Kiểm thử API, đăng nhập Google, bản đồ và bộ lọc
```

Tài liệu chi tiết: [API và cấu hình](api/README.md), [triển khai](DEPLOYMENT.md), [thiết kế cơ sở dữ liệu ban đầu](database_design.md), [báo cáo hoàn thiện tính năng ngày 28/10/2026](COMPLETION-20261028.md). Schema triển khai thực tế nằm trong `api/schema.sql`.

## Chạy tại máy phát triển

Ứng dụng đầy đủ cần PHP, MySQL/MariaDB và máy chủ web có hỗ trợ rewrite. Bản preview Node.js chỉ phục vụ giao diện và chuyển tiếp yêu cầu bản đồ; các luồng tài khoản, Food Note, Food Plan và quản trị cần API PHP.

1. Cài PHP 8.1+ với `pdo_mysql`, `curl`, `fileinfo`, `mbstring`, `json` và session; cài Composer và MySQL/MariaDB.
2. Tạo database rỗng và bản sao cấu hình:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Điền `W2E_ENV=development`, `W2E_BASE_URL`, thông tin database, `W2E_APP_SECRET` và cấu hình mail trong `.env`. Cài thư viện PHP và tạo schema:

   ```powershell
   composer install
   php api/bin/migrate.php
   ```

4. Tạo quản trị viên đầu tiên từ terminal tin cậy. Đặt `W2E_ADMIN_PASSWORD` (tối thiểu 12 ký tự), tùy chọn `W2E_ADMIN_NAME`, sau đó chạy:

   ```powershell
   php api/bin/create-admin.php admin@example.com
   ```

   Xóa mật khẩu tạm khỏi môi trường sau khi tạo tài khoản.
5. Để dùng Google Sign-In, cấu hình `W2E_GOOGLE_CLIENT_ID` và thêm đúng origin của ứng dụng vào Authorized JavaScript origins trong Google Cloud Console. Luồng hiện tại không cần Google Client Secret hay redirect URI.
6. Mở ứng dụng qua máy chủ PHP/Apache đã cấu hình document root, rewrite và HTTPS phù hợp. `/api/v1/health` kiểm tra kết nối API/database.

Có thể chạy preview giao diện bằng `node server.js` tại `http://127.0.0.1:4173/`; preview này không thay thế môi trường PHP/MySQL.

## Dữ liệu địa điểm OSM tại TP. Hồ Chí Minh

Snapshot CSV và tài liệu nguồn/chất lượng nằm trong `storage/datasets/hcm-osm-food/`. Để dựng lại từ bản trích xuất Geofabrik:

1. Tải `vietnam-latest.osm.pbf` vào `storage/imports/osm/`.
2. Cài thư viện Python vào thư mục import cục bộ:

   ```powershell
   python -m pip install --target storage/imports/osm/vendor -r requirements-osm-import.txt
   ```

3. Liệt kê ranh giới hành chính rồi tạo snapshot theo relation TP. Hồ Chí Minh:

   ```powershell
   python scripts/build_hcm_food_dataset.py --list-boundaries
   python scripts/build_hcm_food_dataset.py --boundary-relation RELATION_ID
   ```

4. Đọc `data_quality_report.md` và `sources_and_license.md` trước khi nhập hoặc phân phối dữ liệu. Dữ liệu OSM cần giữ ghi công và tuân thủ [ODbL](https://www.openstreetmap.org/copyright).

Lệnh `php api/bin/import-catalog.php` nhập danh mục từ snapshot đã chuẩn bị. Công cụ `php api/bin/enrich-addresses.php` bổ sung địa chỉ theo giới hạn và cache; cần kiểm tra kết quả từ dịch vụ địa lý trước khi sử dụng.

## Bảo mật và vận hành

- Không commit `.env`, mật khẩu, token, dữ liệu tải lên riêng tư, thư mục vendor hoặc bản sao làm việc trong `storage/backups/`.
- Dùng HTTPS và secret riêng cho từng môi trường; giới hạn quyền database của ứng dụng. Tạo admin qua CLI, không có mật khẩu quản trị mặc định.
- API dùng session cookie, CSRF token cho thao tác ghi, prepared statements, kiểm tra quyền theo vai trò, giới hạn tần suất và kiểm soát kích thước/tệp tải lên.
- Email xác minh và đặt lại mật khẩu cần SMTP hoạt động. Chế độ ghi email ra log chỉ dành cho kiểm thử cục bộ khi được bật rõ ràng.
- Cấu hình hosting để `.env` và `storage/` không truy cập trực tiếp qua web; duy trì backup database và vùng upload riêng tư.
- Chạy `php api/bin/cleanup.php` định kỳ để dọn token/cache hết hạn và báo cáo media không còn được tham chiếu. Tùy chọn xóa media mồ côi cần xem báo cáo/backup trước.
- Làm theo các bước trong [DEPLOYMENT.md](DEPLOYMENT.md) để cấu hình production, Google OAuth, mail, domain và kiểm tra trước khi mở đăng ký.

## Kiểm thử

Các kiểm thử hiện có:

```powershell
node tests/integration.mjs
node tests/random-filters.mjs
node tests/map-location.mjs
php tests/google-auth.php
```

Integration test cần PHP/MySQL CLI và quyền tạo/xóa database tạm. Xem đầu file test hoặc [api/README.md](api/README.md) để biết biến môi trường tùy chọn cho môi trường không dùng XAMPP.
