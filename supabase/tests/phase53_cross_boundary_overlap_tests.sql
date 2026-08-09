-- Phase 53 cross-boundary overlap verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase53_cross_boundary_overlap_tests.sql
--
-- Covers: an overlapping assigned shift stops being invisible merely because it
-- sits in a different rota week or at a different location. Phase 52 made
-- overlap an acknowledgeable publish clash but scoped the partner to the same
-- rota week; a Sunday-night shift running into the next week's Monday, and a
-- person booked at two locations in the same calendar week, both published
-- clean from both sides.
--
-- Also asserts the negatives that decide whether the rule is the right one:
-- boundary-adjacent shifts that merely touch, different staff, open shifts, and
-- workspace isolation. And the count semantics: only shifts belonging to the
-- week BEING PUBLISHED are counted, one row per affected shift.
--
-- Scenario weeks are spaced 21 days apart so each group owns two adjacent weeks
-- without any chance of touching its neighbours — the whole point of this phase
-- is that adjacent weeks now see each other.

begin;

create temp table p53_dates as
select ((now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::int) % 7)
  + 210)::date as week_start;

-- A second location in the SAME workspace. `rota_weeks` is unique on
-- (workspace_id, location_id, week_start), so two locations in one calendar
-- week are two different rota weeks — which is exactly why cross-location
-- double-booking was invisible.
insert into public.locations (id, workspace_id, name, timezone, status)
values ('53000000-0000-4000-8000-000000000f01'::uuid,
        '10000000-0000-4000-8000-000000000001'::uuid,
        'Riverside Annexe', 'Europe/London', 'active');

-- A separate workspace, for the isolation assertion.
insert into public.workspaces (id, slug, name, timezone, status)
values ('53000000-0000-4000-8000-000000000f02'::uuid, 'phase53-other', 'Other Co',
        'Europe/London', 'active');
insert into public.locations (id, workspace_id, name, timezone, status)
values ('53000000-0000-4000-8000-000000000f03'::uuid,
        '53000000-0000-4000-8000-000000000f02'::uuid, 'Other Site', 'Europe/London', 'active');
insert into public.departments (id, workspace_id, name, status)
values ('53000000-0000-4000-8000-000000000f04'::uuid,
        '53000000-0000-4000-8000-000000000f02'::uuid, 'Other Dept', 'active');
insert into public.staff_members (id, workspace_id, display_name, role_name, employment_status)
values ('53000000-0000-4000-8000-000000000f05'::uuid,
        '53000000-0000-4000-8000-000000000f02'::uuid, 'Other Person', 'Bartender', 'active');

-- ---------------------------------------------------------------------------
-- Rota weeks
-- ---------------------------------------------------------------------------

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select id, '10000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid, week_start + offset_days, 'draft'
from p53_dates,
     (values
       ('53000000-0000-4000-8000-000000000101'::uuid, 0),     -- A: cross-week, week A
       ('53000000-0000-4000-8000-000000000102'::uuid, 7),     -- A: cross-week, week B
       ('53000000-0000-4000-8000-000000000201'::uuid, 21),    -- B: touch only, week A
       ('53000000-0000-4000-8000-000000000202'::uuid, 28),    -- B: touch only, week B
       ('53000000-0000-4000-8000-000000000301'::uuid, 42),    -- C: different staff, week A
       ('53000000-0000-4000-8000-000000000302'::uuid, 49),    -- C: different staff, week B
       ('53000000-0000-4000-8000-000000000401'::uuid, 63),    -- D: open shift, week A
       ('53000000-0000-4000-8000-000000000402'::uuid, 70),    -- D: open shift, week B
       ('53000000-0000-4000-8000-000000000501'::uuid, 84),    -- E: cross-location, site 1
       ('53000000-0000-4000-8000-000000000601'::uuid, 105),   -- F: cross-department, week A
       ('53000000-0000-4000-8000-000000000602'::uuid, 112),   -- F: cross-department, week B
       ('53000000-0000-4000-8000-000000000701'::uuid, 126),   -- G: multi-partner, partner week
       ('53000000-0000-4000-8000-000000000702'::uuid, 133),   -- G: multi-partner, published week
       ('53000000-0000-4000-8000-000000000801'::uuid, 147),   -- H: workspace isolation
       ('53000000-0000-4000-8000-000000000901'::uuid, 168)    -- I: in-week regression
     ) as weeks(id, offset_days);

-- E's second week: SAME week_start, different location.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '53000000-0000-4000-8000-000000000502'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000f01'::uuid, week_start + 84, 'draft'
from p53_dates;

