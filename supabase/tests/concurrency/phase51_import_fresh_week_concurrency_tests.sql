-- Phase 51 two-session concurrency checks for rpc_apply_import_to_new_week.
--
-- LOCAL ONLY. Run via `bash scripts/concurrency-tests.sh` (supabase_admin —
-- dblink needs a superuser caller on the local stack).
--
-- The property under test is the one a fresh-week import lives or dies by:
-- two managers importing into the same empty week must produce ONE week and
-- ONE set of shifts, and the loser must be told, not silently merged.
--
--   1. a second concurrent apply BLOCKS on the week's unique key rather than
--      racing past it — the `on conflict do nothing` insert is the gate;
--   2. once the winner commits, the loser is REFUSED with 55000 and writes
--      nothing, rather than adding a second copy of every shift into the week
--      the winner just made;
--   3. a proposal stamped before an unrelated session created the week is
--      refused as stale for the same reason.
--
-- Fixtures: seeded Harbour View (Monday-start). The target week 2026-09-07 is
-- a Monday with no rota_weeks row, and is removed again afterwards — the main
-- transaction rolls back, but session (2) commits by design.

create extension if not exists dblink;

-- Any leftover from an interrupted run. The remote sessions commit, so this
-- cannot rely on the transaction rollback below.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in (
    select id from public.rota_weeks
    where workspace_id = '10000000-0000-4000-8000-000000000001'
      and week_start = '2026-09-07');
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and week_start = '2026-09-07';

create temp table p51c_conn (connstr text primary key);
insert into p51c_conn values ('dbname=postgres user=postgres');

create function pg_temp.p51c_wait_for(
  p_app_name text,
  p_condition text,          -- 'blocked' | 'done' | 'idle'
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
    elsif p_condition = 'idle' then
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name and state = 'idle'
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

-- dblink_send_query sends a whole batch, and libpq hands back one result per
-- statement in it. Every one has to be read before the connection will accept
-- another query, so this drains them and reports whether the batch failed.
create function pg_temp.p51c_drain(p_conn text, out failed boolean, out message text)
language plpgsql
as $$
declare
  rows_returned integer;
begin
  failed := false;
  message := '';
  for i in 1..12 loop
    begin
      select count(*) into rows_returned from dblink_get_result(p_conn) as t(x text);
    exception when others then
      failed := true;
      message := sqlerrm;
      exit;
    end;
    exit when rows_returned = 0;
  end loop;
end;
$$;

-- The proposal both sessions submit. Two open Front-of-House shifts, so no
-- staff eligibility is involved and the only contention is the week itself.
create function pg_temp.p51c_operations()
returns jsonb language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Waiter', 'reason', 'row 1',
      'signature', jsonb_build_object(
        'workDate', '2026-09-07', 'startLocal', '09:00', 'endLocal', '17:00',
        'overnight', false, 'roleKey', 'waiter',
        'departmentId', '12000000-0000-4000-8000-000000000001',
        'locationId', '11000000-0000-4000-8000-000000000001',
        'breakMinutes', 30)),
    jsonb_build_object('kind', 'create-open', 'roleName', 'Waiter', 'reason', 'row 2',
      'signature', jsonb_build_object(
        'workDate', '2026-09-08', 'startLocal', '12:00', 'endLocal', '20:00',
        'overnight', false, 'roleKey', 'waiter',
        'departmentId', '12000000-0000-4000-8000-000000000001',
        'locationId', '11000000-0000-4000-8000-000000000001',
        'breakMinutes', 30)));
$$;

create function pg_temp.p51c_source()
returns jsonb language sql immutable as $$
  select jsonb_build_object('kind', 'headed-import', 'id', null,
    'contentVersion', 'rows:2', 'plannerRuleVersion', 'build-week/1');
$$;

-- The remote statement both sessions run. Written once so the two are provably
-- the same proposal rather than two similar ones.
create function pg_temp.p51c_apply_sql()
returns text language sql stable as $$
  select format($f$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_apply_import_to_new_week(
      '10000000-0000-4000-8000-000000000001',
      '11000000-0000-4000-8000-000000000001',
      '2026-09-07',
      (public.rpc_import_schedule_proposal_stamp(
        '10000000-0000-4000-8000-000000000001',
        '11000000-0000-4000-8000-000000000001',
        '2026-09-07', %L::jsonb, %L::jsonb)->>'fingerprint'),
      md5(%L),
      %L::jsonb, %L::jsonb);
  $f$,
  pg_temp.p51c_source()::text, pg_temp.p51c_operations()::text,
  pg_temp.p51c_operations()::text,
  pg_temp.p51c_source()::text, pg_temp.p51c_operations()::text);
$$;

-- --------------------------------------------------------------------------
-- 1 + 2. The loser blocks on the week's unique key, then is refused outright.
-- --------------------------------------------------------------------------
do $$
declare
  blocked boolean;
  done boolean;
  loser_refused boolean := false;
  loser_message text := '';
  winner_failed boolean := false;
  week_count integer;
  shift_count integer;
