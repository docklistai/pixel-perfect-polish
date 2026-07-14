-- Phase 32: controlled shift-release requests.
--
-- Staff assigned on the published rota sometimes cannot work a shift. Today
-- that conversation happens off-platform. This adds the smallest controlled
-- way to ask on-platform: staff request release from their OWN assigned
-- published shift with a required reason, or withdraw a pending request;
-- managers review inside the rota workflow and approve (which reopens the
-- DRAFT shift only — the published snapshot is untouched until republish) or
-- decline with an optional note. Republishing finalises the week's requests.
-- Nothing a staff member does changes any rota, and the requester remains
-- responsible for the published shift until a republish removes them.
--
-- State machine (all transitions server-side, explicit, and audited):
--   (none) ──request──▶ pending ──withdraw (staff)──▶ withdrawn ──re-request──▶ pending
--   pending ──manager approve──▶ approved   (draft shift reopened; awaits republish)
--   pending ──manager decline──▶ declined   (notified)
--   at republish, per request for the published week:
--     approved → completed  only when an unchanged source shift no longer assigns
--                           the requester
--     approved → approved   when unchanged and still assigned (carried forward)
--     approved → stale      when the source shift changed materially or disappeared
--     pending  → pending    when the shift is republished materially unchanged and
--                           still theirs — re-pointed at the new published row
--     pending  → stale      when the shift left the snapshot, materially changed,
--                           or no longer assigns them (notified)
--   pending is the only state with decided_by/decided_at null (CHECK below).
--
-- Concurrency (phase 31 protocol, identical ordering to phase 27/28/29):
--   1. rota_weeks row  2. request row  3. draft shifts row  4. staff_members row.
-- Approval reopens the draft shift while holding the requester's staff row, so
-- publication preflight cannot read assignment facts that are changing.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

-- A release identifies both the immutable published row and the draft source
-- row copied into it.  The three-column key lets the request enforce that the
-- supplied source really belongs to that published row, rather than relying
-- on SECURITY DEFINER callers to keep two independent foreign keys aligned.
alter table public.published_rota_shifts
  add constraint published_rota_shifts_workspace_id_source_key
  unique (workspace_id, id, source_shift_id);

create table public.shift_release_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- The exact published shift (and therefore snapshot version) the staff
  -- member saw when asking to be released. Immutable rows; restrict keeps
  -- history intact. Re-pointed only by publish finalisation (carry-forward).
  published_shift_id uuid not null,
  -- Denormalised from the published row at request time: the draft shift the
  -- approval reopens, and the week whose publish finalises this request.
  source_shift_id uuid not null,
  rota_week_id uuid not null,
  staff_member_id uuid not null,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  status text not null default 'pending' check (
    status in ('pending', 'withdrawn', 'approved', 'declined', 'completed', 'stale')
  ),
  decided_by_membership_id uuid,
  decided_at timestamptz,
  decision_reason text check (decision_reason is null or length(btrim(decision_reason)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, published_shift_id, staff_member_id),
  foreign key (workspace_id, published_shift_id, source_shift_id)
    references public.published_rota_shifts (workspace_id, id, source_shift_id)
    on delete restrict,
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

create index shift_release_requests_workspace_staff_idx
  on public.shift_release_requests (workspace_id, staff_member_id, created_at desc);

create index shift_release_requests_workspace_week_status_idx
  on public.shift_release_requests (workspace_id, rota_week_id, status);

create index shift_release_requests_workspace_source_shift_idx
  on public.shift_release_requests (workspace_id, source_shift_id);

create index shift_release_requests_workspace_published_source_idx
  on public.shift_release_requests (workspace_id, published_shift_id, source_shift_id);

create index shift_release_requests_workspace_decided_by_idx
  on public.shift_release_requests (workspace_id, decided_by_membership_id);

create trigger shift_release_requests_set_updated_at
before update on public.shift_release_requests
for each row execute function public.set_updated_at();

-- published_shift_id is intentionally NOT in this list: publish finalisation
-- re-points carried-forward pending requests at the new published row, exactly
-- as phase 28 does for open-shift requests. reason stays mutable so a
-- re-request after withdrawing can state the current ask.
create trigger shift_release_requests_protect_immutable
before update on public.shift_release_requests
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'source_shift_id', 'rota_week_id', 'staff_member_id', 'created_at'
);

alter table public.shift_release_requests enable row level security;

revoke all on table public.shift_release_requests from public, anon;
-- Managers read the workspace's requests; staff read only their own rows via
-- the view below. Every write flows through the SECURITY DEFINER RPCs, so no
-- insert/update/delete policy or grant is exposed to authenticated callers.
grant select on table public.shift_release_requests to authenticated;

create policy shift_release_requests_manager_select
on public.shift_release_requests for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.shift_release_requests is
  'Staff requests to be released from their own assigned published shift. Manager approval reopens the DRAFT shift only; republishing finalises the request. All writes go through the phase 32 RPCs.';

