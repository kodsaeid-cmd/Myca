begin;

create sequence if not exists public.myca_care_request_reference_seq;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  full_name text,
  avatar_path text,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in (
    'family', 'caregiver_applicant', 'caregiver', 'licensed_provider',
    'network_partner', 'recruitment_partner', 'support_office',
    'operator', 'admin', 'quality', 'legal'
  )),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.myca_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.myca_handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do update
    set phone = excluded.phone, updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'family')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists myca_auth_user_created on auth.users;
create trigger myca_auth_user_created
after insert or update of phone on auth.users
for each row execute function public.myca_handle_auth_user();

create or replace function public.myca_has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = p_role
  );
$$;

create or replace function public.myca_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('operator', 'admin', 'quality', 'legal', 'support_office')
  );
$$;

create table public.service_categories (
  id text primary key,
  slug text not null unique,
  title text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  category_id text not null references public.service_categories(id),
  slug text not null,
  title text not null,
  description text,
  delivery_class text not null check (delivery_class in (
    'non_medical', 'home_service', 'corporate_service', 'licensed_healthcare'
  )),
  requires_professional_license boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category_id, slug),
  check (
    (delivery_class = 'licensed_healthcare' and requires_professional_license = true)
    or delivery_class <> 'licensed_healthcare'
  )
);

insert into public.service_categories (id, slug, title, sort_order) values
  ('11', 'elderly-care', 'مراقبت از سالمند', 10),
  ('12', 'child-care', 'مراقبت از کودک', 20),
  ('13', 'patient-care', 'پرستاری و مراقبت بیمار', 30),
  ('14', 'home-services', 'امور منزل', 40),
  ('17', 'corporate-services', 'مشاوره و همراهی', 50),
  ('32', 'specialist-care', 'مراقبت ویژه', 60),
  ('22', 'independent-elderly', 'سالمند مستقل', 70),
  ('27', 'infant-care', 'پرستار نوزاد', 80)
on conflict (id) do update set slug = excluded.slug, title = excluded.title, sort_order = excluded.sort_order;

insert into public.services
  (category_id, slug, title, description, delivery_class, requires_professional_license)
values
  ('11', 'independent', 'سالمند مستقل', 'همراهی برای سالمند مستقل در منزل', 'non_medical', false),
  ('11', 'semi-dependent', 'سالمند نیمه‌وابسته', 'مراقبت متناسب با نیاز نیمه‌وابسته', 'non_medical', false),
  ('11', 'dependent', 'سالمند وابسته', 'مراقبت و همراهی در منزل', 'non_medical', false),
  ('12', 'infant-nurse', 'پرستار نوزاد', 'مراقبت غیرپزشکی از نوزاد تا دو سالگی', 'non_medical', false),
  ('12', 'mother-companion', 'مادریار', 'همراهی غیرپزشکی مادر در دوره پس از زایمان', 'non_medical', false),
  ('12', 'child-care', 'کودکیار', 'نگهداری و همراهی کودک در منزل', 'non_medical', false),
  ('12', 'psychologist', 'روانشناس', 'خدمت تخصصی روانشناسی توسط فرد واجد صلاحیت', 'licensed_healthcare', true),
  ('12', 'child-care-package', 'پکیج مراقبت کودک', 'پکیج‌های مراقبت کودک و مادر', 'non_medical', false),
  ('13', 'nursing-assistant', 'کمک‌بهیار', 'خدمت مراقبتی/پرستاری متناسب با صلاحیت حرفه‌ای', 'licensed_healthcare', true),
  ('13', 'hourly-nurse', 'نرس ساعتی', 'خدمت پرستاری توسط ارائه‌دهنده واجد صلاحیت', 'licensed_healthcare', true),
  ('13', 'one-time-nurse', 'نرس موردی', 'خدمت پرستاری موردی توسط ارائه‌دهنده واجد صلاحیت', 'licensed_healthcare', true),
  ('13', 'hospital-companion', 'همراه بیمار در بیمارستان', 'همراهی و مراقبت غیرپزشکی در بیمارستان', 'non_medical', false),
  ('14', 'home-cleaning', 'نظافت منزل', 'خدمات نظافت منزل', 'home_service', false),
  ('14', 'cooking-home', 'آشپزی و امور منزل', 'آشپزی و امور روزانه در منزل', 'home_service', false),
  ('14', 'home-cook', 'آشپزی در منزل', 'آشپزی در منزل', 'home_service', false),
  ('17', 'pantry', 'آبدارچی', 'خدمات آبدارخانه برای شرکت‌ها', 'corporate_service', false),
  ('17', 'office-cleaning', 'نظافت شرکت', 'خدمات نظافت محیط کار', 'corporate_service', false),
  ('32', 'laboratory', 'آزمایشگاه', 'خدمت آزمایشگاهی توسط مرکز دارای مجوز', 'licensed_healthcare', true),
  ('32', 'physiotherapy', 'فیزیوتراپی', 'خدمت فیزیوتراپی توسط درمانگر واجد صلاحیت', 'licensed_healthcare', true),
  ('32', 'specialist-doctor', 'پزشک متخصص', 'خدمت پزشکی توسط پزشک دارای مجوز', 'licensed_healthcare', true),
  ('22', 'daily', 'سالمند مستقل روزانه', 'همراهی و مراقبت روزانه', 'non_medical', false),
  ('22', 'night', 'سالمند مستقل شبانه', 'حضور و مراقبت شبانه', 'non_medical', false),
  ('22', '24h', 'سالمند مستقل شبانه‌روزی', 'مراقبت شبانه‌روزی در منزل', 'non_medical', false),
  ('27', 'daily', 'پرستار نوزاد روزانه', 'مراقبت روزانه از نوزاد', 'non_medical', false),
  ('27', 'night', 'پرستار نوزاد شبانه', 'مراقبت شبانه از نوزاد', 'non_medical', false),
  ('27', '24h', 'پرستار نوزاد شبانه‌روزی', 'مراقبت شبانه‌روزی از نوزاد', 'non_medical', false)
