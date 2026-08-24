-- Verifiable guardian approval and restricted teacher onboarding.
-- Student self-declarations are intentionally not treated as guardian consent.

alter table public.profiles
  add column if not exists guardian_email text,
  add column if not exists teacher_verification_status text not null default 'not_required';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_teacher_verification_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_teacher_verification_status_check
      check (teacher_verification_status in ('not_required', 'pending', 'verified', 'rejected'));
  end if;
end;
$$;

update public.profiles
set teacher_verification_status = case when role = 'teacher' then 'pending' else 'not_required' end
where teacher_verification_status = 'not_required';

create or replace function public.apply_role_safeguards()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    new.teacher_verification_status := case when new.role = 'teacher' then 'pending' else 'not_required' end;
    if new.role = 'student' then
      new.guardian_consent_at := null;
      new.onboarding_completed := false;
    else
      new.guardian_email := null;
      new.guardian_consent_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_profiles_role_safeguards on public.profiles;
create trigger apply_profiles_role_safeguards
before update of role on public.profiles
for each row execute function public.apply_role_safeguards();

create table if not exists public.guardian_consent_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  guardian_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (guardian_email = lower(trim(guardian_email)))
);

create index if not exists guardian_consent_requests_guardian_email_idx
  on public.guardian_consent_requests (guardian_email, status, requested_at desc);

