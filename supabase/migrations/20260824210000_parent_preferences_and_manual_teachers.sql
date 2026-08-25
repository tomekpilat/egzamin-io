-- Parent controls and manual-only teacher provisioning.

create table if not exists public.guardian_preferences (
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  weekly_goal integer not null default 5 check (weekly_goal between 1 and 30),
  summary_email_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (guardian_id, student_id),
  foreign key (student_id, guardian_id)
    references public.student_guardians(student_id, guardian_id) on delete cascade
);

alter table public.guardian_preferences enable row level security;
revoke all on public.guardian_preferences from anon, authenticated;

drop function if exists public.get_linked_children();
create function public.get_linked_children()
returns table (
  student_id uuid,
  student_display_name text,
  student_email text,
  linked_at timestamptz,
  weekly_goal integer,
  summary_email_enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'parent') then
    raise exception 'parent profile required';
  end if;

  return query
  select g.student_id, p.display_name, p.email, g.created_at,
         coalesce(pref.weekly_goal, 5), coalesce(pref.summary_email_enabled, true)
  from public.student_guardians g
  join public.profiles p on p.id = g.student_id
  left join public.guardian_preferences pref
    on pref.student_id = g.student_id and pref.guardian_id = g.guardian_id
  where g.guardian_id = (select auth.uid())
  order by g.created_at desc;
end;
$$;

create or replace function public.update_guardian_preferences(
  target_student_id uuid,
  next_weekly_goal integer,
  next_summary_email_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_id uuid := (select auth.uid());
begin
  if next_weekly_goal not between 1 and 30 then raise exception 'weekly goal must be between 1 and 30'; end if;
  if not exists (
    select 1 from public.student_guardians
    where guardian_id = parent_id and student_id = target_student_id
  ) then
    raise exception 'linked child required';
  end if;

  insert into public.guardian_preferences (
    guardian_id, student_id, weekly_goal, summary_email_enabled, updated_at
  ) values (
    parent_id, target_student_id, next_weekly_goal, next_summary_email_enabled, now()
  )
  on conflict (guardian_id, student_id) do update
    set weekly_goal = excluded.weekly_goal,
        summary_email_enabled = excluded.summary_email_enabled,
        updated_at = now();
end;
$$;

-- Self-service onboarding is limited to students and parents.
create or replace function public.complete_onboarding(
  selected_role text,
  requested_guardian_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  onboarding_done boolean;
  normalized_guardian_email text := lower(trim(coalesce(requested_guardian_email, '')));
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if selected_role not in ('student', 'parent') then raise exception 'self-service role not allowed'; end if;

  select email, onboarding_completed
  into current_email, onboarding_done
  from public.profiles
  where id = current_user_id
  for update;

  if not found then raise exception 'profile not found'; end if;
  if onboarding_done then raise exception 'onboarding already completed'; end if;

  if selected_role = 'student' then
    if normalized_guardian_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'valid guardian email required';
    end if;
    if lower(current_email) = normalized_guardian_email then raise exception 'guardian email must be different'; end if;

    update public.profiles
    set role = 'student', guardian_email = normalized_guardian_email,
        guardian_consent_at = null, onboarding_completed = false,
        teacher_verification_status = 'not_required', updated_at = now()
    where id = current_user_id;

    insert into public.guardian_consent_requests (student_id, guardian_email)
    values (current_user_id, normalized_guardian_email)
    on conflict (student_id) do update
      set guardian_email = excluded.guardian_email, status = 'pending',
          requested_at = now(), reviewed_at = null, reviewed_by = null,
          expires_at = now() + interval '30 days';
  else
    update public.profiles
    set role = 'parent', guardian_email = null, guardian_consent_at = null,
        onboarding_completed = true, teacher_verification_status = 'not_required', updated_at = now()
    where id = current_user_id;
  end if;
end;
$$;

-- Called by an authenticated administrator after offline verification.
create or replace function public.grant_teacher_role(target_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;

  select id into target_id
  from public.profiles
  where lower(email) = lower(trim(target_email)) and role <> 'admin'
  for update;
  if not found then raise exception 'eligible profile not found'; end if;

  delete from public.student_guardians where student_id = target_id or guardian_id = target_id;
  delete from public.guardian_consent_requests where student_id = target_id;
  update public.profiles
  set role = 'teacher', onboarding_completed = true,
      guardian_email = null, guardian_consent_at = null, updated_at = now()
  where id = target_id;
  update public.profiles
  set teacher_verification_status = 'verified', updated_at = now()
  where id = target_id;

  return target_id;
end;
$$;

-- Auth metadata must never create a teacher account directly.
create or replace function public.handle_new_egzaminio_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'student');
  requested_guardian_email text := lower(trim(coalesce(new.raw_user_meta_data ->> 'guardian_email', '')));
  legal_accepted boolean := coalesce((new.raw_user_meta_data ->> 'legal_accepted') = 'true', false);
  accepted_version text := left(nullif(new.raw_user_meta_data ->> 'legal_version', ''), 64);
  selected_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), '');
begin
  if selected_role not in ('student', 'parent') then selected_role := 'student'; end if;
  if selected_name is not null then selected_name := left(selected_name, 80); end if;
  if requested_guardian_email = '' or requested_guardian_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    requested_guardian_email := null;
  end if;

  insert into public.profiles (
    id, email, display_name, role, guardian_email, guardian_consent_at,
    onboarding_completed, teacher_verification_status,
    terms_accepted_at, privacy_acknowledged_at, legal_version
  ) values (
    new.id, coalesce(new.email, new.id::text || '@missing.local'), selected_name,
    selected_role,
    case when selected_role = 'student' then requested_guardian_email else null end,
    null, selected_role = 'parent', 'not_required',
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted then accepted_version else null end
  ) on conflict (id) do nothing;

  if selected_role = 'student' and requested_guardian_email is not null
     and lower(coalesce(new.email, '')) <> requested_guardian_email then
    insert into public.guardian_consent_requests (student_id, guardian_email)
    values (new.id, requested_guardian_email)
    on conflict (student_id) do update
      set guardian_email = excluded.guardian_email, status = 'pending',
          requested_at = now(), reviewed_at = null, reviewed_by = null,
          expires_at = now() + interval '30 days';
  end if;
  return new;
end;
$$;

revoke all on function public.get_linked_children() from public;
revoke all on function public.update_guardian_preferences(uuid, integer, boolean) from public;
revoke all on function public.grant_teacher_role(text) from public;
grant execute on function public.get_linked_children() to authenticated;
grant execute on function public.update_guardian_preferences(uuid, integer, boolean) to authenticated;
grant execute on function public.grant_teacher_role(text) to authenticated;
