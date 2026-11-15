# MYCA — ParsPack Preview Deployment

This branch prepares the MYCA Next.js UI for static hosting on the existing ParsPack cPanel account, with PHP 8.3 API endpoints.

## Deployment target

- Preview host: `myca-test.dandoonii.ir`
- Web server: Apache/cPanel
- PHP: 8.3 (requires cURL and mbstring)
- Frontend: Next.js 15 static export
- API: PHP 8.3 router under `/api/*`
- Auth/data: existing Supabase project (PostgreSQL + Supabase Auth + PostgREST)
- No changes to the existing magazine/shop document roots.

The current MYCA backend is already defined by the Supabase migrations in `supabase/migrations`. This deployment does not move the data model into cPanel MySQL. PHP calls the Supabase Auth and REST APIs from the server so the service-role secret never reaches the browser.

## Build

GitHub Actions builds the static site and packages a ZIP artifact. The archive contains:

- `public/`: static website output, including `.htaccess` and `api/index.php`
- `private/config.example.php`: template for the server-only Supabase credentials

## cPanel setup

1. Create the subdomain `myca-test.dandoonii.ir` with a new, empty document root. Do not point it at the magazine or shop folders.
2. Set the subdomain to PHP 8.3. Confirm `curl` and `mbstring` extensions are enabled.
3. Upload the ZIP contents so `public/` is the subdomain document root. Keep `private/` outside the document root.
4. Copy `private/config.example.php` to `private/config.php` and fill in the existing Supabase URL, anon/publishable key, and service-role secret.
5. Apply Supabase migrations in order: `202611150001_core_backend.sql`, `202611150002_caregiver_application.sql`, then `202611150003_orders_analytics_admin.sql`.
6. Add the DNS A record for `myca-test` to the ParsPack origin IPv4 `89.44.243.4` in Cloudflare. Do not point the record to a Cloudflare proxy IP. Keep the record DNS-only during initial SSL issuance; enable proxy only after HTTPS is confirmed if desired.
7. Issue/enable AutoSSL for the subdomain and verify `https://myca-test.dandoonii.ir/api/health`.

## Important

- This is a test deployment; `robots.txt` blocks indexing.
- Never put the service-role key in `public/`, source code, or Git.
- The first-phase payment method remains phone coordination; there is no online payment gateway.
- The existing `mycablog.dandoonii.ir` and shop roots must remain untouched.
