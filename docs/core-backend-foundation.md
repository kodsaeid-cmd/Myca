# MYCA Core Backend — Foundation 1

## Architecture decision

The first backend foundation uses Supabase Auth + PostgreSQL/PostgREST, called only from Next.js server routes. The browser never receives the service-role key and does not write directly to the database.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only secret; never add it to a `NEXT_PUBLIC_*` variable.

Copy `.env.example` to `.env.local`, create a Supabase project, and apply the SQL migration in `supabase/migrations` using the Supabase SQL editor or migration tooling. Enable Phone Auth and configure an SMS provider in Supabase Auth before testing OTP. Supabase's phone OTP flow uses `POST /auth/v1/otp` and `POST /auth/v1/verify`; Supabase enforces its configured OTP/SMS rate limits.

## Implemented in this slice

- Server-only Supabase REST/Auth adapter with no browser SDK or service key exposure.
- Phone OTP request and verification endpoints.
- HttpOnly, Secure-in-production, SameSite=Lax session cookies; access and refresh tokens are not returned to JavaScript.
- Session lookup/refresh and logout endpoints.
- Family request create/list API, with ownership checked against the verified Supabase user.
- Atomic database RPC for request creation, initial status event and audit entry.
- Caregiver application API for non-medical service skills; application submission atomically creates a pending profile, pending qualifications, the limited `caregiver_applicant` role and an audit record.
- Provider application screen with an explicit pending-review state; the login flow offers the application path to a phone-verified family account.
- PostgreSQL schema for profiles, roles, service catalog, caregiver verification, professional qualifications, provider organizations, availability, requests, matching, quotes, contracts, payments, active service sessions, support, communications, quality reviews and audit history.
- RLS enabled for all business tables. Authenticated clients receive read-only grants; writes are mediated by server routes/service-role functions.
- Public service catalog seeded from the existing MYCA route catalog. Services marked as licensed healthcare are explicitly separated from non-medical care.

## Source-aligned operational rules

The MYCA network policy describes a traceable case lifecycle: request intake, needs assessment, categorization, service type, eligible provider selection, introduction, confirmation, contract, service start, monitoring, support, evaluation, and renewal/closure. The schema records request events, matches, quotes, contracts, service sessions, support and quality reviews so that these records can be implemented as auditable workflows.

The policy distinguishes non-medical care from clinical/therapeutic services. A caregiver without the relevant professional authorization must not be matched to a service requiring a professional license. The service catalog therefore stores `requires_professional_license`; the initial seed marks patient nursing, psychology, laboratory, physiotherapy and specialist-doctor services as licensed-provider services. This classification must be reviewed by MYCA's legal/clinical owner before production.

The policy also requires case records, communications, price/contract changes, complaints, payments and outcomes to be traceable in the central system. The schema includes the relevant audit/event and CRM records. The older policy document names 1527 as the call-center number; current MYCA project instructions designate 41124 as the official public contact number, so product UI should continue using 41124.

The final product direction remains a direct two-sided platform. The data model supports individual caregivers and independently licensed provider organizations as supply-side entities; it does not make a local franchise or representative mandatory for every request.

## Important data boundaries

- New phone-verified accounts receive the `family` role by database trigger. No client endpoint can assign staff, provider or caregiver roles.
- A family user may submit a non-medical caregiver application. This grants only `caregiver_applicant`, never `caregiver` or `licensed_provider`.
- Identity-document upload, credential review, approval/rejection tools and staff role provisioning are not implemented yet. An applicant must not be considered matchable.
- The initial caregiver application excludes services requiring a professional license. Those require a separate licensed-provider workflow and verified credentials.
- Clinical service requests enter `triage` and carry a professional-licensing requirement; they are not automatically matched.
- Future matching must require a verified caregiver profile, verified identity, an approved qualification for the exact service and valid availability. Licensed services additionally require a verified professional license or a verified licensed provider organization.
- Price snapshots are intended to be computed and validated server-side. Friday attendance remains a manual quote item until the source pricing rules define its exact numeric basis.
- Payment, e-signature, live caregiver matching, SMS vendor configuration, private document upload and operational staff provisioning are not activated by this migration alone.
- Do not put diagnoses, identity numbers, payment card data or other highly sensitive information in free-text notes. Store required sensitive documents only in a private object-storage bucket with a controlled upload flow.
- All production data access must remain server-side until the access policies and UI flows have been security-tested.

## Deployment checklist

1. Create a Supabase project in the intended production region and configure database backups.
2. Configure Phone Auth, SMS provider, OTP template and allowed redirect/site URLs.
3. Apply the migration and verify all tables, triggers, functions and RLS policies.
4. Add the three environment variables to the Vercel project (Production, Preview and Development as appropriate).
5. Provision the first admin through a trusted server-side SQL operation; never expose role assignment to public signup.
6. Run OTP request/verify, session refresh/logout and request create/list smoke tests.
7. Review clinical-service classifications and caregiver qualification requirements with the responsible legal/clinical owner.
8. Configure private storage, retention, monitoring, alerting and a documented incident-response process before collecting real caregiver documents or sensitive health data.

## API contract

### `POST /api/auth/otp/request`
Body: `{ "phone": "09..." }`. Returns a generic acknowledgement. Requires Supabase Phone Auth and an SMS provider.

### `POST /api/auth/otp/verify`
Body: `{ "phone": "09...", "token": "123456" }`. On success, writes HttpOnly session cookies and returns the user's roles (never the tokens).

### `GET /api/auth/session`
Returns `{ authenticated, user, roles }`; refreshes cookies if the access token expired and a refresh token is present.

### `POST /api/auth/logout`
Revokes the current Supabase session when possible and clears the cookies.

### `GET /api/requests`
Returns only requests owned by the authenticated family account.

### `POST /api/requests`
Creates a request for a verified family account. The request service, service classification and package pricing are validated server-side; the caller cannot set the initial status or provider assignment.

### `GET /api/health`
Reports whether the app is running and whether the Supabase backend is configured/reachable. It does not expose secrets or database error details.