-- G's second partner: same week_start as the published week, other location.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '53000000-0000-4000-8000-000000000703'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000f01'::uuid, week_start + 133, 'draft'
from p53_dates;

-- The other workspace's week, deliberately at the same dates as H.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '53000000-0000-4000-8000-000000000f06'::uuid, '53000000-0000-4000-8000-000000000f02'::uuid,
       '53000000-0000-4000-8000-000000000f03'::uuid, week_start + 147, 'draft'
from p53_dates;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

-- A: the commissioned defect. Week A's final-day overnight shift runs into
-- week B's first-day shift, for one staff member.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001101'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000101'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 6,
       (week_start + 6 + time '22:00') at time zone 'Europe/London',
       (week_start + 7 + time '06:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001102'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000102'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 7,
       (week_start + 7 + time '05:00') at time zone 'Europe/London',
       (week_start + 7 + time '13:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates;

-- B: the same geometry, but the shifts merely touch at 06:00. Half-open
-- intervals mean a clean handover across a week boundary is NOT a clash.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001201'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000201'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 27,
       (week_start + 27 + time '22:00') at time zone 'Europe/London',
       (week_start + 28 + time '06:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001202'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000202'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 28,
       (week_start + 28 + time '06:00') at time zone 'Europe/London',
       (week_start + 28 + time '14:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates;

-- C: overlapping across the boundary, but two DIFFERENT staff members.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001301'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000301'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 48,
       (week_start + 48 + time '22:00') at time zone 'Europe/London',
       (week_start + 49 + time '06:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001302'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000302'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000002'::uuid,
       week_start + 49,
       (week_start + 49 + time '05:00') at time zone 'Europe/London',
       (week_start + 49 + time '13:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates;

-- D: overlapping across the boundary, but the other side is an OPEN shift.
-- Nobody is committed to it, so it cannot double-book anyone.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001401'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000401'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 69,
       (week_start + 69 + time '22:00') at time zone 'Europe/London',
       (week_start + 70 + time '06:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001402'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000402'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, null,
       week_start + 70,
       (week_start + 70 + time '05:00') at time zone 'Europe/London',
       (week_start + 70 + time '13:00') at time zone 'Europe/London',
       30, 'Bartender', 'open'
from p53_dates;

-- E: one person, one calendar week, TWO locations. Two rota weeks, so phase 52
-- could not see this either.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001501'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000501'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 84,
       (week_start + 84 + time '09:00') at time zone 'Europe/London',
       (week_start + 84 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001502'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000502'::uuid, '53000000-0000-4000-8000-000000000f01'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 84,
       (week_start + 84 + time '12:00') at time zone 'Europe/London',
       (week_start + 84 + time '20:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates;

-- F: across the week boundary AND across departments. A different department
-- does not make simultaneous work possible.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001601'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000601'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000002'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 111,
       (week_start + 111 + time '22:00') at time zone 'Europe/London',
       (week_start + 112 + time '06:00') at time zone 'Europe/London',
       30, 'Chef', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001602'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000602'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 112,
       (week_start + 112 + time '05:00') at time zone 'Europe/London',
       (week_start + 112 + time '13:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates;

-- G: ONE shift in the published week overlapping TWO external shifts — one in
-- the previous week, one at another location in the same week.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001701'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000701'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 132,
       (week_start + 132 + time '22:00') at time zone 'Europe/London',
       (week_start + 133 + time '06:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001702'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000702'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 133,
       (week_start + 133 + time '05:00') at time zone 'Europe/London',
       (week_start + 133 + time '13:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001703'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000703'::uuid, '53000000-0000-4000-8000-000000000f01'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 133,
       (week_start + 133 + time '08:00') at time zone 'Europe/London',
       (week_start + 133 + time '16:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates;

-- H: identical times in a DIFFERENT workspace. Must never clash.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '53000000-0000-4000-8000-000000001801'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000801'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 147,
       (week_start + 147 + time '09:00') at time zone 'Europe/London',
       (week_start + 147 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates
union all
select '53000000-0000-4000-8000-000000001802'::uuid, '53000000-0000-4000-8000-000000000f02'::uuid,
       '53000000-0000-4000-8000-000000000f06'::uuid, '53000000-0000-4000-8000-000000000f03'::uuid,
       '53000000-0000-4000-8000-000000000f04'::uuid, '53000000-0000-4000-8000-000000000f05'::uuid,
       week_start + 147,
       (week_start + 147 + time '10:00') at time zone 'Europe/London',
       (week_start + 147 + time '18:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates;

-- I: two overlapping shifts INSIDE one week — the phase 52 case, unchanged.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select id, '10000000-0000-4000-8000-000000000001'::uuid,
       '53000000-0000-4000-8000-000000000901'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 169,
       (week_start + 169 + start_time) at time zone 'Europe/London',
       (week_start + 169 + end_time) at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p53_dates,
     (values
       ('53000000-0000-4000-8000-000000001901'::uuid, time '09:00', time '17:00'),
       ('53000000-0000-4000-8000-000000001902'::uuid, time '10:00', time '18:00')
     ) as s(id, start_time, end_time);

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Case 1 (§10 case A, both draft): publishing week A sees week B's overlap and
-- refuses without acknowledgement, naming ONLY week A's shift.
-- ---------------------------------------------------------------------------
do $$
declare
  clash_detail text;
  refused boolean := false;
begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '53000000-0000-4000-8000-000000000101'::uuid,
      false
    );
  exception when sqlstate '55000' then
    refused := true;
    get stacked diagnostics clash_detail = pg_exception_detail;
  end;

  if not refused then
    raise exception 'FAIL case 1: week A published without seeing the cross-week overlap';
  end if;

  if clash_detail not like '%overlapping_shift%' then
    raise exception 'FAIL case 1: refusal did not identify overlap as the kind (detail: %)',
      clash_detail;
  end if;

  if clash_detail not like '%53000000-0000-4000-8000-000000001101%' then
    raise exception 'FAIL case 1: week A''s own shift was not named (detail: %)', clash_detail;
  end if;

  -- COUNT SEMANTICS: the external half is never reported. The manager cannot
  -- act on a shift that is not in the week in front of them.
  if clash_detail like '%53000000-0000-4000-8000-000000001102%' then
    raise exception 'FAIL case 1: week B''s shift was reported while publishing week A (detail: %)',
      clash_detail;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 2: acknowledging publishes week A. Overlap stays an override, never a
-- blocker.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000101'::uuid,
    true
  );

  if (result->>'overlapping_shift_clashes')::integer <> 1 then
    raise exception 'FAIL case 2: expected 1 overlapping-shift clash, got %',
      result->>'overlapping_shift_clashes';
  end if;

  if (result->>'shift_count')::integer <> 1 then
    raise exception 'FAIL case 2: snapshot shift count was %', result->>'shift_count';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 3 (§10 case B, symmetry): week B now publishes against an ALREADY
-- PUBLISHED week A, reading its live draft rows. Detection must be symmetric.
-- ---------------------------------------------------------------------------
do $$
declare
  clash_detail text;
  refused boolean := false;
  result jsonb;
begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '53000000-0000-4000-8000-000000000102'::uuid,
      false
    );
  exception when sqlstate '55000' then
    refused := true;
    get stacked diagnostics clash_detail = pg_exception_detail;
  end;

  if not refused then
    raise exception 'FAIL case 3: week B published without seeing week A''s overlap';
  end if;

  if clash_detail not like '%53000000-0000-4000-8000-000000001102%' then
    raise exception 'FAIL case 3: week B''s own shift was not named (detail: %)', clash_detail;
  end if;

  if clash_detail like '%53000000-0000-4000-8000-000000001101%' then
    raise exception 'FAIL case 3: week A''s shift was reported while publishing week B (detail: %)',
      clash_detail;
  end if;

  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000102'::uuid,
    true
  );

  if (result->>'overlapping_shift_clashes')::integer <> 1 then
    raise exception 'FAIL case 3: acknowledged publish reported % clashes',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 4 (§10 case D): both weeks are now published. Re-publishing week A must
-- still see the live overlap, and must not mutate the earlier snapshot.
-- ---------------------------------------------------------------------------
do $$
declare
  refused boolean := false;
  result jsonb;
  first_snapshot_shift_count integer;
begin
  select count(*) into first_snapshot_shift_count
  from public.published_rota_shifts as shift
  join public.published_rota_snapshots as snapshot
    on snapshot.workspace_id = shift.workspace_id
   and snapshot.id = shift.snapshot_id
  where snapshot.workspace_id = '10000000-0000-4000-8000-000000000001'::uuid
    and snapshot.rota_week_id = '53000000-0000-4000-8000-000000000101'::uuid
    and snapshot.version = 1;

  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '53000000-0000-4000-8000-000000000101'::uuid,
      false
    );
  exception when sqlstate '55000' then
    refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 4: republish ignored the still-present overlap';
  end if;

  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000101'::uuid,
    true
  );

  if (result->>'version')::integer <> 2 then
    raise exception 'FAIL case 4: republish produced version %', result->>'version';
  end if;

  -- The version 1 snapshot must be exactly as it was. Historical snapshots are
  -- immutable; conflict detection reads live `shifts`, never them.
  if (select count(*)
      from public.published_rota_shifts as shift
      join public.published_rota_snapshots as snapshot
        on snapshot.workspace_id = shift.workspace_id
       and snapshot.id = shift.snapshot_id
      where snapshot.workspace_id = '10000000-0000-4000-8000-000000000001'::uuid
        and snapshot.rota_week_id = '53000000-0000-4000-8000-000000000101'::uuid
        and snapshot.version = 1) <> first_snapshot_shift_count then
    raise exception 'FAIL case 4: the version 1 snapshot changed during republish';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 5: boundary-adjacent shifts that merely touch are NOT a clash, from
-- either side. Half-open intervals across a week boundary.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000201'::uuid,
    false
  );
  if (result->>'overlapping_shift_clashes')::integer <> 0 then
    raise exception 'FAIL case 5: a clean handover across the boundary reported % clashes',
      result->>'overlapping_shift_clashes';
  end if;

  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000202'::uuid,
    false
  );
  if (result->>'overlapping_shift_clashes')::integer <> 0 then
    raise exception 'FAIL case 5: the following week reported % clashes for a clean handover',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 6: different staff members never clash across the boundary.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000302'::uuid,
    false
  );
  if (result->>'overlapping_shift_clashes')::integer <> 0 then
    raise exception 'FAIL case 6: two different staff members reported % clashes',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 7: an OPEN shift on the other side of the boundary is nobody's
-- commitment and cannot double-book.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000401'::uuid,
    false
  );
  if (result->>'overlapping_shift_clashes')::integer <> 0 then
    raise exception 'FAIL case 7: an open shift across the boundary reported % clashes',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 8: CROSS-LOCATION, same calendar week. Two rota weeks, one person, one
-- clock. Both sides must see it.
-- ---------------------------------------------------------------------------
do $$
declare
  refused boolean := false;
  result jsonb;
begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '53000000-0000-4000-8000-000000000501'::uuid,
      false
    );
  exception when sqlstate '55000' then
    refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 8: a cross-location double-booking published clean';
  end if;

  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000501'::uuid,
    true
  );
  if (result->>'overlapping_shift_clashes')::integer <> 1 then
    raise exception 'FAIL case 8: expected 1 clash at site 1, got %',
      result->>'overlapping_shift_clashes';
  end if;

  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000502'::uuid,
    true
  );
  if (result->>'overlapping_shift_clashes')::integer <> 1 then
    raise exception 'FAIL case 8: expected 1 clash at site 2, got %',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 9: a different DEPARTMENT does not exempt an overlap either.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000602'::uuid,
    true
  );
  if (result->>'overlapping_shift_clashes')::integer <> 1 then
    raise exception 'FAIL case 9: a cross-department overlap reported % clashes',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 10: one published-week shift overlapping TWO external shifts counts
-- ONCE. One shift the manager must look at is one row, never one per pair.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000702'::uuid,
    true
  );
  if (result->>'overlapping_shift_clashes')::integer <> 1 then
    raise exception 'FAIL case 10: one shift with two external partners reported % clashes',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 11: WORKSPACE ISOLATION. Identical times in another workspace can never
