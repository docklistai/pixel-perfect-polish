-- Phase 27: controlled open-shift requests.
--
-- Staff can already SEE published open shifts (the phase 13 team view — the
-- rota on the wall). This adds the smallest controlled way to act on them:
-- staff request a published open shift or withdraw a pending request; managers
-- review applicants inside the rota workflow, select exactly one (which
-- assigns the DRAFT shift, never the published snapshot), or decline with a
-- reason. Republishing finalises every request for the week (phase 28).
-- There is no self-assignment: nothing a staff member does changes any rota.
--
-- State machine (all transitions server-side, explicit, and audited):
--   (none) ──request──▶ pending ──withdraw (staff)──▶ withdrawn ──re-request──▶ pending
--   pending ──manager select──▶ selected      (draft shift assigned; awaits republish)
--   pending ──manager decline──▶ declined     (notified)
--   selected ──manager decline──▶ declined    (draft shift reopened; notified)
--   at republish (phase 28), per request for the published week:
--     selected → confirmed   when the new snapshot assigns that staff
--     selected → pending     when the shift is published open again (selection undone in draft)
--     pending  → filled      when the new snapshot assigns someone else
--     pending/selected → stale  when the shift left the snapshot or materially changed
--   pending is the only state with decided_by/decided_at null (CHECK below).
--
-- Concurrency: every deciding RPC locks the request row and the rota_weeks row
-- (the same row rpc_publish_rota_week locks first), so selection, decline,
-- competing requests, and publish serialise on the week. The draft shift row
-- is locked before assignment so two selections cannot double-book it.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table public.open_shift_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- The exact published shift (and therefore snapshot version) the staff
  -- member saw when requesting. Immutable rows; restrict keeps history intact.
  published_shift_id uuid not null,
  -- Denormalised from the published row at request time: the draft shift this
  -- request resolves against, and the week whose publish finalises it.
  source_shift_id uuid not null,
  rota_week_id uuid not null,
  staff_member_id uuid not null,
  status text not null default 'pending' check (
    status in ('pending', 'withdrawn', 'selected', 'confirmed', 'declined', 'filled', 'stale')
  ),
  decided_by_membership_id uuid,
  decided_at timestamptz,
  decision_reason text check (decision_reason is null or length(btrim(decision_reason)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, published_shift_id, staff_member_id),
  foreign key (workspace_id, published_shift_id)
    references public.published_rota_shifts (workspace_id, id) on delete restrict,
  foreign key (workspace_id, rota_week_id)
    references public.rota_weeks (workspace_id, id) on delete cascade,
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, decided_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (decided_by_membership_id),
  -- pending carries no decision; every other state records who moved it and when.
  check (
    (status = 'pending' and decided_by_membership_id is null and decided_at is null)
    or (status <> 'pending' and decided_at is not null)
  )
);

create index open_shift_requests_workspace_staff_idx
  on public.open_shift_requests (workspace_id, staff_member_id, created_at desc);

create index open_shift_requests_workspace_week_status_idx
  on public.open_shift_requests (workspace_id, rota_week_id, status);

create index open_shift_requests_workspace_source_shift_idx
  on public.open_shift_requests (workspace_id, source_shift_id);

create index open_shift_requests_workspace_decided_by_idx
  on public.open_shift_requests (workspace_id, decided_by_membership_id);

create trigger open_shift_requests_set_updated_at
before update on public.open_shift_requests
for each row execute function public.set_updated_at();

create trigger open_shift_requests_protect_immutable
before update on public.open_shift_requests
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'published_shift_id', 'source_shift_id', 'rota_week_id', 'staff_member_id', 'created_at'
);

alter table public.open_shift_requests enable row level security;

revoke all on table public.open_shift_requests from public, anon;
-- Managers read the workspace's requests; staff read only their own rows via
-- the view below. Every write flows through the SECURITY DEFINER RPCs, so no
-- insert/update/delete policy or grant is exposed to authenticated callers.
grant select on table public.open_shift_requests to authenticated;

