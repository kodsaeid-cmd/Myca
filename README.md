# MYCA

A faithful, independently implemented replica of the public MYCA web experience.

## Current implementation

- Next.js App Router + TypeScript
- Persian-first RTL interface
- Mobile-first app shell matching the live site's 448px desktop content rail
- Homepage hero, service discovery, live search suggestions, support/request cards
- Shared header, location editor, menu drawer and bottom navigation
- Dynamic service-category pages based on the public route structure

## Development

```bash
npm install
npm run dev
```

## Reference and implementation notes

The live public website at https://mycaapp.com is the visual and behavioral reference for this replica. Publicly visible text, navigation, interactions and image assets are being recreated; private server-side behavior and authenticated data are not copied.

The supplied `MYCA_DESIGN_LANGUAGE_v1.0` document remains the canonical design-system reference for future product surfaces. Where the live public website visibly differs, this replica follows the live site for public-page fidelity and records the difference for later reconciliation.

## Status

Phase 1: public shell, homepage and service discovery.
