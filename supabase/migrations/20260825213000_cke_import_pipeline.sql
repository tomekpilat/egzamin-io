-- Manual CKE import staging with versioning, deduplication and explicit review gates.

create table if not exists public.cke_import_batches (
  id uuid primary key default gen_random_uuid(),
  manifest_id text not null check (manifest_id ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  manifest_version integer not null check (manifest_version > 0),
  schema_version integer not null default 1 check (schema_version = 1),
  paper_id text not null check (paper_id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  source_document_id text not null check (char_length(source_document_id) between 3 and 160),
  source_pdf_sha256 text check (source_pdf_sha256 is null or source_pdf_sha256 ~ '^[a-f0-9]{64}$'),
  source_url text not null check (source_url ~ '^https://'),
  source_label text not null,
  exam_year integer not null check (exam_year between 2019 and 2100),
  exam_session text not null check (exam_session in ('main', 'additional')),
  subject text not null check (subject in ('mathematics', 'polish', 'english')),
  variant_code text not null check (char_length(variant_code) between 1 and 40),
  permission_reference text not null check (char_length(permission_reference) between 3 and 300),
  permission_verified_at timestamptz not null,
  permission_verified_by text not null check (char_length(permission_verified_by) between 2 and 160),
  content_checksum text not null check (content_checksum ~ '^[a-f0-9]{64}$'),
  question_count integer not null check (question_count > 0),
  status text not null default 'staged' check (status in ('staged', 'in_review', 'approved', 'needs_changes', 'imported', 'published', 'superseded', 'withdrawn')),
  manifest jsonb not null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manifest_id, manifest_version)
);

create unique index if not exists cke_import_batches_manifest_checksum_idx
  on public.cke_import_batches (manifest_id, content_checksum);
create index if not exists cke_import_batches_queue_idx
  on public.cke_import_batches (status, created_at desc);
create index if not exists cke_import_batches_source_idx
  on public.cke_import_batches (source_document_id, source_pdf_sha256);

create table if not exists public.cke_import_questions (
  batch_id uuid not null references public.cke_import_batches(id) on delete cascade,
  stable_id text not null check (stable_id ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  question_number text not null check (question_number ~ '^[0-9]+(\.[0-9]+)?$'),
  sort_order integer not null check (sort_order > 0),
  source_page_from integer not null check (source_page_from > 0),
  source_page_to integer not null check (source_page_to >= source_page_from),
  question_type text not null check (question_type in ('single_choice', 'multiple_choice', 'numeric', 'short_text', 'long_text')),
  topic text not null,
  difficulty smallint not null check (difficulty between 1 and 3),
  prompt_markdown text not null,
  answer_options jsonb not null default '[]'::jsonb check (jsonb_typeof(answer_options) = 'array'),
  answer_key jsonb not null check (jsonb_typeof(answer_key) = 'object'),
  scoring jsonb not null check (jsonb_typeof(scoring) = 'object'),
  explanation text not null,
  content_blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(content_blocks) = 'array'),
  assets jsonb not null default '[]'::jsonb check (jsonb_typeof(assets) = 'array'),
  source_checksum text not null check (source_checksum ~ '^[a-f0-9]{64}$'),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'needs_changes', 'rejected')),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (batch_id, stable_id),
  unique (batch_id, question_number),
  unique (batch_id, sort_order)
);

create index if not exists cke_import_questions_review_idx
  on public.cke_import_questions (batch_id, review_status, sort_order);

drop trigger if exists set_cke_import_batches_updated_at on public.cke_import_batches;
create trigger set_cke_import_batches_updated_at before update on public.cke_import_batches
for each row execute function public.set_updated_at();
drop trigger if exists set_cke_import_questions_updated_at on public.cke_import_questions;
create trigger set_cke_import_questions_updated_at before update on public.cke_import_questions
for each row execute function public.set_updated_at();

