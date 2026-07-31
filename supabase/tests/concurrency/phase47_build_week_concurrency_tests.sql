-- Phase 47 two-session concurrency checks for rpc_apply_build_week_proposal.
--
-- LOCAL ONLY. Run via `bash scripts/concurrency-tests.sh` (supabase_admin —
-- dblink needs a superuser caller on the local stack). Every apply session opens
-- a BEGIN that is never committed; disconnecting aborts it. A dedicated empty
-- target-week row is committed before the test so remote sessions can see it.
--
-- Asserts the Build apply participates in the phase 31 lock protocol, and that
-- the fingerprint is what stops a second manager applying a proposal built
-- before the first one landed:
--   1. an uncontended apply runs to completion;
--   2. a concurrent apply to the SAME week blocks until the first releases —
--      no interleaved partial state;
--   3. once released, the blocked apply completes deterministically;
--   4. a proposal whose fingerprint was issued before another apply committed
--      is refused as stale, with nothing written.
--
-- Fixtures: seeded Harbour View workspace, dedicated week 2026-09-07.

create extension if not exists dblink;

-- Committed outside the test transaction so the remote sessions can see it.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id = '15000000-0000-4000-8000-000000000047';
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '15000000-0000-4000-8000-000000000047';
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values (
  '15000000-0000-4000-8000-000000000047',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '2026-09-07', 'draft'
);

begin;

create temp table p47c_conn (connstr text primary key);
insert into p47c_conn values ('dbname=postgres user=postgres');

create function pg_temp.p47c_wait_for(
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

-- The proposal both sessions submit: one open Chef shift on 2026-09-08.
create function pg_temp.p47c_ops() returns jsonb language sql immutable as $ops$
  select jsonb_build_array(jsonb_build_object(
    'kind', 'create-open',
    'roleName', 'Chef',
    'reason', 'concurrency fixture',
    'signature', jsonb_build_object(
      'workDate', '2026-09-08', 'startLocal', '09:00', 'endLocal', '17:00',
      'overnight', false, 'roleKey', 'chef',
      'departmentId', '12000000-0000-4000-8000-000000000002',
      'locationId', '11000000-0000-4000-8000-000000000001',
      'breakMinutes', 30)));
$ops$;

do $$
declare
  stamp jsonb;
  apply_sql text;
  done boolean;
  blocked boolean;
  stale_refused boolean := false;
  shift_count integer;
begin
  -- Issue one genuine stamp; both sessions use it, exactly as two managers who
  -- each opened the drawer before either applied.
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  stamp := public.rpc_build_week_proposal_stamp(
    '10000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000047',
    '{"kind":"current-week"}'::jsonb,
    pg_temp.p47c_ops());

  apply_sql := format($f$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_apply_build_week_proposal(
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000047',
      %L, %L, '{"kind":"current-week"}'::jsonb, %L::jsonb);
  $f$, stamp->>'fingerprint', stamp->>'digest', pg_temp.p47c_ops()::text);

  -- 1. Uncontended apply completes and holds its locks.
  perform dblink_connect('p47c_a', (select connstr from p47c_conn) || ' application_name=p47c_a');
  perform dblink_send_query('p47c_a', apply_sql);
  done := pg_temp.p47c_wait_for('p47c_a', 'done', 15);
  if not done then
    raise exception 'FAIL: uncontended Build apply did not complete';
  end if;
  raise notice 'PASS: uncontended Build apply runs to completion';

  -- 2. A second apply to the same week blocks on the week row.
  perform dblink_connect('p47c_b', (select connstr from p47c_conn) || ' application_name=p47c_b');
  perform dblink_send_query('p47c_b', apply_sql);
  blocked := pg_temp.p47c_wait_for('p47c_b', 'blocked', 15);
  if not blocked then
    raise exception 'FAIL: concurrent Build apply to the same week did not block';
  end if;
  raise notice 'PASS: a concurrent apply to the same week blocks on the week lock';

  -- 3. Release the first session; the blocked one must then resolve.
  perform dblink_disconnect('p47c_a');
  done := pg_temp.p47c_wait_for('p47c_b', 'done', 15);
  if not done then
    raise exception 'FAIL: blocked apply did not resolve after the first released';
  end if;
  raise notice 'PASS: the blocked apply resolves deterministically once released';
  perform dblink_disconnect('p47c_b');

  -- 4. A stamp issued before a committed apply is refused as stale, and writes
  --    nothing. Both sessions above were aborted, so the week is still empty and
  --    the stamp is still valid; commit one apply for real, then reuse it.
  perform public.rpc_apply_build_week_proposal(
    '10000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000047',
    stamp->>'fingerprint', stamp->>'digest',
    '{"kind":"current-week"}'::jsonb, pg_temp.p47c_ops());

  begin
    perform public.rpc_apply_build_week_proposal(
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000047',
      stamp->>'fingerprint', stamp->>'digest',
      '{"kind":"current-week"}'::jsonb, pg_temp.p47c_ops());
  exception when sqlstate '55000' then stale_refused := true;
  end;

  if not stale_refused then
    raise exception 'FAIL: a proposal built before the first apply was applied again';
  end if;

  select count(*) into shift_count from public.shifts
  where rota_week_id = '15000000-0000-4000-8000-000000000047';
  if shift_count <> 1 then
    raise exception 'FAIL: the stale apply wrote rows (% shifts, expected 1)', shift_count;
  end if;
  raise notice 'PASS: a proposal issued before another apply is refused as stale, writing nothing';
end $$;

rollback;

-- Remove the committed fixture week.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id = '15000000-0000-4000-8000-000000000047';
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '15000000-0000-4000-8000-000000000047';
