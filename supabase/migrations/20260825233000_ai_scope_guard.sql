-- Keep off-topic and prompt-injection attempts away from the paid model.

alter table public.ai_usage_daily
  add column if not exists scope_rejection_count integer not null default 0
    check (scope_rejection_count >= 0);

create or replace function public.record_ai_scope_rejection(requested_student_id uuid)
returns table (rejection_count integer, rejection_limit integer, blocked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_name text;
  limit_value integer;
  current_count integer;
  today_utc date := (now() at time zone 'utc')::date;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  select case when p.plan_tier = 'plus' and (p.plan_valid_until is null or p.plan_valid_until > now()) then 'plus' else 'free' end
  into plan_name from public.profiles p
  where p.id = requested_student_id and p.role = 'student' and p.onboarding_completed;
  if not found then raise exception 'active student profile required'; end if;

  limit_value := case when plan_name = 'plus' then 30 else 10 end;
  insert into public.ai_usage_daily (student_id, usage_date)
  values (requested_student_id, today_utc) on conflict do nothing;
  select u.scope_rejection_count into current_count from public.ai_usage_daily u
  where u.student_id = requested_student_id and u.usage_date = today_utc for update;

  if current_count >= limit_value then
    return query select current_count, limit_value, true;
    return;
  end if;

  update public.ai_usage_daily set scope_rejection_count = scope_rejection_count + 1, updated_at = now()
  where student_id = requested_student_id and usage_date = today_utc;
  return query select current_count + 1, limit_value, false;
end;
$$;

create or replace function public.get_ai_scope_rejection_metrics(days_back integer default 30)
returns table (usage_date date, rejected_messages bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  return query select u.usage_date, sum(u.scope_rejection_count)::bigint
  from public.ai_usage_daily u
  where u.usage_date >= (now() at time zone 'utc')::date - greatest(1, least(days_back, 365))
  group by u.usage_date order by u.usage_date desc;
end;
$$;

revoke all on function public.record_ai_scope_rejection(uuid) from public;
revoke all on function public.get_ai_scope_rejection_metrics(integer) from public;
grant execute on function public.record_ai_scope_rejection(uuid) to service_role;
grant execute on function public.get_ai_scope_rejection_metrics(integer) to authenticated;
