-- One-time Stripe Checkout orders for a parent purchasing Plus for a linked student.

alter table public.profiles
  add column if not exists plan_source text not null default 'manual'
    check (plan_source in ('manual', 'stripe'));

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  parent_id uuid not null references public.profiles(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  product_code text not null check (product_code = 'plus_package'),
  status text not null default 'draft' check (status in (
    'draft', 'checkout_created', 'processing', 'paid', 'payment_failed',
    'expired', 'partially_refunded', 'refunded', 'disputed', 'chargeback'
  )),
  amount_total integer not null check (amount_total = 14900),
  amount_refunded integer not null default 0 check (amount_refunded between 0 and amount_total),
  currency text not null check (currency = 'pln'),
  access_valid_until timestamptz not null,
  customer_email text not null,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  immediate_access_requested_at timestamptz not null,
  withdrawal_information_acknowledged_at timestamptz not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_customer_id text,
  stripe_charge_id text,
  stripe_invoice_id text,
  receipt_url text,
  hosted_invoice_url text,
  invoice_pdf_url text,
  stripe_event_created_at bigint not null default 0,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (access_valid_until > created_at)
);

create index if not exists payment_orders_parent_history_idx
  on public.payment_orders (parent_id, created_at desc);
create index if not exists payment_orders_student_entitlement_idx
  on public.payment_orders (student_id, status, access_valid_until desc);
