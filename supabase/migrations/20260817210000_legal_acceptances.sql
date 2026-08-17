-- Versioned acceptance evidence for the legal documents displayed during signup.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists legal_version text;

create or replace function public.handle_new_egzaminio_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'student');
  guardian_confirmed boolean := coalesce((new.raw_user_meta_data ->> 'guardian_consent_confirmed') = 'true', false);
  legal_accepted boolean := coalesce((new.raw_user_meta_data ->> 'legal_accepted') = 'true', false);
  accepted_version text := left(nullif(new.raw_user_meta_data ->> 'legal_version', ''), 64);
  selected_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), '');
begin
  if selected_role not in ('student', 'parent', 'teacher') then selected_role := 'student'; end if;
  if selected_name is not null then selected_name := left(selected_name, 80); end if;

  insert into public.profiles (
    id, email, display_name, role, guardian_consent_at, onboarding_completed,
    terms_accepted_at, privacy_acknowledged_at, legal_version
  ) values (
    new.id,
    coalesce(new.email, new.id::text || '@missing.local'),
    selected_name,
    selected_role,
    case when selected_role = 'student' and guardian_confirmed then now() else null end,
    selected_role in ('parent', 'teacher') or (selected_role = 'student' and guardian_confirmed),
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted and accepted_version is not null then now() else null end,
    case when legal_accepted then accepted_version else null end
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.record_legal_acceptance(accepted_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  if accepted_version is null or char_length(accepted_version) < 8 or char_length(accepted_version) > 64 then
    raise exception 'invalid legal version';
  end if;
  update public.profiles
  set terms_accepted_at = now(), privacy_acknowledged_at = now(), legal_version = accepted_version, updated_at = now()
  where id = (select auth.uid());
  if not found then raise exception 'profile not found'; end if;
end;
$$;

revoke all on function public.record_legal_acceptance(text) from public;
grant execute on function public.record_legal_acceptance(text) to authenticated;

-- Legal timestamps can only be written through the database function above.
revoke update on public.profiles from authenticated;
grant update (display_name, role, guardian_consent_at, onboarding_completed, updated_at)
  on public.profiles to authenticated;

