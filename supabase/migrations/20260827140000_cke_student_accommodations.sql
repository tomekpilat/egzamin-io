-- CKE accommodation profiles, parent-controlled student preference and server-side paper filtering.

create table if not exists public.cke_accommodation_profiles (
  code text primary key check (code in ('100', '200', '400', '500', '660', '700', '800', '900', 'Q00', 'K00', 'C00')),
  label text not null,
  audience_description text not null,
  sort_order smallint not null unique check (sort_order between 1 and 20)
);

insert into public.cke_accommodation_profiles (code, label, audience_description, sort_order) values
  ('100', 'Wariant standardowy', 'Uczniowie bez niepełnosprawności lub ze specyficznymi trudnościami w uczeniu się', 1),
  ('200', 'Autyzm, w tym zespół Aspergera', 'Uczniowie z autyzmem, w tym z zespołem Aspergera', 2),
  ('400', 'Słabowidzenie — czcionka 16 pkt', 'Uczniowie słabowidzący korzystający z arkusza z czcionką 16 pkt', 3),
  ('500', 'Słabowidzenie — czcionka 24 pkt', 'Uczniowie słabowidzący korzystający z arkusza z czcionką 24 pkt', 4),
  ('660', 'Niewidzenie', 'Uczniowie niewidomi', 5),
  ('700', 'Niesłyszenie lub słabosłyszenie', 'Uczniowie niesłyszący i słabosłyszący', 6),
  ('800', 'Niepełnosprawność intelektualna w stopniu lekkim', 'Uczniowie z niepełnosprawnością intelektualną w stopniu lekkim', 7),
  ('900', 'Afazja', 'Uczniowie z afazją', 8),
  ('Q00', 'Niepełnosprawność ruchowa — MPD', 'Uczniowie z niepełnosprawnością ruchową spowodowaną mózgowym porażeniem dziecięcym', 9),
  ('K00', 'Zaburzenie widzenia barw', 'Uczniowie z zaburzeniem widzenia barw', 10),
  ('C00', 'Ograniczona znajomość języka polskiego', 'Uczniowie, którym ograniczona znajomość polskiego utrudnia rozumienie czytanego tekstu', 11)
on conflict (code) do update set
  label = excluded.label,
  audience_description = excluded.audience_description,
  sort_order = excluded.sort_order;

alter table public.cke_accommodation_profiles enable row level security;
revoke all on public.cke_accommodation_profiles from anon, authenticated;

alter table public.exam_papers
  add column if not exists accommodation_code text not null default '100',
  add column if not exists paper_version text check (paper_version is null or paper_version in ('X', 'Y'));

update public.exam_papers
set accommodation_code = coalesce(
      (regexp_match(upper(coalesce(source_document_id, '') || '-' || coalesce(variant_code, '')), '(?:^|-)(100|200|400|500|660|700|800|900|Q00|K00|C00)(?:-|$)'))[1],
      '100'
    ),
    paper_version = (regexp_match(upper(coalesce(source_document_id, '') || '-' || coalesce(variant_code, '')), '(?:^|-)(X|Y)(?:-|$)'))[1];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exam_papers_accommodation_code_fkey'
      and conrelid = 'public.exam_papers'::regclass
  ) then
    alter table public.exam_papers
      add constraint exam_papers_accommodation_code_fkey
      foreign key (accommodation_code) references public.cke_accommodation_profiles(code);
  end if;
end;
$$;

create index if not exists exam_papers_accommodation_catalog_idx
  on public.exam_papers (is_published, accommodation_code, exam_year desc, subject, exam_session);

create or replace function public.set_exam_paper_accommodation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.accommodation_code := coalesce(
    (regexp_match(upper(coalesce(new.source_document_id, '') || '-' || coalesce(new.variant_code, '')), '(?:^|-)(100|200|400|500|660|700|800|900|Q00|K00|C00)(?:-|$)'))[1],
    '100'
  );
  new.paper_version := (regexp_match(upper(coalesce(new.source_document_id, '') || '-' || coalesce(new.variant_code, '')), '(?:^|-)(X|Y)(?:-|$)'))[1];
  return new;
end;
$$;

drop trigger if exists set_exam_paper_accommodation on public.exam_papers;
create trigger set_exam_paper_accommodation
before insert or update of source_document_id, variant_code
on public.exam_papers
for each row execute function public.set_exam_paper_accommodation();

