-- Phase 15 demand-template verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase15_demand_templates_tests.sql
--
-- Self-contained: builds its own workspace, manager, two Monday-start draft
-- weeks, and shifts, then exercises save + apply and checks the timezone /
-- overnight reconstruction and role isolation.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000201', 'authenticated', 'authenticated', 'p15.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000202', 'authenticated', 'authenticated', 'p15.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000201', 'p15-site', 'P15 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000201', '41000000-0000-4000-8000-000000000201', 'P15 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000201', '41000000-0000-4000-8000-000000000201', 'Front of House');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000201', '41000000-0000-4000-8000-000000000201', 'ad000000-0000-4000-8000-000000000201', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

-- Week A (source, 2026-06-15 Monday) and Week B (target, 2026-06-22 Monday).
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('45000000-0000-4000-8000-00000000000a', '41000000-0000-4000-8000-000000000201', '42000000-0000-4000-8000-000000000201', '2026-06-15', 'draft'),
  ('45000000-0000-4000-8000-00000000000b', '41000000-0000-4000-8000-000000000201', '42000000-0000-4000-8000-000000000201', '2026-06-22', 'draft');

-- Shifts in week A: 2x Sat FOH 17:00-23:00, 1x Mon FOH 09:00-17:00,
-- 1x Fri Bar 22:00 -> Sat 02:00 (overnight). All open (no staff needed).
insert into public.shifts (
  workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values
  ('41000000-0000-4000-8000-000000000201', '45000000-0000-4000-8000-00000000000a', '42000000-0000-4000-8000-000000000201', '43000000-0000-4000-8000-000000000201', null,
   '2026-06-20', '2026-06-20 17:00:00+01', '2026-06-20 23:00:00+01', 30, 'FOH', 'open'),
  ('41000000-0000-4000-8000-000000000201', '45000000-0000-4000-8000-00000000000a', '42000000-0000-4000-8000-000000000201', '43000000-0000-4000-8000-000000000201', null,
   '2026-06-20', '2026-06-20 17:00:00+01', '2026-06-20 23:00:00+01', 30, 'FOH', 'open'),
  ('41000000-0000-4000-8000-000000000201', '45000000-0000-4000-8000-00000000000a', '42000000-0000-4000-8000-000000000201', '43000000-0000-4000-8000-000000000201', null,
   '2026-06-15', '2026-06-15 09:00:00+01', '2026-06-15 17:00:00+01', 0, 'Kitchen', 'open'),
  ('41000000-0000-4000-8000-000000000201', '45000000-0000-4000-8000-00000000000a', '42000000-0000-4000-8000-000000000201', '43000000-0000-4000-8000-000000000201', null,
   '2026-06-19', '2026-06-19 22:00:00+01', '2026-06-20 02:00:00+01', 0, 'Bar', 'open');

-- --------------------------------------------------------------------------
-- MANAGER: save a template from week A, then apply it to week B.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000201","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  save_result jsonb;
  v_template_id uuid;
  slot_count bigint;
  foh_qty int;
  foh_start time;
  apply_result jsonb;
  created int;
  sat_local time;
  sat_date date;
  bar_end timestamptz;
begin
  save_result := public.rpc_save_demand_template(
    '41000000-0000-4000-8000-000000000201', '45000000-0000-4000-8000-00000000000a', 'Busy weekend');
  v_template_id := (save_result->>'template_id')::uuid;

  select count(*) into slot_count
  from public.rota_demand_template_slots where template_id = v_template_id;
  if slot_count <> 3 then
    raise exception 'FAIL: expected 3 demand slots, got %', slot_count;
  end if;

  select quantity, start_time into foh_qty, foh_start
  from public.rota_demand_template_slots
  where template_id = v_template_id and role_name = 'FOH' and weekday = 5;
  if foh_qty <> 2 or foh_start <> '17:00' then
    raise exception 'FAIL: Saturday FOH slot wrong (qty %, start %)', foh_qty, foh_start;
  end if;
  raise notice 'PASS: template derived 3 slots incl. Saturday FOH x2 at 17:00';

  apply_result := public.rpc_apply_demand_template(
    '41000000-0000-4000-8000-000000000201', '45000000-0000-4000-8000-00000000000b', v_template_id);
  created := (apply_result->>'open_shifts_created')::int;
  if created <> 4 then
    raise exception 'FAIL: expected 4 open shifts created, got %', created;
  end if;

  -- Every applied shift is open and lands in week B.
  if exists (
    select 1 from public.shifts
    where rota_week_id = '45000000-0000-4000-8000-00000000000b'
      and (assignment_status <> 'open' or staff_member_id is not null)
  ) then
    raise exception 'FAIL: applied shifts were not all open';
  end if;

  -- Saturday FOH lands on 2026-06-27 at local 17:00 (timezone round-trip).
  select (starts_at at time zone 'Europe/London')::time, shift_date
  into sat_local, sat_date
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000000b'
    and role_name = 'FOH'
  limit 1;
  if sat_local <> '17:00' or sat_date <> '2026-06-27' then
    raise exception 'FAIL: Saturday FOH reconstructed wrong (% on %)', sat_local, sat_date;
  end if;
  raise notice 'PASS: applied 4 open shifts; Saturday FOH at local 17:00 on 2026-06-27';

  -- Overnight Bar shift ends Saturday 02:00 local of the following day.
  select ends_at into bar_end
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000000b' and role_name = 'Bar';
  if (bar_end at time zone 'Europe/London')::time <> '02:00'
     or (bar_end at time zone 'Europe/London')::date <> '2026-06-27' then
    raise exception 'FAIL: overnight Bar shift reconstructed wrong (%)', bar_end;
  end if;
  raise notice 'PASS: overnight Bar shift ends 02:00 on the following day';
end $$;

-- --------------------------------------------------------------------------
-- OUTSIDER: cannot save or apply templates.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000202","role":"authenticated"}', true);

do $$
declare
  visible bigint;
begin
  begin
    perform public.rpc_save_demand_template(
      '41000000-0000-4000-8000-000000000201', '45000000-0000-4000-8000-00000000000a', 'Sneaky');
    raise exception 'FAIL: outsider saved a template';
  exception when sqlstate '42501' then null;
  end;

  select count(*) into visible from public.rota_demand_templates;
  if visible <> 0 then
    raise exception 'FAIL: outsider sees % templates (expected 0)', visible;
  end if;
  raise notice 'PASS: outsider cannot save or read templates';
end $$;

-- --------------------------------------------------------------------------
-- DELETE: outsider deletes nothing; the manager deletes the template directly
-- (the UI's delete path) and its slots cascade away.
-- --------------------------------------------------------------------------

-- Outsider first: the statement is permitted (table DELETE grant) but RLS
-- hides every row, so nothing is removed — verified as the manager below.
delete from public.rota_demand_templates where name = 'Busy weekend';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000201","role":"authenticated"}', true);

do $$
declare
  template_count bigint;
  slot_count bigint;
begin
  select count(*) into template_count
  from public.rota_demand_templates
  where workspace_id = '41000000-0000-4000-8000-000000000201' and name = 'Busy weekend';
  if template_count <> 1 then
    raise exception 'FAIL: outsider delete removed the template (found % rows)', template_count;
  end if;
  raise notice 'PASS: outsider delete removes nothing';

  -- Manager deletes their own template (direct table delete, as the app does).
  delete from public.rota_demand_templates
  where workspace_id = '41000000-0000-4000-8000-000000000201' and name = 'Busy weekend';

  select count(*) into template_count
  from public.rota_demand_templates
  where workspace_id = '41000000-0000-4000-8000-000000000201' and name = 'Busy weekend';
  if template_count <> 0 then
    raise exception 'FAIL: manager delete left % template rows', template_count;
  end if;

  select count(*) into slot_count
  from public.rota_demand_template_slots
  where workspace_id = '41000000-0000-4000-8000-000000000201';
  if slot_count <> 0 then
    raise exception 'FAIL: % slots survived the template delete (cascade broken)', slot_count;
  end if;
  raise notice 'PASS: manager deleted the template and its slots cascaded';
end $$;

rollback;
