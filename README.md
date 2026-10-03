# What2Eat

# What2Eat — Website khám phá quán ăn và nhật ký ẩm thực

> **Đề tài:** Xây dựng website khám phá quán ăn và hỗ trợ ghi chép nhật ký ẩm thực cá nhân "What2Eat"

---

## 1. Vai trò của AI

Bạn là một **Senior Full-stack Web Developer + UI/UX Designer + Software Architect**, có kinh nghiệm xây dựng các website thương mại/dịch vụ hiện đại như ShopeeFood, GrabFood và các nền tảng khám phá địa điểm ăn uống.

Nhiệm vụ là thiết kế và xây dựng giao diện website cho dự án **What2Eat**.

Website phải có tính thực tế, hiện đại, dễ sử dụng và có thể tiếp tục phát triển thành hệ thống hoàn chỉnh.

---

# 2. Tổng quan dự án

What2Eat là website giúp người dùng giải quyết câu hỏi:

> **"Hôm nay ăn gì?"**

Người dùng có thể:

- Khám phá món ăn.
- Khám phá quán ăn.
- Lọc quán theo nhu cầu.
- Nhận gợi ý ngẫu nhiên.
- Lưu quán yêu thích.
- Ghi lại những món đã ăn.
- Đánh giá món ăn.
- Thêm hình ảnh/video.
- Tạo Food Note.
- Chia sẻ Food Note.
- Tạo nhóm Food Plan.
- Bình chọn quán ăn.
- Xem thống kê thói quen ăn uống cá nhân.

Hệ thống có 2 nhóm người dùng chính:

### User

Có thể:

- Khám phá quán ăn.
- Tạo và quản lý Food Note.
- Chia sẻ ghi chú.
- Tham gia Food Plan.
- Xem thống kê cá nhân.

### Admin

Có trách nhiệm:

- Quản lý dữ liệu quán ăn.
- Quản lý danh mục.
- Quản lý người dùng.
- Quản lý/kiểm duyệt Food Note công khai.

---

# 3. Nguyên tắc thiết kế tổng thể

Không thiết kế website theo kiểu dashboard khô cứng.

Website phải có cảm giác là một **nền tảng khám phá đồ ăn hiện đại**, trực quan và có tính "food discovery".

Có thể lấy cảm hứng từ:

- ShopeeFood.
- GrabFood.
- Các nền tảng khám phá nhà hàng.
- Các ứng dụng food journal hiện đại.

Tuy nhiên:

> **KHÔNG COPY giao diện ShopeeFood.**

Chỉ tham khảo:

- Cách tổ chức nội dung.
- Cách hiển thị card món ăn/quán ăn.
- Cách sử dụng hình ảnh món ăn.
- Thanh tìm kiếm.
- Category navigation.
- Bộ lọc.
- Khoảng trắng.
- Card bo góc.
- Bottom navigation trên mobile.

What2Eat phải có **identity riêng**.

---

# 4. Phong cách UI/UX

Phong cách tổng thể:

- Modern Food App.
- Clean.
- Warm.
- Premium nhưng gần gũi.
- Minimal.
- Friendly.
- Dễ thao tác.
- Không rối mắt.
- Không quá nhiều màu.
- Không quá nhiều hiệu ứng.

Cảm giác khi mở website:

> "Một ứng dụng khám phá đồ ăn hiện đại, ấm áp và dễ dùng."

---

# 5. Color Palette

## Primary — Dark Golden / Mustard Yellow

```text
#C58B00
```

hoặc:

```text
#D4A017
```

Dùng cho:

- Nút chính.
- CTA.
- Icon quan trọng.
- Active state.
- Highlight.
- Badge.
- Thành phần tương tác.

## Secondary — Dark Brown

```text
#4A2C1A
```

Dùng cho:

- Heading.
- Navbar.
- Footer.
- Text quan trọng.
- Icon.

## Background — Cream / Warm White

```text
#FFFDF8
```

hoặc:

```text
#FAF7F0
```

## Primary Text

```text
#2B2118
```

## Secondary Text

```text
#6F6258
```

## Border

```text
#E8DED2
```

## Success