on conflict (category_id, slug) do update set
  title = excluded.title,
  description = excluded.description,
  delivery_class = excluded.delivery_class,
  requires_professional_license = excluded.requires_professional_license,
  active = true,
  updated_at = now();

create table public.caregiver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text,
  city text,
  province text,
  service_radius_km smallint not null default 20 check (service_radius_km between 1 and 250),
  experience_years numeric(4,1) check (experience_years is null or experience_years between 0 and 70),
  review_status text not null default 'draft' check (review_status in ('draft', 'pending', 'verified', 'rejected', 'suspended')),
  identity_verified_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caregiver_documents (
  id uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  document_type text not null check (document_type in (
    'identity', 'professional_license', 'training_certificate', 'resume', 'other'
  )),
  storage_path text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  expires_at date,
  review_note text,
  created_at timestamptz not null default now()
);

create table public.caregiver_service_qualifications (
  id uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  category_id text not null,
  service_slug text not null,
  qualification_type text not null check (qualification_type in ('experience', 'training', 'professional_license')),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'expired')),
  credential_document_id uuid references public.caregiver_documents(id),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  valid_until date,
  created_at timestamptz not null default now(),
  foreign key (category_id, service_slug) references public.services(category_id, slug),
  unique (caregiver_profile_id, category_id, service_slug, qualification_type)
);

create table public.caregiver_availability (
  id uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  timezone text not null default 'Asia/Tehran',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  unique (caregiver_profile_id, day_of_week, starts_at, ends_at)
);

