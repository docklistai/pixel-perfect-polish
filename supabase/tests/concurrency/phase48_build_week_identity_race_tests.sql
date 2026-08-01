-- Phase 48 IDENTITY-LINK RACE check for rpc_apply_build_week_proposal.
--
-- LOCAL ONLY. Run via `bash scripts/concurrency-tests.sh` (supabase_admin —
-- dblink needs a superuser caller on the local stack). A dedicated target week
-- is committed before the test so the remote sessions can see it.
--
-- SCOPE. Lock ACQUISITION ORDER is proven in
-- supabase/tests/concurrency/phase48_build_week_lock_order_tests.sql. This file
-- owns the one path that can still raise a serialization failure, because it
-- has a fixture lifecycle the other file does not: the race is driven by a
-- second session that COMMITS, so the seeded identity link has to be repaired
-- afterwards and the repair has to be proven. Its week is deliberately its own
-- id AND its own week_start, so the two suites never touch a shared row.
--
-- rpc_internal_lock_staff_eligibility reads each staff member's membership
-- link, locks those memberships, locks the staff rows, then re-reads the links
-- — and raises 40001 if they moved in between. rpc_apply_build_week_proposal
-- catches that and re-raises 55000, because PostgREST retries 40001 to a
-- gateway timeout and replaces its message. Proven here:
--
--   1. The race is driven deterministically rather than hoped for. A holder
--      session takes the HIGH staff member's membership row, so the apply parks
--      inside the helper between its two membership reads. While it is parked
--      the holder clears that staff member's membership link and commits, so
--      the helper's second read cannot match its first.
--   2. The refusal surfaces as 55000 with the exact wrapped message — never as
--      40001. The message is pinned because a bare 55000 could have come from
--      any of the RPC's other refusals, which would make the assertion look
--      right for the wrong reason.
--   3. The refusal wrote nothing.
--   4. The committed fixture is unchanged and the seeded identity link is back.
--
-- Fixtures: seeded Harbour View workspace. Daniel Mitchell (…0002, "Kitchen
-- Supervisor") sorts BELOW Priya Patel (…0003, "Head Chef"), so the HIGH staff
-- member is the second one the helper reaches.

create extension if not exists dblink;

-- Committed outside the test transaction so the remote sessions can see it.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id = '15000000-0000-4000-8000-000000000483';
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '15000000-0000-4000-8000-000000000483';

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('15000000-0000-4000-8000-000000000483', '10000000-0000-4000-8000-000000000001',
   '11000000-0000-4000-8000-000000000001', '2026-09-28', 'draft');

-- Committed so the async session can call it. Returns the refusal SQLSTATE
-- instead of raising, which is the only way to read the code back out of a
-- session that had to be driven asynchronously. Dropped again at the end.
create or replace function public.p48r_try_apply(
  p_week uuid, p_fingerprint text, p_digest text, p_ops jsonb)
returns text
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  perform public.rpc_apply_build_week_proposal(
    '10000000-0000-4000-8000-000000000001', p_week, p_fingerprint, p_digest,
    '{"kind":"current-week"}'::jsonb, p_ops);
  return 'APPLIED';
exception when others then
  -- The message matters as much as the code: a bare '55000' could have come
  -- from any of the RPC's other refusals, which would make the assertion look
  -- right for the wrong reason.
  return sqlstate || '|' || sqlerrm;
end;
$$;

begin;

create temp table p48r_conn (connstr text primary key);
insert into p48r_conn values ('dbname=postgres user=postgres');

create function pg_temp.p48r_wait_for(
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

create function pg_temp.p48r_assign_op(p_staff uuid, p_role text, p_date text)
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

do $$
declare
  low_staff  uuid := '14000000-0000-4000-8000-000000000002';  -- Kitchen Supervisor
  high_staff uuid := '14000000-0000-4000-8000-000000000003';  -- Head Chef
  week_r uuid := '15000000-0000-4000-8000-000000000483';
  ops_r jsonb;
  stamp_r jsonb;
  high_membership uuid;
  observed_state text;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

  ops_r := jsonb_build_array(
    pg_temp.p48r_assign_op(low_staff,  'Kitchen Supervisor', '2026-09-30'),
    pg_temp.p48r_assign_op(high_staff, 'Head Chef',          '2026-10-01'));
  stamp_r := public.rpc_build_week_proposal_stamp(
    '10000000-0000-4000-8000-000000000001', week_r, '{"kind":"current-week"}'::jsonb, ops_r);

  select membership_id into high_membership from public.staff_members where id = high_staff;
  if high_membership is null then
    raise exception 'FAIL: fixture precondition — the HIGH staff member has no membership link';
  end if;

  -- Synchronous, unlike an async holder: this connection is reused below, and
  -- an unconsumed async result would leave it busy.
  perform dblink_connect('p48r_hold', (select connstr from p48r_conn) || ' application_name=p48r_hold');
  perform dblink_exec('p48r_hold', 'begin;');
  perform 1 from dblink('p48r_hold', format(
    'select id from public.workspace_memberships where id = %L for update;', high_membership))
    as held(id uuid);

  perform dblink_connect('p48r_e', (select connstr from p48r_conn) || ' application_name=p48r_e');
  perform dblink_send_query('p48r_e', format(
    'select public.p48r_try_apply(%L, %L, %L, %L::jsonb);',
    week_r, stamp_r->>'fingerprint', stamp_r->>'digest', ops_r::text));

  if not pg_temp.p48r_wait_for('p48r_e', 'blocked', 15) then
    raise exception 'FAIL: the apply did not block while acquiring memberships';
  end if;

  -- Move the identity link out from under the parked apply, and release it.
  -- This commits from the other session, so the restore has to happen after the
  -- rollback below as well — see the cleanup at the end of this file.
  perform dblink_exec('p48r_hold', format(
    'update public.staff_members set membership_id = null where id = %L;', high_staff));
  perform dblink_exec('p48r_hold', 'commit;');

  select result into observed_state
  from dblink_get_result('p48r_e') as t(result text);
  perform dblink_disconnect('p48r_e');

  -- Put the seeded identity link back BEFORE asserting anything. That session
  -- is in autocommit now, so this commits immediately — which matters because
  -- psql runs with ON_ERROR_STOP and a failing assertion below would otherwise
  -- skip the cleanup at the end of this file and leave the seed damaged.
  perform dblink_exec('p48r_hold', format(
    'update public.staff_members set membership_id = %L where id = %L;',
    high_membership, high_staff));
  perform dblink_disconnect('p48r_hold');

  -- Pinning the message proves the refusal came from the 40001 handler and not
  -- from staleness, a digest mismatch or any other 55000 the RPC can raise.
  if observed_state is distinct from
     '55000|Someone in this proposal changed while it was being applied. Build it again.' then
    raise exception
      'FAIL: a concurrent identity change surfaced as [%], not the wrapped 40001 refusal',
      coalesce(observed_state, '<null>');
  end if;
  if exists (select 1 from public.shifts
             where rota_week_id = week_r and shift_date in ('2026-09-30', '2026-10-01')) then
    raise exception 'FAIL: the 40001 refusal wrote shifts';
  end if;
  raise notice
    'PASS: a concurrent identity change is refused as 55000, never 40001, writing nothing';

  -- The refused apply was aborted, so the committed fixture week must still be
  -- exactly as it was seeded: empty.
  if (select count(*) from public.shifts where rota_week_id = week_r) <> 0 then
    raise exception 'FAIL: the aborted apply left shifts behind in the fixture week';
  end if;
  raise notice 'PASS: the aborted session left the committed fixture untouched';
end
$$;

rollback;

-- Remove the committed fixture week, its shifts and the outcome helper.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id = '15000000-0000-4000-8000-000000000483';
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '15000000-0000-4000-8000-000000000483';
drop function if exists public.p48r_try_apply(uuid, text, text, jsonb);

-- The test clears a seeded staff member's membership link from a SECOND
-- session, which commits. The test transaction's rollback cannot undo that, so
-- the restore has to live out here as well.
update public.staff_members
set membership_id = '13000000-0000-4000-8000-000000000004'
where id = '14000000-0000-4000-8000-000000000003'
  and workspace_id = '10000000-0000-4000-8000-000000000001'
  and membership_id is null;

-- Prove the seed really is back, and that the committed helper is gone: a
-- mid-test abort would otherwise leave every later suite running against an
-- altered fixture, or leave a test-only function in the schema.
do $$
begin
  if exists (
    select 1 from public.staff_members
    where workspace_id = '10000000-0000-4000-8000-000000000001' and membership_id is null
  ) then
    raise exception
      'FAIL: a seeded staff member was left without its membership link — reset the local database';
  end if;
  if to_regprocedure('public.p48r_try_apply(uuid, text, text, jsonb)') is not null then
    raise exception 'FAIL: the temporary outcome helper was left behind in the schema';
  end if;
  raise notice 'PASS: the seeded identity link is restored and no test helper remains';
end
$$;
