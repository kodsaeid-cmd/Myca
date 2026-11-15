# MYCA

A faithful, independently implemented replica of the public MYCA web experience.

## Stack

- Next.js 15 App Router
- React 19 + TypeScript
- Persian-first RTL interface
- CSS-based replica styling, with a mobile-first 448px content rail
- Lucide icons and original publicly accessible MYCA image assets

## Implemented in the first pass

- Homepage hero, service discovery cards, search suggestions, consultation and request cards
- Shared sticky header and bottom navigation
- Slide-out navigation drawer
- Service-location dialog with search suggestions, manual address editing and current-location permission flow
- Public service categories: elderly care, child care, patient care, home services, corporate services, specialist care
- Elder-independent and infant-nurse service detail pages
- Receiver, provider, collaborator, recruitment-partner and support-office login shells
- Catalog list and web page viewers, with PDF download routes redirected to the original public catalog PDFs

## Development

```bash
npm install
npm run dev
```

## Reference and implementation notes

The live public website at https://mycaapp.com is the visual and behavioral reference for the public-page replica. Publicly visible copy, navigation, interactions and image assets are being recreated; private server-side behavior and authenticated data are not copied.

The supplied `MYCA_DESIGN_LANGUAGE_v1.0` document remains the canonical design-system reference for future product surfaces. Where the live public website visibly differs, this replica follows the live site for public-page fidelity and records the difference for later reconciliation.

See [docs/replica-audit.md](docs/replica-audit.md) for inspected routes, interaction notes and remaining gaps.

## Status

Phase 1 public shell and first public routes are committed. The authentication and request flows are UI-only until the appropriate backend endpoints are provided.
