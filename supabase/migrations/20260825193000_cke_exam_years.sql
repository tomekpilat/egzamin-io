-- Structured CKE paper metadata, year-aware practice catalog and per-paper progress.

create table if not exists public.exam_papers (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  exam_year integer not null check (exam_year between 2019 and 2100),
  exam_session text not null check (exam_session in ('main', 'additional')),
  subject text not null check (subject in ('mathematics', 'polish', 'english')),
  variant_code text not null default 'standard' check (char_length(variant_code) between 1 and 40),
  source_document_id text not null unique check (char_length(source_document_id) between 3 and 160),
  source_label text not null,
  source_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_year, exam_session, subject, variant_code)
);

create index if not exists exam_papers_catalog_idx
  on public.exam_papers (is_published, exam_year desc, subject, exam_session);

drop trigger if exists set_exam_papers_updated_at on public.exam_papers;
create trigger set_exam_papers_updated_at
before update on public.exam_papers
for each row execute function public.set_updated_at();

alter table public.exam_papers enable row level security;
revoke all on public.exam_papers from anon, authenticated;

alter table public.practice_questions
  add column if not exists exam_paper_id text references public.exam_papers(id) on delete restrict,
  add column if not exists paper_question_number integer check (paper_question_number is null or paper_question_number > 0);

drop index if exists public.practice_questions_sort_order_idx;
create index if not exists practice_questions_sort_order_idx
  on public.practice_questions (sort_order);
create unique index if not exists practice_questions_paper_number_idx
  on public.practice_questions (exam_paper_id, paper_question_number)
  where exam_paper_id is not null;
create index if not exists practice_questions_paper_catalog_idx
  on public.practice_questions (exam_paper_id, is_published, paper_question_number);

create or replace function public.validate_practice_question_source()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  paper_year integer;
  paper_subject text;
  paper_label text;
begin
  if new.source_type = 'demo' then
    if new.exam_paper_id is not null or new.exam_year is not null or new.paper_question_number is not null then
      raise exception 'demo questions cannot be assigned to a CKE paper or exam year';
    end if;
    return new;
  end if;

  if new.exam_paper_id is null or new.paper_question_number is null then
    raise exception 'CKE questions require an exam paper and question number';
  end if;

  select p.exam_year, p.subject, p.source_label
    into paper_year, paper_subject, paper_label
  from public.exam_papers p
  where p.id = new.exam_paper_id;
  if not found then raise exception 'exam paper not found'; end if;
  if new.subject <> paper_subject then raise exception 'question subject must match exam paper subject'; end if;

  new.exam_year := paper_year;
  new.source_label := paper_label;
  return new;
end;
$$;

drop trigger if exists validate_practice_question_source on public.practice_questions;
create trigger validate_practice_question_source
before insert or update of source_type, exam_paper_id, exam_year, paper_question_number, subject, source_label
on public.practice_questions
for each row execute function public.validate_practice_question_source();

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
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student' and onboarding_completed
  ) then
    raise exception 'active student profile required';
  end if;

  return query
  select q.id, q.source_type, q.source_label, p.id, p.exam_year, p.exam_session,
         p.variant_code, p.source_document_id, q.paper_question_number,
         q.subject, q.topic, q.prompt, q.options, q.difficulty, q.sort_order,
         a.selected_answer, a.is_correct, coalesce(a.attempt_count, 0),
         case when a.question_id is not null then q.correct_answer else null end,
         case when a.question_id is not null then q.explanation else null end
  from public.practice_questions q
  left join public.exam_papers p on p.id = q.exam_paper_id and p.is_published
  left join public.student_question_attempts a
    on a.question_id = q.id and a.student_id = (select auth.uid())
  where q.is_published
    and (q.source_type = 'demo' or p.id is not null)
  order by case when q.source_type = 'cke' then 0 else 1 end,
           p.exam_year desc nulls last,
           q.subject,
           p.exam_session,
           p.variant_code,
           coalesce(q.paper_question_number, q.sort_order);
end;
$$;

create or replace function public.get_student_paper_progress()
returns table (
  progress_paper_id text,
  exam_year integer,
  exam_session text,
  subject text,
  variant_code text,
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
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student' and onboarding_completed
  ) then
    raise exception 'active student profile required';
  end if;

  return query
  select p.id, p.exam_year, p.exam_session, p.subject, p.variant_code, p.source_label,
         count(q.id)::integer,
         count(a.question_id)::integer,
         count(a.question_id) filter (where a.is_correct)::integer,
         case when count(a.question_id) = 0 then 0
              else round(100.0 * count(a.question_id) filter (where a.is_correct) / count(a.question_id))::integer end,
         case when count(a.question_id) = 0 then 'not_started'
              when count(a.question_id) = count(q.id) then 'completed'
              else 'in_progress' end
  from public.exam_papers p
  join public.practice_questions q
    on q.exam_paper_id = p.id and q.is_published
  left join public.student_question_attempts a
    on a.question_id = q.id and a.student_id = (select auth.uid())
  where p.is_published
  group by p.id, p.exam_year, p.exam_session, p.subject, p.variant_code, p.source_label
  order by p.exam_year desc,
           case p.subject when 'mathematics' then 1 when 'polish' then 2 else 3 end,
           case p.exam_session when 'main' then 1 else 2 end,
           p.variant_code;
end;
$$;

revoke all on function public.get_practice_questions() from public;
revoke all on function public.get_student_paper_progress() from public;
grant execute on function public.get_practice_questions() to authenticated;
grant execute on function public.get_student_paper_progress() to authenticated;
