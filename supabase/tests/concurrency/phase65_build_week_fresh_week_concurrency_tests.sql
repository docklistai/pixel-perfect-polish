create extension if not exists dblink;

delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in (
    select id from public.rota_weeks
    where workspace_id = '10000000-0000-4000-8000-000000000001'
      and location_id = '11000000-0000-4000-8000-000000000001'
      and week_start = '2026-09-07');
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and location_id = '11000000-0000-4000-8000-000000000001'
  and week_start = '2026-09-07';

create temp table p65c_conn (connstr text primary key);
insert into p65c_conn values ('dbname=postgres user=postgres');

create function pg_temp.p65c_wait_for(
  p_app_name text,
  p_condition text,
  p_timeout_seconds numeric
) returns boolean language plpgsql as $$
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
    elsif p_condition = 'settled' then
      -- Used ONLY where a refusal is the expected outcome. A refused apply
      -- raises, so its backend settles in 'idle in transaction (aborted)' and
      -- would never satisfy 'done'. Matching either state waits for the session
      -- to stop working without asserting that it succeeded; the caller still
      -- drains the result and proves both the refusal and its reason.
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name
          and state in ('idle in transaction', 'idle in transaction (aborted)')
      ) into satisfied;
    else
      -- 'idle in transaction (aborted)' deliberately does NOT match: a session
      -- whose apply errored must never be read as having completed. Same rule
      -- as pg_temp.p48c_wait_for in the phase 48 concurrency tests.
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

create function pg_temp.p65c_drain(p_conn text, out failed boolean, out message text)
language plpgsql as $$
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

create function pg_temp.p65c_operations() returns jsonb language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Waiter', 'reason', 'row 1',
      'signature', jsonb_build_object(
        'workDate', '2026-09-07', 'startLocal', '09:00', 'endLocal', '17:00',
        'overnight', false, 'roleKey', 'waiter',
        'departmentId', '12000000-0000-4000-8000-000000000001',
        'locationId', '11000000-0000-4000-8000-000000000001',
        'breakMinutes', 30))
  );
$$;

create function pg_temp.p65c_build_source() returns jsonb language sql immutable as $$
  select jsonb_build_object('kind', 'template', 'id', 'tpl-1', 'contentVersion', 1, 'plannerRuleVersion', 'build-week/1');
$$;

create function pg_temp.p65c_import_source() returns jsonb language sql immutable as $$
  select jsonb_build_object('kind', 'headed-import', 'id', null, 'contentVersion', 'rows:1', 'plannerRuleVersion', 'build-week/1');
$$;

create function pg_temp.p65c_build_apply_sql() returns text language sql stable as $$
  select format($f$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_apply_build_to_new_week(
      '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2026-09-07',
      (public.rpc_build_week_fresh_proposal_stamp(
        '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2026-09-07', %L::jsonb, %L::jsonb)->>'fingerprint'),
      md5(%L), %L::jsonb, %L::jsonb);
  $f$,
  pg_temp.p65c_build_source()::text, pg_temp.p65c_operations()::text,
  pg_temp.p65c_operations()::text,
  pg_temp.p65c_build_source()::text, pg_temp.p65c_operations()::text);
$$;

create function pg_temp.p65c_import_apply_sql() returns text language sql stable as $$
  select format($f$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_apply_import_to_new_week(
      '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2026-09-07',
      (public.rpc_import_schedule_proposal_stamp(
        '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2026-09-07', %L::jsonb, %L::jsonb)->>'fingerprint'),
      md5(%L), %L::jsonb, %L::jsonb);
  $f$,
  pg_temp.p65c_import_source()::text, pg_temp.p65c_operations()::text,
  pg_temp.p65c_operations()::text,
  pg_temp.p65c_import_source()::text, pg_temp.p65c_operations()::text);
$$;

-- Test 1: Build vs Build
do $$
declare
  blocked boolean; done boolean;
  loser_refused boolean; loser_message text; winner_failed boolean;
  week_count integer; shift_count integer;