Có thể sử dụng xanh lá nhẹ.

## Error

Có thể sử dụng đỏ nhẹ.

### Quy tắc

Không sử dụng quá nhiều màu.

Toàn bộ website phải thống nhất visual identity.

---

# 6. Typography

Ưu tiên:

```text
Inter
```

hoặc:

```text
Poppins
```

Heading:

- Đậm.
- Rõ.
- Kích thước vừa phải.

Body:

- Dễ đọc.
- Line-height thoáng.
- Không dùng font quá nhỏ.

Không sử dụng quá 2 font.

---

# 7. Border Radius

Card:

```text
16px
```

Button:

```text
10px – 12px
```

Input:

```text
10px – 12px
```

Image:

```text
12px – 16px
```

Không dùng radius quá lớn khiến website trông giống app trẻ em.

---

# 8. Shadow

Shadow phải nhẹ.

Ví dụ:

```css
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
```

Không sử dụng shadow quá đậm.

Mục tiêu là tạo chiều sâu nhẹ nhưng vẫn clean.

---

# 9. Responsive Design

Website bắt buộc responsive.

## Desktop

- 1920px
- 1440px
- 1366px

## Tablet

- 1024px
- 768px

## Mobile

- 430px
- 414px
- 390px
- 375px

Không được chỉ thiết kế desktop rồi thu nhỏ.

Mobile phải được thiết kế lại bố cục phù hợp.

---

# 10. Landing Page

Landing page là trang quan trọng nhất.

Khi người dùng chưa đăng nhập, truy cập website sẽ thấy Landing Page.

---

## 10.1 Navbar

Navbar desktop:

### Bên trái

Logo:

```text
🍴 What2Eat
```

hoặc logo food icon tối giản.

### Ở giữa

- Khám phá
- Food Note
- Food Plan
- Thống kê

### Bên phải

- Đăng nhập
- Đăng ký

Navbar:

- Sticky.
- Background sáng.
- Border-bottom nhẹ.
- Không quá cao.

---

## 10.2 Hero Section

Hero phải là phần nổi bật nhất.

Background:

Cream / Warm White.

### Bên trái

Heading:

> **Hôm nay ăn gì?**

Subheading:

> Khám phá món ngon, tìm quán phù hợp và lưu lại những trải nghiệm ẩm thực của bạn.

Search box lớn:

```text
🔍 Bạn muốn ăn gì hôm nay?
```

Button:

```text
Khám phá ngay
```

### Bên phải

Sử dụng hình ảnh món ăn/quán ăn đẹp.

Có thể tạo composition:

- 1 ảnh lớn.
- 2 ảnh nhỏ.
- Badge rating.
- Badge "Recommended".
- Floating food cards.

Không làm hero quá cao.

---

## 10.3 Quick Discovery

Heading:

> **Bạn đang muốn ăn gì?**

Category:

- 🍜 Món Việt
- 🔥 BBQ / Lẩu
- ☕ Cà phê
- 🍣 Nhật
- 🍱 Hàn
- 🍔 Ăn nhanh
- 🍰 Tráng miệng
- 🥤 Đồ uống

Mỗi category là card nhỏ.

Hover:

- Nâng card nhẹ.
- Đổi border.
- Icon/highlight sang màu vàng chủ đạo.

---

## 10.4 Random Food

Đây là chức năng đặc trưng của What2Eat.

Heading:

> **Không biết ăn gì?**

Subheading:

> Để What2Eat chọn giúp bạn.

Filter:

- Loại món.
- Ngân sách.
- Khoảng cách.
- Rating.

Button:

```text
🎲 Chọn món ngẫu nhiên
```

Khi click:

1. Hiển thị animation loading ngắn.
2. Sau đó hiển thị kết quả.

Kết quả gồm:

- Tên quán.
- Hình ảnh.
- Rating.
- Khoảng giá.
- Khoảng cách.
- Loại món.
- Địa chỉ.

Button:

- Xem quán.
- Thử lại.

---

## 10.5 Restaurant Discovery

Heading:

> **Quán ăn được yêu thích**

Restaurant card gồm:

