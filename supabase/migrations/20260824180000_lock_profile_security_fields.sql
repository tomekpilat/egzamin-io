-- Security-sensitive profile state must only change through audited RPCs.
-- This closes the legacy direct-update path used by the first onboarding MVP.

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
  if selected_role not in ('student', 'parent', 'teacher') then raise exception 'invalid role'; end if;

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
    if lower(current_email) = normalized_guardian_email then
      raise exception 'guardian email must be different';
    end if;

    update public.profiles
    set role = 'student',
        guardian_email = normalized_guardian_email,
        guardian_consent_at = null,
        onboarding_completed = false,
        teacher_verification_status = 'not_required',
        updated_at = now()
    where id = current_user_id;

    insert into public.guardian_consent_requests (student_id, guardian_email)
    values (current_user_id, normalized_guardian_email)
    on conflict (student_id) do update
      set guardian_email = excluded.guardian_email,
          status = 'pending',
          requested_at = now(),
          reviewed_at = null,
          reviewed_by = null,
          expires_at = now() + interval '30 days';
  else
    update public.profiles
    set role = selected_role,
        guardian_email = null,
        guardian_consent_at = null,
        onboarding_completed = true,
        teacher_verification_status = case when selected_role = 'teacher' then 'pending' else 'not_required' end,
        updated_at = now()
    where id = current_user_id;
  end if;
end;
$$;

revoke all on function public.complete_onboarding(text, text) from public;
grant execute on function public.complete_onboarding(text, text) to authenticated;

-- Authenticated users may edit presentation data only. Role, consent, legal
-- evidence and verification status are exclusively managed by SECURITY DEFINER
-- functions declared in the migrations.
revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
