-- ===========================================================================
-- Phase 68: Manager Request Notifications Authority (WS-5)
-- ---------------------------------------------------------------------------
-- Delivers manager-directed in-app notifications via rpc_internal_notify for
-- staff operational requests:
--   * rpc_request_open_shift
--   * rpc_request_shift_release
--   * rpc_request_one_off_unavailability
--   * rpc_request_recurring_day_off
--
-- Invariants:
--   1. Recipients are active owner/manager memberships only.
--   2. Staff recipients receive zero notifications on staff request creation.
--   3. Inactive manager memberships receive zero notifications.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. rpc_request_open_shift — add manager notification on request creation
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
  staff_display_name text;
  existing_id uuid;
  existing_status text;
  result_id uuid;
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
      and lower(btrim(staff.role_name)) = lower(btrim(shift_row.role_name))
  ) then
    raise exception 'this open shift is not eligible for your current role' using errcode = '55000';
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
-- 2. rpc_request_shift_release — ensure notification reaches all active managers
-- ---------------------------------------------------------------------------

create or replace function public.rpc_request_shift_release(
  p_workspace_id uuid,
  p_published_shift_id uuid,
  p_reason text
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
  trimmed_reason text;
  staff_display_name text;
  existing_id uuid;
  existing_status text;
  result_id uuid;
begin
  select required.o_membership_id, required.o_staff_member_id
  into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id) as required;

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if trimmed_reason is null then
    raise exception 'a reason is required to request a release' using errcode = '22023';
  end if;
  if length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  select
    shift.id,
    shift.source_shift_id,
    shift.staff_member_id,
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

  if shift_row.staff_member_id is distinct from own_staff_member_id
     or shift_row.assignment_status <> 'scheduled' then
    raise exception 'you can only request release from your own assigned shift'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.published_rota_snapshots as later_snapshot
    where later_snapshot.workspace_id = p_workspace_id
      and later_snapshot.rota_week_id = shift_row.rota_week_id
      and later_snapshot.version > shift_row.version
  ) then
    raise exception 'this rota has been republished — refresh to see your current shifts'
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

  select request.id, request.status
  into existing_id, existing_status
  from public.shift_release_requests as request
  where request.workspace_id = p_workspace_id
    and request.published_shift_id = p_published_shift_id
    and request.staff_member_id = own_staff_member_id
  for update;

  if existing_id is null then
    insert into public.shift_release_requests (
      workspace_id, published_shift_id, source_shift_id, rota_week_id,
      staff_member_id, reason
    )
    values (
      p_workspace_id, p_published_shift_id, shift_row.source_shift_id,
      shift_row.rota_week_id, own_staff_member_id, trimmed_reason
    )
    returning id into result_id;
  elsif existing_status = 'pending' then
    return jsonb_build_object('request_id', existing_id, 'status', 'pending');
  elsif existing_status = 'withdrawn' then
    update public.shift_release_requests
    set status = 'pending',
        reason = trimmed_reason,
        decided_by_membership_id = null,
        decided_at = null,
        decision_reason = null
    where workspace_id = p_workspace_id
      and id = existing_id;
    result_id := existing_id;
  else
    raise exception 'this release request has already been decided' using errcode = '55000';
  end if;

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'shift_release_update',
    'Shift release requested',
    format(
      '%s asked to be released from the %s shift on %s.',
      staff_display_name,
      shift_row.role_name,
      to_char(shift_row.shift_date, 'DD Mon YYYY')
    ),
    'shift_release_request',
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
    'shift_release.requested',
    'shift_release_request',
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