begin
  perform dblink_connect('p51c_a',
    (select connstr from p51c_conn) || ' application_name=p51c_a');
  perform dblink_send_query('p51c_a', pg_temp.p51c_apply_sql());

  done := pg_temp.p51c_wait_for('p51c_a', 'done', 15);
  if not done then
    raise exception 'FAIL: the first fresh-week import did not complete';
  end if;
  raise notice 'PASS: an uncontended fresh-week import runs to completion';

  perform dblink_connect('p51c_b',
    (select connstr from p51c_conn) || ' application_name=p51c_b');
  perform dblink_send_query('p51c_b', pg_temp.p51c_apply_sql());

  blocked := pg_temp.p51c_wait_for('p51c_b', 'blocked', 15);
  if not blocked then
    raise exception 'FAIL: a second concurrent fresh-week import did not block on the week';
  end if;
  raise notice 'PASS: a concurrent fresh-week import blocks rather than racing';

  -- The winner commits. Its week now exists, so the loser must be refused —
  -- this is the moment the whole design turns on.
  select drained.failed, drained.message into winner_failed, loser_message
  from pg_temp.p51c_drain('p51c_a') as drained;
  if winner_failed then
    raise exception 'FAIL: the winning import failed: %', loser_message;
  end if;

  perform dblink_send_query('p51c_a', 'commit;');
  if not pg_temp.p51c_wait_for('p51c_a', 'idle', 15) then
    raise exception 'FAIL: the winning import did not commit';
  end if;

  select drained.failed, drained.message into loser_refused, loser_message
  from pg_temp.p51c_drain('p51c_b') as drained;

  if not loser_refused then
    raise exception 'FAIL: the losing import was not refused';
  end if;
  if loser_message not like '%while this import was open%' then
    raise exception 'FAIL: the losing import got the wrong reason: %', loser_message;
  end if;
  raise notice 'PASS: the losing import is refused with a reason a manager can act on';

  perform dblink_disconnect('p51c_a');
  perform dblink_disconnect('p51c_b');

  select count(*) into week_count from public.rota_weeks
  where workspace_id = '10000000-0000-4000-8000-000000000001' and week_start = '2026-09-07';
  select count(*) into shift_count
  from public.shifts as s
  join public.rota_weeks as rw on rw.id = s.rota_week_id
  where rw.workspace_id = '10000000-0000-4000-8000-000000000001' and rw.week_start = '2026-09-07';

  if week_count <> 1 then
    raise exception 'FAIL: two concurrent imports produced % weeks', week_count;
  end if;
  if shift_count <> 2 then
    raise exception 'FAIL: two concurrent imports produced % shifts, expected 2', shift_count;
  end if;
  raise notice 'PASS: exactly one week and one set of shifts survive';
end $$;

-- --------------------------------------------------------------------------
-- 3. A proposal stamped while the week was still absent is refused once an
--    unrelated session has created it — the replay case, and the ordinary
--    "somebody copied last week while I was reviewing" case, are the same gate.
-- --------------------------------------------------------------------------
do $$
declare
  refused boolean := false;
  shift_count_before integer;
  shift_count_after integer;
begin
  select count(*) into shift_count_before
  from public.shifts as s
  join public.rota_weeks as rw on rw.id = s.rota_week_id
  where rw.workspace_id = '10000000-0000-4000-8000-000000000001' and rw.week_start = '2026-09-07';

  perform dblink_connect('p51c_c',
    (select connstr from p51c_conn) || ' application_name=p51c_c');
  begin
    -- The week from step 2 is still there, so stamping now fails and applying a
    -- previously-issued fingerprint fails too. Either way nothing is written.
    perform dblink_exec('p51c_c', pg_temp.p51c_apply_sql());
  exception when others then
    refused := true;
  end;
  perform dblink_disconnect('p51c_c');

  select count(*) into shift_count_after
  from public.shifts as s
  join public.rota_weeks as rw on rw.id = s.rota_week_id
  where rw.workspace_id = '10000000-0000-4000-8000-000000000001' and rw.week_start = '2026-09-07';

  if not refused then
    raise exception 'FAIL: an import into a week that now exists was accepted';
  end if;
  if shift_count_after <> shift_count_before then
    raise exception 'FAIL: a refused replay still added shifts (% -> %)',
      shift_count_before, shift_count_after;
  end if;
  raise notice 'PASS: a replayed fresh-week import adds nothing';
end $$;

-- The winning session committed, so this is a real cleanup rather than a
-- rollback.
--
-- The two audit events it wrote are deliberately left. audit_events rows are
-- immutable by trigger and there is no delete path for them by design — an
-- import that really happened stays on the record, including this one. They
-- reference the week only by subject_id, so removing the week below does not
-- orphan a foreign key.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in (
    select id from public.rota_weeks
    where workspace_id = '10000000-0000-4000-8000-000000000001'
      and week_start = '2026-09-07');
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and week_start = '2026-09-07';
