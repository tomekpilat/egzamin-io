-- Complimentary Plus access granted with internal promotional codes.
-- Codes are normalized and SHA-256 hashed; plaintext codes are never stored.

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  drop constraint if exists profiles_plan_source_check;
alter table public.profiles
  add constraint profiles_plan_source_check
  check (plan_source in ('manual', 'stripe', 'promo'));

create table if not exists public.plus_promo_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  code_hint text not null check (char_length(code_hint) between 7 and 12),
  label text not null check (char_length(trim(label)) between 3 and 120),
  access_valid_until timestamptz not null,
  valid_from timestamptz not null default now(),
  redeem_by timestamptz not null,
  max_redemptions integer not null default 1 check (max_redemptions between 1 and 10000),
  redemption_count integer not null default 0 check (redemption_count between 0 and max_redemptions),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (redeem_by >= valid_from),
  check (access_valid_until > valid_from)
);

create index if not exists plus_promo_codes_active_idx
  on public.plus_promo_codes (active, redeem_by, access_valid_until);

create table if not exists public.plus_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.plus_promo_codes(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  redeemed_by uuid not null references public.profiles(id) on delete restrict,
  access_valid_until timestamptz not null,
  redeemed_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revocation_reason text check (revocation_reason is null or char_length(trim(revocation_reason)) between 3 and 240),
  unique (promo_code_id, student_id)
);

create index if not exists plus_promo_redemptions_student_access_idx
  on public.plus_promo_redemptions (student_id, access_valid_until desc)
  where revoked_at is null;

create table if not exists public.plus_promo_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  successful boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index if not exists plus_promo_attempts_rate_limit_idx
  on public.plus_promo_attempts (user_id, attempted_at desc);

alter table public.plus_promo_codes enable row level security;
alter table public.plus_promo_redemptions enable row level security;
alter table public.plus_promo_attempts enable row level security;
revoke all on public.plus_promo_codes from anon, authenticated;
revoke all on public.plus_promo_redemptions from anon, authenticated;
revoke all on public.plus_promo_attempts from anon, authenticated;

create or replace function public.normalize_plus_promo_code(raw_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(trim(coalesce(raw_code, '')), '[^A-Z0-9]', '', 'g'));
$$;

