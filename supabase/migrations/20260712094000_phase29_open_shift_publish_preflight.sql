-- Phase 29: selected open-shift requests must still be safe at publication.
--
-- Selection deliberately changes only the manager draft. Between selection and
-- republish, employment, role, leave, days off, other shifts, or the selected
-- shift itself can change. This additive preflight runs before a snapshot row
-- exists, revalidates the selected assignment, and blocks the transaction if
-- the request no longer describes a safe publishable assignment. It also
-- prevents a pending requester being assigned manually to bypass selection.

begin;

create or replace function public.rpc_internal_validate_open_shift_publish(
  p_workspace_id uuid,
  p_rota_week_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  week_start_date date;
  request_row record;
  requested_shift record;
  draft_shift record;
  staff_row record;
  latest_version integer;
  shift_timezone text;
  shift_end_date date;
  scheduled_week_minutes bigint;
begin
  select week.week_start
  into week_start_date
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = p_rota_week_id;

  if week_start_date is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.open_shift_requests as request
    join public.shifts as draft
      on draft.workspace_id = request.workspace_id
     and draft.id = request.source_shift_id
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status = 'pending'
      and draft.assignment_status = 'scheduled'
      and draft.staff_member_id = request.staff_member_id
  ) then
    raise exception 'a pending open-shift requester is assigned in the draft; select the applicant through the request workflow before publishing'
      using errcode = '55000';
  end if;

  for request_row in
    select request.id, request.staff_member_id, request.source_shift_id,
           request.published_shift_id
    from public.open_shift_requests as request
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status = 'selected'
    order by request.staff_member_id, request.id
  loop
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

    select max(snapshot.version)
    into latest_version
    from public.published_rota_snapshots as snapshot
    where snapshot.workspace_id = p_workspace_id
      and snapshot.rota_week_id = p_rota_week_id;

    select shift.id, shift.shift_date, shift.starts_at, shift.ends_at,
           shift.break_minutes, shift.role_name, shift.department_id,
           shift.location_id, shift.staff_member_id, shift.assignment_status
    into draft_shift
    from public.shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = p_rota_week_id
      and shift.id = request_row.source_shift_id
    for update;

    if requested_shift.version is distinct from latest_version
       or requested_shift.assignment_status <> 'open'
       or draft_shift.id is null
       or draft_shift.assignment_status <> 'scheduled'
       or draft_shift.staff_member_id is distinct from request_row.staff_member_id
       or draft_shift.shift_date is distinct from requested_shift.shift_date
       or draft_shift.starts_at is distinct from requested_shift.starts_at
       or draft_shift.ends_at is distinct from requested_shift.ends_at
       or draft_shift.break_minutes is distinct from requested_shift.break_minutes
       or draft_shift.role_name is distinct from requested_shift.role_name
       or draft_shift.location_id is distinct from requested_shift.location_id
       or draft_shift.department_id is distinct from requested_shift.department_id then
      raise exception 'a selected open-shift assignment changed after selection; decline or reselect the applicant before publishing'
        using errcode = '55000';
    end if;

    if draft_shift.starts_at <= clock_timestamp() then
      raise exception 'a selected open shift has already started' using errcode = '55000';
    end if;

    select coalesce(location.timezone, workspace.timezone, 'UTC')
    into shift_timezone
    from public.locations as location
    join public.workspaces as workspace on workspace.id = location.workspace_id
    where location.workspace_id = p_workspace_id
      and location.id = draft_shift.location_id;

    shift_end_date :=
      ((draft_shift.ends_at - interval '1 second') at time zone shift_timezone)::date;

    select staff.id, staff.employment_status, staff.role_name,
           membership.status as membership_status, membership.role as membership_role
    into staff_row
    from public.staff_members as staff
    join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
    where staff.workspace_id = p_workspace_id
      and staff.id = request_row.staff_member_id
    for update of staff, membership;

    if staff_row.id is null
       or staff_row.employment_status <> 'active'
       or staff_row.membership_status <> 'active'
       or staff_row.membership_role <> 'staff' then
      raise exception 'a selected applicant is no longer active staff' using errcode = '55000';
    end if;

    if lower(btrim(staff_row.role_name)) <> lower(btrim(draft_shift.role_name)) then
      raise exception 'a selected applicant no longer has the required role'
        using errcode = '55000';
    end if;

    if exists (
      select 1
      from public.leave_requests as leave
      where leave.workspace_id = p_workspace_id
        and leave.staff_member_id = request_row.staff_member_id
        and leave.status = 'approved'
        and leave.start_date <= shift_end_date
        and leave.end_date >= draft_shift.shift_date
    ) then
      raise exception 'a selected applicant now has approved leave for the shift'
        using errcode = '55000';
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
      raise exception 'a selected applicant now has an approved recurring day off'
        using errcode = '55000';
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
      raise exception 'a selected applicant now has an overlapping shift'
        using errcode = '55000';
    end if;

    select coalesce(sum(
      greatest(
        0,
        floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::bigint
          - shift.break_minutes
      )
    ), 0)
    into scheduled_week_minutes
    from public.shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.shift_date between week_start_date and week_start_date + 6
      and shift.staff_member_id = request_row.staff_member_id;

    if scheduled_week_minutes > 48 * 60 then
      raise exception 'a selected applicant now exceeds 48 scheduled hours this week'
        using errcode = '55000';
    end if;
  end loop;
end;
$$;

create or replace function public.guard_open_shift_publish_preflight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rpc_internal_validate_open_shift_publish(new.workspace_id, new.rota_week_id);
  return new;
end;
$$;

drop trigger if exists published_rota_snapshots_open_shift_preflight
  on public.published_rota_snapshots;
create trigger published_rota_snapshots_open_shift_preflight
before insert on public.published_rota_snapshots
for each row execute function public.guard_open_shift_publish_preflight();

create or replace function public.guard_open_shift_request_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'confirmed' and old.status <> 'selected' then
    raise exception 'only a selected open-shift request can be confirmed'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists open_shift_requests_confirm_selected_only
  on public.open_shift_requests;
create trigger open_shift_requests_confirm_selected_only
before update on public.open_shift_requests
for each row execute function public.guard_open_shift_request_confirmation();

revoke all on function public.rpc_internal_validate_open_shift_publish(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.guard_open_shift_publish_preflight()
  from public, anon, authenticated;
revoke all on function public.guard_open_shift_request_confirmation()
  from public, anon, authenticated;

comment on function public.rpc_internal_validate_open_shift_publish(uuid, uuid) is
  'Internal publication preflight: selected open-shift assignments must remain materially identical and eligible; pending requests cannot be manually assigned to bypass selection.';

commit;