alter table public.cke_import_batches enable row level security;
alter table public.cke_import_questions enable row level security;
revoke all on public.cke_import_batches from anon, authenticated;
revoke all on public.cke_import_questions from anon, authenticated;

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
begin
  if coalesce(auth.role(), '') <> 'service_role' and not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ) then raise exception 'admin or service role required'; end if;

  if jsonb_typeof(import_manifest) <> 'object' or (import_manifest ->> 'schema_version')::integer <> 1 then
    raise exception 'unsupported manifest schema version';
  end if;
  if jsonb_typeof(paper) <> 'object' or jsonb_typeof(permission) <> 'object' or jsonb_typeof(questions) <> 'array' then
    raise exception 'paper, permission and questions are required';
  end if;
  if import_checksum !~ '^[a-f0-9]{64}$' then raise exception 'invalid manifest checksum'; end if;

  question_count_value := jsonb_array_length(questions);
  if question_count_value = 0 or question_count_value <> (paper ->> 'question_count')::integer then
    raise exception 'question count does not match paper.question_count';
  end if;
  if nullif(btrim(permission ->> 'reference'), '') is null
     or nullif(btrim(permission ->> 'verified_by'), '') is null
     or nullif(btrim(permission ->> 'verified_at'), '') is null then
    raise exception 'verified CKE permission metadata is required';
  end if;

  select * into existing_batch from public.cke_import_batches b
  where b.manifest_id = import_manifest ->> 'manifest_id'
    and b.manifest_version = (import_manifest ->> 'manifest_version')::integer;
  if found then
    if existing_batch.content_checksum <> import_checksum then
      raise exception 'manifest version conflict: increment manifest_version';
    end if;
    return query select existing_batch.id, 'unchanged'::text, existing_batch.status, existing_batch.question_count;
    return;
  end if;

  if exists (
    select 1 from public.cke_import_batches b
    where b.source_pdf_sha256 is not null
      and b.source_pdf_sha256 = nullif(paper ->> 'source_pdf_sha256', '')
      and b.manifest_id <> import_manifest ->> 'manifest_id'
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
    if jsonb_typeof(question -> 'source_pages') <> 'array' or jsonb_array_length(question -> 'source_pages') = 0 then
      raise exception 'source_pages are required for question %', question ->> 'number';
    end if;
    select min(value::integer), max(value::integer) into page_from, page_to
    from jsonb_array_elements_text(question -> 'source_pages');
    question_type_value := question ->> 'type';
    if question_type_value not in ('single_choice', 'multiple_choice', 'numeric', 'short_text', 'long_text') then
      raise exception 'unsupported question type for question %', question ->> 'number';
    end if;
    if question_type_value = 'single_choice' and (
      jsonb_typeof(question -> 'answer_options') <> 'array'
      or jsonb_array_length(question -> 'answer_options') <> 4
      or (question -> 'answer_key' ->> 'correct_index')::integer not between 0 and 3
    ) then raise exception 'single_choice question % requires four options and correct_index 0-3', question ->> 'number'; end if;

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

create or replace function public.review_cke_import_question(
  target_batch_id uuid, target_stable_id text, next_status text, notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then raise exception 'admin or service role required'; end if;
  if next_status not in ('approved', 'needs_changes', 'rejected') then raise exception 'invalid review status'; end if;
  update public.cke_import_questions
  set review_status = next_status, review_notes = nullif(btrim(coalesce(notes, '')), '')
  where batch_id = target_batch_id and stable_id = target_stable_id;
  if not found then raise exception 'import question not found'; end if;
  update public.cke_import_batches set status = 'in_review' where id = target_batch_id and status = 'staged';
end;
$$;

create or replace function public.review_cke_import_batch(
  target_batch_id uuid, decision text, notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then raise exception 'admin or service role required'; end if;
  if decision not in ('approve', 'request_changes') then raise exception 'invalid batch decision'; end if;
  if decision = 'approve' and exists (
    select 1 from public.cke_import_questions where batch_id = target_batch_id and review_status <> 'approved'
  ) then raise exception 'every question must be approved first'; end if;
  update public.cke_import_batches
  set status = case when decision = 'approve' then 'approved' else 'needs_changes' end,
      review_notes = nullif(btrim(coalesce(notes, '')), '')
  where id = target_batch_id and status in ('staged', 'in_review', 'needs_changes');
  if not found then raise exception 'import batch cannot be reviewed in its current state'; end if;
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
  if exists (select 1 from public.cke_import_questions where batch_id = target_batch_id and question_type <> 'single_choice') then
    raise exception 'current student UI can publish only single_choice questions; other types remain safely staged';
  end if;

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
  numeric_question_number integer;
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
    insert into public.practice_questions (
      id, source_type, source_label, exam_year, subject, topic, prompt, options,
      correct_answer, explanation, difficulty, is_published, sort_order,
      exam_paper_id, paper_question_number
    ) values (
      imported_question.stable_id, 'cke', batch.source_label, batch.exam_year, batch.subject,
      imported_question.topic, imported_question.prompt_markdown, imported_question.answer_options,
      (imported_question.answer_key ->> 'correct_index')::smallint, imported_question.explanation,
      imported_question.difficulty, true, imported_question.sort_order,
      batch.paper_id, numeric_question_number
    ) on conflict (id) do update set
      source_type = excluded.source_type, source_label = excluded.source_label, exam_year = excluded.exam_year,
      subject = excluded.subject, topic = excluded.topic, prompt = excluded.prompt, options = excluded.options,
      correct_answer = excluded.correct_answer, explanation = excluded.explanation,
      difficulty = excluded.difficulty, is_published = true, sort_order = excluded.sort_order,
      exam_paper_id = excluded.exam_paper_id, paper_question_number = excluded.paper_question_number,
      updated_at = now();
  end loop;

  update public.practice_questions q set is_published = false
  where q.exam_paper_id = batch.paper_id
    and not exists (
      select 1 from public.cke_import_questions iq
      where iq.batch_id = target_batch_id and iq.stable_id = q.id
    );
  update public.cke_import_batches set status = 'superseded'
  where paper_id = batch.paper_id and id <> target_batch_id and status in ('imported', 'published');
  update public.cke_import_batches set status = 'published' where id = target_batch_id;
end;
$$;

create or replace function public.withdraw_cke_exam_paper(target_batch_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.cke_import_batches%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then raise exception 'admin or service role required'; end if;
  if char_length(btrim(coalesce(reason, ''))) < 10 then raise exception 'withdrawal reason is required'; end if;
  select * into batch from public.cke_import_batches
  where id = target_batch_id and status in ('imported', 'published') for update;
  if not found then raise exception 'imported or published batch required'; end if;
  if batch.status = 'published' then
    update public.practice_questions set is_published = false where exam_paper_id = batch.paper_id;
    update public.exam_papers set is_published = false where id = batch.paper_id;
  end if;
  update public.cke_import_batches set status = 'withdrawn', review_notes = btrim(reason) where id = target_batch_id;
end;
$$;

revoke all on function public.stage_cke_import(jsonb, text) from public;
revoke all on function public.review_cke_import_question(uuid, text, text, text) from public;
revoke all on function public.review_cke_import_batch(uuid, text, text) from public;
revoke all on function public.promote_cke_import_batch(uuid) from public;
revoke all on function public.publish_cke_exam_paper(uuid) from public;
revoke all on function public.withdraw_cke_exam_paper(uuid, text) from public;
grant execute on function public.stage_cke_import(jsonb, text) to authenticated, service_role;
grant execute on function public.review_cke_import_question(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.review_cke_import_batch(uuid, text, text) to authenticated, service_role;
grant execute on function public.promote_cke_import_batch(uuid) to authenticated, service_role;
grant execute on function public.publish_cke_exam_paper(uuid) to authenticated, service_role;
grant execute on function public.withdraw_cke_exam_paper(uuid, text) to authenticated, service_role;
