-- Phase 48 two-session LOCK ORDER checks for rpc_apply_build_week_proposal.
--
-- LOCAL ONLY. Run via `bash scripts/concurrency-tests.sh` (supabase_admin —
-- dblink needs a superuser caller on the local stack). Every apply session
-- opens a BEGIN that is never committed; disconnecting aborts it. Dedicated
-- target weeks are committed before the test so remote sessions can see them.
--
-- Phase 47 acquired the per-staff eligibility lock inside the per-operation
-- assignability check, in the order operations arrived, and took `for update`
-- on public.staff_members directly — while every other shift writer reaches
-- staff through rpc_internal_lock_staff_eligibility, which locks memberships
-- first. Phase 48 locks the whole affected set once, up front, through that
-- same helper. Proven here:
--
--   1. THE DETERMINISTIC ONE. Every affected staff member is locked BEFORE the
--      first shift is written. Asserted directly: while the apply is blocked on
--      a staff row held by another session, its backend must hold no
--      RowExclusiveLock on public.shifts. Under phase 47 the first operation's
--      insert had already happened by then, so this test discriminates.
--   2. Once released, the blocked apply completes.
--   3. A Build apply and an ordinary shift assignment serialize safely.
--   4. Two applies on different weeks, submitted with reversed staff ids AND
--      reversed operation ranks, both complete without deadlocking. This one is
--      a regression guard rather than a deterministic reproduction — under
--      phase 47 the deadlock was timing-dependent.
--   5. Every session above was aborted by disconnect, so the committed fixture
--      must be exactly as it was seeded.
--
-- SCOPE. This file owns lock ACQUISITION ORDER only. The identity-link race
-- that converts 40001 into 55000 is a separate concern with a different fixture
-- lifecycle — it commits from a second session and has to repair the seed
-- afterwards — and lives in
-- supabase/tests/concurrency/phase48_build_week_identity_race_tests.sql.
-- Case 5 below asserts on the sessions THIS file opened; that file makes the
-- equivalent assertion about its own.
--
-- Fixtures: seeded Harbour View workspace. Daniel Mitchell (…0002, "Kitchen
-- Supervisor") sorts BELOW Priya Patel (…0003, "Head Chef"); the ordering
-- assertions depend on that.

create extension if not exists dblink;

-- Committed outside the test transaction so the remote sessions can see them.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in ('15000000-0000-4000-8000-000000000481',
                       '15000000-0000-4000-8000-000000000482');
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id in ('15000000-0000-4000-8000-000000000481',
             '15000000-0000-4000-8000-000000000482');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('15000000-0000-4000-8000-000000000481', '10000000-0000-4000-8000-000000000001',
   '11000000-0000-4000-8000-000000000001', '2026-09-14', 'draft'),
  ('15000000-0000-4000-8000-000000000482', '10000000-0000-4000-8000-000000000001',
   '11000000-0000-4000-8000-000000000001', '2026-09-21', 'draft');

-- One open shift per week, each matching the role of the staff member that
-- week's assign-open operation names.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values
  ('17000000-0000-4000-8000-000000000481', '10000000-0000-4000-8000-000000000001',
   '15000000-0000-4000-8000-000000000481', '11000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000002', null,
   '2026-09-14', '2026-09-14 09:00:00+01', '2026-09-14 17:00:00+01', 30, 'Head Chef', 'open'),
  ('17000000-0000-4000-8000-000000000482', '10000000-0000-4000-8000-000000000001',
   '15000000-0000-4000-8000-000000000482', '11000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000002', null,
   '2026-09-21', '2026-09-21 09:00:00+01', '2026-09-21 17:00:00+01', 30, 'Kitchen Supervisor', 'open');

begin;

create temp table p48c_conn (connstr text primary key);
insert into p48c_conn values ('dbname=postgres user=postgres');

create function pg_temp.p48c_wait_for(
  p_app_name text,
  p_condition text,          -- 'blocked' | 'done'
  p_timeout_seconds numeric
)
returns boolean
language plpgsql
as $$
declare
  waited numeric := 0;
  satisfied boolean := false;
begin
  while waited < p_timeout_seconds loop
    perform pg_stat_clear_snapshot();
    if p_condition = 'blocked' then
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name and wait_event_type = 'Lock'
      ) into satisfied;
    else
      -- 'idle in transaction (aborted)' deliberately does NOT match: a session
      -- whose apply errored must never be read as having completed.
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name and state = 'idle in transaction'
      ) into satisfied;
    end if;
    exit when satisfied;
    perform pg_sleep(0.1);
    waited := waited + 0.1;
  end loop;
  return satisfied;