-- ---------------------------------------------------------------------------
-- 1a. Complete eligibility/publication lock protocol.
--
-- Stable order for every phase-32+ participant:
--   rota week -> request rows -> draft shifts -> memberships -> staff rows.
--
-- UPDATE/DELETE already own their draft-shift row before a row trigger runs,
-- so they never acquire the week afterwards.  Publication owns every current
-- draft row before it moves on to memberships/staff.  INSERT has no row to
-- serialise on, therefore it takes a week KEY SHARE lock first; publication's
-- week UPDATE lock prevents a phantom shift appearing after the draft scan.
-- rota_week_id is immutable, so an UPDATE cannot move an unscanned row into a
-- week while publication is in progress.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_lock_staff_eligibility(
  p_workspace_id uuid,
  p_staff_member_ids uuid[]
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  staff_ids uuid[];
  expected_membership_ids uuid[];
  current_membership_ids uuid[];
begin
  select coalesce(
    array_agg(distinct candidate.staff_member_id order by candidate.staff_member_id),
    array[]::uuid[]
  )
  into staff_ids
  from unnest(coalesce(p_staff_member_ids, array[]::uuid[]))
    as candidate(staff_member_id)
  where candidate.staff_member_id is not null;

  if cardinality(staff_ids) = 0 then
    return;
  end if;

  -- Read the identity links first, lock every membership in UUID order, then
  -- lock every staff row in UUID order. Membership deletion/status changes
  -- therefore cannot race an eligibility read, and multi-person operations
  -- cannot acquire the same two sets in opposing orders.
  select coalesce(
    array_agg(distinct staff.membership_id order by staff.membership_id),
    array[]::uuid[]
  )
  into expected_membership_ids
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = any(staff_ids)
    and staff.membership_id is not null;

  perform membership.id
  from public.workspace_memberships as membership
  where membership.workspace_id = p_workspace_id
    and membership.id = any(expected_membership_ids)
  order by membership.id
  for update;

  perform staff.id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = any(staff_ids)
  order by staff.id
  for update;

  -- A direct identity-link write can begin before the membership locks and
  -- finish before the staff locks. Never continue with a different, unlocked
  -- membership; make the caller retry the whole transaction instead.
  select coalesce(
    array_agg(distinct staff.membership_id order by staff.membership_id),
    array[]::uuid[]
  )
  into current_membership_ids
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = any(staff_ids)
    and staff.membership_id is not null;

  if current_membership_ids is distinct from expected_membership_ids then
    raise exception 'staff identity changed concurrently; retry the operation'
      using errcode = '40001';
  end if;
end;
$$;

revoke all on function public.rpc_internal_lock_staff_eligibility(uuid, uuid[])
  from public, anon, authenticated;

create or replace function public.lock_staff_for_shift_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_staff_ids uuid[] := array[]::uuid[];
begin
  if tg_op = 'INSERT' then
    -- Blocks a new shift from appearing after publication has locked/scanned
    -- this week. The week is always acquired before membership/staff locks.
    perform 1
    from public.rota_weeks as week
    where week.workspace_id = new.workspace_id
      and week.id = new.rota_week_id
    for key share;

    if new.staff_member_id is not null then
      affected_staff_ids := array[new.staff_member_id];
    end if;
  elsif tg_op = 'UPDATE' then
    if new.rota_week_id is distinct from old.rota_week_id then
      raise exception 'shift rota_week_id is immutable' using errcode = '55000';
    end if;

    if new.staff_member_id is distinct from old.staff_member_id
       or new.shift_date is distinct from old.shift_date
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.break_minutes is distinct from old.break_minutes
       or new.role_name is distinct from old.role_name
       or new.location_id is distinct from old.location_id
       or new.department_id is distinct from old.department_id
       or new.assignment_status is distinct from old.assignment_status then
      affected_staff_ids := array[old.staff_member_id, new.staff_member_id];
    end if;
  else
    affected_staff_ids := array[old.staff_member_id];
  end if;

  perform public.rpc_internal_lock_staff_eligibility(
    case when tg_op = 'DELETE' then old.workspace_id else new.workspace_id end,
    affected_staff_ids
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.lock_staff_for_shift_assignment()
  from public, anon, authenticated;

drop trigger if exists shifts_lock_staff_for_assignment on public.shifts;
create trigger shifts_lock_staff_for_assignment
before insert or update or delete on public.shifts
for each row execute function public.lock_staff_for_shift_assignment();

drop trigger if exists shifts_protect_immutable on public.shifts;
create trigger shifts_protect_immutable
before update on public.shifts
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'rota_week_id', 'created_at'
);

create or replace function public.rpc_internal_lock_rota_publication_inputs(
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
  affected_staff_ids uuid[];
begin
  -- The caller normally owns this row already. Taking it here also keeps the
  -- trusted seed/service snapshot path on the same ordering discipline.
  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = p_rota_week_id
  for update;

  perform request.id
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.rota_week_id = p_rota_week_id
    and request.status in ('pending', 'selected')
  order by request.id
  for update;

  perform request.id
  from public.shift_release_requests as request
  where request.workspace_id = p_workspace_id
    and request.rota_week_id = p_rota_week_id
    and request.status in ('pending', 'approved')
  order by request.id
  for update;

  -- Locks every row before any eligibility authority. UPDATE/DELETE writers
  -- already own a row and finish without taking the week; INSERT writers are
  -- stopped at the week KEY SHARE lock above, eliminating draft phantoms.
  perform shift.id
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id
  order by shift.id
  for update;

  select coalesce(
    array_agg(distinct affected.staff_member_id order by affected.staff_member_id),
    array[]::uuid[]
  )
  into affected_staff_ids
  from (
    select shift.staff_member_id
    from public.shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = p_rota_week_id
      and shift.staff_member_id is not null
    union
    select request.staff_member_id
    from public.open_shift_requests as request
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status in ('pending', 'selected')
    union
    select request.staff_member_id
    from public.shift_release_requests as request
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status in ('pending', 'approved')
  ) as affected;

  perform public.rpc_internal_lock_staff_eligibility(
    p_workspace_id,
    affected_staff_ids
  );
end;
$$;

revoke all on function public.rpc_internal_lock_rota_publication_inputs(uuid, uuid)
  from public, anon, authenticated;

comment on function public.rpc_internal_lock_rota_publication_inputs(uuid, uuid) is
  'Internal phase-31-compatible publication lock: week, actionable request rows, every draft shift, memberships, then staff rows. Shift inserts take a conflicting week lock; rota_week_id cannot change.';

-- ---------------------------------------------------------------------------
-- 2. staff_portal_shift_release_requests — the caller's own requests only,
--    with the shift facts needed to render a status list. Owner-rights
--    barrier view (same model as staff_portal_open_shift_requests).
-- ---------------------------------------------------------------------------

create view public.staff_portal_shift_release_requests
with (security_barrier = true)
as
select
  request.workspace_id,
  request.id as request_id,
  request.staff_member_id,
  request.published_shift_id,
  request.status,
  request.reason,
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
from public.shift_release_requests as request
join public.published_rota_shifts as shift
  on shift.workspace_id = request.workspace_id
 and shift.id = request.published_shift_id
join public.locations as location
  on location.workspace_id = shift.workspace_id
 and location.id = shift.location_id
join public.workspaces as workspace on workspace.id = shift.workspace_id
where request.staff_member_id = public.current_staff_member_id(request.workspace_id);

grant select on public.staff_portal_shift_release_requests to authenticated;

comment on view public.staff_portal_shift_release_requests is
  'A staff member''s own shift-release requests with the shift''s public facts. Never exposes colleague requests or manager-only fields.';

-- ---------------------------------------------------------------------------
-- 3. Notification kinds — one new kind for release request traffic.
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
    'shift_release_update'
  )
);

