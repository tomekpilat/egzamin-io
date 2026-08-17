-- Public user profiles and role authorization for egzaminio.
-- Supabase Auth remains the identity source; this table contains product roles only.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'student'
    check (role in ('student', 'parent', 'teacher', 'admin')),
  guardian_consent_at timestamptz,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (display_name is null or char_length(display_name) between 2 and 80),
  check (role <> 'student' or onboarding_completed = false or guardian_consent_at is not null)
);

create unique index if not exists profiles_email_idx
  on public.profiles (lower(email));

create index if not exists profiles_role_idx
  on public.profiles (role, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_egzaminio_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'student');
  guardian_confirmed boolean := coalesce(
    (new.raw_user_meta_data ->> 'guardian_consent_confirmed') = 'true',
    false
  );
  selected_name text := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'display_name',
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name'
      )
    ),
    ''
  );
begin
  if selected_role not in ('student', 'parent', 'teacher') then
    selected_role := 'student';
  end if;

  if selected_name is not null then
    selected_name := left(selected_name, 80);
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    guardian_consent_at,
    onboarding_completed
  ) values (
    new.id,
    coalesce(new.email, new.id::text || '@missing.local'),
    selected_name,
    selected_role,
    case
      when selected_role = 'student' and guardian_confirmed then now()
      else null
    end,
    selected_role in ('parent', 'teacher')
      or (selected_role = 'student' and guardian_confirmed)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_egzaminio_user_created on auth.users;
create trigger on_egzaminio_user_created
after insert on auth.users
for each row execute function public.handle_new_egzaminio_user();

create or replace function public.is_egzaminio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_egzaminio_admin() from public;
grant execute on function public.is_egzaminio_admin() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select to authenticated
using ((select public.is_egzaminio_admin()));

drop policy if exists "Users can complete their profile" on public.profiles;
create policy "Users can complete their profile"
on public.profiles for update to authenticated
using (
  (select auth.uid()) = id
  and role in ('student', 'parent', 'teacher')
)
with check (
  (select auth.uid()) = id
  and role in ('student', 'parent', 'teacher')
);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update to authenticated
using ((select public.is_egzaminio_admin()))
with check ((select public.is_egzaminio_admin()));

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

-- Existing Auth users created before this migration receive a safe student profile.
insert into public.profiles (id, email, display_name, role, onboarding_completed)
select
  users.id,
  coalesce(users.email, users.id::text || '@missing.local'),
  nullif(
    trim(
      coalesce(
        users.raw_user_meta_data ->> 'display_name',
        users.raw_user_meta_data ->> 'full_name',
        users.raw_user_meta_data ->> 'name'
      )
    ),
    ''
  ),
  'student',
  false
from auth.users as users
on conflict (id) do nothing;