create table public.provider_organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  registration_number text,
  professional_license_number text,
  license_status text not null default 'pending' check (license_status in ('pending', 'verified', 'rejected', 'expired')),
  operational_status text not null default 'pending' check (operational_status in ('pending', 'active', 'suspended', 'closed')),
  city text,
  province text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_organization_members (
  organization_id uuid not null references public.provider_organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'manager' check (member_role in ('owner', 'manager', 'dispatcher', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.provider_organization_services (
  organization_id uuid not null references public.provider_organizations(id) on delete cascade,
  category_id text not null,
  service_slug text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected', 'expired')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  primary key (organization_id, category_id, service_slug),
  foreign key (category_id, service_slug) references public.services(category_id, slug)
);

create table public.care_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'MYCA-' || to_char(now(), 'YYYYMM') || '-' ||
    lpad(nextval('public.myca_care_request_reference_seq')::text, 6, '0')
  ),
  requester_id uuid not null references public.profiles(id),
  requester_name text not null,
  requester_phone text not null,
  recipient_name text,
  recipient_age smallint check (recipient_age is null or recipient_age between 0 and 120),
  dependency_level text check (dependency_level is null or dependency_level in ('independent', 'semi_dependent', 'dependent')),
  children_count smallint not null default 1 check (children_count between 1 and 4),
  category_id text not null,
  service_slug text not null,
  delivery_class text not null check (delivery_class in (
    'non_medical', 'home_service', 'corporate_service', 'licensed_healthcare'
  )),
  requested_shift text not null check (requested_shift in (
    'روزانه', 'شبانه', 'شبانه‌روزی', 'ساعتی', 'موردی', 'جلسه‌ای', 'نیاز به هماهنگی'
  )),
  requested_start_at timestamptz not null,
  duration_months smallint check (duration_months is null or duration_months in (1, 2, 3, 4, 5, 6, 12)),
  friday_required boolean not null default false,
  is_urgent boolean not null default false,
  city text not null,
  province text,
  address_line text not null,
  postal_code text,
  notes text,
  pricing_snapshot jsonb,
  status text not null default 'submitted' check (status in (
    'submitted', 'triage', 'matching', 'offered', 'accepted', 'quoted',
    'contract_pending', 'confirmed', 'in_service', 'completed', 'cancelled', 'rejected'
  )),
  source text not null default 'web' check (source in ('web', 'mobile_app', 'call_center', 'operator', 'partner')),
  assigned_operator_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, service_slug) references public.services(category_id, slug)
);

create table public.care_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.care_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  event_type text not null,
  actor_id uuid references public.profiles(id),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.care_request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.care_requests(id) on delete cascade,
  candidate_type text not null check (candidate_type in ('caregiver', 'provider_organization')),
  caregiver_profile_id uuid references public.caregiver_profiles(id),
  provider_organization_id uuid references public.provider_organizations(id),
  match_score numeric(6,2),
  match_explanation jsonb not null default '{}'::jsonb,
  status text not null default 'suggested' check (status in ('suggested', 'offered', 'accepted', 'declined', 'expired', 'withdrawn')),
  offered_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (candidate_type = 'caregiver' and caregiver_profile_id is not null and provider_organization_id is null)
    or
    (candidate_type = 'provider_organization' and provider_organization_id is not null and caregiver_profile_id is null)
  )
);

create table public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.care_requests(id),
  version smallint not null default 1 check (version > 0),
  amount_rial bigint not null check (amount_rial >= 0),
  currency text not null default 'IRR' check (currency = 'IRR'),
  breakdown jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'issued', 'accepted', 'rejected', 'expired', 'superseded')),
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, version)
);

create table public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.care_requests(id),
  quote_id uuid references public.service_quotes(id),
  version smallint not null default 1 check (version > 0),
  status text not null default 'draft' check (status in (
    'draft', 'pending_signatures', 'active', 'completed', 'terminated', 'voided'
  )),
  terms_snapshot jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  family_signed_at timestamptz,
  provider_signed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, version)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.service_contracts(id),
  amount_rial bigint not null check (amount_rial > 0),
  currency text not null default 'IRR' check (currency = 'IRR'),
  provider text,
  provider_reference text,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_sessions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.service_contracts(id) on delete cascade,
  caregiver_profile_id uuid references public.caregiver_profiles(id),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled')),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (scheduled_start < scheduled_end)
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.care_requests(id),
  contract_id uuid references public.service_contracts(id),
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  category text not null check (category in ('support', 'complaint', 'safety', 'billing', 'caregiver_change', 'other')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_review', 'waiting', 'resolved', 'closed', 'referred')),
  subject text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check (request_id is not null or contract_id is not null)
);