end;
$$;

-- True when the named session's transaction has been aborted — which is how a
-- deadlock victim presents, since the deadlock detector cancels its statement.
create function pg_temp.p48c_aborted(p_app_name text)
returns boolean
language sql
as $$
  select exists (
    select 1 from pg_stat_activity
    where application_name = p_app_name and state = 'idle in transaction (aborted)'
  );
$$;

-- True when the named session's backend has already taken a write lock on
-- public.shifts — i.e. it has inserted or updated at least one shift.
create function pg_temp.p48c_has_written_shifts(p_app_name text)
returns boolean
language sql
as $$
  select exists (
    select 1
    from pg_stat_activity as activity
    join pg_locks as lock on lock.pid = activity.pid
    where activity.application_name = p_app_name
      and lock.locktype = 'relation'
      and lock.relation = 'public.shifts'::regclass
      and lock.mode = 'RowExclusiveLock'
      and lock.granted
  );
$$;

create function pg_temp.p48c_apply_sql(p_week uuid, p_ops jsonb, p_stamp jsonb)
returns text language sql as $$
  select format($f$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_apply_build_week_proposal(
      '10000000-0000-4000-8000-000000000001', %L, %L, %L,
      '{"kind":"current-week"}'::jsonb, %L::jsonb);
  $f$, p_week, p_stamp->>'fingerprint', p_stamp->>'digest', p_ops::text);
$$;

create function pg_temp.p48c_assign_op(p_staff uuid, p_role text, p_date text)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'kind', 'create-assigned', 'roleName', p_role, 'staffId', p_staff, 'reason', 'fixture',
    'signature', jsonb_build_object(
      'workDate', p_date, 'startLocal', '09:00', 'endLocal', '17:00',
      'overnight', false, 'roleKey', lower(p_role),
      'departmentId', '12000000-0000-4000-8000-000000000002',
      'locationId', '11000000-0000-4000-8000-000000000001',
      'breakMinutes', 30));
$$;

create function pg_temp.p48c_open_op(p_staff uuid, p_role text, p_date text, p_shift uuid)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'kind', 'assign-open', 'staffId', p_staff, 'shiftId', p_shift, 'reason', 'fixture',
    'expected', jsonb_build_object(
      'workDate', p_date, 'startLocal', '09:00', 'endLocal', '17:00',
      'overnight', false, 'roleKey', lower(p_role),
      'departmentId', '12000000-0000-4000-8000-000000000002',
      'locationId', '11000000-0000-4000-8000-000000000001',
      'breakMinutes', 30));
$$;

