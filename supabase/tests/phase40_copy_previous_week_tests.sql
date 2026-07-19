-- Phase 40 transactional copy-previous-week verification. Rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase40_copy_previous_week_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000004001', 'authenticated', 'authenticated', 'p40.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000004002', 'authenticated', 'authenticated', 'p40.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('71000000-0000-4000-8000-000000004001', 'p40-site', 'P40 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('72000000-0000-4000-8000-000000004001', '71000000-0000-4000-8000-000000004001', 'P40 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('73000000-0000-4000-8000-000000004001', '71000000-0000-4000-8000-000000004001', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('74000000-0000-4000-8000-000000004001', '71000000-0000-4000-8000-000000004001', 'ad000000-0000-4000-8000-000000004001', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values
  ('75000000-0000-4000-8000-000000004001', '71000000-0000-4000-8000-000000004001', '74000000-0000-4000-8000-000000004001', '72000000-0000-4000-8000-000000004001', '73000000-0000-4000-8000-000000004001', 'P40 Chef', 'Chef');

-- Source week (2026-06-08) with an assigned day shift and an open overnight
-- shift; target week (2026-06-15) already has one draft shift that the copy
-- replaces.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('76000000-0000-4000-8000-000000004001', '71000000-0000-4000-8000-000000004001', '72000000-0000-4000-8000-000000004001', '2026-06-08', 'published'),
  ('76000000-0000-4000-8000-000000004002', '71000000-0000-4000-8000-000000004001', '72000000-0000-4000-8000-000000004001', '2026-06-15', 'draft');

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status, colour_override
) values
  ('77000000-0000-4000-8000-000000004001','71000000-0000-4000-8000-000000004001','76000000-0000-4000-8000-000000004001','72000000-0000-4000-8000-000000004001','73000000-0000-4000-8000-000000004001','75000000-0000-4000-8000-000000004001',
   '2026-06-08','2026-06-08 09:00:00+01','2026-06-08 17:00:00+01',30,'Chef','scheduled','amber'),
  ('77000000-0000-4000-8000-000000004002','71000000-0000-4000-8000-000000004001','76000000-0000-4000-8000-000000004001','72000000-0000-4000-8000-000000004001','73000000-0000-4000-8000-000000004001',null,
   '2026-06-12','2026-06-12 22:00:00+01','2026-06-13 02:00:00+01',0,'Bar','open',null),
  ('77000000-0000-4000-8000-000000004003','71000000-0000-4000-8000-000000004001','76000000-0000-4000-8000-000000004002','72000000-0000-4000-8000-000000004001','73000000-0000-4000-8000-000000004001','75000000-0000-4000-8000-000000004001',
   '2026-06-16','2026-06-16 12:00:00+01','2026-06-16 18:00:00+01',0,'Chef','scheduled',null);

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000004001","role":"authenticated"}', true);
set local role authenticated;

-- --------------------------------------------------------------------------
-- 1. Successful copy: replaces the target draft, keeps wall-clock times,
--    carries the overnight shift to the next day, marks the week draft.
-- --------------------------------------------------------------------------
do $$
declare
  result jsonb;
  target_count integer;
  old_shift integer;
  mon_local time;
  mon_colour text;
  overnight_end date;
  week_status text;
begin
  result := public.rpc_copy_previous_rota_week(
    '71000000-0000-4000-8000-000000004001',
    '72000000-0000-4000-8000-000000004001',
    '2026-06-15');

  if (result->>'shifts_created')::int <> 2 or (result->>'shifts_replaced')::int <> 1 then
    raise exception 'FAIL: expected 2 created / 1 replaced, got %', result;
  end if;

  select count(*) into target_count from public.shifts
  where rota_week_id = '76000000-0000-4000-8000-000000004002';
  if target_count <> 2 then
    raise exception 'FAIL: target week has % shifts (expected 2)', target_count;
  end if;

  select count(*) into old_shift from public.shifts
  where id = '77000000-0000-4000-8000-000000004003';
  if old_shift <> 0 then
    raise exception 'FAIL: pre-existing target shift survived the replace';
  end if;

  select (starts_at at time zone 'Europe/London')::time, colour_override
  into mon_local, mon_colour
  from public.shifts
  where rota_week_id = '76000000-0000-4000-8000-000000004002' and shift_date = '2026-06-15';
  if mon_local <> '09:00' or mon_colour is distinct from 'amber' then
    raise exception 'FAIL: Monday copy wrong (start %, colour %)', mon_local, mon_colour;
  end if;

  select (ends_at at time zone 'Europe/London')::date into overnight_end
  from public.shifts
  where rota_week_id = '76000000-0000-4000-8000-000000004002' and shift_date = '2026-06-19';
  if overnight_end <> '2026-06-20' then
    raise exception 'FAIL: overnight copy ends on % (expected 2026-06-20)', overnight_end;
  end if;

  select status into week_status from public.rota_weeks
  where id = '76000000-0000-4000-8000-000000004002';
  if week_status <> 'draft' then
    raise exception 'FAIL: target week status % (expected draft)', week_status;
  end if;

  raise notice 'PASS: atomic copy replaces target, keeps wall-clock + overnight + overrides';

  -- Repeat request: deterministic — same result, no duplicates.
  result := public.rpc_copy_previous_rota_week(
    '71000000-0000-4000-8000-000000004001',
    '72000000-0000-4000-8000-000000004001',
    '2026-06-15');
  if (result->>'shifts_created')::int <> 2 or (result->>'shifts_replaced')::int <> 2 then
    raise exception 'FAIL: repeat copy gave %', result;
  end if;
  select count(*) into target_count from public.shifts
  where rota_week_id = '76000000-0000-4000-8000-000000004002';
  if target_count <> 2 then
    raise exception 'FAIL: repeat copy left % shifts (expected 2)', target_count;
  end if;
  raise notice 'PASS: repeat request is deterministic, no duplicates';
end $$;

-- --------------------------------------------------------------------------
-- 2. Insert failure rolls the whole copy back — the draft is never lost.
-- --------------------------------------------------------------------------
reset role;

create function pg_temp.p40_poison_shift()
returns trigger
language plpgsql
as $$
begin
  if new.rota_week_id = '76000000-0000-4000-8000-000000004002'
     and new.role_name = 'Poison' then
    raise exception 'poisoned insert (test)' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger p40_poison_shift_trigger
before insert on public.shifts
for each row execute function pg_temp.p40_poison_shift();

-- Add a poison row to the SOURCE week so the copy fails mid-insert.
insert into public.shifts (
  workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values
  ('71000000-0000-4000-8000-000000004001','76000000-0000-4000-8000-000000004001','72000000-0000-4000-8000-000000004001','73000000-0000-4000-8000-000000004001',null,
   '2026-06-10','2026-06-10 10:00:00+01','2026-06-10 14:00:00+01',0,'Poison','open');

set local role authenticated;

do $$
declare
  target_count integer;
begin
  begin
    perform public.rpc_copy_previous_rota_week(
      '71000000-0000-4000-8000-000000004001',
      '72000000-0000-4000-8000-000000004001',
      '2026-06-15');
    raise exception 'FAIL: poisoned copy did not fail';
  exception when sqlstate '23514' then null;
  end;

  -- The failed copy must not have deleted the existing target shifts.
  select count(*) into target_count from public.shifts
  where rota_week_id = '76000000-0000-4000-8000-000000004002';
  if target_count <> 2 then
    raise exception 'FAIL: after failed copy target has % shifts (expected the 2 pre-failure shifts)', target_count;
  end if;
  raise notice 'PASS: failed insert rolls back completely; target draft survives';
end $$;

reset role;
drop trigger p40_poison_shift_trigger on public.shifts;
delete from public.shifts where role_name = 'Poison';
set local role authenticated;

-- --------------------------------------------------------------------------
-- 3. Missing / empty previous week and archived target are rejected.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    perform public.rpc_copy_previous_rota_week(
      '71000000-0000-4000-8000-000000004001',
      '72000000-0000-4000-8000-000000004001',
      '2026-06-29');
    raise exception 'FAIL: copied from a non-existent previous week';
  exception when sqlstate 'P0002' then
    raise notice 'PASS: missing previous week rejected';
  end;
end $$;

reset role;
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('76000000-0000-4000-8000-000000004003', '71000000-0000-4000-8000-000000004001', '72000000-0000-4000-8000-000000004001', '2026-06-22', 'draft');
set local role authenticated;

do $$
begin
  begin
    perform public.rpc_copy_previous_rota_week(
      '71000000-0000-4000-8000-000000004001',
      '72000000-0000-4000-8000-000000004001',
      '2026-06-29');
    raise exception 'FAIL: copied from an empty previous week';
  exception when sqlstate '55000' then
    raise notice 'PASS: empty previous week rejected';
  end;
end $$;

reset role;
update public.rota_weeks set status = 'archived'
where id = '76000000-0000-4000-8000-000000004002';
set local role authenticated;

do $$
begin
  begin
    perform public.rpc_copy_previous_rota_week(
      '71000000-0000-4000-8000-000000004001',
      '72000000-0000-4000-8000-000000004001',
      '2026-06-15');
    raise exception 'FAIL: copied into an archived week';
  exception when sqlstate '55000' then
    raise notice 'PASS: archived target rejected';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 4. Cross-workspace denial.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000004002","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_copy_previous_rota_week(
      '71000000-0000-4000-8000-000000004001',
      '72000000-0000-4000-8000-000000004001',
      '2026-06-15');
    raise exception 'FAIL: outsider ran a copy';
  exception when sqlstate '42501' then
    raise notice 'PASS: outsider blocked (42501)';
  end;
end $$;

rollback;
