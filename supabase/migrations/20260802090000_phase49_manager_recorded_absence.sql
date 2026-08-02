-- Phase 49 — manager-recorded absence.
--
-- Closes the last manager operating-loop gap: a manager takes a phone call and
-- records the absence directly, instead of waiting for a portal submission.
--
-- Reuses the existing absence model exactly. There is no second model:
--   * the row is a normal public.leave_requests row;
--   * it is created already `approved`, which the table's own CHECK requires to
--     carry `decided_at` + `decided_by_membership_id` — so the manager is
--     recorded as the decision-maker on existing columns;
--   * it is NOT a simulated portal submission: no 'submitted' event is written,
--     and `submitted_at` simply defaults to the moment the manager recorded it.
--
-- Overlap rule (deliberate, tested): a new absence is refused when the staff
-- member already has a leave request overlapping the date range with status
-- 'pending' or 'approved'. 'declined' and 'cancelled' rows are ignored, because
-- they do not reserve the days.
--
-- Conflicting shifts are DETECTED and RETURNED, never modified. No
-- rota_operational_issues row is opened here: that table requires a NOT NULL
-- `source_snapshot_id` referencing `published_rota_snapshots`, so it models a
-- *published* rota diverging from approved leave. Draft weeks — the only weeks
-- that exist while publication is paused — cannot be represented in it cleanly.
-- The existing rpc_decide_leave_request path continues to own that behaviour for
-- published weeks and is deliberately left untouched.
--
-- Refusals use 55000 (deterministic) so PostgREST does not retry them, and
-- 22023 for malformed input. Every refusal raises before any write, so the
-- statement rolls back with nothing persisted.
--
-- This migration also narrows the phase-11 past-date guard so a manager can
-- record an absence that has already started — see the next section.

-- ---------------------------------------------------------------------------
-- 1. Past-date guard — narrow exemption for manager-recorded absence
--
-- The phase-11 guard (20260612091100) blocks ANY insert whose start_date is in
-- the past while auth.uid() is present. It was written for portal submissions,
-- where back-dating is a real abuse vector, but it equally blocked a manager
-- recording yesterday's call-in — the exact case Phase 49 exists to serve.
--
-- The block is kept for every path except one: an already-approved row whose
-- decider is the calling user's own active owner/manager membership in the
-- same workspace. All four conditions are required together.
--
-- A staff user cannot reach the exemption:
--   * supplying status='approved' does not help — their membership's role is
--     'staff', so the role test fails;
--   * supplying a foreign decided_by_membership_id does not help — the
--     membership must have user_id = auth.uid();
--   * an inactive/invited/suspended/revoked membership fails the status test;
--   * a membership from another workspace fails the workspace_id test.
--
-- Defence in depth, verified against the live policy set: the RLS policy
-- `leave_requests_staff_insert` already forbids any authenticated direct
-- insert with status='approved' or a non-null decided_by_membership_id, and
-- there is NO manager insert policy on public.leave_requests. The exemption is
-- therefore only reachable from SECURITY DEFINER code, and the only other
-- SECURITY DEFINER inserter — rpc_submit_leave_request — always writes
-- status='pending' with a null decider. In practice this opens the past-date
-- path for exactly one function: rpc_manager_record_absence.
--
-- Only the past-date branch changed. The transaction-time branch and the
-- UPDATE decider branch are reproduced verbatim from phase 11.
-- ---------------------------------------------------------------------------

create or replace function public.guard_leave_request_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
begin
  if acting_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.start_date < current_date then
    if not (
      new.status = 'approved'
      and new.decided_by_membership_id is not null
      and exists (
        select 1
        from public.workspace_memberships as decider
        where decider.id = new.decided_by_membership_id
          and decider.workspace_id = new.workspace_id
          and decider.user_id = acting_user_id
          and decider.status = 'active'
          and decider.role in ('owner', 'manager')
      )
    ) then
      raise exception 'leave requests cannot start in the past' using errcode = '22023';
    end if;
  end if;

  if tg_op = 'INSERT'
     and (new.submitted_at is distinct from transaction_timestamp()
          or new.created_at is distinct from transaction_timestamp()) then
    raise exception 'leave requests must be submitted with the current transaction time'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
     and new.decided_by_membership_id is distinct from old.decided_by_membership_id
     and new.decided_by_membership_id is not null
     and new.decided_by_membership_id
         <> public.current_workspace_membership_id(new.workspace_id) then
    raise exception 'decided_by_membership_id must be the active membership of the deciding caller'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.guard_leave_request_write() is
  'Leave-request write guard. Past-dated starts are refused (22023) except for a manager-recorded absence: status=approved whose decided_by_membership_id is the calling user''s own active owner/manager membership in the same workspace. Submission timestamps must be transaction-honest (55000); an UPDATE may only set decided_by_membership_id to the caller''s active membership (42501).';

-- ---------------------------------------------------------------------------
-- 2. The manager-recorded absence RPC
-- ---------------------------------------------------------------------------

