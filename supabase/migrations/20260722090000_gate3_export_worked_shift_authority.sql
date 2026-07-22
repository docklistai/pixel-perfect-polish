-- Gate 3: approved-hours export follows the WORKED SHIFT, not the staff profile.
--
-- Confirmed defect this corrects: the export derived both role and department
-- from `staff_members`, so a shift worked in Bar as a temporary "Training" role
-- exported as the person's profile role/department, and editing that profile
-- later rewrote already-approved historical rows. Work done in two departments
-- also collapsed into a single row, because the aggregate grouped only by staff.
--
-- Function-only change. No table, column, index, trigger, policy or schema-model
-- change. Both existing overloads keep their signature, return type, column
-- order, SECURITY DEFINER, empty search_path, grants and audit behaviour.
--
-- Fallback: entries with no linked shift keep the existing honest profile
-- values. There is no historical department stored on `time_entries`, and this
-- migration deliberately does not invent one.

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

  -- Audit counts use the same worked-shift scoping as the returned rows, so the
  -- recorded entry/staff counts continue to describe exactly what was exported.
  select count(distinct entry.staff_member_id), count(*)
  into exported_staff_count, exported_entry_count
  from public.time_entries as entry
  join public.staff_members as staff
    on staff.workspace_id = entry.workspace_id
   and staff.id = entry.staff_member_id
  left join public.shifts as worked
    on worked.workspace_id = entry.workspace_id
   and worked.id = entry.shift_id
  where entry.workspace_id = p_workspace_id
    and entry.approval_status = 'approved'
    and entry.work_date between p_start_date and p_end_date
    and entry.clocked_in_at is not null
    and entry.clocked_out_at is not null
    and (
      p_department_id is null
      or coalesce(worked.department_id, staff.department_id) = p_department_id
    );

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
    -- Worked shift is the authority; the profile is only a fallback for
    -- entries that were never linked to a shift.
    public.rpc_internal_csv_safe(coalesce(worked.role_name, staff.role_name)),
    public.rpc_internal_csv_safe(coalesce(worked_department.name, profile_department.name)),
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
  left join public.shifts as worked
    on worked.workspace_id = entry.workspace_id
   and worked.id = entry.shift_id
  left join public.departments as worked_department
    on worked_department.workspace_id = entry.workspace_id
   and worked_department.id = worked.department_id
  left join public.departments as profile_department
    on profile_department.workspace_id = staff.workspace_id
   and profile_department.id = staff.department_id
  where entry.workspace_id = p_workspace_id
    and entry.approval_status = 'approved'
    and entry.work_date between p_start_date and p_end_date
    and entry.clocked_in_at is not null
    and entry.clocked_out_at is not null
    and (
      p_department_id is null
      or coalesce(worked.department_id, staff.department_id) = p_department_id
    )
  -- Distinct worked role/department combinations stay distinct, so a person who
  -- worked Bar and Kitchen in the same period exports as two rows. Identical
  -- combinations still aggregate into one.
  group by
    staff.id,
    staff.display_name,
    coalesce(worked.role_name, staff.role_name),
    coalesce(worked_department.name, profile_department.name)
  order by
    staff.display_name,
    staff.id,
    coalesce(worked_department.name, profile_department.name),
    coalesce(worked.role_name, staff.role_name);
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
  'Manager/owner only. Server-authoritative approved-hours export scoped to an optional workspace-owned department. Role and department come from the worked shift, so approved history is not rewritten when a staff profile changes; entries with no linked shift fall back to the profile. Distinct worked role/department combinations export as separate rows. CSV-safe text and an audited scope. No payroll integration.';

comment on function public.rpc_export_approved_hours(uuid, date, date) is
  'Backward-compatible whole-workspace approved-hours export. Delegates to the department-aware implementation with NULL scope, retaining identical validation, aggregation, CSV safety and audit evidence.';
