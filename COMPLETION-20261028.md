# Hoàn thiện What2Eat ngày 28/10/2026

Website PHP/MySQL đang hoạt động tại http://what2eat.local. Đã chạy migration 20261028_completion và nhập 5.150 quán có nguồn OSM/Geofabrik. Không tạo dữ liệu quán, điện thoại, giờ mở hay giá giả trong DB đang sử dụng. Dữ liệu kiểm thử chỉ nằm trong DB tạm được bộ test tự xóa.

## Những phần đã sửa và nguyên nhân

1. Random: Ngân sách bị disabled trực tiếp trong JS và HTML, chưa có logic lọc giá. Đã thay cả ba bộ lọc bằng nút mở dialog có chip, trạng thái chọn, bàn phím/Esc, click ngoài, focus quay về nút và bottom sheet trên màn hình dưới 600 px. Khoảng cách 500 m/1/2/5 km, mọi lựa chọn tính trên tập quán tải trong vùng tối đa 5 km (API OSM giới hạn 250 bản ghi). Ngân sách dùng khoảng giá số bằng đồng đã được cung cấp/duyệt; giá chưa biết chỉ đi qua khi bật công tắc. Không tự biến chi phí một Food Note thành giá chung của quán. Khi không có kết quả, ẩn kết quả cũ và thông báo nới bộ lọc.

2. Dữ liệu: bộ chuyển đổi snapshot bỏ phone, website và opening_hours, trang chi tiết lại ưu tiên snapshot này. Đã giữ các trường gốc, bổ sung contact:phone/contact:website, danh mục DB và lớp đóng góp ưu tiên hơn OSM. Dữ liệu OSM mới truy vấn khi khám phá được lưu vào danh mục; tìm kiếm không giới hạn bán kính. Điện thoại/giờ mở/giá vẫn thiếu nếu nguồn không cung cấp. Trang chi tiết ẩn trường trống và có nút bổ sung; Food Note cộng đồng chỉ lấy note thật công khai đã duyệt; giữ quán gần đây.

3. Food Note: tìm tên trong 3 km và so sánh nguyên dấu khiến nhiều quán không xuất hiện. Đã tìm qua DB với collation utf8mb4_unicode_ci không phân biệt dấu/hoa thường, debounce 350 ms và bỏ phản hồi cũ. Có thêm quán mới với tên, địa chỉ, ghim bản đồ và tọa độ thủ công. Quán chờ duyệt chỉ người tạo chọn được để viết note ngay. Gợi ý món/giá lấy từ note của chính người dùng hoặc note công khai đã duyệt, không lộ món trong note riêng tư của người khác.

4. Email: local trước đây ghi log thay vì gửi thư; màn hình thành công có thông báo cố định. Đã dùng SMTP thật qua cURL có TLS và xác thực, mặc định không giả lập. Thiếu cấu hình/gửi lỗi trả lỗi, không báo gửi thành công. Token 32 byte ngẫu nhiên, hash SHA-256, hạn 24 giờ; khóa bản ghi khi xác nhận; tạo token mới vô hiệu token cũ. Gửi lại giới hạn 60 giây và 3 lần/giờ theo cơ chế giới hạn của ứng dụng, rollback token khi gửi thất bại. Cấu hình và hướng dẫn Gmail ở .env.example/README. Chưa có tài khoản SMTP nên CHƯA nghiệm thu gửi/nhận email thật.

5. Food Plan: fallback trước đây chỉ hiện URL trong toast ngắn. Đã có ô chỉ đọc và nút sao chép, Clipboard API → textarea execCommand → chọn văn bản để copy tay, chỉ báo đã sao chép nếu thành công. Liên kết dùng base URL cấu hình, tạo mới vô hiệu link cũ. Tham gia lặp không tăng thành viên hay tạo thông báo trùng; người chưa đăng nhập giữ liên kết qua next. Link không có thời hạn riêng; hết hiệu lực khi xoay token hoặc kế hoạch đóng.

6. Header/hồ sơ: chuông và một số vùng avatar chỉ là phần tử trang trí. Đã nối chuông với DB, mới nhất trước, dấu chưa đọc, đánh dấu từng mục/tất cả, đóng ngoài/Esc. Nguồn thông báo là nhận lời mời/thành viên tham gia và đề xuất quán. Việc tạo một link chưa biết người nhận nên không gửi thông báo tới một tài khoản chưa được xác định. Avatar/tên vào hồ sơ; bổ sung các quán đã lưu, note và kế hoạch gần đây, hiển thị vai trò và giữ đăng xuất.

## Thống kê dữ liệu và giới hạn

Cùng tập 5.150 quán snapshot trước/sau sửa bộ chuyển đổi:

- Địa chỉ: 2.281/5.150 (44,29%) trước và sau. Chưa có tăng trưởng được xác nhận.
- Điện thoại: API snapshot cũ bỏ toàn bộ; sau sửa giữ 691/5.150 (13,42%) có trong nguồn.
- Giờ mở cửa: API snapshot cũ bỏ toàn bộ; sau sửa giữ 842/5.150 (16,35%) có trong nguồn.
- Giá: 0/5.150 trước và sau; cần nguồn xác thực hoặc đóng góp được duyệt.

Đã thử bổ sung địa chỉ cho 20 quán thiếu: 0 thành công. PHP cURL báo mã 6, Could not resolve host: nominatim.openstreetmap.org, cả trong và ngoài sandbox. Vì vậy tiêu chí “địa chỉ tăng rõ rệt” chưa đạt. Công cụ reverse có cache 30 ngày, User-Agent riêng, khóa DB dùng chung, giãn cách 1,1 giây. Kết quả là địa chỉ đường/khu vực gần tọa độ, không tự gán số nhà của địa điểm lân cận. Sau khi sửa DNS/kết nối, chạy php api/bin/enrich-addresses.php 20 để kiểm tra lại. Không bật tác vụ quét hàng loạt tự động.

