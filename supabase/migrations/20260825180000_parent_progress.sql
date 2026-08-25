-- Durable answer history and privacy-preserving parent progress aggregates.

create table if not exists public.student_answer_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.practice_questions(id) on delete cascade,
  selected_answer smallint not null check (selected_answer between 0 and 3),
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists student_answer_events_student_time_idx
  on public.student_answer_events (student_id, answered_at desc);
create index if not exists student_answer_events_student_question_idx
  on public.student_answer_events (student_id, question_id, answered_at desc);

alter table public.student_answer_events enable row level security;
revoke all on public.student_answer_events from anon, authenticated;

-- Preserve the current answer as the first historical event for existing users.
insert into public.student_answer_events (
  student_id, question_id, selected_answer, is_correct, answered_at
)
select a.student_id, a.question_id, a.selected_answer, a.is_correct, a.last_answered_at
from public.student_question_attempts a
where not exists (
  select 1
  from public.student_answer_events e
  where e.student_id = a.student_id and e.question_id = a.question_id
);

create or replace function public.submit_practice_answer(
  target_question_id text,
  selected_answer integer
)
returns table (
  answer_is_correct boolean,
  answer_correct_index smallint,
  answer_explanation text,
  answer_attempt_count integer,
  solved_count integer,
  correct_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_student_id uuid := (select auth.uid());
  target_correct_answer smallint;
  target_explanation text;
  answer_correct boolean;
  updated_attempt_count integer;
begin
  if selected_answer not between 0 and 3 then raise exception 'invalid answer index'; end if;
  if not exists (
    select 1 from public.profiles
    where id = current_student_id and role = 'student' and onboarding_completed
  ) then
    raise exception 'active student profile required';
  end if;

  select q.correct_answer, q.explanation
  into target_correct_answer, target_explanation
  from public.practice_questions q
  where q.id = target_question_id and q.is_published;
  if not found then raise exception 'published question not found'; end if;

  answer_correct := selected_answer = target_correct_answer;

  insert into public.student_question_attempts (
    student_id, question_id, selected_answer, is_correct
  ) values (
    current_student_id, target_question_id, selected_answer, answer_correct
  )
  on conflict (student_id, question_id) do update
    set selected_answer = excluded.selected_answer,
        is_correct = excluded.is_correct,
        attempt_count = public.student_question_attempts.attempt_count + 1,
        last_answered_at = now()
  returning attempt_count into updated_attempt_count;

  insert into public.student_answer_events (
    student_id, question_id, selected_answer, is_correct
  ) values (
    current_student_id, target_question_id, selected_answer, answer_correct
  );

  return query
  select answer_correct, target_correct_answer, target_explanation,
         updated_attempt_count,
         (select count(*)::integer from public.student_question_attempts where student_id = current_student_id),
         (select count(*)::integer from public.student_question_attempts where student_id = current_student_id and is_correct);
end;
$$;

create or replace function public.get_parent_child_progress(
  target_student_id uuid,
  requested_range_days integer default 7
)
returns table (
  progress_student_id uuid,
  progress_range_days integer,
  solved_count integer,
  correct_count integer,
  total_attempts integer,
  accuracy_percent integer,
  active_days integer,
  weekly_goal integer,
  weekly_sessions integer,
  trend_percentage_points integer,
  subject_stats jsonb,
  strong_topics jsonb,
  focus_topics jsonb,
  recommendation text,
  latest_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parent_id uuid := (select auth.uid());
  range_start timestamptz;
  trend_days integer;
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
  trend_days := case when requested_range_days = 0 then 30 else requested_range_days end;

  return query
  with range_events as (
    select e.id, e.question_id, e.is_correct, e.answered_at, q.subject, q.topic
    from public.student_answer_events e
    join public.practice_questions q on q.id = e.question_id
    where e.student_id = target_student_id and e.answered_at >= range_start
  ),
  latest_answers as (
    select distinct on (question_id)
      question_id, is_correct, answered_at, subject, topic
    from range_events
    order by question_id, answered_at desc, id desc
  ),
  overview as (
    select count(*)::integer as solved,
           count(*) filter (where is_correct)::integer as correct
    from latest_answers
  ),
  activity as (
    select count(*)::integer as attempts,
           count(distinct ((answered_at at time zone 'Europe/Warsaw')::date))::integer as days,
           max(answered_at) as latest_at
    from range_events
  ),
  weekly_activity as (
    select count(distinct ((answered_at at time zone 'Europe/Warsaw')::date))::integer as sessions
    from public.student_answer_events
    where student_id = target_student_id
      and answered_at >= now() - interval '7 days'
  ),
  current_trend_answers as (
    select distinct on (question_id) question_id, is_correct
    from public.student_answer_events
    where student_id = target_student_id
      and answered_at >= now() - make_interval(days => trend_days)
    order by question_id, answered_at desc, id desc
  ),
  previous_trend_answers as (
    select distinct on (question_id) question_id, is_correct
    from public.student_answer_events
    where student_id = target_student_id
      and answered_at >= now() - make_interval(days => trend_days * 2)
      and answered_at < now() - make_interval(days => trend_days)
    order by question_id, answered_at desc, id desc
  ),
  trend as (
    select
      case when (select count(*) from current_trend_answers) > 0
             and (select count(*) from previous_trend_answers) > 0
        then round(100.0 * (select count(*) filter (where is_correct) from current_trend_answers) / nullif((select count(*) from current_trend_answers), 0))::integer
           - round(100.0 * (select count(*) filter (where is_correct) from previous_trend_answers) / nullif((select count(*) from previous_trend_answers), 0))::integer
        else 0
      end as points
  ),
  subject_rollup as (
    select subject, count(*)::integer as solved,
           count(*) filter (where is_correct)::integer as correct,
           round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0))::integer as accuracy
    from latest_answers
    group by subject
  ),
  subject_payload as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'subject', subject, 'solved', solved, 'correct', correct, 'accuracy', accuracy
    ) order by case subject when 'mathematics' then 1 when 'polish' then 2 else 3 end), '[]'::jsonb) as value
    from subject_rollup
  ),
  topic_rollup as (
    select subject, topic, count(*)::integer as solved,
           count(*) filter (where is_correct)::integer as correct,
           round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0))::integer as accuracy
    from latest_answers
    group by subject, topic
  ),
  strong_payload as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'subject', subject, 'topic', topic, 'solved', solved, 'accuracy', accuracy
    ) order by accuracy desc, solved desc), '[]'::jsonb) as value
    from (select * from topic_rollup where accuracy >= 70 order by accuracy desc, solved desc limit 3) strong
  ),
  focus_payload as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'subject', subject, 'topic', topic, 'solved', solved, 'accuracy', accuracy
    ) order by accuracy asc, solved desc), '[]'::jsonb) as value
    from (select * from topic_rollup where accuracy < 70 order by accuracy asc, solved desc limit 3) focus
  ),
  weakest as (
    select topic, accuracy
    from topic_rollup
    order by accuracy asc, solved desc, topic
    limit 1
  )
  select
    target_student_id,
    requested_range_days,
    overview.solved,
    overview.correct,
    activity.attempts,
    case when overview.solved = 0 then 0
         else round(100.0 * overview.correct / overview.solved)::integer end,
    activity.days,
    coalesce((
      select gp.weekly_goal from public.guardian_preferences gp
      where gp.guardian_id = parent_id and gp.student_id = target_student_id
    ), 5),
    weekly_activity.sessions,
    trend.points,
    subject_payload.value,
    strong_payload.value,
    focus_payload.value,
    case
      when overview.solved = 0 then 'Zacznijcie od jednej krótkiej sesji. Pierwsze wyniki pojawią się tutaj automatycznie.'
      when exists (select 1 from weakest where accuracy < 70)
        then 'Najbliższy krok: krótka powtórka z tematu „' || (select topic from weakest) || '”.'
      else 'Dobry rytm. Warto utrzymać regularność i przejść do kolejnego zestawu.'
    end,
    activity.latest_at
  from overview, activity, weekly_activity, trend, subject_payload, strong_payload, focus_payload;
end;
$$;

revoke all on function public.submit_practice_answer(text, integer) from public;
revoke all on function public.get_parent_child_progress(uuid, integer) from public;
grant execute on function public.submit_practice_answer(text, integer) to authenticated;
grant execute on function public.get_parent_child_progress(uuid, integer) to authenticated;
