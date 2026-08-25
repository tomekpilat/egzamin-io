-- Authenticated feedback with server-side validation, rate limiting and admin workflow.

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_role text not null check (user_role in ('student', 'parent', 'teacher', 'admin')),
  category text not null check (category in ('technical', 'question_error', 'idea', 'other')),
  rating smallint check (rating is null or rating between 1 and 5),
  message text not null check (char_length(message) between 20 and 2000),
  contact_email text,
  contact_consent boolean not null default false,
  question_id text references public.practice_questions(id) on delete set null,
  exam_paper_id text references public.exam_papers(id) on delete set null,
  page_path text not null check (char_length(page_path) between 1 and 300),
  screen_context text not null check (char_length(screen_context) between 1 and 100),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (contact_consent or contact_email is null)
);

create index if not exists user_feedback_admin_queue_idx
  on public.user_feedback (status, created_at desc);
create index if not exists user_feedback_rate_limit_idx
  on public.user_feedback (user_id, created_at desc);

drop trigger if exists set_user_feedback_updated_at on public.user_feedback;
create trigger set_user_feedback_updated_at
before update on public.user_feedback
for each row execute function public.set_updated_at();

alter table public.user_feedback enable row level security;
revoke all on public.user_feedback from anon, authenticated;

create or replace function public.submit_user_feedback(
  feedback_category text,
  feedback_rating integer,
  feedback_message text,
  feedback_contact_email text,
  feedback_contact_consent boolean,
  feedback_page_path text,
  feedback_screen_context text,
  target_question_id text default null
)
returns table (feedback_reference uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_role text;
  normalized_message text := btrim(coalesce(feedback_message, ''));
  normalized_email text := nullif(lower(btrim(coalesce(feedback_contact_email, ''))), '');
  linked_paper_id text;
  created_id uuid;
begin
  select p.role into current_role
  from public.profiles p
  where p.id = current_user_id and p.onboarding_completed;
  if not found then raise exception 'active profile required'; end if;

  if feedback_category not in ('technical', 'question_error', 'idea', 'other') then
    raise exception 'invalid feedback category';
  end if;
  if feedback_rating is not null and feedback_rating not between 1 and 5 then
    raise exception 'rating must be between 1 and 5';
  end if;
  if char_length(normalized_message) not between 20 and 2000 then
    raise exception 'feedback message must contain 20 to 2000 characters';
  end if;
  if char_length(coalesce(feedback_page_path, '')) not between 1 and 300
     or left(feedback_page_path, 1) <> '/' then
    raise exception 'invalid page path';
  end if;
  if char_length(coalesce(feedback_screen_context, '')) not between 1 and 100 then
    raise exception 'invalid screen context';
  end if;
  if feedback_contact_consent and (
    normalized_email is null
    or normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ) then
    raise exception 'valid contact email required';
  end if;
  if not feedback_contact_consent then normalized_email := null; end if;

  -- Serialize submissions for one account so concurrent requests cannot bypass the limit.
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));
  if (
    select count(*) from public.user_feedback f
    where f.user_id = current_user_id and f.created_at >= now() - interval '10 minutes'
  ) >= 3 then
    raise exception 'feedback rate limit exceeded';
  end if;

  if target_question_id is not null then
    select q.exam_paper_id into linked_paper_id
    from public.practice_questions q
    where q.id = target_question_id and q.is_published;
    if not found then raise exception 'published question not found'; end if;
  end if;

  insert into public.user_feedback (
    user_id, user_role, category, rating, message, contact_email, contact_consent,
    question_id, exam_paper_id, page_path, screen_context
  ) values (
    current_user_id, current_role, feedback_category, feedback_rating, normalized_message,
    normalized_email, feedback_contact_consent, target_question_id, linked_paper_id,
    feedback_page_path, feedback_screen_context
  ) returning id into created_id;

  return query select created_id;
end;
$$;

create or replace function public.get_admin_feedback(requested_limit integer default 50)
returns table (
  feedback_id uuid,
  feedback_user_id uuid,
  feedback_user_role text,
  feedback_category text,
  feedback_rating smallint,
  feedback_message text,
  feedback_contact_email text,
  feedback_question_id text,
  feedback_exam_paper_id text,
  feedback_page_path text,
  feedback_screen_context text,
  feedback_status text,
  feedback_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  if requested_limit not between 1 and 100 then raise exception 'limit must be between 1 and 100'; end if;

  return query
  select f.id, f.user_id, f.user_role, f.category, f.rating, f.message,
         f.contact_email, f.question_id, f.exam_paper_id, f.page_path,
         f.screen_context, f.status, f.created_at
  from public.user_feedback f
  order by case f.status when 'new' then 1 when 'reviewing' then 2 else 3 end,
           f.created_at desc
  limit requested_limit;
end;
$$;

create or replace function public.update_feedback_status(
  target_feedback_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  if next_status not in ('new', 'reviewing', 'resolved', 'rejected') then
    raise exception 'invalid feedback status';
  end if;

  update public.user_feedback
  set status = next_status,
      resolved_at = case when next_status in ('resolved', 'rejected') then now() else null end
  where id = target_feedback_id;
  if not found then raise exception 'feedback not found'; end if;
end;
$$;

revoke all on function public.submit_user_feedback(text, integer, text, text, boolean, text, text, text) from public;
revoke all on function public.get_admin_feedback(integer) from public;
revoke all on function public.update_feedback_status(uuid, text) from public;
grant execute on function public.submit_user_feedback(text, integer, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.get_admin_feedback(integer) to authenticated;
grant execute on function public.update_feedback_status(uuid, text) to authenticated;