begin
  perform dblink_connect('p65c_a', (select connstr from p65c_conn) || ' application_name=p65c_a');
  perform dblink_send_query('p65c_a', pg_temp.p65c_build_apply_sql());
  done := pg_temp.p65c_wait_for('p65c_a', 'done', 15);
  if not done then raise exception 'FAIL: the first fresh-week build did not complete'; end if;

  perform dblink_connect('p65c_b', (select connstr from p65c_conn) || ' application_name=p65c_b');
  perform dblink_send_query('p65c_b', pg_temp.p65c_build_apply_sql());
  blocked := pg_temp.p65c_wait_for('p65c_b', 'blocked', 15);
  if not blocked then raise exception 'FAIL: a second concurrent fresh-week build did not block on the week'; end if;

  select drained.failed, drained.message into winner_failed, loser_message from pg_temp.p65c_drain('p65c_a') as drained;
  if winner_failed then raise exception 'FAIL: the winning build failed: %', loser_message; end if;

  perform dblink_send_query('p65c_a', 'commit;');
  if not pg_temp.p65c_wait_for('p65c_a', 'idle', 15) then raise exception 'FAIL: the winning build did not commit'; end if;

  select drained.failed, drained.message into loser_refused, loser_message from pg_temp.p65c_drain('p65c_b') as drained;
  if not loser_refused then raise exception 'FAIL: the losing build was not refused'; end if;
  if loser_message not like '%while this build was open%' then
    raise exception 'FAIL: the losing build got the wrong reason: %', loser_message;
  end if;

  perform dblink_disconnect('p65c_a');
  perform dblink_disconnect('p65c_b');

  select count(*) into week_count from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07';
  select count(*) into shift_count from public.shifts as s join public.rota_weeks as rw on rw.id = s.rota_week_id where rw.workspace_id = '10000000-0000-4000-8000-000000000001' and rw.location_id = '11000000-0000-4000-8000-000000000001' and rw.week_start = '2026-09-07';
  if week_count <> 1 then raise exception 'FAIL: Build vs Build produced % weeks', week_count; end if;
  if shift_count <> 1 then raise exception 'FAIL: Build vs Build produced % shifts, expected 1', shift_count; end if;
end $$;

