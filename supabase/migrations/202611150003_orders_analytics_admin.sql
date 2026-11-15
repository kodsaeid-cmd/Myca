begin;

-- Orders in phase one are requests for a package/service, not paid contracts.
alter table public.care_requests
  add column if not exists payment_method text not null default 'phone_coordination',
  add column if not exists payment_status text not null default 'awaiting_contact',
  add column if not exists paid_amount_rial bigint,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_confirmed_by uuid references public.profiles(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'care_requests_payment_method_check'
      and conrelid = 'public.care_requests'::regclass
  ) then
    alter table public.care_requests
      add constraint care_requests_payment_method_check
      check (payment_method in ('phone_coordination'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'care_requests_payment_status_check'
      and conrelid = 'public.care_requests'::regclass
  ) then
    alter table public.care_requests
      add constraint care_requests_payment_status_check
      check (payment_status in ('awaiting_contact', 'awaiting_payment', 'paid', 'failed', 'refunded', 'not_required'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'care_requests_paid_amount_check'
      and conrelid = 'public.care_requests'::regclass
  ) then
    alter table public.care_requests
      add constraint care_requests_paid_amount_check
      check (paid_amount_rial is null or paid_amount_rial >= 0);
  end if;
end $$;

-- Backfill profiles for accounts that existed before the auth trigger was installed.
insert into public.profiles (id, phone)
select id, phone from auth.users
on conflict (id) do nothing;

-- Existing accounts without any assigned role are treated as customer accounts.
insert into public.user_roles (user_id, role)
select p.id, 'family'
from public.profiles p
where not exists (
  select 1 from public.user_roles ur where ur.user_id = p.id
)
on conflict (user_id, role) do nothing;

create index if not exists care_requests_payment_status_created_idx
  on public.care_requests (payment_status, created_at desc);

create or replace function public.myca_sync_customer_profile_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set full_name = coalesce(nullif(trim(new.requester_name), ''), full_name),
      phone = coalesce(nullif(trim(new.requester_phone), ''), phone),
      updated_at = now()
  where id = new.requester_id;

  return new;
end;
$$;

drop trigger if exists care_requests_sync_customer_profile on public.care_requests;
create trigger care_requests_sync_customer_profile
after insert on public.care_requests
for each row execute function public.myca_sync_customer_profile_from_order();

-- First-party, privacy-minimized web analytics. No IP address or raw user-agent is stored.
create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null check (length(visitor_id) between 8 and 80),
  session_id text not null check (length(session_id) between 8 and 80),
  event_type text not null check (event_type in ('page_view', 'phone_click', 'cta_click', 'button_click', 'link_click')),
  event_name text,
  path text not null check (left(path, 1) = '/' and length(path) <= 300),
  referrer text,
  utm_source text,
  created_at timestamptz not null default now()
);

create index if not exists site_events_type_created_idx
  on public.site_events (event_type, created_at desc);
create index if not exists site_events_path_created_idx
  on public.site_events (path, created_at desc);
create index if not exists site_events_visitor_created_idx
  on public.site_events (visitor_id, created_at desc);
create index if not exists site_events_session_created_idx
  on public.site_events (session_id, created_at desc);

alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;
grant all on public.site_events to service_role;

create or replace function public.myca_admin_update_order(
  p_actor uuid,
  p_request_id uuid,
  p_status text,
  p_payment_status text,
  p_paid_amount_rial bigint,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.care_requests%rowtype;
  v_updated public.care_requests%rowtype;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 1000), '');
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = p_actor and role in ('admin', 'operator', 'support_office')
  ) then
    raise exception 'staff_access_required' using errcode = '42501';
  end if;

  if p_status is not null and p_status not in (
    'submitted', 'triage', 'matching', 'offered', 'accepted', 'quoted',
    'contract_pending', 'confirmed', 'in_service', 'completed', 'cancelled', 'rejected'
  ) then
    raise exception 'invalid_order_status' using errcode = '22023';
  end if;

  if p_payment_status is not null and p_payment_status not in (
    'awaiting_contact', 'awaiting_payment', 'paid', 'failed', 'refunded', 'not_required'
  ) then
    raise exception 'invalid_payment_status' using errcode = '22023';
  end if;

  select * into v_order
  from public.care_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if p_payment_status = 'paid'
     and coalesce(p_paid_amount_rial, v_order.paid_amount_rial, 0) <= 0 then
    raise exception 'paid_amount_required' using errcode = '22023';
  end if;

  update public.care_requests
  set status = coalesce(p_status, status),
      payment_status = coalesce(p_payment_status, payment_status),
      paid_amount_rial = case
        when p_payment_status = 'paid' then coalesce(p_paid_amount_rial, paid_amount_rial)
        else paid_amount_rial
      end,
      paid_at = case
        when p_payment_status = 'paid' and payment_status <> 'paid' then now()
        else paid_at
      end,
      payment_confirmed_by = case
        when p_payment_status = 'paid' then p_actor
        else payment_confirmed_by
      end,
      updated_at = now()
  where id = p_request_id
  returning * into v_updated;

  if v_order.status is distinct from v_updated.status then
    insert into public.care_request_events (
      request_id, from_status, to_status, event_type, actor_id, note, metadata
    ) values (
      v_order.id, v_order.status, v_updated.status, 'admin_status_changed',
      p_actor, v_note, jsonb_build_object('source', 'admin_panel')
    );
  end if;

  if v_order.payment_status is distinct from v_updated.payment_status
     or v_order.paid_amount_rial is distinct from v_updated.paid_amount_rial then
    insert into public.care_request_events (
      request_id, from_status, to_status, event_type, actor_id, note, metadata
    ) values (
      v_order.id, v_updated.status, v_updated.status, 'payment_status_changed',
      p_actor, v_note,
      jsonb_build_object(
        'from_payment_status', v_order.payment_status,
        'to_payment_status', v_updated.payment_status,
        'paid_amount_rial', v_updated.paid_amount_rial
      )
    );
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor, 'care_request.admin_updated', 'care_request', v_order.id,
    jsonb_build_object(
      'status', v_updated.status,
      'payment_status', v_updated.payment_status,
      'paid_amount_rial', v_updated.paid_amount_rial
    )
  );

  return jsonb_build_object(
    'id', v_updated.id,
    'reference', v_updated.reference,
    'status', v_updated.status,
    'payment_status', v_updated.payment_status,
    'paid_amount_rial', v_updated.paid_amount_rial,
    'updated_at', v_updated.updated_at
  );
