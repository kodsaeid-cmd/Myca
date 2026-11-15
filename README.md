# MYCA

A faithful, independently implemented replica of the public MYCA web experience, with the first-phase package-order workflow.

## Product stack

- Next.js 15 App Router and React 19
- Persian-first RTL interface
- CSS-based replica styling and mobile-first 393px content rail
- Lucide icons and original publicly accessible MYCA image assets
- Supabase Auth + PostgreSQL/PostgREST for identity and transactional data

## Main capabilities in the current branch

- Public home, service categories, service details and package catalogs
- Customer OTP login and profile
- Package order submission with a unique MYCA tracking reference
- Customer order list and public order tracking by reference + verified phone
- Admin dashboard for order status, phone-coordinated payment status and paid amounts
- First-party analytics for page views, phone clicks, CTA clicks, button clicks and link clicks

## Deployment branches

- `main`: canonical Next.js application with server-side Next route handlers.
- `parspack-preview`: ParsPack-compatible static export plus PHP 8.3 API router. This branch is intended for a separate test subdomain and does not alter the existing magazine or shop document roots.

See [docs/parspack-preview.md](docs/parspack-preview.md) for the ParsPack package, configuration and deployment steps.

## Local development

```bash
npm install
npm run dev
```

## Reference

The live public website at https://mycaapp.com is the visual and behavioral reference for the public-page replica. The supplied MYCA Design Language v1.0 is the canonical design-system reference for product surfaces.
