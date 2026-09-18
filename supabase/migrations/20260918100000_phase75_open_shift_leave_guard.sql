-- Phase 75: Open shift blocking leave (R1)
--
-- Enforces that pending and approved leave blocks open-shift requests and applicant selection:
-- 1. rpc_request_open_shift: rejects if caller has pending or approved leave overlapping the shift (including overnight).
-- 2. rpc_select_open_shift_applicant: rejects if applicant has pending or approved leave overlapping the shift.

-- ---------------------------------------------------------------------------
-- 1. rpc_request_open_shift
-- ---------------------------------------------------------------------------

create or replace function public.rpc_request_open_shift(
  p_workspace_id uuid,
  p_published_shift_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  own_staff_member_id uuid;
  shift_row record;
  shift_timezone text;
  shift_end_date date;
  staff_display_name text;
  existing_id uuid;
  existing_status text;
  result_id uuid;
  blocking_leave_status text;
begin
  select required.o_membership_id, required.o_staff_member_id
  into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id) as required;

  select
    shift.id,
    shift.source_shift_id,
    shift.assignment_status,
    shift.shift_date,
    shift.starts_at,
    shift.ends_at,
    shift.role_name,
    shift.location_id,
    snapshot.rota_week_id,
    snapshot.version
  into shift_row
  from public.published_rota_shifts as shift
  join public.published_rota_snapshots as snapshot
    on snapshot.workspace_id = shift.workspace_id
   and snapshot.id = shift.snapshot_id
  where shift.workspace_id = p_workspace_id
    and shift.id = p_published_shift_id;

  if shift_row.id is null then
    raise exception 'published shift not found in workspace' using errcode = 'P0002';
  end if;

  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = shift_row.rota_week_id
  for share;

  perform 1
  from public.published_rota_shifts as shift
  where shift.workspace_id = p_workspace_id and shift.id = p_published_shift_id
  for update;

  if shift_row.assignment_status <> 'open' then
    raise exception 'this shift is not open to requests' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.published_rota_snapshots as later_snapshot
    where later_snapshot.workspace_id = p_workspace_id
      and later_snapshot.rota_week_id = shift_row.rota_week_id
      and later_snapshot.version > shift_row.version
  ) then
    raise exception 'this rota has been republished — refresh to see the current open shifts'
      using errcode = '55000';
  end if;

  select coalesce(location.timezone, workspace.timezone, 'UTC')
  into shift_timezone
  from public.locations as location
  join public.workspaces as workspace on workspace.id = location.workspace_id
  where location.workspace_id = p_workspace_id
    and location.id = shift_row.location_id;

  if shift_row.shift_date < (now() at time zone shift_timezone)::date
     or shift_row.starts_at <= clock_timestamp() then
    raise exception 'this shift has already started' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.staff_members as staff
    join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
     and membership.status = 'active'
    where staff.workspace_id = p_workspace_id
      and staff.id = own_staff_member_id
      and staff.employment_status = 'active'
      and public.rpc_internal_staff_holds_role(p_workspace_id, own_staff_member_id, shift_row.role_name)
  ) then
    raise exception 'this open shift is not eligible for your current role' using errcode = '55000';
  end if;

  shift_end_date := ((shift_row.ends_at - interval '1 second') at time zone shift_timezone)::date;

  -- Blocking leave check: pending and approved leave overlapping the shift dates (including overnight)
  select leave.status into blocking_leave_status
  from public.leave_requests as leave
  where leave.workspace_id = p_workspace_id
    and leave.staff_member_id = own_staff_member_id
    and leave.status in ('pending', 'approved')
    and leave.start_date <= shift_end_date
    and leave.end_date >= shift_row.shift_date
  order by (case when leave.status = 'approved' then 1 else 2 end)
  limit 1;

  if blocking_leave_status is not null then
    raise exception 'you have overlapping leave on that day' using errcode = '55000';
  end if;

  select request.id, request.status
  into existing_id, existing_status
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.published_shift_id = p_published_shift_id
    and request.staff_member_id = own_staff_member_id
  for update;

  if existing_id is null then
    insert into public.open_shift_requests (
      workspace_id, published_shift_id, source_shift_id, rota_week_id, staff_member_id
    )
    values (
      p_workspace_id, p_published_shift_id, shift_row.source_shift_id,
      shift_row.rota_week_id, own_staff_member_id
    )
    returning id into result_id;
  elsif existing_status = 'pending' then
    return jsonb_build_object('request_id', existing_id, 'status', 'pending');
  elsif existing_status = 'withdrawn' then
    update public.open_shift_requests
    set status = 'pending',
        decided_by_membership_id = null,
        decided_at = null,
        decision_reason = null
    where workspace_id = p_workspace_id
      and id = existing_id;
    result_id := existing_id;
  else
    raise exception 'this request has already been decided' using errcode = '55000';
  end if;

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'open_shift_update',
    'Open shift requested',
    format(
      '%s requested the %s shift on %s.',
      staff_display_name,
      shift_row.role_name,
      to_char(shift_row.shift_date, 'DD Mon YYYY')
    ),
    'open_shift_request',
    result_id,
    array(
      select membership.id
      from public.workspace_memberships as membership
      where membership.workspace_id = p_workspace_id
        and membership.role in ('owner', 'manager')
        and membership.status = 'active'
    )
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'open_shift.requested',
    'open_shift_request',
    result_id,
    jsonb_build_object(
      'published_shift_id', p_published_shift_id,
      'source_shift_id', shift_row.source_shift_id,
      'staff_member_id', own_staff_member_id
    )
  );

  return jsonb_build_object('request_id', result_id, 'status', 'pending');
