-- Phase 31 two-session concurrency checks for the eligibility lock protocol.
--
-- LOCAL ONLY. Run via `bash scripts/concurrency-tests.sh`, which executes
-- this file as supabase_admin — dblink needs a superuser caller because the
-- local stack trusts loopback connections without a password. It lives
-- outside the default suite's glob (supabase/tests/*.sql), which runs as the
-- non-superuser postgres role.
--
-- A real second PostgreSQL session (dblink, async) attempts eligibility writes
-- while this session holds the staff_members row lock that publication
-- preflight holds while it reads eligibility facts. The protocol demands:
--   * a leave decision for that person BLOCKS until the lock is released;
--   * a draft shift assignment for that person BLOCKS the same way;
--   * work about an UNRELATED person proceeds — locking is per staff member,
--     never global.
--
-- Both sessions roll back everything: the main transaction ends in ROLLBACK
-- and every dblink session opens an explicit BEGIN that is never committed —
-- disconnecting (or this backend exiting on failure) aborts it. Remote
-- sessions are identified via application_name; blocked-ness is asserted from
-- pg_stat_activity (wait_event_type = 'Lock'), completion from the remote
-- session going idle-in-transaction without error.

begin;

create extension if not exists dblink;

-- Local socket as the postgres role; every remote session immediately drops
-- to the authenticated role with a manager JWT, exactly like a PostgREST call.
create temp table p31_conn (connstr text primary key);
insert into p31_conn values ('dbname=postgres user=postgres');

-- Helper: wait until the named remote session reaches (or leaves) a state.
create function pg_temp.p31_wait_for(
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
    -- Backend-status views freeze on first read inside a transaction; clear
    -- the snapshot so every poll observes the live state.
    perform pg_stat_clear_snapshot();
    if p_condition = 'blocked' then
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name
          and wait_event_type = 'Lock'
      ) into satisfied;
    else
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name
          and state = 'idle in transaction'
      ) into satisfied;
    end if;
    exit when satisfied;
    perform pg_sleep(0.1);
    waited := waited + 0.1;
  end loop;
  return satisfied;
end;
$$;

-- --------------------------------------------------------------------------
-- 1. Hold Sophie's staff eligibility lock (what publish preflight holds while
--    it reads her leave/overlap facts). Sophie: 14…01; her pending leave
--    request: 19…01; manager persona: ab…01 (seeded, committed, active).
-- --------------------------------------------------------------------------

select id from public.staff_members
where id = '14000000-0000-4000-8000-000000000001' for update;

do $$
declare blocked boolean;
begin
  perform dblink_connect('p31_leave',
    (select connstr from p31_conn) || ' application_name=p31_leave');
  perform dblink_send_query('p31_leave', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_decide_leave_request(
      '10000000-0000-4000-8000-000000000001',
      '19000000-0000-4000-8000-000000000001',
      'approved', null);
  $q$);

  blocked := pg_temp.p31_wait_for('p31_leave', 'blocked', 10);
  if not blocked then
    raise exception 'FAIL: leave approval did not wait for the staff eligibility lock';
  end if;
  raise notice 'PASS: leave approval blocks on the staff eligibility lock';
end $$;

do $$
declare blocked boolean;
begin
  perform dblink_connect('p31_shift',
    (select connstr from p31_conn) || ' application_name=p31_shift');
  perform dblink_send_query('p31_shift', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    ) values (
      '10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002',
      '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001',
      '14000000-0000-4000-8000-000000000001', '2026-06-17',
      '2026-06-17T08:00:00+01:00', '2026-06-17T16:00:00+01:00', 30,
      'FOH Supervisor', 'scheduled');
  $q$);

  blocked := pg_temp.p31_wait_for('p31_shift', 'blocked', 10);
  if not blocked then
    raise exception 'FAIL: draft shift assignment did not wait for the staff eligibility lock';
  end if;
  raise notice 'PASS: draft shift assignment blocks on the staff eligibility lock';
end $$;

-- --------------------------------------------------------------------------
-- 2. Unrelated staff are never serialised: while Sophie's lock is still held,
--    reopening OLIVIA's decided leave (19…02, staff 14…05) must complete.
-- --------------------------------------------------------------------------

do $$
declare done boolean;
begin
  perform dblink_connect('p31_other',
    (select connstr from p31_conn) || ' application_name=p31_other');
  perform dblink_send_query('p31_other', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_decide_leave_request(
      '10000000-0000-4000-8000-000000000001',
      '19000000-0000-4000-8000-000000000002',
      'pending', null);
  $q$);

  done := pg_temp.p31_wait_for('p31_other', 'done', 10);
  if not done then
    raise exception 'FAIL: an unrelated staff member''s leave decision was serialised behind the held lock';
  end if;
  if exists (
    select 1 from pg_stat_activity
    where application_name = 'p31_other'
      and state = 'idle in transaction (aborted)'
  ) then
    raise exception 'FAIL: the unrelated leave decision errored instead of completing';
  end if;
  raise notice 'PASS: unrelated staff operations are not serialised by the protocol';
  perform dblink_disconnect('p31_other');
end $$;

-- --------------------------------------------------------------------------
-- 3. The blocked writers are still queued (not failed, not slipped past)
--    while the lock is held. Row locks survive savepoint rollbacks, so the
--    hold ends only at the final ROLLBACK; the orphaned remote transactions
--    then run to completion against a closed client socket and abort — no
--    write from either session ever commits.
-- --------------------------------------------------------------------------
do $$
begin
  perform pg_stat_clear_snapshot();
  if not exists (
    select 1 from pg_stat_activity
    where application_name = 'p31_leave' and wait_event_type = 'Lock'
  ) then
    raise exception 'FAIL: the blocked leave approval slipped past the held lock';
  end if;
  if not exists (
    select 1 from pg_stat_activity
    where application_name = 'p31_shift' and wait_event_type = 'Lock'
  ) then
    raise exception 'FAIL: the blocked shift assignment slipped past the held lock';
  end if;
  raise notice 'PASS: blocked writers stay queued until the eligibility lock is released';
  perform dblink_disconnect('p31_leave');
  perform dblink_disconnect('p31_shift');
end $$;

rollback;
