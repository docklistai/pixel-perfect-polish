-- Phase 75: Open shift blocking leave regression tests (R1)
--
-- Proves:
--   1. Pending overlapping leave -> rpc_request_open_shift refused (55000).
--   2. Approved overlapping leave -> rpc_request_open_shift refused (55000).
--   3. Declined/cancelled non-blocking leave -> request may proceed.
--   4. Non-overlapping pending leave -> request may proceed.
--   5. Overnight shift overlap -> leave on following calendar day is refused.
--   6. Another employee's leave does not block the applicant.
--   7. Pending overlapping leave appearing after request but before selection -> selection refused (55000).
--   8. Approved overlapping leave before selection -> selection refused (55000).
--   9. Workspace isolation preserved.
--  10. Role eligibility / open-shift existing rules still hold.

begin;

-- Setup test users
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000751', 'authenticated', 'authenticated', 'p75.noah@test.local'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000752', 'authenticated', 'authenticated', 'p75.liam@test.local')
on conflict (id) do nothing;

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000751', status = 'active', joined_at = now()
where id = '13000000-0000-4000-8000-000000000009';

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000752', status = 'active', joined_at = now()
where id = '13000000-0000-4000-8000-000000000005';

-- Ensure Noah has Bartender role
insert into public.staff_eligible_roles (workspace_id, staff_member_id, role_key, role_name)
values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000008', 'bartender', 'Bartender')
on conflict do nothing;

-- Rota week
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('75000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2099-11-02', 'draft');

-- Shift 1: Standard open shift on 2099-11-04 (10:00 - 18:00)
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '75000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000003', null,
  '2099-11-04', '2099-11-04T10:00:00+00:00', '2099-11-04T18:00:00+00:00',
  30, 'Bartender', 'open'
);

-- Shift 2: Overnight open shift 2099-11-05 22:00 -> 2099-11-06 06:00
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '75000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000003', null,
  '2099-11-05', '2099-11-05T22:00:00+00:00', '2099-11-06T06:00:00+00:00',
  30, 'Bartender', 'open'
);

-- Shift 3: Shift for selection test on 2099-11-07
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '75000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000003', null,
  '2099-11-07', '2099-11-07T10:00:00+00:00', '2099-11-07T18:00:00+00:00',
  30, 'Bartender', 'open'
);

-- Shift 4: Role eligibility shift (Sommelier) on 2099-11-08
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '75000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000003', null,
  '2099-11-08', '2099-11-08T10:00:00+00:00', '2099-11-08T18:00:00+00:00',
  30, 'Sommelier', 'open'
);

-- Manager publishes snapshot
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001'
);

create temp table p75_shifts as
select source_shift_id, id as published_id, role_name
from public.published_rota_shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and source_shift_id in (
    '75000000-0000-4000-8000-000000000011',
    '75000000-0000-4000-8000-000000000012',
    '75000000-0000-4000-8000-000000000013',
    '75000000-0000-4000-8000-000000000014'
  );

-- --------------------------------------------------------------------------
-- 1. Pending overlapping leave -> rpc_request_open_shift refused (55000)
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', null, true);
insert into public.leave_requests (
  id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status
) values (
  '75000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000008', 'annual_leave', '2099-11-04', '2099-11-04',
  'Holiday', 'pending'
);

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000751","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  pub_id uuid;
begin
  select published_id into pub_id from p75_shifts where source_shift_id = '75000000-0000-4000-8000-000000000011';
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', pub_id);
  raise exception 'FAIL: expected pending leave to refuse open shift request';
exception when sqlstate '55000' then
  -- Expected
end $$;

-- --------------------------------------------------------------------------
-- 2. Approved overlapping leave -> rpc_request_open_shift refused (55000)
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', null, true);
update public.leave_requests
set status = 'approved',
    decided_at = now(),
    decided_by_membership_id = '13000000-0000-4000-8000-000000000001'
where id = '75000000-0000-4000-8000-000000000021';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000751","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  pub_id uuid;
begin
  select published_id into pub_id from p75_shifts where source_shift_id = '75000000-0000-4000-8000-000000000011';
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', pub_id);
  raise exception 'FAIL: expected approved leave to refuse open shift request';
exception when sqlstate '55000' then
  -- Expected
end $$;

-- --------------------------------------------------------------------------
-- 3. Declined / cancelled leave -> request may proceed
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', null, true);
update public.leave_requests
set status = 'declined',
    decided_at = now(),
    decided_by_membership_id = '13000000-0000-4000-8000-000000000001',
    decision_reason = 'Not possible'
where id = '75000000-0000-4000-8000-000000000021';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000751","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  pub_id uuid;
  res jsonb;
begin
  select published_id into pub_id from p75_shifts where source_shift_id = '75000000-0000-4000-8000-000000000011';
  res := public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', pub_id);
  if res->>'status' <> 'pending' then
    raise exception 'FAIL: expected request to succeed with declined leave, got %', res;
  end if;
end $$;

-- Clean up request 1
reset role;
select set_config('request.jwt.claims', null, true);
delete from public.open_shift_requests where rota_week_id = '75000000-0000-4000-8000-000000000001';

-- --------------------------------------------------------------------------
-- 4. Non-overlapping pending leave -> request may proceed
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', null, true);
update public.leave_requests
set status = 'pending',
    decided_at = null,
    decided_by_membership_id = null,
    decision_reason = null,
    start_date = '2099-11-01',
    end_date = '2099-11-02'
