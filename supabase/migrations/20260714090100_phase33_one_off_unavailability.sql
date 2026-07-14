-- Phase 33: one-off (date-specific) unavailability.
--
-- A staff member sometimes cannot work one specific date ("I can't do this
-- Friday"). That is a scheduling constraint, not leave: no allowance, no
-- absence record — just a fact the rota should warn about. This mirrors the
-- phase 14 recurring-day-off model with a date instead of a weekday:
--   * staff_one_off_unavailability_requests — one row per (staff member, date).
--   * staff_portal_one_off_unavailability   — the caller's OWN requests only.
--   * rpc_request_one_off_unavailability / rpc_withdraw_one_off_unavailability
--     (staff, withdraw pending-only) and rpc_decide_one_off_unavailability
--     (manager approve / decline / reopen, phase-31 staff-lock protocol).
--
-- Semantics:
--   * pending requests do NOT affect eligibility — only approved rows do;
--   * approved rows join the same eligibility facts as approved leave and
--     approved recurring days off: applicant selection and the phase 29
--     publication preflight refuse to confirm an assignment on that date
--     (draft-grid warnings stay warnings — managers can still assign manually
--     and acknowledge at publish);
--   * approved unavailability removal is manager-mediated in this batch
--     (staff withdraw covers pending only; managers reopen then decline).

-- ---------------------------------------------------------------------------
-- 1. staff_one_off_unavailability_requests
-- ---------------------------------------------------------------------------

create table public.staff_one_off_unavailability_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_member_id uuid not null,
  date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  note text check (note is null or length(note) <= 500),
  decided_by_membership_id uuid,
  decided_at timestamptz,
  decision_note text check (decision_note is null or length(decision_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, staff_member_id, date),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, decided_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (
    (status = 'pending' and decided_by_membership_id is null and decided_at is null)
    or (status <> 'pending' and decided_by_membership_id is not null and decided_at is not null)
  )
);

create index staff_one_off_unavailability_workspace_staff_idx
  on public.staff_one_off_unavailability_requests (workspace_id, staff_member_id, date desc);

create index staff_one_off_unavailability_workspace_date_idx
  on public.staff_one_off_unavailability_requests (workspace_id, date, status);

create index staff_one_off_unavailability_workspace_decided_by_idx
  on public.staff_one_off_unavailability_requests (workspace_id, decided_by_membership_id)
  where decided_by_membership_id is not null;

create trigger staff_one_off_unavailability_set_updated_at
before update on public.staff_one_off_unavailability_requests
for each row execute function public.set_updated_at();

create trigger staff_one_off_unavailability_protect_immutable
before update on public.staff_one_off_unavailability_requests
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'staff_member_id', 'date', 'created_at'
);

alter table public.staff_one_off_unavailability_requests enable row level security;

revoke all on table public.staff_one_off_unavailability_requests from public, anon;
-- Managers read the whole workspace list; staff never touch the base table
-- directly. Every write flows through the SECURITY DEFINER RPCs below.
grant select on table public.staff_one_off_unavailability_requests to authenticated;

create policy staff_one_off_unavailability_manager_select
on public.staff_one_off_unavailability_requests for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.staff_one_off_unavailability_requests is
  'Date-specific unavailability requests (a scheduling constraint, not leave). Managers approve or decline; staff read only their own rows through staff_portal_one_off_unavailability. All writes go through phase 33 RPCs.';

-- ---------------------------------------------------------------------------
-- 2. staff_portal_one_off_unavailability — the caller's own requests only.
--    Owner-rights barrier view (same model as staff_portal_recurring_days_off).
-- ---------------------------------------------------------------------------

create view public.staff_portal_one_off_unavailability
with (security_barrier = true)
as
select
  request.workspace_id,
  request.id as request_id,
  request.staff_member_id,
  request.date,
  request.status,
  request.note,
  request.decision_note,
  request.decided_at,
  request.created_at,
  request.updated_at
from public.staff_one_off_unavailability_requests as request
where request.staff_member_id = public.current_staff_member_id(request.workspace_id);

grant select on public.staff_portal_one_off_unavailability to authenticated;

comment on view public.staff_portal_one_off_unavailability is
  'A staff member''s own one-off unavailability requests and their status. Never exposes colleague requests or manager-only fields.';

