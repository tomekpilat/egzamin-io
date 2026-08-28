-- Full CKE question content, type-aware responses and point-based progress.

alter table public.practice_questions
  add column if not exists question_type text not null default 'single_choice',
  add column if not exists content_blocks jsonb not null default '[]'::jsonb,
  add column if not exists assets jsonb not null default '[]'::jsonb,
  add column if not exists answer_key jsonb not null default '{}'::jsonb,
  add column if not exists scoring jsonb not null default '{"max_points":1}'::jsonb;

alter table public.practice_questions drop constraint if exists practice_questions_options_check;
alter table public.practice_questions drop constraint if exists practice_questions_correct_answer_check;
alter table public.practice_questions alter column options set default '[]'::jsonb;
alter table public.practice_questions alter column correct_answer drop not null;
alter table public.practice_questions
  add constraint practice_questions_question_type_check check (question_type in ('single_choice', 'multiple_choice', 'numeric', 'short_text', 'long_text')),
  add constraint practice_questions_options_array_check check (jsonb_typeof(options) = 'array'),
  add constraint practice_questions_correct_answer_range_check check (correct_answer is null or correct_answer between 0 and 3),
  add constraint practice_questions_content_blocks_array_check check (jsonb_typeof(content_blocks) = 'array'),
  add constraint practice_questions_assets_array_check check (jsonb_typeof(assets) = 'array'),
  add constraint practice_questions_answer_key_object_check check (jsonb_typeof(answer_key) = 'object'),
  add constraint practice_questions_scoring_object_check check (jsonb_typeof(scoring) = 'object');

update public.practice_questions
set answer_key = jsonb_build_object('correct_index', correct_answer),
    scoring = jsonb_build_object('max_points', 1, 'rules', jsonb_build_array('1 pkt - odpowiedź poprawna', '0 pkt - odpowiedź niepoprawna albo brak odpowiedzi'))
where answer_key = '{}'::jsonb;

alter table public.student_question_attempts
  add column if not exists response jsonb,
  add column if not exists points_awarded smallint,
  add column if not exists max_points smallint,
  add column if not exists grading_status text;

alter table public.student_question_attempts drop constraint if exists student_question_attempts_selected_answer_check;
alter table public.student_question_attempts alter column selected_answer drop not null;
alter table public.student_question_attempts alter column is_correct drop not null;
alter table public.student_question_attempts
  add constraint student_question_attempts_selected_answer_range_check check (selected_answer is null or selected_answer between 0 and 3),
  add constraint student_question_attempts_response_object_check check (response is null or jsonb_typeof(response) = 'object'),
  add constraint student_question_attempts_points_check check (points_awarded is null or points_awarded >= 0),
  add constraint student_question_attempts_max_points_check check (max_points is null or max_points > 0),
  add constraint student_question_attempts_grading_status_check check (grading_status is null or grading_status in ('auto', 'awaiting_self_assessment', 'self_assessed'));

update public.student_question_attempts attempt
set response = jsonb_build_object('index', attempt.selected_answer),
    points_awarded = case when attempt.is_correct then 1 else 0 end,
    max_points = 1,
    grading_status = 'auto'
where attempt.response is null;

create table if not exists public.student_response_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.practice_questions(id) on delete cascade,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  points_awarded smallint,
  max_points smallint not null check (max_points > 0),
  grading_status text not null check (grading_status in ('auto', 'awaiting_self_assessment', 'self_assessed')),
  created_at timestamptz not null default now()
);

create index if not exists student_response_events_student_idx
  on public.student_response_events (student_id, created_at desc);
alter table public.student_response_events enable row level security;
revoke all on public.student_response_events from anon, authenticated;

