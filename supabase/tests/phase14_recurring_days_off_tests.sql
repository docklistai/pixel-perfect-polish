-- Phase 14 recurring day-off verification. Runs entirely inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase14_recurring_days_off_tests.sql
--
-- Expected rejections are caught by exact SQLSTATE (42501 wrong role / no staff
-- identity, 55000 invalid state, P0002 not found). A failed check raises P0001
-- (FAIL) and aborts.

begin;

-- --------------------------------------------------------------------------
-- Setup: claim seeded memberships for test auth identities.
-- Workspace 1 = 10000000-…0001 (Harbour View seed). Olivia is staff member
-- 14000000-…0005 via membership 13000000-…0006. Manager is membership
-- 13000000-…0010. A second workspace probes tenant isolation.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'p14.manager@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'p14.olivia@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'p14.outsider@example.com');

update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000101', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000010';
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000102', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000006';

insert into public.workspaces (id, slug, name, timezone)
values ('31000000-0000-4000-8000-000000000101', 'p14-second-site', 'P14 Second Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('32000000-0000-4000-8000-000000000101', '31000000-0000-4000-8000-000000000101', 'P14 Second Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('33000000-0000-4000-8000-000000000101', '31000000-0000-4000-8000-000000000101', 'Front of House');
insert into public.workspace_memberships (id, workspace_id, role, status, invited_at)
values ('34000000-0000-4000-8000-000000000101', '31000000-0000-4000-8000-000000000101', 'staff', 'invited', '2026-06-01T08:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('35000000-0000-4000-8000-000000000101', '31000000-0000-4000-8000-000000000101', '34000000-0000-4000-8000-000000000101', '32000000-0000-4000-8000-000000000101', '33000000-0000-4000-8000-000000000101', 'P14 Second Staff', 'Waiter');

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia): request a standing day off; read own; cannot decide.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000102","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  own_rows bigint;
  own_status text;
  own_weekday smallint;
  base_rows bigint;
begin
  -- Request Sunday (weekday 6) off, then re-request with a note (stays pending).
  perform public.rpc_request_recurring_day_off('10000000-0000-4000-8000-000000000001', 6::smallint, null);
  perform public.rpc_request_recurring_day_off('10000000-0000-4000-8000-000000000001', 6::smallint, 'Church commitments');

  select count(*), min(status), min(weekday)
  into own_rows, own_status, own_weekday
  from public.staff_portal_recurring_days_off;
  if own_rows <> 1 or own_status is distinct from 'pending' or own_weekday is distinct from 6 then
    raise exception 'FAIL: staff sees % own rows / status % / weekday % (expected 1 / pending / 6)',
      own_rows, own_status, own_weekday;
  end if;
  raise notice 'PASS: staff requests a standing day off and reads it back as pending';

  -- The base table is manager-only: staff read nothing directly from it.
  select count(*) into base_rows from public.staff_recurring_day_off_requests;
  if base_rows <> 0 then
    raise exception 'FAIL: staff read % base-table rows (expected 0; must use the view)', base_rows;
  end if;
  raise notice 'PASS: staff cannot read the base table directly';

  -- Wrong weekday is rejected.
  begin
    perform public.rpc_request_recurring_day_off('10000000-0000-4000-8000-000000000001', 9::smallint, null);
    raise exception 'FAIL: an out-of-range weekday was accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: out-of-range weekday rejected';
  end;

  -- Staff cannot decide their own request.
  begin
    perform public.rpc_decide_recurring_day_off(
      '10000000-0000-4000-8000-000000000001',
      (select request_id from public.staff_portal_recurring_days_off limit 1),
      'approved', null);
    raise exception 'FAIL: staff approved their own request';
  exception when sqlstate '42501' then
    raise notice 'PASS: staff cannot decide requests';
  end;
end $$;

-- --------------------------------------------------------------------------
-- MANAGER persona: sees the request, approves it, cannot double-decide.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000101","role":"authenticated"}', true);

do $$
declare
  visible_rows bigint;
  target_id uuid;
  after_status text;
  after_decider uuid;
begin
  select count(*) into visible_rows
  from public.staff_recurring_day_off_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000005' and weekday = 6;
  if visible_rows <> 1 then
    raise exception 'FAIL: manager sees % rows for the request (expected 1)', visible_rows;
  end if;

  select id into target_id
  from public.staff_recurring_day_off_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000005' and weekday = 6;

  perform public.rpc_decide_recurring_day_off(
    '10000000-0000-4000-8000-000000000001', target_id, 'approved', 'Fine — you never work Sundays.');

  select status, decided_by_membership_id into after_status, after_decider
  from public.staff_recurring_day_off_requests where id = target_id;
  if after_status is distinct from 'approved'
     or after_decider is distinct from '13000000-0000-4000-8000-000000000010' then
    raise exception 'FAIL: decision not recorded (status %, decider %)', after_status, after_decider;
  end if;
  raise notice 'PASS: manager approves and the decider is recorded';

  -- A second approve on an already-decided request is rejected.
  begin
    perform public.rpc_decide_recurring_day_off(
      '10000000-0000-4000-8000-000000000001', target_id, 'declined', null);
    raise exception 'FAIL: an already-decided request was decided again';
  exception when sqlstate '55000' then
    raise notice 'PASS: double decision rejected';
  end;

  -- A manager cannot decide a request in a workspace they do not manage.
  begin
    perform public.rpc_decide_recurring_day_off(
      '31000000-0000-4000-8000-000000000101', target_id, 'approved', null);
    raise exception 'FAIL: manager decided a request in a foreign workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: cross-workspace decision rejected';
  end;
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona again: the approval is now visible on their own view.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000102","role":"authenticated"}', true);

do $$
declare
  own_status text;
  own_decision text;
begin
  select status, decision_note into own_status, own_decision
  from public.staff_portal_recurring_days_off where weekday = 6;
  if own_status is distinct from 'approved' then
    raise exception 'FAIL: staff does not see the approval (status %)', own_status;
  end if;
  raise notice 'PASS: staff sees the approved decision and note (%).', own_decision;

  -- Withdraw removes the request.
  perform public.rpc_withdraw_recurring_day_off('10000000-0000-4000-8000-000000000001', 6::smallint);
  if exists (select 1 from public.staff_portal_recurring_days_off where weekday = 6) then
    raise exception 'FAIL: withdrawn request still visible';
  end if;
  raise notice 'PASS: staff withdraws their own request';
end $$;

-- --------------------------------------------------------------------------
-- OUTSIDER persona: no memberships anywhere — every surface must be empty.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000103","role":"authenticated"}', true);

do $$
declare
  total_rows bigint;
begin
  select (select count(*) from public.staff_recurring_day_off_requests)
       + (select count(*) from public.staff_portal_recurring_days_off)
  into total_rows;
  if total_rows <> 0 then
    raise exception 'FAIL: outsider sees % phase-14 rows (expected 0)', total_rows;
  end if;
  raise notice 'PASS: outsider sees nothing';
end $$;

rollback;