- Ảnh quán.
- Tên quán.
- Category.
- Rating.
- Số lượt đánh giá.
- Khoảng giá.
- Khoảng cách.
- Trạng thái mở cửa.
- Nút favorite.

Responsive:

- Desktop: 4 card/row.
- Tablet: 2–3 card/row.
- Mobile: 1 card/row.

---

## 10.6 Food Note Introduction

Heading:

> **Lưu lại mọi trải nghiệm ăn uống**

Mô tả:

> Ghi lại món ăn bạn đã thử, đánh giá hương vị và lưu những khoảnh khắc đáng nhớ.

Hiển thị mockup Food Note.

Food Note card gồm:

- Hình ảnh.
- Tên món.
- Giá.
- Rating.
- Ngày ăn.
- Tag.
- Comment.

CTA:

```text
Tạo Food Note
```

---

## 10.7 Food Plan

Heading:

> **Đi ăn cùng bạn bè?**

Giới thiệu Food Plan.

Ví dụ:

```text
Weekend Food Plan

👤 Viet
👤 Minh
👤 An
👤 Tai

3 quán đang được đề xuất

🍜 Quán A       4 votes
🍗 Quán B       3 votes
🍣 Quán C       1 vote
```

CTA:

```text
Tạo Food Plan
```

---

## 10.8 Personal Statistics

Heading:

> **Hiểu hơn về thói quen ăn uống của bạn**

Dashboard preview:

- Tổng số ghi chú.
- Tổng chi tiêu.
- Món ăn yêu thích.
- Quán ghé nhiều nhất.

Biểu đồ:

- Pie Chart.
- Bar Chart.
- Line Chart.

Sử dụng **Chart.js**.

Không làm dashboard quá phức tạp.

---

## 10.9 PWA Section

Heading:

> **What2Eat luôn bên bạn**

Lợi ích:

- Cài đặt trên điện thoại.
- Responsive.
- Có thể xem nội dung đã tải khi mất mạng.

Thiết kế đơn giản.

---

## 10.10 CTA

Heading:

> **Hôm nay ăn gì?**

Text:

> Hãy để What2Eat tìm câu trả lời cho bạn.

Button:

```text
Bắt đầu khám phá
```

---

## 10.11 Footer

### What2Eat

Khám phá món ngon.  
Lưu lại trải nghiệm.

### Khám phá

- Tìm quán ăn.
- Danh mục.
- Random Food.

### Cá nhân

- Food Note.
- Food Plan.
- Thống kê.

### Hỗ trợ

- Điều khoản.
- Chính sách.
- Liên hệ.

Footer phải gọn.

---

# 11. Trang Discovery

Route:

```text
/discovery
```

## Search

```text
🔍 Tìm món ăn, quán ăn...
```

## Filter

- Category.
- Price.
- Rating.
- Distance.
- Open now.

Buttons:

```text
Lọc
```

```text
Xóa bộ lọc
```

## Result

Restaurant cards.

Sorting:

- Phù hợp nhất.
- Đánh giá cao.
- Khoảng cách gần.
- Giá thấp.

---

# 12. Restaurant Detail

Route:

```text
/restaurant/{id}
```

## Hero

Ảnh lớn của nhà hàng.

## Thông tin

- Tên.
- Rating.
- Category.
- Price range.
- Địa chỉ.
- Giờ mở cửa.
- Trạng thái Open/Closed.

## Actions

- ❤️ Yêu thích.
- 📍 Chỉ đường.
- Chia sẻ.

## Gallery

Hiển thị nhiều hình ảnh.

## Map

Có khu vực Google Maps.

## Description

Thông tin mô tả quán.

## Related Restaurants

Hiển thị các quán tương tự.

---

# 13. Food Note

Route:

```text
/food-notes
```

Có:

- Search.
- Filter.
- Tag.
- Rating.
- Date.
- Grid/List toggle.

Food Note card:

```text
[IMAGE]

Tên món

★★★★★

120.000đ

"Rất ngon..."

#giá_rẻ
#đi_với_bạn

12/09/2026

❤️   📌
```

---

# 14. Create Food Note

Route:

```text
/food-notes/create
```

Form:

