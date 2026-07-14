-- Phase 32-35 two-session checks for publication, unavailability, and clock locks.
-- LOCAL ONLY; the concurrency runner invokes this as supabase_admin.
begin;
create extension if not exists dblink;

create temp table p3235_conn (connstr text primary key);
insert into p3235_conn values ('dbname=postgres user=postgres');

create function pg_temp.p3235_wait_blocked(p_app_name text, p_timeout numeric)
returns boolean language plpgsql as $$
declare waited numeric := 0; blocked boolean := false;
begin
  while waited < p_timeout loop
    perform pg_stat_clear_snapshot();
    select exists (select 1 from pg_stat_activity
      where application_name = p_app_name and wait_event_type = 'Lock') into blocked;
    exit when blocked;
    perform pg_sleep(0.1);
    waited := waited + 0.1;
  end loop;
  return blocked;
end;
$$;

-- Install deterministic committed fixtures visible to the real second
-- sessions. The final cleanup restores the seed membership exactly.
select dblink_connect('p3235_setup', (select connstr from p3235_conn));
select dblink_exec('p3235_setup', $q$
  begin;
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000',
          'ad000000-0000-4000-8000-000000000352',
          'authenticated', 'authenticated', 'p3235.sophie@example.test');
  update public.workspace_memberships
  set user_id = 'ad000000-0000-4000-8000-000000000352',
      status = 'active', joined_at = transaction_timestamp()
  where id = '13000000-0000-4000-8000-000000000002';
  insert into public.staff_one_off_unavailability_requests (
    id, workspace_id, staff_member_id, date, status, note
  ) values (
    '45000000-0000-4000-8000-000000000352',
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001', '2099-09-01', 'pending',
    'Concurrency fixture'
  );
  commit;
$q$);
select dblink_disconnect('p3235_setup');

-- This is the phase-31 per-person authority lock. Publication now takes it in
-- stable staff order; unavailability decisions and clocks take the same row.
select id from public.staff_members
where id = '14000000-0000-4000-8000-000000000001' for update;

do $$ begin
  perform dblink_connect('p3235_publish',
    (select connstr from p3235_conn) || ' application_name=p3235_publish');
  perform dblink_send_query('p3235_publish', $q$
    begin;
    select set_config('request.jwt.claims',
      '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000002');
  $q$);
  if not pg_temp.p3235_wait_blocked('p3235_publish', 10) then
    raise exception 'FAIL: publication did not wait for assigned-staff lock';
  end if;
  raise notice 'PASS: publication locks assigned staff before eligibility reads';
end $$;

do $$ begin
  perform dblink_connect('p3235_unavailable',
    (select connstr from p3235_conn) || ' application_name=p3235_unavailable');
  perform dblink_send_query('p3235_unavailable', $q$
    begin;
    select set_config('request.jwt.claims',
      '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_decide_one_off_unavailability(
      '10000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000352', 'approved', null);
  $q$);
  if not pg_temp.p3235_wait_blocked('p3235_unavailable', 10) then
    raise exception 'FAIL: unavailability approval did not wait for staff lock';
  end if;
  raise notice 'PASS: unavailability decision shares the eligibility lock';
end $$;

do $$ begin
  perform dblink_connect('p3235_clock',
    (select connstr from p3235_conn) || ' application_name=p3235_clock');
  perform dblink_send_query('p3235_clock', $q$
    begin;
    select set_config('request.jwt.claims',
      '{"sub":"ad000000-0000-4000-8000-000000000352","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_staff_clock_event(
      '10000000-0000-4000-8000-000000000001', 'clock_in', null);
  $q$);
  if not pg_temp.p3235_wait_blocked('p3235_clock', 10) then
    raise exception 'FAIL: clock-in did not wait for per-staff clock lock';
  end if;
  raise notice 'PASS: clock matching and duplicate guard are serialised per staff';
end $$;

-- Cancel each asynchronous query before disconnecting. Disconnecting a busy
-- dblink can wait for the held main-session lock and deadlock the test harness.
-- Cancellation aborts every remote transaction; no blocked writer commits.
select dblink_cancel_query('p3235_publish');
select dblink_cancel_query('p3235_unavailable');
select dblink_cancel_query('p3235_clock');
select pg_sleep(0.2);
select dblink_disconnect('p3235_publish');
select dblink_disconnect('p3235_unavailable');
select dblink_disconnect('p3235_clock');

select dblink_connect('p3235_cleanup', (select connstr from p3235_conn));
select dblink_exec('p3235_cleanup', $q$
  begin;
  delete from public.staff_one_off_unavailability_requests
  where id = '45000000-0000-4000-8000-000000000352';
  update public.workspace_memberships
  set user_id = null, status = 'invited', joined_at = null
  where id = '13000000-0000-4000-8000-000000000002';
  delete from auth.users where id = 'ad000000-0000-4000-8000-000000000352';
  commit;
$q$);
select dblink_disconnect('p3235_cleanup');

rollback;
