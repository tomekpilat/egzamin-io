-- Consent-backed marketing contacts and a source-verified school threshold catalog.

create table if not exists public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and char_length(email) between 5 and 254),
  subscription_type text not null check (subscription_type in ('recruitment_thresholds', 'plus_waitlist')),
  school_name text not null default '' check (char_length(school_name) <= 160),
  city text not null default '' check (char_length(city) <= 100),
  recruitment_year integer not null check (recruitment_year between 2026 and 2035),
  source_path text not null check (source_path = '/' or source_path ~ '^/[^/]'),
  consent_version text not null,
  consent_text text not null check (char_length(consent_text) between 40 and 800),
  consented_at timestamptz not null default now(),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  unsubscribed_at timestamptz,
  last_requested_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, subscription_type, recruitment_year, school_name)
);

create index if not exists marketing_contacts_status_idx
  on public.marketing_contacts (status, subscription_type, recruitment_year, created_at desc);

drop trigger if exists set_marketing_contacts_updated_at on public.marketing_contacts;
create trigger set_marketing_contacts_updated_at
before update on public.marketing_contacts
for each row execute function public.set_updated_at();

alter table public.marketing_contacts enable row level security;
revoke all on public.marketing_contacts from anon, authenticated;

create or replace function public.subscribe_marketing_contact(
  contact_email text,
  contact_subscription_type text,
  contact_school_name text,
  contact_city text,
  contact_recruitment_year integer,
  contact_source_path text,
  contact_consent_version text,
  contact_consent_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(btrim(contact_email));
  normalized_school text := btrim(coalesce(contact_school_name, ''));
  recent_requests integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then raise exception 'invalid email'; end if;
  if contact_subscription_type not in ('recruitment_thresholds', 'plus_waitlist') then raise exception 'invalid subscription type'; end if;
  if contact_subscription_type = 'recruitment_thresholds' and char_length(normalized_school) < 2 then raise exception 'school is required'; end if;
  if contact_recruitment_year not between 2026 and 2035 then raise exception 'invalid recruitment year'; end if;
  if contact_source_path <> '/' and contact_source_path !~ '^/[^/]' then raise exception 'invalid source path'; end if;
  if char_length(btrim(contact_consent_text)) not between 40 and 800 then raise exception 'consent text is required'; end if;

  select coalesce(sum(request_count), 0)::integer into recent_requests
  from public.marketing_contacts
  where email = normalized_email and last_requested_at > now() - interval '10 minutes';
  if recent_requests >= 5 then raise exception 'too many signup attempts'; end if;

  insert into public.marketing_contacts (
    email, subscription_type, school_name, city, recruitment_year, source_path,
    consent_version, consent_text
  ) values (
    normalized_email, contact_subscription_type, normalized_school,
    btrim(coalesce(contact_city, '')), contact_recruitment_year,
    contact_source_path, btrim(contact_consent_version), btrim(contact_consent_text)
  ) on conflict (email, subscription_type, recruitment_year, school_name) do update set
    city = excluded.city,
    source_path = excluded.source_path,
    consent_version = excluded.consent_version,
    consent_text = excluded.consent_text,
    consented_at = now(),
    status = 'subscribed',
    unsubscribed_at = null,
    last_requested_at = now(),
    request_count = public.marketing_contacts.request_count + 1,
    updated_at = now();
end;
$$;

create or replace function public.unsubscribe_marketing_contact(target_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketing_contacts
  set status = 'unsubscribed', unsubscribed_at = now()
  where unsubscribe_token = target_token and status = 'subscribed';
  return found;
end;
$$;

revoke all on function public.subscribe_marketing_contact(text, text, text, text, integer, text, text, text) from public;
revoke all on function public.unsubscribe_marketing_contact(uuid) from public;
grant execute on function public.subscribe_marketing_contact(text, text, text, text, integer, text, text, text) to service_role;
grant execute on function public.unsubscribe_marketing_contact(uuid) to anon, authenticated, service_role;

create table if not exists public.recruitment_threshold_datasets (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  recruitment_year integer not null check (recruitment_year between 2019 and 2035),
  source_label text not null,
  source_url text not null check (source_url ~ '^https://'),
  retrieved_at timestamptz not null,
  verified_at timestamptz not null,
  verified_by text not null check (char_length(btrim(verified_by)) >= 2),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, recruitment_year, source_url)
);

create table if not exists public.recruitment_schools (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  name text not null,
  school_type text not null check (school_type in ('liceum', 'technikum')),
  official_identifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, name, school_type)
);

create table if not exists public.recruitment_thresholds (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.recruitment_threshold_datasets(id) on delete restrict,
  school_id uuid not null references public.recruitment_schools(id) on delete restrict,
  class_name text not null,
  class_code text not null default '',
  profile_subjects text[] not null default '{}',
  threshold_points numeric(5,2) not null check (threshold_points between 0 and 200),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dataset_id, school_id, class_name, class_code)
);

create index if not exists recruitment_schools_search_idx on public.recruitment_schools (city, name);
create index if not exists recruitment_thresholds_public_idx on public.recruitment_thresholds (is_published, school_id, threshold_points);

drop trigger if exists set_recruitment_threshold_datasets_updated_at on public.recruitment_threshold_datasets;
create trigger set_recruitment_threshold_datasets_updated_at before update on public.recruitment_threshold_datasets
for each row execute function public.set_updated_at();
drop trigger if exists set_recruitment_schools_updated_at on public.recruitment_schools;
create trigger set_recruitment_schools_updated_at before update on public.recruitment_schools
for each row execute function public.set_updated_at();
drop trigger if exists set_recruitment_thresholds_updated_at on public.recruitment_thresholds;
create trigger set_recruitment_thresholds_updated_at before update on public.recruitment_thresholds
for each row execute function public.set_updated_at();

alter table public.recruitment_threshold_datasets enable row level security;
alter table public.recruitment_schools enable row level security;
alter table public.recruitment_thresholds enable row level security;
revoke all on public.recruitment_threshold_datasets from anon, authenticated;
revoke all on public.recruitment_schools from anon, authenticated;
revoke all on public.recruitment_thresholds from anon, authenticated;

create or replace function public.search_public_recruitment_thresholds(search_query text, requested_limit integer default 8)
returns table (
  threshold_id uuid,
  school_name text,
  school_type text,
  city text,
  class_name text,
  class_code text,
  profile_subjects text[],
  threshold_points numeric,
  recruitment_year integer,
  source_label text,
  source_url text,
  verified_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select threshold.id, school.name, school.school_type, school.city,
         threshold.class_name, threshold.class_code, threshold.profile_subjects,
         threshold.threshold_points, dataset.recruitment_year,
         dataset.source_label, dataset.source_url, dataset.verified_at
  from public.recruitment_thresholds threshold
  join public.recruitment_schools school on school.id = threshold.school_id
  join public.recruitment_threshold_datasets dataset on dataset.id = threshold.dataset_id
  where threshold.is_published and dataset.is_published
    and char_length(btrim(search_query)) >= 2
    and (school.name ilike '%' || btrim(search_query) || '%'
      or school.city ilike '%' || btrim(search_query) || '%'
      or threshold.class_name ilike '%' || btrim(search_query) || '%')
  order by dataset.recruitment_year desc, school.city, school.name, threshold.class_name
  limit least(greatest(coalesce(requested_limit, 8), 1), 20);
$$;

revoke all on function public.search_public_recruitment_thresholds(text, integer) from public;
grant execute on function public.search_public_recruitment_thresholds(text, integer) to anon, authenticated, service_role;