end;
$$;

revoke all on function public.rpc_request_open_shift(uuid, uuid) from public, anon;
grant execute on function public.rpc_request_open_shift(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. rpc_select_open_shift_applicant
-- ---------------------------------------------------------------------------

create or replace function public.rpc_select_open_shift_applicant(
  p_workspace_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  request_row record;
  week_status text;
  latest_version integer;
  requested_shift record;
  draft_shift record;
  staff_row record;
  scheduled_week_minutes bigint;
  week_start_date date;
  shift_timezone text;
  shift_end_date date;
  leave_status text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select request.id, request.status, request.staff_member_id,
         request.published_shift_id, request.source_shift_id, request.rota_week_id
  into request_row
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id;

  if request_row.id is null then
    raise exception 'open-shift request not found in workspace' using errcode = 'P0002';
  end if;

  -- Week first, then request: publish and every manager decision use the same lock order
  select week.status, week.week_start into week_status, week_start_date
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = request_row.rota_week_id
  for update;

  if week_status is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;
  if week_status = 'archived' then
    raise exception 'archived rota weeks cannot be changed' using errcode = '55000';
  end if;

  select request.id, request.status, request.staff_member_id,
         request.published_shift_id, request.source_shift_id, request.rota_week_id
  into request_row
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if request_row.status <> 'pending' then
    raise exception 'only pending requests can be selected' using errcode = '55000';
  end if;

  -- Stale guard: the request must point at the latest published version.
  select max(snapshot.version) into latest_version
  from public.published_rota_snapshots as snapshot
  where snapshot.workspace_id = p_workspace_id
    and snapshot.rota_week_id = request_row.rota_week_id;

  select snapshot.version, shift.shift_date, shift.starts_at, shift.ends_at,
         shift.break_minutes, shift.role_name, shift.location_id,
         shift.department_id, shift.assignment_status
  into requested_shift
  from public.published_rota_shifts as shift
  join public.published_rota_snapshots as snapshot
    on snapshot.workspace_id = shift.workspace_id
   and snapshot.id = shift.snapshot_id
  where shift.workspace_id = p_workspace_id
    and shift.id = request_row.published_shift_id;

  if requested_shift.version is distinct from latest_version then
    raise exception 'the published rota changed after this request — republish first, then review the refreshed requests'
      using errcode = '55000';
  end if;

  -- The draft shift is the assignment target; lock it against double-booking.
  select shift.id, shift.shift_date, shift.starts_at, shift.ends_at,
         shift.break_minutes, shift.role_name, shift.department_id,
         shift.location_id, shift.staff_member_id, shift.assignment_status
  into draft_shift
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.id = request_row.source_shift_id
  for update;

  if draft_shift.id is null then
    raise exception 'the draft shift behind this open shift no longer exists' using errcode = 'P0002';
  end if;
  if draft_shift.assignment_status <> 'open' then
    raise exception 'the draft shift is already assigned — republish, then review the refreshed requests'
      using errcode = '55000';
  end if;
  if requested_shift.assignment_status <> 'open'
     or draft_shift.shift_date is distinct from requested_shift.shift_date
     or draft_shift.starts_at is distinct from requested_shift.starts_at
     or draft_shift.ends_at is distinct from requested_shift.ends_at
     or draft_shift.break_minutes is distinct from requested_shift.break_minutes
     or draft_shift.role_name is distinct from requested_shift.role_name
     or draft_shift.location_id is distinct from requested_shift.location_id
     or draft_shift.department_id is distinct from requested_shift.department_id then
    raise exception 'the draft shift changed after this request; republish before selecting an applicant'
      using errcode = '55000';
  end if;
  if draft_shift.starts_at <= clock_timestamp() then
    raise exception 'this shift has already started' using errcode = '55000';
  end if;

  select coalesce(location.timezone, workspace.timezone, 'UTC')
  into shift_timezone
  from public.locations as location
  join public.workspaces as workspace on workspace.id = location.workspace_id
  where location.workspace_id = p_workspace_id and location.id = draft_shift.location_id;
  shift_end_date := ((draft_shift.ends_at - interval '1 second') at time zone shift_timezone)::date;

  perform public.rpc_internal_lock_staff_eligibility(
    p_workspace_id,
    array[request_row.staff_member_id]
  );

  select staff.id, staff.employment_status, staff.role_name, staff.department_id,
         membership.status as membership_status
  into staff_row
  from public.staff_members as staff
  left join public.workspace_memberships as membership
    on membership.workspace_id = staff.workspace_id
   and membership.id = staff.membership_id
  where staff.workspace_id = p_workspace_id
    and staff.id = request_row.staff_member_id;

  if staff_row.id is null
     or staff_row.employment_status <> 'active'
     or staff_row.membership_status <> 'active' then
    raise exception 'the applicant is no longer an active staff member' using errcode = '55000';
  end if;

  -- Gate 2/3: Role eligibility using rpc_internal_staff_holds_role
  if not public.rpc_internal_staff_holds_role(p_workspace_id, request_row.staff_member_id, draft_shift.role_name) then
    raise exception 'the applicant''s role does not match this % shift', draft_shift.role_name
      using errcode = '55000';
  end if;

  -- Blocking leave check: pending and approved leave overlapping the shift dates
  select leave.status into leave_status
  from public.leave_requests as leave
  where leave.workspace_id = p_workspace_id
    and leave.staff_member_id = request_row.staff_member_id
    and leave.status in ('pending', 'approved')
    and leave.start_date <= shift_end_date
    and leave.end_date >= draft_shift.shift_date
  order by (case when leave.status = 'approved' then 1 else 2 end)
  limit 1;

  if leave_status = 'approved' then
    raise exception 'the applicant has approved leave on that day' using errcode = '55000';
  elsif leave_status = 'pending' then
    raise exception 'the applicant has pending leave on that day' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.staff_recurring_day_off_requests as day_off
    where day_off.workspace_id = p_workspace_id
      and day_off.staff_member_id = request_row.staff_member_id
      and day_off.status = 'approved'
      and day_off.weekday in (
        extract(isodow from draft_shift.shift_date)::smallint - 1,
        extract(isodow from shift_end_date)::smallint - 1
      )
  ) then
    raise exception 'the applicant has an approved recurring day off on that weekday' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.staff_one_off_unavailability_requests as unavailability
    where unavailability.workspace_id = p_workspace_id
      and unavailability.staff_member_id = request_row.staff_member_id
      and unavailability.status = 'approved'
      and unavailability.date in (draft_shift.shift_date, shift_end_date)
  ) then
    raise exception 'the applicant is unavailable on that date' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.shifts as other_shift
    where other_shift.workspace_id = p_workspace_id
      and other_shift.staff_member_id = request_row.staff_member_id
      and other_shift.id <> draft_shift.id
      and other_shift.starts_at < draft_shift.ends_at
      and other_shift.ends_at > draft_shift.starts_at
  ) then
    raise exception 'the applicant already has an overlapping shift' using errcode = '55000';
  end if;

  select coalesce(sum(
    greatest(
      0,
      floor(extract(epoch from (week_shift.ends_at - week_shift.starts_at)) / 60)::bigint
        - week_shift.break_minutes
    )
  ), 0)
  into scheduled_week_minutes
  from public.shifts as week_shift
  where week_shift.workspace_id = p_workspace_id
    and week_shift.shift_date between week_start_date and week_start_date + 6
    and week_shift.staff_member_id = request_row.staff_member_id;

  if scheduled_week_minutes
     + greatest(
         0,
         floor(extract(epoch from (draft_shift.ends_at - draft_shift.starts_at)) / 60)::bigint
           - draft_shift.break_minutes
       ) > 48 * 60 then
    raise exception 'selecting this applicant would exceed 48 scheduled hours this week' using errcode = '55000';
  end if;

  update public.open_shift_requests
  set status = 'pending',
      decided_by_membership_id = null,
      decided_at = null,
      decision_reason = null
  where workspace_id = p_workspace_id
    and source_shift_id = request_row.source_shift_id
    and status = 'selected'
    and id <> request_row.id;

  update public.shifts
  set staff_member_id = request_row.staff_member_id,
      assignment_status = 'scheduled'
  where workspace_id = p_workspace_id
    and id = draft_shift.id;

  update public.rota_weeks
  set status = 'draft'
  where workspace_id = p_workspace_id
    and id = request_row.rota_week_id
    and status <> 'draft';

  update public.open_shift_requests
  set status = 'selected',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp(),
      decision_reason = null
  where workspace_id = p_workspace_id
    and id = request_row.id;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'open_shift.selected',
    'open_shift_request',
    request_row.id,
    jsonb_build_object(
      'staff_member_id', request_row.staff_member_id,
      'source_shift_id', request_row.source_shift_id,
      'rota_week_id', request_row.rota_week_id
    )
  );

  return jsonb_build_object(
    'request_id', request_row.id,
    'status', 'selected',
    'shift_id', draft_shift.id,
    'staff_member_id', request_row.staff_member_id
  );
end;
$$;

revoke all on function public.rpc_select_open_shift_applicant(uuid, uuid) from public, anon;
grant execute on function public.rpc_select_open_shift_applicant(uuid, uuid) to authenticated;