-- ---------------------------------------------------------------------------
-- 3. Notification kinds — one new kind for unavailability request traffic.
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'shift_changed',
    'rota_published',
    'leave_approved',
    'leave_declined',
    'announcement',
    'timesheet_reminder',
    'open_shift_update',
    'shift_release_update',
    'unavailability_update'
  )
);

-- ---------------------------------------------------------------------------
-- 4. rpc_request_one_off_unavailability — staff request, or re-request a
--    declined/withdrawn date. Approved rows are manager-mediated and cannot
--    be rewritten by staff.
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

  -- Request row then staff row: the same per-person order as the decision and
  -- publication paths. Re-check after the staff lock to close the concurrent
  -- first-request race without relying on a broad table lock.
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
        and membership.id <> caller_membership_id
    )
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    case
      when request_was_updated then 'one_off_unavailability.updated'
      else 'one_off_unavailability.requested'
    end,
    'one_off_unavailability',
    new_request_id,
    jsonb_build_object('staff_member_id', own_staff_member_id, 'date', p_date)
  );

  return jsonb_build_object('request_id', new_request_id, 'status', 'pending');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. rpc_withdraw_one_off_unavailability — staff mark their own PENDING
--    request. Approved rows are manager-mediated (reopen, then decline).
-- ---------------------------------------------------------------------------

create or replace function public.rpc_withdraw_one_off_unavailability(
  p_workspace_id uuid,
  p_date date
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
  existing_status text;
  request_id uuid;
begin
  select required.o_membership_id, required.o_staff_member_id
  into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id) as required;

  select request.id, request.status
  into request_id, existing_status
  from public.staff_one_off_unavailability_requests as request
  where request.workspace_id = p_workspace_id
    and request.staff_member_id = own_staff_member_id
    and request.date = p_date
  for update;

  if existing_status is null then
    raise exception 'no unavailability request for that date' using errcode = 'P0002';
  end if;
  if existing_status <> 'pending' then
    raise exception 'only pending unavailability requests can be withdrawn — ask your manager to change a decided one'
      using errcode = '55000';
  end if;

  -- Lock the eligibility authority after the request row. Although pending
  -- rows do not affect scheduling, retaining one protocol prevents future
  -- transition additions from introducing an inverted lock order.
  perform public.rpc_internal_lock_staff_eligibility(
    p_workspace_id,
    array[own_staff_member_id]
  );

  update public.staff_one_off_unavailability_requests
  set status = 'withdrawn',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp(),
      decision_note = null
  where workspace_id = p_workspace_id
    and id = request_id;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'one_off_unavailability.withdrawn',
    'one_off_unavailability',
    request_id,
    jsonb_build_object('staff_member_id', own_staff_member_id, 'date', p_date)
  );

  return jsonb_build_object('request_id', request_id, 'status', 'withdrawn');
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. rpc_decide_one_off_unavailability — manager approve / decline / reopen.
--    Joins the phase-31 lock protocol: request row, then the staff row.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_decide_one_off_unavailability(
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
  request_date date;
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

  select request.status, request.staff_member_id, request.date
  into current_status, request_staff_member_id, request_date
  from public.staff_one_off_unavailability_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if current_status is null then
    raise exception 'unavailability request not found in workspace' using errcode = 'P0002';
  end if;

  -- Eligibility lock protocol: the staff row is the per-person authority.
  -- Publication preflight and applicant selection hold it while reading
  -- unavailability facts; taking the same lock here means a decision and a
  -- publication that depends on it can only run one after the other.
  perform public.rpc_internal_lock_staff_eligibility(
    p_workspace_id,
    array[request_staff_member_id]
  );

  if p_status in ('approved', 'declined') then
    if current_status <> 'pending' then
      raise exception 'only pending requests can be approved or declined'
        using errcode = '55000';
    end if;
    update public.staff_one_off_unavailability_requests
    set status = p_status,
        decided_at = transaction_timestamp(),
        decided_by_membership_id = caller_membership_id,
        decision_note = trimmed_note
    where workspace_id = p_workspace_id and id = p_request_id;
  else
    if current_status not in ('approved', 'declined') then
      raise exception 'only decided requests can be reopened' using errcode = '55000';
    end if;
    update public.staff_one_off_unavailability_requests
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
    'unavailability_update',
    case p_status
      when 'approved' then 'Unavailability approved'
      when 'declined' then 'Unavailability declined'
      else 'Unavailability request reopened'
    end,
    format(
      'Your request to be unavailable on %s is %s.',
      to_char(request_date, 'DD Mon YYYY'),
      case p_status
        when 'pending' then 'back under review'
        else p_status
      end
    ),
    'one_off_unavailability',
    p_request_id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'one_off_unavailability.' || p_status,
    'one_off_unavailability',
    p_request_id,
    jsonb_build_object('staff_member_id', request_staff_member_id, 'date', request_date)
  );

  return jsonb_build_object('request_id', p_request_id, 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. rpc_select_open_shift_applicant — recreated from phase 27 with one added
--    eligibility fact: an approved one-off unavailability on the shift's local
--    date(s) blocks selection, exactly like approved leave and approved
--    recurring days off. Everything else is unchanged.
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

  -- Week first, then request: publish and every manager decision use the same
  -- lock order, avoiding request-to-week deadlocks.
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

  -- Lock the applicant after the common week/request/shift lock sequence.
  -- This serialises schedule checks across different location rota weeks, so
  -- two managers cannot concurrently assign overlapping shifts to one person.
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

  if lower(btrim(staff_row.role_name)) <> lower(btrim(draft_shift.role_name)) then
    raise exception 'the applicant''s role does not match this % shift', draft_shift.role_name
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
    raise exception 'the applicant has approved leave on that day' using errcode = '55000';
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

  -- One selection per shift: any earlier selection on the same draft shift
  -- returns to pending (its draft assignment was already undone by the manager
  -- reopening the shift, or is being replaced right now).
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

  -- The draft now differs from the published snapshot; make that visible.
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

-- ---------------------------------------------------------------------------
-- 8. rpc_internal_validate_open_shift_publish — recreated from phase 29 with
--    the same added fact: a selected applicant with approved one-off
--    unavailability on the shift date blocks publication. Everything else is
--    unchanged.
-- ---------------------------------------------------------------------------

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
      and shift.id = request_row.source_shift_id;

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
      and staff.id = request_row.staff_member_id;

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
      from public.staff_one_off_unavailability_requests as unavailability
      where unavailability.workspace_id = p_workspace_id
        and unavailability.staff_member_id = request_row.staff_member_id
        and unavailability.status = 'approved'
        and unavailability.date in (draft_shift.shift_date, shift_end_date)
    ) then
      raise exception 'a selected applicant is now unavailable on the shift date'
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

