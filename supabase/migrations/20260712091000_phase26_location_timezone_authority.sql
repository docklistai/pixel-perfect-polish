-- Phase 26: one timezone authority — the location.
--
-- Two flows still used the wrong clock:
--   * The staff portal had no way to know its venue timezone, so the client
--     hardcoded Europe/London. The staff-safe profile view now exposes the
--     staff member's primary-location timezone (workspace timezone as the
--     fallback, UTC as the last resort), and the portal renders with it.
--   * rpc_apply_demand_template stamped shift times in the *workspace*
--     timezone while every grid write uses the *location* timezone
--     (buildShiftDateTimeRange). For a location whose timezone differs from
--     the workspace default, templates landed shifts at the wrong instants.
--
-- Additive only: one appended view column, one RPC replace.

-- ---------------------------------------------------------------------------
-- 1. staff_portal_profile — append the venue timezone.
--    Same security model (security_barrier + security_invoker); members can
--    already read their own workspace and location rows, so no new grant.
-- ---------------------------------------------------------------------------

create or replace view public.staff_portal_profile
with (security_barrier = true, security_invoker = true)
as
select
  staff.workspace_id,
  staff.id as staff_member_id,
  staff.display_name,
  staff.role_name,
  staff.email,
  staff.phone,
  staff.employment_status,
  department.id as department_id,
  department.name as department_name,
  location.id as location_id,
  location.name as location_name,
  workspace.name as workspace_name,
  coalesce(location.timezone, workspace.timezone, 'UTC') as timezone
from public.staff_members as staff
left join public.departments as department
  on department.workspace_id = staff.workspace_id
 and department.id = staff.department_id
left join public.locations as location
  on location.workspace_id = staff.workspace_id
 and location.id = staff.primary_location_id
left join public.workspaces as workspace
  on workspace.id = staff.workspace_id
where staff.id = public.current_staff_member_id(staff.workspace_id);

comment on view public.staff_portal_profile is
  'A staff member''s own profile fields plus the venue timezone (primary location, workspace fallback). Never exposes colleague rows or manager-only fields.';

-- Published shift rows carry their own venue timezone. A staff member can be
-- assigned away from their primary venue, so one profile-wide formatter is
-- not authoritative for every row.
create or replace view public.staff_portal_published_shifts
with (security_barrier = true, security_invoker = true)
as
select
  shift.workspace_id,
  shift.id as published_shift_id,
  shift.source_shift_id,
  shift.staff_member_id,
  shift.shift_date,
  shift.starts_at,
  shift.ends_at,
  shift.break_minutes,
  shift.role_name,
  shift.assignment_status,
  snapshot.version as snapshot_version,
  snapshot.published_at,
  location.id as location_id,
  location.name as location_name,
  department.id as department_id,
  department.name as department_name,
  coalesce(location.timezone, workspace.timezone, 'UTC') as location_timezone
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot
  on snapshot.workspace_id = shift.workspace_id and snapshot.id = shift.snapshot_id
join public.locations as location
  on location.workspace_id = shift.workspace_id and location.id = shift.location_id
join public.workspaces as workspace on workspace.id = shift.workspace_id
join public.departments as department
  on department.workspace_id = shift.workspace_id and department.id = shift.department_id
where not exists (
  select 1
  from public.published_rota_snapshots as later_snapshot
  where later_snapshot.workspace_id = snapshot.workspace_id
    and later_snapshot.rota_week_id = snapshot.rota_week_id
    and later_snapshot.version > snapshot.version
    and public.published_snapshot_has_shifts(later_snapshot.workspace_id, later_snapshot.id)
);

create or replace view public.staff_portal_team_shifts
with (security_barrier = true)
as
select
  shift.workspace_id,
  shift.id as published_shift_id,
  shift.staff_member_id,
  staff.display_name,
  shift.shift_date,
  shift.starts_at,
  shift.ends_at,
  shift.break_minutes,
  shift.role_name,
  shift.assignment_status,
  location.name as location_name,
  snapshot.version as snapshot_version,
  snapshot.published_at,
  coalesce(location.timezone, workspace.timezone, 'UTC') as location_timezone
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot
  on snapshot.workspace_id = shift.workspace_id and snapshot.id = shift.snapshot_id
join public.locations as location
  on location.workspace_id = shift.workspace_id and location.id = shift.location_id
join public.workspaces as workspace on workspace.id = shift.workspace_id
left join public.staff_members as staff
  on staff.workspace_id = shift.workspace_id and staff.id = shift.staff_member_id
where public.current_staff_member_id(shift.workspace_id) is not null
  and not exists (
    select 1
    from public.published_rota_snapshots as later_snapshot
    where later_snapshot.workspace_id = snapshot.workspace_id
      and later_snapshot.rota_week_id = snapshot.rota_week_id
      and later_snapshot.version > snapshot.version
  );

