-- MVP exposes only standard CKE papers. Keep the existing database columns for
-- backwards-compatible RPCs and imported paper metadata, but disable changing
-- a student's material profile and reset every existing preference to 100.

update public.student_cke_preferences
set accommodation_code = '100',
    special_category_acknowledged_at = null,
    selected_by = null,
    selected_via = 'default',
    updated_at = now()
where accommodation_code <> '100'
   or special_category_acknowledged_at is not null
   or selected_by is not null
   or selected_via <> 'default';

create or replace function public.update_child_cke_accommodation(
  target_student_id uuid,
  next_accommodation_code text,
  confirms_sensitive_preference boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_id uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.student_guardians
    where guardian_id = parent_id and student_id = target_student_id
  ) then raise exception 'linked child required'; end if;

  if coalesce(next_accommodation_code, '100') <> '100' then
    raise exception 'only standard CKE papers are available in the MVP';
  end if;

  insert into public.student_cke_preferences (
    student_id, accommodation_code, special_category_acknowledged_at,
    selected_by, selected_via, updated_at
  ) values (
    target_student_id, '100', null, null, 'default', now()
  ) on conflict (student_id) do update set
    accommodation_code = '100',
    special_category_acknowledged_at = null,
    selected_by = null,
    selected_via = 'default',
    updated_at = now();
end;
$$;

comment on function public.update_child_cke_accommodation(uuid, text, boolean)
  is 'Compatibility RPC for MVP. Accepts only the standard CKE paper code 100.';