create table public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.care_requests(id),
  contract_id uuid references public.service_contracts(id),
  ticket_id uuid references public.support_tickets(id),
  sender_id uuid references public.profiles(id),
  recipient_id uuid references public.profiles(id),
  channel text not null check (channel in ('in_app', 'call_center', 'sms', 'email', 'system')),
  body text not null,
  visible_to_customer boolean not null default true,
  created_at timestamptz not null default now(),
  check (request_id is not null or contract_id is not null or ticket_id is not null)
);

create table public.quality_reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.service_contracts(id),
  author_id uuid not null references public.profiles(id),
  subject_type text not null check (subject_type in ('caregiver', 'provider_organization', 'service')),
  subject_id uuid,
  rating smallint check (rating is null or rating between 1 and 5),
  nps smallint check (nps is null or nps between 0 and 10),
  comment text,
  created_at timestamptz not null default now(),
  check (rating is not null or nps is not null)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index care_requests_requester_created_idx on public.care_requests (requester_id, created_at desc);
create index care_requests_status_created_idx on public.care_requests (status, created_at desc);
create index care_requests_city_service_idx on public.care_requests (city, category_id, service_slug);
create index caregiver_profiles_status_city_idx on public.caregiver_profiles (review_status, city);
create index caregiver_qualifications_lookup_idx on public.caregiver_service_qualifications (category_id, service_slug, review_status);
create index care_request_matches_request_status_idx on public.care_request_matches (request_id, status);
create index support_tickets_status_priority_idx on public.support_tickets (status, priority, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.myca_set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.myca_set_updated_at();
create trigger caregiver_profiles_set_updated_at before update on public.caregiver_profiles
for each row execute function public.myca_set_updated_at();
create trigger provider_organizations_set_updated_at before update on public.provider_organizations
for each row execute function public.myca_set_updated_at();
create trigger care_requests_set_updated_at before update on public.care_requests
for each row execute function public.myca_set_updated_at();
create trigger service_contracts_set_updated_at before update on public.service_contracts
for each row execute function public.myca_set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.myca_set_updated_at();
create trigger support_tickets_set_updated_at before update on public.support_tickets
for each row execute function public.myca_set_updated_at();

create or replace function public.myca_can_access_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.care_requests r
      where r.id = p_request_id and r.requester_id = auth.uid()
    )
    or exists (
      select 1
      from public.care_request_matches m
      join public.caregiver_profiles cp on cp.id = m.caregiver_profile_id
      where m.request_id = p_request_id
        and cp.user_id = auth.uid()
        and m.status in ('offered', 'accepted')
    )
    or exists (
      select 1
      from public.care_request_matches m
      join public.provider_organization_members pom on pom.organization_id = m.provider_organization_id
      where m.request_id = p_request_id
        and pom.user_id = auth.uid()
        and pom.status = 'active'
        and m.status in ('offered', 'accepted')
    );
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.caregiver_profiles enable row level security;
alter table public.caregiver_documents enable row level security;
alter table public.caregiver_service_qualifications enable row level security;
alter table public.caregiver_availability enable row level security;
alter table public.provider_organizations enable row level security;
alter table public.provider_organization_members enable row level security;
alter table public.provider_organization_services enable row level security;
alter table public.care_requests enable row level security;
alter table public.care_request_events enable row level security;
alter table public.care_request_matches enable row level security;
alter table public.service_quotes enable row level security;
alter table public.service_contracts enable row level security;
alter table public.payments enable row level security;
alter table public.service_sessions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_events enable row level security;
alter table public.communications enable row level security;
alter table public.quality_reviews enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_self_or_staff on public.profiles
for select to authenticated using (id = auth.uid() or public.myca_is_staff());
create policy roles_read_self_or_staff on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.myca_is_staff());
create policy categories_read_active on public.service_categories
for select to anon, authenticated using (active = true);
create policy services_read_active on public.services
for select to anon, authenticated using (active = true);