- Tên món.
- Giá tiền.
- Rating.
- Nhận xét.
- Upload image.
- Upload video.
- Tags.

Privacy:

```text
Public
Private
Password protected
```

Actions:

```text
Lưu nháp
```

```text
Đăng Food Note
```

Hỗ trợ autosave draft.

---

# 15. Food Note Detail

Hiển thị:

- Hình ảnh.
- Video.
- Tên món.
- Giá.
- Rating.
- Comment.
- Tags.
- Ngày tạo.
- Restaurant.
- Privacy status.

Actions:

- Edit.
- Delete.
- Favorite.
- Pin.
- Share.

---

# 16. Food Plan

Route:

```text
/food-plans
```

Hiển thị các nhóm.

Card:

```text
Weekend Food Plan

4 thành viên

3 quán đề xuất

Trạng thái:
Voting
```

---

# 17. Food Plan Detail

## Group Header

- Tên nhóm.
- Avatar member.
- Số thành viên.

## Restaurant Proposals

Ví dụ:

```text
🍜 Phở ABC

120k – 180k
4.8 ⭐

👍 5 votes

[Vote]
```

Mỗi thành viên có thể đề xuất quán.

Danh sách vote cập nhật gần thời gian thực.

---

# 18. User Profile

Route:

```text
/profile
```

Hiển thị:

- Avatar.
- Name.
- Email.
- Sở thích ăn uống.
- Số Food Note.
- Số quán yêu thích.

Sections:

### Personal Information

### Food Preferences

### Security

### Account

---

# 19. Favorites

Route:

```text
/favorites
```

Hiển thị:

- Quán yêu thích.
- Food Note yêu thích.

Có thể xóa khỏi favorites.

---

# 20. Personal Dashboard

Route:

```text
/dashboard
```

Top cards:

```text
Food Notes
128
```

```text
Total Spending
4.250.000đ
```

```text
Average Rating
4.3 ⭐
```

```text
Favorite Restaurant
ABC Restaurant
```

Biểu đồ:

### Spending over time

Line chart.

### Food categories

Pie chart.

### Restaurants visited

Bar chart.

### Recent Food Notes

List.

Sử dụng Chart.js.

---

# 21. Login

Route:

```text
/login
```

Desktop: 2 columns.

### Trái

- Food image.
- Slogan.

### Phải

Form:

```text
Email
Password
```

Button:

```text
Đăng nhập
```

Links:

```text
Quên mật khẩu?
Chưa có tài khoản? Đăng ký
```

Mobile:

Chuyển thành 1 column.

---

# 22. Register

Fields:

- Họ tên.
- Email.
- Password.
- Confirm Password.

Checkbox:

```text
Tôi đồng ý với điều khoản sử dụng
```

Button:

```text
Tạo tài khoản
```

Sau đăng ký:

Hiển thị thông báo yêu cầu kích hoạt email.

---

# 23. Forgot Password

Field:

```text
Email
```

Button:

```text
Gửi liên kết đặt lại mật khẩu
```

---

# 24. Admin

Admin có giao diện riêng.

Route:

```text
/admin
```

Sidebar:

- Dashboard.
- Quản lý quán ăn.
- Quản lý danh mục.
- Quản lý người dùng.
- Quản lý Food Note.
- Settings.
- Logout.

Không dùng cùng layout với User.

---

# 25. Admin Dashboard

Hiển thị:

```text
Total Users
Total Restaurants
Total Food Notes
Pending Reviews
```

Có:

- Biểu đồ thống kê.
- Recent activity.

---

# 26. Admin — Restaurant Management

Route:

```text
/admin/restaurants
```

Table:

| Restaurant | Category | Rating | Status | Actions |
| ---------- | -------- | ------ | ------ | ------- |

Actions:

- Edit.
- Hide/Show.
- Delete.

Button:

```text
+ Thêm quán ăn
```

---

# 27. Admin — Category Management

Quản lý:

- Món Việt.
- BBQ/Lẩu.
- Cà phê.
- Nhật.
- Hàn.
- Ăn nhanh.
- Tráng miệng.
- Đồ uống.

Actions:

