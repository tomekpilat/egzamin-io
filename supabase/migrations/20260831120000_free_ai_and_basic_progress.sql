-- Free remains useful on its own: three Tutor AI questions per UTC day and a
-- private, aggregate progress summary. Detailed paper results, trends,
-- recommendations and parent reporting remain Plus features.

create or replace function public.get_student_practice_access()
returns table (
  active_plan text,
  practice_used_today integer,
  practice_daily_limit integer,
  progress_enabled boolean,
  ai_enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  student_id uuid := (select auth.uid());
  plus_enabled boolean;
  used_today integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = student_id and role = 'student' and onboarding_completed
  ) then raise exception 'active student profile required'; end if;

  plus_enabled := public.student_has_active_plus(student_id);
  select count(distinct event.question_id)::integer into used_today
  from public.student_response_events event
  where event.student_id = student_id
    and (event.created_at at time zone 'Europe/Warsaw')::date = (now() at time zone 'Europe/Warsaw')::date;

  return query select
    case when plus_enabled then 'plus' else 'free' end,
    coalesce(used_today, 0),
    case when plus_enabled then null::integer else 15 end,
    true,
    true;
end;
$$;

revoke all on function public.get_student_practice_access() from public, anon;
grant execute on function public.get_student_practice_access() to authenticated;

create or replace function public.get_student_basic_progress()
returns table (
  solved_count integer,
  correct_count integer,
  accuracy_percent integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  student_id uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.profiles
    where id = student_id and role = 'student' and onboarding_completed
  ) then raise exception 'active student profile required'; end if;

  return query
  select
    count(*)::integer,
    count(*) filter (where attempt.is_correct)::integer,
    case when count(*) = 0 then 0
      else round(100.0 * count(*) filter (where attempt.is_correct) / count(*))::integer
    end
  from public.student_question_attempts attempt
  where attempt.student_id = student_id;
end;
$$;

revoke all on function public.get_student_basic_progress() from public, anon;
grant execute on function public.get_student_basic_progress() to authenticated;

-- Restore the original quota-aware reservation path. The delegated function
-- enforces Free=3 and Plus=50 atomically and still requires service_role.
create or replace function public.reserve_ai_tutor_request(requested_student_id uuid, target_question_id text, student_message text)
returns table (
  reserved_request_id uuid, question_subject text, question_topic text,
  question_prompt text, question_options jsonb, approved_answer_key jsonb,
  approved_solution_steps jsonb, approved_hints jsonb,
  approved_final_explanation text, chat_history jsonb, used_count integer,
  daily_limit integer, active_plan text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  return query select * from public.reserve_ai_tutor_request_plus_unchecked(requested_student_id, target_question_id, student_message);
end;
$$;

revoke all on function public.reserve_ai_tutor_request(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_ai_tutor_request(uuid, text, text) to service_role;