delete from public.shifts where rota_week_id in (select id from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07');
delete from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07';

-- Test 2: Build vs Import
do $$
declare
  blocked boolean; done boolean;
  loser_refused boolean; loser_message text; winner_failed boolean;
  week_count integer; shift_count integer;
begin
  perform dblink_connect('p65c_c', (select connstr from p65c_conn) || ' application_name=p65c_c');
  perform dblink_send_query('p65c_c', pg_temp.p65c_build_apply_sql());
  done := pg_temp.p65c_wait_for('p65c_c', 'done', 15);
  if not done then raise exception 'FAIL: the fresh-week build did not complete'; end if;

  perform dblink_connect('p65c_d', (select connstr from p65c_conn) || ' application_name=p65c_d');
  perform dblink_send_query('p65c_d', pg_temp.p65c_import_apply_sql());
  blocked := pg_temp.p65c_wait_for('p65c_d', 'blocked', 15);
  if not blocked then raise exception 'FAIL: a concurrent fresh-week import did not block on the week'; end if;

  select drained.failed, drained.message into winner_failed, loser_message from pg_temp.p65c_drain('p65c_c') as drained;
  if winner_failed then raise exception 'FAIL: the winning build failed: %', loser_message; end if;

  perform dblink_send_query('p65c_c', 'commit;');
  if not pg_temp.p65c_wait_for('p65c_c', 'idle', 15) then raise exception 'FAIL: the winning build did not commit'; end if;

  select drained.failed, drained.message into loser_refused, loser_message from pg_temp.p65c_drain('p65c_d') as drained;
  if not loser_refused then raise exception 'FAIL: the losing import was not refused'; end if;
  if loser_message not like '%while this import was open%' then
    raise exception 'FAIL: the losing import got the wrong reason: %', loser_message;
  end if;

  perform dblink_disconnect('p65c_c');
  perform dblink_disconnect('p65c_d');

  select count(*) into week_count from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07';
  select count(*) into shift_count from public.shifts as s join public.rota_weeks as rw on rw.id = s.rota_week_id where rw.workspace_id = '10000000-0000-4000-8000-000000000001' and rw.location_id = '11000000-0000-4000-8000-000000000001' and rw.week_start = '2026-09-07';
  if week_count <> 1 then raise exception 'FAIL: Build vs Import produced % weeks', week_count; end if;
  if shift_count <> 1 then raise exception 'FAIL: Build vs Import produced % shifts, expected 1', shift_count; end if;
end $$;

delete from public.shifts where rota_week_id in (select id from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07');
delete from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07';

-- Test 3: Build vs ordinary shift/week creation
do $$
declare
  refused boolean := false;
  week_count integer; shift_count integer;
  absence_fingerprint text;
  apply_sql text;
begin
  -- Capture the absence fingerprint BEFORE the ordinary week is created
  absence_fingerprint := public.rpc_internal_import_absent_week_fingerprint('10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2026-09-07', pg_temp.p65c_build_source());

  -- Create the ordinary week in a separate session so it is committed before apply
  perform dblink_connect('p65c_setup', (select connstr from p65c_conn) || ' application_name=p65c_setup');
  perform dblink_exec('p65c_setup', 'insert into public.rota_weeks (id, workspace_id, location_id, week_start, status) values (gen_random_uuid(), ''10000000-0000-4000-8000-000000000001'', ''11000000-0000-4000-8000-000000000001'', ''2026-09-07'', ''draft''); commit;');
  perform dblink_disconnect('p65c_setup');

  apply_sql := format($f$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_apply_build_to_new_week(
      '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2026-09-07',
      %L,
      md5(%L), %L::jsonb, %L::jsonb);
  $f$, absence_fingerprint, pg_temp.p65c_operations()::text, pg_temp.p65c_build_source()::text, pg_temp.p65c_operations()::text);

  perform dblink_connect('p65c_e', (select connstr from p65c_conn) || ' application_name=p65c_e');
  perform dblink_send_query('p65c_e', apply_sql);
  -- This apply is expected to be REFUSED, so it settles aborted rather than
  -- completing. Waiting on 'done' here would time out on the very outcome
  -- the test exists to prove.
  if not pg_temp.p65c_wait_for('p65c_e', 'settled', 15) then raise exception 'FAIL: build did not settle'; end if;

  declare
    apply_failed boolean; apply_message text;
  begin
    select drained.failed, drained.message into apply_failed, apply_message from pg_temp.p65c_drain('p65c_e') as drained;
    if not apply_failed then raise exception 'FAIL: build applied into week created by ordinary insert'; end if;
    if apply_message not like '%build is out of date%' then
      raise exception 'FAIL: build got wrong reason: %', apply_message;
    end if;
  end;

  perform dblink_disconnect('p65c_e');

  select count(*) into week_count from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07';
  if week_count <> 1 then raise exception 'FAIL: Build vs ordinary insert produced % weeks', week_count; end if;
  select count(*) into shift_count from public.shifts as s join public.rota_weeks as rw on rw.id = s.rota_week_id where rw.workspace_id = '10000000-0000-4000-8000-000000000001' and rw.location_id = '11000000-0000-4000-8000-000000000001' and rw.week_start = '2026-09-07';
  if shift_count <> 0 then raise exception 'FAIL: Build vs ordinary insert produced % shifts, expected 0', shift_count; end if;
end $$;

delete from public.shifts where rota_week_id in (select id from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07');
delete from public.rota_weeks where workspace_id = '10000000-0000-4000-8000-000000000001' and location_id = '11000000-0000-4000-8000-000000000001' and week_start = '2026-09-07';