- Add.
- Edit.
- Delete.
- Hide/Show.

---

# 28. Admin — User Management

Table:

| User | Email | Role | Status | Created | Actions |
| ---- | ----- | ---- | ------ | ------- | ------- |

Actions:

```text
Khóa
Mở khóa
```

---

# 29. Admin — Food Note Moderation

Hiển thị Food Note công khai.

Admin có thể:

- Xem.
- Duyệt.
- Ẩn.
- Xóa nếu cần.

Filter:

```text
Pending
Approved
Hidden
```

---

# 30. Navigation Desktop

Navbar:

```text
Logo
Khám phá
Food Note
Food Plan
Dashboard
```

Bên phải:

```text
❤️
🔔
Avatar
```

Avatar dropdown:

```text
Profile
Favorites
Settings
Logout
```

---

# 31. Navigation Mobile

Sử dụng bottom navigation.

5 mục:

```text
🏠 Home
🔍 Explore
➕ Add
📔 Notes
👤 Profile
```

Bottom navigation:

- Fixed.
- Nền trắng.
- Shadow nhẹ.
- Active state màu vàng.

Không nhồi quá nhiều menu vào mobile.

---

# 32. Micro Interactions

Animation vừa phải.

Button hover:

- Background thay đổi.
- TranslateY nhẹ.

Card hover:

```css
transform: translateY(-3px);
```

Favorite:

- Heart animation nhẹ.

Random food:

- Loading animation.

Modal:

- Fade + scale nhẹ.

Không sử dụng animation quá nhiều.

---

# 33. Empty States

Mọi danh sách cần có empty state.

Ví dụ Food Note:

```text
📔

Bạn chưa có Food Note nào.

Hãy lưu lại món ăn đầu tiên của bạn!

[+ Tạo Food Note]
```

Favorites:

```text
❤️

Bạn chưa lưu quán nào.
```

---

# 34. Loading States

Thiết kế skeleton loading cho:

- Restaurant card.
- Food Note.
- Dashboard.
- Restaurant detail.

Không để màn hình trắng khi loading.

---

# 35. Error States

Thiết kế:

- 404.
- API error.
- Network error.
- Unauthorized.
- Forbidden.

Ví dụ:

```text
Có lỗi xảy ra.

Vui lòng thử lại sau.

[Thử lại]
```

---

# 36. Toast Notification

Dùng toast cho:

- Login thành công.
- Food Note saved.
- Favorite added.
- Favorite removed.
- Vote thành công.
- Restaurant deleted.
- Profile updated.

Không dùng browser alert mặc định nếu có thể sử dụng toast UI.

---

# 37. Modal

Dùng modal cho hành động cần xác nhận.

Ví dụ:

```text
Xóa Food Note?

Bạn có chắc chắn muốn xóa Food Note này?

[Hủy] [Xóa]
```

---

# 38. Accessibility

Website phải chú ý:

- Contrast.
- Keyboard navigation.
- Focus state.
- Alt text.
- Aria-label.
- Button có text rõ.
- Input có label.

Không chỉ dựa vào màu sắc để biểu thị trạng thái.

---

# 39. Tech Stack

## Frontend

```text
HTML5
CSS3
JavaScript
Bootstrap
Chart.js
```

## Backend

```text
PHP 8.x
REST API
JSON
```

## Database

```text
MySQL 8.0
```

Database có thể sử dụng JSON cho:

- Image list.
- Video list.
- User preferences.

### Không tự ý thay đổi stack

Không tự ý chuyển sang:

- React.
- Vue.
- Next.js.
- Laravel.
- Node.js.

nếu chưa được yêu cầu.

---

# 40. Project Structure

Đề xuất:

```text
what2eat/
│
├── index.html
│
├── pages/
│   ├── discovery.html
│   ├── restaurant.html
│   ├── food-notes.html
│   ├── food-note-detail.html
│   ├── create-food-note.html
│   ├── food-plans.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── login.html
│   └── register.html
│
├── admin/
│   ├── index.html
│   ├── restaurants.html
│   ├── categories.html
│   ├── users.html
│   └── food-notes.html
│
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── discovery.js
│   │   ├── food-note.js
│   │   ├── food-plan.js
│   │   └── dashboard.js
│   │
│   └── images/
│
└── api/
    ├── auth/
    ├── restaurants/
    ├── food-notes/
    ├── food-plans/
    └── users/
```

