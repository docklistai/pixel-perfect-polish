-- Phase 5 backend RPC layer: server-side transactional operations for rota
-- publication, leave decisions, time approvals, adjustments, staff clocking,
-- staff leave submission, and approved-hours export.
--
-- Security model
--   * Every RPC requires a non-null auth.uid() and an active membership in the
--     target workspace. Management RPCs additionally require owner/manager;
--     the staff clock additionally requires the staff role and an active staff
--     record. Every internal statement is workspace-scoped.
--   * The RPCs are SECURITY DEFINER with an empty search_path because two
--     write paths are intentionally closed to authenticated roles:
--       - audit_events has no authenticated INSERT policy or grant, and
--       - staff have no direct grants on time_entries, clock_events,
--         leave_request_events, or notifications.
--     Phase 4 guard triggers still see the real caller through auth.uid(), so
--     actor integrity, source honesty, timestamp honesty, snapshot atomicity,
--     sequential versions, and immutability all remain enforced inside these
--     functions. No RLS policy, trigger, or grant is altered here.
--   * rpc_internal_* helpers carry no authenticated/anon EXECUTE grant; they
--     are reachable only from inside the definer RPCs.
--
-- Error code conventions
--   42501  not authenticated / no active membership / wrong role
--   P0002  target row not found inside the caller's workspace
--   55000  valid request, invalid state (empty week, double decision, ...)
--   22023  invalid parameter value

-- ---------------------------------------------------------------------------
-- 1. Internal helpers (no authenticated execute grant)
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_require_membership(p_workspace_id uuid)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  caller_membership_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  caller_membership_id := public.current_workspace_membership_id(p_workspace_id);

  if caller_membership_id is null then
    raise exception 'caller has no active membership in this workspace'
      using errcode = '42501';
  end if;

  return caller_membership_id;
end;
$$;

create or replace function public.rpc_internal_require_manager(p_workspace_id uuid)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  caller_membership_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_membership(p_workspace_id);

  if not public.has_workspace_role(p_workspace_id, array['owner', 'manager']) then
    raise exception 'owner or manager role required' using errcode = '42501';
  end if;

  return caller_membership_id;
end;
$$;

create or replace function public.rpc_internal_require_staff(
  p_workspace_id uuid,
  out o_membership_id uuid,
  out o_staff_member_id uuid
)
language plpgsql
stable
set search_path = ''
as $$
begin
  o_membership_id := public.rpc_internal_require_membership(p_workspace_id);
  o_staff_member_id := public.current_staff_member_id(p_workspace_id);

  if o_staff_member_id is null then
    raise exception 'caller has no active staff record in this workspace'
      using errcode = '42501';
  end if;
end;
$$;

-- The only sanctioned audit writer. audit_events keeps no authenticated
-- insert path; this helper is callable only from inside the definer RPCs.
create or replace function public.rpc_internal_write_audit(
  p_workspace_id uuid,
  p_actor_membership_id uuid,
  p_action text,
  p_subject_type text,
  p_subject_id uuid,
  p_details jsonb
)
returns uuid
language sql
volatile
set search_path = ''
as $$
  insert into public.audit_events (
    workspace_id, actor_membership_id, action, subject_type, subject_id, details
  )
  values (
    p_workspace_id, p_actor_membership_id, p_action, p_subject_type, p_subject_id,
    coalesce(p_details, '{}'::jsonb)
  )
  returning id;
$$;

