-- Invite-only tutoring marketplace pilot. Access is granted per user by an administrator.

create table if not exists public.user_feature_flags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null check (feature_key in ('tutoring_marketplace')),
  enabled_at timestamptz not null default now(),
  enabled_by uuid references public.profiles(id) on delete set null,
  primary key (user_id, feature_key)
);

alter table public.user_feature_flags enable row level security;
revoke all on public.user_feature_flags from anon, authenticated;

create or replace function public.has_feature_access(requested_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (select auth.uid()) is null then false
    when requested_feature not in ('tutoring_marketplace') then false
    when (select public.is_egzaminio_admin()) then true
    else exists (
      select 1
      from public.user_feature_flags f
      where f.user_id = (select auth.uid())
        and f.feature_key = requested_feature
    )
  end;
$$;

create or replace function public.set_user_feature_access(
  target_email text,
  requested_feature text,
  next_enabled boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not (select public.is_egzaminio_admin()) then
    raise exception 'admin required';
  end if;
  if requested_feature not in ('tutoring_marketplace') then
    raise exception 'unknown feature';
  end if;

  select p.id into target_user_id
  from public.profiles p
  where lower(p.email) = lower(btrim(target_email));
  if not found then raise exception 'profile not found'; end if;

  if next_enabled then
    insert into public.user_feature_flags (user_id, feature_key, enabled_by)
    values (target_user_id, requested_feature, (select auth.uid()))
    on conflict (user_id, feature_key) do update
      set enabled_at = now(), enabled_by = excluded.enabled_by;
  else
    delete from public.user_feature_flags
    where user_id = target_user_id and feature_key = requested_feature;
  end if;

  return target_user_id;
end;
$$;

create table if not exists public.tutoring_pilot_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  account_role text not null check (account_role in ('student', 'parent', 'teacher')),
  subject text not null check (subject in ('mathematics', 'polish', 'english', 'other')),
  lesson_format text not null check (lesson_format in ('online', 'stationary', 'either')),
  city text check (city is null or char_length(city) between 2 and 100),
  description text not null check (char_length(description) between 20 and 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'matched', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_tutoring_pilot_applications_updated_at on public.tutoring_pilot_applications;
create trigger set_tutoring_pilot_applications_updated_at
before update on public.tutoring_pilot_applications
for each row execute function public.set_updated_at();

alter table public.tutoring_pilot_applications enable row level security;
revoke all on public.tutoring_pilot_applications from anon, authenticated;

create or replace function public.get_my_tutoring_pilot_application()
returns table (
  application_subject text,
  application_lesson_format text,
  application_city text,
  application_description text,
  application_status text,
  application_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (select public.has_feature_access('tutoring_marketplace')) then
    raise exception 'feature access required';
  end if;

  return query
  select a.subject, a.lesson_format, a.city, a.description, a.status, a.updated_at
  from public.tutoring_pilot_applications a
  where a.user_id = (select auth.uid());
end;
$$;

create or replace function public.upsert_tutoring_pilot_application(
  requested_subject text,
  requested_lesson_format text,
  requested_city text,
  requested_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_role text;
  normalized_city text := nullif(btrim(coalesce(requested_city, '')), '');
  normalized_description text := btrim(coalesce(requested_description, ''));
  application_id uuid;
begin
  if not (select public.has_feature_access('tutoring_marketplace')) then
    raise exception 'feature access required';
  end if;

  select p.role into current_role
  from public.profiles p
  where p.id = current_user_id and p.onboarding_completed;
  if not found or current_role not in ('student', 'parent', 'teacher') then
    raise exception 'eligible active profile required';
  end if;
  if requested_subject not in ('mathematics', 'polish', 'english', 'other') then
    raise exception 'invalid subject';
  end if;
  if requested_lesson_format not in ('online', 'stationary', 'either') then
    raise exception 'invalid lesson format';
  end if;
  if normalized_city is not null and char_length(normalized_city) not between 2 and 100 then
    raise exception 'city must contain 2 to 100 characters';
  end if;
  if char_length(normalized_description) not between 20 and 1000 then
    raise exception 'description must contain 20 to 1000 characters';
  end if;

  insert into public.tutoring_pilot_applications (
    user_id, account_role, subject, lesson_format, city, description, status
  ) values (
    current_user_id, current_role, requested_subject, requested_lesson_format,
    normalized_city, normalized_description, 'new'
  )
  on conflict (user_id) do update set
    account_role = excluded.account_role,
    subject = excluded.subject,
    lesson_format = excluded.lesson_format,
    city = excluded.city,
    description = excluded.description,
    status = 'new',
    updated_at = now()
  returning id into application_id;

  return application_id;
end;
$$;

create or replace function public.get_admin_tutoring_pilot_applications(requested_limit integer default 100)
returns table (
  application_id uuid,
  applicant_email text,
  applicant_display_name text,
  applicant_role text,
  application_subject text,
  application_lesson_format text,
  application_city text,
  application_description text,
  application_status text,
  application_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  if requested_limit not between 1 and 200 then raise exception 'limit must be between 1 and 200'; end if;

  return query
  select a.id, p.email, p.display_name, a.account_role, a.subject, a.lesson_format,
         a.city, a.description, a.status, a.updated_at
  from public.tutoring_pilot_applications a
  join public.profiles p on p.id = a.user_id
  order by case a.status when 'new' then 1 when 'contacted' then 2 when 'matched' then 3 else 4 end,
           a.updated_at desc
  limit requested_limit;
end;
$$;

revoke all on function public.has_feature_access(text) from public;
revoke all on function public.set_user_feature_access(text, text, boolean) from public;
revoke all on function public.get_my_tutoring_pilot_application() from public;
revoke all on function public.upsert_tutoring_pilot_application(text, text, text, text) from public;
revoke all on function public.get_admin_tutoring_pilot_applications(integer) from public;
grant execute on function public.has_feature_access(text) to authenticated;
grant execute on function public.set_user_feature_access(text, text, boolean) to authenticated;
grant execute on function public.get_my_tutoring_pilot_application() to authenticated;
grant execute on function public.upsert_tutoring_pilot_application(text, text, text, text) to authenticated;
grant execute on function public.get_admin_tutoring_pilot_applications(integer) to authenticated;
