-- Add every foreign language offered in the standard CKE eighth-grade exam.

alter table public.practice_questions drop constraint if exists practice_questions_subject_check;
alter table public.practice_questions add constraint practice_questions_subject_check
  check (subject in ('mathematics', 'polish', 'english', 'french', 'spanish', 'german', 'russian', 'italian'));

alter table public.exam_papers drop constraint if exists exam_papers_subject_check;
alter table public.exam_papers add constraint exam_papers_subject_check
  check (subject in ('mathematics', 'polish', 'english', 'french', 'spanish', 'german', 'russian', 'italian'));

alter table public.cke_import_batches drop constraint if exists cke_import_batches_subject_check;
alter table public.cke_import_batches add constraint cke_import_batches_subject_check
  check (subject in ('mathematics', 'polish', 'english', 'french', 'spanish', 'german', 'russian', 'italian'));

alter table public.cke_seo_publications drop constraint if exists cke_seo_publications_canonical_path_check;
alter table public.cke_seo_publications add constraint cke_seo_publications_canonical_path_check
  check (canonical_path ~ '^/arkusze/[0-9]{4}/(matematyka|jezyk-polski|jezyk-angielski|jezyk-francuski|jezyk-hiszpanski|jezyk-niemiecki|jezyk-rosyjski|jezyk-wloski)/(glowny|dodatkowy)/[a-z0-9-]+/zadanie/[0-9]+$');

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
    when 'french' then 'jezyk-francuski'
    when 'spanish' then 'jezyk-hiszpanski'
    when 'german' then 'jezyk-niemiecki'
    when 'russian' then 'jezyk-rosyjski'
    when 'italian' then 'jezyk-wloski'
  end;
  if subject_slug is null then raise exception 'unsupported CKE subject: %', batch.subject; end if;
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