-- ---------------------------------------------------------------------------
-- 4. rpc_request_shift_release — staff ask to be released from their own
--    assigned published shift (or re-ask after withdrawing).
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

  -- Serialise against rpc_publish_rota_week (which locks this row for update),
  -- so a request can never slip in between snapshot creation and finalisation.
  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = shift_row.rota_week_id
  for share;

  -- Same-shift request attempts serialise after the week lock, making the
  -- unique request transition idempotent even when two tabs submit together.
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
    -- A retry (double-click, reconnect, or two tabs) must not manufacture a
    -- second manager notification/audit event for a transition that did not
    -- happen. The first committed reason remains authoritative.
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
        and membership.id <> caller_membership_id
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

-- ---------------------------------------------------------------------------
-- 5. rpc_withdraw_shift_release — staff withdraw their own pending request
-- ---------------------------------------------------------------------------

create or replace function public.rpc_withdraw_shift_release(
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
  from public.shift_release_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
    and request.staff_member_id = own_staff_member_id
  for update;

  if current_status is null then
    raise exception 'release request not found for this staff member' using errcode = 'P0002';
  end if;

  if current_status <> 'pending' then
    raise exception 'only pending release requests can be withdrawn' using errcode = '55000';
  end if;

  update public.shift_release_requests
  set status = 'withdrawn',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp()
  where workspace_id = p_workspace_id
    and id = p_request_id;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'shift_release.withdrawn',
    'shift_release_request',
    p_request_id,
    jsonb_build_object('staff_member_id', own_staff_member_id)
  );

  return jsonb_build_object('request_id', p_request_id, 'status', 'withdrawn');
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. rpc_approve_shift_release — manager approves: the DRAFT shift is
--    reopened (unassigned) so recovery candidates can be chosen through the
--    existing draft/open-shift workflow. The published snapshot is untouched
--    and the requester stays responsible until republish.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_approve_shift_release(
  p_workspace_id uuid,
  p_request_id uuid,
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
  request_row record;
  week_status text;
  latest_version integer;
  requested_shift record;
  draft_shift record;
  trimmed_note text;
  staff_membership_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is not null and length(trimmed_note) > 2000 then
    raise exception 'note must be at most 2000 characters' using errcode = '22023';
  end if;

  select request.id, request.status, request.staff_member_id,
         request.published_shift_id, request.source_shift_id, request.rota_week_id
  into request_row
  from public.shift_release_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id;

  if request_row.id is null then
    raise exception 'release request not found in workspace' using errcode = 'P0002';
  end if;

  -- Week first, then request: publish and every manager decision use the same
  -- lock order, avoiding request-to-week deadlocks.
  select week.status into week_status
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
  from public.shift_release_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if request_row.status <> 'pending' then
    raise exception 'only pending release requests can be approved' using errcode = '55000';
  end if;

  -- Stale guard: the request must point at the latest published version.
  select max(snapshot.version) into latest_version
  from public.published_rota_snapshots as snapshot
  where snapshot.workspace_id = p_workspace_id
    and snapshot.rota_week_id = request_row.rota_week_id;

  select snapshot.version, shift.shift_date, shift.starts_at, shift.role_name
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

  -- The draft shift is what approval reopens; lock it, then verify it still
  -- assigns the requester (a manager may already have reassigned the draft).
  select shift.id, shift.staff_member_id, shift.assignment_status, shift.starts_at
  into draft_shift
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.id = request_row.source_shift_id
  for update;

  if draft_shift.id is null then
    raise exception 'the draft shift behind this request no longer exists' using errcode = 'P0002';
  end if;
  if draft_shift.staff_member_id is distinct from request_row.staff_member_id
     or draft_shift.assignment_status <> 'scheduled' then
    raise exception 'the draft no longer assigns this staff member — refresh and review the current draft'
      using errcode = '55000';
  end if;
  if draft_shift.starts_at <= clock_timestamp() then
    raise exception 'this shift has already started' using errcode = '55000';
  end if;

  -- Eligibility lock protocol: week -> request -> shift -> membership ->
  -- staff. The helper also verifies that the identity link did not change
  -- while the two authority rows were being acquired.
  perform public.rpc_internal_lock_staff_eligibility(
    p_workspace_id,
    array[request_row.staff_member_id]
  );

  update public.shifts
  set staff_member_id = null,
      assignment_status = 'open'
  where workspace_id = p_workspace_id
    and id = draft_shift.id;

  -- The draft now differs from the published snapshot; make that visible.
  update public.rota_weeks
  set status = 'draft'
  where workspace_id = p_workspace_id
    and id = request_row.rota_week_id
    and status <> 'draft';

  update public.shift_release_requests
  set status = 'approved',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp(),
      decision_reason = trimmed_note
  where workspace_id = p_workspace_id
    and id = request_row.id;

  select staff.membership_id into staff_membership_id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_row.staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'shift_release_update',
    'Release approved',
    format(
      'Your release from the %s shift on %s is approved. You stay scheduled and responsible for it until the rota is updated.%s',
      requested_shift.role_name,
      to_char(requested_shift.shift_date, 'DD Mon YYYY'),
      case
        when trimmed_note is null then ''
        else ' Manager note: ' || left(trimmed_note, 1200)
      end
    ),
    'shift_release_request',
    request_row.id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'shift_release.approved',
    'shift_release_request',
    request_row.id,
    jsonb_build_object(
      'staff_member_id', request_row.staff_member_id,
      'source_shift_id', request_row.source_shift_id,
      'rota_week_id', request_row.rota_week_id,
      'note', trimmed_note
    )
  );

  return jsonb_build_object(
    'request_id', request_row.id,
    'status', 'approved',
    'shift_id', draft_shift.id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. rpc_decline_shift_release — manager declines a pending request.
--    (Approved requests are not declined here: the manager simply reassigns
--    the draft, and republish finalises the request as stale.)
-- ---------------------------------------------------------------------------

create or replace function public.rpc_decline_shift_release(
  p_workspace_id uuid,
  p_request_id uuid,
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
  request_row record;
  trimmed_note text;
  shift_facts record;
  staff_membership_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is not null and length(trimmed_note) > 2000 then
    raise exception 'note must be at most 2000 characters' using errcode = '22023';
  end if;

  select request.id, request.status, request.staff_member_id, request.rota_week_id
  into request_row
  from public.shift_release_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id;

  if request_row.id is null then
    raise exception 'release request not found in workspace' using errcode = 'P0002';
  end if;

  -- Week first, then request, matching publish and approval lock order.
  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = request_row.rota_week_id
  for update;

  select request.id, request.status, request.staff_member_id, request.rota_week_id
  into request_row
  from public.shift_release_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if request_row.status <> 'pending' then
    raise exception 'only pending release requests can be declined' using errcode = '55000';
  end if;

  update public.shift_release_requests
  set status = 'declined',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp(),
      decision_reason = trimmed_note
  where workspace_id = p_workspace_id
    and id = request_row.id;

  select shift.shift_date, shift.role_name
  into shift_facts
  from public.published_rota_shifts as shift
  join public.shift_release_requests as request
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
    'shift_release_update',
    'Release declined',
    format(
      'Your release request for the %s shift on %s was declined — you remain scheduled.%s',
      shift_facts.role_name,
      to_char(shift_facts.shift_date, 'DD Mon YYYY'),
      case
        when trimmed_note is null then ''
        else ' Manager note: ' || left(trimmed_note, 1200)
      end
    ),
    'shift_release_request',
    request_row.id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'shift_release.declined',
    'shift_release_request',
    request_row.id,
    jsonb_build_object(
      'staff_member_id', request_row.staff_member_id,
      'reason', trimmed_note
    )
  );

  return jsonb_build_object('request_id', request_row.id, 'status', 'declined');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. rpc_publish_rota_week — recreated from phase 28 with release-request
--    finalisation in the same atomic transaction. The open-shift finalisation,
--    targeted diff notifications, and publish authority (phase 30) semantics
--    are unchanged; a release block finalises the week's release requests and
--    a completed release suppresses the redundant generic "removed" diff for
--    that shift (the requester gets the specific release message instead).
-- The third parameter is deliberately defaulted so existing two-argument
-- callers remain source-compatible while the database, not the client,
-- derives the exact approved-constraint clashes that require acknowledgement.
-- Drop the phase-28 two-argument authority first so it cannot win overload
-- resolution over this defaulted signature.
-- ---------------------------------------------------------------------------

drop function public.rpc_publish_rota_week(uuid, uuid);

create or replace function public.rpc_publish_rota_week(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_acknowledge_constraints boolean default false
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
  previous_snapshot_id uuid;
  new_snapshot_id uuid;
  notified_membership_count integer := 0;
  finalised_request_count integer := 0;
  finalised_release_count integer := 0;
  week_label text;
  request_row record;
  new_shift_row record;
  requested_shift_row record;
  request_staff_membership_id uuid;
  confirmed_pairs uuid[] := array[]::uuid[];  -- source_shift_ids confirmed to their applicant
  released_pairs uuid[] := array[]::uuid[];   -- source_shift_ids of completed releases
  affected_row record;
  change_parts text;
  final_request_status text;
  release_material_same boolean;
  scheduling_constraint_clashes jsonb := '[]'::jsonb;
  one_off_clash_count integer := 0;
  recurring_day_off_clash_count integer := 0;
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

  -- Freeze the complete publication input set before reading counts,
  -- eligibility constraints, or material shift facts. This is the sole lock
  -- acquisition point for publication; the snapshot trigger reuses the same
  -- helper defensively and therefore never discovers an unlocked draft row.
  perform public.rpc_internal_lock_rota_publication_inputs(
    p_workspace_id,
    p_rota_week_id
  );

  select count(*)
  into draft_shift_count
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id;

  if draft_shift_count = 0 then
    raise exception 'cannot publish a rota week with no shifts' using errcode = '55000';
  end if;

  -- Derive warnings from authoritative approved constraints. Overnight shifts
  -- test both local calendar dates at the shift location. The exact stable
  -- evidence is written into the publish audit below when acknowledged.
  with assigned_shift_dates as (
    select distinct
      shift.id as shift_id,
      shift.staff_member_id,
      local_date.constraint_date
    from public.shifts as shift
    join public.locations as location
      on location.workspace_id = shift.workspace_id
     and location.id = shift.location_id
    join public.workspaces as workspace on workspace.id = shift.workspace_id
    cross join lateral (
      select distinct candidate.constraint_date
      from (values
        (shift.shift_date),
        (((shift.ends_at - interval '1 second') at time zone
          coalesce(location.timezone, workspace.timezone, 'UTC'))::date)
      ) as candidate(constraint_date)
    ) as local_date
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = p_rota_week_id
      and shift.staff_member_id is not null
      and shift.assignment_status = 'scheduled'
  ), clashes as (
    select assigned.shift_id, assigned.staff_member_id,
           assigned.constraint_date, 'one_off_unavailability'::text as kind
    from assigned_shift_dates as assigned
    join public.staff_one_off_unavailability_requests as unavailable
      on unavailable.workspace_id = p_workspace_id
     and unavailable.staff_member_id = assigned.staff_member_id
     and unavailable.date = assigned.constraint_date
     and unavailable.status = 'approved'
    union all
    select assigned.shift_id, assigned.staff_member_id,
           assigned.constraint_date, 'recurring_day_off'::text as kind
    from assigned_shift_dates as assigned
    join public.staff_recurring_day_off_requests as day_off
      on day_off.workspace_id = p_workspace_id
     and day_off.staff_member_id = assigned.staff_member_id
     and day_off.weekday = extract(isodow from assigned.constraint_date)::smallint - 1
     and day_off.status = 'approved'
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'kind', clashes.kind,
          'shift_id', clashes.shift_id,
          'staff_member_id', clashes.staff_member_id,
          'date', clashes.constraint_date
        )
        order by clashes.kind, clashes.shift_id, clashes.constraint_date
      ),
      '[]'::jsonb
    ),
    count(*) filter (where clashes.kind = 'one_off_unavailability')::integer,
    count(*) filter (where clashes.kind = 'recurring_day_off')::integer
  into scheduling_constraint_clashes, one_off_clash_count, recurring_day_off_clash_count
  from clashes;

  if jsonb_array_length(scheduling_constraint_clashes) > 0
     and not coalesce(p_acknowledge_constraints, false) then
    raise exception
      'approved scheduling constraints clash with assigned shifts; acknowledge the warning before publishing'
      using errcode = '55000',
            detail = scheduling_constraint_clashes::text;
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

  if next_version > 1 then
    select snapshot.id into previous_snapshot_id
    from public.published_rota_snapshots as snapshot
    where snapshot.workspace_id = p_workspace_id
      and snapshot.rota_week_id = p_rota_week_id
      and snapshot.version = next_version - 1;
  end if;

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

  week_label := format(
    '%s to %s',
    to_char(week_start_date, 'DD Mon'),
    to_char(week_start_date + 6, 'DD Mon YYYY')
  );

  -- -------------------------------------------------------------------------
  -- Finalise the week's open-shift requests against the new snapshot.
  -- -------------------------------------------------------------------------
  for request_row in
    select request.id, request.status, request.staff_member_id,
           request.source_shift_id, request.published_shift_id
    from public.open_shift_requests as request
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status in ('pending', 'selected')
    order by request.id
    for update
  loop
    select shift.id, shift.staff_member_id, shift.assignment_status,
           shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into new_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.snapshot_id = new_snapshot_id
      and shift.source_shift_id = request_row.source_shift_id;

    select shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into requested_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.id = request_row.published_shift_id;

    select staff.membership_id into request_staff_membership_id
    from public.staff_members as staff
    join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
     and membership.status = 'active'
    where staff.workspace_id = p_workspace_id
      and staff.id = request_row.staff_member_id
      and staff.employment_status = 'active';

    if new_shift_row.id is not null
       and new_shift_row.staff_member_id = request_row.staff_member_id
       and new_shift_row.shift_date = requested_shift_row.shift_date
       and new_shift_row.starts_at = requested_shift_row.starts_at
       and new_shift_row.ends_at = requested_shift_row.ends_at
       and new_shift_row.break_minutes = requested_shift_row.break_minutes
       and new_shift_row.role_name = requested_shift_row.role_name
       and new_shift_row.location_id = requested_shift_row.location_id
       and new_shift_row.department_id = requested_shift_row.department_id then
      -- The applicant got the shift: the republish is the confirmation.
      update public.open_shift_requests
      set status = 'confirmed',
          decided_by_membership_id = caller_membership_id,
          decided_at = transaction_timestamp(),
          published_shift_id = new_shift_row.id
      where workspace_id = p_workspace_id and id = request_row.id;

      confirmed_pairs := confirmed_pairs || request_row.source_shift_id;
      final_request_status := 'confirmed';
      finalised_request_count := finalised_request_count + 1;

      if request_staff_membership_id is not null then
        perform public.rpc_internal_notify(
          p_workspace_id, caller_membership_id, 'open_shift_update',
          'Open shift confirmed',
          format(
            'You have the %s shift on %s — it''s on your rota.',
            new_shift_row.role_name,
            to_char(new_shift_row.shift_date, 'DD Mon YYYY')
          ),
          'open_shift_request', request_row.id,
          array[request_staff_membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    elsif new_shift_row.id is not null
          and new_shift_row.assignment_status = 'open'
          and new_shift_row.shift_date = requested_shift_row.shift_date
          and new_shift_row.starts_at = requested_shift_row.starts_at
          and new_shift_row.ends_at = requested_shift_row.ends_at
          and new_shift_row.break_minutes = requested_shift_row.break_minutes
          and new_shift_row.role_name = requested_shift_row.role_name
          and new_shift_row.location_id = requested_shift_row.location_id
          and new_shift_row.department_id = requested_shift_row.department_id then
      -- Still open and unchanged: the request carries forward to the new
      -- version. A selection that never got republished returns to pending.
      update public.open_shift_requests
      set status = 'pending',
          decided_by_membership_id = null,
          decided_at = null,
          decision_reason = null,
          published_shift_id = new_shift_row.id
      where workspace_id = p_workspace_id and id = request_row.id;
      final_request_status := 'pending';
    elsif new_shift_row.id is not null
          and new_shift_row.assignment_status = 'scheduled'
          and new_shift_row.shift_date = requested_shift_row.shift_date
          and new_shift_row.starts_at = requested_shift_row.starts_at
          and new_shift_row.ends_at = requested_shift_row.ends_at
          and new_shift_row.break_minutes = requested_shift_row.break_minutes
          and new_shift_row.role_name = requested_shift_row.role_name
          and new_shift_row.location_id = requested_shift_row.location_id
          and new_shift_row.department_id = requested_shift_row.department_id then
      -- Someone else got it.
      update public.open_shift_requests
      set status = 'filled',
          decided_by_membership_id = caller_membership_id,
          decided_at = transaction_timestamp()
      where workspace_id = p_workspace_id and id = request_row.id;

      finalised_request_count := finalised_request_count + 1;
      final_request_status := 'filled';

      if request_staff_membership_id is not null then
        perform public.rpc_internal_notify(
          p_workspace_id, caller_membership_id, 'open_shift_update',
          'Open shift filled',
          format(
            'The %s shift on %s has been filled.',
            requested_shift_row.role_name,
            to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
          ),
          'open_shift_request', request_row.id,
          array[request_staff_membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    else
      -- Removed from the rota, or its date/time/role changed: the request no
      -- longer describes what was asked for.
      update public.open_shift_requests
      set status = 'stale',
          decided_by_membership_id = caller_membership_id,
          decided_at = transaction_timestamp()
      where workspace_id = p_workspace_id and id = request_row.id;

      finalised_request_count := finalised_request_count + 1;
      final_request_status := 'stale';

      if request_staff_membership_id is not null then
        perform public.rpc_internal_notify(
          p_workspace_id, caller_membership_id, 'open_shift_update',
          'Open shift no longer available',
          format(
            'The %s shift on %s you requested changed or was removed when the rota was updated.',
            requested_shift_row.role_name,
            to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
          ),
          'open_shift_request', request_row.id,
          array[request_staff_membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    end if;

    perform public.rpc_internal_write_audit(
      p_workspace_id,
      caller_membership_id,
      'open_shift.publish_finalised',
      'open_shift_request',
      request_row.id,
      jsonb_build_object(
        'previous_status', request_row.status,
        'status', final_request_status,
        'published_snapshot_id', new_snapshot_id,
        'published_shift_id', new_shift_row.id
      )
    );
  end loop;

  -- -------------------------------------------------------------------------
  -- Finalise the week's shift-release requests against the new snapshot.
  --   approved → completed  only when an unchanged source no longer assigns them;
  --   approved → approved   carried when unchanged and still assigned;
  --   approved → stale      when the source changed materially or disappeared;
  --   pending  → pending    re-pointed when the shift is unchanged and theirs;
  --   pending  → stale      when the shift changed, left, or is no longer theirs.
  -- -------------------------------------------------------------------------
  for request_row in
    select request.id, request.status, request.staff_member_id,
           request.source_shift_id, request.published_shift_id
    from public.shift_release_requests as request
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status in ('pending', 'approved')
    order by request.id
    for update
  loop
    select shift.id, shift.staff_member_id, shift.assignment_status,
           shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into new_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.snapshot_id = new_snapshot_id
      and shift.source_shift_id = request_row.source_shift_id;

    select shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into requested_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.id = request_row.published_shift_id;

    select staff.membership_id into request_staff_membership_id
    from public.staff_members as staff
    join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
     and membership.status = 'active'
    where staff.workspace_id = p_workspace_id
      and staff.id = request_row.staff_member_id
      and staff.employment_status = 'active';

    release_material_same :=
      new_shift_row.id is not null
      and new_shift_row.shift_date is not distinct from requested_shift_row.shift_date
      and new_shift_row.starts_at is not distinct from requested_shift_row.starts_at
      and new_shift_row.ends_at is not distinct from requested_shift_row.ends_at
      and new_shift_row.break_minutes is not distinct from requested_shift_row.break_minutes
      and new_shift_row.role_name is not distinct from requested_shift_row.role_name
      and new_shift_row.location_id is not distinct from requested_shift_row.location_id
      and new_shift_row.department_id is not distinct from requested_shift_row.department_id;

    if request_row.status = 'approved' then
      if not release_material_same then
        -- A changed or removed source no longer describes the approved ask.
        update public.shift_release_requests
        set status = 'stale'
        where workspace_id = p_workspace_id and id = request_row.id;

        final_request_status := 'stale';
        finalised_release_count := finalised_release_count + 1;

        if request_staff_membership_id is not null then
          perform public.rpc_internal_notify(
            p_workspace_id, caller_membership_id, 'shift_release_update',
            'Release request no longer applies',
            format(
              'The %s shift on %s changed or was removed when the rota was updated, so your release request is stale.',
              requested_shift_row.role_name,
              to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
            ),
            'shift_release_request', request_row.id,
            array[request_staff_membership_id]
          );
          notified_membership_count := notified_membership_count + 1;
        end if;
      elsif new_shift_row.staff_member_id is distinct from request_row.staff_member_id then
        -- Same source facts and no longer the requester: the release stands.
        update public.shift_release_requests
        set status = 'completed',
            published_shift_id = new_shift_row.id
        where workspace_id = p_workspace_id and id = request_row.id;

        released_pairs := released_pairs || request_row.source_shift_id;
        final_request_status := 'completed';
        finalised_release_count := finalised_release_count + 1;

        if request_staff_membership_id is not null then
          perform public.rpc_internal_notify(
            p_workspace_id, caller_membership_id, 'shift_release_update',
            'Release complete',
            format(
              'You''re no longer scheduled for the %s shift on %s.',
              requested_shift_row.role_name,
              to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
            ),
            'shift_release_request', request_row.id,
            array[request_staff_membership_id]
          );
          notified_membership_count := notified_membership_count + 1;
        end if;
      else
        -- Same source and still assigned: approval remains live and the staff
        -- member remains responsible. Carry it to the new immutable row.
        update public.shift_release_requests
        set published_shift_id = new_shift_row.id
        where workspace_id = p_workspace_id and id = request_row.id;

        final_request_status := 'approved';
      end if;
    else -- pending
      if release_material_same
         and new_shift_row.staff_member_id = request_row.staff_member_id
         and new_shift_row.assignment_status = 'scheduled'
      then
        -- Unchanged and still theirs: the request carries forward.
        update public.shift_release_requests
        set published_shift_id = new_shift_row.id
        where workspace_id = p_workspace_id and id = request_row.id;
        final_request_status := 'pending';
      else
        update public.shift_release_requests
        set status = 'stale',
            decided_by_membership_id = caller_membership_id,
            decided_at = transaction_timestamp()
        where workspace_id = p_workspace_id and id = request_row.id;

        final_request_status := 'stale';
        finalised_release_count := finalised_release_count + 1;

        if request_staff_membership_id is not null then
          perform public.rpc_internal_notify(
            p_workspace_id, caller_membership_id, 'shift_release_update',
            'Release request no longer applies',
            format(
              'The %s shift on %s changed when the rota was updated, so your release request was closed.',
              requested_shift_row.role_name,
              to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
            ),
            'shift_release_request', request_row.id,
            array[request_staff_membership_id]
          );
          notified_membership_count := notified_membership_count + 1;
        end if;
      end if;
    end if;

    if final_request_status <> 'pending' or request_row.status <> 'pending' then
      perform public.rpc_internal_write_audit(
        p_workspace_id,
        caller_membership_id,
        'shift_release.publish_finalised',
        'shift_release_request',
        request_row.id,
        jsonb_build_object(
          'previous_status', request_row.status,
          'status', final_request_status,
          'published_snapshot_id', new_snapshot_id,
          'published_shift_id', new_shift_row.id
        )
      );
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Notify. First publish: everyone. Republish: only affected staff, one
  -- aggregated message each.
  -- -------------------------------------------------------------------------
  if previous_snapshot_id is null then
    perform public.rpc_internal_notify(
      p_workspace_id,
      caller_membership_id,
      'rota_published',
      'Rota published',
      format('The rota for %s is published.', week_label),
      'published_rota_snapshot',
      new_snapshot_id,
      array(
        select membership.id
        from public.workspace_memberships as membership
        join public.staff_members as staff
          on staff.workspace_id = membership.workspace_id
         and staff.membership_id = membership.id
         and staff.employment_status = 'active'
        where membership.workspace_id = p_workspace_id
          and membership.role = 'staff'
          and membership.status = 'active'
      )
    );

    select count(*) + notified_membership_count
    into notified_membership_count
    from public.notification_deliveries as delivery
    join public.notifications as notification
      on notification.workspace_id = delivery.workspace_id
     and notification.id = delivery.notification_id
    where delivery.workspace_id = p_workspace_id
      and notification.kind = 'rota_published'
      and notification.related_entity_id = new_snapshot_id;
  else
    for affected_row in
      with old_shifts as (
        select shift.source_shift_id, shift.staff_member_id, shift.shift_date,
               shift.starts_at, shift.ends_at, shift.break_minutes,
               shift.role_name, shift.location_id, shift.department_id
        from public.published_rota_shifts as shift
        where shift.workspace_id = p_workspace_id
          and shift.snapshot_id = previous_snapshot_id
      ),
      new_shifts as (
        select shift.source_shift_id, shift.staff_member_id, shift.shift_date,
               shift.starts_at, shift.ends_at, shift.break_minutes,
               shift.role_name, shift.location_id, shift.department_id
        from public.published_rota_shifts as shift
        where shift.workspace_id = p_workspace_id
          and shift.snapshot_id = new_snapshot_id
      ),
      changes as (
        -- A shift they had is gone or now belongs to someone else. Completed
        -- releases are excluded: the requester got the specific message above.
        select old_shift.staff_member_id, 'removed'::text as change
        from old_shifts as old_shift
        left join new_shifts as new_shift
          on new_shift.source_shift_id = old_shift.source_shift_id
        where old_shift.staff_member_id is not null
          and (new_shift.source_shift_id is null
               or new_shift.staff_member_id is distinct from old_shift.staff_member_id)
          and not (old_shift.source_shift_id = any(released_pairs))
        union all
        -- A shift is newly theirs (confirmed open-shift wins are told separately).
        select new_shift.staff_member_id, 'added'::text
        from new_shifts as new_shift
        left join old_shifts as old_shift
          on old_shift.source_shift_id = new_shift.source_shift_id
        where new_shift.staff_member_id is not null
          and (old_shift.source_shift_id is null
               or old_shift.staff_member_id is distinct from new_shift.staff_member_id)
          and not (new_shift.source_shift_id = any(confirmed_pairs))
        union all
        -- Same shift, same person, materially different facts.
        select new_shift.staff_member_id, 'updated'::text
        from new_shifts as new_shift
        join old_shifts as old_shift
          on old_shift.source_shift_id = new_shift.source_shift_id
        where new_shift.staff_member_id is not null
          and new_shift.staff_member_id = old_shift.staff_member_id
          and (new_shift.shift_date <> old_shift.shift_date
               or new_shift.starts_at <> old_shift.starts_at
               or new_shift.ends_at <> old_shift.ends_at
               or new_shift.break_minutes <> old_shift.break_minutes
               or new_shift.role_name <> old_shift.role_name
               or new_shift.location_id <> old_shift.location_id
               or new_shift.department_id <> old_shift.department_id)
      )
      select
        staff.id as staff_member_id,
        staff.membership_id,
        count(*) filter (where changes.change = 'added') as added_count,
        count(*) filter (where changes.change = 'removed') as removed_count,
        count(*) filter (where changes.change = 'updated') as updated_count
      from changes
      join public.staff_members as staff
        on staff.workspace_id = p_workspace_id
       and staff.id = changes.staff_member_id
       and staff.employment_status = 'active'
      join public.workspace_memberships as membership
        on membership.workspace_id = p_workspace_id
       and membership.id = staff.membership_id
       and membership.status = 'active'
      group by staff.id, staff.membership_id
    loop
      change_parts := concat_ws(
        ', ',
        case when affected_row.added_count > 0
          then affected_row.added_count || ' added' end,
        case when affected_row.removed_count > 0
          then affected_row.removed_count || ' removed' end,
        case when affected_row.updated_count > 0
          then affected_row.updated_count || ' updated' end
      );

      if change_parts is not null and change_parts <> '' then
        perform public.rpc_internal_notify(
          p_workspace_id,
          caller_membership_id,
          'shift_changed',
          'Your shifts changed',
          format('Your shifts for %s changed: %s.', week_label, change_parts),
          'published_rota_snapshot',
          new_snapshot_id,
          array[affected_row.membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    end loop;
  end if;

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
      'notified_memberships', notified_membership_count,
      'republish', previous_snapshot_id is not null,
      'finalised_requests', finalised_request_count,
      'finalised_release_requests', finalised_release_count,
      'constraint_override_acknowledged',
        coalesce(p_acknowledge_constraints, false)
        and jsonb_array_length(scheduling_constraint_clashes) > 0,
      'one_off_unavailability_clashes', one_off_clash_count,
      'recurring_day_off_clashes', recurring_day_off_clash_count,
      'scheduling_constraint_clashes', scheduling_constraint_clashes
    )
  );

  return jsonb_build_object(
    'snapshot_id', new_snapshot_id,
    'version', next_version,
    'shift_count', published_shift_count,
    'notified_memberships', notified_membership_count,
    'finalised_requests', finalised_request_count,
    'finalised_release_requests', finalised_release_count,
    'one_off_unavailability_clashes', one_off_clash_count,
    'recurring_day_off_clashes', recurring_day_off_clash_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Grants — public RPCs to authenticated only.
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_request_shift_release(uuid, uuid, text) from public, anon;
revoke all on function public.rpc_withdraw_shift_release(uuid, uuid) from public, anon;
revoke all on function public.rpc_approve_shift_release(uuid, uuid, text) from public, anon;
revoke all on function public.rpc_decline_shift_release(uuid, uuid, text) from public, anon;

grant execute on function public.rpc_request_shift_release(uuid, uuid, text) to authenticated;
grant execute on function public.rpc_withdraw_shift_release(uuid, uuid) to authenticated;
grant execute on function public.rpc_approve_shift_release(uuid, uuid, text) to authenticated;
grant execute on function public.rpc_decline_shift_release(uuid, uuid, text) to authenticated;

revoke all on function public.rpc_publish_rota_week(uuid, uuid, boolean) from public, anon;
grant execute on function public.rpc_publish_rota_week(uuid, uuid, boolean) to authenticated;

comment on function public.rpc_request_shift_release(uuid, uuid, text) is
  'Staff-only: ask to be released from the caller''s own assigned published shift with a required reason (or re-ask after withdrawing). Never changes any rota.';
comment on function public.rpc_withdraw_shift_release(uuid, uuid) is
  'Staff-only: withdraw the caller''s own pending shift-release request.';
comment on function public.rpc_approve_shift_release(uuid, uuid, text) is
  'Manager-only: approve a pending release — reopens the DRAFT shift (published snapshot untouched until republish), notifies the requester, and audits. Follows the phase-31 lock protocol.';
comment on function public.rpc_decline_shift_release(uuid, uuid, text) is
  'Manager-only: decline a pending release request with an optional note; the staff member is notified in-app.';
comment on function public.rpc_publish_rota_week(uuid, uuid, boolean) is
  'Manager-only atomic publish: locks assigned staff, derives approved one-off/recurring scheduling clashes, requires explicit warning acknowledgement, then commits versioned snapshot + requests + targeted notifications + exact audit evidence atomically. Third parameter defaults false.';

notify pgrst, 'reload schema';
