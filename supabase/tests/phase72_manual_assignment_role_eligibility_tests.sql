-- Phase 72: Enforce role eligibility on manual shift assignment tests (R3)
--
-- Proves:
-- 1. Direct manual shift assignment with primary role succeeds.
-- 2. Direct manual shift assignment with secondary eligible role succeeds.
-- 3. Direct manual shift assignment with ineligible role is REFUSED with SQLSTATE 55000.
-- 4. Open shift (staff_member_id is null) with any role succeeds.
-- 5. Updating an open shift to assign an ineligible staff member is REFUSED (55000).
-- 6. Updating an assigned shift to an ineligible role is REFUSED (55000).
-- 7. Updating an assigned shift to a secondary eligible role succeeds.

begin;

create temp table p72_dates as
select ((now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::int) % 7)
  + 140)::date as week_start;

grant select on p72_dates to authenticated;

-- Rota week for testing
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '72000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001', week_start, 'draft'
from p72_dates;

-- Setup: Sophie Carter (1400...0001) has primary role 'FOH Supervisor'.
-- Give Sophie a secondary eligible role 'Barista'.
insert into public.staff_eligible_roles (workspace_id, staff_member_id, role_name, role_key)
values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 'Barista', 'barista');

-- Run as authenticated manager
select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 1: Primary role assignment succeeds
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '72000000-0000-4000-8000-000000000011',
       '10000000-0000-4000-8000-000000000001',
       '72000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001',
       '12000000-0000-4000-8000-000000000001',
       '14000000-0000-4000-8000-000000000001', week_start,
       (week_start + time '09:00') at time zone 'Europe/London',
       (week_start + time '17:00') at time zone 'Europe/London',
       30, 'FOH Supervisor', 'scheduled'
from p72_dates;

-- Test 2: Secondary eligible role assignment succeeds
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '72000000-0000-4000-8000-000000000012',
       '10000000-0000-4000-8000-000000000001',
       '72000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001',
       '12000000-0000-4000-8000-000000000001',
       '14000000-0000-4000-8000-000000000001', week_start + 1,
       (week_start + 1 + time '09:00') at time zone 'Europe/London',
       (week_start + 1 + time '17:00') at time zone 'Europe/London',
       30, 'Barista', 'scheduled'
from p72_dates;

-- Test 3: Ineligible role assignment is REFUSED (55000)
do $$
begin
  insert into public.shifts (
    id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  )
  select '72000000-0000-4000-8000-000000000013',
         '10000000-0000-4000-8000-000000000001',
         '72000000-0000-4000-8000-000000000001',
         '11000000-0000-4000-8000-000000000001',
         '12000000-0000-4000-8000-000000000001',
         '14000000-0000-4000-8000-000000000001', week_start + 2,
         (week_start + 2 + time '09:00') at time zone 'Europe/London',
         (week_start + 2 + time '17:00') at time zone 'Europe/London',
         30, 'Head Chef', 'scheduled'
  from p72_dates;
  raise exception 'FAIL: assigned ineligible role Head Chef to Sophie Carter';
exception when sqlstate '55000' then
  -- Expected refusal
end $$;

-- Test 4: Open shift with any role succeeds
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '72000000-0000-4000-8000-000000000014',
       '10000000-0000-4000-8000-000000000001',
       '72000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001',
       '12000000-0000-4000-8000-000000000001',
       null, week_start + 3,
       (week_start + 3 + time '09:00') at time zone 'Europe/London',
       (week_start + 3 + time '17:00') at time zone 'Europe/London',
       30, 'Head Chef', 'open'
from p72_dates;

-- Test 5: Updating open shift to ineligible staff member is REFUSED (55000)
do $$
begin
  update public.shifts
  set staff_member_id = '14000000-0000-4000-8000-000000000001',
      assignment_status = 'scheduled'
  where id = '72000000-0000-4000-8000-000000000014';
  raise exception 'FAIL: updated open shift to ineligible staff member';
exception when sqlstate '55000' then
  -- Expected refusal
end $$;

-- Test 6: Updating assigned shift to ineligible role is REFUSED (55000)
do $$
begin
  update public.shifts
  set role_name = 'Bartender'
  where id = '72000000-0000-4000-8000-000000000011';
  raise exception 'FAIL: updated shift to ineligible role Bartender';
exception when sqlstate '55000' then
  -- Expected refusal
end $$;

-- Test 7: Updating assigned shift to secondary eligible role succeeds
update public.shifts
set role_name = 'Barista'
where id = '72000000-0000-4000-8000-000000000011';

rollback;