-- clash, whatever the times say.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000801'::uuid,
    false
  );
  if (result->>'overlapping_shift_clashes')::integer <> 0 then
    raise exception 'FAIL case 11: another workspace''s shift produced % clashes',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 12: PHASE 52 REGRESSION. Two overlapping shifts inside one week still
-- report exactly two affected shifts, unchanged by the broadened partner side.
-- ---------------------------------------------------------------------------
do $$
declare
  refused boolean := false;
  result jsonb;
begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '53000000-0000-4000-8000-000000000901'::uuid,
      false
    );
  exception when sqlstate '55000' then
    refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 12: an in-week double-booking published without acknowledgement';
  end if;

  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000901'::uuid,
    true
  );
  if (result->>'overlapping_shift_clashes')::integer <> 2 then
    raise exception 'FAIL case 12: in-week overlap reported % clashes, expected 2',
      result->>'overlapping_shift_clashes';
  end if;

  -- The other clash kinds must be untouched by this phase.
  if (result->>'approved_leave_clashes')::integer <> 0
     or (result->>'one_off_unavailability_clashes')::integer <> 0
     or (result->>'recurring_day_off_clashes')::integer <> 0 then
    raise exception 'FAIL case 12: a non-overlap clash kind changed (%)', result::text;
  end if;
end;
$$;

select 'phase 53 cross-boundary overlap tests passed' as result;

rollback;