create index if not exists payment_orders_payment_intent_idx
  on public.payment_orders (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists payment_orders_charge_idx
  on public.payment_orders (stripe_charge_id) where stripe_charge_id is not null;
create unique index if not exists payment_orders_one_open_checkout_per_student_idx
  on public.payment_orders (student_id)
  where status in ('draft', 'checkout_created', 'processing');

alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from anon, authenticated;

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  event_created_at bigint not null,
  livemode boolean not null,
  payment_order_id uuid not null references public.payment_orders(id) on delete restrict,
  applied boolean not null default false,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

create or replace function public.recompute_stripe_student_plan(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stripe_valid_until timestamptz;
  current_plan text;
  current_source text;
  current_valid_until timestamptz;
begin
  select max(access_valid_until) into stripe_valid_until
  from public.payment_orders
  where student_id = target_student_id
    and status in ('paid', 'partially_refunded')
    and amount_refunded < amount_total
    and access_valid_until > now();

  select plan_tier, plan_source, plan_valid_until
  into current_plan, current_source, current_valid_until
  from public.profiles where id = target_student_id for update;

  if stripe_valid_until is not null then
    if current_plan = 'free'
      or current_source = 'stripe'
      or (current_valid_until is not null and current_valid_until < stripe_valid_until)
    then
      update public.profiles
      set plan_tier = 'plus', plan_source = 'stripe', plan_valid_until = stripe_valid_until
      where id = target_student_id;
    end if;
  elsif current_source = 'stripe' then
    update public.profiles
    set plan_tier = 'free', plan_source = 'manual', plan_valid_until = null
    where id = target_student_id;
  end if;
end;
$$;

create or replace function public.create_parent_payment_order(
  requested_parent_id uuid,
  target_student_id uuid,
  requested_client_request_id uuid,
  requested_customer_email text,
  requested_access_valid_until timestamptz,
  requested_terms_version text
)
returns table (payment_order_id uuid, existing_order boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_order public.payment_orders%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  if requested_access_valid_until <= now() then raise exception 'future access end required'; end if;
  if length(trim(requested_customer_email)) > 320 or position('@' in requested_customer_email) < 2 then raise exception 'valid customer email required'; end if;
  if length(trim(requested_terms_version)) < 8 then raise exception 'terms version required'; end if;
  if not exists (
    select 1 from public.profiles
    where id = requested_parent_id and role = 'parent' and onboarding_completed
  ) then raise exception 'active parent profile required'; end if;
  if not exists (
    select 1 from public.student_guardians
    where guardian_id = requested_parent_id and student_id = target_student_id
  ) then raise exception 'linked child required'; end if;

  perform 1 from public.profiles where id = target_student_id and role = 'student' for update;
  if not found then raise exception 'student profile required'; end if;

  select * into found_order from public.payment_orders
  where client_request_id = requested_client_request_id;
  if found then
    if found_order.parent_id <> requested_parent_id or found_order.student_id <> target_student_id then
      raise exception 'payment request identifier conflict';
    end if;
    return query select found_order.id, true;
    return;
  end if;

  if exists (
    select 1 from public.profiles
    where id = target_student_id and plan_tier = 'plus'
      and (plan_valid_until is null or plan_valid_until > now())
  ) then raise exception 'student already has active Plus access'; end if;

  select * into found_order from public.payment_orders
  where student_id = target_student_id
    and status in ('draft', 'checkout_created', 'processing')
  order by created_at desc
  limit 1;
  if found then
    if found_order.parent_id <> requested_parent_id then raise exception 'payment already in progress for student'; end if;
    return query select found_order.id, true;
    return;
  end if;

  insert into public.payment_orders (
    client_request_id, parent_id, student_id, product_code, status,
    amount_total, currency, access_valid_until, customer_email,
    terms_version, terms_accepted_at, immediate_access_requested_at,
    withdrawal_information_acknowledged_at
  ) values (
    requested_client_request_id, requested_parent_id, target_student_id,
    'plus_package', 'draft', 14900, 'pln', requested_access_valid_until,
    lower(trim(requested_customer_email)), requested_terms_version,
    now(), now(), now()
  ) returning * into found_order;

  return query select found_order.id, false;
end;
$$;

create or replace function public.attach_stripe_checkout_session(
  target_order_id uuid,
  target_checkout_session_id text,
  target_stripe_customer_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  update public.payment_orders
  set stripe_checkout_session_id = target_checkout_session_id,
      stripe_customer_id = coalesce(target_stripe_customer_id, stripe_customer_id),
      status = case when status = 'draft' then 'checkout_created' else status end,
      updated_at = now()
  where id = target_order_id
    and (stripe_checkout_session_id is null or stripe_checkout_session_id = target_checkout_session_id);
  if not found then raise exception 'payment order not found or checkout conflict'; end if;
end;
$$;

create or replace function public.record_stripe_payment_event(
  received_event_id text,
  received_event_type text,
  received_event_created bigint,
  received_livemode boolean,
  target_order_id uuid,
  next_status text,
  received_amount_total integer default null,
  received_amount_refunded integer default null,
  received_currency text default null,
  received_checkout_session_id text default null,
  received_payment_intent_id text default null,
  received_customer_id text default null,
  received_charge_id text default null,
  received_invoice_id text default null,
  received_receipt_url text default null,
  received_hosted_invoice_url text default null,
  received_invoice_pdf_url text default null
)
returns table (event_applied boolean, order_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.payment_orders%rowtype;
  inserted_event boolean := false;
  normalized_status text := next_status;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  if next_status not in ('checkout_created', 'processing', 'paid', 'payment_failed', 'expired', 'partially_refunded', 'refunded', 'disputed', 'chargeback') then
    raise exception 'invalid payment status';
  end if;

  insert into public.stripe_webhook_events (
    stripe_event_id, event_type, event_created_at, livemode, payment_order_id
  ) values (
    received_event_id, received_event_type, received_event_created, received_livemode, target_order_id
  ) on conflict (stripe_event_id) do nothing;
  inserted_event := found;
  if not inserted_event then
    return query select false, status from public.payment_orders where id = target_order_id;
    return;
  end if;

  select * into target_order from public.payment_orders where id = target_order_id for update;
  if not found then raise exception 'payment order not found'; end if;
  if received_amount_total is not null and received_amount_total <> target_order.amount_total then raise exception 'payment amount mismatch'; end if;
  if received_currency is not null and lower(received_currency) <> target_order.currency then raise exception 'payment currency mismatch'; end if;
  if received_checkout_session_id is not null
    and target_order.stripe_checkout_session_id is not null
    and received_checkout_session_id <> target_order.stripe_checkout_session_id
  then raise exception 'checkout session mismatch'; end if;

  if received_amount_refunded is not null then
    if received_amount_refunded >= target_order.amount_total then normalized_status := 'refunded';
    elsif received_amount_refunded > 0 then normalized_status := 'partially_refunded';
    end if;
  end if;

  if received_event_created >= target_order.stripe_event_created_at then
    update public.payment_orders
    set status = normalized_status,
        amount_refunded = coalesce(received_amount_refunded, amount_refunded),
        stripe_checkout_session_id = coalesce(received_checkout_session_id, stripe_checkout_session_id),
        stripe_payment_intent_id = coalesce(received_payment_intent_id, stripe_payment_intent_id),
        stripe_customer_id = coalesce(received_customer_id, stripe_customer_id),
        stripe_charge_id = coalesce(received_charge_id, stripe_charge_id),
        stripe_invoice_id = coalesce(received_invoice_id, stripe_invoice_id),
        receipt_url = coalesce(received_receipt_url, receipt_url),
        hosted_invoice_url = coalesce(received_hosted_invoice_url, hosted_invoice_url),
        invoice_pdf_url = coalesce(received_invoice_pdf_url, invoice_pdf_url),
        stripe_event_created_at = received_event_created,
        paid_at = case when normalized_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
        refunded_at = case when normalized_status in ('refunded', 'chargeback') then coalesce(refunded_at, now()) else refunded_at end,
        updated_at = now()
    where id = target_order_id;
    update public.stripe_webhook_events set applied = true where stripe_event_id = received_event_id;
    perform public.recompute_stripe_student_plan(target_order.student_id);
    return query select true, normalized_status;
  end if;

  return query select false, target_order.status;
end;
$$;

create or replace function public.get_parent_payment_history()
returns table (
  payment_order_id uuid,
  student_id uuid,
  student_display_name text,
  product_code text,
  payment_status text,
  amount_total integer,
  amount_refunded integer,
  currency text,
  access_valid_until timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  receipt_url text,
  hosted_invoice_url text,
  invoice_pdf_url text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'parent' and onboarding_completed) then
    raise exception 'active parent profile required';
  end if;
  return query
  select orders.id, orders.student_id, coalesce(student.display_name, student.email),
         orders.product_code, orders.status, orders.amount_total, orders.amount_refunded,
         orders.currency, orders.access_valid_until, orders.paid_at, orders.refunded_at,
         orders.receipt_url, orders.hosted_invoice_url, orders.invoice_pdf_url, orders.created_at
  from public.payment_orders orders
  join public.profiles student on student.id = orders.student_id
  where orders.parent_id = (select auth.uid())
  order by orders.created_at desc;
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
  cke_accommodation_label text,
  plan_tier text,
  plan_valid_until timestamptz
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
  select guardians.student_id, student.display_name, student.email, guardians.created_at,
         coalesce(preferences.weekly_goal, 5), coalesce(preferences.summary_email_enabled, true),
         accommodation.code, accommodation.label, student.plan_tier, student.plan_valid_until
  from public.student_guardians guardians
  join public.profiles student on student.id = guardians.student_id
  left join public.guardian_preferences preferences
    on preferences.student_id = guardians.student_id and preferences.guardian_id = guardians.guardian_id
  left join public.student_cke_preferences student_pref on student_pref.student_id = guardians.student_id
  join public.cke_accommodation_profiles accommodation
    on accommodation.code = coalesce(student_pref.accommodation_code, '100')
  where guardians.guardian_id = (select auth.uid())
  order by guardians.created_at desc;
end;
$$;

revoke all on function public.recompute_stripe_student_plan(uuid) from public;
revoke all on function public.create_parent_payment_order(uuid, uuid, uuid, text, timestamptz, text) from public;
revoke all on function public.attach_stripe_checkout_session(uuid, text, text) from public;
revoke all on function public.record_stripe_payment_event(text, text, bigint, boolean, uuid, text, integer, integer, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.get_parent_payment_history() from public;
revoke all on function public.get_linked_children() from public;
grant execute on function public.create_parent_payment_order(uuid, uuid, uuid, text, timestamptz, text) to service_role;
grant execute on function public.attach_stripe_checkout_session(uuid, text, text) to service_role;
grant execute on function public.record_stripe_payment_event(text, text, bigint, boolean, uuid, text, integer, integer, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.get_parent_payment_history() to authenticated;
grant execute on function public.get_linked_children() to authenticated;
