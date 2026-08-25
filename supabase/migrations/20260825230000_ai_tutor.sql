-- Reviewed AI explanations and server-enforced tutor usage for students.

alter table public.profiles
  add column if not exists plan_tier text not null default 'free'
    check (plan_tier in ('free', 'plus')),
  add column if not exists plan_valid_until timestamptz;

create table if not exists public.ai_question_explanations (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.practice_questions(id) on delete cascade,
  version integer not null check (version > 0),
  solution_steps jsonb not null check (jsonb_typeof(solution_steps) = 'array' and jsonb_array_length(solution_steps) > 0),
  hints jsonb not null check (jsonb_typeof(hints) = 'array' and jsonb_array_length(hints) > 0),
  final_explanation text not null check (char_length(final_explanation) between 10 and 8000),
  answer_key_snapshot jsonb not null check (jsonb_typeof(answer_key_snapshot) = 'object'),
  status text not null default 'generated'
    check (status in ('generated', 'in_review', 'approved', 'rejected', 'withdrawn')),
  model text not null check (char_length(model) between 2 and 120),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text,
  updated_at timestamptz not null default now(),
  unique (question_id, version)
);

create unique index if not exists ai_question_explanations_one_approved_idx
  on public.ai_question_explanations (question_id) where status = 'approved';
create index if not exists ai_question_explanations_review_idx
  on public.ai_question_explanations (status, generated_at);

drop trigger if exists set_ai_question_explanations_updated_at on public.ai_question_explanations;
create trigger set_ai_question_explanations_updated_at before update on public.ai_question_explanations
for each row execute function public.set_updated_at();

create table if not exists public.ai_tutor_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.practice_questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, question_id)
);

drop trigger if exists set_ai_tutor_threads_updated_at on public.ai_tutor_threads;
create trigger set_ai_tutor_threads_updated_at before update on public.ai_tutor_threads
for each row execute function public.set_updated_at();