create table if not exists public.student_cke_preferences (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  accommodation_code text not null default '100' references public.cke_accommodation_profiles(code),
  special_category_acknowledged_at timestamptz,
  selected_by uuid references public.profiles(id) on delete set null,
  selected_via text not null default 'default' check (selected_via in ('default', 'guardian', 'admin')),
  updated_at timestamptz not null default now(),
  check (accommodation_code = '100' or special_category_acknowledged_at is not null)
);

insert into public.student_cke_preferences (student_id, accommodation_code, selected_via)
select p.id, '100', 'default'
from public.profiles p
where p.role = 'student'
on conflict (student_id) do nothing;

alter table public.student_cke_preferences enable row level security;
revoke all on public.student_cke_preferences from anon, authenticated;

create or replace function public.get_my_cke_preference()
returns table (
  accommodation_code text,
  accommodation_label text,
  audience_description text,
  selected_via text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student' and onboarding_completed
  ) then raise exception 'active student profile required'; end if;

  return query
  select a.code, a.label, a.audience_description,
         coalesce(pref.selected_via, 'default'), coalesce(pref.updated_at, p.created_at)
  from public.profiles p
  join public.cke_accommodation_profiles a
    on a.code = coalesce((select student_pref.accommodation_code from public.student_cke_preferences student_pref where student_pref.student_id = p.id), '100')
  left join public.student_cke_preferences pref on pref.student_id = p.id
  where p.id = (select auth.uid());
end;
$$;

