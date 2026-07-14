-- Phase 31: one deterministic lock protocol for open-shift eligibility facts.
--
-- Publication (phase 29 preflight) and applicant selection (phase 27) already
-- lock the applicant's staff_members row FOR UPDATE before reading the facts
-- that decide eligibility (employment/membership status, role, approved
-- leave, approved recurring days off, overlapping shifts, weekly hours). Two
-- writers did not participate, leaving a window where publication could
-- confirm a requester using facts that changed concurrently:
--   * rpc_decide_leave_request / rpc_decide_recurring_day_off locked only the
--     request row, so an approval could commit between preflight's read and
--     the publish commit;
--   * draft shift assignment writes (direct manager table writes and the copy
--     RPCs) locked only the shift row, so a concurrent overlapping assignment
--     was invisible to the preflight overlap/hours checks.
--
-- Protocol (every participating writer, identical ordering):
--   1. rota_weeks row        — all week-scoped writers (publish, select,
--                              decline, request) lock the week first.
--   2. open_shift_requests   — publish finalisation locks in id order;
--                              single-request RPCs lock their one row.
--   3. shifts row            — the draft shift under decision.
--   4. staff_members row     — LAST, the per-person eligibility authority.
--      Multi-person operations acquire staff locks in ascending
--      staff_member_id order (phase 29 preflight iterates requests ordered by
--      staff_member_id; rpc_copy_rota_day and the copy-week server function
--      insert in ascending staff order), so no two multi-person writers can
--      acquire staff rows in opposing orders.
--   Leave / day-off deciders lock their request row, then the staff row. No
--   participating writer ever locks a leave or day-off row after a staff row,
--   so the ordering is acyclic. Locking is per staff member — unrelated
--   staff/week operations are never serialised against each other.
--
-- Everything here is enforced at database level; no application convention is
-- load-bearing.

-- ---------------------------------------------------------------------------
-- 1. Draft shift assignment writes take the staff eligibility lock.
--    Fires for any INSERT that assigns a person and any UPDATE that changes
--    who works the shift or the facts the overlap/weekly-hours checks read.
-- ---------------------------------------------------------------------------

create or replace function public.lock_staff_for_shift_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.staff_member_id is not null
     and (tg_op = 'INSERT'
          or new.staff_member_id is distinct from old.staff_member_id
          or new.shift_date is distinct from old.shift_date
          or new.starts_at is distinct from old.starts_at
          or new.ends_at is distinct from old.ends_at
          or new.break_minutes is distinct from old.break_minutes) then
    perform 1
    from public.staff_members as staff
    where staff.workspace_id = new.workspace_id
      and staff.id = new.staff_member_id
    for update;
  end if;
  return new;
end;
$$;

revoke all on function public.lock_staff_for_shift_assignment()
  from public, anon, authenticated;

drop trigger if exists shifts_lock_staff_for_assignment on public.shifts;
create trigger shifts_lock_staff_for_assignment
before insert or update on public.shifts
for each row execute function public.lock_staff_for_shift_assignment();

comment on function public.lock_staff_for_shift_assignment() is
  'Eligibility lock protocol: any write that assigns a staff member to a shift, or changes an assigned shift''s date/time/break, locks that staff_members row for the transaction so publication preflight cannot read overlap/hours facts that are changing concurrently.';

