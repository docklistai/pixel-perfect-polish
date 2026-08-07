-- Phase 51: importing a schedule into a week that does not exist yet.
--
-- Until now a schedule import required a saved draft week: the proposal stamp
-- fingerprints a rota_weeks row, and with no row the fingerprint was null and
-- the stamp raised P0002. A manager starting a genuinely fresh week — the most
-- common moment to import one — could not import at all.
--
-- WHAT THIS DOES NOT DO
-- ---------------------
-- It does not add a second apply path. rpc_apply_build_week_proposal is
-- untouched: its signature, its validation, its locks, its audit event and
-- every rule it enforces are exactly as phase 48 left them, and Build the Week
-- calls it exactly as before. This migration adds a thin front door that
-- creates the missing week and then delegates to that same function inside the
-- same transaction. One write path, one set of rules.
--
-- THE FRESH-WEEK CONTRACT
-- -----------------------
-- A fresh-week proposal is bound to (workspace, location, week_start, "no week
-- exists"). That fourth component is the point: the fingerprint is computed
-- over the ABSENCE of the week, so a week appearing between preview and apply
-- changes the fingerprint and the import is refused rather than merged into
-- somebody else's draft.
--
-- Apply is gated twice, and the order matters:
--
--   1. the absent-week fingerprint is re-derived and compared BEFORE anything
--      is inserted. After the insert the week exists, so the absent-week
--      fingerprint is no longer derivable and the staleness check would be
--      meaningless;
--   2. the week is then created with `on conflict do nothing returning id`. A
--      null return means somebody else created it first — a concurrent apply,
--      or this same proposal replayed after it already succeeded — and the
--      import is refused. This is what makes a double Apply safe: the second
--      one cannot reach the insert path a second time.
--
-- Both gates raise 55000 with hand-authored text, so PostgREST delivers the
-- reason verbatim. 40001 is never raised: it is retried to a gateway timeout
-- and its message is replaced.
--
-- ATOMICITY
-- ---------
-- The week creation and every shift insert are one transaction. Any refusal
-- from the delegated apply — a stale operation, an inactive department, an
-- unassignable person, the 500-operation ceiling — rolls the week creation back
-- with it. A failed import leaves no week and no shifts behind.

-- ---------------------------------------------------------------------------
-- 1. Shared workspace context, factored out of the existing fingerprint
-- ---------------------------------------------------------------------------

-- The four workspace-wide blocks every Build the Week fingerprint covers:
-- staff, leave, recurring days off and one-off unavailability. Extracted so the
-- absent-week fingerprint below reads exactly the same inputs as the
-- existing-week one, rather than a hand-copied near-duplicate that could drift.
--
-- Every block coalesces to a literal, so none is ever NULL and concat_ws never
-- skips one. That is what makes nesting this inside the caller's concat_ws
-- byte-identical to the flat form phase 47 wrote — asserted, not assumed, in
-- supabase/tests/phase51_import_fresh_week_tests.sql.
--
-- Approved AND pending leave are both covered, because both are hard exclusions
-- for a new automatic assignment.
create or replace function public.rpc_internal_build_week_context_text(
  p_workspace_id uuid,
  p_week_start date
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select concat_ws(
    E'\n',
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
        and lr.end_date >= p_week_start
        and lr.start_date <= p_week_start + 7
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
        and u.date >= p_week_start and u.date <= p_week_start + 7
    ), 'unavailable:none')
  );
$$;

-- Reads across a whole workspace without checking membership, exactly like the
-- fingerprint functions it serves, so it must never be reachable directly.
revoke all on function public.rpc_internal_build_week_context_text(uuid, date)
  from public, anon, authenticated;

comment on function public.rpc_internal_build_week_context_text(uuid, date) is
  'The workspace-wide blocks of a Build the Week fingerprint: staff, leave, recurring days off, one-off unavailability. Shared by the existing-week and absent-week fingerprints so the two read identical inputs.';

-- Same output as phase 47, byte for byte, now delegating the shared tail.
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
      public.rpc_internal_build_week_context_text(p_workspace_id, week_row.week_start)
    );

  return md5(parts);
end;
$$;

