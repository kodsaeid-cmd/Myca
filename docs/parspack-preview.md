# MYCA Phase One — ParsPack cPanel deployment

## Target and boundaries

- Test host: `https://myca-test.dandoonii.ir`
- ParsPack shared Linux hosting, cPanel, PHP 8.3/PHP-FPM, MySQL, Apache
- Cloudflare manages DNS; ParsPack origin IPv4 is `89.44.243.4`
- Existing magazine and shop document roots remain untouched.
- No Node.js runtime, SSH, or SFTP is required on the host.

## Runtime architecture

- Next.js 15 is built in GitHub Actions as a static export.
- Apache serves the static files from the `public/` directory.
- Apache rewrites `/api/*` to the PHP 8.3 API router at `/api/index.php`.
- PHP uses PDO/MySQL for customers, orders, order history, admin sessions and analytics.
- The MySQL schema is a new dedicated database; it does not reuse the magazine CMS or shop tables.
- Customer profile is created automatically from the normalized mobile number when the first order is submitted. For privacy, each order is tracked with its unique reference plus the same mobile number. Customer OTP login is not enabled in this preview because no SMS provider has been configured.
- Payment method remains `phone_coordination`; no payment gateway is connected.

## Build package

GitHub Actions on branch `parspack-preview`:
1. Installs Node 22 and PHP 8.3 with PDO MySQL, cURL and mbstring.
2. Runs ESLint and PHP syntax validation.
3. Builds the Next.js static export.
4. Adds Apache `.htaccess`, PHP API and `robots.txt`.
5. Creates a ZIP artifact containing:
   - `public/`: static website + PHP API + Apache rules
   - `private/config.example.php`: template only; no real credentials
   - `database/schema.sql`: MySQL schema and service seed data

## cPanel setup

1. Create `myca-test.dandoonii.ir` with a new document root, for example `/home/mycabl/myca-test.dandoonii.ir/public`. Do not reuse `public_html`, `mycablog.dandoonii.ir` or the shop root.
2. Create a dedicated MySQL database and user in cPanel. Give the user all privileges on only this database.
3. Import `database/schema.sql` into the new database through phpMyAdmin.
4. Upload the package so the `public/` folder is the subdomain document root and `private/` is its sibling, outside the webroot.
5. Copy `private/config.example.php` to `private/config.php`. Fill in the new database name/user/password, a random one-time setup token (48+ characters), an independent session secret (64+ characters), and the exact test host. Do not commit or share this file.
6. Ensure PHP 8.3 has `pdo_mysql` and `mbstring` enabled. `curl` is not needed for the MySQL API.
7. In Cloudflare add an A record `myca-test` -> `89.44.243.4`. Keep it DNS-only during initial AutoSSL issuance; do not use a Cloudflare edge IP as origin.
8. Enable AutoSSL for `myca-test.dandoonii.ir`.
9. Verify `/api/health` returns `{"status":"ok","backend":"PHP/MySQL"}`.
10. Open `/admin/setup/` once, enter the private setup token and create the first admin username/password. After success, remove or rotate `setup_token` in the private config. Then use `/admin/login/`.
11. Test package order submission, generated reference, tracking by reference+phone, admin status changes, phone-coordinated payment confirmation and analytics.

## Privacy and security

- The config file and DB credentials are outside the public document root.
- Admin passwords are stored with PHP `password_hash`; admin sessions are Secure/HttpOnly/SameSite and have CSRF protection.
- Login failures are rate-limited by a keyed hash of the client IP; raw IP is not stored.
- Public tracking requires both the order reference and the mobile number used at submission.
- Internal admin notes are not returned by the public tracking endpoint.
- Analytics stores no IP address or raw user-agent.
- Test host is noindex via `robots.txt` and page metadata.

## Known phase-one limitations

- Customer OTP and password login are not active until an SMS/authentication provider is selected and configured.
- Customer profile is created in MySQL, but customer self-service order history is intentionally not exposed by phone number alone; each order is accessed using reference + phone.
- Online payment, invoicing, contracts, caregiver matching and service delivery operations are out of scope for this phase.