do $$
declare
  low_staff  uuid := '14000000-0000-4000-8000-000000000002';  -- Kitchen Supervisor
  high_staff uuid := '14000000-0000-4000-8000-000000000003';  -- Head Chef
  week_x uuid := '15000000-0000-4000-8000-000000000481';
  week_y uuid := '15000000-0000-4000-8000-000000000482';
  ops_x jsonb;
  ops_y jsonb;
  stamp_x jsonb;
  stamp_y jsonb;
  blocked boolean;
  done boolean;
  wrote_early boolean;
  waited numeric;
  first_done text;
  second_app text;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

  -- -------------------------------------------------------------------------
  -- 1 & 2. Locks are taken before any write, and the blocked apply resolves.
  --
  -- The proposal assigns the LOW staff id first and the HIGH one second. A
  -- second session holds the HIGH staff row, so the apply must block. The
  -- question is *where*: phase 48 blocks during the bulk lock, before writing
  -- anything; phase 47 blocked after the first operation's insert.
  -- -------------------------------------------------------------------------
  ops_x := jsonb_build_array(
    pg_temp.p48c_assign_op(low_staff,  'Kitchen Supervisor', '2026-09-15'),
    pg_temp.p48c_assign_op(high_staff, 'Head Chef',          '2026-09-16'));
  stamp_x := public.rpc_build_week_proposal_stamp(
    '10000000-0000-4000-8000-000000000001', week_x, '{"kind":"current-week"}'::jsonb, ops_x);

  -- Holder session: takes the HIGH staff row and sits on it.
  perform dblink_connect('p48c_hold', (select connstr from p48c_conn) || ' application_name=p48c_hold');
  perform dblink_send_query('p48c_hold', format($h$
    begin;
    select id from public.staff_members where id = %L for update;
  $h$, high_staff));
  if not pg_temp.p48c_wait_for('p48c_hold', 'done', 15) then
    raise exception 'FAIL: the holder session never acquired the staff row';
  end if;

  perform dblink_connect('p48c_a', (select connstr from p48c_conn) || ' application_name=p48c_a');
  perform dblink_send_query('p48c_a', pg_temp.p48c_apply_sql(week_x, ops_x, stamp_x));

  blocked := pg_temp.p48c_wait_for('p48c_a', 'blocked', 15);
  if not blocked then
    raise exception 'FAIL: the apply did not block on the held staff row';
  end if;

  wrote_early := pg_temp.p48c_has_written_shifts('p48c_a');
  if wrote_early then
    raise exception
      'FAIL: the apply wrote a shift before it had locked every affected staff member';
  end if;
  raise notice 'PASS: every affected staff member is locked before the first shift write';

  perform dblink_disconnect('p48c_hold');
  done := pg_temp.p48c_wait_for('p48c_a', 'done', 15);
  if not done then
    raise exception 'FAIL: the blocked apply did not resolve after the holder released';
  end if;
  raise notice 'PASS: the blocked apply resolves once the staff row is released';
  perform dblink_disconnect('p48c_a');

  -- -------------------------------------------------------------------------
  -- 3. Build apply versus an ordinary shift assignment.
  --
  -- The ordinary writer reaches staff through the same protocol helper, via the
  -- shifts triggers. Both orders must serialize rather than deadlock.
  -- -------------------------------------------------------------------------
  perform dblink_connect('p48c_edit', (select connstr from p48c_conn) || ' application_name=p48c_edit');
  perform dblink_send_query('p48c_edit', format($e$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    update public.shifts
    set staff_member_id = %L, assignment_status = 'scheduled'
    where id = %L;
  $e$, high_staff, '17000000-0000-4000-8000-000000000481'));
  if not pg_temp.p48c_wait_for('p48c_edit', 'done', 15) then
    raise exception 'FAIL: the ordinary shift assignment did not complete';
  end if;

  perform dblink_connect('p48c_b', (select connstr from p48c_conn) || ' application_name=p48c_b');
  perform dblink_send_query('p48c_b', pg_temp.p48c_apply_sql(week_x, ops_x, stamp_x));

  if not pg_temp.p48c_wait_for('p48c_b', 'blocked', 15) then
    raise exception 'FAIL: the apply did not serialize behind the ordinary shift write';
  end if;
  raise notice 'PASS: a Build apply serializes behind an ordinary shift assignment';

  perform dblink_disconnect('p48c_edit');
  if not pg_temp.p48c_wait_for('p48c_b', 'done', 15) then
    raise exception 'FAIL: the apply did not resolve after the ordinary write released';
  end if;
  raise notice 'PASS: it resolves cleanly once the ordinary write releases';
  perform dblink_disconnect('p48c_b');

  -- -------------------------------------------------------------------------
  -- 4. Two applies on different weeks, reversed staff ids AND reversed ranks.
  --
  --   week X: assign-open(HIGH) then create-assigned(LOW)   -> encounters HIGH, LOW
  --   week Y: assign-open(LOW)  then create-assigned(HIGH)  -> encounters LOW, HIGH
  --
  -- The planner emits assign-open operations before creations, so this is the
  -- shape two genuine proposals can take. Encounter order is opposed; canonical
  -- lock order is not. Both must complete.
  -- -------------------------------------------------------------------------
  ops_x := jsonb_build_array(
    pg_temp.p48c_open_op(high_staff, 'Head Chef', '2026-09-14', '17000000-0000-4000-8000-000000000481'),
    pg_temp.p48c_assign_op(low_staff, 'Kitchen Supervisor', '2026-09-15'));
  ops_y := jsonb_build_array(
    pg_temp.p48c_open_op(low_staff, 'Kitchen Supervisor', '2026-09-21', '17000000-0000-4000-8000-000000000482'),
    pg_temp.p48c_assign_op(high_staff, 'Head Chef', '2026-09-22'));

  stamp_x := public.rpc_build_week_proposal_stamp(
    '10000000-0000-4000-8000-000000000001', week_x, '{"kind":"current-week"}'::jsonb, ops_x);
  stamp_y := public.rpc_build_week_proposal_stamp(
    '10000000-0000-4000-8000-000000000001', week_y, '{"kind":"current-week"}'::jsonb, ops_y);

  perform dblink_connect('p48c_x', (select connstr from p48c_conn) || ' application_name=p48c_x');
  perform dblink_connect('p48c_y', (select connstr from p48c_conn) || ' application_name=p48c_y');
  perform dblink_send_query('p48c_x', pg_temp.p48c_apply_sql(week_x, ops_x, stamp_x));
  perform dblink_send_query('p48c_y', pg_temp.p48c_apply_sql(week_y, ops_y, stamp_y));

  -- They share the whole affected staff set, so they serialize: whichever
  -- acquires first runs to completion and — because neither session ever
  -- commits — keeps its locks until it is disconnected. Serializing is the
  -- correct outcome. A lock-order inversion would instead show up as one
  -- session being chosen as a deadlock victim and landing in the aborted state.
  waited := 0;
  first_done := null;
  while waited < 20 and first_done is null loop
    perform pg_stat_clear_snapshot();
    if pg_temp.p48c_aborted('p48c_x') or pg_temp.p48c_aborted('p48c_y') then
      raise exception 'FAIL: a cross-week apply was aborted — deadlock or refusal, not serialization';
    end if;
    if pg_temp.p48c_wait_for('p48c_x', 'done', 0.1) then
      first_done := 'p48c_x';
    elsif pg_temp.p48c_wait_for('p48c_y', 'done', 0.1) then
      first_done := 'p48c_y';
    end if;
    waited := waited + 0.2;
  end loop;

  if first_done is null then
    raise exception 'FAIL: neither cross-week apply completed within the timeout';
  end if;

  second_app := case when first_done = 'p48c_x' then 'p48c_y' else 'p48c_x' end;
  if pg_temp.p48c_aborted(second_app) then
    raise exception 'FAIL: the second cross-week apply aborted while the first held its locks';
  end if;

  -- Release the winner; the other must then run to completion rather than die.
  perform dblink_disconnect(first_done);
  if not pg_temp.p48c_wait_for(second_app, 'done', 20) then
    raise exception 'FAIL: the second cross-week apply (%) did not complete after release', second_app;
  end if;
  if pg_temp.p48c_aborted(second_app) then
    raise exception 'FAIL: the second cross-week apply aborted after the first released';
  end if;
  raise notice
    'PASS: cross-week applies with opposed staff and rank order serialize and both complete';

  perform dblink_disconnect(second_app);

  -- -------------------------------------------------------------------------
  -- 5. Nothing any of those sessions did survived: they were all aborted by
  --    disconnect, so the committed fixture must be exactly as it was seeded.
  -- -------------------------------------------------------------------------
  if exists (
    select 1 from public.shifts
    where rota_week_id in (week_x, week_y) and assignment_status <> 'open'
  ) then
    raise exception 'FAIL: an aborted apply left an assignment behind';
  end if;
  if (select count(*) from public.shifts where rota_week_id in (week_x, week_y)) <> 2 then
    raise exception 'FAIL: the fixture open shifts were added to or removed';
  end if;
  raise notice 'PASS: every aborted session left the committed fixture untouched';
end
$$;

rollback;

-- Remove the committed fixture weeks and their shifts. Nothing in this file
-- commits from a second session, so there is nothing else to repair.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in ('15000000-0000-4000-8000-000000000481',
                       '15000000-0000-4000-8000-000000000482');
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id in ('15000000-0000-4000-8000-000000000481',
             '15000000-0000-4000-8000-000000000482');
