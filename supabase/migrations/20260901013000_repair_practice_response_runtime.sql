-- Reinstall the self-contained response RPC in production. Coolify deploys the
-- web application only, so this migration also repairs databases that still
-- have the older delegated response wrapper or retired accommodation checks.

create or replace function public.submit_practice_response(
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
  current_student_id uuid := (select auth.uid());
  question_record public.practice_questions%rowtype;
  answer_correct boolean;
  selected_index integer;
  selected_indices integer[];
  correct_indices integer[];
  awarded integer;
  maximum integer;
  status_value text;
  updated_attempt_count integer;
  used_today integer;
begin
  if jsonb_typeof(student_response) <> 'object' then
    raise exception 'invalid_practice_response';
  end if;

  -- Serialize quota checks and submissions for one student.
  perform 1
  from public.profiles profile
  where profile.id = current_student_id
    and profile.role = 'student'
    and profile.onboarding_completed
  for update;
  if not found then raise exception 'active_student_profile_required'; end if;

  select question.* into question_record
  from public.practice_questions question
  left join public.exam_papers paper on paper.id = question.exam_paper_id
  where question.id = target_question_id
    and question.is_published
    and (
      question.source_type = 'demo'
      or (
        question.source_type = 'cke'
        and paper.is_published
        and coalesce(paper.accommodation_code, '100') = '100'
      )
    );
  if not found then raise exception 'published_practice_question_required'; end if;

  if not public.student_has_active_plus(current_student_id) and not exists (
    select 1
    from public.student_response_events event
    where event.student_id = current_student_id
      and event.question_id = target_question_id
      and (event.created_at at time zone 'Europe/Warsaw')::date = (now() at time zone 'Europe/Warsaw')::date
  ) then
    select count(distinct event.question_id)::integer into used_today
    from public.student_response_events event
    where event.student_id = current_student_id
      and (event.created_at at time zone 'Europe/Warsaw')::date = (now() at time zone 'Europe/Warsaw')::date;
    if coalesce(used_today, 0) >= 15 then raise exception 'practice_daily_limit_reached'; end if;
  end if;

  maximum := coalesce((question_record.scoring ->> 'max_points')::integer, 1);
  if maximum < 1 then raise exception 'invalid_question_scoring'; end if;

  if question_record.question_type = 'single_choice' then
    selected_index := (student_response ->> 'index')::integer;
    if selected_index is null
       or selected_index < 0
       or selected_index >= jsonb_array_length(question_record.options) then
      raise exception 'invalid_answer_index';
    end if;
    answer_correct := selected_index = (question_record.answer_key ->> 'correct_index')::integer;
    awarded := case when answer_correct then maximum else 0 end;
    status_value := 'auto';
  elsif question_record.question_type = 'multiple_choice' then
    if jsonb_typeof(student_response -> 'indices') <> 'array'
       or jsonb_array_length(student_response -> 'indices') = 0 then
      raise exception 'invalid_selected_indices';
    end if;
    if exists (
      select 1
      from jsonb_array_elements_text(student_response -> 'indices') selected(value)
      where case
        when selected.value !~ '^[0-9]+$' then true
        else selected.value::integer < 0 or selected.value::integer >= jsonb_array_length(question_record.options)
      end
    ) then
      raise exception 'invalid_selected_indices';
    end if;
    if (
      select count(*) <> count(distinct selected.value::integer)
      from jsonb_array_elements_text(student_response -> 'indices') selected(value)
    ) then
      raise exception 'invalid_selected_indices';
    end if;
    select coalesce(array_agg(selected.value::integer order by selected.value::integer), '{}')
    into selected_indices
    from jsonb_array_elements_text(student_response -> 'indices') selected(value);
    select coalesce(array_agg(correct.value::integer order by correct.value::integer), '{}')
    into correct_indices
    from jsonb_array_elements_text(question_record.answer_key -> 'correct_indices') correct(value);
    answer_correct := selected_indices = correct_indices;
    awarded := case when answer_correct then maximum else 0 end;
    status_value := 'auto';
  elsif question_record.question_type in ('numeric', 'short_text', 'long_text') then
    if char_length(btrim(coalesce(student_response ->> 'text', ''))) not between 1 and 10000 then
      raise exception 'written_response_required';
    end if;
    if self_awarded_points is null then
      answer_correct := null;
      awarded := null;
      status_value := 'awaiting_self_assessment';
    else
      if self_awarded_points not between 0 and maximum then
        raise exception 'invalid_self_assessed_points';
      end if;
      awarded := self_awarded_points;
      answer_correct := self_awarded_points = maximum;
      status_value := 'self_assessed';
    end if;
  else
    raise exception 'unsupported_question_type';
  end if;

  insert into public.student_question_attempts (
    student_id, question_id, selected_answer, response, is_correct,
    points_awarded, max_points, grading_status
  ) values (
    current_student_id, target_question_id,
    case when question_record.question_type = 'single_choice' then selected_index else null end,
    student_response, answer_correct, awarded, maximum, status_value
  ) on conflict (student_id, question_id) do update set
    selected_answer = excluded.selected_answer,
    response = excluded.response,
    is_correct = excluded.is_correct,
    points_awarded = excluded.points_awarded,
    max_points = excluded.max_points,
    grading_status = excluded.grading_status,
    attempt_count = case
      when public.student_question_attempts.grading_status = 'awaiting_self_assessment'
       and excluded.grading_status = 'self_assessed'
        then public.student_question_attempts.attempt_count
      else public.student_question_attempts.attempt_count + 1
    end,
    last_answered_at = now()
  returning attempt_count into updated_attempt_count;

  insert into public.student_response_events (
    student_id, question_id, response, points_awarded, max_points, grading_status
  ) values (
    current_student_id, target_question_id, student_response,
    awarded, maximum, status_value
  );

  return query select
    answer_correct,
    question_record.correct_answer,
    question_record.answer_key,
    question_record.explanation,
    updated_attempt_count,
    (select count(*)::integer from public.student_question_attempts attempt where attempt.student_id = current_student_id),
    (select count(*)::integer from public.student_question_attempts attempt where attempt.student_id = current_student_id and attempt.is_correct is true),
    awarded,
    maximum,
    status_value;
end;
$$;

revoke all on function public.submit_practice_response(text, jsonb, integer) from public, anon;
grant execute on function public.submit_practice_response(text, jsonb, integer) to authenticated;

comment on function public.submit_practice_response(text, jsonb, integer)
  is 'egzaminio practice response runtime v20260901';

notify pgrst, 'reload schema';