drop function if exists public.get_linked_children();
create function public.get_linked_children()
returns table (
  student_id uuid,
  student_display_name text,
  student_email text,
  linked_at timestamptz,
  weekly_goal integer,
  summary_email_enabled boolean,
  cke_accommodation_code text,
  cke_accommodation_label text
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
  select g.student_id, p.display_name, p.email, g.created_at,
         coalesce(pref.weekly_goal, 5), coalesce(pref.summary_email_enabled, true),
         accommodation.code, accommodation.label
  from public.student_guardians g
  join public.profiles p on p.id = g.student_id
  left join public.guardian_preferences pref
    on pref.student_id = g.student_id and pref.guardian_id = g.guardian_id
  left join public.student_cke_preferences student_pref on student_pref.student_id = g.student_id
  join public.cke_accommodation_profiles accommodation
    on accommodation.code = coalesce(student_pref.accommodation_code, '100')
  where g.guardian_id = (select auth.uid())
  order by g.created_at desc;
end;
$$;

create or replace function public.update_child_cke_accommodation(
  target_student_id uuid,
  next_accommodation_code text,
  confirms_sensitive_preference boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_id uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.student_guardians
    where guardian_id = parent_id and student_id = target_student_id
  ) then raise exception 'linked child required'; end if;
  if not exists (
    select 1 from public.cke_accommodation_profiles where code = next_accommodation_code
  ) then raise exception 'invalid CKE accommodation code'; end if;
  if next_accommodation_code <> '100' and not confirms_sensitive_preference then
    raise exception 'explicit acknowledgement required for a non-standard CKE preference';
  end if;

  insert into public.student_cke_preferences (
    student_id, accommodation_code, special_category_acknowledged_at,
    selected_by, selected_via, updated_at
  ) values (
    target_student_id, next_accommodation_code,
    case when next_accommodation_code = '100' then null else now() end,
    parent_id, 'guardian', now()
  ) on conflict (student_id) do update set
    accommodation_code = excluded.accommodation_code,
    special_category_acknowledged_at = excluded.special_category_acknowledged_at,
    selected_by = excluded.selected_by,
    selected_via = excluded.selected_via,
    updated_at = now();
end;
$$;

create or replace function public.update_child_learning_settings(
  target_student_id uuid,
  next_weekly_goal integer,
  next_summary_email_enabled boolean,
  next_accommodation_code text,
  confirms_sensitive_preference boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Both updates run in one transaction. An invalid accommodation or missing
  -- guardian link rolls back the weekly goal and e-mail preference as well.
  perform public.update_guardian_preferences(
    target_student_id,
    next_weekly_goal,
    next_summary_email_enabled
  );
  perform public.update_child_cke_accommodation(
    target_student_id,
    next_accommodation_code,
    confirms_sensitive_preference
  );
end;
$$;

create or replace function public.student_can_access_question(target_student_id uuid, target_question_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practice_questions q
    left join public.exam_papers paper on paper.id = q.exam_paper_id
    where q.id = target_question_id
      and q.is_published
      and (
        (q.source_type = 'demo' and coalesce((select pref.accommodation_code from public.student_cke_preferences pref where pref.student_id = target_student_id), '100') = '100')
        or
        (q.source_type = 'cke' and paper.is_published and paper.accommodation_code = coalesce((select pref.accommodation_code from public.student_cke_preferences pref where pref.student_id = target_student_id), '100'))
      )
  );
$$;

drop function if exists public.get_practice_questions();
create function public.get_practice_questions()
returns table (
  question_id text,
  source_type text,
  source_label text,
  exam_paper_id text,
  exam_year integer,
  exam_session text,
  exam_variant text,
  exam_accommodation_code text,
  exam_accommodation_label text,
  source_document_id text,
  paper_question_number integer,
  subject text,
  topic text,
  prompt text,
  options jsonb,
  difficulty smallint,
  sort_order integer,
  selected_answer smallint,
  is_correct boolean,
  attempt_count integer,
  correct_answer smallint,
  explanation text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  selected_accommodation text;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student' and onboarding_completed
  ) then raise exception 'active student profile required'; end if;
  selected_accommodation := coalesce(
    (select pref.accommodation_code from public.student_cke_preferences pref where pref.student_id = (select auth.uid())),
    '100'
  );

  return query
  select q.id, q.source_type, q.source_label, paper.id, paper.exam_year, paper.exam_session,
         paper.variant_code, paper.accommodation_code, accommodation.label,
         paper.source_document_id, q.paper_question_number,
         q.subject, q.topic, q.prompt, q.options, q.difficulty, q.sort_order,
         attempt.selected_answer, attempt.is_correct, coalesce(attempt.attempt_count, 0),
         case when attempt.question_id is not null then q.correct_answer else null end,
         case when attempt.question_id is not null then q.explanation else null end
  from public.practice_questions q
  left join public.exam_papers paper on paper.id = q.exam_paper_id and paper.is_published
  left join public.cke_accommodation_profiles accommodation on accommodation.code = paper.accommodation_code
  left join public.student_question_attempts attempt
    on attempt.question_id = q.id and attempt.student_id = (select auth.uid())
  where q.is_published
    and (
      (q.source_type = 'demo' and selected_accommodation = '100')
      or
      (q.source_type = 'cke' and paper.id is not null and paper.accommodation_code = selected_accommodation)
    )
  order by case when q.source_type = 'cke' then 0 else 1 end,
           paper.exam_year desc nulls last, q.subject, paper.exam_session,
           paper.variant_code, coalesce(q.paper_question_number, q.sort_order);
end;
$$;

drop function if exists public.get_student_paper_progress();
create function public.get_student_paper_progress()
returns table (
  progress_paper_id text,
  exam_year integer,
  exam_session text,
  subject text,
  variant_code text,
  accommodation_code text,
  accommodation_label text,
  source_label text,
  total_questions integer,
  answered_questions integer,
  correct_questions integer,
  accuracy_percent integer,
  completion_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  selected_accommodation text;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student' and onboarding_completed
  ) then raise exception 'active student profile required'; end if;
  selected_accommodation := coalesce(
    (select pref.accommodation_code from public.student_cke_preferences pref where pref.student_id = (select auth.uid())),
    '100'
  );

  return query
  select paper.id, paper.exam_year, paper.exam_session, paper.subject, paper.variant_code,
         paper.accommodation_code, accommodation.label, paper.source_label,
         count(q.id)::integer, count(attempt.question_id)::integer,
         count(attempt.question_id) filter (where attempt.is_correct)::integer,
         case when count(attempt.question_id) = 0 then 0
              else round(100.0 * count(attempt.question_id) filter (where attempt.is_correct) / count(attempt.question_id))::integer end,
         case when count(attempt.question_id) = 0 then 'not_started'
              when count(attempt.question_id) = count(q.id) then 'completed'
              else 'in_progress' end
  from public.exam_papers paper
  join public.cke_accommodation_profiles accommodation on accommodation.code = paper.accommodation_code
  join public.practice_questions q on q.exam_paper_id = paper.id and q.is_published
  left join public.student_question_attempts attempt
    on attempt.question_id = q.id and attempt.student_id = (select auth.uid())
  where paper.is_published and paper.accommodation_code = selected_accommodation
  group by paper.id, paper.exam_year, paper.exam_session, paper.subject, paper.variant_code,
           paper.accommodation_code, accommodation.label, paper.source_label
  order by paper.exam_year desc,
           case paper.subject when 'mathematics' then 1 when 'polish' then 2 else 3 end,
           case paper.exam_session when 'main' then 1 else 2 end, paper.variant_code;
end;
$$;

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
  ) then raise exception 'active student profile required'; end if;
  if not public.student_can_access_question(current_student_id, target_question_id) then
    raise exception 'question is not available for the selected CKE accommodation';
  end if;

  select q.correct_answer, q.explanation into target_correct_answer, target_explanation
  from public.practice_questions q where q.id = target_question_id;
  if not found then raise exception 'published question not found'; end if;
  answer_correct := selected_answer = target_correct_answer;

  insert into public.student_question_attempts (student_id, question_id, selected_answer, is_correct)
  values (current_student_id, target_question_id, selected_answer, answer_correct)
  on conflict (student_id, question_id) do update
    set selected_answer = excluded.selected_answer, is_correct = excluded.is_correct,
        attempt_count = public.student_question_attempts.attempt_count + 1, last_answered_at = now()
  returning attempt_count into updated_attempt_count;

  insert into public.student_answer_events (student_id, question_id, selected_answer, is_correct)
  values (current_student_id, target_question_id, selected_answer, answer_correct);

  return query select answer_correct, target_correct_answer, target_explanation,
    updated_attempt_count,
    (select count(*)::integer from public.student_question_attempts where student_id = current_student_id),
    (select count(*)::integer from public.student_question_attempts where student_id = current_student_id and is_correct);
end;
$$;

create or replace function public.validate_ai_tutor_question_access()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.student_can_access_question(new.student_id, new.question_id) then
    raise exception 'question is not available for the selected CKE accommodation';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_ai_tutor_question_access on public.ai_tutor_requests;
create trigger validate_ai_tutor_question_access
before insert or update of student_id, question_id
on public.ai_tutor_requests
for each row execute function public.validate_ai_tutor_question_access();

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
  if not public.student_can_access_question(requested_student_id, target_question_id) then
    raise exception 'question is not available for the selected CKE accommodation';
  end if;
  limit_value := case when plan_name = 'plus' then 50 else 3 end;
  select t.id into thread_value from public.ai_tutor_threads t
  where t.student_id = requested_student_id and t.question_id = target_question_id;

  return query select
    coalesce((select jsonb_agg(jsonb_build_object('id', message.id, 'role', message.role, 'content', message.content, 'created_at', message.created_at) order by message.created_at) from public.ai_tutor_messages message where message.thread_id = thread_value), '[]'::jsonb),
    coalesce((select usage.reserved_count from public.ai_usage_daily usage where usage.student_id = requested_student_id and usage.usage_date = (now() at time zone 'utc')::date), 0),
    limit_value, plan_name;
end;
$$;

revoke all on function public.get_my_cke_preference() from public;
revoke all on function public.get_linked_children() from public;
revoke all on function public.update_child_cke_accommodation(uuid, text, boolean) from public;
revoke all on function public.update_child_learning_settings(uuid, integer, boolean, text, boolean) from public;
revoke all on function public.student_can_access_question(uuid, text) from public;
revoke all on function public.get_practice_questions() from public;
revoke all on function public.get_student_paper_progress() from public;
revoke all on function public.submit_practice_answer(text, integer) from public;
revoke all on function public.get_ai_chat_for_student(uuid, text) from public;
grant execute on function public.get_my_cke_preference() to authenticated;
grant execute on function public.get_linked_children() to authenticated;
grant execute on function public.update_child_cke_accommodation(uuid, text, boolean) to authenticated;
grant execute on function public.update_child_learning_settings(uuid, integer, boolean, text, boolean) to authenticated;
grant execute on function public.get_practice_questions() to authenticated;
grant execute on function public.get_student_paper_progress() to authenticated;
grant execute on function public.submit_practice_answer(text, integer) to authenticated;
grant execute on function public.get_ai_chat_for_student(uuid, text) to service_role;
