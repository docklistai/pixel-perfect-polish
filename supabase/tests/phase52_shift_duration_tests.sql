-- Phase 52 shift-duration invariant verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase52_shift_duration_tests.sql
--
-- Covers: the 16-hour ceiling at the boundary that binds every writer. The
-- audit proved a manager could insert a 20-hour and a 47-hour shift straight
-- through PostgREST because the rule lived only in TypeScript and in the import
-- RPC. These cases assert the trigger closes that, that it measures overnight
-- shifts correctly, that it refuses UPDATEs as well as INSERTs, and — the
-- calibration control — that the pre-existing zero-length invariant still
-- reports through its own CHECK rather than through the new guard.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000521', 'authenticated', 'authenticated', 'p52.manager@example.com');

insert into public.workspaces (id, slug, name, timezone, rota_start_weekday)
values ('41000000-0000-4000-8000-000000000531', 'p52-dur', 'P52 Duration', 'Europe/London', 0);
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000531', '41000000-0000-4000-8000-000000000531', 'P52 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000531', '41000000-0000-4000-8000-000000000531', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000531', '41000000-0000-4000-8000-000000000531', 'ad000000-0000-4000-8000-000000000521', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values ('46000000-0000-4000-8000-00000000053a', '41000000-0000-4000-8000-000000000531', 'Dur Chef', 'Chef', '43000000-0000-4000-8000-000000000531', 'active', 2400);
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000531', '41000000-0000-4000-8000-000000000531', '42000000-0000-4000-8000-000000000531', '2026-08-03', 'draft');

-- ---------------------------------------------------------------------------
-- Helper: attempt an open shift with the given UTC bounds and report what the
-- database did. Returns 'OK' or 'SQLSTATE:message'. Each attempt runs in its own
-- subtransaction so a refusal does not poison the suite.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.try_shift(p_starts timestamptz, p_ends timestamptz)
returns text
language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into public.shifts (
    id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  )
  values (
    new_id, '41000000-0000-4000-8000-000000000531', '45000000-0000-4000-8000-000000000531',
    '42000000-0000-4000-8000-000000000531', '43000000-0000-4000-8000-000000000531', null,
    (p_starts at time zone 'Europe/London')::date, p_starts, p_ends, 0, 'Chef', 'open'
  );
  delete from public.shifts where id = new_id;
  return 'OK';
exception when others then
  return sqlstate || ':' || sqlerrm;
end;
$$;

do $$
declare
  result text;
begin
  -- -------------------------------------------------------------------------
  -- Case 1: the accepted side of the boundary.
  -- -------------------------------------------------------------------------
  result := pg_temp.try_shift('2026-08-03 06:00:00+01', '2026-08-03 21:59:00+01'); -- 15h59
  if result <> 'OK' then
    raise exception 'FAIL case 1a: a 15h59 shift was refused (got: %)', result;
  end if;

  result := pg_temp.try_shift('2026-08-03 06:00:00+01', '2026-08-03 22:00:00+01'); -- 16h00
  if result <> 'OK' then
    raise exception 'FAIL case 1b: a 16h00 shift was refused; the ceiling must be inclusive (got: %)', result;
  end if;

  -- -------------------------------------------------------------------------
  -- Case 2: the refused side, at the boundary and well beyond it.
  -- -------------------------------------------------------------------------
  result := pg_temp.try_shift('2026-08-03 06:00:00+01', '2026-08-03 22:01:00+01'); -- 16h01
  if result not like '55000:%' then
    raise exception 'FAIL case 2a: a 16h01 shift was not refused with 55000 (got: %)', result;
  end if;
  if result not like '%Shift duration cannot exceed 16 hours.%' then
    raise exception 'FAIL case 2a: the 16h01 refusal did not carry the manager-safe wording (got: %)', result;
  end if;

  result := pg_temp.try_shift('2026-08-03 05:00:00+01', '2026-08-03 22:00:00+01'); -- 17h00
  if result not like '55000:%' then
    raise exception 'FAIL case 2b: a 17h00 shift was not refused with 55000 (got: %)', result;
  end if;

  result := pg_temp.try_shift('2026-08-03 01:00:00+01', '2026-08-05 00:00:00+01'); -- 47h00
  if result not like '55000:%' then
    raise exception 'FAIL case 2c: a 47h00 shift was not refused with 55000 (got: %)', result;
  end if;

  -- -------------------------------------------------------------------------
  -- Case 3: overnight shifts are measured across midnight, not by clock
  -- arithmetic within a day. 14:00 -> 06:00 is 16h and legal; 13:59 -> 06:00 is
  -- 16h01 and is not.
  -- -------------------------------------------------------------------------
  result := pg_temp.try_shift('2026-08-03 14:00:00+01', '2026-08-04 06:00:00+01');
  if result <> 'OK' then
    raise exception 'FAIL case 3a: an overnight 16h00 shift was refused (got: %)', result;
  end if;

  result := pg_temp.try_shift('2026-08-03 13:59:00+01', '2026-08-04 06:00:00+01');
  if result not like '55000:%' then
    raise exception 'FAIL case 3b: an overnight 16h01 shift was not refused (got: %)', result;
  end if;

  -- -------------------------------------------------------------------------
  -- Case 4 (CALIBRATION CONTROL): the suite is only meaningful if the database
  -- still refuses what it refused before. A zero-length shift must fail through
  -- the table's own `ends_at > starts_at` CHECK (23514), NOT through the new
  -- duration guard — the two rules must stay separately attributable.
  -- -------------------------------------------------------------------------
  result := pg_temp.try_shift('2026-08-03 09:00:00+01', '2026-08-03 09:00:00+01');
  if result not like '23514:%' then
    raise exception 'FAIL case 4a: zero-length shift did not fail through the existing CHECK (got: %)', result;
  end if;
  if result like '%Shift duration cannot exceed 16 hours.%' then
    raise exception 'FAIL case 4a: the duration guard swallowed the zero-length case (got: %)', result;
  end if;

  result := pg_temp.try_shift('2026-08-03 17:00:00+01', '2026-08-03 09:00:00+01'); -- reversed
  if result not like '23514:%' then
    raise exception 'FAIL case 4b: a reversed shift did not fail through the existing CHECK (got: %)', result;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 5: the guard binds UPDATE, not only INSERT. A legal shift must not be
