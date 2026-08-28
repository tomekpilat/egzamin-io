-- Product access model:
-- * every active student can browse every published standard CKE paper,
-- * Free can check 15 distinct questions per Warsaw calendar day,
-- * Plus has unlimited interactive checks, Tutor AI and persisted progress views.

create or replace function public.student_has_active_plus(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = target_student_id
      and profile.role = 'student'
      and profile.onboarding_completed
      and profile.plan_tier = 'plus'
      and (profile.plan_valid_until is null or profile.plan_valid_until > now())
  );
$$;

revoke all on function public.student_has_active_plus(uuid) from public, anon, authenticated;
grant execute on function public.student_has_active_plus(uuid) to service_role;

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
    plus_enabled,
    plus_enabled;
end;
$$;

revoke all on function public.get_student_practice_access() from public, anon;
grant execute on function public.get_student_practice_access() to authenticated;

-- Preserve full paper/question visibility, but do not expose historical attempts
-- through the Free response. The internal events remain available for abuse
-- prevention and daily quota enforcement.
alter function public.get_practice_questions() rename to get_practice_questions_with_progress;
revoke all on function public.get_practice_questions_with_progress() from public, anon, authenticated;

create function public.get_practice_questions()
returns table (
  question_id text, source_type text, source_label text, exam_paper_id text,
  exam_year integer, exam_session text, exam_variant text,
  exam_accommodation_code text, exam_accommodation_label text,
  source_document_id text, paper_question_number integer,
  subject text, topic text, prompt text, options jsonb, difficulty smallint,
  sort_order integer, question_type text, content_blocks jsonb, assets jsonb,
  scoring jsonb, selected_answer smallint, selected_response jsonb,
  is_correct boolean, attempt_count integer, points_awarded smallint,
  max_points smallint, grading_status text, correct_answer smallint,
  revealed_answer_key jsonb, explanation text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  plus_enabled boolean := public.student_has_active_plus((select auth.uid()));
begin
  if plus_enabled then
    return query select * from public.get_practice_questions_with_progress();
  else
    return query
    select source.question_id, source.source_type, source.source_label, source.exam_paper_id,
      source.exam_year, source.exam_session, source.exam_variant,
      source.exam_accommodation_code, source.exam_accommodation_label,
      source.source_document_id, source.paper_question_number,
      source.subject, source.topic, source.prompt, source.options, source.difficulty,
      source.sort_order, source.question_type, source.content_blocks, source.assets,
      source.scoring, null::smallint, null::jsonb, null::boolean, 0,
      null::smallint, null::smallint, null::text, null::smallint, null::jsonb, null::text
    from public.get_practice_questions_with_progress() source;
  end if;
end;
$$;

revoke all on function public.get_practice_questions() from public, anon;
grant execute on function public.get_practice_questions() to authenticated;

alter function public.get_student_paper_progress() rename to get_student_paper_progress_plus_unchecked;
revoke all on function public.get_student_paper_progress_plus_unchecked() from public, anon, authenticated;

create function public.get_student_paper_progress()
returns table (
  progress_paper_id text, exam_year integer, exam_session text, subject text,
  variant_code text, accommodation_code text, accommodation_label text, source_label text,
  total_questions integer, answered_questions integer, correct_questions integer,
  accuracy_percent integer, earned_points integer, available_points integer,
  score_percent integer, completion_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.student_has_active_plus((select auth.uid())) then
    raise exception 'plus plan required for progress';
  end if;
  return query select * from public.get_student_paper_progress_plus_unchecked();
end;
$$;

revoke all on function public.get_student_paper_progress() from public, anon;
grant execute on function public.get_student_paper_progress() to authenticated;

alter function public.submit_practice_response(text, jsonb, integer) rename to submit_practice_response_unlimited;
revoke all on function public.submit_practice_response_unlimited(text, jsonb, integer) from public, anon, authenticated;

create function public.submit_practice_response(
  target_question_id text,
  student_response jsonb,
  self_awarded_points integer default null
)
returns table (
  answer_is_correct boolean, answer_correct_index smallint, answer_key jsonb,
  answer_explanation text, answer_attempt_count integer, solved_count integer,
  correct_count integer, awarded_points integer, question_max_points integer,
  response_grading_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  student_id uuid := (select auth.uid());
  used_today integer;
begin
  -- Serialize Free submissions per student so parallel requests cannot bypass 15.
  perform 1 from public.profiles profile
  where profile.id = student_id and profile.role = 'student' and profile.onboarding_completed
  for update;
  if not found then raise exception 'active student profile required'; end if;

  if not public.student_has_active_plus(student_id) and not exists (
    select 1 from public.student_response_events event
    where event.student_id = student_id and event.question_id = target_question_id
      and (event.created_at at time zone 'Europe/Warsaw')::date = (now() at time zone 'Europe/Warsaw')::date
  ) then
    select count(distinct event.question_id)::integer into used_today
    from public.student_response_events event
    where event.student_id = student_id
      and (event.created_at at time zone 'Europe/Warsaw')::date = (now() at time zone 'Europe/Warsaw')::date;
    if coalesce(used_today, 0) >= 15 then raise exception 'practice_daily_limit_reached'; end if;
  end if;

  return query select * from public.submit_practice_response_unlimited(target_question_id, student_response, self_awarded_points);
end;
$$;

revoke all on function public.submit_practice_response(text, jsonb, integer) from public, anon;
grant execute on function public.submit_practice_response(text, jsonb, integer) to authenticated;

-- Parent progress and AI usage are Plus features and remain aggregate-only.
alter function public.get_parent_child_progress(uuid, integer) rename to get_parent_child_progress_plus_unchecked;
revoke all on function public.get_parent_child_progress_plus_unchecked(uuid, integer) from public, anon, authenticated;

create function public.get_parent_child_progress(target_student_id uuid, requested_range_days integer default 7)
returns table (
  progress_student_id uuid, progress_range_days integer, solved_count integer,
  correct_count integer, total_attempts integer, accuracy_percent integer,
  active_days integer, weekly_goal integer, weekly_sessions integer,
  trend_percentage_points integer, subject_stats jsonb, strong_topics jsonb,
  focus_topics jsonb, recommendation text, latest_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.student_guardians guardians
    join public.profiles parent on parent.id = guardians.guardian_id
    where guardians.guardian_id = (select auth.uid())
      and guardians.student_id = target_student_id
      and parent.role = 'parent' and parent.onboarding_completed
  ) then raise exception 'linked child required'; end if;
  if not public.student_has_active_plus(target_student_id) then raise exception 'plus plan required for progress'; end if;
  return query select * from public.get_parent_child_progress_plus_unchecked(target_student_id, requested_range_days);
end;
$$;

revoke all on function public.get_parent_child_progress(uuid, integer) from public, anon;
grant execute on function public.get_parent_child_progress(uuid, integer) to authenticated;

alter function public.get_parent_child_ai_usage(uuid, integer) rename to get_parent_child_ai_usage_plus_unchecked;
revoke all on function public.get_parent_child_ai_usage_plus_unchecked(uuid, integer) from public, anon, authenticated;

create function public.get_parent_child_ai_usage(target_student_id uuid, requested_range_days integer default 7)
returns table (ai_questions_used integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.student_guardians guardians
    join public.profiles parent on parent.id = guardians.guardian_id
    where guardians.guardian_id = (select auth.uid())
      and guardians.student_id = target_student_id
      and parent.role = 'parent' and parent.onboarding_completed
  ) then raise exception 'linked child required'; end if;
  if not public.student_has_active_plus(target_student_id) then raise exception 'plus plan required for AI usage'; end if;
  return query select * from public.get_parent_child_ai_usage_plus_unchecked(target_student_id, requested_range_days);
end;
$$;

revoke all on function public.get_parent_child_ai_usage(uuid, integer) from public, anon;
grant execute on function public.get_parent_child_ai_usage(uuid, integer) to authenticated;

-- Defense in depth: even service-role API code must pass the Plus check before
-- reserving a provider request.
alter function public.reserve_ai_tutor_request(uuid, text, text) rename to reserve_ai_tutor_request_plus_unchecked;
revoke all on function public.reserve_ai_tutor_request_plus_unchecked(uuid, text, text) from public, anon, authenticated, service_role;

create function public.reserve_ai_tutor_request(requested_student_id uuid, target_question_id text, student_message text)
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
  if not public.student_has_active_plus(requested_student_id) then raise exception 'plus plan required for AI'; end if;
  return query select * from public.reserve_ai_tutor_request_plus_unchecked(requested_student_id, target_question_id, student_message);
end;
$$;

revoke all on function public.reserve_ai_tutor_request(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_ai_tutor_request(uuid, text, text) to service_role;