create or replace function public.stage_cke_import(import_manifest jsonb, import_checksum text)
returns table (import_batch_id uuid, import_result text, import_status text, imported_questions integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  paper jsonb := import_manifest -> 'paper';
  permission jsonb := import_manifest -> 'permission';
  questions jsonb := import_manifest -> 'questions';
  question jsonb;
  existing_batch public.cke_import_batches%rowtype;
  created_batch_id uuid;
  page_from integer;
  page_to integer;
  question_type_value text;
  question_count_value integer;
  option_count integer;
  correct_index_value integer;
  correct_indices jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ) then raise exception 'admin or service role required'; end if;
  if jsonb_typeof(import_manifest) <> 'object' or (import_manifest ->> 'schema_version')::integer <> 1 then raise exception 'unsupported manifest schema version'; end if;
  if jsonb_typeof(paper) <> 'object' or jsonb_typeof(permission) <> 'object' or jsonb_typeof(questions) <> 'array' then raise exception 'paper, permission and questions are required'; end if;
  if import_checksum !~ '^[a-f0-9]{64}$' then raise exception 'invalid manifest checksum'; end if;

  question_count_value := jsonb_array_length(questions);
  if question_count_value = 0 or question_count_value <> (paper ->> 'question_count')::integer then raise exception 'question count does not match paper.question_count'; end if;
  if nullif(btrim(permission ->> 'reference'), '') is null or nullif(btrim(permission ->> 'verified_by'), '') is null or nullif(btrim(permission ->> 'verified_at'), '') is null then raise exception 'verified CKE permission metadata is required'; end if;

  select * into existing_batch from public.cke_import_batches batch
  where batch.manifest_id = import_manifest ->> 'manifest_id'
    and batch.manifest_version = (import_manifest ->> 'manifest_version')::integer;
  if found then
    if existing_batch.content_checksum <> import_checksum then raise exception 'manifest version conflict: increment manifest_version'; end if;
    return query select existing_batch.id, 'unchanged'::text, existing_batch.status, existing_batch.question_count;
    return;
  end if;
  if exists (
    select 1 from public.cke_import_batches batch
    where batch.source_pdf_sha256 is not null
      and batch.source_pdf_sha256 = nullif(paper ->> 'source_pdf_sha256', '')
      and batch.manifest_id <> import_manifest ->> 'manifest_id'
  ) then raise exception 'source PDF already belongs to another manifest'; end if;

  insert into public.cke_import_batches (
    manifest_id, manifest_version, schema_version, paper_id, source_document_id,
    source_pdf_sha256, source_url, source_label, exam_year, exam_session, subject,
    variant_code, permission_reference, permission_verified_at, permission_verified_by,
    content_checksum, question_count, manifest
  ) values (
    import_manifest ->> 'manifest_id', (import_manifest ->> 'manifest_version')::integer, 1,
    paper ->> 'id', paper ->> 'source_document_id', nullif(paper ->> 'source_pdf_sha256', ''),
    paper ->> 'source_url', paper ->> 'source_label', (paper ->> 'exam_year')::integer,
    paper ->> 'exam_session', paper ->> 'subject', paper ->> 'variant_code',
    permission ->> 'reference', (permission ->> 'verified_at')::timestamptz,
    permission ->> 'verified_by', import_checksum, question_count_value, import_manifest
  ) returning id into created_batch_id;

  for question in select value from jsonb_array_elements(questions)
  loop
    if jsonb_typeof(question -> 'source_pages') <> 'array' or jsonb_array_length(question -> 'source_pages') = 0 then raise exception 'source_pages are required for question %', question ->> 'number'; end if;
    select min(value::integer), max(value::integer) into page_from, page_to from jsonb_array_elements_text(question -> 'source_pages');
    question_type_value := question ->> 'type';
    if question_type_value not in ('single_choice', 'multiple_choice', 'numeric', 'short_text', 'long_text') then raise exception 'unsupported question type for question %', question ->> 'number'; end if;
    if coalesce((question -> 'scoring' ->> 'max_points')::integer, 0) < 1 then raise exception 'positive max_points required for question %', question ->> 'number'; end if;

    option_count := case when jsonb_typeof(question -> 'answer_options') = 'array' then jsonb_array_length(question -> 'answer_options') else 0 end;
    if question_type_value = 'single_choice' then
      correct_index_value := (question -> 'answer_key' ->> 'correct_index')::integer;
      if option_count <> 4 or correct_index_value is null or correct_index_value not between 0 and 3 then raise exception 'single_choice question % requires four options and correct_index 0-3', question ->> 'number'; end if;
    elsif question_type_value = 'multiple_choice' then
      correct_indices := question -> 'answer_key' -> 'correct_indices';
      if option_count < 2 or jsonb_typeof(correct_indices) <> 'array' or jsonb_array_length(correct_indices) = 0 then raise exception 'multiple_choice question % requires options and correct_indices', question ->> 'number'; end if;
      if exists (
        select 1 from jsonb_array_elements_text(correct_indices) as answer_index(index_value)
        where index_value::integer < 0 or index_value::integer >= option_count
      ) or (
        select count(*) <> count(distinct index_value::integer)
        from jsonb_array_elements_text(correct_indices) as answer_index(index_value)
      ) then raise exception 'multiple_choice correct index out of range or duplicated for question %', question ->> 'number'; end if;
    end if;

    insert into public.cke_import_questions (
      batch_id, stable_id, question_number, sort_order, source_page_from, source_page_to,
      question_type, topic, difficulty, prompt_markdown, answer_options, answer_key,
      scoring, explanation, content_blocks, assets, source_checksum
    ) values (
      created_batch_id, question ->> 'id', question ->> 'number', (question ->> 'sort_order')::integer,
      page_from, page_to, question_type_value, question ->> 'topic', (question ->> 'difficulty')::smallint,
      question ->> 'prompt', coalesce(question -> 'answer_options', '[]'::jsonb),
      question -> 'answer_key', question -> 'scoring', question ->> 'explanation',
      coalesce(question -> 'content_blocks', '[]'::jsonb), coalesce(question -> 'assets', '[]'::jsonb),
      question ->> 'source_checksum'
    );
  end loop;

  return query select created_batch_id, 'staged'::text, 'staged'::text, question_count_value;
