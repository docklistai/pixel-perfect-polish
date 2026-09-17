-- Phase 70: Secondary eligible roles test suite (WS-10)
--
-- Proves:
--   1. Manager can set secondary eligible roles via rpc_set_staff_eligible_roles.
--   2. Staff cannot call rpc_set_staff_eligible_roles (42501).
--   3. Staff can select own eligible roles, but not other staff rows.
--   4. Gate 1 (rpc_request_open_shift): secondary role allows request; non-held role is refused (55000).
--   5. Gate 2/3 (rpc_select_open_shift_applicant): applicant with secondary role is accepted; applicant without role is refused (55000).
--   6. Gate 4 (rpc_internal_assert_build_week_assignable): secondary role is accepted; non-held role is refused (55000).
--   7. Shift material-change comparisons remain intact and functional.

begin;

-- Setup test users & memberships
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000702', 'authenticated', 'authenticated', 'p70.noah@test.local'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000703', 'authenticated', 'authenticated', 'p70.liam@test.local')
on conflict (id) do nothing;

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000702', status = 'active', joined_at = now()
where id = '13000000-0000-4000-8000-000000000009';

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000703', status = 'active', joined_at = now()
where id = '13000000-0000-4000-8000-000000000005';


-- Future rota week with open shifts
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2099-10-12', 'draft');

-- Shift 1: Bartender open shift
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '70000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000003', null,
  '2099-10-14', '2099-10-14T17:00:00+01:00', '2099-10-14T23:00:00+01:00',
  30, 'Bartender', 'open'
);

-- Shift 2: Chef open shift
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '70000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000003', null,
  '2099-10-15', '2099-10-15T10:00:00+01:00', '2099-10-15T16:00:00+01:00',
  30, 'Chef', 'open'
);

-- Manager publishes snapshot
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001'
);

-- Store published shift ids for subsequent tests
create temp table p70_test_shifts as
select source_shift_id, id as published_id, role_name
from public.published_rota_shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and source_shift_id in ('70000000-0000-4000-8000-000000000011', '70000000-0000-4000-8000-000000000012');

-- --------------------------------------------------------------------------
-- 1. Manager sets secondary eligible roles for Noah (Porter)
-- --------------------------------------------------------------------------
do $$
declare
  res jsonb;
  n integer;
begin
  -- Noah's primary role is Porter. Give secondary roles: Bartender and Sommelier.
  res := public.rpc_set_staff_eligible_roles(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000008',
    array['Bartender', 'Sommelier', 'Porter'] -- 'Porter' should be skipped (is primary)
  );

  if (res->>'eligible_roles_count')::int <> 2 then
    raise exception 'FAIL: expected 2 eligible roles, got %', res;
  end if;

  select count(*) into n
  from public.staff_eligible_roles
  where staff_member_id = '14000000-0000-4000-8000-000000000008';

  if n <> 2 then
    raise exception 'FAIL: expected 2 rows in staff_eligible_roles, got %', n;
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 2. Staff caller cannot set eligible roles (42501)
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000702","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  perform public.rpc_set_staff_eligible_roles(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000008',
    array['Chef']
  );
  raise exception 'FAIL: staff member should not be able to set eligible roles';
exception when sqlstate '42501' then
  -- Expected
end $$;

-- --------------------------------------------------------------------------
-- 3. Staff can select own eligible roles, but not other staff rows
-- --------------------------------------------------------------------------
do $$
declare
  own_count integer;
  other_count integer;
begin
  select count(*) into own_count
  from public.staff_eligible_roles
  where staff_member_id = '14000000-0000-4000-8000-000000000008';

  if own_count <> 2 then
    raise exception 'FAIL: expected staff to read own 2 eligible roles, got %', own_count;
  end if;

  select count(*) into other_count
  from public.staff_eligible_roles
  where staff_member_id = '14000000-0000-4000-8000-000000000004';

  if other_count <> 0 then
    raise exception 'FAIL: staff should see 0 rows for other staff, got %', other_count;
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 4. Gate 1 (rpc_request_open_shift): secondary role succeeds; non-held role fails
-- --------------------------------------------------------------------------
do $$
declare
  bartender_pub_id uuid;
  chef_pub_id uuid;
  req_res jsonb;
