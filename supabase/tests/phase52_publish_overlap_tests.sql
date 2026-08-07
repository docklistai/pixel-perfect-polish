-- Phase 52 overlapping-shift publish-clash verification. Runs inside one
-- rolled-back transaction against the local stack; the seeded database is left
-- untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase52_publish_overlap_tests.sql
--
-- Covers: double-booking becomes an acknowledgeable publish clash rather than
-- something publication ignored entirely. Overlap must NOT become an
-- unconditional blocker — the manager keeps the override, exactly as with
-- approved leave. Also asserts the negative cases that decide whether the rule
-- is the right one: adjacent shifts, different staff, open shifts, cross-midnight
-- overlap, and that three mutually overlapping shifts report three clashes
-- (one per affected shift) rather than pair-inflated or duplicated output.
--
-- Uses the seeded workspace 10000000-…0001 and its active staff, matching the
-- phase 43 publish suite. Each scenario gets its own rota week, since publication
-- is week-scoped and it keeps the cases independent.

begin;

create temp table p52_dates as
select ((now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::int) % 7)
  + 105)::date as week_start;

-- One week per scenario, all in the seeded workspace/location.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select id, '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
       week_start + offset_days, 'draft'
from p52_dates,
     (values
       ('52000000-0000-4000-8000-000000000001'::uuid, 0),    -- overlapping pair
       ('52000000-0000-4000-8000-000000000002'::uuid, 7),    -- adjacent, must NOT clash
       ('52000000-0000-4000-8000-000000000003'::uuid, 14),   -- different staff / open shift
       ('52000000-0000-4000-8000-000000000004'::uuid, 21),   -- cross-midnight overlap
       ('52000000-0000-4000-8000-000000000005'::uuid, 28)    -- three mutually overlapping
     ) as weeks(id, offset_days);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

-- Week 1: two overlapping shifts for ONE staff member (09:00-17:00, 10:00-18:00).
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select id, '10000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001',
       '14000000-0000-4000-8000-000000000001', week_start + 1,
       (week_start + 1 + start_time) at time zone 'Europe/London',
       (week_start + 1 + end_time) at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p52_dates,
     (values
       ('52000000-0000-4000-8000-00000000a001'::uuid, time '09:00', time '17:00'),
       ('52000000-0000-4000-8000-00000000a002'::uuid, time '10:00', time '18:00')
     ) as s(id, start_time, end_time);

-- Week 2: adjacent shifts for one staff member. 17:00 ends exactly as 17:00
-- begins; half-open intervals mean this is NOT an overlap.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select id, '10000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000002',
       '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001',
       '14000000-0000-4000-8000-000000000001', week_start + 8,
       (week_start + 8 + start_time) at time zone 'Europe/London',
       (week_start + 8 + end_time) at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p52_dates,
     (values
       ('52000000-0000-4000-8000-00000000b001'::uuid, time '09:00', time '17:00'),
       ('52000000-0000-4000-8000-00000000b002'::uuid, time '17:00', time '22:00')
     ) as s(id, start_time, end_time);

