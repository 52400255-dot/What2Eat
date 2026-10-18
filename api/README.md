# What2Eat API and deployment

The project uses the supplied HTML/CSS/JavaScript + PHP 8 + MySQL 8 or compatible MariaDB stack. `api/schema.sql` starts empty: it contains no sample accounts, restaurant records, reviews, or analytics. Nearby map results come from OpenStreetMap/Overpass; user proposals are pending until an administrator publishes them.

## Hosting requirements

- PHP 8.1 or newer with `pdo_mysql`, `curl`, `fileinfo`, `mbstring`, `json`, and `session` enabled.
- MySQL 8.0 or MariaDB 10.4+ with `utf8mb4` support.
- Apache with `mod_rewrite` and `mod_headers`, or equivalent rewrites for `/api/*` and `/tiles/{z}/{x}/{y}.png` to `api/index.php`.
- HTTPS and persistent, private-writable `storage/uploads/notes` and `storage/uploads/avatars` directories. Do not use an ephemeral deployment filesystem for uploads or the database.
- A working outbound mail transport for PHP `mail()` to send verification and password-reset links.
- Outbound HTTPS access to OpenStreetMap tile and Overpass services. Their community services can throttle or be temporarily unavailable; the map reports that state and caches successful OSM responses for ten minutes.

## First deployment

1. Create an empty MySQL database and a restricted database account for the application.
2. Copy `.env.example` to `.env`; set the actual HTTPS site URL, a long random `W2E_APP_SECRET`, database credentials, the sender address, and the operator/support email shown in the privacy and terms pages. Keep `.env` outside version control.
3. Run `php api/bin/migrate.php` from the project root using a database account with schema-creation rights. The web application should use a database account with only the required data permissions after setup.
4. Provision the first administrator from a trusted server terminal. Set `W2E_ADMIN_PASSWORD` to a one-time password (at least 12 characters), optionally set `W2E_ADMIN_NAME`, then run `php api/bin/create-admin.php admin@example.com`. Remove the temporary password from the environment after the command. There is no default admin password and public registration cannot assign the admin role.
5. Ensure PHP can send mail, HTTPS is active, and the web server can write to `storage/uploads/notes` while blocking direct access to `storage/` and `.env`.
6. Point the domain's document root at this project, then check `/api/v1/health`. A healthy response requires a configured and migrated database.

## API groups

All write requests require a session cookie and `X-CSRF-Token` obtained from `GET /api/v1/auth/csrf`. Responses are JSON except map images. The browser client uses same-origin cookies; CORS is intentionally not open.

- Public and authentication: `GET /site-info`, `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/verify?token=…`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, and `POST /auth/reset-password`.
- Discovery and community data: `GET /restaurants?lat=…&lon=…&radius=…` (raw Overpass response for the existing map), `GET /restaurants/managed`, `GET /restaurants/managed/{id}`, authenticated `GET|POST /restaurants/proposals`, `GET /categories`, and `GET /tiles/{z}/{x}/{y}.png`.
- Account data: paginated `GET|POST /food-notes`, `GET|PUT|DELETE /food-notes/{id}`, `GET /food-notes/share/{token}`, `POST /food-notes/{id}/media`, `GET /media/{id}`, paginated `GET|POST /favorites`, `GET|POST /food-plans`, `POST /food-plans/join`, `GET|DELETE|PATCH /food-plans/{id}`, `POST /food-plans/{id}/invite`, `POST /food-plans/{id}/proposals`, `POST /food-plans/{id}/vote`, `GET|PUT|DELETE /profile`, `POST /profile/avatar`, `POST /profile/password`, and `GET /dashboard`.
- Admin-only operations: `GET /admin/dashboard`, `/admin/users`, `/admin/restaurants`, `/admin/categories`, `/admin/food-notes`, and paginated/searchable `/admin/audit-logs?page=1&per_page=50&q=…`; writes use `POST`, `PUT`, `PATCH`, or `DELETE` on the corresponding collection/item route.

User-generated public Food Notes enter `pending` moderation. Private notes remain visible to their owner; share-link notes require a high-entropy token. Restaurant submissions from members enter `pending` moderation. Ratings, prices, opening hours and photos remain unset unless a user/admin supplies them or a source explicitly provides them.

## Security and operations

Passwords use Argon2id when PHP provides it, otherwise PHP's password-hashing default. Session IDs rotate at login; cookies are HttpOnly and SameSite Lax. Mutations use session-bound CSRF tokens, same-origin validation, prepared SQL statements, bounded request sizes and per-IP rate limits. Admin bootstrap is CLI-only; user management cannot promote accounts. Audit entries omit raw IP addresses and retain only keyed hashes.

Uploads are MIME-sniffed, limited to JPEG/PNG/WEBP/GIF and MP4/WEBM, stored under randomized names outside the public web root, and served through an access-checked API endpoint. Food Note media is limited to 50 MB per file (`W2E_MAX_UPLOAD_BYTES=52428800`); PHP must allow `upload_max_filesize=50M` and `post_max_size=64M`. The project configures these for Apache PHP and CGI/FastCGI through `.htaccess` and `.user.ini`; hosting providers may require the same values in their PHP settings. Configure a working mail transport for PHP `mail()` before enabling registration; verification and password reset messages depend on it.

Use provider backups for MySQL and the private uploads directory. Keep both at a retention interval suitable for user data, and test recovery on the chosen host before opening registration.