Tên “Cơm quê Dượng” hiện không có trong bộ OSM thật; giao diện cho thêm mới. Kiểm thử tìm không dấu dùng bản ghi fixture trong DB tạm, không phải bằng chứng quán này có trong OSM.

## Kiểm tra đã chạy

- node tests/integration.mjs: PASS. Tài khoản, xác nhận, phiên, note/media, kế hoạch, profile, quản trị; bổ sung tìm không dấu, quán pending chỉ người tạo sử dụng, bảo vệ món riêng tư, admin duyệt đóng góp, thông báo đúng chủ, tham gia lặp, vô hiệu link mời cũ.
- node tests/random-filters.mjs: PASS. Cả ba điều kiện đồng thời, không có kết quả, gồm/loại quán chưa có giá.
- php tests/google-auth.php: PASS. Chữ ký, audience, issuer, thời hạn.
- PHP lint các tệp API đã sửa và node --check site.js: PASS.
- Trình duyệt thật HTTP: mở Ngân sách, chọn 30–60k, mở Khoảng cách, chọn 500 m, giá trị hiển thị đúng và random trả quán; bottom sheet đã xem ở viewport hẹp. Chưa kiểm thử trực tiếp UI đăng nhập ở phiên trình duyệt của người dùng; các luồng có xác thực được kiểm thử qua HTTP trên DB tạm.
- /api/v1/health: database connected.

## Cách nghiệm thu trên website

1. Trang chủ: thử ba bộ lọc, tắt Gồm cả quán chưa có giá khi chọn ngân sách để xem trạng thái không khớp; Esc và click ngoài đóng dialog. Trên điện thoại kiểm tra sheet dưới màn hình.
2. Food Note: đăng nhập, tìm tên không dấu. Nếu không có, Thêm quán mới → nhập tên/địa chỉ, ghim vị trí → lưu → nhập món và 65000 → lưu note. Mở note mới, chọn lại quán và kiểm tra gợi ý món.
3. Trang quán OSM: Bổ sung/sửa thông tin → gửi. Admin → Quán ăn → Thông tin quán chờ duyệt → Duyệt. Mở lại trang quán để đối chiếu. Thông tin phải có nguồn thật do người đóng góp biết.
4. Food Plan: tạo/đổi link, sao chép, mở bằng tài khoản thứ hai, kiểm tra thành viên và chuông. Tạo link mới rồi mở link cũ phải bị từ chối. Nếu clipboard bị trình duyệt chặn, copy tay từ ô đã chọn.
5. Chuông: bấm một mục, đánh dấu tất cả; chấm đỏ biến mất khi hết chưa đọc. Bấm avatar/tên để xem hồ sơ và dữ liệu của đúng tài khoản.
6. SMTP: điền biến trong .env theo README, dùng email của bạn để đăng ký; kiểm tra thư và bấm link, mở lại link phải báo hết hạn/đã dùng. what2eat.local chỉ truy cập được trên máy đã cấu hình tên miền; dùng HTTPS/tên miền thật nếu cần mở trên thiết bị khác.

## Tệp thay đổi

- api/bootstrap.php: SMTP/TLS, chế độ log chỉ bật rõ ràng.
- api/index.php: nối API mới, giữ tag OSM, cache danh mục, xác nhận/gửi lại email, Food Plan và quyền dùng quán pending.
- api/completion.php: tìm danh mục/món, đóng góp/duyệt, thông báo, reverse/cache.
- api/schema.sql và api/bin/migrate.php: bảng place_catalog, place_corrections, notifications và phiên bản migration.
- api/bin/import-catalog.php và api/bin/enrich-addresses.php: nhập dữ liệu thật và bổ sung địa chỉ có giới hạn.
- assets/js/site.js và assets/css/live-data.css: bộ lọc, clipboard, Food Note, thông báo, hồ sơ và đóng góp.
- pages/create-food-note.php: Leaflet cho ghim quán mới.
- .env.example và README.md: cấu hình và hướng dẫn vận hành.
- tests/integration.mjs và tests/random-filters.mjs: kiểm thử hồi quy.

Bản sao các tệp chính trước khi sửa và các script chỉnh sửa một lần nằm trong storage/backups/completion-20261028; thư mục storage bị chặn truy cập web. File Word đã được đọc tham khảo; không sửa file Word của bạn.
## Bổ sung ngày 28/10/2026 về trạng thái hoạt động

Nguyên nhân ảnh chụp vẫn có dòng “chưa xác minh hoạt động” là snapshot OSM gán mặc định `verified_status=unverified`; dữ liệu OSM không phải bằng chứng quán đang mở. Đã thêm cột `verification_status` và hàng đợi quản trị. Admin mở **Admin → Quản lý Quán ăn → Xác minh hoạt động OSM**, đối chiếu một nguồn thực tế, nhập nguồn kiểm tra và ghi chú, rồi bấm **Xác minh đang hoạt động**. Chỉ bản ghi có trạng thái `verified_active` mới hiện “Đã xác minh hoạt động”; trạng thái `reported_closed` ghi rõ đã báo đóng cửa.

Không tự đánh dấu toàn bộ OSM là đang hoạt động vì đó là kết luận không có bằng chứng. API kiểm thử thêm đã xác nhận user thường không thể xác minh, admin xác minh thành công và trang chi tiết nhận đúng trạng thái. Cache asset đã nâng lên v6/`20261028-activity` để trình duyệt không dùng JavaScript cũ.