end;
$$;

revoke all on function public.myca_admin_update_order(uuid, uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.myca_admin_update_order(uuid, uuid, text, text, bigint, text) to service_role;

create or replace function public.myca_admin_dashboard_stats(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats jsonb;
  v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Tehran') at time zone 'Asia/Tehran';
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = p_actor and role in ('admin', 'operator', 'support_office')
  ) then
    raise exception 'staff_access_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'orders_total', (select count(*)::integer from public.care_requests),
    'orders_today', (select count(*)::integer from public.care_requests where created_at >= v_today),
    'customers_total', (select count(distinct requester_id)::integer from public.care_requests),
    'pending_contact', (select count(*)::integer from public.care_requests where payment_status = 'awaiting_contact'),
    'awaiting_payment', (select count(*)::integer from public.care_requests where payment_status = 'awaiting_payment'),
    'paid_orders', (select count(*)::integer from public.care_requests where payment_status = 'paid'),
    'paid_revenue_rial', (select coalesce(sum(paid_amount_rial), 0)::bigint from public.care_requests where payment_status = 'paid'),
    'page_views_total', (select count(*)::integer from public.site_events where event_type = 'page_view'),
    'page_views_today', (select count(*)::integer from public.site_events where event_type = 'page_view' and created_at >= v_today),
    'phone_clicks_total', (select count(*)::integer from public.site_events where event_type = 'phone_click'),
    'phone_clicks_today', (select count(*)::integer from public.site_events where event_type = 'phone_click' and created_at >= v_today),
    'cta_clicks_total', (select count(*)::integer from public.site_events where event_type = 'cta_click'),
    'button_clicks_total', (select count(*)::integer from public.site_events where event_type = 'button_click'),
    'link_clicks_total', (select count(*)::integer from public.site_events where event_type = 'link_click'),
    'unique_visitors_total', (select count(distinct visitor_id)::integer from public.site_events),
    'sessions_total', (select count(distinct session_id)::integer from public.site_events),
    'package_orders', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'package_id', package_sales.package_id,
            'package_title', package_sales.package_title,
            'orders', package_sales.orders
          ) order by package_sales.orders desc
        ),
        '[]'::jsonb
      )
      from (
        select
          pricing_snapshot->>'package_id' as package_id,
          coalesce(pricing_snapshot->>'package_title', pricing_snapshot->>'package_id') as package_title,
          count(*)::integer as orders
        from public.care_requests
        where nullif(pricing_snapshot->>'package_id', '') is not null
        group by pricing_snapshot->>'package_id', pricing_snapshot->>'package_title'
      ) package_sales
    ),
    'top_pages', (
      select coalesce(
        jsonb_agg(jsonb_build_object('path', page.path, 'views', page.views) order by page.views desc),
        '[]'::jsonb
      )
      from (
        select path, count(*)::integer as views
        from public.site_events
        where event_type = 'page_view'
        group by path
        order by count(*) desc
        limit 8
      ) page
    )
  ) into v_stats;

  return v_stats;
end;
$$;

revoke all on function public.myca_admin_dashboard_stats(uuid) from public, anon, authenticated;
grant execute on function public.myca_admin_dashboard_stats(uuid) to service_role;

commit;
