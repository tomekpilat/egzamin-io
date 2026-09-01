-- Keep Auth user creation independent from presentation-only metadata.
-- The profiles table accepts display names with 2-80 characters. Previously the
-- email form copied the local part of an address into display_name, so an address
-- such as a@example.com caused the Auth trigger to abort the whole signup.

create or replace function public.handle_new_egzaminio_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'student');
  normalized_user_email text := lower(trim(coalesce(new.email, new.id::text || '@missing.local')));
  requested_guardian_email text := lower(trim(coalesce(new.raw_user_meta_data ->> 'guardian_email', '')));
  legal_accepted boolean := coalesce((new.raw_user_meta_data ->> 'legal_accepted') = 'true', false);
  accepted_version text := left(nullif(trim(new.raw_user_meta_data ->> 'legal_version'), ''), 64);
  selected_name text := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  )), '');
begin
  if selected_role not in ('student', 'parent') then
    selected_role := 'student';
  end if;

  if selected_name is not null then
    selected_name := left(selected_name, 80);
    if char_length(selected_name) < 2 then
      selected_name := null;
    end if;
  end if;

  if requested_guardian_email = ''
     or requested_guardian_email = normalized_user_email
     or requested_guardian_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    requested_guardian_email := null;
  end if;

  insert into public.profiles (
    id, email, display_name, role, guardian_email, guardian_consent_at,
    onboarding_completed, teacher_verification_status,
    terms_accepted_at, privacy_acknowledged_at, legal_version
  ) values (
    new.id,
    normalized_user_email,
    selected_name,
    selected_role,
    case when selected_role = 'student' then requested_guardian_email else null end,
    null,
    selected_role = 'parent',
    'not_required',
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted then accepted_version else null end
  ) on conflict (id) do nothing;

  if selected_role = 'student' and requested_guardian_email is not null then
    insert into public.guardian_consent_requests (student_id, guardian_email)
    values (new.id, requested_guardian_email)
    on conflict (student_id) do update
      set guardian_email = excluded.guardian_email,
          status = 'pending',
          requested_at = now(),
          reviewed_at = null,
          reviewed_by = null,
          expires_at = now() + interval '30 days';
  end if;

  return new;
end;
$$;

drop trigger if exists on_egzaminio_user_created on auth.users;
create trigger on_egzaminio_user_created
after insert on auth.users
for each row execute function public.handle_new_egzaminio_user();
