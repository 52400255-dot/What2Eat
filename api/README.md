# What2Eat API and deployment

The project uses the supplied HTML/CSS/JavaScript + PHP 8 + MySQL 8 or compatible MariaDB stack. `api/schema.sql` starts empty: it contains no sample accounts, restaurant records, reviews, or analytics. Nearby map results come from OpenStreetMap/Overpass; user proposals are pending until an administrator publishes them.

`.env` values are parsed into request-local PHP memory; real server environment variables take precedence. This avoids cross-request configuration races on threaded Apache installations.

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

All write requests require a session cookie and `X-CSRF-Token` obtained from `GET /api/v1/auth/csrf`. Responses are JSON except map images and browser navigation to an email-verification link, which redirects to the login page. The browser client uses same-origin cookies; CORS is intentionally not open.

- Public and authentication: `GET /site-info`, `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/verify?token=…`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, and `POST /auth/reset-password`.
- Discovery and community data: `GET /restaurants?lat=…&lon=…&radius=…` (raw Overpass shape filtered by admin blocks), `GET /restaurants/osm/{type}/{id}?lat=…&lon=…`, `GET /restaurants/osm/{type}/{id}/notes`, `GET /restaurants/managed`, `GET /restaurants/managed/{id}`, `GET /restaurants/managed/{id}/notes`, authenticated `GET|POST /restaurants/proposals`, authenticated `POST /place-reports`, `GET /categories`, and `GET /tiles/{z}/{x}/{y}.png`.
- Account data: paginated `GET|POST /food-notes`, `GET|PUT|DELETE /food-notes/{id}`, `PATCH /food-notes/{id}/flags`, `POST|DELETE /food-notes/{id}/share`, `GET /food-notes/share/{token}`, `POST /food-notes/{id}/media`, `GET|DELETE /media/{id}`, paginated `GET|POST /favorites`, `GET|POST /food-plans`, `POST /food-plans/join`, `GET|DELETE|PATCH /food-plans/{id}`, `POST /food-plans/{id}/invite`, `POST /food-plans/{id}/proposals`, `POST /food-plans/{id}/vote`, `GET|PUT|DELETE /profile`, `POST /profile/avatar`, `POST /profile/password`, and `GET /dashboard`.
- Admin-only operations: `GET /admin/dashboard`, `/admin/users`, `/admin/restaurants`, `PUT|DELETE /admin/restaurants/{id}/sponsorship`, `GET /admin/place-reports`, `PATCH /admin/place-reports/{id}`, `GET /admin/osm-place-blocks`, `DELETE /admin/osm-place-blocks/{type}:{id}`, `/admin/categories`, `/admin/food-notes`, and paginated/searchable `/admin/audit-logs?page=1&per_page=50&q=…`.

User-generated public Food Notes enter `pending` moderation. Private notes remain visible to their owner; share-link notes require a high-entropy token. Restaurant submissions from members enter `pending` moderation. Ratings, prices, opening hours and photos remain unset unless a user/admin supplies them or a source explicitly provides them.

OSM cards, map popups, favorites and random picks open an in-app detail page. The OSM detail API resolves a place by source type/ID and coordinates, prefers the local HCMC snapshot when available, and identifies unverified data. Published public Food Notes and nearby alternatives are shown without inventing missing price, opening-hour or review data. Place reports require an account; one pending report per user/place is accepted. An admin may resolve or dismiss a report and, after verification, hide the place. Hidden OSM IDs are filtered from discovery and can be restored in the admin restaurant view. OSM copyright attribution remains on the map.

`PATCH /food-notes/{id}/flags` changes only pinned/favorite state and does not restart moderation. Updating public content does restart moderation. Creating a new share link rotates the token and invalidates the previous link; deleting sharing makes the note private. Note and media deletions remove their private upload files. Browser navigation through email-verification links returns to the login page; API clients requesting JSON still receive the JSON response.

Sponsorship records contain a schedule and manual agreement reference. The public `sponsored` flag is true only for active, in-window placements on published restaurants. No online payment or billing integration is present.

## Security and operations

Passwords use Argon2id when PHP provides it, otherwise PHP's password-hashing default. Session IDs rotate at login and password change; changing or resetting a password invalidates other existing sessions. Cookies are HttpOnly and SameSite Lax. Mutations use session-bound CSRF tokens, same-origin validation, prepared SQL statements, bounded request sizes and per-IP rate limits. Admin bootstrap is CLI-only; user management cannot promote accounts. Audit entries omit raw IP addresses and retain only keyed hashes.

Uploads are MIME-sniffed, limited to JPEG/PNG/WEBP/GIF and MP4/WEBM, stored under randomized names outside the public web root, and served through an access-checked API endpoint. Food Note media is limited to 50 MB per file (`W2E_MAX_UPLOAD_BYTES=52428800`); PHP must allow `upload_max_filesize=50M` and `post_max_size=64M`. The project configures these for Apache PHP and CGI/FastCGI through `.htaccess` and `.user.ini`; hosting providers may require the same values in their PHP settings. Configure a working mail transport for PHP `mail()` before enabling registration; verification and password reset messages depend on it.

Use provider backups for MySQL and the private uploads directory. Keep both at a retention interval suitable for user data, and test recovery on the chosen host before opening registration.

Run `php api/bin/cleanup.php` as a scheduled maintenance command. It removes expired tokens and cache entries and reports unreferenced Food Note files older than one day. After reviewing a storage backup and the reported count, `php api/bin/cleanup.php --prune-orphan-media` removes those files.
