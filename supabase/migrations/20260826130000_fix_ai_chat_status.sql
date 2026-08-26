-- Fix the chat bootstrap function introduced with the AI tutor migration.
-- Its original RETURN QUERY contained the daily limit twice (five values for four columns).

create or replace function public.get_ai_chat_for_student(
  requested_student_id uuid,
  target_question_id text
)
returns table (chat_messages jsonb, used_count integer, daily_limit integer, active_plan text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  plan_name text;
  limit_value integer;
  thread_value uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  select case when p.plan_tier = 'plus' and (p.plan_valid_until is null or p.plan_valid_until > now()) then 'plus' else 'free' end
  into plan_name from public.profiles p
  where p.id = requested_student_id and p.role = 'student' and p.onboarding_completed;
  if not found then raise exception 'active student profile required'; end if;
  if not exists (select 1 from public.practice_questions q where q.id = target_question_id and q.is_published) then
    raise exception 'published question not found';
  end if;
  limit_value := case when plan_name = 'plus' then 50 else 3 end;
  select t.id into thread_value from public.ai_tutor_threads t
  where t.student_id = requested_student_id and t.question_id = target_question_id;

  return query
  select
    coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'content', m.content, 'created_at', m.created_at) order by m.created_at)
      from public.ai_tutor_messages m where m.thread_id = thread_value
    ), '[]'::jsonb),
    coalesce((select u.reserved_count from public.ai_usage_daily u where u.student_id = requested_student_id and u.usage_date = (now() at time zone 'utc')::date), 0),
    limit_value,
    plan_name;
end;
$$;

revoke all on function public.get_ai_chat_for_student(uuid, text) from public;
grant execute on function public.get_ai_chat_for_student(uuid, text) to service_role;