create table if not exists public.ai_tutor_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.practice_questions(id) on delete cascade,
  thread_id uuid not null references public.ai_tutor_threads(id) on delete cascade,
  request_date date not null default ((now() at time zone 'utc')::date),
  user_message text not null check (char_length(user_message) between 2 and 600),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'failed')),
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cache_hit_input_tokens integer not null default 0 check (cache_hit_input_tokens >= 0),
  cost_microusd bigint not null default 0 check (cost_microusd >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_tutor_requests_quota_idx
  on public.ai_tutor_requests (student_id, request_date, status);
create index if not exists ai_tutor_requests_monitoring_idx
  on public.ai_tutor_requests (requested_at desc, status);

create table if not exists public.ai_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_tutor_threads(id) on delete cascade,
  request_id uuid not null references public.ai_tutor_requests(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists ai_tutor_messages_thread_idx
  on public.ai_tutor_messages (thread_id, created_at);

create table if not exists public.ai_usage_daily (
  student_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  reserved_count integer not null default 0 check (reserved_count >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  cache_hit_input_tokens bigint not null default 0 check (cache_hit_input_tokens >= 0),
  cost_microusd bigint not null default 0 check (cost_microusd >= 0),
  latency_ms_total bigint not null default 0 check (latency_ms_total >= 0),
  updated_at timestamptz not null default now(),
  primary key (student_id, usage_date)
);

alter table public.ai_question_explanations enable row level security;
alter table public.ai_tutor_threads enable row level security;
alter table public.ai_tutor_requests enable row level security;
alter table public.ai_tutor_messages enable row level security;
alter table public.ai_usage_daily enable row level security;

revoke all on public.ai_question_explanations from anon, authenticated;
revoke all on public.ai_tutor_threads from anon, authenticated;
revoke all on public.ai_tutor_requests from anon, authenticated;
revoke all on public.ai_tutor_messages from anon, authenticated;
revoke all on public.ai_usage_daily from anon, authenticated;

-- Existing editorial explanations are explicitly approved starter context.
-- Imported CKE questions added later require their own reviewed version.
insert into public.ai_question_explanations (
  question_id, version, solution_steps, hints, final_explanation,
  answer_key_snapshot, status, model, reviewed_at, review_notes
)
select
  q.id,
  1,
  jsonb_build_array(q.explanation),
  case q.subject
    when 'mathematics' then jsonb_build_array('Nazwij dane i niewiadomą.', 'Wybierz działanie lub wzór pasujący do treści.', 'Sprawdź wynik w treści zadania.')
    when 'polish' then jsonb_build_array('Znajdź w tekście słowo lub fragment będący dowodem.', 'Nazwij zasadę językową albo środek stylistyczny.', 'Porównaj wniosek z każdą odpowiedzią.')
    else jsonb_build_array('Znajdź słowo wskazujące czas lub funkcję językową.', 'Przypomnij sobie właściwą regułę.', 'Przeczytaj całe zdanie z wybraną odpowiedzią.')
  end,
  q.explanation,
  jsonb_build_object('correct_index', q.correct_answer),
  'approved',
  'editorial-seed-v1',
  now(),
  'Istniejące autorskie wyjaśnienie zatwierdzone jako kontekst startowy.'
from public.practice_questions q
where q.is_published
on conflict (question_id, version) do nothing;

create or replace function public.create_ai_explanation_draft(
  target_question_id text,
  generated_steps jsonb,
  generated_hints jsonb,
  generated_explanation text,
  generator_model text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_id uuid;
  next_version integer;
  correct_index smallint;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then
    raise exception 'admin or service role required';
  end if;
  if jsonb_typeof(generated_steps) <> 'array' or jsonb_array_length(generated_steps) = 0
     or jsonb_typeof(generated_hints) <> 'array' or jsonb_array_length(generated_hints) = 0 then
    raise exception 'steps and hints are required';
  end if;
  select q.correct_answer into correct_index from public.practice_questions q where q.id = target_question_id;
  if not found then raise exception 'question not found'; end if;
  select coalesce(max(e.version), 0) + 1 into next_version
  from public.ai_question_explanations e where e.question_id = target_question_id;
  insert into public.ai_question_explanations (
    question_id, version, solution_steps, hints, final_explanation,
    answer_key_snapshot, status, model
  ) values (
    target_question_id, next_version, generated_steps, generated_hints,
    btrim(generated_explanation), jsonb_build_object('correct_index', correct_index),
    'generated', btrim(generator_model)
  ) returning id into draft_id;
  return draft_id;
end;
$$;

create or replace function public.review_ai_explanation(
  target_explanation_id uuid,
  decision text,
  notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  explanation_record public.ai_question_explanations%rowtype;
  current_correct_index smallint;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then
    raise exception 'admin or service role required';
  end if;
  if decision not in ('submit', 'approve', 'reject', 'withdraw') then raise exception 'invalid review decision'; end if;
  select * into explanation_record from public.ai_question_explanations
  where id = target_explanation_id for update;
  if not found then raise exception 'explanation not found'; end if;

  if decision = 'approve' then
    if explanation_record.status <> 'in_review' then raise exception 'explanation must be in review'; end if;
    select q.correct_answer into current_correct_index from public.practice_questions q where q.id = explanation_record.question_id;
    if current_correct_index is null
       or (explanation_record.answer_key_snapshot ->> 'correct_index')::smallint <> current_correct_index then
      raise exception 'answer key changed; regenerate explanation';
    end if;
    update public.ai_question_explanations
    set status = 'withdrawn', review_notes = 'Zastąpione zatwierdzoną nowszą wersją.'
    where question_id = explanation_record.question_id and status = 'approved' and id <> target_explanation_id;
  end if;

  update public.ai_question_explanations
  set status = case decision
      when 'submit' then 'in_review'
      when 'approve' then 'approved'
      when 'reject' then 'rejected'
      else 'withdrawn'
    end,
    reviewed_at = case when decision in ('approve', 'reject', 'withdraw') then now() else reviewed_at end,
    reviewed_by = case when auth.role() = 'service_role' then reviewed_by else (select auth.uid()) end,
    review_notes = nullif(btrim(coalesce(notes, '')), '')
  where id = target_explanation_id;
end;
$$;

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
  if not exists (select 1 from public.practice_questions q where q.id = target_question_id and q.is_published) then
    raise exception 'published question not found';
  end if;
  limit_value := case when plan_name = 'plus' then 50 else 3 end;
  select t.id into thread_value from public.ai_tutor_threads t
  where t.student_id = requested_student_id and t.question_id = target_question_id;

  return query
  select
    coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'content', m.content, 'created_at', m.created_at) order by m.created_at)
      from public.ai_tutor_messages m where m.thread_id = thread_value
    ), '[]'::jsonb),
    coalesce((select u.reserved_count from public.ai_usage_daily u where u.student_id = requested_student_id and u.usage_date = (now() at time zone 'utc')::date), 0),
    limit_value,
    plan_name;
end;
$$;

create or replace function public.reserve_ai_tutor_request(
  requested_student_id uuid,
  target_question_id text,
  student_message text
)
returns table (
  reserved_request_id uuid,
  question_subject text,
  question_topic text,
  question_prompt text,
  question_options jsonb,
  approved_answer_key jsonb,
  approved_solution_steps jsonb,
  approved_hints jsonb,
  approved_final_explanation text,
  chat_history jsonb,
  used_count integer,
  daily_limit integer,
  active_plan text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_name text;
  limit_value integer;
  current_used integer;
  expired_count integer;
  thread_value uuid;
  request_value uuid;
  question_record record;
  explanation_record record;
  history_value jsonb;
  today_utc date := (now() at time zone 'utc')::date;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  if char_length(btrim(student_message)) not between 2 and 600 then raise exception 'invalid message length'; end if;
  select case when p.plan_tier = 'plus' and (p.plan_valid_until is null or p.plan_valid_until > now()) then 'plus' else 'free' end
  into plan_name from public.profiles p
  where p.id = requested_student_id and p.role = 'student' and p.onboarding_completed;
  if not found then raise exception 'active student profile required'; end if;
  limit_value := case when plan_name = 'plus' then 50 else 3 end;

  select q.subject, q.topic, q.prompt, q.options
  into question_record from public.practice_questions q
  where q.id = target_question_id and q.is_published;
  if not found then raise exception 'published question not found'; end if;

  select e.answer_key_snapshot, e.solution_steps, e.hints, e.final_explanation
  into explanation_record from public.ai_question_explanations e
  where e.question_id = target_question_id and e.status = 'approved'
  order by e.version desc limit 1;
  if not found then raise exception 'approved AI explanation required'; end if;

  insert into public.ai_usage_daily (student_id, usage_date)
  values (requested_student_id, today_utc) on conflict do nothing;
  perform 1 from public.ai_usage_daily u
  where u.student_id = requested_student_id and u.usage_date = today_utc for update;

  update public.ai_tutor_requests r
  set status = 'failed', error_code = 'reservation_expired', completed_at = now()
  where r.student_id = requested_student_id and r.request_date = today_utc
    and r.status = 'reserved' and r.requested_at < now() - interval '10 minutes';
  get diagnostics expired_count = row_count;

  select count(*)::integer into current_used from public.ai_tutor_requests r
  where r.student_id = requested_student_id and r.request_date = today_utc
    and r.status in ('reserved', 'completed');
  if current_used >= limit_value then raise exception 'ai_daily_limit_reached'; end if;

  insert into public.ai_tutor_threads (student_id, question_id)
  values (requested_student_id, target_question_id)
  on conflict (student_id, question_id) do update set updated_at = now()
  returning id into thread_value;

  select coalesce(jsonb_agg(jsonb_build_object('role', recent.role, 'content', recent.content) order by recent.created_at), '[]'::jsonb)
  into history_value from (
    select m.role, m.content, m.created_at from public.ai_tutor_messages m
    where m.thread_id = thread_value order by m.created_at desc limit 8
  ) recent;

  insert into public.ai_tutor_requests (student_id, question_id, thread_id, request_date, user_message)
  values (requested_student_id, target_question_id, thread_value, today_utc, btrim(student_message))
  returning id into request_value;

  update public.ai_usage_daily
  set reserved_count = current_used + 1,
      failed_count = failed_count + expired_count,
      updated_at = now()
  where student_id = requested_student_id and usage_date = today_utc;

  return query select request_value, question_record.subject, question_record.topic,
    question_record.prompt, question_record.options, explanation_record.answer_key_snapshot,
    explanation_record.solution_steps, explanation_record.hints, explanation_record.final_explanation,
    history_value, current_used + 1, limit_value, plan_name;
end;
$$;

create or replace function public.complete_ai_tutor_request(
  target_request_id uuid,
  assistant_message text,
  provider_name text,
  model_name text,
  prompt_token_count integer,
  completion_token_count integer,
  cache_hit_token_count integer,
  estimated_cost_microusd bigint,
  response_latency_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.ai_tutor_requests%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  select * into request_record from public.ai_tutor_requests where id = target_request_id for update;
  if not found or request_record.status <> 'reserved' then raise exception 'active reservation required'; end if;
  if char_length(btrim(assistant_message)) not between 1 and 5000 then raise exception 'invalid assistant response'; end if;

  insert into public.ai_tutor_messages (thread_id, request_id, role, content) values
    (request_record.thread_id, request_record.id, 'user', request_record.user_message),
    (request_record.thread_id, request_record.id, 'assistant', btrim(assistant_message));
  update public.ai_tutor_requests set
    status = 'completed', provider = btrim(provider_name), model = btrim(model_name),
    input_tokens = greatest(prompt_token_count, 0), output_tokens = greatest(completion_token_count, 0),
    cache_hit_input_tokens = greatest(cache_hit_token_count, 0),
    cost_microusd = greatest(estimated_cost_microusd, 0), latency_ms = greatest(response_latency_ms, 0),
    completed_at = now()
  where id = target_request_id;
  update public.ai_usage_daily set
    completed_count = completed_count + 1,
    input_tokens = input_tokens + greatest(prompt_token_count, 0),
    output_tokens = output_tokens + greatest(completion_token_count, 0),
    cache_hit_input_tokens = cache_hit_input_tokens + greatest(cache_hit_token_count, 0),
    cost_microusd = cost_microusd + greatest(estimated_cost_microusd, 0),
    latency_ms_total = latency_ms_total + greatest(response_latency_ms, 0),
    updated_at = now()
  where student_id = request_record.student_id and usage_date = request_record.request_date;
end;
$$;

create or replace function public.fail_ai_tutor_request(target_request_id uuid, failure_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.ai_tutor_requests%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  select * into request_record from public.ai_tutor_requests where id = target_request_id for update;
  if not found or request_record.status <> 'reserved' then return; end if;
  update public.ai_tutor_requests set status = 'failed', error_code = left(btrim(failure_code), 100), completed_at = now()
  where id = target_request_id;
  update public.ai_usage_daily set
    reserved_count = greatest(reserved_count - 1, 0), failed_count = failed_count + 1, updated_at = now()
  where student_id = request_record.student_id and usage_date = request_record.request_date;
end;
$$;

create or replace function public.get_ai_usage_metrics(days_back integer default 30)
returns table (
  usage_date date,
  completed_requests bigint,
  failed_requests bigint,
  input_token_count bigint,
  output_token_count bigint,
  estimated_cost_microusd bigint,
  average_latency_ms numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  return query select u.usage_date, sum(u.completed_count)::bigint, sum(u.failed_count)::bigint,
    sum(u.input_tokens)::bigint, sum(u.output_tokens)::bigint, sum(u.cost_microusd)::bigint,
    round(sum(u.latency_ms_total)::numeric / nullif(sum(u.completed_count), 0), 1)
  from public.ai_usage_daily u
  where u.usage_date >= (now() at time zone 'utc')::date - greatest(1, least(days_back, 365))
  group by u.usage_date order by u.usage_date desc;
end;
$$;

create or replace function public.purge_expired_ai_chat_history(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  if retention_days not between 1 and 365 then raise exception 'invalid retention period'; end if;
  delete from public.ai_tutor_requests
  where requested_at < now() - make_interval(days => retention_days);
  get diagnostics removed_count = row_count;
  delete from public.ai_tutor_threads t
  where not exists (select 1 from public.ai_tutor_requests r where r.thread_id = t.id);
  return removed_count;
end;
$$;

revoke all on function public.create_ai_explanation_draft(text, jsonb, jsonb, text, text) from public;
revoke all on function public.review_ai_explanation(uuid, text, text) from public;
revoke all on function public.get_ai_chat_for_student(uuid, text) from public;
revoke all on function public.reserve_ai_tutor_request(uuid, text, text) from public;
revoke all on function public.complete_ai_tutor_request(uuid, text, text, text, integer, integer, integer, bigint, integer) from public;
revoke all on function public.fail_ai_tutor_request(uuid, text) from public;
revoke all on function public.get_ai_usage_metrics(integer) from public;
revoke all on function public.purge_expired_ai_chat_history(integer) from public;

grant execute on function public.create_ai_explanation_draft(text, jsonb, jsonb, text, text) to authenticated, service_role;
grant execute on function public.review_ai_explanation(uuid, text, text) to authenticated, service_role;
grant execute on function public.get_ai_chat_for_student(uuid, text) to service_role;
grant execute on function public.reserve_ai_tutor_request(uuid, text, text) to service_role;
grant execute on function public.complete_ai_tutor_request(uuid, text, text, text, integer, integer, integer, bigint, integer) to service_role;
grant execute on function public.fail_ai_tutor_request(uuid, text) to service_role;
grant execute on function public.get_ai_usage_metrics(integer) to authenticated;
grant execute on function public.purge_expired_ai_chat_history(integer) to service_role;

revoke update (plan_tier, plan_valid_until) on public.profiles from authenticated;