begin
  select published_id into bartender_pub_id from p70_test_shifts where role_name = 'Bartender';
  select published_id into chef_pub_id from p70_test_shifts where role_name = 'Chef';

  -- Noah requests Bartender shift (Noah is primary Porter, secondary Bartender) -> SUCCESS
  req_res := public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', bartender_pub_id);
  if req_res->>'status' <> 'pending' then
    raise exception 'FAIL: expected pending status for secondary role open shift request, got %', req_res;
  end if;

  -- Noah requests Chef shift (Noah does not hold Chef) -> REFUSED (55000)
  begin
    perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', chef_pub_id);
    raise exception 'FAIL: should have refused open shift request for non-eligible role';
  exception when sqlstate '55000' then
    -- Expected: 'this open shift is not eligible for your current role'
  end;
end $$;

-- --------------------------------------------------------------------------
-- 5. Gate 2/3 (rpc_select_open_shift_applicant): secondary role accepted; non-held refused
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  req_id uuid;
  sel_res jsonb;
begin
  select id into req_id
  from public.open_shift_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000008'
    and source_shift_id = '70000000-0000-4000-8000-000000000011';

  -- Selecting Noah for Bartender shift succeeds because Noah holds Bartender secondary role
  sel_res := public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', req_id);
  if sel_res->>'status' <> 'selected' then
    raise exception 'FAIL: expected selected status, got %', sel_res;
  end if;
end $$;

-- Test Gate 2/3 refusal: remove Bartender from Noah's eligible roles and re-attempt selection
do $$
declare
  req_id uuid;
begin
  -- Reopen shift and reset request to pending
  update public.shifts set assignment_status = 'open', staff_member_id = null
  where id = '70000000-0000-4000-8000-000000000011';

  select id into req_id
  from public.open_shift_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000008'
    and source_shift_id = '70000000-0000-4000-8000-000000000011';

  update public.open_shift_requests set status = 'pending' where id = req_id;

  -- Remove Bartender secondary role from Noah
  perform public.rpc_set_staff_eligible_roles(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000008',
    array['Sommelier']
  );

  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', req_id);
    raise exception 'FAIL: selecting applicant without role must refuse';
  exception when sqlstate '55000' then
    -- Expected: 'the applicant''s role does not match this % shift'
  end;
end $$;

-- --------------------------------------------------------------------------
-- 6. Gate 4: rpc_internal_assert_build_week_assignable (internal helper: runs as postgres/definer)
-- --------------------------------------------------------------------------
reset role;

do $$
begin

  -- Noah (primary Porter, secondary Sommelier)
  -- 1. Porter -> holds primary -> PASS
  perform public.rpc_internal_assert_build_week_assignable(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000008',
    'porter',
    '2099-10-16T09:00:00+01:00'::timestamptz,
    '2099-10-16T17:00:00+01:00'::timestamptz,
    'Europe/London',
    null
  );

  -- 2. Sommelier -> holds secondary -> PASS
  perform public.rpc_internal_assert_build_week_assignable(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000008',
    'sommelier',
    '2099-10-16T09:00:00+01:00'::timestamptz,
    '2099-10-16T17:00:00+01:00'::timestamptz,
    'Europe/London',
    null
  );

  -- 3. Chef -> does NOT hold -> REFUSE (55000)
  begin
    perform public.rpc_internal_assert_build_week_assignable(
      '10000000-0000-4000-8000-000000000001',
      '14000000-0000-4000-8000-000000000008',
      'chef',
      '2099-10-16T09:00:00+01:00'::timestamptz,
      '2099-10-16T17:00:00+01:00'::timestamptz,
      'Europe/London',
      null
    );
    raise exception 'FAIL: build week assignable must refuse role not held';
  exception when sqlstate '55000' then
    -- Expected: 'Someone in this proposal does not hold the role for their shift.'
  end;
end $$;

-- --------------------------------------------------------------------------
-- 7. Shift material-change comparisons remain intact
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare

  req_id uuid;
begin
  -- Restore Bartender secondary role to Noah
  perform public.rpc_set_staff_eligible_roles(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000008',
    array['Bartender']
  );

  select id into req_id
  from public.open_shift_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000008'
    and source_shift_id = '70000000-0000-4000-8000-000000000011';

  -- Alter the draft shift's role from Bartender to Sommelier while request was for Bartender
  update public.shifts set role_name = 'Sommelier' where id = '70000000-0000-4000-8000-000000000011';

  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', req_id);
    raise exception 'FAIL: changed draft shift must refuse selection with republication requirement';
  exception when sqlstate '55000' then
    -- Expected: 'the draft shift changed after this request; republish before selecting an applicant'
  end;
end $$;

rollback;