-- The snapshot preflight trigger is the trusted-service defence-in-depth path
-- as well as the RPC path. Acquire the complete input graph before validation
-- so the validator itself performs no shift/staff lock inversion.
create or replace function public.guard_open_shift_publish_preflight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rpc_internal_lock_rota_publication_inputs(
    new.workspace_id,
    new.rota_week_id
  );
  perform public.rpc_internal_validate_open_shift_publish(
    new.workspace_id,
    new.rota_week_id
  );
  return new;
end;
$$;

revoke all on function public.guard_open_shift_publish_preflight()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Grants
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_request_one_off_unavailability(uuid, date, text) from public, anon;
revoke all on function public.rpc_withdraw_one_off_unavailability(uuid, date) from public, anon;
revoke all on function public.rpc_decide_one_off_unavailability(uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_internal_validate_open_shift_publish(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.rpc_request_one_off_unavailability(uuid, date, text) to authenticated;
grant execute on function public.rpc_withdraw_one_off_unavailability(uuid, date) to authenticated;
grant execute on function public.rpc_decide_one_off_unavailability(uuid, uuid, text, text) to authenticated;

comment on function public.rpc_request_one_off_unavailability(uuid, date, text) is
  'Staff-only: request one local-calendar date, or re-request after decline/withdrawal. Pending notes may be edited; approved rows remain manager-mediated. Locks request then staff.';
comment on function public.rpc_withdraw_one_off_unavailability(uuid, date) is
  'Staff-only: retain and mark the caller''s own PENDING unavailability request withdrawn. Decided requests are manager-mediated; locks request then staff.';
comment on function public.rpc_decide_one_off_unavailability(uuid, uuid, text, text) is
  'Manager-only: approve, decline, or reopen a one-off unavailability request, notify the staff member, and audit. Locks request row then staff row (phase-31 protocol).';
comment on function public.rpc_internal_validate_open_shift_publish(uuid, uuid) is
  'Internal publication preflight: selected open-shift assignments must remain materially identical and eligible (employment, role, leave, recurring days off, one-off unavailability, overlaps, weekly hours); pending requests cannot be manually assigned to bypass selection.';

notify pgrst, 'reload schema';