create table if not exists public.student_guardians (
  student_id uuid not null references public.profiles(id) on delete cascade,
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  consent_request_id uuid not null references public.guardian_consent_requests(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (student_id, guardian_id)
);

-- Previous MVP consent was only a student's checkbox. It is not carried forward
-- as verified guardian approval.
update public.profiles
set guardian_consent_at = null, onboarding_completed = false, updated_at = now()
where role = 'student'
  and not exists (
    select 1 from public.student_guardians g where g.student_id = profiles.id
  );

alter table public.guardian_consent_requests enable row level security;
alter table public.student_guardians enable row level security;
revoke all on public.guardian_consent_requests from anon, authenticated;
revoke all on public.student_guardians from anon, authenticated;

create or replace function public.request_guardian_consent(requested_guardian_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_email text := lower(trim(requested_guardian_email));
  student_email text;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid guardian email';
  end if;

  select email into student_email
  from public.profiles
  where id = current_user_id and role = 'student';

  if not found then raise exception 'student profile required'; end if;
  if lower(student_email) = normalized_email then raise exception 'guardian email must be different'; end if;

  insert into public.guardian_consent_requests (student_id, guardian_email)
  values (current_user_id, normalized_email)
  on conflict (student_id) do update
    set guardian_email = excluded.guardian_email,
        status = 'pending',
        requested_at = now(),
        reviewed_at = null,
        reviewed_by = null,
        expires_at = now() + interval '30 days';

  update public.profiles
  set guardian_email = normalized_email,
      guardian_consent_at = null,
      onboarding_completed = false,
      updated_at = now()
  where id = current_user_id;
end;
$$;

create or replace function public.get_guardian_requests()
returns table (
  request_id uuid,
  student_id uuid,
  student_display_name text,
  student_email text,
  requested_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
begin
  select lower(email) into current_email
  from public.profiles
  where id = (select auth.uid()) and role = 'parent';
  if not found then raise exception 'parent profile required'; end if;

  return query
  select r.id, r.student_id, p.display_name, p.email, r.requested_at, r.expires_at
  from public.guardian_consent_requests r
  join public.profiles p on p.id = r.student_id
  where r.guardian_email = current_email
    and r.status = 'pending'
    and r.expires_at > now()
  order by r.requested_at desc;
end;
$$;

create or replace function public.get_my_guardian_consent_status()
returns table (
  guardian_email text,
  request_status text,
  requested_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student') then
    raise exception 'student profile required';
  end if;
  return query
  select r.guardian_email, r.status, r.requested_at, r.expires_at
  from public.guardian_consent_requests r
  where r.student_id = (select auth.uid())
  limit 1;
end;
$$;

create or replace function public.get_linked_children()
returns table (
  student_id uuid,
  student_display_name text,
  student_email text,
  linked_at timestamptz
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
  select g.student_id, p.display_name, p.email, g.created_at
  from public.student_guardians g
  join public.profiles p on p.id = g.student_id
  where g.guardian_id = (select auth.uid())
  order by g.created_at desc;
end;
$$;

create or replace function public.approve_guardian_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_id uuid := (select auth.uid());
  parent_email text;
  target_student_id uuid;
  target_guardian_email text;
begin
  select lower(email) into parent_email
  from public.profiles
  where id = parent_id and role = 'parent';
  if not found then raise exception 'parent profile required'; end if;

  select student_id, guardian_email
  into target_student_id, target_guardian_email
  from public.guardian_consent_requests
  where id = target_request_id and status = 'pending' and expires_at > now()
  for update;

  if not found then raise exception 'active request not found'; end if;
  if target_guardian_email <> parent_email then raise exception 'request belongs to another guardian'; end if;

  update public.guardian_consent_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = parent_id
  where id = target_request_id;

  insert into public.student_guardians (student_id, guardian_id, consent_request_id)
  values (target_student_id, parent_id, target_request_id)
  on conflict (student_id, guardian_id) do nothing;

  update public.profiles
  set guardian_consent_at = now(), onboarding_completed = true, updated_at = now()
  where id = target_student_id and role = 'student';
end;
$$;

create or replace function public.reject_guardian_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_id uuid := (select auth.uid());
  parent_email text;
begin
  select lower(email) into parent_email
  from public.profiles
  where id = parent_id and role = 'parent';
  if not found then raise exception 'parent profile required'; end if;

  update public.guardian_consent_requests
  set status = 'rejected', reviewed_at = now(), reviewed_by = parent_id
  where id = target_request_id and guardian_email = parent_email and status = 'pending';
  if not found then raise exception 'active request not found'; end if;
end;
$$;

create or replace function public.set_teacher_verification(target_teacher_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  if next_status not in ('pending', 'verified', 'rejected') then raise exception 'invalid status'; end if;
  update public.profiles
  set teacher_verification_status = next_status, updated_at = now()
  where id = target_teacher_id and role = 'teacher';
  if not found then raise exception 'teacher profile not found'; end if;
end;
$$;

revoke all on function public.request_guardian_consent(text) from public;
revoke all on function public.get_guardian_requests() from public;
revoke all on function public.get_my_guardian_consent_status() from public;
revoke all on function public.get_linked_children() from public;
revoke all on function public.approve_guardian_request(uuid) from public;
revoke all on function public.reject_guardian_request(uuid) from public;
revoke all on function public.set_teacher_verification(uuid, text) from public;
grant execute on function public.request_guardian_consent(text) to authenticated;
grant execute on function public.get_guardian_requests() to authenticated;
grant execute on function public.get_my_guardian_consent_status() to authenticated;
grant execute on function public.get_linked_children() to authenticated;
grant execute on function public.approve_guardian_request(uuid) to authenticated;
grant execute on function public.reject_guardian_request(uuid) to authenticated;
grant execute on function public.set_teacher_verification(uuid, text) to authenticated;

-- Include guardian and teacher safeguards when Auth creates a new profile.
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
  if selected_role not in ('student', 'parent', 'teacher') then selected_role := 'student'; end if;
  if selected_name is not null then selected_name := left(selected_name, 80); end if;
  if requested_guardian_email = '' or requested_guardian_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    requested_guardian_email := null;
  end if;

  insert into public.profiles (
    id, email, display_name, role, guardian_email, guardian_consent_at,
    onboarding_completed, teacher_verification_status,
    terms_accepted_at, privacy_acknowledged_at, legal_version
  ) values (
    new.id,
    coalesce(new.email, new.id::text || '@missing.local'),
    selected_name,
    selected_role,
    case when selected_role = 'student' then requested_guardian_email else null end,
    null,
    selected_role in ('parent', 'teacher'),
    case when selected_role = 'teacher' then 'pending' else 'not_required' end,
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted then accepted_version else null end
  ) on conflict (id) do nothing;

  if selected_role = 'student' and requested_guardian_email is not null
     and lower(coalesce(new.email, '')) <> requested_guardian_email then
    insert into public.guardian_consent_requests (student_id, guardian_email)
    values (new.id, requested_guardian_email)
    on conflict (student_id) do update
      set guardian_email = excluded.guardian_email,
          status = 'pending', requested_at = now(), reviewed_at = null,
          reviewed_by = null, expires_at = now() + interval '30 days';
  end if;
  return new;
end;
$$;
