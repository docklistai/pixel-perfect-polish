-- Phase 48: Build the Week lock-order correction and typed operation validation.
--
-- Closes the two runtime defects the Phase 47 hosted migration-readiness audit
-- found. Phase 47 itself is unchanged; everything here is a replacement applied
-- on top of it.
--
-- NOT functions-only. Unlike phase 47 this migration also creates one composite
-- type (`public.build_week_operation`, via a guarded DO block). A future
-- readiness audit checking "no new objects" will see it — that is expected.
--
-- 1. LOCK ORDER
-- -------------
-- Phase 47 acquired the per-staff eligibility lock inside
-- rpc_internal_assert_build_week_assignable, once per operation, in the order
-- operations happened to arrive. Two problems followed:
--
--   * it took `for update` on public.staff_members DIRECTLY, while every other
--     shift writer reaches staff through rpc_internal_lock_staff_eligibility,
--     which locks memberships first and staff second. Build was therefore
--     staff-then-membership and everything else membership-then-staff — a true
--     inversion, and a 40P01 between a Build apply and an ordinary shift write
--     in a different week of the same workspace;
--   * the acquisition order was the client's operation order. Nothing in SQL
--     validated it, and the planner's sortOperations orders by rank first
--     (assign-open before creations) and staff id second, so the sequence is
--     ascending only WITHIN a rank group. Two proposals could present opposite
--     orders.
--
-- The fix is to stop deriving lock order from the operation list at all. Every
-- staff member the proposal actually assigns is collected up front and locked
-- ONCE, through the existing protocol helper, before any per-operation
-- validation or write. The helper already sorts memberships and staff into
-- ascending uuid order, so Build now inherits the canonical order rather than
-- inventing a second one.
--
-- Final hierarchy, identical to every ordinary shift write:
--
--     rota_weeks (target week, FOR UPDATE)
--       -> workspace_memberships (ascending uuid)
--         -> staff_members (ascending uuid)
--           -> shifts (writes)
--
-- The per-row triggers on public.shifts still call
-- rpc_internal_lock_staff_eligibility for each written row. Those calls are now
-- no-ops: the locks are already held by this transaction, so they cannot
-- reorder anything. That is why the helper is reused rather than bypassed.
--
-- The locking set is deliberately narrow — only staff named by 'create-assigned'
-- and 'assign-open'. A 'create-open' operation assigns nobody and locks nobody.
--
-- 2. TYPED VALIDATION
-- -------------------
-- Phase 47 compared an existing shift's signature (rendered from typed database
-- values) against the proposal's signature (rendered from raw JSON text). Any
-- equivalent-but-differently-spelled value — an uppercase uuid, '9:00' for
-- '09:00', '2026-8-3' for '2026-08-03' — passed the typed prechecks and then
-- failed the textual signature comparison, refusing a legitimate assign-open.
--
-- Every operation is now parsed once, up front, into the authoritative database
-- types, and both sides of every comparison render through one canonical
-- builder. Parsing happens in a single set-based statement before any write, so
-- a malformed value is a hand-authored refusal with nothing applied rather than
-- a raw cast error part-way through the loop.
--
-- This does not weaken validation:
--
--   * seconds are rejected outright rather than silently truncated by the
--     'HH24:MI' rendering, so the canonical form stays lossless;
--   * a missing key parses to NULL and is refused explicitly. Phase 47 let a
--     NULL workDate through, because `null < week_start` is NULL, not true;
--   * the fingerprint, the digest, the role-key normalisation and every
--     per-operation rule are unchanged.
--
-- Error contract unchanged: deliberate refusals raise 55000 with hand-authored
-- text under 300 characters. 40001 is still never raised out of this RPC — the
-- one path that can produce it (the eligibility helper's identity-changed
-- check) is caught and re-raised as 55000, because PostgREST retries 40001 to a
-- gateway timeout and replaces its message.

-- ---------------------------------------------------------------------------
-- 1. Parsed operation type
-- ---------------------------------------------------------------------------