where id = '75000000-0000-4000-8000-000000000021';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000751","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  pub_id uuid;
  res jsonb;
begin
  select published_id into pub_id from p75_shifts where source_shift_id = '75000000-0000-4000-8000-000000000011';
  res := public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', pub_id);
  if res->>'status' <> 'pending' then
    raise exception 'FAIL: expected request to succeed with non-overlapping leave, got %', res;
  end if;
end $$;

-- Clean up request 1
reset role;
select set_config('request.jwt.claims', null, true);
delete from public.open_shift_requests where rota_week_id = '75000000-0000-4000-8000-000000000001';

-- --------------------------------------------------------------------------
-- 5. Overnight shift overlap -> leave on following calendar day is refused
-- --------------------------------------------------------------------------
-- Shift 2 starts 2099-11-05 22:00 and ends 2099-11-06 06:00.
-- Leave is on 2099-11-06.
reset role;
select set_config('request.jwt.claims', null, true);
update public.leave_requests
set status = 'approved',
    decided_at = now(),
    decided_by_membership_id = '13000000-0000-4000-8000-000000000001',
    start_date = '2099-11-06',
    end_date = '2099-11-06'
where id = '75000000-0000-4000-8000-000000000021';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000751","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  pub_id uuid;
begin
  select published_id into pub_id from p75_shifts where source_shift_id = '75000000-0000-4000-8000-000000000012';
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', pub_id);
  raise exception 'FAIL: expected overnight leave on day 2 to refuse open shift request';
exception when sqlstate '55000' then
  -- Expected
end $$;

-- --------------------------------------------------------------------------
-- 6. Another employee's leave does not block the applicant
-- --------------------------------------------------------------------------
-- Leave is moved to Liam (staff 14000000-0000-4000-8000-000000000004).
reset role;
select set_config('request.jwt.claims', null, true);
delete from public.leave_requests where id = '75000000-0000-4000-8000-000000000021';
insert into public.leave_requests (
  id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status,
  decided_at, decided_by_membership_id
) values (
  '75000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000004', 'annual_leave', '2099-11-05', '2099-11-06',
  'Liam vacation', 'approved', now(), '13000000-0000-4000-8000-000000000001'
);

-- Noah requests shift 2; should succeed
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000751","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  pub_id uuid;
  res jsonb;
begin
  select published_id into pub_id from p75_shifts where source_shift_id = '75000000-0000-4000-8000-000000000012';
  res := public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', pub_id);
  if res->>'status' <> 'pending' then
    raise exception 'FAIL: expected request to succeed when another employee has leave, got %', res;
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 7. Pending overlapping leave before selection -> selection refused (55000)
-- --------------------------------------------------------------------------
-- Noah has an open-shift request on shift 2 (created above).
-- Now Noah gets pending leave overlapping shift 2 (2099-11-05).
reset role;
select set_config('request.jwt.claims', null, true);
insert into public.leave_requests (
  id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status
) values (
  '75000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000008', 'annual_leave', '2099-11-05', '2099-11-05',
  'Appointment', 'pending'
);

-- Manager tries to select Noah
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  req_id uuid;
begin
  select id into req_id
  from public.open_shift_requests
  where source_shift_id = '75000000-0000-4000-8000-000000000012'
    and staff_member_id = '14000000-0000-4000-8000-000000000008';

  perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', req_id);
  raise exception 'FAIL: expected pending leave to refuse applicant selection';
exception when sqlstate '55000' then
  -- Expected
end $$;

-- --------------------------------------------------------------------------
-- 8. Approved overlapping leave before selection -> selection refused (55000)
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', null, true);
update public.leave_requests
set status = 'approved',
    decided_at = now(),
    decided_by_membership_id = '13000000-0000-4000-8000-000000000001'
where id = '75000000-0000-4000-8000-000000000022';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  req_id uuid;
begin
  select id into req_id
  from public.open_shift_requests
  where source_shift_id = '75000000-0000-4000-8000-000000000012'
    and staff_member_id = '14000000-0000-4000-8000-000000000008';

  perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', req_id);
  raise exception 'FAIL: expected approved leave to refuse applicant selection';
exception when sqlstate '55000' then
  -- Expected
end $$;

-- --------------------------------------------------------------------------
-- 9. Workspace isolation preserved
-- --------------------------------------------------------------------------
do $$
declare
  req_id uuid;
begin
  select id into req_id
  from public.open_shift_requests
  where source_shift_id = '75000000-0000-4000-8000-000000000012'
    and staff_member_id = '14000000-0000-4000-8000-000000000008';

  perform public.rpc_select_open_shift_applicant('20000000-0000-4000-8000-000000000001', req_id);
  raise exception 'FAIL: expected cross-workspace call to fail';
exception when sqlstate 'P0002' or sqlstate '42501' then
  -- Expected
end $$;

-- --------------------------------------------------------------------------
-- 10. Role eligibility / open-shift existing rules still hold
-- --------------------------------------------------------------------------
-- Shift 4 is for Sommelier. Noah does not hold Sommelier role.
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000751","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  pub_id uuid;
begin
  select published_id into pub_id from p75_shifts where source_shift_id = '75000000-0000-4000-8000-000000000014';
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', pub_id);
  raise exception 'FAIL: expected role eligibility check to refuse non-held role';
exception when sqlstate '55000' then
  -- Expected
end $$;

rollback;