create or replace function public.rpc_manager_record_absence(
  p_workspace_id uuid,
  p_staff_member_id uuid,
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
  staff_employment_status text;
  staff_display_name text;
  staff_membership_id uuid;
  trimmed_reason text;
  new_request_id uuid;
  conflicting_shifts jsonb;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_leave_type is null
     or p_leave_type not in ('annual_leave', 'personal', 'sick', 'unpaid', 'other') then
    raise exception
      'leave_type must be one of annual_leave, personal, sick, unpaid, other'
      using errcode = '22023';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'start_date and end_date are required' using errcode = '22023';
  end if;

  if p_end_date < p_start_date then
    raise exception 'end_date must not be before start_date' using errcode = '22023';
  end if;

  if (p_end_date - p_start_date) > 366 then
    raise exception 'absence must not span more than 366 days' using errcode = '22023';
  end if;

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if trimmed_reason is null then
    raise exception 'reason is required' using errcode = '22023';
  end if;

  if length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  -- Eligibility lock protocol: the staff row is the per-person authority, and
  -- publication preflight / applicant selection hold it while reading leave
  -- facts. Taking it here, in the same order as rpc_decide_leave_request, means
  -- recording an absence and a publication that depends on it serialise.
  select staff.employment_status, staff.display_name, staff.membership_id
  into staff_employment_status, staff_display_name, staff_membership_id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = p_staff_member_id
  for update;

  if staff_employment_status is null then
    raise exception 'staff member not found in workspace' using errcode = 'P0002';
  end if;

  if staff_employment_status <> 'active' then
    raise exception 'absence can only be recorded for an active staff member'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.leave_requests as existing
    where existing.workspace_id = p_workspace_id
      and existing.staff_member_id = p_staff_member_id
      and existing.status in ('pending', 'approved')
      and existing.start_date <= p_end_date
      and existing.end_date >= p_start_date
  ) then
    raise exception 'staff member already has leave covering part of that range'
      using errcode = '55000';
  end if;

  insert into public.leave_requests (
    workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
    status, decided_at, decided_by_membership_id, decision_reason
  )
  values (
    p_workspace_id, p_staff_member_id, p_leave_type, p_start_date, p_end_date,
    trimmed_reason, 'approved', transaction_timestamp(), caller_membership_id,
    trimmed_reason
  )
  returning id into new_request_id;

  insert into public.leave_request_events (
    workspace_id, leave_request_id, actor_membership_id, event_type,
    resulting_status, reason
  )
  values (
    p_workspace_id, new_request_id, caller_membership_id, 'approved',
    'approved', trimmed_reason
  );

  -- Shifts the absence overlaps. Reported so the manager can act; never edited
  -- or deleted here. Day boundaries follow the shift's own location timezone,
  -- matching the comparison rpc_decide_leave_request already uses.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'shift_id', conflict.id,
               'rota_week_id', conflict.rota_week_id,
               'shift_date', conflict.shift_date,
               'starts_at', conflict.starts_at,
               'ends_at', conflict.ends_at,
               'role_name', conflict.role_name,
               'assignment_status', conflict.assignment_status
             )
             order by conflict.shift_date, conflict.starts_at
           ),
           '[]'::jsonb
         )
  into conflicting_shifts
  from (
    select shift.id, shift.rota_week_id, shift.shift_date, shift.starts_at,
           shift.ends_at, shift.role_name, shift.assignment_status
    from public.shifts as shift
    join public.workspaces as workspace
      on workspace.id = shift.workspace_id
    left join public.locations as location
      on location.workspace_id = shift.workspace_id
     and location.id = shift.location_id
    where shift.workspace_id = p_workspace_id
      and shift.staff_member_id = p_staff_member_id
      and p_start_date <= (
        (shift.ends_at - interval '1 second') at time zone
          coalesce(location.timezone, workspace.timezone, 'UTC')
      )::date
      and p_end_date >= shift.shift_date
  ) as conflict;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'leave_approved',
    'Absence recorded',
    format(
      'Your manager recorded %s leave for you from %s to %s.',
      replace(p_leave_type, '_', ' '),
      to_char(p_start_date, 'DD Mon YYYY'),
      to_char(p_end_date, 'DD Mon YYYY')
    ),
    'leave_request',
    new_request_id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  -- Exactly one audit event for the whole operation.
  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'leave.manager_recorded',
    'leave_request',
    new_request_id,
    jsonb_build_object(
      'staff_member_id', p_staff_member_id,
      'leave_type', p_leave_type,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'conflicting_shift_count', jsonb_array_length(conflicting_shifts)
    )
  );

  return jsonb_build_object(
    'leave_request_id', new_request_id,
    'staff_member_id', p_staff_member_id,
    'staff_display_name', staff_display_name,
    'leave_type', p_leave_type,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'status', 'approved',
    'conflicting_shifts', conflicting_shifts
  );
end;
$$;

revoke all on function public.rpc_manager_record_absence(uuid, uuid, text, date, date, text)
  from public, anon;
grant execute on function public.rpc_manager_record_absence(uuid, uuid, text, date, date, text)
  to authenticated;

comment on function public.rpc_manager_record_absence(uuid, uuid, text, date, date, text) is
  'Manager/owner records an already-approved absence for an active staff member. Reuses public.leave_requests; refuses when leave overlapping the range is already pending or approved. Returns overlapping shifts for review without modifying them. Writes exactly one audit event (leave.manager_recorded).';

notify pgrst, 'reload schema';