-- editable into an illegal one, and the guard deliberately does not restrict
-- itself to time-column changes.
-- ---------------------------------------------------------------------------
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values ('47000000-0000-4000-8000-0000000005b1', '41000000-0000-4000-8000-000000000531', '45000000-0000-4000-8000-000000000531',
        '42000000-0000-4000-8000-000000000531', '43000000-0000-4000-8000-000000000531', null,
        '2026-08-03', '2026-08-03 09:00:00+01', '2026-08-03 17:00:00+01', 0, 'Chef', 'open');

do $$
declare
  refused boolean := false;
begin
  begin
    update public.shifts
    set ends_at = '2026-08-04 02:00:00+01'   -- would become 17h
    where id = '47000000-0000-4000-8000-0000000005b1';
  exception when sqlstate '55000' then
    refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 5: an UPDATE stretched a shift past 16 hours';
  end if;

  -- ...and a legal UPDATE still works, so the guard is not simply blocking edits.
  update public.shifts
  set ends_at = '2026-08-03 23:00:00+01'     -- 14h
  where id = '47000000-0000-4000-8000-0000000005b1';
end;
$$;

-- ---------------------------------------------------------------------------
-- Case 6: role-independence. The audit's bypass was an ordinary authenticated
-- manager writing straight to the table under `shifts_manager_all`, so the
-- guard must hold for that role too — not merely for the table owner.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000521","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  refused boolean := false;
  accepted boolean := false;
begin
  begin
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    )
    values ('41000000-0000-4000-8000-000000000531', '45000000-0000-4000-8000-000000000531',
            '42000000-0000-4000-8000-000000000531', '43000000-0000-4000-8000-000000000531', null,
            '2026-08-04', '2026-08-04 04:00:00+01', '2026-08-05 00:00:00+01', 0, 'Chef', 'open'); -- 20h
  exception when sqlstate '55000' then
    refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 6a: an authenticated manager inserted a 20-hour shift directly';
  end if;

  -- Control: the same role can still write a legal shift, so case 6a proves the
  -- duration rule rather than an accidental permission failure.
  insert into public.shifts (
    workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  )
  values ('41000000-0000-4000-8000-000000000531', '45000000-0000-4000-8000-000000000531',
          '42000000-0000-4000-8000-000000000531', '43000000-0000-4000-8000-000000000531', null,
          '2026-08-04', '2026-08-04 08:00:00+01', '2026-08-04 16:00:00+01', 0, 'Chef', 'open');
  accepted := true;

  if not accepted then
    raise exception 'FAIL case 6b: an authenticated manager could not write a legal shift';
  end if;
end;
$$;

reset role;

rollback;