revoke all on function public.rpc_internal_build_week_input_fingerprint(uuid, uuid, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. The absent-week fingerprint
-- ---------------------------------------------------------------------------

-- Fingerprints the state a fresh-week import is built against: this location,
-- this week start, NO rota week, and the same workspace context the
-- existing-week fingerprint reads.
--
-- Returns null when a week already exists at that coordinate, or the location
-- is not active. Callers treat null as "this is not a fresh week" — it is the
-- single fact both the stamp and the apply hinge on.
--
-- The identity line is namespaced 'week:absent' rather than a week id, so an
-- absent-week fingerprint and an existing-week fingerprint can never collide or
-- be substituted for one another.
create or replace function public.rpc_internal_import_absent_week_fingerprint(
  p_workspace_id uuid,
  p_location_id uuid,
  p_week_start date,
  p_source jsonb
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  location_tz text;
  start_weekday smallint;
  parts text;
begin
  if p_location_id is null or p_week_start is null then
    return null;
  end if;

  select loc.timezone into location_tz
  from public.locations as loc
  where loc.workspace_id = p_workspace_id
    and loc.id = p_location_id
    and loc.status = 'active';
  if location_tz is null then
    return null;
  end if;

  if exists (
    select 1 from public.rota_weeks as rw
    where rw.workspace_id = p_workspace_id
      and rw.location_id = p_location_id
      and rw.week_start = p_week_start
  ) then
    return null;
  end if;

  select w.rota_start_weekday into start_weekday
  from public.workspaces as w where w.id = p_workspace_id;

  parts :=
    concat_ws(
      E'\n',
      'week:absent|' || p_week_start || '|draft|' || p_location_id
        || '|' || location_tz || '|' || coalesce(start_weekday, 0),
      'source:' || coalesce(p_source::text, 'null'),
      'shifts:none',
      public.rpc_internal_build_week_context_text(p_workspace_id, p_week_start)
    );

  return md5(parts);
end;
$$;

revoke all on function public.rpc_internal_import_absent_week_fingerprint(uuid, uuid, date, jsonb)
  from public, anon, authenticated;

comment on function public.rpc_internal_import_absent_week_fingerprint(uuid, uuid, date, jsonb) is
  'Change-detection fingerprint for an import built against a week that does not exist yet. Null when the week already exists or the location is inactive — that null IS the freshness test.';

-- ---------------------------------------------------------------------------
-- 3. Manager-guarded stamp for a fresh week
-- ---------------------------------------------------------------------------

-- The sibling of rpc_build_week_proposal_stamp, for the case that one cannot
-- serve: there is no rota week id to name. Same shape of answer, same manager
-- guard, and the internal functions it wraps stay revoked so neither can be
-- used to probe another workspace's state.
--
-- A separate entry point rather than extra parameters on the existing stamp:
-- adding parameters would mean dropping and recreating a function Build the
-- Week depends on, and two PostgREST-visible overloads of one name is a
-- "could not choose the best candidate function" waiting to happen.
create or replace function public.rpc_import_schedule_proposal_stamp(
  p_workspace_id uuid,
  p_location_id uuid,
  p_week_start date,
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
  start_weekday smallint;
begin
  perform public.rpc_internal_require_manager(p_workspace_id);

  if p_week_start is null then
    raise exception 'A week start date is required.' using errcode = '22023';
  end if;

  select w.rota_start_weekday into start_weekday
  from public.workspaces as w where w.id = p_workspace_id;
  if (extract(isodow from p_week_start)::integer - 1) is distinct from coalesce(start_weekday, 0) then
    raise exception 'That date is not the first day of one of your rota weeks.'
      using errcode = '55000';
  end if;

  fingerprint := public.rpc_internal_import_absent_week_fingerprint(
    p_workspace_id, p_location_id, p_week_start, p_source);

  if fingerprint is null then
    -- Either the location is gone or the week now exists. Both mean this is not
    -- a fresh-week import, and the caller must re-read the week before it can
    -- preview one.
    raise exception 'This week already exists, or its location is unavailable. Reopen the week and import again.'
      using errcode = '55000';
  end if;

  return jsonb_build_object(
    'fingerprint', fingerprint,
    'digest', public.rpc_internal_build_week_digest(p_operations),
    'week_state', 'absent'
  );
end;
$$;

revoke all on function public.rpc_import_schedule_proposal_stamp(uuid, uuid, date, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_import_schedule_proposal_stamp(uuid, uuid, date, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_import_schedule_proposal_stamp(uuid, uuid, date, jsonb, jsonb) is
  'Manager-only: issues the fingerprint and digest for a schedule import into a week that does not exist yet. Refuses when the week already exists, so a fresh-week proposal can never be stamped against a live one.';

-- ---------------------------------------------------------------------------
-- 3b. The shift-length ceiling, at the import door
-- ---------------------------------------------------------------------------

-- A shift may not run longer than 16 hours. The rota grid has always refused a
-- typed cell that does, and the preview now refuses a pasted row that does — but
-- the operation list travels through the client between preview and apply, so a
-- rule the client alone applies is a rule that can be posted around. This is the
-- same ceiling, enforced where nothing can get past it.
--
-- Import only, and deliberately so: Build the Week composes its proposal from
-- shifts that already exist and is outside this correction's scope, so its own
-- entry point is left exactly as phase 48 defined it. Both import entry points
-- call this before writing anything, and neither is reachable by Build — a
-- Build proposal always names an existing rota week and goes straight to
-- rpc_apply_build_week_proposal. The rule is therefore unconditional here rather
-- than gated on the source kind, which a caller could otherwise simply relabel.
create or replace function public.rpc_internal_assert_import_shift_lengths(
  p_operations jsonb
)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  longest interval;
begin
  -- One statement, one subtransaction, before anything is locked or written. A
  -- malformed time surfaces as a refusal rather than a raw cast error, matching
  -- how the delegated apply parses the same operations.
  begin
    select max(
      (sig.value->>'endLocal')::time - (sig.value->>'startLocal')::time
      + case
          when (sig.value->>'endLocal')::time <= (sig.value->>'startLocal')::time
          then interval '24 hours'
          else interval '0'
        end)
    into longest
    from jsonb_array_elements(p_operations) as op(value)
    cross join lateral (
      select case when op.value->>'kind' = 'assign-open'
        then op.value->'expected' else op.value->'signature' end
    ) as sig(value);
  exception when others then
    if sqlstate like '22%' then
      raise exception 'A time in this import could not be read. Nothing was imported. Preview it again.'
        using errcode = '55000';
    end if;
    raise;
  end;

  -- A shift ending exactly when it starts lands here as 24 hours, which is what
  -- it would become: the end is reconstructed on the following day.
  if longest > interval '16 hours' then
    raise exception 'A shift in this import is longer than 16 hours. Nothing was imported. Fix the times and preview again.'
      using errcode = '55000';
  end if;
end;
$$;

revoke all on function public.rpc_internal_assert_import_shift_lengths(jsonb)
  from public, anon, authenticated;

comment on function public.rpc_internal_assert_import_shift_lengths(jsonb) is
  'Refuses a schedule import containing any shift longer than 16 hours, measured across midnight for an overnight shift. The same ceiling the rota grid applies to a typed cell. Internal only.';

-- ---------------------------------------------------------------------------
-- 4. rpc_apply_import_to_new_week
-- ---------------------------------------------------------------------------

-- Creates the draft week and applies the reviewed proposal into it, atomically.
--
-- Everything after the week exists is delegated to
-- rpc_apply_build_week_proposal, unchanged: the week lock, the operation
-- parsing, the 500-operation ceiling, the canonical staff lock order, every
-- per-operation rule, and the 'rota_week.built' audit event. This function adds
-- exactly two things — the freshness gates and the week creation.
--
-- ABOUT THE FINGERPRINT PASSED INWARD. The delegated call is handed a
-- fingerprint derived from the week this transaction just created, so that
-- inner comparison is a tautology and is not doing any work. It does not need
-- to: the real staleness check already ran against the absent-week fingerprint
-- BEFORE the insert, and the week cannot have changed since, because this
-- transaction created it and holds its lock. Saying so plainly here is better
-- than leaving a future reader to believe a check is happening that is not.
create or replace function public.rpc_apply_import_to_new_week(
  p_workspace_id uuid,
  p_location_id uuid,
  p_week_start date,
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
  current_fingerprint text;
  new_week_id uuid;
  start_weekday smallint;
  applied jsonb;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_week_start is null or p_location_id is null then
    raise exception 'This import is missing the week it belongs to. Reopen the week and import again.'
      using errcode = '22023';
  end if;

  if p_operations is null or jsonb_typeof(p_operations) <> 'array' then
    raise exception 'The import could not be read. Preview it again.' using errcode = '22023';
  end if;

  select w.rota_start_weekday into start_weekday
  from public.workspaces as w where w.id = p_workspace_id;
  if (extract(isodow from p_week_start)::integer - 1) is distinct from coalesce(start_weekday, 0) then
    raise exception 'That date is not the first day of one of your rota weeks.'
      using errcode = '55000';
  end if;

  -- Integrity first: the operation list is the one that was reviewed. Cheap,
  -- reads no state, and refusing here means nothing was even looked up.
  if public.rpc_internal_build_week_digest(p_operations) is distinct from p_proposal_digest then
    raise exception 'This import was altered before it was applied. Nothing was imported. Preview it again.'
      using errcode = '55000';
  end if;

  -- The rota's shift-length ceiling, for the same reason and in the same place:
  -- it reads no state, so refusing here means nothing was even looked up.
  perform public.rpc_internal_assert_import_shift_lengths(p_operations);

  -- Staleness, BEFORE the insert. Once the week exists this fingerprint is no
  -- longer derivable, so checking it afterwards would check nothing.
  current_fingerprint := public.rpc_internal_import_absent_week_fingerprint(
    p_workspace_id, p_location_id, p_week_start, p_source);

  if current_fingerprint is null then
    raise exception 'That week now exists, so this import is out of date. Nothing was imported. Reopen the week and preview again.'
      using errcode = '55000';
  end if;
  if current_fingerprint is distinct from p_input_fingerprint then
    raise exception 'This workspace changed while the import was open. Nothing was imported. Preview it again.'
      using errcode = '55000';
  end if;

  -- Create the week. RETURNING is the concurrency gate: a null means the row
  -- was already there, which is either another apply that committed first or
  -- this same proposal replayed. Either way the import is refused, and no shift
  -- is written twice.
  insert into public.rota_weeks (workspace_id, location_id, week_start, status)
  values (p_workspace_id, p_location_id, p_week_start, 'draft')
  on conflict (workspace_id, location_id, week_start) do nothing
  returning id into new_week_id;

  if new_week_id is null then
    raise exception 'That week was created while this import was open. Nothing was imported. Reopen the week and preview again.'
      using errcode = '55000';
  end if;

  -- The first lock in the shift-write hierarchy, taken here so this function
  -- holds it before the delegated apply and the per-row triggers ask for it.
  perform 1
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = new_week_id
  for update;

  applied := public.rpc_apply_build_week_proposal(
    p_workspace_id,
    new_week_id,
    public.rpc_internal_build_week_input_fingerprint(p_workspace_id, new_week_id, p_source),
    p_proposal_digest,
    p_source,
    p_operations
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'rota_week.created_for_import', 'rota_week', new_week_id,
    jsonb_build_object(
      'week_start', p_week_start,
      'location_id', p_location_id,
      'source', p_source,
      'operations', jsonb_array_length(p_operations),
      'input_fingerprint', p_input_fingerprint,
      'proposal_digest', p_proposal_digest
    )
  );

  return applied || jsonb_build_object('rota_week_id', new_week_id, 'week_created', true);
end;
$$;

revoke all on function public.rpc_apply_import_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_apply_import_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_apply_import_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb) is
  'Manager-only, atomic: creates a draft rota week that does not exist yet and applies one reviewed schedule import into it via rpc_apply_build_week_proposal. Refuses a stale or concurrent creation. If anything fails, neither the week nor any shift survives.';

-- ---------------------------------------------------------------------------
-- 5. rpc_apply_import_to_existing_week
-- ---------------------------------------------------------------------------

-- The other half of the import door. An import into a week that already exists
-- had been going straight to rpc_apply_build_week_proposal, which is right for
-- everything except the shift-length ceiling: that rule belongs to the import,
-- and leaving this path unguarded would have meant a limit the fresh-week import
-- enforced and its own sibling did not.
--
-- Everything else is delegated unchanged. This adds one check and no state of
-- its own — the week lock, the digest, the fingerprint, every per-operation rule
-- and the audit event all still come from the one apply.
--
-- The manager guard is repeated rather than left to the delegate: a security
-- definer function reachable by any authenticated user is a hole even when what
-- it calls would refuse them.
create or replace function public.rpc_apply_import_to_existing_week(
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
begin
  perform public.rpc_internal_require_manager(p_workspace_id);

  if p_rota_week_id is null then
    raise exception 'This import is missing the week it belongs to. Reopen the week and import again.'
      using errcode = '22023';
  end if;

  if p_operations is null or jsonb_typeof(p_operations) <> 'array' then
    raise exception 'The import could not be read. Preview it again.' using errcode = '22023';
  end if;

  perform public.rpc_internal_assert_import_shift_lengths(p_operations);

  return public.rpc_apply_build_week_proposal(
    p_workspace_id,
    p_rota_week_id,
    p_input_fingerprint,
    p_proposal_digest,
    p_source,
    p_operations
  );
end;
$$;

revoke all on function public.rpc_apply_import_to_existing_week(uuid, uuid, text, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_apply_import_to_existing_week(uuid, uuid, text, text, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_apply_import_to_existing_week(uuid, uuid, text, text, jsonb, jsonb) is
  'Manager-only, atomic: applies one reviewed schedule import into a rota week that already exists. Enforces the 16-hour shift ceiling, then delegates every other rule to rpc_apply_build_week_proposal unchanged.';

notify pgrst, 'reload schema';