---

# 41. UI Component System

## Button

Các loại:

- Primary.
- Secondary.
- Outline.
- Danger.
- Ghost.

## Badge

Các loại:

- Open.
- Closed.
- Pending.
- Approved.
- Private.
- Public.

## Card

- Restaurant Card.
- Food Note Card.
- Food Plan Card.
- Statistic Card.

## Form

- Input.
- Select.
- Textarea.
- Upload.
- Rating.

## Navigation

- Navbar.
- Sidebar.
- Mobile Bottom Navigation.

---

# 42. Database-ready Design

UI phải được thiết kế để dễ kết nối PHP API + MySQL.

Không hard-code logic quá sâu vào HTML.

## User

```text
id
name
email
password
avatar
preferences
role
status
created_at
```

## Restaurant

```text
id
name
category_id
description
address
latitude
longitude
price_range
rating
opening_hours
images
status
created_at
```

## Food Note

```text
id
user_id
restaurant_id
food_name
price
rating
review
images
videos
tags
privacy
password
is_favorite
is_pinned
created_at
updated_at
```

## Food Plan

```text
id
name
creator_id
status
created_at
```

---

# 43. UX Rules

Tuân thủ:

1. Người dùng luôn biết mình đang ở đâu.
2. Không tạo quá nhiều menu.
3. Không để quá nhiều thông tin trong một card.
4. CTA chính phải dễ nhìn.
5. Form phải ngắn gọn.
6. Error message phải rõ ràng.
7. Các thao tác nguy hiểm phải có confirmation.
8. Mobile phải thao tác bằng một tay được.
9. Không sử dụng popup vô lý.
10. Không lạm dụng animation.
11. Không để UI bị tràn trên mobile.
12. Không để text quá dài phá vỡ layout.

---

# 44. Hình ảnh

Website là website ẩm thực nên hình ảnh rất quan trọng.

Ưu tiên:

- Ảnh món ăn chất lượng cao.
- Ảnh quán ăn.
- Ảnh lifestyle.
- Ảnh có ánh sáng đẹp.
- Tỷ lệ ảnh thống nhất.

Không sử dụng hình ảnh bị méo.

Dùng:

```css
object-fit: cover;
```

cho restaurant/food card.

---

# 45. SEO cơ bản

Landing page:

```html
<title>What2Eat – Hôm nay ăn gì?</title>
```

Có meta description phù hợp.

Sử dụng semantic HTML:

```html
<header>
  <nav>
    <main>
      <section>
        <article>
          <footer></footer>
        </article>
      </section>
    </main>
  </nav>
</header>
```

---

# 46. Performance

Không tải quá nhiều ảnh cùng lúc.

Sử dụng:

```html
loading="lazy"
```

cho hình ảnh không nằm trong viewport đầu tiên.

CSS và JS phải có cấu trúc rõ ràng.

Không sử dụng thư viện không cần thiết.

---

# 47. Output khi AI được yêu cầu CODE WEBSITE

Không chỉ đưa ra một đoạn code ngắn.

Phải xây dựng theo từng bước:

## STEP 1

Phân tích yêu cầu.

## STEP 2

Đề xuất sitemap.

## STEP 3

Đề xuất layout.

## STEP 4

Đề xuất design system.

## STEP 5

Tạo cấu trúc thư mục.

## STEP 6

Code Landing Page.

## STEP 7

Code Discovery.

## STEP 8

Code Restaurant Detail.

## STEP 9

Code Food Note.

## STEP 10

Code Food Plan.

## STEP 11

Code Dashboard.

## STEP 12

Code Authentication.

## STEP 13

Code Admin.

## STEP 14

Responsive mobile.

## STEP 15

Kiểm tra UI/UX.

---

# 48. Quy tắc khi code

Code phải:

- Sạch.
- Dễ đọc.
- Dễ bảo trì.
- Đặt tên biến rõ ràng.
- Không viết code dư thừa.
- Không lặp code nếu có thể tái sử dụng.
- Responsive.
- Semantic.
- Dễ kết nối API.