create or replace function public.hash_plus_promo_code(raw_code text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(convert_to(public.normalize_plus_promo_code(raw_code), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.recompute_student_plan(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stripe_valid_until timestamptz;
  promo_valid_until timestamptz;
  current_plan text;
  current_source text;
  current_valid_until timestamptz;
begin
  select plan_tier, plan_source, plan_valid_until
  into current_plan, current_source, current_valid_until
  from public.profiles
  where id = target_student_id and role = 'student'
  for update;
  if not found then raise exception 'student profile required'; end if;

  -- An explicit manual grant remains authoritative while it is active.
  if current_plan = 'plus' and current_source = 'manual'
     and (current_valid_until is null or current_valid_until > now()) then
    return;
  end if;

  select max(access_valid_until) into stripe_valid_until
  from public.payment_orders
  where student_id = target_student_id
    and status in ('paid', 'partially_refunded')
    and amount_refunded < amount_total
    and access_valid_until > now();

  select max(access_valid_until) into promo_valid_until
  from public.plus_promo_redemptions
  where student_id = target_student_id
    and revoked_at is null
    and access_valid_until > now();

  if stripe_valid_until is not null
     and (promo_valid_until is null or stripe_valid_until >= promo_valid_until) then
    update public.profiles
    set plan_tier = 'plus', plan_source = 'stripe', plan_valid_until = stripe_valid_until, updated_at = now()
    where id = target_student_id;
  elsif promo_valid_until is not null then
    update public.profiles
    set plan_tier = 'plus', plan_source = 'promo', plan_valid_until = promo_valid_until, updated_at = now()
    where id = target_student_id;
  else
    update public.profiles
    set plan_tier = 'free', plan_source = 'manual', plan_valid_until = null, updated_at = now()
    where id = target_student_id;
  end if;
end;
$$;

-- Preserve the function called by Stripe webhooks while using the unified entitlement calculation.
create or replace function public.recompute_stripe_student_plan(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_student_plan(target_student_id);
end;
$$;

create or replace function public.create_plus_promo_code(
  raw_code text,
  code_label text,
  target_access_valid_until timestamptz,
  target_max_redemptions integer default 1,
  target_redeem_by timestamptz default null
)
returns table (promo_code_id uuid, code_hint text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_code text := public.normalize_plus_promo_code(raw_code);
  created_code public.plus_promo_codes%rowtype;
  effective_redeem_by timestamptz := coalesce(target_redeem_by, target_access_valid_until);
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (select public.is_egzaminio_admin()) then
    raise exception 'admin or service role required';
  end if;
  if char_length(normalized_code) < 10 or char_length(normalized_code) > 64 then
    raise exception 'promo code must contain 10 to 64 letters or digits';
  end if;
  if char_length(trim(coalesce(code_label, ''))) not between 3 and 120 then
    raise exception 'promo label must contain 3 to 120 characters';
  end if;
  if target_access_valid_until <= now() then raise exception 'future access end required'; end if;
  if effective_redeem_by <= now() or effective_redeem_by > target_access_valid_until then
    raise exception 'redemption end must be in the future and not later than access end';
  end if;
  if target_max_redemptions not between 1 and 10000 then raise exception 'invalid redemption limit'; end if;

  insert into public.plus_promo_codes (
    code_hash, code_hint, label, access_valid_until, redeem_by,
    max_redemptions, created_by
  ) values (
    public.hash_plus_promo_code(normalized_code),
    left(normalized_code, 4) || '…' || right(normalized_code, 2),
    trim(code_label), target_access_valid_until, effective_redeem_by,
    target_max_redemptions, (select auth.uid())
  ) returning * into created_code;

  return query select created_code.id, created_code.code_hint;
end;
$$;

create or replace function public.redeem_plus_promo_code(
  raw_code text,
  target_student_id uuid default null
)
returns table (result_code text, granted_plan text, access_valid_until timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  effective_student_id uuid;
  normalized_code text := public.normalize_plus_promo_code(raw_code);
  target_code public.plus_promo_codes%rowtype;
  attempt_id bigint;
  current_plan text;
  current_valid_until timestamptz;
begin
  if actor_id is null then raise exception 'authentication required'; end if;
  select role into actor_role from public.profiles where id = actor_id and onboarding_completed;
  if not found then raise exception 'active profile required'; end if;

  if actor_role = 'student' then
    effective_student_id := actor_id;
    if target_student_id is not null and target_student_id <> actor_id then raise exception 'student can redeem only for self'; end if;
  elsif actor_role = 'parent' then
    effective_student_id := target_student_id;
    if effective_student_id is null or not exists (
      select 1 from public.student_guardians
      where guardian_id = actor_id and student_id = effective_student_id
    ) then raise exception 'linked child required'; end if;
  else
    raise exception 'student or parent profile required';
  end if;

  -- Opportunistic retention cleanup; the log never contains the submitted code.
  delete from public.plus_promo_attempts
  where attempted_at < now() - interval '30 days';

  if (select count(*) from public.plus_promo_attempts
      where user_id = actor_id and attempted_at >= now() - interval '15 minutes') >= 10 then
    return query select 'rate_limited'::text, 'free'::text, null::timestamptz;
    return;
  end if;

  insert into public.plus_promo_attempts (user_id, student_id)
  values (actor_id, effective_student_id)
  returning id into attempt_id;

  if char_length(normalized_code) < 10 or char_length(normalized_code) > 64 then
    return query select 'invalid_code'::text, 'free'::text, null::timestamptz;
    return;
  end if;

  select * into target_code
  from public.plus_promo_codes
  where code_hash = public.hash_plus_promo_code(normalized_code)
    and active
    and valid_from <= now()
    and redeem_by > now()
    and access_valid_until > now()
  for update;
  if not found then
    return query select 'invalid_code'::text, 'free'::text, null::timestamptz;
    return;
  end if;

  if exists (
    select 1 from public.plus_promo_redemptions
    where promo_code_id = target_code.id and student_id = effective_student_id
  ) then
    return query select 'already_redeemed'::text, 'free'::text, null::timestamptz;
    return;
  end if;

  select plan_tier, plan_valid_until into current_plan, current_valid_until
  from public.profiles
  where id = effective_student_id and role = 'student'
  for update;
  if not found then raise exception 'student profile required'; end if;

  if current_plan = 'plus'
     and (current_valid_until is null or current_valid_until >= target_code.access_valid_until) then
    return query select 'already_active'::text, 'plus'::text, current_valid_until;
    return;
  end if;
  if target_code.redemption_count >= target_code.max_redemptions then
    return query select 'unavailable'::text, 'free'::text, null::timestamptz;
    return;
  end if;

  insert into public.plus_promo_redemptions (
    promo_code_id, student_id, redeemed_by, access_valid_until
  ) values (
    target_code.id, effective_student_id, actor_id, target_code.access_valid_until
  );
  update public.plus_promo_codes
  set redemption_count = redemption_count + 1, updated_at = now()
  where id = target_code.id;
  update public.plus_promo_attempts set successful = true where id = attempt_id;
  perform public.recompute_student_plan(effective_student_id);

  return query select 'redeemed'::text, 'plus'::text, target_code.access_valid_until;
end;
$$;

create or replace function public.get_admin_plus_promo_codes()
returns table (
  promo_code_id uuid,
  code_hint text,
  code_label text,
  access_valid_until timestamptz,
  redeem_by timestamptz,
  max_redemptions integer,
  redemption_count integer,
  active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  return query
  select codes.id, codes.code_hint, codes.label, codes.access_valid_until,
         codes.redeem_by, codes.max_redemptions, codes.redemption_count,
         codes.active, codes.created_at
  from public.plus_promo_codes codes
  order by codes.created_at desc;
end;
$$;

create or replace function public.set_plus_promo_code_active(
  target_promo_code_id uuid,
  next_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;
  update public.plus_promo_codes
  set active = next_active, updated_at = now()
  where id = target_promo_code_id;
  if not found then raise exception 'promo code not found'; end if;
end;
$$;

revoke all on function public.normalize_plus_promo_code(text) from public;
revoke all on function public.hash_plus_promo_code(text) from public;
revoke all on function public.recompute_student_plan(uuid) from public;
revoke all on function public.recompute_stripe_student_plan(uuid) from public;
revoke all on function public.create_plus_promo_code(text, text, timestamptz, integer, timestamptz) from public;
revoke all on function public.redeem_plus_promo_code(text, uuid) from public;
revoke all on function public.get_admin_plus_promo_codes() from public;
revoke all on function public.set_plus_promo_code_active(uuid, boolean) from public;

grant execute on function public.recompute_student_plan(uuid) to service_role;
grant execute on function public.create_plus_promo_code(text, text, timestamptz, integer, timestamptz) to authenticated, service_role;
grant execute on function public.redeem_plus_promo_code(text, uuid) to authenticated;
grant execute on function public.get_admin_plus_promo_codes() to authenticated;
grant execute on function public.set_plus_promo_code_active(uuid, boolean) to authenticated;