-- One row per operation, already in database types. `ordinal` preserves the
-- order the manager reviewed, which is the order operations are APPLIED in;
-- lock order is now independent of it.
do $$
begin
  if not exists (
    select 1 from pg_type as t
    join pg_namespace as n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'build_week_operation'
  ) then
    create type public.build_week_operation as (
      ordinal integer,
      kind text,
      staff_id uuid,
      shift_id uuid,
      role_name text,
      work_date date,
      start_local time,
      end_local time,
      overnight boolean,
      department_id uuid,
      location_id uuid,
      break_minutes integer,
      role_key text
    );
  end if;
end
$$;

-- Postgres grants USAGE on a new type to PUBLIC by default, exactly as it does
-- EXECUTE on a new function. Nothing outside the definer RPCs has any business
-- naming this type, so the default grant is removed. No explicit grant replaces
-- it: the only consumers are SECURITY DEFINER functions owned by the same role
-- that owns the type, and an owner's rights do not come from the ACL.
revoke all on type public.build_week_operation from public, anon, authenticated;

comment on type public.build_week_operation is
  'One Build the Week operation parsed into authoritative database types. Built once per apply, before any lock or write, so malformed input refuses cleanly. Internal: USAGE is revoked from PUBLIC.';

-- ---------------------------------------------------------------------------
-- 2. Canonical signature rendering
-- ---------------------------------------------------------------------------