create policy open_shift_requests_manager_select
on public.open_shift_requests for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.open_shift_requests is
  'Staff requests for published open shifts. Manager selection assigns the DRAFT shift only; republishing finalises the request (phase 28). All writes go through the phase 27 RPCs.';

-- ---------------------------------------------------------------------------
-- 2. staff_portal_open_shift_requests — the caller's own requests only, with
--    the shift facts needed to render a status list. Owner-rights barrier view
--    (same model as staff_portal_recurring_days_off): staff need no base grant.
-- ---------------------------------------------------------------------------

create view public.staff_portal_open_shift_requests
with (security_barrier = true)
as
select
  request.workspace_id,
  request.id as request_id,
  request.staff_member_id,
  request.published_shift_id,
  request.status,
  request.decision_reason,
  request.decided_at,
  request.created_at,
  request.updated_at,
  shift.shift_date,
  shift.starts_at,
  shift.ends_at,
  shift.role_name,
  location.name as location_name,
  coalesce(location.timezone, workspace.timezone, 'UTC') as location_timezone
from public.open_shift_requests as request
join public.published_rota_shifts as shift
  on shift.workspace_id = request.workspace_id
 and shift.id = request.published_shift_id
join public.locations as location
  on location.workspace_id = shift.workspace_id
 and location.id = shift.location_id
join public.workspaces as workspace on workspace.id = shift.workspace_id
where request.staff_member_id = public.current_staff_member_id(request.workspace_id);

grant select on public.staff_portal_open_shift_requests to authenticated;

comment on view public.staff_portal_open_shift_requests is
  'A staff member''s own open-shift requests with the requested shift''s public facts. Never exposes colleague requests or manager-only fields.';

-- ---------------------------------------------------------------------------
-- 3. Notification kinds — one new staff-facing kind for request outcomes.
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
    'open_shift_update'
  )
);

-- ---------------------------------------------------------------------------
-- 4. rpc_request_open_shift — staff request (or re-request after withdrawing)
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

  -- Serialise against rpc_publish_rota_week (which locks this row for update),
  -- so a request can never slip in between snapshot creation and finalisation.
  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = shift_row.rota_week_id
  for share;

  -- Same-shift request attempts serialise after the week lock. This makes the
  -- unique request transition idempotent even when two tabs submit together.
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
    result_id := existing_id;  -- idempotent
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

-- ---------------------------------------------------------------------------
-- 5. rpc_withdraw_open_shift_request — staff withdraw a pending request
-- ---------------------------------------------------------------------------