-- ---------------------------------------------------------------------------
-- 2. rpc_decide_leave_request joins the protocol: request row, then the staff
--    row, before the decision is written. Body otherwise identical to phase 5.
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

  -- Eligibility lock protocol: the staff row is the per-person authority.
  -- Publication preflight and applicant selection hold it while reading leave
  -- facts; taking the same lock here means a leave decision and a publication
  -- that depends on it can only run one after the other.
  perform 1
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_staff_member_id
  for update;

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
-- 3. rpc_decide_recurring_day_off joins the protocol the same way.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_decide_recurring_day_off(
  p_workspace_id uuid,
  p_request_id uuid,
  p_status text,
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
  current_status text;
  request_staff_member_id uuid;
  request_weekday smallint;
  staff_membership_id uuid;
  trimmed_note text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_status is null or p_status not in ('approved', 'declined', 'pending') then
    raise exception 'status must be approved, declined, or pending (reopen)'
      using errcode = '22023';
  end if;

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is not null and length(trimmed_note) > 500 then
    raise exception 'note must be at most 500 characters' using errcode = '22023';
  end if;

  select request.status, request.staff_member_id, request.weekday
  into current_status, request_staff_member_id, request_weekday
  from public.staff_recurring_day_off_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if current_status is null then
    raise exception 'recurring day-off request not found in workspace' using errcode = 'P0002';
  end if;

  -- Eligibility lock protocol: same staff-row lock as the leave decider, so a
  -- day-off approval and a publication that reads it serialise.
  perform 1
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_staff_member_id
  for update;

  if p_status in ('approved', 'declined') then
    if current_status <> 'pending' then
      raise exception 'only pending requests can be approved or declined'
        using errcode = '55000';
    end if;
    update public.staff_recurring_day_off_requests
    set status = p_status,
        decided_at = transaction_timestamp(),
        decided_by_membership_id = caller_membership_id,
        decision_note = trimmed_note
    where workspace_id = p_workspace_id and id = p_request_id;
  else
    if current_status not in ('approved', 'declined') then
      raise exception 'only decided requests can be reopened' using errcode = '55000';
    end if;
    update public.staff_recurring_day_off_requests
    set status = 'pending',
        decided_at = null,
        decided_by_membership_id = null,
        decision_note = null
    where workspace_id = p_workspace_id and id = p_request_id;
  end if;

  select staff.membership_id
  into staff_membership_id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'announcement',
    case p_status
      when 'approved' then 'Regular day off approved'
      when 'declined' then 'Regular day off declined'
      else 'Regular day off reopened'
    end,
    format(
      'Your request to have %s off every week is %s.',
      public.weekday_label(request_weekday),
      case p_status
        when 'pending' then 'back under review'
        else p_status
      end
    ),
    'recurring_day_off',
    p_request_id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'recurring_day_off.' || p_status,
    'recurring_day_off',
    p_request_id,
    jsonb_build_object('staff_member_id', request_staff_member_id, 'weekday', request_weekday)
  );

  return jsonb_build_object('request_id', p_request_id, 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. rpc_copy_rota_day acquires staff locks in ascending staff order so bulk
--    copies can never interleave lock acquisition with the phase 29 preflight
--    (which also ascends). Body otherwise identical to phase 20.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_copy_rota_day(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_from_weekday smallint,
  p_to_weekdays smallint[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  workspace_tz text;
  week_start date;
  week_status text;
  created_count integer := 0;
  target smallint;
  to_date date;
  from_date date;
  src record;
  st time;
  et time;
  new_starts timestamptz;
  new_ends timestamptz;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_from_weekday is null or p_from_weekday < 0 or p_from_weekday > 6 then
    raise exception 'source weekday must be between 0 (Monday) and 6 (Sunday)'
      using errcode = '22023';
  end if;

  select rw.week_start, rw.status into week_start, week_status
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = p_rota_week_id;
  if week_start is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;
  if week_status <> 'draft' then
    raise exception 'only draft rota weeks can be edited' using errcode = '55000';
  end if;

  select timezone into workspace_tz from public.workspaces where id = p_workspace_id;
  workspace_tz := coalesce(workspace_tz, 'UTC');
  from_date := week_start + p_from_weekday;

  for target in select distinct unnest(coalesce(p_to_weekdays, array[]::smallint[])) loop
    if target < 0 or target > 6 or target = p_from_weekday then
      continue;
    end if;
    to_date := week_start + target;

    for src in
      select location_id, department_id, staff_member_id, starts_at, ends_at,
             break_minutes, role_name, assignment_status, colour_override, dept_override
      from public.shifts
      where workspace_id = p_workspace_id
        and rota_week_id = p_rota_week_id
        and shift_date = from_date
      -- Ascending staff order = the protocol's staff-lock acquisition order.
      order by staff_member_id asc nulls first, id asc
    loop
      st := (src.starts_at at time zone workspace_tz)::time;
      et := (src.ends_at at time zone workspace_tz)::time;
      new_starts := (to_date + st) at time zone workspace_tz;
      new_ends := ((case when et <= st then to_date + 1 else to_date end) + et) at time zone workspace_tz;

      insert into public.shifts (
        workspace_id, rota_week_id, location_id, department_id, staff_member_id,
        shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status,
        colour_override, dept_override
      )
      values (
        p_workspace_id, p_rota_week_id, src.location_id, src.department_id, src.staff_member_id,
        to_date, new_starts, new_ends, src.break_minutes, src.role_name, src.assignment_status,
        src.colour_override, src.dept_override
      );
      created_count := created_count + 1;
    end loop;
  end loop;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'rota_day.copied',
    'rota_week', p_rota_week_id,
    jsonb_build_object('from_weekday', p_from_weekday, 'shifts_created', created_count)
  );

  return jsonb_build_object('shifts_created', created_count);
end;
$$;

notify pgrst, 'reload schema';