end;
$$;

create or replace function public.promote_cke_import_batch(target_batch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.cke_import_batches%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then raise exception 'admin or service role required'; end if;
  select * into batch from public.cke_import_batches where id = target_batch_id for update;
  if not found or batch.status <> 'approved' then raise exception 'approved import batch required'; end if;
  if exists (
    select 1 from public.cke_import_questions
    where batch_id = target_batch_id
      and question_type not in ('single_choice', 'multiple_choice', 'numeric', 'short_text', 'long_text')
  ) then raise exception 'unsupported question type'; end if;
  if exists (
    select 1 from public.cke_import_questions
    where batch_id = target_batch_id and question_number !~ '^[0-9]+$'
  ) then raise exception 'subquestions are not supported by current practice UI'; end if;
  update public.cke_import_batches set status = 'imported' where id = target_batch_id;
  return batch.paper_id;
end;
$$;

create or replace function public.publish_cke_exam_paper(target_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.cke_import_batches%rowtype;
  imported_question public.cke_import_questions%rowtype;
  manifest_question jsonb;
  numeric_question_number integer;
  correct_index smallint;
  explanation_version integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then raise exception 'admin or service role required'; end if;
  select * into batch from public.cke_import_batches where id = target_batch_id and status = 'imported' for update;
  if not found then raise exception 'imported batch required'; end if;

  insert into public.exam_papers (
    id, exam_year, exam_session, subject, variant_code, source_document_id, source_label, source_url, is_published
  ) values (
    batch.paper_id, batch.exam_year, batch.exam_session, batch.subject, batch.variant_code,
    batch.source_document_id, batch.source_label, batch.source_url, true
  ) on conflict (id) do update set
    exam_year = excluded.exam_year, exam_session = excluded.exam_session, subject = excluded.subject,
    variant_code = excluded.variant_code, source_document_id = excluded.source_document_id,
    source_label = excluded.source_label, source_url = excluded.source_url,
    is_published = true, updated_at = now();

  for imported_question in
    select * from public.cke_import_questions where batch_id = target_batch_id order by sort_order
  loop
    numeric_question_number := imported_question.question_number::integer;
    select value into manifest_question
    from jsonb_array_elements(batch.manifest -> 'questions')
    where value ->> 'id' = imported_question.stable_id;
    if manifest_question is null then raise exception 'manifest question missing: %', imported_question.stable_id; end if;
    correct_index := case when imported_question.question_type = 'single_choice' then (imported_question.answer_key ->> 'correct_index')::smallint else null end;

    insert into public.practice_questions (
      id, source_type, source_label, exam_year, subject, topic, prompt, options,
      correct_answer, explanation, difficulty, is_published, sort_order,
      exam_paper_id, paper_question_number, question_type, content_blocks, assets,
      answer_key, scoring
    ) values (
      imported_question.stable_id, 'cke', batch.source_label, batch.exam_year, batch.subject,
      imported_question.topic, imported_question.prompt_markdown, imported_question.answer_options,
      correct_index, imported_question.explanation, imported_question.difficulty, true,
      imported_question.sort_order, batch.paper_id, numeric_question_number,
      imported_question.question_type, imported_question.content_blocks, imported_question.assets,
      imported_question.answer_key, imported_question.scoring
    ) on conflict (id) do update set
      source_type = excluded.source_type, source_label = excluded.source_label, exam_year = excluded.exam_year,
      subject = excluded.subject, topic = excluded.topic, prompt = excluded.prompt, options = excluded.options,
      correct_answer = excluded.correct_answer, explanation = excluded.explanation,
      difficulty = excluded.difficulty, is_published = true, sort_order = excluded.sort_order,
      exam_paper_id = excluded.exam_paper_id, paper_question_number = excluded.paper_question_number,
      question_type = excluded.question_type, content_blocks = excluded.content_blocks,
      assets = excluded.assets, answer_key = excluded.answer_key, scoring = excluded.scoring,
      updated_at = now();

    update public.ai_question_explanations
    set status = 'withdrawn', review_notes = 'Zastąpione zweryfikowanym importem CKE.'
    where question_id = imported_question.stable_id and status = 'approved';
    select coalesce(max(version), 0) + 1 into explanation_version
    from public.ai_question_explanations where question_id = imported_question.stable_id;
    insert into public.ai_question_explanations (
      question_id, version, solution_steps, hints, final_explanation,
      answer_key_snapshot, status, model, reviewed_at, review_notes
    ) values (
      imported_question.stable_id, explanation_version,
      coalesce(manifest_question -> 'solution_steps', jsonb_build_array(imported_question.explanation)),
      coalesce(manifest_question -> 'hints', jsonb_build_array('Wypisz dane.', 'Wybierz właściwe działanie.', 'Sprawdź wynik.')),
      imported_question.explanation, imported_question.answer_key,
      'approved', 'cke-editorial-import-v1', now(),
      'Opracowanie zatwierdzone razem z pełnym, ręcznie zweryfikowanym arkuszem CKE.'
    );
  end loop;

  update public.practice_questions question set is_published = false
  where question.exam_paper_id = batch.paper_id
    and not exists (
      select 1 from public.cke_import_questions imported
      where imported.batch_id = target_batch_id and imported.stable_id = question.id
    );
  update public.cke_import_batches set status = 'superseded'
  where paper_id = batch.paper_id and id <> target_batch_id and status in ('imported', 'published');
  update public.cke_import_batches set status = 'published' where id = target_batch_id;
end;
$$;

drop function if exists public.get_practice_questions();
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
  selected_accommodation text;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student' and onboarding_completed
  ) then raise exception 'active student profile required'; end if;
  selected_accommodation := coalesce(
    (select preference.accommodation_code from public.student_cke_preferences preference where preference.student_id = (select auth.uid())),
    '100'
  );

  return query
  select question.id, question.source_type, question.source_label, paper.id, paper.exam_year, paper.exam_session,
         paper.variant_code, paper.accommodation_code, accommodation.label,
         paper.source_document_id, question.paper_question_number,
         question.subject, question.topic, question.prompt, question.options, question.difficulty,
         question.sort_order, question.question_type, question.content_blocks, question.assets,
         question.scoring, attempt.selected_answer, attempt.response, attempt.is_correct,
         coalesce(attempt.attempt_count, 0), attempt.points_awarded, attempt.max_points,
         attempt.grading_status,
         case when attempt.question_id is not null then question.correct_answer else null end,
         case when attempt.question_id is not null then question.answer_key else null end,
         case when attempt.question_id is not null then question.explanation else null end
  from public.practice_questions question
  left join public.exam_papers paper on paper.id = question.exam_paper_id and paper.is_published
  left join public.cke_accommodation_profiles accommodation on accommodation.code = paper.accommodation_code
  left join public.student_question_attempts attempt
    on attempt.question_id = question.id and attempt.student_id = (select auth.uid())
  where question.is_published
    and (
      (question.source_type = 'demo' and selected_accommodation = '100')
      or
      (question.source_type = 'cke' and paper.id is not null and paper.accommodation_code = selected_accommodation)
    )
  order by case when question.source_type = 'cke' then 0 else 1 end,
           paper.exam_year desc nulls last, question.subject, paper.exam_session,
           paper.variant_code, coalesce(question.paper_question_number, question.sort_order);
end;
$$;

drop function if exists public.get_student_paper_progress();
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
declare
  selected_accommodation text;
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student' and onboarding_completed) then raise exception 'active student profile required'; end if;
  selected_accommodation := coalesce((select preference.accommodation_code from public.student_cke_preferences preference where preference.student_id = (select auth.uid())), '100');
  return query
  select paper.id, paper.exam_year, paper.exam_session, paper.subject, paper.variant_code,
         paper.accommodation_code, accommodation.label, paper.source_label,
         count(question.id)::integer, count(attempt.question_id)::integer,
         count(attempt.question_id) filter (where attempt.is_correct)::integer,
         case when count(attempt.question_id) = 0 then 0 else round(100.0 * count(attempt.question_id) filter (where attempt.is_correct) / count(attempt.question_id))::integer end,
         coalesce(sum(attempt.points_awarded), 0)::integer,
         coalesce(sum(attempt.max_points) filter (where attempt.question_id is not null), 0)::integer,
         case when coalesce(sum(attempt.max_points) filter (where attempt.question_id is not null), 0) = 0 then 0 else round(100.0 * coalesce(sum(attempt.points_awarded), 0) / sum(attempt.max_points))::integer end,
         case when count(attempt.question_id) = 0 then 'not_started' when count(attempt.question_id) = count(question.id) then 'completed' else 'in_progress' end
  from public.exam_papers paper
  join public.cke_accommodation_profiles accommodation on accommodation.code = paper.accommodation_code
  join public.practice_questions question on question.exam_paper_id = paper.id and question.is_published
  left join public.student_question_attempts attempt on attempt.question_id = question.id and attempt.student_id = (select auth.uid())
  where paper.is_published and paper.accommodation_code = selected_accommodation
  group by paper.id, paper.exam_year, paper.exam_session, paper.subject, paper.variant_code,
           paper.accommodation_code, accommodation.label, paper.source_label
  order by paper.exam_year desc, case paper.subject when 'mathematics' then 1 when 'polish' then 2 else 3 end,
           case paper.exam_session when 'main' then 1 else 2 end, paper.variant_code;
end;
$$;

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
begin
  if jsonb_typeof(student_response) <> 'object' then raise exception 'invalid response'; end if;
  if not exists (select 1 from public.profiles where id = current_student_id and role = 'student' and onboarding_completed) then raise exception 'active student profile required'; end if;
  if not public.student_can_access_question(current_student_id, target_question_id) then raise exception 'question is not available for the selected CKE accommodation'; end if;
  select * into question_record from public.practice_questions where id = target_question_id and is_published;
  if not found then raise exception 'published question not found'; end if;
  maximum := coalesce((question_record.scoring ->> 'max_points')::integer, 1);

  if question_record.question_type = 'single_choice' then
    selected_index := (student_response ->> 'index')::integer;
    if selected_index is null or selected_index not between 0 and jsonb_array_length(question_record.options) - 1 then raise exception 'invalid answer index'; end if;
    answer_correct := selected_index = (question_record.answer_key ->> 'correct_index')::integer;
    awarded := case when answer_correct then maximum else 0 end;
    status_value := 'auto';
  elsif question_record.question_type = 'multiple_choice' then
    if jsonb_typeof(student_response -> 'indices') <> 'array' then raise exception 'invalid selected indices'; end if;
    if jsonb_array_length(student_response -> 'indices') = 0 or exists (
      select 1 from jsonb_array_elements_text(student_response -> 'indices') as selected(selected_index_value)
      where selected_index_value::integer < 0 or selected_index_value::integer >= jsonb_array_length(question_record.options)
    ) or (
      select count(*) <> count(distinct selected_index_value::integer)
      from jsonb_array_elements_text(student_response -> 'indices') as selected(selected_index_value)
    ) then raise exception 'invalid selected indices'; end if;
    select coalesce(array_agg(value::integer order by value::integer), '{}') into selected_indices from jsonb_array_elements_text(student_response -> 'indices');
    select coalesce(array_agg(value::integer order by value::integer), '{}') into correct_indices from jsonb_array_elements_text(question_record.answer_key -> 'correct_indices');
    answer_correct := selected_indices = correct_indices;
    awarded := case when answer_correct then maximum else 0 end;
    status_value := 'auto';
  else
    if char_length(btrim(coalesce(student_response ->> 'text', ''))) not between 1 and 10000 then raise exception 'written response required'; end if;
    if self_awarded_points is null then
      answer_correct := null;
      awarded := null;
      status_value := 'awaiting_self_assessment';
    else
      if self_awarded_points not between 0 and maximum then raise exception 'invalid self-assessed points'; end if;
      awarded := self_awarded_points;
      answer_correct := self_awarded_points = maximum;
      status_value := 'self_assessed';
    end if;
  end if;

  insert into public.student_question_attempts (
    student_id, question_id, selected_answer, response, is_correct,
    points_awarded, max_points, grading_status
  ) values (
    current_student_id, target_question_id,
    case when question_record.question_type = 'single_choice' then selected_index else null end,
    student_response, answer_correct, awarded, maximum, status_value
  ) on conflict (student_id, question_id) do update set
    selected_answer = excluded.selected_answer, response = excluded.response,
    is_correct = excluded.is_correct, points_awarded = excluded.points_awarded,
    max_points = excluded.max_points, grading_status = excluded.grading_status,
    attempt_count = case
      when public.student_question_attempts.grading_status = 'awaiting_self_assessment' and excluded.grading_status = 'self_assessed'
        then public.student_question_attempts.attempt_count
      else public.student_question_attempts.attempt_count + 1
    end,
    last_answered_at = now()
  returning attempt_count into updated_attempt_count;

  insert into public.student_response_events (
    student_id, question_id, response, points_awarded, max_points, grading_status
  ) values (current_student_id, target_question_id, student_response, awarded, maximum, status_value);

  return query select answer_correct, question_record.correct_answer, question_record.answer_key,
    question_record.explanation, updated_attempt_count,
    (select count(*)::integer from public.student_question_attempts where student_id = current_student_id),
    (select count(*)::integer from public.student_question_attempts where student_id = current_student_id and is_correct),
    awarded, maximum, status_value;
end;
$$;

revoke all on function public.get_practice_questions() from public;
revoke all on function public.get_student_paper_progress() from public;
revoke all on function public.submit_practice_response(text, jsonb, integer) from public;
grant execute on function public.get_practice_questions() to authenticated;
grant execute on function public.get_student_paper_progress() to authenticated;
grant execute on function public.submit_practice_response(text, jsonb, integer) to authenticated;