-- Notification plus delivery fan-out in one place. Recipients are deduplicated;
-- an empty recipient list still records the workspace-visible notification.
create or replace function public.rpc_internal_notify(
  p_workspace_id uuid,
  p_created_by_membership_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_related_entity_type text,
  p_related_entity_id uuid,
  p_recipient_membership_ids uuid[]
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  new_notification_id uuid;
begin
  insert into public.notifications (
    workspace_id, created_by_membership_id, kind, title, body,
    related_entity_type, related_entity_id
  )
  values (
    p_workspace_id, p_created_by_membership_id, p_kind, p_title, p_body,
    p_related_entity_type, p_related_entity_id
  )
  returning id into new_notification_id;

  insert into public.notification_deliveries (
    workspace_id, notification_id, recipient_membership_id, delivered_at
  )
  select distinct
    p_workspace_id, new_notification_id, recipient_id, transaction_timestamp()
  from unnest(coalesce(p_recipient_membership_ids, array[]::uuid[])) as recipient_id
  where recipient_id is not null;

  return new_notification_id;
end;
$$;

-- Neutralises spreadsheet formula injection for export output: collapses line
-- breaks and prefixes dangerous leading characters with an apostrophe.
create or replace function public.rpc_internal_csv_safe(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then null
    when left(flattened.value, 1) in ('=', '+', '-', '@', chr(9), chr(13))
      then '''' || flattened.value
    else flattened.value
  end
  from (select regexp_replace(p_value, '[\r\n]+', ' ', 'g') as value) as flattened;
$$;

-- ---------------------------------------------------------------------------
-- 2. rpc_publish_rota_week — atomic snapshot + shifts + fan-out + audit
-- ---------------------------------------------------------------------------

create or replace function public.rpc_publish_rota_week(
  p_workspace_id uuid,
  p_rota_week_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  week_status text;
  week_start_date date;
  draft_shift_count integer;
  published_shift_count integer;
  next_version integer;
  new_snapshot_id uuid;
  new_notification_id uuid;
  notified_membership_count integer;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select rota_week.status, rota_week.week_start
  into week_status, week_start_date
  from public.rota_weeks as rota_week
  where rota_week.workspace_id = p_workspace_id
    and rota_week.id = p_rota_week_id
  for update;

  if week_status is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;

  if week_status = 'archived' then
    raise exception 'an archived rota week cannot be published' using errcode = '55000';
  end if;

  select count(*)
  into draft_shift_count
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id;

  if draft_shift_count = 0 then
    raise exception 'cannot publish a rota week with no shifts' using errcode = '55000';
  end if;

  update public.rota_weeks
  set status = 'published'
  where workspace_id = p_workspace_id
    and id = p_rota_week_id
    and status <> 'published';

  select coalesce(max(snapshot.version), 0) + 1
  into next_version
  from public.published_rota_snapshots as snapshot
  where snapshot.workspace_id = p_workspace_id
    and snapshot.rota_week_id = p_rota_week_id;

  insert into public.published_rota_snapshots (
    workspace_id, rota_week_id, version, published_at,
    published_by_membership_id, created_at
  )
  values (
    p_workspace_id, p_rota_week_id, next_version, transaction_timestamp(),
    caller_membership_id, transaction_timestamp()
  )
  returning id into new_snapshot_id;

  insert into public.published_rota_shifts (
    workspace_id, snapshot_id, source_shift_id, location_id, department_id,
    staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name,
    assignment_status, created_at
  )
  select
    shift.workspace_id, new_snapshot_id, shift.id, shift.location_id,
    shift.department_id, shift.staff_member_id, shift.shift_date,
    shift.starts_at, shift.ends_at, shift.break_minutes, shift.role_name,
    shift.assignment_status, transaction_timestamp()
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id;

  get diagnostics published_shift_count = row_count;

  if published_shift_count = 0 then
    raise exception 'cannot publish a rota week with no shifts' using errcode = '55000';
  end if;

  new_notification_id := public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'rota_published',
    'Rota published',
    format(
      'The rota for %s to %s is published.',
      to_char(week_start_date, 'DD Mon'),
      to_char(week_start_date + 6, 'DD Mon YYYY')
    ),
    'published_rota_snapshot',
    new_snapshot_id,
    array(
      select membership.id
      from public.workspace_memberships as membership
      where membership.workspace_id = p_workspace_id
        and membership.role = 'staff'
        and membership.status = 'active'
    )
  );

  select count(*)
  into notified_membership_count
  from public.notification_deliveries as delivery
  where delivery.workspace_id = p_workspace_id
    and delivery.notification_id = new_notification_id;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'rota.published',
    'published_rota_snapshot',
    new_snapshot_id,
    jsonb_build_object(
      'rota_week_id', p_rota_week_id,
      'version', next_version,
      'shift_count', published_shift_count,
      'notified_memberships', notified_membership_count
    )
  );

  return jsonb_build_object(
    'snapshot_id', new_snapshot_id,
    'version', next_version,
    'shift_count', published_shift_count,
    'notified_memberships', notified_membership_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. rpc_decide_leave_request — transition + event + notification + audit
-- ---------------------------------------------------------------------------

create or replace function public.rpc_decide_leave_request(
  p_workspace_id uuid,
  p_leave_request_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  current_status text;
  request_staff_member_id uuid;
  request_start_date date;
  request_end_date date;
  staff_membership_id uuid;
  trimmed_reason text;
  decision_event_type text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_status is null or p_status not in ('approved', 'declined', 'pending') then
    raise exception 'status must be approved, declined, or pending (reopen)'
      using errcode = '22023';
  end if;

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if trimmed_reason is not null and length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  select request.status, request.staff_member_id, request.start_date, request.end_date
  into current_status, request_staff_member_id, request_start_date, request_end_date
  from public.leave_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_leave_request_id
  for update;

  if current_status is null then
    raise exception 'leave request not found in workspace' using errcode = 'P0002';
  end if;

  if p_status in ('approved', 'declined') then
    if current_status <> 'pending' then
      raise exception 'only pending leave requests can be approved or declined'
        using errcode = '55000';
    end if;

    decision_event_type := p_status;

    update public.leave_requests
    set status = p_status,
        decided_at = transaction_timestamp(),
        decided_by_membership_id = caller_membership_id,
        decision_reason = trimmed_reason
    where workspace_id = p_workspace_id
      and id = p_leave_request_id;
  else
    if current_status not in ('approved', 'declined') then
      raise exception 'only decided leave requests can be reopened'
        using errcode = '55000';
    end if;

    decision_event_type := 'reopened';

    update public.leave_requests
    set status = 'pending',
        decided_at = null,
        decided_by_membership_id = null,
        decision_reason = null
    where workspace_id = p_workspace_id
      and id = p_leave_request_id;
  end if;

  insert into public.leave_request_events (
    workspace_id, leave_request_id, actor_membership_id, event_type,
    resulting_status, reason
  )
  values (
    p_workspace_id, p_leave_request_id, caller_membership_id,
    decision_event_type, p_status, trimmed_reason
  );

  select staff.membership_id
  into staff_membership_id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    case decision_event_type
      when 'approved' then 'leave_approved'
      when 'declined' then 'leave_declined'
      else 'announcement'
    end,
    case decision_event_type
      when 'approved' then 'Leave approved'
      when 'declined' then 'Leave declined'
      else 'Leave request reopened'
    end,
    format(
      'Your leave request for %s to %s is %s.',
      to_char(request_start_date, 'DD Mon YYYY'),
      to_char(request_end_date, 'DD Mon YYYY'),
      case decision_event_type
        when 'reopened' then 'back under review'
        else decision_event_type
      end
    ),
    'leave_request',
    p_leave_request_id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'leave.' || decision_event_type,
    'leave_request',
    p_leave_request_id,
    jsonb_build_object(
      'staff_member_id', request_staff_member_id,
      'resulting_status', p_status,
      'reason', trimmed_reason
    )
  );

  return jsonb_build_object(
    'leave_request_id', p_leave_request_id,
    'status', p_status
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. rpc_batch_approve_time_entries — atomic batch + per-entry events + audit
-- ---------------------------------------------------------------------------

create or replace function public.rpc_batch_approve_time_entries(
  p_workspace_id uuid,
  p_time_entry_ids uuid[],
  p_approval_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  unique_entry_ids uuid[];
  locked_entry_count integer;
  batch_id uuid := gen_random_uuid();
  processed_count integer := 0;
  skipped_count integer := 0;
  trimmed_reason text;
  entry_event_type text;
  target_entry record;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_approval_status is null
     or p_approval_status not in ('approved', 'rejected', 'pending') then
    raise exception 'approval status must be approved, rejected, or pending (reopen)'
      using errcode = '22023';
  end if;

  if p_time_entry_ids is null
     or cardinality(p_time_entry_ids) = 0
     or exists (
       select 1 from unnest(p_time_entry_ids) as entry_id where entry_id is null
     ) then
    raise exception 'at least one non-null time entry id is required'
      using errcode = '22023';
  end if;

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if trimmed_reason is not null and length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  select array_agg(distinct entry_id order by entry_id)
  into unique_entry_ids
  from unnest(p_time_entry_ids) as entry_id;

  -- Lock all targets in stable order; the whole batch is all-or-nothing.
  select count(*)
  into locked_entry_count
  from (
    select entry.id
    from public.time_entries as entry
    where entry.workspace_id = p_workspace_id
      and entry.id = any(unique_entry_ids)
    order by entry.id
    for update
  ) as locked_entries;

  if locked_entry_count <> cardinality(unique_entry_ids) then
    raise exception 'one or more time entries were not found in workspace'
      using errcode = 'P0002';
  end if;

  entry_event_type := case p_approval_status
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    else 'reopened'
  end;

  for target_entry in
    select entry.id, entry.approval_status
    from public.time_entries as entry
    where entry.workspace_id = p_workspace_id
      and entry.id = any(unique_entry_ids)
    order by entry.id
  loop
    if target_entry.approval_status = p_approval_status then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    if p_approval_status = 'approved' then
      update public.time_entries
      set approval_status = 'approved',
          approved_at = transaction_timestamp(),
          approved_by_membership_id = caller_membership_id
      where workspace_id = p_workspace_id
        and id = target_entry.id;
    else
      update public.time_entries
      set approval_status = p_approval_status,
          approved_at = null,
          approved_by_membership_id = null
      where workspace_id = p_workspace_id
        and id = target_entry.id;
    end if;

    insert into public.time_entry_events (
      workspace_id, time_entry_id, actor_membership_id, event_type,
      resulting_approval_status, reason
    )
    values (
      p_workspace_id, target_entry.id, caller_membership_id, entry_event_type,
      p_approval_status, trimmed_reason
    );

    processed_count := processed_count + 1;
  end loop;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entry.batch_' || entry_event_type,
    'time_entry_batch',
    batch_id,
    jsonb_build_object(
      'time_entry_ids', to_jsonb(unique_entry_ids),
      'resulting_approval_status', p_approval_status,
      'processed', processed_count,
      'skipped', skipped_count,
      'reason', trimmed_reason
    )
  );

  return jsonb_build_object(
    'batch_id', batch_id,
    'resulting_approval_status', p_approval_status,
    'processed', processed_count,
    'skipped', skipped_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. rpc_adjust_time_entry — full clock-state rewrite + reset + event + audit
-- ---------------------------------------------------------------------------

create or replace function public.rpc_adjust_time_entry(
  p_workspace_id uuid,
  p_time_entry_id uuid,
  p_clocked_in_at timestamptz,
  p_clocked_out_at timestamptz,
  p_break_minutes integer,
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
  trimmed_reason text;
  previous_entry record;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if trimmed_reason is null then
    raise exception 'an adjustment reason is required' using errcode = '22023';
  end if;

  if length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  if p_break_minutes is null or p_break_minutes not between 0 and 1440 then
    raise exception 'break minutes must be between 0 and 1440' using errcode = '22023';
  end if;

  if p_clocked_out_at is not null and p_clocked_in_at is null then
    raise exception 'a clock-out time requires a clock-in time' using errcode = '22023';
  end if;

  if p_clocked_in_at is not null
     and p_clocked_out_at is not null
     and p_clocked_out_at <= p_clocked_in_at then
    raise exception 'clock-out must be after clock-in' using errcode = '22023';
  end if;

  select entry.clocked_in_at, entry.clocked_out_at, entry.break_minutes,
         entry.approval_status
  into previous_entry
  from public.time_entries as entry
  where entry.workspace_id = p_workspace_id
    and entry.id = p_time_entry_id
  for update;

  if previous_entry.approval_status is null then
    raise exception 'time entry not found in workspace' using errcode = 'P0002';
  end if;

  update public.time_entries
  set clocked_in_at = p_clocked_in_at,
      clocked_out_at = p_clocked_out_at,
      break_minutes = p_break_minutes,
      approval_status = 'pending',
      approved_at = null,
      approved_by_membership_id = null
  where workspace_id = p_workspace_id
    and id = p_time_entry_id;

  insert into public.time_entry_events (
    workspace_id, time_entry_id, actor_membership_id, event_type,
    resulting_approval_status, reason
  )
  values (
    p_workspace_id, p_time_entry_id, caller_membership_id, 'adjusted',
    'pending', trimmed_reason
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entry.adjusted',
    'time_entry',
    p_time_entry_id,
    jsonb_build_object(
      'previous_clocked_in_at', previous_entry.clocked_in_at,
      'previous_clocked_out_at', previous_entry.clocked_out_at,
      'previous_break_minutes', previous_entry.break_minutes,
      'previous_approval_status', previous_entry.approval_status,
      'clocked_in_at', p_clocked_in_at,
      'clocked_out_at', p_clocked_out_at,
      'break_minutes', p_break_minutes,
      'reason', trimmed_reason
    )
  );

  return jsonb_build_object(
    'time_entry_id', p_time_entry_id,
    'approval_status', 'pending'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. rpc_staff_clock_event — caller-owned clocking with break pairing
--    No audit_events row by design: clock_events is itself the immutable
--    canonical record; audit_events stays an administrative action log.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_staff_clock_event(
  p_workspace_id uuid,
  p_event_type text,
  p_time_entry_id uuid default null
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
  target_time_entry_id uuid;
  target_clocked_in_at timestamptz;
  target_clocked_out_at timestamptz;
  open_break_count integer;
  event_time timestamptz := clock_timestamp();
  new_clock_event_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_membership(p_workspace_id);

  if public.has_workspace_role(p_workspace_id, array['owner', 'manager']) then
    raise exception 'the staff clock is for staff-role members only'
      using errcode = '42501';
  end if;

  own_staff_member_id := public.current_staff_member_id(p_workspace_id);

  if own_staff_member_id is null then
    raise exception 'caller has no active staff record in this workspace'
      using errcode = '42501';
  end if;

  if p_event_type is null
     or p_event_type not in ('clock_in', 'clock_out', 'break_start', 'break_end') then
    raise exception 'event type must be clock_in, clock_out, break_start, or break_end'
      using errcode = '22023';
  end if;

  -- Serialise clock operations per staff member.
  perform 1
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id
  for update;

  if p_event_type = 'clock_in' then
    if p_time_entry_id is not null then
      raise exception 'clock_in opens a new time entry; p_time_entry_id must be null'
        using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.time_entries as entry
      where entry.workspace_id = p_workspace_id
        and entry.staff_member_id = own_staff_member_id
        and entry.clocked_in_at is not null
        and entry.clocked_out_at is null
    ) then
      raise exception 'staff member is already clocked in' using errcode = '55000';
    end if;

    insert into public.time_entries (
      workspace_id, staff_member_id, work_date, clocked_in_at
    )
    values (p_workspace_id, own_staff_member_id, current_date, event_time)
    returning id into target_time_entry_id;
  else
    if p_time_entry_id is not null then
      select entry.id, entry.clocked_in_at, entry.clocked_out_at
      into target_time_entry_id, target_clocked_in_at, target_clocked_out_at
      from public.time_entries as entry
      where entry.workspace_id = p_workspace_id
        and entry.id = p_time_entry_id
        and entry.staff_member_id = own_staff_member_id
      for update;

      if target_time_entry_id is null then
        raise exception 'time entry not found in workspace for this staff member'
          using errcode = 'P0002';
      end if;
    else
      select entry.id, entry.clocked_in_at, entry.clocked_out_at
      into target_time_entry_id, target_clocked_in_at, target_clocked_out_at
      from public.time_entries as entry
      where entry.workspace_id = p_workspace_id
        and entry.staff_member_id = own_staff_member_id
        and entry.clocked_in_at is not null
        and entry.clocked_out_at is null
      order by entry.clocked_in_at desc
      limit 1
      for update;

      if target_time_entry_id is null then
        raise exception 'no open time entry for this action' using errcode = '55000';
      end if;
    end if;

    if target_clocked_in_at is null then
      raise exception 'time entry has no clock-in' using errcode = '55000';
    end if;

    if target_clocked_out_at is not null then
      raise exception 'time entry is already clocked out' using errcode = '55000';
    end if;

    select count(*) filter (where event.event_type = 'break_start')
         - count(*) filter (where event.event_type = 'break_end')
    into open_break_count
    from public.clock_events as event
    where event.workspace_id = p_workspace_id
      and event.time_entry_id = target_time_entry_id;

    if p_event_type = 'clock_out' then
      if open_break_count > 0 then
        raise exception 'close the open break before clocking out' using errcode = '55000';
      end if;

      update public.time_entries
      set clocked_out_at = event_time
      where workspace_id = p_workspace_id
        and id = target_time_entry_id;
    elsif p_event_type = 'break_start' then
      if open_break_count > 0 then
        raise exception 'a break is already in progress' using errcode = '55000';
      end if;
    else
      if open_break_count <= 0 then
        raise exception 'no break in progress' using errcode = '55000';
      end if;
    end if;
  end if;

  insert into public.clock_events (
    workspace_id, time_entry_id, staff_member_id, actor_membership_id,
    event_type, source, occurred_at
  )
  values (
    p_workspace_id, target_time_entry_id, own_staff_member_id,
    caller_membership_id, p_event_type, 'staff', event_time
  )
  returning id into new_clock_event_id;

  return jsonb_build_object(
    'time_entry_id', target_time_entry_id,
    'clock_event_id', new_clock_event_id,
    'event_type', p_event_type,
    'occurred_at', event_time
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. rpc_submit_leave_request — staff submission + event + manager fan-out
--    Closes the audit finding that staff have no direct path to the
--    'submitted' event row or the manager notification.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_submit_leave_request(
  p_workspace_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date date,
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
  trimmed_reason text;
  staff_display_name text;
  new_request_id uuid;
begin
  select * into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id);

  if p_leave_type is null
     or p_leave_type not in ('annual_leave', 'personal', 'sick', 'unpaid', 'other') then
    raise exception 'leave type must be annual_leave, personal, sick, unpaid, or other'
      using errcode = '22023';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'a valid start and end date is required' using errcode = '22023';
  end if;

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if trimmed_reason is null or length(trimmed_reason) > 2000 then
    raise exception 'a reason of at most 2000 characters is required'
      using errcode = '22023';
  end if;

  insert into public.leave_requests (
    workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
    status, submitted_at, created_at
  )
  values (
    p_workspace_id, own_staff_member_id, p_leave_type, p_start_date, p_end_date,
    trimmed_reason, 'pending', transaction_timestamp(), transaction_timestamp()
  )
  returning id into new_request_id;

  insert into public.leave_request_events (
    workspace_id, leave_request_id, actor_membership_id, event_type,
    resulting_status, reason
  )
  values (
    p_workspace_id, new_request_id, caller_membership_id, 'submitted',
    'pending', trimmed_reason
  );

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'announcement',
    'New leave request',
    format(
      '%s requested %s leave from %s to %s.',
      staff_display_name,
      replace(p_leave_type, '_', ' '),
      to_char(p_start_date, 'DD Mon YYYY'),
      to_char(p_end_date, 'DD Mon YYYY')
    ),
    'leave_request',
    new_request_id,
    array(
      select membership.id
      from public.workspace_memberships as membership
      where membership.workspace_id = p_workspace_id
        and membership.role in ('owner', 'manager')
        and membership.status = 'active'
        and membership.id <> caller_membership_id
    )
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'leave.submitted',
    'leave_request',
    new_request_id,
    jsonb_build_object(
      'staff_member_id', own_staff_member_id,
      'leave_type', p_leave_type,
      'start_date', p_start_date,
      'end_date', p_end_date
    )
  );

  return jsonb_build_object(
    'leave_request_id', new_request_id,
    'status', 'pending'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. rpc_export_approved_hours — server-authoritative, CSV-safe, audited
--    Approved entries with both clock times only; one aggregated row per
--    staff member. No payroll integration: this is an export of hours only.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_export_approved_hours(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
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

  select count(distinct entry.staff_member_id), count(*)
  into exported_staff_count, exported_entry_count
  from public.time_entries as entry
  where entry.workspace_id = p_workspace_id
    and entry.approval_status = 'approved'
    and entry.work_date between p_start_date and p_end_date
    and entry.clocked_in_at is not null
    and entry.clocked_out_at is not null;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entries.exported',
    'workspace',
    p_workspace_id,
    jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date,
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
    coalesce(sum(
      greatest(
        0,
        floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::bigint
          - entry.break_minutes
      )
    ), 0)::bigint,
    round(
      coalesce(sum(
        greatest(
          0,
          floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::bigint
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
  group by staff.id, staff.display_name, staff.role_name, department.name
  order by staff.display_name, staff.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Execute grants
--    Supabase default privileges grant function execute broadly; the surface
--    is narrowed to: public RPCs -> authenticated only, helpers -> nobody.
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_internal_require_membership(uuid) from public, anon, authenticated;
revoke all on function public.rpc_internal_require_manager(uuid) from public, anon, authenticated;
revoke all on function public.rpc_internal_require_staff(uuid) from public, anon, authenticated;
revoke all on function public.rpc_internal_write_audit(uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.rpc_internal_notify(uuid, uuid, text, text, text, text, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.rpc_internal_csv_safe(text) from public, anon, authenticated;

revoke all on function public.rpc_publish_rota_week(uuid, uuid) from public, anon;
revoke all on function public.rpc_decide_leave_request(uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_batch_approve_time_entries(uuid, uuid[], text, text) from public, anon;
revoke all on function public.rpc_adjust_time_entry(uuid, uuid, timestamptz, timestamptz, integer, text) from public, anon;
revoke all on function public.rpc_staff_clock_event(uuid, text, uuid) from public, anon;
revoke all on function public.rpc_submit_leave_request(uuid, text, date, date, text) from public, anon;
revoke all on function public.rpc_export_approved_hours(uuid, date, date) from public, anon;

grant execute on function public.rpc_publish_rota_week(uuid, uuid) to authenticated;
grant execute on function public.rpc_decide_leave_request(uuid, uuid, text, text) to authenticated;
grant execute on function public.rpc_batch_approve_time_entries(uuid, uuid[], text, text) to authenticated;
grant execute on function public.rpc_adjust_time_entry(uuid, uuid, timestamptz, timestamptz, integer, text) to authenticated;
grant execute on function public.rpc_staff_clock_event(uuid, text, uuid) to authenticated;
grant execute on function public.rpc_submit_leave_request(uuid, text, date, date, text) to authenticated;
grant execute on function public.rpc_export_approved_hours(uuid, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Contract documentation
-- ---------------------------------------------------------------------------

comment on function public.rpc_publish_rota_week(uuid, uuid) is
  'Manager/owner only. Atomically publishes a rota week: status update, sequential versioned snapshot, denormalised shifts, rota_published fan-out to active staff memberships, audit event. Rejects empty and archived weeks (55000).';

comment on function public.rpc_decide_leave_request(uuid, uuid, text, text) is
  'Manager/owner only. p_status approved|declined (from pending) or pending (reopen from a decided state). Writes the decision, an immutable event, a staff notification, and an audit event in one transaction.';

comment on function public.rpc_batch_approve_time_entries(uuid, uuid[], text, text) is
  'Manager/owner only. All-or-nothing batch transition to approved|rejected|pending with per-entry immutable events and one summary audit event. Entries already in the target status are skipped and counted.';

comment on function public.rpc_adjust_time_entry(uuid, uuid, timestamptz, timestamptz, integer, text) is
  'Manager/owner only. Replaces the clock state of a time entry, resets approval to pending, and records an adjusted event plus an audit event with previous values. A reason is mandatory.';

comment on function public.rpc_staff_clock_event(uuid, text, uuid) is
  'Staff role only, own records only. clock_in opens a new time entry; clock_out/break_start/break_end act on the open (or explicitly owned) entry with break pairing enforced. Events are staff-sourced at server time; clock_events is the immutable record.';

comment on function public.rpc_submit_leave_request(uuid, text, date, date, text) is
  'Any active staff record holder, own record only. Creates a pending leave request at transaction time with its submitted event, notifies active owner/manager memberships, and writes an audit event.';

comment on function public.rpc_export_approved_hours(uuid, date, date) is
  'Manager/owner only. Aggregated approved hours per staff member for a date range (max one year) from approved entries with both clock times; text fields are CSV-injection safe; every export is audited. Hours export only - no payroll integration.';