create policy caregiver_profile_read_self_or_staff on public.caregiver_profiles
for select to authenticated using (user_id = auth.uid() or public.myca_is_staff());
create policy caregiver_documents_read_self_or_staff on public.caregiver_documents
for select to authenticated using (
  exists (select 1 from public.caregiver_profiles cp where cp.id = caregiver_profile_id and cp.user_id = auth.uid())
  or public.myca_is_staff()
);
create policy caregiver_qualifications_read_self_or_staff on public.caregiver_service_qualifications
for select to authenticated using (
  exists (select 1 from public.caregiver_profiles cp where cp.id = caregiver_profile_id and cp.user_id = auth.uid())
  or public.myca_is_staff()
);
create policy caregiver_availability_read_self_or_staff on public.caregiver_availability
for select to authenticated using (
  exists (select 1 from public.caregiver_profiles cp where cp.id = caregiver_profile_id and cp.user_id = auth.uid())
  or public.myca_is_staff()
);

create policy provider_organizations_read_members_or_staff on public.provider_organizations
for select to authenticated using (
  public.myca_is_staff()
  or exists (
    select 1 from public.provider_organization_members pom
    where pom.organization_id = id and pom.user_id = auth.uid() and pom.status = 'active'
  )
);
create policy provider_members_read_self_or_staff on public.provider_organization_members
for select to authenticated using (user_id = auth.uid() or public.myca_is_staff());
create policy provider_services_read_members_or_staff on public.provider_organization_services
for select to authenticated using (
  public.myca_is_staff()
  or exists (
    select 1 from public.provider_organization_members pom
    where pom.organization_id = organization_id and pom.user_id = auth.uid() and pom.status = 'active'
  )
);

create policy care_requests_read_participants on public.care_requests
for select to authenticated using (requester_id = auth.uid() or public.myca_is_staff() or public.myca_can_access_request(id));
create policy care_request_events_read_participants on public.care_request_events
for select to authenticated using (public.myca_is_staff() or public.myca_can_access_request(request_id));
create policy care_request_matches_read_offered on public.care_request_matches
for select to authenticated using (
  public.myca_is_staff()
  or (
    status in ('offered', 'accepted')
    and public.myca_can_access_request(request_id)
  )
);
create policy quotes_read_participants on public.service_quotes
for select to authenticated using (public.myca_is_staff() or public.myca_can_access_request(request_id));
create policy contracts_read_participants on public.service_contracts
for select to authenticated using (public.myca_is_staff() or public.myca_can_access_request(request_id));
create policy payments_read_participants on public.payments
for select to authenticated using (
  public.myca_is_staff()
  or exists (
    select 1 from public.service_contracts sc
    where sc.id = contract_id and public.myca_can_access_request(sc.request_id)
  )
);
create policy sessions_read_participants on public.service_sessions
for select to authenticated using (
  public.myca_is_staff()
  or exists (
    select 1 from public.service_contracts sc
    where sc.id = contract_id and public.myca_can_access_request(sc.request_id)
  )
);
create policy support_tickets_read_creator_or_staff on public.support_tickets
for select to authenticated using (
  created_by = auth.uid()
  or public.myca_is_staff()
  or (request_id is not null and public.myca_can_access_request(request_id))
  or (contract_id is not null and exists (
    select 1 from public.service_contracts sc
    where sc.id = contract_id and public.myca_can_access_request(sc.request_id)
  ))
);
create policy support_ticket_events_read_creator_or_staff on public.support_ticket_events
for select to authenticated using (
  public.myca_is_staff()
  or exists (
    select 1 from public.support_tickets st
    where st.id = ticket_id and (
      st.created_by = auth.uid()
      or (st.request_id is not null and public.myca_can_access_request(st.request_id))
      or (st.contract_id is not null and exists (
        select 1 from public.service_contracts sc
        where sc.id = st.contract_id and public.myca_can_access_request(sc.request_id)
      ))
    )
  )
);
create policy communications_read_participants on public.communications
for select to authenticated using (
  public.myca_is_staff()
  or sender_id = auth.uid()
  or recipient_id = auth.uid()
  or (request_id is not null and public.myca_can_access_request(request_id))
  or (contract_id is not null and exists (
    select 1 from public.service_contracts sc
    where sc.id = contract_id and public.myca_can_access_request(sc.request_id)
  ))
  or (ticket_id is not null and exists (
    select 1 from public.support_tickets st
    where st.id = ticket_id and st.created_by = auth.uid()
  ))
);
create policy quality_reviews_read_author_or_staff on public.quality_reviews
for select to authenticated using (author_id = auth.uid() or public.myca_is_staff());
create policy audit_logs_read_control_functions on public.audit_logs
for select to authenticated using (
  public.myca_has_role('admin')
  or public.myca_has_role('legal')
);