Không tạo code quá phức tạp so với đồ án sinh viên.

Không sử dụng architecture quá nặng nếu không cần.

---

# 49. Dữ liệu demo

Nếu tạo dữ liệu demo, sử dụng dữ liệu thực tế về:

- Món ăn Việt Nam.
- Quán ăn.
- Giá tiền bằng VNĐ.
- Rating.
- Địa chỉ tại Việt Nam.

Ví dụ:

```text
Phở Bò
45.000đ
4.8 ⭐
```

Không dùng dữ liệu kiểu:

```text
Restaurant 1
Restaurant 2
Food 1
```

---

# 50. Các chức năng bắt buộc phải được phản ánh trong UI

Không tự ý bỏ bất kỳ chức năng nào được mô tả trong đề tài.

## User

- Account.
- Discovery.
- Restaurant Detail.
- Food Note.
- Tags & Search.
- Privacy.
- Sharing.
- Food Plan.
- Personal Dashboard.
- PWA.

## Admin

- Admin Restaurant Management.
- Admin Category Management.
- Admin User Management.
- Admin Food Note Moderation.

Nếu chức năng chưa triển khai backend, vẫn phải thiết kế UI tương ứng để sau này kết nối API.

---

# 51. UX Priority

Ưu tiên:

> **UX trước, code sau.**

Website phải giống một sản phẩm thật chứ không giống một bài HTML demo.

Mục tiêu:

> **Gọn – sạch – hiện đại – dễ hiểu – dễ thao tác.**

---

# 52. Mục tiêu cuối cùng

Khi nhìn vào website, người dùng phải hiểu ngay:

> **"Đây là website giúp tôi tìm món ăn, tìm quán ăn và lưu lại trải nghiệm ăn uống."**

Landing Page phải làm nổi bật:

# "Hôm nay ăn gì?"

CTA:

# "Khám phá ngay"

Website phải tạo cảm giác:

**Food Discovery + Personal Food Journal + Social Food Planning**

nhưng vẫn giữ giao diện đơn giản.

---

# 53. Checklist đánh giá

## UI

- [ ] Màu sắc thống nhất.
- [ ] Typography thống nhất.
- [ ] Card thống nhất.
- [ ] Button thống nhất.
- [ ] Navbar đẹp.
- [ ] Footer đẹp.
- [ ] Landing Page hoàn chỉnh.

## UX

- [ ] Dễ tìm món.
- [ ] Dễ tìm quán.
- [ ] Dễ tạo Food Note.
- [ ] Dễ xem Food Note.
- [ ] Dễ tạo Food Plan.
- [ ] Dễ xem Dashboard.

## Responsive

- [ ] Desktop.
- [ ] Tablet.
- [ ] Mobile.

## Function

- [ ] Discovery.
- [ ] Random Food.
- [ ] Restaurant.
- [ ] Food Note.
- [ ] Tags.
- [ ] Privacy.
- [ ] Sharing.
- [ ] Food Plan.
- [ ] Dashboard.
- [ ] Authentication.
- [ ] Admin.

## Code

- [ ] Clean code.
- [ ] Semantic HTML.
- [ ] Responsive CSS.
- [ ] JavaScript rõ ràng.
- [ ] Có thể kết nối PHP API.
- [ ] Có thể kết nối MySQL.

---

# 54. Prompt thực thi dành cho AI

Trước tiên **KHÔNG CODE NGAY**.

Hãy trả về:

1. Sitemap hoàn chỉnh.
2. Danh sách tất cả page.
3. User flow.
4. Admin flow.
5. Design system.
6. Color palette.
7. Typography.
8. Component system.
9. Responsive strategy.
10. Cấu trúc thư mục.

Sau khi kiến trúc được xác nhận, mới bắt đầu code từng page.

Hãy thiết kế theo tư duy của một:

> **Senior UI/UX Designer + Full-stack Developer**

nhưng code phải vừa đủ thực tế để một nhóm sinh viên có thể hiểu, chạy và phát triển tiếp.
