# MYCA

Replica of the public MYCA web experience and first-phase package-order flow.

## Product and deployment architecture

- Next.js 15 App Router + React 19, Persian RTL.
- Canonical development branch: `main`.
- ParsPack shared-hosting preview branch: `parspack-preview`.
- Preview frontend: Next.js static export, generated in GitHub Actions.
- Preview API: PHP 8.3/PHP-FPM + PDO/MySQL on ParsPack cPanel.
- Database: a dedicated MySQL schema for MYCA orders, separate from the existing magazine and shop databases.
- No Node.js runtime, SSH or SFTP is required on the ParsPack host.

## Phase-one customer flow

1. The customer chooses a package and submits their name, mobile, service and scheduling details.
2. A customer profile is created automatically using the normalized mobile number.
3. Every order receives a unique `MYCA-YYYYMM-XXXXXX` tracking reference.
4. The customer tracks that order using its reference plus the same mobile number.
5. MYCA staff manage order/payment status in `/admin/`.
6. Payment remains by phone coordination; no online payment gateway is enabled.

Customer OTP login is intentionally not enabled on the preview because an SMS provider has not yet been configured. For privacy, the site does not expose every order associated with a phone number; each order requires its own tracking reference and phone.

## Admin and analytics

- First administrator: `/admin/setup/` (one-time setup token from private server config).
- Admin login: `/admin/login/`.
- Admin dashboard: `/admin/`.
- Analytics: page views, phone clicks, CTA clicks, button clicks, link clicks, unique visitors, sessions and top pages.
- Admin passwords are hashed; sessions use Secure/HttpOnly cookies and CSRF checks.

## ParsPack preview

See [docs/parspack-preview.md](docs/parspack-preview.md).

The GitHub Actions workflow builds the static site, validates PHP syntax and produces a ZIP containing:
- `public/`: static pages, assets, Apache `.htaccess`, PHP API router and noindex robots.txt.
- `private/config.example.php`: private MySQL/session configuration template.
- `database/schema.sql`: dedicated MySQL schema and initial service catalog.

The intended test host is `myca-test.dandoonii.ir`. Existing magazine and shop document roots are not modified.

## Local development

```bash
npm install
npm run dev
```

## Reference

The public site at https://mycaapp.com is the visual/behavioral reference for the replica. The supplied MYCA Design Language v1.0 is the canonical design-system reference.