grant usage on schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from anon, authenticated;
grant select on public.service_categories, public.services to anon, authenticated;
grant select on
  public.profiles, public.user_roles,
  public.caregiver_profiles, public.caregiver_documents,
  public.caregiver_service_qualifications, public.caregiver_availability,
  public.provider_organizations, public.provider_organization_members,
  public.provider_organization_services,
  public.care_requests, public.care_request_events, public.care_request_matches,
  public.service_quotes, public.service_contracts, public.payments, public.service_sessions,
  public.support_tickets, public.support_ticket_events, public.communications,
  public.quality_reviews, public.audit_logs
to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.myca_has_role(text) to authenticated;
grant execute on function public.myca_is_staff() to authenticated;
grant execute on function public.myca_can_access_request(uuid) to authenticated;

create or replace function public.create_care_request(p_request jsonb, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_request public.care_requests%rowtype;
  v_initial_status text;
  v_event_type text;
begin
  if not exists (
    select 1 from public.user_roles where user_id = p_actor and role = 'family'
  ) then
    raise exception 'family_role_required' using errcode = '42501';
  end if;

  select * into v_service
  from public.services
  where category_id = p_request->>'category_id'
    and slug = p_request->>'service_slug'
    and active = true;

  if not found then
    raise exception 'service_not_available' using errcode = '22023';
  end if;

  v_initial_status := case
    when v_service.requires_professional_license then 'triage'
    else 'submitted'
  end;
  v_event_type := case
    when v_service.requires_professional_license then 'licensed_provider_review_required'
    else 'request_submitted'
  end;

  insert into public.care_requests (
    requester_id, requester_name, requester_phone,
    recipient_name, recipient_age, dependency_level, children_count,
    category_id, service_slug, delivery_class, requested_shift,
    requested_start_at, duration_months, friday_required, is_urgent,
    city, province, address_line, postal_code, notes, pricing_snapshot,
    status, source
  ) values (
    p_actor,
    p_request->>'requester_name',
    p_request->>'requester_phone',
    nullif(p_request->>'recipient_name', ''),
    nullif(p_request->>'recipient_age', '')::smallint,
    nullif(p_request->>'dependency_level', ''),
    coalesce(nullif(p_request->>'children_count', '')::smallint, 1),
    v_service.category_id,
    v_service.slug,
    v_service.delivery_class,
    p_request->>'requested_shift',
    (p_request->>'requested_start_at')::timestamptz,
    nullif(p_request->>'duration_months', '')::smallint,
    coalesce((p_request->>'friday_required')::boolean, false),
    coalesce((p_request->>'is_urgent')::boolean, false),
    p_request->>'city',
    nullif(p_request->>'province', ''),
    p_request->>'address_line',
    nullif(p_request->>'postal_code', ''),
    nullif(p_request->>'notes', ''),
    coalesce(p_request->'pricing_snapshot', 'null'::jsonb),
    v_initial_status,
    coalesce(nullif(p_request->>'source', ''), 'web')
  )
  returning * into v_request;

  insert into public.care_request_events (
    request_id, from_status, to_status, event_type, actor_id, metadata
  ) values (
    v_request.id, null, v_request.status, v_event_type, p_actor,
    jsonb_build_object(
      'delivery_class', v_service.delivery_class,
      'requires_professional_license', v_service.requires_professional_license
    )
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor, 'care_request.created', 'care_request', v_request.id,
    jsonb_build_object('reference', v_request.reference, 'source', v_request.source)
  );

  return jsonb_build_object(
    'id', v_request.id,
    'reference', v_request.reference,
    'status', v_request.status,
    'created_at', v_request.created_at,
    'delivery_class', v_request.delivery_class,
    'pricing_snapshot', v_request.pricing_snapshot
  );
end;
$$;

revoke all on function public.create_care_request(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_care_request(jsonb, uuid) to service_role;

commit;
