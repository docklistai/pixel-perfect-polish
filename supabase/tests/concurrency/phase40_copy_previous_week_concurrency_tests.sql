-- Phase 40 two-session concurrency checks for rpc_copy_previous_rota_week.
--
-- LOCAL ONLY. Run via `bash scripts/concurrency-tests.sh` (supabase_admin —
-- dblink needs a superuser caller on the local stack). Every copy/edit session
-- opens a BEGIN that is never committed; disconnecting aborts it. A dedicated
-- empty target-week row is committed before the test so every remote session
-- can see it, then removed after the main test transaction rolls back.
--
-- Asserts the copy participates in the phase 31 lock protocol:
--   1. an uncontended copy runs to completion and reports its work;
--   2. a concurrent copy of the SAME target week blocks until the first
--      session releases, then completes — no interleaved partial state;
--   3. an ordinary concurrent edit of the target week blocks behind a copy;
--   4. a copy that would assign a staff member whose eligibility lock is
--      held elsewhere blocks on that staff row.
--
-- Fixtures: seeded Harbour View. Source week 15…02 (2026-06-15, 4 draft
-- shifts incl. Sophie 14…01); target week 2026-06-22 (dedicated fixture).

create extension if not exists dblink;

-- A target created inside the main transaction is invisible to the remote
-- dblink sessions under MVCC. Keep this one committed and empty; the fixed
-- identity is cleaned on rerun and after a successful suite.
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id = '15000000-0000-4000-8000-000000000003';
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '15000000-0000-4000-8000-000000000003';
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values (
  '15000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '2026-06-22', 'draft'
);

begin;

create temp table p40c_conn (connstr text primary key);
insert into p40c_conn values ('dbname=postgres user=postgres');

create function pg_temp.p40c_wait_for(
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
-- 1 + 2. First copy completes and holds its locks; a second concurrent copy
--        of the same target blocks, then completes once the first releases.
-- --------------------------------------------------------------------------
do $$
declare
  done boolean;
  blocked boolean;
begin
  perform dblink_connect('p40c_a',
    (select connstr from p40c_conn) || ' application_name=p40c_a');
  perform dblink_send_query('p40c_a', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_copy_previous_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '11000000-0000-4000-8000-000000000001',
      '2026-06-22');
  $q$);

  done := pg_temp.p40c_wait_for('p40c_a', 'done', 10);
  if not done then
    raise exception 'FAIL: uncontended copy did not complete';
  end if;
  raise notice 'PASS: uncontended copy runs to completion';

  perform dblink_connect('p40c_b',
    (select connstr from p40c_conn) || ' application_name=p40c_b');
  perform dblink_send_query('p40c_b', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_copy_previous_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '11000000-0000-4000-8000-000000000001',
      '2026-06-22');
  $q$);

  blocked := pg_temp.p40c_wait_for('p40c_b', 'blocked', 10);
  if not blocked then
    raise exception 'FAIL: concurrent same-target copy did not block';
  end if;
  raise notice 'PASS: concurrent copy of the same target week blocks';

  -- Release the first session's locks; the second must then finish cleanly.
  perform dblink_disconnect('p40c_a');
  done := pg_temp.p40c_wait_for('p40c_b', 'done', 10);
  if not done then
    raise exception 'FAIL: blocked copy did not complete after the first released';
  end if;
  raise notice 'PASS: blocked copy completes deterministically after release';

  -- While the second copy still owns the target-week lock, an ordinary shift
  -- edit must participate in the same protocol and wait. This is copy-vs-edit,
  -- not merely copy-vs-copy.
  perform dblink_connect('p40c_edit',
    (select connstr from p40c_conn) || ' application_name=p40c_edit');
  perform dblink_send_query('p40c_edit', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000003',
      '11000000-0000-4000-8000-000000000001',
      '12000000-0000-4000-8000-000000000001', null,
      '2026-06-22', '2026-06-22T09:00:00+01:00',
      '2026-06-22T13:00:00+01:00', 0, 'Concurrent target edit', 'open'
    );
  $q$);

  blocked := pg_temp.p40c_wait_for('p40c_edit', 'blocked', 10);
  if not blocked then
    raise exception 'FAIL: ordinary concurrent target edit did not block behind copy';
  end if;
  raise notice 'PASS: ordinary target edit serializes behind copy';

  perform dblink_disconnect('p40c_b');
  done := pg_temp.p40c_wait_for('p40c_edit', 'done', 10);
  if not done then
    raise exception 'FAIL: target edit did not complete after copy released';
  end if;
  raise notice 'PASS: target edit completes after copy releases atomically';

  perform dblink_disconnect('p40c_edit');
end $$;

-- --------------------------------------------------------------------------
-- 4. Holding Sophie's staff eligibility lock blocks a copy that would
--    assign her (phase 31 protocol: staff locks last, ascending order).
-- --------------------------------------------------------------------------
select id from public.staff_members
where id = '14000000-0000-4000-8000-000000000001' for update;

do $$
declare
  blocked boolean;
begin
  perform dblink_connect('p40c_c',
    (select connstr from p40c_conn) || ' application_name=p40c_c');
  perform dblink_send_query('p40c_c', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_copy_previous_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '11000000-0000-4000-8000-000000000001',
      '2026-06-22');
  $q$);

  blocked := pg_temp.p40c_wait_for('p40c_c', 'blocked', 10);
  if not blocked then
    raise exception 'FAIL: copy did not wait for the staff eligibility lock';
  end if;
  raise notice 'PASS: copy blocks on a held staff eligibility lock';

  perform dblink_disconnect('p40c_c');
end $$;

rollback;

delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id = '15000000-0000-4000-8000-000000000003';
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '15000000-0000-4000-8000-000000000003';