-- Week 3: same times, but one shift belongs to a DIFFERENT staff member and one
-- is OPEN. Neither may register as a double-booking.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select id, '10000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000003',
       '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001',
       staff_id, week_start + 15,
       (week_start + 15 + time '09:00') at time zone 'Europe/London',
       (week_start + 15 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', status
from p52_dates,
     (values
       ('52000000-0000-4000-8000-00000000c001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid, 'scheduled'),
       ('52000000-0000-4000-8000-00000000c002'::uuid, '14000000-0000-4000-8000-000000000002'::uuid, 'scheduled'),
       ('52000000-0000-4000-8000-00000000c003'::uuid, null::uuid, 'open')
     ) as s(id, staff_id, status);

-- Week 4: an overnight shift running into the next day's early shift. The
-- overlap only exists across midnight, so a same-day-only rule would miss it.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '52000000-0000-4000-8000-00000000d001'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '52000000-0000-4000-8000-000000000004'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 22,
       (week_start + 22 + time '22:00') at time zone 'Europe/London',
       (week_start + 23 + time '06:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p52_dates
union all
select '52000000-0000-4000-8000-00000000d002'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '52000000-0000-4000-8000-000000000004'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000001'::uuid, '14000000-0000-4000-8000-000000000001'::uuid,
       week_start + 23,
       (week_start + 23 + time '05:00') at time zone 'Europe/London',
       (week_start + 23 + time '13:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p52_dates;

-- Week 5: THREE mutually overlapping shifts for one staff member.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select id, '10000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000005',
       '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001',
       '14000000-0000-4000-8000-000000000001', week_start + 29,
       (week_start + 29 + start_time) at time zone 'Europe/London',
       (week_start + 29 + end_time) at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p52_dates,
     (values
       ('52000000-0000-4000-8000-00000000e001'::uuid, time '09:00', time '17:00'),
       ('52000000-0000-4000-8000-00000000e002'::uuid, time '10:00', time '18:00'),
       ('52000000-0000-4000-8000-00000000e003'::uuid, time '11:00', time '19:00')
     ) as s(id, start_time, end_time);

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Case 1: an unacknowledged overlap refuses publication, and identifies itself
-- as `overlapping_shift` in the clash detail the RPC attaches.
-- ---------------------------------------------------------------------------
do $$
declare
  clash_detail text;
  refused boolean := false;
begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      false
    );
  exception when sqlstate '55000' then
    refused := true;
    get stacked diagnostics clash_detail = pg_exception_detail;
    if sqlerrm not like '%approved scheduling constraints clash%' then
      raise exception 'FAIL case 1: overlap refused through the wrong message: %', sqlerrm;
    end if;
  end;

  if not refused then
    raise exception 'FAIL case 1: a double-booked week published without acknowledgement';
  end if;

  if clash_detail not like '%overlapping_shift%' then
    raise exception 'FAIL case 1: the refusal did not identify overlap as the clash kind (detail: %)',
      clash_detail;
  end if;

  -- Both shifts must be named: the clash set is one row per affected shift.
  if clash_detail not like '%52000000-0000-4000-8000-00000000a001%'
     or clash_detail not like '%52000000-0000-4000-8000-00000000a002%' then
    raise exception 'FAIL case 1: the clash detail did not name both overlapping shifts (detail: %)',
      clash_detail;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 2: acknowledging the same overlap publishes it. Overlap must remain an
-- override, never an unconditional blocker, and the snapshot must be complete.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
  snapshot_shift_count integer;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000001',
    true
  );

  if (result->>'overlapping_shift_clashes')::integer <> 2 then
    raise exception 'FAIL case 2: expected 2 overlapping-shift clashes, got %',
      result->>'overlapping_shift_clashes';
  end if;

  if (result->>'shift_count')::integer <> 2 then
    raise exception 'FAIL case 2: expected 2 published shifts, got %', result->>'shift_count';
  end if;

  select count(*) into snapshot_shift_count
  from public.published_rota_shifts
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and snapshot_id = (result->>'snapshot_id')::uuid;

  if snapshot_shift_count <> 2 then
    raise exception 'FAIL case 2: the snapshot holds % shifts, expected 2', snapshot_shift_count;
  end if;

  -- The intended shifts, not some other week's.
  if not exists (
    select 1 from public.published_rota_shifts
    where snapshot_id = (result->>'snapshot_id')::uuid
      and source_shift_id = '52000000-0000-4000-8000-00000000a001'
  ) or not exists (
    select 1 from public.published_rota_shifts
    where snapshot_id = (result->>'snapshot_id')::uuid
      and source_shift_id = '52000000-0000-4000-8000-00000000a002'
  ) then
    raise exception 'FAIL case 2: the snapshot does not contain both source shifts';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 3: adjacent shifts are not an overlap. Half-open intervals mean a shift
-- ending at 17:00 does not collide with one starting at 17:00.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000002',
    false
  );

  if (result->>'overlapping_shift_clashes')::integer <> 0 then
    raise exception 'FAIL case 3: adjacent shifts reported % overlap clashes, expected 0',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 4: identical times do not clash across DIFFERENT staff members, and an
-- open shift never participates in a double-booking.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000003',
    false
  );

  if (result->>'overlapping_shift_clashes')::integer <> 0 then
    raise exception 'FAIL case 4: different staff / open shift reported % overlap clashes, expected 0',
      result->>'overlapping_shift_clashes';
  end if;

  if (result->>'shift_count')::integer <> 3 then
    raise exception 'FAIL case 4: expected all 3 shifts published, got %', result->>'shift_count';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 5: a cross-midnight overlap is detected. The overnight shift ends at
-- 06:00 the following day and the next shift starts at 05:00, so the collision
-- exists only across the date boundary.
-- ---------------------------------------------------------------------------
do $$
declare
  clash_detail text;
  refused boolean := false;
  result jsonb;
begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000004',
      false
    );
  exception when sqlstate '55000' then
    refused := true;
    get stacked diagnostics clash_detail = pg_exception_detail;
  end;

  if not refused then
    raise exception 'FAIL case 5: a cross-midnight double-booking published unacknowledged';
  end if;

  if clash_detail not like '%overlapping_shift%' then
    raise exception 'FAIL case 5: cross-midnight overlap was not reported as overlapping_shift (detail: %)',
      clash_detail;
  end if;

  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000004',
    true
  );
  if (result->>'overlapping_shift_clashes')::integer <> 2 then
    raise exception 'FAIL case 5: expected 2 cross-midnight overlap clashes, got %',
      result->>'overlapping_shift_clashes';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 6: three mutually overlapping shifts report exactly three clashes — one
-- per affected shift. Pair-based counting would give 6 and an undeduplicated
-- join would give more; both would misreport the number to the manager and
-- break the frontend mirror, which counts unique shift ids.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
  overlap_rows integer;
  distinct_shift_ids integer;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000005',
    true
  );

  if (result->>'overlapping_shift_clashes')::integer <> 3 then
    raise exception 'FAIL case 6: three mutually overlapping shifts reported % clashes, expected 3',
      result->>'overlapping_shift_clashes';
  end if;

  -- Deterministic, duplicate-free output: as many rows as distinct shift ids.
  select count(*), count(distinct entry->>'shift_id')
  into overlap_rows, distinct_shift_ids
  from public.audit_events as audit,
       lateral jsonb_array_elements(audit.details->'scheduling_constraint_clashes') as entry
  where audit.workspace_id = '10000000-0000-4000-8000-000000000001'
    and audit.subject_id = (result->>'snapshot_id')::uuid
    and audit.action = 'rota.published'
    and entry->>'kind' = 'overlapping_shift';

  if overlap_rows <> 3 or distinct_shift_ids <> 3 then
    raise exception 'FAIL case 6: clash payload had % rows over % distinct shifts, expected 3 and 3',
      overlap_rows, distinct_shift_ids;
  end if;
end;
$$;

reset role;

rollback;