-- ---------------------------------------------------------------------------
-- 2. rpc_apply_demand_template — stamp times in the rota week's location
--    timezone, exactly like every other shift write path.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_save_demand_template(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_name text,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  applied_timezone text;
  trimmed_name text;
  trimmed_notes text;
  new_template_id uuid;
  slot_count integer;
  week_start_date date;
  week_location_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);
  trimmed_name := nullif(btrim(coalesce(p_name, '')), '');
  if trimmed_name is null or length(trimmed_name) > 80 then
    raise exception 'a template name of at most 80 characters is required' using errcode = '22023';
  end if;
  trimmed_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if trimmed_notes is not null and length(trimmed_notes) > 500 then
    raise exception 'notes must be at most 500 characters' using errcode = '22023';
  end if;

  select week.week_start, week.location_id
  into week_start_date, week_location_id
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id and week.id = p_rota_week_id
  for share;
  if week_start_date is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;

  select coalesce(location.timezone, workspace.timezone, 'UTC')
  into applied_timezone
  from public.locations as location
  join public.workspaces as workspace on workspace.id = location.workspace_id
  where location.workspace_id = p_workspace_id and location.id = week_location_id;

  insert into public.rota_demand_templates (workspace_id, name, notes, created_by_membership_id)
  values (p_workspace_id, trimmed_name, trimmed_notes, caller_membership_id)
  returning id into new_template_id;

  insert into public.rota_demand_template_slots (
    workspace_id, template_id, weekday, role_name, department_id,
    start_time, end_time, break_minutes, quantity
  )
  select
    p_workspace_id, new_template_id,
    (shift.shift_date - week_start_date)::int::smallint,
    shift.role_name, shift.department_id,
    (shift.starts_at at time zone applied_timezone)::time,
    (shift.ends_at at time zone applied_timezone)::time,
    shift.break_minutes, count(*)::int
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id and shift.rota_week_id = p_rota_week_id
  group by
    (shift.shift_date - week_start_date)::int,
    shift.role_name,
    shift.department_id,
    (shift.starts_at at time zone applied_timezone)::time,
    (shift.ends_at at time zone applied_timezone)::time,
    shift.break_minutes;

  get diagnostics slot_count = row_count;
  if slot_count = 0 then
    raise exception 'this week has no shifts to save as a template' using errcode = '55000';
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'demand_template.saved',
    'demand_template', new_template_id,
    jsonb_build_object('name', trimmed_name, 'slots', slot_count)
  );
  return jsonb_build_object('template_id', new_template_id, 'slots', slot_count);
end;
$$;

revoke all on function public.rpc_save_demand_template(uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_save_demand_template(uuid, uuid, text, text) to authenticated;

create or replace function public.rpc_apply_demand_template(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_template_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  applied_timezone text;
  week_start date;
  week_status text;
  week_location_id uuid;
  created_count integer := 0;
  slot record;
  shift_date date;
  starts_at timestamptz;
  ends_at timestamptz;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select rw.week_start, rw.status, rw.location_id
  into week_start, week_status, week_location_id
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = p_rota_week_id
  for update;

  if week_start is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;
  if week_status <> 'draft' then
    raise exception 'only draft rota weeks can take a template' using errcode = '55000';
  end if;

  if not exists (
    select 1 from public.rota_demand_templates
    where workspace_id = p_workspace_id and id = p_template_id
  ) then
    raise exception 'template not found in workspace' using errcode = 'P0002';
  end if;

  -- The rota week belongs to one location; its timezone is the authority for
  -- where a "09:00" slot lands, with the workspace timezone as fallback.
  select coalesce(location.timezone, workspace.timezone, 'UTC')
  into applied_timezone
  from public.locations as location
  join public.workspaces as workspace on workspace.id = location.workspace_id
  where location.workspace_id = p_workspace_id
    and location.id = week_location_id;

  for slot in
    select weekday, role_name, department_id, start_time, end_time, break_minutes, quantity
    from public.rota_demand_template_slots
    where workspace_id = p_workspace_id and template_id = p_template_id
  loop
    shift_date := week_start + slot.weekday;
    starts_at := (shift_date + slot.start_time) at time zone applied_timezone;
    -- end at or before start means the shift runs past midnight.
    ends_at := ((case when slot.end_time <= slot.start_time then shift_date + 1 else shift_date end)
                 + slot.end_time) at time zone applied_timezone;

    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    )
    select
      p_workspace_id, p_rota_week_id, week_location_id, slot.department_id, null,
      shift_date, starts_at, ends_at, slot.break_minutes, slot.role_name, 'open'
    from generate_series(1, slot.quantity);

    created_count := created_count + slot.quantity;
  end loop;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'demand_template.applied',
    'demand_template', p_template_id,
    jsonb_build_object('rota_week_id', p_rota_week_id, 'open_shifts', created_count)
  );

  return jsonb_build_object('open_shifts_created', created_count);
end;
$$;

revoke all on function public.rpc_apply_demand_template(uuid, uuid, uuid) from public, anon;
grant execute on function public.rpc_apply_demand_template(uuid, uuid, uuid) to authenticated;

comment on function public.rpc_apply_demand_template(uuid, uuid, uuid) is
  'Manager-only: stamp a demand template onto a draft rota week as open shifts to fill. Times land in the rota week''s location timezone.';

notify pgrst, 'reload schema';
