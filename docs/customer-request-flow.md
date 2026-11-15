# MYCA family request journey

## Scope implemented

- Five-step Persian RTL request preparation: service, care needs, schedule, contact/location, review.
- Entry points from service categories, urgent request CTA, home page and elderly/child pricing catalogs.
- Package-aware estimate in the UI using the published commission table.
- Local draft list, explicit sign-in step and server submission from the request dashboard.
- Request dashboard reads authenticated server requests and keeps local drafts visible until they are submitted.

## Request submission

A family can prepare a draft without an account. To submit it to MYCA:
1. Save the draft in the current browser tab.
2. Open `/requests` and choose “ارسال درخواست به سامانه مایکا”.
3. Sign in with the verified phone number if prompted.
4. Submit the draft; the server validates the service, schedule, phone, package and pricing snapshot before creating a request.

The request API uses the authenticated Supabase user ID and phone. The phone entered in the form must match the verified account phone. Successful submissions receive a server-generated MYCA reference and an initial status. Licensed-healthcare services enter triage rather than being automatically matched.

Local drafts are still stored in the current tab's `sessionStorage`. They are not server backups and may be lost when the tab/session is cleared. Do not use this mechanism for production PII or sensitive health data.

## Data boundaries

The repository now contains the Supabase schema and server API, but no Supabase project credentials have been configured in the deployment environment. OTP, database persistence and server request submission remain unavailable until the project is provisioned, the migration is applied, and environment variables are set.

The UI and API:
- Do not show fabricated caregiver profiles, ratings, verification or availability.
- Do not claim a caregiver has been reserved or a contract accepted.
- Do not accept or simulate payment.
- Do not expose the Supabase service-role key to the browser.
- Do not allow a user to grant themselves a staff, verified-caregiver or licensed-provider role.
- Route services requiring professional authorization to an initial review status.

## Price estimate rules

- Package monthly wage and commission rates are sourced from Elder Pricing 02 and pedia PDFs.
- One-time commission = adjusted monthly wage × commission percentage for selected term.
- Estimated total = adjusted monthly wage × contract months + one-time commission.
- 24-hour shift adds 35% to monthly wage.
- Each additional child adds 25% to monthly wage for child-care packages.
- Friday attendance is disclosed but excluded from the estimate because the source does not define its exact numeric calculation base.
- Unpriced or custom services require an official quote; no invented amount is displayed.
- The browser estimate is indicative only. The request API recalculates the price snapshot on the server before persistence.

## Remaining production integration

1. Provision Supabase, apply migrations, configure Phone Auth and an SMS provider.
2. Configure deployment environment variables and run authenticated smoke tests.
3. Build caregiver application, document upload, qualification review and approval workflows.
4. Build matching and availability logic; only verified caregivers or appropriately licensed providers may be offered.
5. Build CRM operator queues, case assignment, escalation and full status-transition controls.
6. Build official quote, contract versioning, e-signature and invoice workflows.
7. Integrate payment gateway callbacks, reconciliation, refund and receipts.
8. Build active-service scheduling, attendance, reports, messages, complaints, quality review and renewals.

All monetary calculations must be revalidated server-side before quote or payment.
