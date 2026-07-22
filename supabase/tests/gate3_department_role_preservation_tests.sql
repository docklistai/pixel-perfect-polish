-- Gate 3 department + role preservation. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/gate3_department_role_preservation_tests.sql
--
-- Proves the Gate 3 promise at the database boundary: a shift's own department
-- and its role — including a temporary label such as Training or Cover — survive
-- copy-previous-week and demand-template application, and are never replaced by
-- the staff member's profile department or profile role.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000301',
        'authenticated', 'authenticated', 'g3.manager@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000301', 'g3-site', 'G3 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000301', '41000000-0000-4000-8000-000000000301', 'G3 Site', 'Europe/London');

-- Two departments: the staff member's profile department, and the one the
-- shift is actually worked in.
insert into public.departments (id, workspace_id, name)
values
  ('43000000-0000-4000-8000-00000000030a', '41000000-0000-4000-8000-000000000301', 'Housekeeping'),
  ('43000000-0000-4000-8000-00000000030b', '41000000-0000-4000-8000-000000000301', 'Bar');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000301', '41000000-0000-4000-8000-000000000301',
        'ad000000-0000-4000-8000-000000000301', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

-- Profile says Housekeeping / Housekeeper.
insert into public.staff_members (id, workspace_id, primary_location_id, department_id, display_name, role_name, employment_status)
values ('46000000-0000-4000-8000-000000000301', '41000000-0000-4000-8000-000000000301',
        '42000000-0000-4000-8000-000000000301', '43000000-0000-4000-8000-00000000030a',
        'Gate Three', 'Housekeeper', 'active');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('45000000-0000-4000-8000-00000000030a', '41000000-0000-4000-8000-000000000301', '42000000-0000-4000-8000-000000000301', '2026-06-15', 'draft'),
  ('45000000-0000-4000-8000-00000000030b', '41000000-0000-4000-8000-000000000301', '42000000-0000-4000-8000-000000000301', '2026-06-22', 'draft');

-- Source week: an assigned Bar/Training shift and an open Bar/Cover shift.
insert into public.shifts (workspace_id, rota_week_id, location_id, department_id, staff_member_id,
                           shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values
  ('41000000-0000-4000-8000-000000000301', '45000000-0000-4000-8000-00000000030a',
   '42000000-0000-4000-8000-000000000301', '43000000-0000-4000-8000-00000000030b',
   '46000000-0000-4000-8000-000000000301', '2026-06-15',
   '2026-06-15T09:00:00Z', '2026-06-15T17:00:00Z', 30, 'Training', 'scheduled'),
  ('41000000-0000-4000-8000-000000000301', '45000000-0000-4000-8000-00000000030a',
   '42000000-0000-4000-8000-000000000301', '43000000-0000-4000-8000-00000000030b',
   null, '2026-06-16',
   '2026-06-16T18:00:00Z', '2026-06-16T23:00:00Z', 0, 'Cover', 'open');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000301","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  copied integer;
  bar_count integer;
  housekeeping_count integer;
  training_count integer;
  cover_count integer;
  open_bar_count integer;
begin
  -- ---------- copy previous week ----------
  perform public.rpc_copy_previous_rota_week(
    '41000000-0000-4000-8000-000000000301',
    '42000000-0000-4000-8000-000000000301',
    '2026-06-22'
  );

  select count(*) into copied
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000030b';
  if copied <> 2 then
    raise exception 'FAIL: copy-week produced % shifts, expected 2', copied;
  end if;

  select count(*) into bar_count
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000030b'
    and department_id = '43000000-0000-4000-8000-00000000030b';
  if bar_count <> 2 then
    raise exception 'FAIL: copy-week kept only % of 2 shifts in Bar', bar_count;
  end if;

  select count(*) into housekeeping_count
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000030b'
    and department_id = '43000000-0000-4000-8000-00000000030a';
  if housekeeping_count <> 0 then
    raise exception 'FAIL: copy-week moved % shifts to the staff profile department', housekeeping_count;
  end if;
  raise notice 'PASS: copy-week preserved the shift department for assigned and open shifts';

  select count(*) into training_count
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000030b' and role_name = 'Training';
  select count(*) into cover_count
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000030b' and role_name = 'Cover';
  if training_count <> 1 or cover_count <> 1 then
    raise exception 'FAIL: copy-week lost temporary roles (Training=%, Cover=%)', training_count, cover_count;
  end if;
  raise notice 'PASS: copy-week preserved temporary Training and Cover roles';

  select count(*) into open_bar_count
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000030b'
    and assignment_status = 'open'
    and department_id = '43000000-0000-4000-8000-00000000030b';
  if open_bar_count <> 1 then
    raise exception 'FAIL: the open shift did not keep its Bar department';
  end if;
  raise notice 'PASS: open-shift department preserved through copy-week';

  -- The staff profile must be untouched by any of this.
  if exists (
    select 1 from public.staff_members
    where id = '46000000-0000-4000-8000-000000000301'
      and (department_id <> '43000000-0000-4000-8000-00000000030a' or role_name <> 'Housekeeper')
  ) then
    raise exception 'FAIL: scheduling changed the staff profile role or department';
  end if;
  raise notice 'PASS: staff profile role and department unchanged';
end $$;

-- ---------- demand template departments ----------
do $$
declare
  slot_dept uuid;
  applied_bar integer;
  applied_total integer;
begin
  perform public.rpc_save_demand_template(
    '41000000-0000-4000-8000-000000000301',
    '45000000-0000-4000-8000-00000000030a',
    'G3 template'
  );

  select department_id into slot_dept
  from public.rota_demand_template_slots
  where workspace_id = '41000000-0000-4000-8000-000000000301'
  limit 1;

  if slot_dept is distinct from '43000000-0000-4000-8000-00000000030b' then
    raise exception 'FAIL: template slot stored department % instead of Bar', slot_dept;
  end if;
  raise notice 'PASS: template save retained the slot department';

  delete from public.shifts where rota_week_id = '45000000-0000-4000-8000-00000000030b';

  perform public.rpc_apply_demand_template(
    '41000000-0000-4000-8000-000000000301',
    '45000000-0000-4000-8000-00000000030b',
    (select id from public.rota_demand_templates
     where workspace_id = '41000000-0000-4000-8000-000000000301' limit 1)
  );

  select count(*) into applied_total
  from public.shifts where rota_week_id = '45000000-0000-4000-8000-00000000030b';
  select count(*) into applied_bar
  from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-00000000030b'
    and department_id = '43000000-0000-4000-8000-00000000030b';

  if applied_total = 0 then
    raise exception 'FAIL: applying the template created no shifts';
  end if;
  if applied_bar <> applied_total then
    raise exception 'FAIL: only % of % applied shifts used the slot department', applied_bar, applied_total;
  end if;
  raise notice 'PASS: template application used the slot department, not a staff profile department';
end $$;

rollback;
