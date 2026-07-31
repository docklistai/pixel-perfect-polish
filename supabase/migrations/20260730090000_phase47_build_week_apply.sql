-- Phase 47: atomic Build the Week apply.
--
-- Build the Week produces one typed proposal, the manager reviews it, and this
-- RPC applies exactly that proposal or nothing at all.
--
-- Why this is a VALIDATOR and not a planner
-- -----------------------------------------
-- The product rules require one pure deterministic planner AND forbid a second
-- independent SQL balancing engine. A plpgsql function cannot run the TypeScript
-- planner, so re-deriving the plan here would mean writing that second engine.
-- Instead this function proves the submitted proposal is safe to apply, using
-- three independent checks:
--
--   1. the input fingerprint detects that the authoritative world has moved
--      since the proposal was built;
--   2. the proposal digest detects that the operation list changed between
--      preview and apply — change detection only, see section 2 below;
--   3. per-operation validation proves each operation is individually legal
--      against the rows this transaction has locked.
--
-- Only (3) is a security boundary. (1) and (2) are unkeyed md5 checksums that a
-- manager can legitimately re-derive, so nothing here relies on them being
-- unforgeable; they exist to turn a stale or mangled proposal into a clear
-- refusal instead of a surprising write.
--
-- Nothing here chooses who works a shift. It only refuses choices that are not
-- allowed.
--
-- Locked rules enforced structurally
-- ----------------------------------
--   * There is no DELETE against public.shifts anywhere in this function.
--   * The only UPDATE carries `assignment_status = 'open' AND staff_member_id IS
--     NULL` in its WHERE clause, so an assigned shift can never be altered.
--   * Only three operation kinds are accepted; anything else is refused.
--
-- Lock protocol (phase 31), unchanged
-- -----------------------------------
--   1. the target rota_weeks row is locked FOR UPDATE **before** its status is
--      read, so the draft-only precondition cannot be evaluated against stale
--      data (the pattern rpc_copy_previous_rota_week uses, not the unlocked read
--      in rpc_copy_rota_day);
--   2. shift writes fire the phase 40 week lock and the phase 31 staff
--      eligibility lock; operations arrive ordered by ascending staff id, which
--      is the protocol's acquisition order, so this participates deadlock-free;
--   3. the phase 44 trigger performs any published -> draft transition inside
--      this same transaction.
--
-- Error contract: every deliberate refusal raises 55000 with hand-authored text
-- under 300 characters that avoids the raw-internal pattern in
-- src/lib/safe-errors.ts, so PostgREST delivers the reason verbatim. 40001 is
-- never raised — it is retried to a gateway timeout and its message is replaced.

-- ---------------------------------------------------------------------------
-- 1. Role identity, shared with the TypeScript planner
-- ---------------------------------------------------------------------------

-- Must stay byte-identical to normaliseRoleKey in
-- src/features/rota/lib/scheduling/shiftSignature.ts. The character class is
-- written out rather than using \s because Postgres \s is the six ASCII space
-- characters while JavaScript \s also matches U+00A0; and whitespace is
-- collapsed before trimming because btrim(text) trims spaces only.
create or replace function public.rpc_internal_normalise_role_key(p_role text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(regexp_replace(coalesce(p_role, ''), '[ \t\r\n\f\v]+', ' ', 'g'), ' '));
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, so every
-- rpc_internal_* helper has to revoke it explicitly. The SECURITY DEFINER
-- callers below run as the owner and are unaffected.
revoke all on function public.rpc_internal_normalise_role_key(text)
  from public, anon, authenticated;

comment on function public.rpc_internal_normalise_role_key(text) is
  'Normalized role identity: collapse ASCII whitespace, trim, lowercase. Punctuation is significant. Mirrors normaliseRoleKey in the scheduling planner.';

-- ---------------------------------------------------------------------------
-- 2. Proposal digest
-- ---------------------------------------------------------------------------