-- The single place a shift signature becomes text. Both the stored-shift side
-- and the proposal side render through this, so the two can no longer disagree
-- about spelling. Inputs are already typed, which is the whole point: uuid,
-- date, time, integer and boolean equality is decided by Postgres, not by how
-- the client happened to serialise them.
create or replace function public.rpc_internal_signature_text(
  p_work_date date,
  p_start_local time,
  p_end_local time,
  p_overnight boolean,
  p_department_id uuid,
  p_location_id uuid,
  p_break_minutes integer,
  p_role_key text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws('|',
    p_work_date::text,
    to_char(p_start_local, 'HH24:MI'),
    to_char(p_end_local, 'HH24:MI'),
    case when p_overnight then '1' else '0' end,
    p_department_id::text,
    p_location_id::text,
    p_break_minutes::text,
    public.rpc_internal_normalise_role_key(p_role_key)
  );
$$;

revoke all on function public.rpc_internal_signature_text(
  date, time, time, boolean, uuid, uuid, integer, text)
  from public, anon, authenticated;

comment on function public.rpc_internal_signature_text(
  date, time, time, boolean, uuid, uuid, integer, text) is
  'Canonical text form of a shift signature, from typed values. The only renderer; the stored-shift and proposal sides both delegate here so equivalent values compare equal.';

-- Same output as phase 47, now delegating so there is one rendering rather than
-- two that must be kept in step by hand.
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
  select public.rpc_internal_signature_text(
    p_work_date,
    (p_starts_at at time zone p_timezone)::time,
    (p_ends_at at time zone p_timezone)::time,
    (p_ends_at at time zone p_timezone)::date > p_work_date,
    p_department_id,
    p_location_id,
    p_break_minutes,
    p_role_name
  );
$$;

revoke all on function public.rpc_internal_shift_signature_text(
  date, timestamptz, timestamptz, text, uuid, uuid, integer, text)
  from public, anon, authenticated;

-- The raw-text comparator is gone. Keeping it would leave a second, wrong way
-- to render a proposal signature available to a future caller.
drop function if exists public.rpc_internal_proposal_signature_text(jsonb);

-- ---------------------------------------------------------------------------
-- 3. Assignment validation, without its own lock
-- ---------------------------------------------------------------------------

-- Phase 47's version took `for update` on the staff row itself and read the
-- role key back out of jsonb. Both are gone: the caller has already locked the
-- whole affected set in canonical order, and hands the parsed values in.
drop function if exists public.rpc_internal_assert_build_week_assignable(
  uuid, uuid, jsonb, timestamptz, timestamptz, uuid);

create or replace function public.rpc_internal_assert_build_week_assignable(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_role_key text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
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
begin
  -- Deliberately NOT `for update`. rpc_apply_build_week_proposal has already
  -- locked every affected staff member through
  -- rpc_internal_lock_staff_eligibility, in ascending uuid order and after the
  -- membership locks. Re-locking here would reintroduce the phase 47 ordering
  -- defect for any future caller that skipped the bulk lock.
  select staff.id, staff.employment_status, staff.role_name
  into staff_row
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id and staff.id = p_staff_member_id;

  if staff_row.id is null or staff_row.employment_status <> 'active' then
    raise exception 'Someone in this proposal is no longer active. Build it again.'
      using errcode = '55000';
  end if;

  if public.rpc_internal_normalise_role_key(staff_row.role_name)
     is distinct from public.rpc_internal_normalise_role_key(p_role_key) then
    raise exception 'Someone in this proposal does not hold the role for their shift.'
      using errcode = '55000';
  end if;

  -- Every local date the shift touches, so an overnight shift is checked
  -- against the day it ends on as well as the day it starts on. One second is
  -- subtracted so a shift ending exactly at midnight does not claim the
  -- following day.
  touched_dates := array(
    select day::date
    from generate_series(
      (p_starts_at at time zone p_timezone)::date,
      ((p_ends_at - interval '1 second') at time zone p_timezone)::date,
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

revoke all on function public.rpc_internal_assert_build_week_assignable(
  uuid, uuid, text, timestamptz, timestamptz, text, uuid)
  from public, anon, authenticated;

comment on function public.rpc_internal_assert_build_week_assignable(
  uuid, uuid, text, timestamptz, timestamptz, text, uuid) is
  'Refuses one proposed assignment that is not legal. Chooses nobody. Assumes the caller already holds the staff eligibility lock for this person.';

-- ---------------------------------------------------------------------------
-- 4. rpc_apply_build_week_proposal
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
  parsed_operations public.build_week_operation[];
  affected_staff_ids uuid[];
  operation public.build_week_operation;
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
  -- evaluated against a row nobody else can change underneath us. This is the
  -- first lock in the hierarchy and stays first.
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

  -- -------------------------------------------------------------------------
  -- Shape checks, before any cast. A non-object element yields NULL for every
  -- key lookup without erroring, so the element type is checked first.
  -- -------------------------------------------------------------------------
  if exists (
    select 1 from jsonb_array_elements(p_operations) as op(value)
    where jsonb_typeof(op.value) <> 'object'
  ) then
    raise exception 'The proposal could not be read. Build this week again.'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_operations) as op(value)
    where coalesce(op.value->>'kind', '') not in ('create-open', 'create-assigned', 'assign-open')
  ) then
    raise exception 'This proposal contains an operation that is not allowed.'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_operations) as op(value)
    where jsonb_typeof(
      case when op.value->>'kind' = 'assign-open'
        then op.value->'expected' else op.value->'signature' end
    ) is distinct from 'object'
  ) then
    raise exception 'The proposal could not be read. Build this week again.'
      using errcode = '22023';
  end if;

  -- -------------------------------------------------------------------------
  -- Parse every operation into database types, once, before anything is
  -- locked or written. One statement, one subtransaction: a bad value cannot
  -- surface as a raw cast error part-way through applying.
  -- -------------------------------------------------------------------------
  begin
    select array_agg(candidate.parsed order by candidate.ord)
    into parsed_operations
    from (
      select
        op.ordinality as ord,
        row(
          op.ordinality::integer,
          op.value->>'kind',
          (op.value->>'staffId')::uuid,
          (op.value->>'shiftId')::uuid,
          btrim(coalesce(op.value->>'roleName', '')),
          (sig.value->>'workDate')::date,
          (sig.value->>'startLocal')::time,
          (sig.value->>'endLocal')::time,
          coalesce((sig.value->>'overnight')::boolean, false),
          (sig.value->>'departmentId')::uuid,
          (sig.value->>'locationId')::uuid,
          (sig.value->>'breakMinutes')::integer,
          sig.value->>'roleKey'
        )::public.build_week_operation as parsed
      from jsonb_array_elements(p_operations) with ordinality as op(value, ordinality)
      cross join lateral (
        select case when op.value->>'kind' = 'assign-open'
          then op.value->'expected' else op.value->'signature' end
      ) as sig(value)
    ) as candidate;
  exception when others then
    -- Class 22 is the data exceptions: bad uuid, bad date, bad time, bad
    -- integer, out of range. Anything else is a real fault and must not be
    -- disguised as a proposal problem.
    if sqlstate like '22%' then
      raise exception 'A value in this proposal could not be read. Build it again.'
        using errcode = '55000';
    end if;
    raise;
  end;

  -- A missing key casts to NULL rather than failing, so required fields are
  -- refused explicitly. Phase 47 let a NULL workDate past its range check,
  -- because `null < week_start` is NULL and not true.
  --
  -- `overnight` is deliberately absent from this list: it coalesces to false at
  -- parse time, matching phase 47, and a wrong value is caught downstream by the
  -- overnight-versus-times consistency rule rather than by presence.
  if exists (
    select 1 from unnest(parsed_operations) as p
    where p.work_date is null or p.start_local is null or p.end_local is null
      or p.department_id is null or p.location_id is null
      or p.break_minutes is null or p.role_key is null
      or (p.kind in ('create-assigned', 'assign-open') and p.staff_id is null)
      or (p.kind = 'assign-open' and p.shift_id is null)
  ) then
    raise exception 'A shift in this proposal is missing information. Build it again.'
      using errcode = '55000';
  end if;

  -- The canonical form renders HH24:MI. Seconds would be silently discarded,
  -- which would make a proposal match a stored shift it does not equal, so
  -- they are refused instead.
  if exists (
    select 1 from unnest(parsed_operations) as p
    where extract(second from p.start_local) <> 0
      or extract(second from p.end_local) <> 0
  ) then
    raise exception 'A shift in this proposal has times that are not whole minutes.'
      using errcode = '55000';
  end if;

  -- -------------------------------------------------------------------------
  -- Lock every affected staff member ONCE, in canonical order, before any
  -- per-operation validation or write. Order comes from the protocol helper,
  -- never from the order operations arrived in.
  -- -------------------------------------------------------------------------
  select coalesce(array_agg(distinct p.staff_id order by p.staff_id), array[]::uuid[])
  into affected_staff_ids
  from unnest(parsed_operations) as p
  where p.kind in ('create-assigned', 'assign-open') and p.staff_id is not null;

  if cardinality(affected_staff_ids) > 0 then
    begin
      perform public.rpc_internal_lock_staff_eligibility(p_workspace_id, affected_staff_ids);
    exception when sqlstate '40001' then
      -- The helper raises 40001 when a staff identity link moved mid-acquire.
      -- Nothing has been written yet, so this is a clean refusal — and it must
      -- not leave the function as 40001, which PostgREST retries to a gateway
      -- timeout with its message replaced.
      raise exception 'Someone in this proposal changed while it was being applied. Build it again.'
        using errcode = '55000';
    end;
  end if;

  -- -------------------------------------------------------------------------
  -- Apply, in the order the manager reviewed.
  -- -------------------------------------------------------------------------
  foreach operation in array parsed_operations loop
    if operation.work_date < week_start_date or operation.work_date > week_start_date + 6 then
      raise exception 'A shift in this proposal falls outside the week being built.'
        using errcode = '55000';
    end if;
    if operation.break_minutes < 0 or operation.break_minutes > 1440 then
      raise exception 'A shift in this proposal has an unusable break length.'
        using errcode = '55000';
    end if;
    if operation.location_id is distinct from week_location_id then
      raise exception 'A shift in this proposal belongs to a different location.'
        using errcode = '55000';
    end if;
    -- Overnight state must agree with the times, or the reconstructed end would
    -- silently disagree with what the manager reviewed.
    if operation.overnight <> (operation.end_local <= operation.start_local) then
      raise exception 'A shift in this proposal has inconsistent overnight times.'
        using errcode = '55000';
    end if;

    if not exists (
      select 1 from public.departments as d
      where d.workspace_id = p_workspace_id and d.id = operation.department_id
        and d.status = 'active'
    ) then
      raise exception 'A department in this proposal is no longer active.' using errcode = '55000';
    end if;

    new_starts := (operation.work_date + operation.start_local) at time zone location_tz;
    new_ends := ((case when operation.overnight then operation.work_date + 1
                       else operation.work_date end) + operation.end_local)
      at time zone location_tz;

    if operation.kind = 'assign-open' then
      select shift.id, shift.shift_date, shift.starts_at, shift.ends_at, shift.role_name,
             shift.department_id, shift.location_id, shift.break_minutes,
             shift.assignment_status, shift.staff_member_id
      into existing_shift
      from public.shifts as shift
      where shift.workspace_id = p_workspace_id
        and shift.rota_week_id = p_rota_week_id
        and shift.id = operation.shift_id;

      if existing_shift.id is null then
        raise exception 'A shift in this proposal is no longer in this week. Build it again.'
          using errcode = '55000';
      end if;
      if existing_shift.assignment_status <> 'open' or existing_shift.staff_member_id is not null then
        raise exception 'A shift in this proposal has already been assigned. Build it again.'
          using errcode = '55000';
      end if;
      -- Proves this is the shift the manager reviewed. Identical shifts are
      -- legitimate, so the id and status alone are not enough. Both sides now
      -- render from typed values through one builder.
      if public.rpc_internal_shift_signature_text(
           existing_shift.shift_date, existing_shift.starts_at, existing_shift.ends_at,
           existing_shift.role_name, existing_shift.department_id, existing_shift.location_id,
           existing_shift.break_minutes, location_tz)
         is distinct from public.rpc_internal_signature_text(
           operation.work_date, operation.start_local, operation.end_local, operation.overnight,
           operation.department_id, operation.location_id, operation.break_minutes,
           operation.role_key)
      then
        raise exception 'A shift in this proposal has changed since it was reviewed. Build it again.'
          using errcode = '55000';
      end if;
      role_name := existing_shift.role_name;
    else
      -- The display role, not the signature's normalized key. roleKey is
      -- lowercased for identity; storing it would put "head chef" on the grid.
      role_name := operation.role_name;
      if role_name is null or role_name = '' or length(role_name) > 120 then
        raise exception 'A shift in this proposal has an unusable role name.'
          using errcode = '55000';
      end if;
      if public.rpc_internal_normalise_role_key(role_name)
         is distinct from public.rpc_internal_normalise_role_key(operation.role_key) then
        raise exception 'A shift in this proposal names a role that does not match its own identity.'
          using errcode = '55000';
      end if;
    end if;

    if operation.kind = 'create-open' then
      insert into public.shifts (
        workspace_id, rota_week_id, location_id, department_id, staff_member_id,
        shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
      ) values (
        p_workspace_id, p_rota_week_id, week_location_id, operation.department_id, null,
        operation.work_date, new_starts, new_ends, operation.break_minutes, role_name, 'open'
      );
      created_open := created_open + 1;
      continue;
    end if;

    -- Both remaining kinds assign somebody. The staff row is already locked.
    perform public.rpc_internal_assert_build_week_assignable(
      p_workspace_id, operation.staff_id, operation.role_key, new_starts, new_ends, location_tz,
      case when operation.kind = 'assign-open' then operation.shift_id else null end);

    if operation.kind = 'create-assigned' then
      insert into public.shifts (
        workspace_id, rota_week_id, location_id, department_id, staff_member_id,
        shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
      ) values (
        p_workspace_id, p_rota_week_id, week_location_id, operation.department_id,
        operation.staff_id, operation.work_date, new_starts, new_ends, operation.break_minutes,
        role_name, 'scheduled'
      );
      created_assigned := created_assigned + 1;
    else
      -- The predicate is the structural guarantee that no assigned shift is ever
      -- altered by this function.
      update public.shifts
      set staff_member_id = operation.staff_id, assignment_status = 'scheduled'
      where workspace_id = p_workspace_id
        and id = operation.shift_id
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

revoke all on function public.rpc_apply_build_week_proposal(uuid, uuid, text, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_apply_build_week_proposal(uuid, uuid, text, text, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_apply_build_week_proposal(uuid, uuid, text, text, jsonb, jsonb) is
  'Manager-only, atomic: applies one reviewed Build the Week proposal. Parses every operation into database types, locks the whole affected staff set once in canonical order, then validates and applies each operation. Never deletes a shift and never alters an assigned one. All-or-nothing.';

notify pgrst, 'reload schema';
