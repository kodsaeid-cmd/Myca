begin;

create or replace function public.submit_caregiver_application(
  p_actor uuid,
  p_application jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.caregiver_profiles%rowtype;
  v_skill jsonb;
  v_service public.services%rowtype;
  v_skill_count integer := 0;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = p_actor and role = 'family'
  ) then
    raise exception 'family_role_required' using errcode = '42501';
  end if;

  if coalesce(jsonb_typeof(p_application->'services'), '') <> 'array' then
    raise exception 'select_between_one_and_ten_services' using errcode = '22023';
  end if;
  if jsonb_array_length(p_application->'services') < 1
     or jsonb_array_length(p_application->'services') > 10 then
    raise exception 'select_between_one_and_ten_services' using errcode = '22023';
  end if;

  if nullif(trim(p_application->>'display_name'), '') is null
     or nullif(trim(p_application->>'city'), '') is null then
    raise exception 'display_name_and_city_required' using errcode = '22023';
  end if;

  select * into v_profile
  from public.caregiver_profiles
  where user_id = p_actor;

  if found and v_profile.review_status in ('verified', 'suspended') then
    raise exception 'caregiver_profile_cannot_be_reapplied' using errcode = '42501';
  end if;

  insert into public.caregiver_profiles (
    user_id, display_name, bio, city, province, experience_years,
    review_status, identity_verified_at, approved_at, approved_by
  ) values (
    p_actor,
    trim(p_application->>'display_name'),
    nullif(trim(p_application->>'bio'), ''),
    trim(p_application->>'city'),
    nullif(trim(p_application->>'province'), ''),
    nullif(p_application->>'experience_years', '')::numeric,
    'pending',
    null,
    null,
    null
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    bio = excluded.bio,
    city = excluded.city,
    province = excluded.province,
    experience_years = excluded.experience_years,
    review_status = 'pending',
    identity_verified_at = null,
    approved_at = null,
    approved_by = null,
    updated_at = now()
  returning * into v_profile;

  delete from public.caregiver_service_qualifications
  where caregiver_profile_id = v_profile.id;

  for v_skill in
    select value from jsonb_array_elements(p_application->'services')
  loop
    select * into v_service
    from public.services
    where category_id = v_skill->>'category_id'
      and slug = v_skill->>'service_slug'
      and active = true;

    if not found then
      raise exception 'service_not_available' using errcode = '22023';
    end if;

    if v_service.requires_professional_license then
      raise exception 'licensed_service_requires_professional_review' using errcode = '42501';
    end if;

    insert into public.caregiver_service_qualifications (
      caregiver_profile_id, category_id, service_slug,
      qualification_type, review_status
    ) values (
      v_profile.id, v_service.category_id, v_service.slug,
      'experience', 'pending'
    );

    v_skill_count := v_skill_count + 1;
  end loop;

  insert into public.user_roles (user_id, role)
  values (p_actor, 'caregiver_applicant')
  on conflict (user_id, role) do nothing;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor,
    'caregiver.application_submitted',
    'caregiver_profile',
    v_profile.id,
    jsonb_build_object('skills_count', v_skill_count, 'review_status', 'pending')
  );

  return jsonb_build_object(
    'id', v_profile.id,
    'review_status', v_profile.review_status,
    'skills_count', v_skill_count,
    'created_at', v_profile.created_at
  );
end;
$$;

revoke all on function public.submit_caregiver_application(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_caregiver_application(uuid, jsonb) to service_role;

commit;
