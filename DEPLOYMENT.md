# What2Eat production launch checklist

This project is prepared locally, but Google Sign-In is not ready for a public domain until a real domain and PHP/MySQL host have been chosen. Do not put the development URL `what2eat.local` or `localhost` into production branding.

## Already prepared

- The public home page is `index.php`.
- The Terms and Privacy pages are `pages/terms.php` and `pages/privacy.php`.
- Google Identity Services sends an ID token to the same-origin PHP API. The API verifies the token before creating a session.
- Google Sign-In stores the Google subject, name, and email on the What2Eat account. It does not use a Google Client Secret or an OAuth redirect URI.
- The local Google OAuth client is configured for local development. Keep its localhost origin for local testing; do not substitute `what2eat.local` over plain HTTP.
- Google OAuth is currently in External / Testing mode. Only listed test users can sign in until the app is published.

## Information needed before deployment

- Purchased domain and chosen canonical hostname, for example `what2eat.vn` or `www.what2eat.vn`.
- PHP/MySQL host with a persistent database and persistent private upload storage.
- The actual hosting region, operator identity, support contact, and data retention/back-up periods, so the public Privacy page can describe real operations rather than assumptions.
- A working production mail sender for email verification and password recovery.

Do not send hosting passwords, database passwords, SMTP passwords, or one-time codes in chat. Enter secrets directly in the hosting provider's environment/secrets settings.

## Deployment steps after the domain is purchased

1. Point DNS to the chosen PHP host. Enable a valid TLS certificate, force HTTP to redirect to HTTPS, and select one canonical hostname. The production site must be publicly reachable before registering the OAuth branding links.
2. Choose PHP 8.1+ and MySQL 8 or MariaDB 10.4+ with the extensions and rewrite support listed in `api/README.md`. Configure persistent private upload storage; do not use an ephemeral filesystem for uploads or database data.
3. Deploy the project with its web root set to the project root. Keep `.env` and `storage/` inaccessible over HTTP. Configure production secrets directly on the host: `W2E_ENV=production`, `W2E_BASE_URL=https://<canonical-domain>`, database credentials, `W2E_APP_SECRET`, mail transport credentials, `W2E_SUPPORT_EMAIL`, and the production Google Web Client ID.
4. Apply the database migration on the production database, then verify `https://<canonical-domain>/api/v1/health` and `https://<canonical-domain>/api/v1/site-info`. The latter must return the same Google Client ID used by the login page. Do not copy the local database or local `.env` to production without reviewing their contents.
5. In Google Cloud Console, create a separate **Web application** OAuth Client for production. Add the exact origin `https://<canonical-domain>` under **Authorized JavaScript origins**. Add `https://www.<domain>` too only if the site intentionally serves that hostname. Origins contain only scheme, hostname, and optional port; do not add page paths. The current JavaScript callback flow needs no Authorized redirect URI and no Client Secret.
6. Set the production Client ID in the host's `W2E_GOOGLE_CLIENT_ID`, then test the login from the canonical HTTPS domain with a Google test account. Confirm that Google returns to the What2Eat callback, the API creates a session, and the user lands on the requested same-site page.
7. In **Google Auth Platform → Branding**, configure the app name, support email, app domain, homepage `https://<canonical-domain>/`, Privacy URL `https://<canonical-domain>/pages/privacy.php`, and Terms URL `https://<canonical-domain>/pages/terms.php`. Verify each URL opens publicly over HTTPS and the pages identify the real operator and support contact. Keep external sign-in limited to test users while validating.
8. Review **Audience** and **Data Access**. Publish the app only when it is ready for public use; submit verification if Google requests it for the final branding or scopes. The current sign-in integration is intended to use only basic identity information, not Gmail, Drive, or other Google API data.
9. Before public launch, replace the pre-launch notices in the Terms and Privacy pages with accurate operator, hosting, support, and retention details. Review the policies against the actual host, mail provider, backups, and Google Sign-In behavior. This checklist is operational guidance, not legal advice.

## Local verification

Use the origin already registered on the local OAuth client (currently `http://localhost:8000`) or update the local client to another valid `http://localhost[:port]` origin and browse the app at that exact origin. Plain `http://what2eat.local` is not the supported HTTP localhost exception. Keep local and production Client IDs separate.
