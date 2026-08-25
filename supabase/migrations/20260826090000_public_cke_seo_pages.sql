-- Explicit publication gate for indexable, long-tail CKE solution pages.
-- Nothing becomes public merely because an exercise is available to signed-in students.

create table if not exists public.cke_seo_publications (
  batch_id uuid not null,
  stable_id text not null,
  canonical_path text not null unique check (canonical_path ~ '^/arkusze/[0-9]{4}/(matematyka|jezyk-polski|jezyk-angielski)/(glowny|dodatkowy)/[a-z0-9-]+/zadanie/[0-9]+$'),
  common_mistakes jsonb not null check (jsonb_typeof(common_mistakes) = 'array' and jsonb_array_length(common_mistakes) > 0),
  related_topic text not null check (char_length(btrim(related_topic)) >= 3),
  reviewed_by text not null check (char_length(btrim(reviewed_by)) >= 2),
  reviewed_at timestamptz not null,
  is_indexable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (batch_id, stable_id),
  foreign key (batch_id, stable_id)
    references public.cke_import_questions(batch_id, stable_id)
    on delete cascade
);

create index if not exists cke_seo_publications_index_idx
  on public.cke_seo_publications (is_indexable, updated_at desc);

drop trigger if exists set_cke_seo_publications_updated_at on public.cke_seo_publications;
create trigger set_cke_seo_publications_updated_at
before update on public.cke_seo_publications
for each row execute function public.set_updated_at();

alter table public.cke_seo_publications enable row level security;
revoke all on public.cke_seo_publications from anon, authenticated;

create or replace function public.publish_cke_seo_page(
  target_batch_id uuid,
  target_stable_id text,
  target_common_mistakes jsonb,
  target_related_topic text,
  target_reviewed_by text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.cke_import_batches%rowtype;
  question public.cke_import_questions%rowtype;
  subject_slug text;
  session_slug text;
  generated_path text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then
    raise exception 'admin or service role required';
  end if;
  if jsonb_typeof(target_common_mistakes) <> 'array' or jsonb_array_length(target_common_mistakes) = 0 then
    raise exception 'at least one reviewed common mistake is required';
  end if;
  if char_length(btrim(coalesce(target_related_topic, ''))) < 3
     or char_length(btrim(coalesce(target_reviewed_by, ''))) < 2 then
    raise exception 'related topic and reviewer are required';
  end if;

  select * into batch from public.cke_import_batches
  where id = target_batch_id and status = 'published';
  if not found then raise exception 'published CKE batch required'; end if;

  select * into question from public.cke_import_questions
  where batch_id = target_batch_id
    and stable_id = target_stable_id
    and review_status = 'approved';
  if not found then raise exception 'approved CKE question required'; end if;
  if char_length(btrim(question.explanation)) < 80 then
    raise exception 'reviewed step-by-step explanation must contain at least 80 characters';
  end if;
  if question.scoring = '{}'::jsonb then raise exception 'official scoring criteria are required'; end if;
  if question.question_number !~ '^[0-9]+$' then raise exception 'only stable whole-number questions are indexable'; end if;

  subject_slug := case batch.subject
    when 'mathematics' then 'matematyka'
    when 'polish' then 'jezyk-polski'
    when 'english' then 'jezyk-angielski'
  end;
  session_slug := case batch.exam_session when 'main' then 'glowny' else 'dodatkowy' end;
  generated_path := format('/arkusze/%s/%s/%s/%s/zadanie/%s',
    batch.exam_year, subject_slug, session_slug, batch.paper_id, question.question_number);

  insert into public.cke_seo_publications (
    batch_id, stable_id, canonical_path, common_mistakes, related_topic,
    reviewed_by, reviewed_at, is_indexable
  ) values (
    target_batch_id, target_stable_id, generated_path, target_common_mistakes,
    btrim(target_related_topic), btrim(target_reviewed_by), now(), true
  ) on conflict (batch_id, stable_id) do update set
    canonical_path = excluded.canonical_path,
    common_mistakes = excluded.common_mistakes,
    related_topic = excluded.related_topic,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    is_indexable = true,
    updated_at = now();

  return generated_path;
end;
$$;

create or replace function public.withdraw_cke_seo_page(target_batch_id uuid, target_stable_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then
    raise exception 'admin or service role required';
  end if;
  update public.cke_seo_publications
  set is_indexable = false
  where batch_id = target_batch_id and stable_id = target_stable_id;
end;
$$;

create or replace function public.list_public_cke_seo_pages()
returns table (canonical_path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select publication.canonical_path, publication.updated_at
  from public.cke_seo_publications publication
  join public.cke_import_batches batch on batch.id = publication.batch_id and batch.status = 'published'
  join public.cke_import_questions imported on imported.batch_id = publication.batch_id and imported.stable_id = publication.stable_id and imported.review_status = 'approved'
  join public.exam_papers paper on paper.id = batch.paper_id and paper.is_published
  join public.practice_questions question on question.id = imported.stable_id and question.is_published and question.source_type = 'cke'
  where publication.is_indexable
  order by publication.canonical_path;
$$;

create or replace function public.get_public_cke_seo_page(target_canonical_path text)
returns table (
  canonical_path text,
  updated_at timestamptz,
  exam_year integer,
  exam_session text,
  subject text,
  variant_code text,
  source_label text,
  source_url text,
  source_page_from integer,
  source_page_to integer,
  question_number text,
  topic text,
  prompt_markdown text,
  answer_options jsonb,
  answer_key jsonb,
  scoring jsonb,
  explanation text,
  common_mistakes jsonb,
  related_topic text
)
language sql
stable
security definer
set search_path = public
as $$
  select publication.canonical_path, publication.updated_at,
         batch.exam_year, batch.exam_session, batch.subject, batch.variant_code,
         batch.source_label, batch.source_url,
         imported.source_page_from, imported.source_page_to, imported.question_number,
         imported.topic, imported.prompt_markdown, imported.answer_options,
         imported.answer_key, imported.scoring, imported.explanation,
         publication.common_mistakes, publication.related_topic
  from public.cke_seo_publications publication
  join public.cke_import_batches batch on batch.id = publication.batch_id and batch.status = 'published'
  join public.cke_import_questions imported on imported.batch_id = publication.batch_id and imported.stable_id = publication.stable_id and imported.review_status = 'approved'
  join public.exam_papers paper on paper.id = batch.paper_id and paper.is_published
  join public.practice_questions question on question.id = imported.stable_id and question.is_published and question.source_type = 'cke'
  where publication.is_indexable and publication.canonical_path = target_canonical_path;
$$;

revoke all on function public.publish_cke_seo_page(uuid, text, jsonb, text, text) from public;
revoke all on function public.withdraw_cke_seo_page(uuid, text) from public;
revoke all on function public.list_public_cke_seo_pages() from public;
revoke all on function public.get_public_cke_seo_page(text) from public;
grant execute on function public.publish_cke_seo_page(uuid, text, jsonb, text, text) to authenticated, service_role;
grant execute on function public.withdraw_cke_seo_page(uuid, text) to authenticated, service_role;
grant execute on function public.list_public_cke_seo_pages() to anon, authenticated;
grant execute on function public.get_public_cke_seo_page(text) to anon, authenticated;