revoke all on function public.rpc_request_shift_release(uuid, uuid, text) from public, anon;
grant execute on function public.rpc_request_shift_release(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. rpc_request_one_off_unavailability — ensure notification reaches all active managers
-- ---------------------------------------------------------------------------

create or replace function public.rpc_request_one_off_unavailability(
  p_workspace_id uuid,
  p_date date,
  p_note text default null
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
  trimmed_note text;
  staff_display_name text;
  new_request_id uuid;
  existing_status text;
  existing_note text;
  request_was_updated boolean := false;
  staff_timezone text;
  local_today date;
begin
  select required.o_membership_id, required.o_staff_member_id
  into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id) as required;

  select coalesce(location.timezone, workspace.timezone, 'UTC')
  into staff_timezone
  from public.staff_members as staff
  join public.workspaces as workspace on workspace.id = staff.workspace_id
  left join public.locations as location
    on location.workspace_id = staff.workspace_id
   and location.id = staff.primary_location_id
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  local_today := (clock_timestamp() at time zone staff_timezone)::date;

  if p_date is null then
    raise exception 'a date is required' using errcode = '22023';
  end if;

  if p_date < local_today then
    raise exception 'unavailability cannot be requested for a past date' using errcode = '22023';
  end if;

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is not null and length(trimmed_note) > 500 then
    raise exception 'note must be at most 500 characters' using errcode = '22023';
  end if;

  select request.id, request.status, request.note
  into new_request_id, existing_status, existing_note
  from public.staff_one_off_unavailability_requests as request
  where request.workspace_id = p_workspace_id
    and request.staff_member_id = own_staff_member_id
    and request.date = p_date
  for update;

  perform public.rpc_internal_lock_staff_eligibility(
    p_workspace_id,
    array[own_staff_member_id]
  );

  if new_request_id is null then
    select request.id, request.status, request.note
    into new_request_id, existing_status, existing_note
    from public.staff_one_off_unavailability_requests as request
    where request.workspace_id = p_workspace_id
      and request.staff_member_id = own_staff_member_id
      and request.date = p_date
    for update;
  end if;

  if new_request_id is null then
    insert into public.staff_one_off_unavailability_requests (
      workspace_id, staff_member_id, date, status, note,
      decided_by_membership_id, decided_at, decision_note, created_at
    )
    values (
      p_workspace_id, own_staff_member_id, p_date, 'pending', trimmed_note,
      null, null, null, transaction_timestamp()
    )
    returning id into new_request_id;
  elsif existing_status = 'approved' then
    raise exception 'approved unavailability can only be changed by a manager'
      using errcode = '55000';
  elsif existing_status = 'pending' then
    if existing_note is not distinct from trimmed_note then
      return jsonb_build_object('request_id', new_request_id, 'status', 'pending');
    end if;
    update public.staff_one_off_unavailability_requests
    set note = trimmed_note
    where workspace_id = p_workspace_id and id = new_request_id;
    request_was_updated := true;
  else
    update public.staff_one_off_unavailability_requests
    set status = 'pending',
        note = trimmed_note,
        decided_by_membership_id = null,
        decided_at = null,
        decision_note = null
    where workspace_id = p_workspace_id and id = new_request_id;
  end if;

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'unavailability_update',
    case
      when request_was_updated then 'Unavailability request updated'
      else 'New unavailability request'
    end,
    format(
      '%s asked to be unavailable on %s.',
      staff_display_name,
      to_char(p_date, 'DD Mon YYYY')
    ),
    'one_off_unavailability',
    new_request_id,
    array(
      select membership.id
      from public.workspace_memberships as membership
      where membership.workspace_id = p_workspace_id
        and membership.role in ('owner', 'manager')
        and membership.status = 'active'
    )
  );

  return jsonb_build_object('request_id', new_request_id, 'status', 'pending');
end;
$$;

revoke all on function public.rpc_request_one_off_unavailability(uuid, date, text) from public, anon;
grant execute on function public.rpc_request_one_off_unavailability(uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. rpc_request_recurring_day_off — ensure notification reaches all active managers
-- ---------------------------------------------------------------------------

create or replace function public.rpc_request_recurring_day_off(
  p_workspace_id uuid,
  p_weekday smallint,
  p_note text default null
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
  trimmed_note text;
  staff_display_name text;
  new_request_id uuid;
begin
  select * into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id);

  if p_weekday is null or p_weekday < 0 or p_weekday > 6 then
    raise exception 'weekday must be between 0 (Monday) and 6 (Sunday)'
      using errcode = '22023';
  end if;

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is not null and length(trimmed_note) > 500 then
    raise exception 'note must be at most 500 characters' using errcode = '22023';
  end if;

  insert into public.staff_recurring_day_off_requests (
    workspace_id, staff_member_id, weekday, status, note,
    decided_by_membership_id, decided_at, decision_note, created_at
  )
  values (
    p_workspace_id, own_staff_member_id, p_weekday, 'pending', trimmed_note,
    null, null, null, transaction_timestamp()
  )
  on conflict (workspace_id, staff_member_id, weekday)
  do update
  set status = 'pending',
      note = excluded.note,
      decided_by_membership_id = null,
      decided_at = null,
      decision_note = null
  returning id into new_request_id;

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'announcement',
    'New regular day-off request',
    format(
      '%s asked to have %s off every week.',
      staff_display_name,
      public.weekday_label(p_weekday)
    ),
    'recurring_day_off',
    new_request_id,
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
    'recurring_day_off.requested',
    'recurring_day_off',
    new_request_id,
    jsonb_build_object('staff_member_id', own_staff_member_id, 'weekday', p_weekday)
  );

  return jsonb_build_object('request_id', new_request_id, 'status', 'pending');
end;
$$;

revoke all on function public.rpc_request_recurring_day_off(uuid, smallint, text) from public, anon;
grant execute on function public.rpc_request_recurring_day_off(uuid, smallint, text) to authenticated;

notify pgrst, 'reload schema';
