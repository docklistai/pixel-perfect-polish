-- Phase 38: one server-authoritative approved-hours export scope.
--
-- The new four-argument overload accepts an optional workspace-owned
-- department. The legacy three-argument contract delegates to it with NULL,
-- preserving whole-workspace callers while keeping validation, aggregation,
-- CSV safety and audit evidence in one implementation.

create or replace function public.rpc_export_approved_hours(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  exported_staff_count integer;
  exported_entry_count integer;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'a valid start and end date is required' using errcode = '22023';
  end if;

  if p_end_date - p_start_date > 366 then
    raise exception 'export range cannot exceed one year' using errcode = '22023';
  end if;

  if p_department_id is not null and not exists (
    select 1
    from public.departments as department
    where department.workspace_id = p_workspace_id
      and department.id = p_department_id
  ) then
    raise exception 'department not found in this workspace' using errcode = 'P0002';
  end if;

  select count(distinct entry.staff_member_id), count(*)
  into exported_staff_count, exported_entry_count
  from public.time_entries as entry
  join public.staff_members as staff
    on staff.workspace_id = entry.workspace_id
   and staff.id = entry.staff_member_id
  where entry.workspace_id = p_workspace_id
    and entry.approval_status = 'approved'
    and entry.work_date between p_start_date and p_end_date
    and entry.clocked_in_at is not null
    and entry.clocked_out_at is not null
    and (p_department_id is null or staff.department_id = p_department_id);

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entries.exported',
    'workspace',
    p_workspace_id,
    pg_catalog.jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date,
      'scope', case when p_department_id is null then 'workspace' else 'department' end,
      'department_id', p_department_id,
      'staff_count', exported_staff_count,
      'entry_count', exported_entry_count
    )
  );

  return query
  select
    staff.id,
    public.rpc_internal_csv_safe(staff.display_name),
    public.rpc_internal_csv_safe(staff.role_name),
    public.rpc_internal_csv_safe(department.name),
    count(entry.id),
    coalesce(pg_catalog.sum(
      greatest(
        0::bigint,
        pg_catalog.floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::bigint
          - entry.break_minutes
      )
    ), 0)::bigint,
    pg_catalog.round(
      coalesce(pg_catalog.sum(
        greatest(
          0::bigint,
          pg_catalog.floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::bigint
            - entry.break_minutes
        )
      ), 0) / 60.0,
      2
    )
  from public.time_entries as entry
  join public.staff_members as staff
    on staff.workspace_id = entry.workspace_id
   and staff.id = entry.staff_member_id
  left join public.departments as department
    on department.workspace_id = staff.workspace_id
   and department.id = staff.department_id
  where entry.workspace_id = p_workspace_id
    and entry.approval_status = 'approved'
    and entry.work_date between p_start_date and p_end_date
    and entry.clocked_in_at is not null
    and entry.clocked_out_at is not null
    and (p_department_id is null or staff.department_id = p_department_id)
  group by staff.id, staff.display_name, staff.role_name, department.name
  order by staff.display_name, staff.id;
end;
$$;

create or replace function public.rpc_export_approved_hours(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric
)
language sql
volatile
security definer
set search_path = ''
as $$
  select scoped.staff_member_id,
         scoped.display_name,
         scoped.role_name,
         scoped.department_name,
         scoped.entry_count,
         scoped.approved_minutes,
         scoped.approved_hours
  from public.rpc_export_approved_hours(
    p_workspace_id,
    p_start_date,
    p_end_date,
    null::uuid
  ) as scoped;
$$;

revoke all on function public.rpc_export_approved_hours(uuid, date, date, uuid)
  from public, anon;
revoke all on function public.rpc_export_approved_hours(uuid, date, date)
  from public, anon;

grant execute on function public.rpc_export_approved_hours(uuid, date, date, uuid)
  to authenticated;
grant execute on function public.rpc_export_approved_hours(uuid, date, date)
  to authenticated;

comment on function public.rpc_export_approved_hours(uuid, date, date, uuid) is
  'Manager/owner only. Server-authoritative approved-hours export for an optional workspace-owned department. Uses current canonical staff department, approved entries with complete clock bounds, CSV-safe text and an audited scope. No payroll integration.';

comment on function public.rpc_export_approved_hours(uuid, date, date) is
  'Backward-compatible whole-workspace approved-hours export. Delegates to the department-aware implementation with NULL scope, retaining identical validation, aggregation, CSV safety and audit evidence.';
