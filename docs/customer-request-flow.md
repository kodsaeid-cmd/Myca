# MYCA family request journey

## Scope implemented

- Five-step Persian RTL request preparation: service, care needs, schedule, contact/location, review.
- Entry points from service categories, urgent request CTA, home page and elderly/child pricing catalogs.
- Package-aware estimate for the two source-backed catalogs using their published commission table.
- Local draft list and a truthful empty state for active services.

## Data boundaries

This repository currently has no connected identity, caregiver inventory, matching, CRM, contract, payment gateway or operational service API. The UI therefore:
- Does not show fabricated caregiver profiles, ratings, verification or availability.
- Does not claim a request has been transmitted to MYCA.
- Does not claim a caregiver has been reserved or a contract accepted.
- Does not accept or simulate payment.
- Saves a user-consented draft in the current browser tab's sessionStorage only.

Do not use this local storage mechanism for production PII or sensitive health data. Replace it with authenticated server-side persistence before production.

## Price estimate rules

- Package monthly wage and commission rates are sourced from Elder Pricing 02 and pedia PDFs.
- One-time commission = adjusted monthly wage × commission percentage for selected term.
- Estimated total = adjusted monthly wage × contract months + one-time commission.
- 24-hour shift adds 35% to monthly wage.
- Each additional child adds 25% to monthly wage.
- Friday attendance is disclosed but excluded from the estimate because the source does not define an exact daily calculation base.
- Unpriced or custom services require an official quote; no invented amount is displayed.

## Production integration required

1. Authentication and consent: OTP, user profile, verified phone and role.
2. Request API: create/update/cancel request, attachments, audit trail and status history.
3. Versioned service catalog API: categories, packages, prices, terms and constraints.
4. Caregiver API: verified profile, credentials, service skills, coverage area and live availability.
5. Matching workflow: shortlisting, family choice, acceptance/decline, replacement and escalation.
6. Quote/contract: server-calculated quote, contract version, e-signature and invoice.
7. Payment: gateway intent, callback verification, reconciliation, refund and receipt.
8. Active service: attendance, reports, messages, support tickets, renewals and quality review.

All monetary calculations must move to the server and be revalidated before quote or payment.