create or replace function public.rpc_withdraw_open_shift_request(
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
  own_staff_member_id uuid;
  current_status text;
begin
  select required.o_membership_id, required.o_staff_member_id
  into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id) as required;

  select request.status
  into current_status
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
    and request.staff_member_id = own_staff_member_id
  for update;

  if current_status is null then
    raise exception 'open-shift request not found for this staff member' using errcode = 'P0002';
  end if;

  if current_status <> 'pending' then
    raise exception 'only pending requests can be withdrawn' using errcode = '55000';
  end if;

  update public.open_shift_requests
  set status = 'withdrawn',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp()
  where workspace_id = p_workspace_id
    and id = p_request_id;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'open_shift.withdrawn',
    'open_shift_request',
    p_request_id,
    jsonb_build_object('staff_member_id', own_staff_member_id)
  );

  return jsonb_build_object('request_id', p_request_id, 'status', 'withdrawn');
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. rpc_select_open_shift_applicant — manager picks exactly one applicant.
--    Assigns the DRAFT shift; the published snapshot is untouched until the
--    manager republishes (phase 28 finalises and notifies).
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
  select staff.id, staff.employment_status, staff.role_name, staff.department_id,
         membership.status as membership_status
  into staff_row
  from public.staff_members as staff
  left join public.workspace_memberships as membership
    on membership.workspace_id = staff.workspace_id
   and membership.id = staff.membership_id
  where staff.workspace_id = p_workspace_id
    and staff.id = request_row.staff_member_id
  for update of staff;

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
-- 7. rpc_decline_open_shift_request — manager declines (also undoes a
--    not-yet-republished selection) and the staff member is told.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_decline_open_shift_request(
  p_workspace_id uuid,
  p_request_id uuid,
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
  request_row record;
  trimmed_reason text;
  shift_facts record;
  staff_membership_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if trimmed_reason is not null and length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  select request.id, request.status, request.staff_member_id,
         request.source_shift_id, request.rota_week_id
  into request_row
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id;

  if request_row.id is null then
    raise exception 'open-shift request not found in workspace' using errcode = 'P0002';
  end if;

  -- Week first, then request, matching publish and selection lock order.
  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = request_row.rota_week_id
  for update;

  select request.id, request.status, request.staff_member_id,
         request.source_shift_id, request.rota_week_id
  into request_row
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if request_row.status not in ('pending', 'selected') then
    raise exception 'only pending or selected requests can be declined' using errcode = '55000';
  end if;

  -- Undoing a selection reopens the draft shift if it is still theirs.
  if request_row.status = 'selected' then
    update public.shifts
    set staff_member_id = null,
        assignment_status = 'open'
    where workspace_id = p_workspace_id
      and id = request_row.source_shift_id
      and staff_member_id = request_row.staff_member_id;
  end if;

  update public.open_shift_requests
  set status = 'declined',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp(),
      decision_reason = trimmed_reason
  where workspace_id = p_workspace_id
    and id = request_row.id;

  select shift.shift_date, shift.role_name
  into shift_facts
  from public.published_rota_shifts as shift
  join public.open_shift_requests as request
    on request.workspace_id = shift.workspace_id
   and request.published_shift_id = shift.id
  where request.workspace_id = p_workspace_id
    and request.id = request_row.id;

  select staff.membership_id into staff_membership_id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_row.staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'open_shift_update',
    'Open shift request declined',
    format(
      'Your request for the %s shift on %s was declined.%s',
      shift_facts.role_name,
      to_char(shift_facts.shift_date, 'DD Mon YYYY'),
      case when trimmed_reason is null then '' else ' ' || trimmed_reason end
    ),
    'open_shift_request',
    request_row.id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'open_shift.declined',
    'open_shift_request',
    request_row.id,
    jsonb_build_object(
      'staff_member_id', request_row.staff_member_id,
      'reason', trimmed_reason
    )
  );

  return jsonb_build_object('request_id', request_row.id, 'status', 'declined');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Grants — public RPCs to authenticated only.
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_request_open_shift(uuid, uuid) from public, anon;
revoke all on function public.rpc_withdraw_open_shift_request(uuid, uuid) from public, anon;
revoke all on function public.rpc_select_open_shift_applicant(uuid, uuid) from public, anon;
revoke all on function public.rpc_decline_open_shift_request(uuid, uuid, text) from public, anon;

grant execute on function public.rpc_request_open_shift(uuid, uuid) to authenticated;
grant execute on function public.rpc_withdraw_open_shift_request(uuid, uuid) to authenticated;
grant execute on function public.rpc_select_open_shift_applicant(uuid, uuid) to authenticated;
grant execute on function public.rpc_decline_open_shift_request(uuid, uuid, text) to authenticated;

comment on function public.rpc_request_open_shift(uuid, uuid) is
  'Staff-only: request a published open shift (or re-request after withdrawing). Never changes any rota.';
comment on function public.rpc_withdraw_open_shift_request(uuid, uuid) is
  'Staff-only: withdraw the caller''s own pending open-shift request.';
comment on function public.rpc_select_open_shift_applicant(uuid, uuid) is
  'Manager-only: select one applicant — revalidates employment, role, leave, days off, overlaps and weekly hours, then assigns the DRAFT shift. The published snapshot is untouched until republish.';
comment on function public.rpc_decline_open_shift_request(uuid, uuid, text) is
  'Manager-only: decline a pending (or undo a selected) request with an optional reason; the staff member is notified in-app.';

notify pgrst, 'reload schema';
