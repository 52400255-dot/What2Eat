# What2Eat

What2Eat is a Vietnamese food-discovery and food-journaling website. Its page views are PHP templates in `index.php`, `pages/*.php` and `admin/*.php`; CSS and JavaScript provide styling and interaction, with Leaflet for maps. The production API is PHP 8.1+ with MySQL 8 or compatible MariaDB. The map uses live OpenStreetMap data and does not require a Google Maps API key. Business data comes from OpenStreetMap or actual user/admin submissions.

## Implemented features

- Nearby food-place discovery, map markers, in-app place details, saved places, nearby alternatives and random selection. OSM attribution remains visible; place actions stay on What2Eat.
- Email-verified accounts, login/logout, password reset, profile and avatar upload.
- Food Notes with server drafts, local recovery of unsent text, private/public/link sharing, tags, personal ratings, images and videos.
- Food Plans with invitation links, OSM place proposals, member voting and closing a poll.
- Admin tools for accounts, categories, restaurant records and Food Note moderation, plus audit history.
- Member reports for closed, moved or inaccurate places; admin review can hide a place from discovery and later restore an OSM place.
- Admin-managed, time-limited sponsored placements for published restaurants, always labeled "Tài trợ" in discovery, map popups and restaurant details. Agreements and payments are handled outside this version of the site.
- Server-side role checks, CSRF protection, prepared SQL, rate limits, private uploads and moderation states.

The database is intentionally empty after migration. Public restaurants on the map are queried from OpenStreetMap; submitted or admin-entered records are stored only after a person provides them. The site does not seed sample users, venues, reviews, ratings, prices or analytics. Missing source data is shown as missing.

For local PHP development, set `W2E_ENV=development` and `W2E_BASE_URL` to the local site origin. Verification and password-reset messages are captured in `storage/dev-mail.log`; the `storage/` directory is blocked from web access. Open the matching link from that file in the browser. Do not use development mode on a public site.

Admin address lookup uses a single user-triggered OpenStreetMap Nominatim request, caches results for 30 days and serializes uncached requests to one per second. The admin UI displays attribution and requires the result to be checked before saving. Configure `W2E_NOMINATIM_URL` to switch to a compatible service or a self-hosted instance.

## Local preview

Run `node server.js` and open `http://127.0.0.1:4173/`. This lightweight preview serves the frontend and proxies the live OSM map requests. It does not run the PHP account, Food Note, Food Plan or admin API; those features need PHP and MySQL as described in [`api/README.md`](api/README.md).

## Production setup

1. Use an HTTPS domain and PHP 8.1+ with `pdo_mysql`, `curl`, `fileinfo`, `mbstring`, `json` and sessions, plus MySQL 8 or compatible MariaDB.
2. Configure the Apache document root to this directory and enable rewrite and headers modules. The provided `.htaccess` routes API and map tile requests.
3. Copy `.env.example` to `.env` on the server, then enter the actual site URL, strong app secret, database credentials, sender address and support email. Keep the file private and out of version control.
4. Create an empty database, then run `php api/bin/migrate.php` from this directory. Run it again when updating an existing installation to add the sponsorship table.
5. Create the first admin from a trusted terminal with `W2E_ADMIN_PASSWORD` set to a one-time password, then run `php api/bin/create-admin.php admin@example.com`. Clear that temporary password afterward.
6. Configure the host's mail transport and HTTPS, allow PHP to write to `storage/uploads`, then check `/api/v1/health`.

The host must provide persistent MySQL and upload storage, outbound HTTPS for OSM and a working PHP `mail()` transport for account verification and password resets. OSM's community endpoints and tile providers can throttle or become temporarily unavailable; the API tries alternate Overpass servers and serves recent cached results when available.

## Sponsored placements

An administrator can open **Admin → Quản lý Quán ăn → Tài trợ** for a published restaurant with coordinates. Enter the sponsoring business, an internal agreement reference and the UTC-backed start/end schedule, then activate the placement. The public API marks a restaurant as sponsored only while that schedule is active; the interface labels the placement "Tài trợ". Pausing it removes the label and placement priority immediately. This is a manual agreement workflow, not a payment gateway or a claim that a payment was received.

Run the isolated integration checks with `node tests/integration.mjs`. They require local PHP and MySQL CLI binaries and permission to create/drop a temporary database. On non-XAMPP systems set `W2E_TEST_PHP`, `W2E_TEST_MYSQL`, `W2E_TEST_DB_USER`, `W2E_TEST_DB_PASSWORD` and `W2E_TEST_DB_PORT` as needed. The script creates its own temporary database and deletes it after testing.

## Build the HCMC OSM food-place snapshot

The PBF import tool creates source-linked CSV, GeoJSON, summaries and a quality report from a Geofabrik Vietnam extract. It uses the current Ho Chi Minh City admin boundary contained in that extract. It does not claim that an OSM venue is still open; all rows start as `unverified`, and possible nearby duplicates are reported for review.

1. Download `vietnam-latest.osm.pbf` from [Geofabrik Vietnam](https://download.geofabrik.de/asia/vietnam.html) into `storage/imports/osm/`.
2. With Python 3.12, install `requirements-osm-import.txt` into the ignored import directory:

   ```powershell
   python -m pip install --target storage/imports/osm/vendor -r requirements-osm-import.txt
   ```

3. Find the current HCMC `admin_level=4` relation in the extract, then build the dataset:

   ```powershell
   python scripts/build_hcm_food_dataset.py --list-boundaries
   python scripts/build_hcm_food_dataset.py --boundary-relation RELATION_ID
   ```

The generated files go to `storage/datasets/hcm-osm-food/`. Review `data_quality_report.md` and `sources_and_license.md` before importing or redistributing the data. OSM-derived data must retain attribution and comply with the [ODbL](https://www.openstreetmap.org/copyright).

See [`database_design.md`](database_design.md) for the original database design and [`api/README.md`](api/README.md) for environment, endpoints and operations.