-- jsonb already stores keys in a canonical order with no insignificant
-- whitespace, so its text form is a stable serialisation of equal values. Array
-- order is preserved, which is intended: the order operations are applied in is
-- part of what the manager approved.
--
-- WHAT THIS IS NOT. md5 here is unkeyed, and rpc_build_week_proposal_stamp below
-- will issue a digest over any operation list a manager hands it. So a manager
-- CAN obtain a valid digest for operations they have altered — this detects
-- change between preview and apply, it does not authenticate the proposal, and
-- it must never be described as tamper-resistant. The actual authorisation
-- boundary is the manager check plus RLS, and the actual safety boundary is the
-- per-operation validation further down, which is applied to every proposal
-- regardless of how its digest was obtained.
-- Asserted, not assumed, in supabase/tests/phase47_build_week_parity_tests.sql.
create or replace function public.rpc_internal_build_week_digest(p_operations jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select md5(coalesce(p_operations, '[]'::jsonb)::text);
$$;

comment on function public.rpc_internal_build_week_digest(jsonb) is
  'Integrity digest over a Build the Week operation list. Detects alteration between preview and apply.';

-- ---------------------------------------------------------------------------
-- 3. Input fingerprint
-- ---------------------------------------------------------------------------

-- Computed only here, and called by both the proposal server function and the
-- apply RPC below. Having one implementation removes cross-language
-- canonicalisation drift as a class of bug entirely.
--
-- md5 is change detection, not a security primitive — authorisation is the
-- manager check plus RLS. It is built into Postgres core, so this adds no
-- extension dependency.
--
-- Approved AND pending leave are both covered, because both are hard exclusions
-- for a new automatic assignment.
create or replace function public.rpc_internal_build_week_input_fingerprint(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_source jsonb
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  week_row record;
  location_tz text;
  start_weekday smallint;
  parts text;
begin
  select rw.id, rw.week_start, rw.status, rw.location_id
  into week_row
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = p_rota_week_id;

  if week_row.id is null then
    return null;
  end if;

  select loc.timezone into location_tz
  from public.locations as loc
  where loc.workspace_id = p_workspace_id and loc.id = week_row.location_id;

  select w.rota_start_weekday into start_weekday
  from public.workspaces as w where w.id = p_workspace_id;

  parts :=
    concat_ws(
      E'\n',
      'week:' || week_row.id || '|' || week_row.week_start || '|' || week_row.status
        || '|' || week_row.location_id || '|' || coalesce(location_tz, 'UTC')
        || '|' || coalesce(start_weekday, 0),
      'source:' || coalesce(p_source::text, 'null'),
      coalesce((
        select string_agg(
          shift.id || '|' || shift.shift_date || '|' || shift.starts_at || '|' || shift.ends_at
            || '|' || shift.role_name || '|' || coalesce(shift.staff_member_id::text, '-')
            || '|' || shift.department_id || '|' || shift.break_minutes
            || '|' || shift.assignment_status,
          E'\n' order by shift.id)
        from public.shifts as shift
        where shift.workspace_id = p_workspace_id and shift.rota_week_id = p_rota_week_id
      ), 'shifts:none'),
      coalesce((
        select string_agg(
          staff.id || '|' || staff.employment_status || '|' || coalesce(staff.role_name, '-')
            || '|' || coalesce(staff.department_id::text, '-')
            || '|' || coalesce(staff.contracted_minutes_per_week::text, '-'),
          E'\n' order by staff.id)
        from public.staff_members as staff
        where staff.workspace_id = p_workspace_id
      ), 'staff:none'),
      coalesce((
        select string_agg(
          lr.id || '|' || lr.staff_member_id || '|' || lr.start_date || '|' || lr.end_date
            || '|' || lr.status,
          E'\n' order by lr.id)
        from public.leave_requests as lr
        where lr.workspace_id = p_workspace_id
          and lr.status in ('approved', 'pending')
          and lr.end_date >= week_row.week_start
          and lr.start_date <= week_row.week_start + 7
      ), 'leave:none'),
      coalesce((
        select string_agg(d.staff_member_id || '|' || d.weekday, E'\n'
          order by d.staff_member_id, d.weekday)
        from public.staff_recurring_day_off_requests as d
        where d.workspace_id = p_workspace_id and d.status = 'approved'
      ), 'dayoff:none'),
      coalesce((
        select string_agg(u.staff_member_id || '|' || u.date, E'\n'
          order by u.staff_member_id, u.date)
        from public.staff_one_off_unavailability_requests as u
        where u.workspace_id = p_workspace_id and u.status = 'approved'
          and u.date >= week_row.week_start and u.date <= week_row.week_start + 7
      ), 'unavailable:none')
    );

  return md5(parts);
end;
$$;

revoke all on function public.rpc_internal_build_week_input_fingerprint(uuid, uuid, jsonb)
  from public, anon, authenticated;

comment on function public.rpc_internal_build_week_input_fingerprint(uuid, uuid, jsonb) is
  'Change-detection fingerprint over every authoritative input a Build the Week proposal reads. Re-derived under the week lock at apply time; a mismatch means the proposal is stale.';

-- ---------------------------------------------------------------------------
-- 4. Signature helpers
-- ---------------------------------------------------------------------------

-- Canonical text form of a shift signature, so the stored row and the submitted
-- expectation are compared as one value rather than field by field.
create or replace function public.rpc_internal_shift_signature_text(
  p_work_date date,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_role_name text,
  p_department_id uuid,
  p_location_id uuid,
  p_break_minutes integer,
  p_timezone text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws('|',
    p_work_date::text,
    to_char((p_starts_at at time zone p_timezone)::time, 'HH24:MI'),
    to_char((p_ends_at at time zone p_timezone)::time, 'HH24:MI'),
    case when (p_ends_at at time zone p_timezone)::date > p_work_date then '1' else '0' end,
    p_department_id::text,
    p_location_id::text,
    p_break_minutes::text,
    public.rpc_internal_normalise_role_key(p_role_name)
  );
$$;

-- The same form, built from a proposal's signature object.
create or replace function public.rpc_internal_proposal_signature_text(p_signature jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws('|',
    p_signature->>'workDate',
    p_signature->>'startLocal',
    p_signature->>'endLocal',
    case when (p_signature->>'overnight')::boolean then '1' else '0' end,
    p_signature->>'departmentId',
    p_signature->>'locationId',
    (p_signature->>'breakMinutes'),
    public.rpc_internal_normalise_role_key(p_signature->>'roleKey')
  );
$$;

-- ---------------------------------------------------------------------------
-- 4b. Manager-guarded stamp: the only way a caller obtains a fingerprint/digest
-- ---------------------------------------------------------------------------

-- The internal fingerprint function reads across a whole workspace and takes the
-- workspace id as a parameter without checking membership, so it must never be
-- callable directly by `authenticated` — that would be an oracle for any
-- workspace's state. This wrapper adds the manager check and is the only granted
-- entry point. Returning both values together also keeps a proposal to one round
-- trip.
create or replace function public.rpc_build_week_proposal_stamp(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_source jsonb,
  p_operations jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  fingerprint text;
begin
  perform public.rpc_internal_require_manager(p_workspace_id);

  fingerprint := public.rpc_internal_build_week_input_fingerprint(
    p_workspace_id, p_rota_week_id, p_source);
  if fingerprint is null then
    raise exception 'That rota week could not be found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'fingerprint', fingerprint,
    'digest', public.rpc_internal_build_week_digest(p_operations)
  );
end;
$$;

revoke all on function public.rpc_build_week_proposal_stamp(uuid, uuid, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_build_week_proposal_stamp(uuid, uuid, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_build_week_proposal_stamp(uuid, uuid, jsonb, jsonb) is
  'Manager-only: issues the input fingerprint and proposal digest for one Build the Week proposal. The internal functions it wraps stay revoked so they cannot be used to probe another workspace.';

-- ---------------------------------------------------------------------------
-- 5. Assignment validation
-- ---------------------------------------------------------------------------

-- Verifies one proposed assignment. This chooses nobody — it only refuses a
-- choice the planner should not have made, or that has stopped being legal since
-- it did. That distinction is what keeps this from being a second scheduling
-- engine.
create or replace function public.rpc_internal_assert_build_week_assignable(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_signature jsonb,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_shift_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  staff_row record;
  touched_dates date[];
  location_tz text;
begin
  select staff.id, staff.employment_status, staff.role_name
  into staff_row
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id and staff.id = p_staff_member_id
  for update;

  if staff_row.id is null or staff_row.employment_status <> 'active' then
    raise exception 'Someone in this proposal is no longer active. Build it again.'
      using errcode = '55000';
  end if;

  if public.rpc_internal_normalise_role_key(staff_row.role_name)
     is distinct from public.rpc_internal_normalise_role_key(p_signature->>'roleKey') then
    raise exception 'Someone in this proposal does not hold the role for their shift.'
      using errcode = '55000';
  end if;

  select coalesce(loc.timezone, 'UTC') into location_tz
  from public.locations as loc
  where loc.workspace_id = p_workspace_id and loc.id = (p_signature->>'locationId')::uuid;
  location_tz := coalesce(location_tz, 'UTC');

  -- Every local date the shift touches, so an overnight shift is checked against
  -- the day it ends on as well as the day it starts on. One second is subtracted
  -- so a shift ending exactly at midnight does not claim the following day.
  touched_dates := array(
    select day::date
    from generate_series(
      (p_starts_at at time zone location_tz)::date,
      ((p_ends_at - interval '1 second') at time zone location_tz)::date,
      interval '1 day'
    ) as day
  );

  if exists (
    select 1 from public.leave_requests as lr
    where lr.workspace_id = p_workspace_id
      and lr.staff_member_id = p_staff_member_id
      and lr.status in ('approved', 'pending')
      and exists (select 1 from unnest(touched_dates) as d
                  where d between lr.start_date and lr.end_date)
  ) then
    raise exception 'Someone in this proposal now has leave on that day. Build it again.'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.staff_one_off_unavailability_requests as u
    where u.workspace_id = p_workspace_id
      and u.staff_member_id = p_staff_member_id
      and u.status = 'approved'
      and u.date = any(touched_dates)
  ) then
    raise exception 'Someone in this proposal is now marked unavailable. Build it again.'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.staff_recurring_day_off_requests as d
    where d.workspace_id = p_workspace_id
      and d.staff_member_id = p_staff_member_id
      and d.status = 'approved'
      and exists (select 1 from unnest(touched_dates) as td
                  where d.weekday = extract(isodow from td)::smallint - 1)
  ) then
    raise exception 'Someone in this proposal has a regular day off then. Build it again.'
      using errcode = '55000';
  end if;

  -- Real calendar interval overlap, including shifts inserted earlier in this
  -- same transaction.
  if exists (
    select 1 from public.shifts as other
    where other.workspace_id = p_workspace_id
      and other.staff_member_id = p_staff_member_id
      and (p_exclude_shift_id is null or other.id <> p_exclude_shift_id)
      and other.starts_at < p_ends_at
      and p_starts_at < other.ends_at
  ) then
    raise exception 'Someone in this proposal would be working two shifts at once. Build it again.'
      using errcode = '55000';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. rpc_apply_build_week_proposal
-- ---------------------------------------------------------------------------

create or replace function public.rpc_apply_build_week_proposal(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_input_fingerprint text,
  p_proposal_digest text,
  p_source jsonb,
  p_operations jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  week_start_date date;
  week_status text;
  week_location_id uuid;
  location_tz text;
  current_fingerprint text;
  operation jsonb;
  signature jsonb;
  op_kind text;
  op_staff_id uuid;
  op_shift_id uuid;
  work_date date;
  start_local time;
  end_local time;
  overnight boolean;
  department_id uuid;
  break_minutes integer;
  role_name text;
  new_starts timestamptz;
  new_ends timestamptz;
  existing_shift record;
  created_open integer := 0;
  created_assigned integer := 0;
  assigned_existing integer := 0;
  operation_count integer;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_operations is null or jsonb_typeof(p_operations) <> 'array' then
    raise exception 'The proposal could not be read. Build this week again.'
      using errcode = '22023';
  end if;

  operation_count := jsonb_array_length(p_operations);
  if operation_count = 0 then
    raise exception 'This proposal has nothing to apply.' using errcode = '55000';
  end if;
  if operation_count > 500 then
    raise exception 'This proposal is too large to apply in one go. Build a smaller week.'
      using errcode = '55000';
  end if;

  -- Lock the week BEFORE reading its status, so the draft-only precondition is
  -- evaluated against a row nobody else can change underneath us.
  select rw.week_start, rw.status, rw.location_id
  into week_start_date, week_status, week_location_id
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = p_rota_week_id
  for update;

  if week_start_date is null then
    raise exception 'That rota week could not be found.' using errcode = 'P0002';
  end if;

  if week_status = 'archived' then
    raise exception 'Archived rota weeks cannot be built.' using errcode = '55000';
  end if;
  if week_status <> 'draft' then
    raise exception
      'Build only runs on a draft week. Edit this published week directly, or clear it first.'
      using errcode = '55000';
  end if;

  select loc.timezone into location_tz
  from public.locations as loc
  where loc.workspace_id = p_workspace_id and loc.id = week_location_id and loc.status = 'active';
  if location_tz is null then
    raise exception 'This rota location is no longer available.' using errcode = 'P0002';
  end if;

  -- Integrity: the operation list is exactly the one that was reviewed.
  if public.rpc_internal_build_week_digest(p_operations) is distinct from p_proposal_digest then
    raise exception 'This proposal was altered before it was applied. Nothing was applied. Build it again.'
      using errcode = '55000';
  end if;

  -- Staleness: the authoritative inputs have not moved since it was built.
  current_fingerprint := public.rpc_internal_build_week_input_fingerprint(
    p_workspace_id, p_rota_week_id, p_source);
  if current_fingerprint is distinct from p_input_fingerprint then
    raise exception
      'This week changed while the proposal was open. Nothing was applied. Close this and build again.'
      using errcode = '55000';
  end if;

  for operation in select * from jsonb_array_elements(p_operations) loop
    op_kind := operation->>'kind';
    if op_kind not in ('create-open', 'create-assigned', 'assign-open') then
      raise exception 'This proposal contains an operation that is not allowed.'
        using errcode = '55000';
    end if;

    signature := case when op_kind = 'assign-open' then operation->'expected' else operation->'signature' end;
    if signature is null or jsonb_typeof(signature) <> 'object' then
      raise exception 'The proposal could not be read. Build this week again.' using errcode = '22023';
    end if;

    work_date := (signature->>'workDate')::date;
    start_local := (signature->>'startLocal')::time;
    end_local := (signature->>'endLocal')::time;
    overnight := coalesce((signature->>'overnight')::boolean, false);
    department_id := (signature->>'departmentId')::uuid;
    break_minutes := (signature->>'breakMinutes')::integer;

    if work_date < week_start_date or work_date > week_start_date + 6 then
      raise exception 'A shift in this proposal falls outside the week being built.'
        using errcode = '55000';
    end if;
    if break_minutes < 0 or break_minutes > 1440 then
      raise exception 'A shift in this proposal has an unusable break length.'
        using errcode = '55000';
    end if;
    if (signature->>'locationId')::uuid is distinct from week_location_id then
      raise exception 'A shift in this proposal belongs to a different location.'
        using errcode = '55000';
    end if;
    -- Overnight state must agree with the times, or the reconstructed end would
    -- silently disagree with what the manager reviewed.
    if overnight <> (end_local <= start_local) then
      raise exception 'A shift in this proposal has inconsistent overnight times.'
        using errcode = '55000';
    end if;

    if not exists (
      select 1 from public.departments as d
      where d.workspace_id = p_workspace_id and d.id = department_id and d.status = 'active'
    ) then
      raise exception 'A department in this proposal is no longer active.' using errcode = '55000';
    end if;

    new_starts := (work_date + start_local) at time zone location_tz;
    new_ends := ((case when overnight then work_date + 1 else work_date end) + end_local)
      at time zone location_tz;

    if op_kind = 'assign-open' then
      op_shift_id := (operation->>'shiftId')::uuid;
      select shift.id, shift.shift_date, shift.starts_at, shift.ends_at, shift.role_name,
             shift.department_id, shift.location_id, shift.break_minutes,
             shift.assignment_status, shift.staff_member_id
      into existing_shift
      from public.shifts as shift
      where shift.workspace_id = p_workspace_id
        and shift.rota_week_id = p_rota_week_id
        and shift.id = op_shift_id;

      if existing_shift.id is null then
        raise exception 'A shift in this proposal is no longer in this week. Build it again.'
          using errcode = '55000';
      end if;
      if existing_shift.assignment_status <> 'open' or existing_shift.staff_member_id is not null then
        raise exception 'A shift in this proposal has already been assigned. Build it again.'
          using errcode = '55000';
      end if;
      -- Proves this is the shift the manager reviewed. Identical shifts are
      -- legitimate, so the id and status alone are not enough.
      if public.rpc_internal_shift_signature_text(
           existing_shift.shift_date, existing_shift.starts_at, existing_shift.ends_at,
           existing_shift.role_name, existing_shift.department_id, existing_shift.location_id,
           existing_shift.break_minutes, location_tz)
         is distinct from public.rpc_internal_proposal_signature_text(signature) then
        raise exception 'A shift in this proposal has changed since it was reviewed. Build it again.'
          using errcode = '55000';
      end if;
      role_name := existing_shift.role_name;
    else
      -- The display role, not the signature's normalized key. roleKey is
      -- lowercased for identity; storing it would put "head chef" on the grid.
      role_name := btrim(coalesce(operation->>'roleName', ''));
      if role_name = '' or length(role_name) > 120 then
        raise exception 'A shift in this proposal has an unusable role name.'
          using errcode = '55000';
      end if;
      if public.rpc_internal_normalise_role_key(role_name)
         is distinct from public.rpc_internal_normalise_role_key(signature->>'roleKey') then
        raise exception 'A shift in this proposal names a role that does not match its own identity.'
          using errcode = '55000';
      end if;
    end if;

    if op_kind = 'create-open' then
      insert into public.shifts (
        workspace_id, rota_week_id, location_id, department_id, staff_member_id,
        shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
      ) values (
        p_workspace_id, p_rota_week_id, week_location_id, department_id, null,
        work_date, new_starts, new_ends, break_minutes, role_name, 'open'
      );
      created_open := created_open + 1;
      continue;
    end if;

    -- Both remaining kinds assign somebody, so the person is validated once.
    op_staff_id := (operation->>'staffId')::uuid;
    perform public.rpc_internal_assert_build_week_assignable(
      p_workspace_id, op_staff_id, signature, new_starts, new_ends,
      case when op_kind = 'assign-open' then op_shift_id else null end);

    if op_kind = 'create-assigned' then
      insert into public.shifts (
        workspace_id, rota_week_id, location_id, department_id, staff_member_id,
        shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
      ) values (
        p_workspace_id, p_rota_week_id, week_location_id, department_id, op_staff_id,
        work_date, new_starts, new_ends, break_minutes, role_name, 'scheduled'
      );
      created_assigned := created_assigned + 1;
    else
      -- The predicate is the structural guarantee that no assigned shift is ever
      -- altered by this function.
      update public.shifts
      set staff_member_id = op_staff_id, assignment_status = 'scheduled'
      where workspace_id = p_workspace_id
        and id = op_shift_id
        and assignment_status = 'open'
        and staff_member_id is null;
      if not found then
        raise exception 'A shift in this proposal has already been assigned. Build it again.'
          using errcode = '55000';
      end if;
      assigned_existing := assigned_existing + 1;
    end if;
  end loop;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'rota_week.built', 'rota_week', p_rota_week_id,
    jsonb_build_object(
      'source', p_source,
      'operations', operation_count,
      'created_open', created_open,
      'created_assigned', created_assigned,
      'assigned_existing', assigned_existing,
      'input_fingerprint', p_input_fingerprint,
      'proposal_digest', p_proposal_digest
    )
  );

  return jsonb_build_object(
    'created_open', created_open,
    'created_assigned', created_assigned,
    'assigned_existing', assigned_existing,
    'operations', operation_count
  );
end;
$$;

revoke all on function public.rpc_internal_assert_build_week_assignable(uuid, uuid, jsonb, timestamptz, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.rpc_internal_shift_signature_text(date, timestamptz, timestamptz, text, uuid, uuid, integer, text)
  from public, anon, authenticated;
revoke all on function public.rpc_internal_proposal_signature_text(jsonb)
  from public, anon, authenticated;
revoke all on function public.rpc_internal_build_week_digest(jsonb)
  from public, anon, authenticated;

revoke all on function public.rpc_apply_build_week_proposal(uuid, uuid, text, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_apply_build_week_proposal(uuid, uuid, text, text, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_apply_build_week_proposal(uuid, uuid, text, text, jsonb, jsonb) is
  'Manager-only, atomic: applies one reviewed Build the Week proposal. Validates a fingerprint, a digest and every operation, then inserts missing demand and assigns open shifts. Never deletes a shift and never alters an assigned one. All-or-nothing.';

notify pgrst, 'reload schema';
