-- Keep weekly e-mail reports disabled until the backlog feature has its own
-- consent, delivery, unsubscribe and monitoring flow. Expose only an aggregate
-- AI usage count to the linked parent; never expose message content.

alter table public.guardian_preferences
  alter column summary_email_enabled set default false;

update public.guardian_preferences
set summary_email_enabled = false,
    updated_at = now()
where summary_email_enabled;

create or replace function public.get_linked_children()
returns table (
  student_id uuid,
  student_display_name text,
  student_email text,
  linked_at timestamptz,
  weekly_goal integer,
  summary_email_enabled boolean,
  cke_accommodation_code text,
  cke_accommodation_label text,
  plan_tier text,
  plan_valid_until timestamptz
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
  select guardians.student_id, student.display_name, student.email, guardians.created_at,
         coalesce(preferences.weekly_goal, 5), false,
         accommodation.code, accommodation.label, student.plan_tier, student.plan_valid_until
  from public.student_guardians guardians
  join public.profiles student on student.id = guardians.student_id
  left join public.guardian_preferences preferences
    on preferences.student_id = guardians.student_id and preferences.guardian_id = guardians.guardian_id
  left join public.student_cke_preferences student_pref on student_pref.student_id = guardians.student_id
  join public.cke_accommodation_profiles accommodation
    on accommodation.code = coalesce(student_pref.accommodation_code, '100')
  where guardians.guardian_id = (select auth.uid())
  order by guardians.created_at desc;
end;
$$;

revoke all on function public.get_linked_children() from public;
grant execute on function public.get_linked_children() to authenticated;

create or replace function public.get_parent_child_ai_usage(
  target_student_id uuid,
  requested_range_days integer default 7
)
returns table (
  ai_questions_used integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parent_id uuid := (select auth.uid());
  range_start timestamptz;
begin
  if requested_range_days not in (0, 7, 30) then
    raise exception 'range must be 0, 7 or 30 days';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = parent_id and role = 'parent' and onboarding_completed
  ) then
    raise exception 'active parent profile required';
  end if;
  if not exists (
    select 1 from public.student_guardians
    where guardian_id = parent_id and student_id = target_student_id
  ) then
    raise exception 'linked child required';
  end if;

  range_start := case
    when requested_range_days = 0 then '-infinity'::timestamptz
    else now() - make_interval(days => requested_range_days)
  end;

  return query
  select count(*)::integer
  from public.ai_tutor_requests requests
  where requests.student_id = target_student_id
    and requests.status = 'completed'
    and requests.requested_at >= range_start;
end;
$$;

revoke all on function public.get_parent_child_ai_usage(uuid, integer) from public;
grant execute on function public.get_parent_child_ai_usage(uuid, integer) to authenticated;
