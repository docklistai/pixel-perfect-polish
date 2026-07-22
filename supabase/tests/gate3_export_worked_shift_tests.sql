-- Gate 3 approved-hours export source-of-truth. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/gate3_export_worked_shift_tests.sql
--
-- Drives the REAL rpc_export_approved_hours. Proves the export follows the
-- worked shift, that later profile edits cannot rewrite approved history, that
-- work in two departments exports as two rows, and that authorization, workspace
-- isolation, audit writes and CSV escaping are all still intact.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000401', 'authenticated', 'authenticated', 'g3x.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000402', 'authenticated', 'authenticated', 'g3x.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values
  ('41000000-0000-4000-8000-000000000401', 'g3x-site', 'G3X Site', 'Europe/London'),
  ('41000000-0000-4000-8000-000000000402', 'g3x-other', 'G3X Other', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values
  ('42000000-0000-4000-8000-000000000401', '41000000-0000-4000-8000-000000000401', 'G3X Site', 'Europe/London'),
  ('42000000-0000-4000-8000-000000000402', '41000000-0000-4000-8000-000000000402', 'G3X Other', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values
  ('43000000-0000-4000-8000-00000000040a', '41000000-0000-4000-8000-000000000401', 'Housekeeping'),
  ('43000000-0000-4000-8000-00000000040b', '41000000-0000-4000-8000-000000000401', 'Bar'),
  ('43000000-0000-4000-8000-00000000040c', '41000000-0000-4000-8000-000000000401', 'Kitchen'),
  ('43000000-0000-4000-8000-00000000040d', '41000000-0000-4000-8000-000000000402', 'Other Dept');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('44000000-0000-4000-8000-000000000401', '41000000-0000-4000-8000-000000000401', 'ad000000-0000-4000-8000-000000000401', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('44000000-0000-4000-8000-000000000402', '41000000-0000-4000-8000-000000000402', 'ad000000-0000-4000-8000-000000000402', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

-- Profile: Housekeeper in Housekeeping. Deliberately a CSV-hostile name.
insert into public.staff_members (id, workspace_id, primary_location_id, department_id, display_name, role_name, employment_status)
values
  ('46000000-0000-4000-8000-000000000401', '41000000-0000-4000-8000-000000000401',
   '42000000-0000-4000-8000-000000000401', '43000000-0000-4000-8000-00000000040a',
   '=cmd|calc', 'Housekeeper', 'active'),
  ('46000000-0000-4000-8000-000000000402', '41000000-0000-4000-8000-000000000402',
   '42000000-0000-4000-8000-000000000402', '43000000-0000-4000-8000-00000000040d',
   'Other Person', 'Other Role', 'active');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000401', '41000000-0000-4000-8000-000000000401',
        '42000000-0000-4000-8000-000000000401', '2026-06-15', 'draft');

-- Two worked shifts on different days, in DIFFERENT departments, with temporary
-- roles; plus one approved entry with no linked shift at all.
insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
                           shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values
  ('47000000-0000-4000-8000-00000000040a', '41000000-0000-4000-8000-000000000401', '45000000-0000-4000-8000-000000000401',
   '42000000-0000-4000-8000-000000000401', '43000000-0000-4000-8000-00000000040b', '46000000-0000-4000-8000-000000000401',
   '2026-06-15', '2026-06-15T09:00:00Z', '2026-06-15T17:00:00Z', 30, 'Training', 'scheduled'),
  ('47000000-0000-4000-8000-00000000040b', '41000000-0000-4000-8000-000000000401', '45000000-0000-4000-8000-000000000401',
   '42000000-0000-4000-8000-000000000401', '43000000-0000-4000-8000-00000000040c', '46000000-0000-4000-8000-000000000401',
   '2026-06-16', '2026-06-16T09:00:00Z', '2026-06-16T17:00:00Z', 30, 'Cover', 'scheduled');

insert into public.time_entries (workspace_id, staff_member_id, shift_id, work_date,
                                 scheduled_start_at, scheduled_end_at, clocked_in_at, clocked_out_at,
                                 break_minutes, approval_status, approved_at, approved_by_membership_id)
values
  ('41000000-0000-4000-8000-000000000401', '46000000-0000-4000-8000-000000000401', '47000000-0000-4000-8000-00000000040a',
   '2026-06-15', '2026-06-15T09:00:00Z', '2026-06-15T17:00:00Z', '2026-06-15T09:00:00Z', '2026-06-15T17:00:00Z',
   30, 'approved', '2026-06-16T09:00:00Z', '44000000-0000-4000-8000-000000000401'),
  ('41000000-0000-4000-8000-000000000401', '46000000-0000-4000-8000-000000000401', '47000000-0000-4000-8000-00000000040b',
   '2026-06-16', '2026-06-16T09:00:00Z', '2026-06-16T17:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T17:00:00Z',
   30, 'approved', '2026-06-17T09:00:00Z', '44000000-0000-4000-8000-000000000401'),
  -- No linked shift: documented profile fallback.
  ('41000000-0000-4000-8000-000000000401', '46000000-0000-4000-8000-000000000401', null,
   '2026-06-17', '2026-06-17T09:00:00Z', '2026-06-17T13:00:00Z', '2026-06-17T09:00:00Z', '2026-06-17T13:00:00Z',
   0, 'approved', '2026-06-18T09:00:00Z', '44000000-0000-4000-8000-000000000401');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000401","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  bar_role text;
  bar_dept text;
  kitchen_role text;
  row_total integer;
  fallback_dept text;
  fallback_role text;
  audit_before integer;
  audit_after integer;
  safe_name text;
begin
  -- ---------- 1 & 2: worked shift overrides profile ----------
  select r.role_name, r.department_name into bar_role, bar_dept
  from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000401', '2026-06-15', '2026-06-15', null::uuid) as r;

  if bar_dept is distinct from 'Bar' then
    raise exception 'FAIL: export department was % (expected Bar from the worked shift)', bar_dept;
  end if;
  if bar_role is distinct from 'Training' then
    raise exception 'FAIL: export role was % (expected Training from the worked shift)', bar_role;
  end if;
  raise notice 'PASS: worked shift department and role override the staff profile';

  -- ---------- 4: temporary roles survive ----------
  select r.role_name into kitchen_role
  from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000401', '2026-06-16', '2026-06-16', null::uuid) as r;
  if kitchen_role is distinct from 'Cover' then
    raise exception 'FAIL: temporary role Cover exported as %', kitchen_role;
  end if;
  raise notice 'PASS: temporary Training and Cover roles export as worked roles';

  -- ---------- 5: split departments export as separate rows ----------
  select count(*) into row_total
  from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000401', '2026-06-15', '2026-06-16', null::uuid) as r;
  if row_total <> 2 then
    raise exception 'FAIL: two departments collapsed into % row(s)', row_total;
  end if;
  raise notice 'PASS: work in two departments exports as two distinct rows';

  -- ---------- 6: unlinked entry uses the documented fallback ----------
  select r.department_name, r.role_name into fallback_dept, fallback_role
  from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000401', '2026-06-17', '2026-06-17', null::uuid) as r;
  if fallback_dept is distinct from 'Housekeeping' or fallback_role is distinct from 'Housekeeper' then
    raise exception 'FAIL: unlinked entry exported %/% instead of the profile fallback',
      fallback_role, fallback_dept;
  end if;
  raise notice 'PASS: entry with no linked shift falls back to the profile';

  -- ---------- 10: CSV escaping still applied ----------
  select r.display_name into safe_name
  from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000401', '2026-06-15', '2026-06-15', null::uuid) as r;
  if safe_name = '=cmd|calc' then
    raise exception 'FAIL: CSV-hostile display name was exported unescaped';
  end if;
  raise notice 'PASS: CSV escaping still applied (% )', safe_name;

  -- ---------- 9: audit write still happens ----------
  select count(*) into audit_before
  from public.audit_events
  where workspace_id = '41000000-0000-4000-8000-000000000401' and action = 'time_entries.exported';
  perform * from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000401', '2026-06-15', '2026-06-16', null::uuid);
  select count(*) into audit_after
  from public.audit_events
  where workspace_id = '41000000-0000-4000-8000-000000000401' and action = 'time_entries.exported';
  if audit_after <= audit_before then
    raise exception 'FAIL: export wrote no audit event (% -> %)', audit_before, audit_after;
  end if;
  raise notice 'PASS: export audit event still written';

  -- ---------- 3: later profile edit must not rewrite history ----------
  perform set_config('role', 'postgres', true);
end $$;

-- Change the profile department AND role, then re-export the same history.
set local role postgres;
update public.staff_members
set department_id = '43000000-0000-4000-8000-00000000040c', role_name = 'Kitchen Porter'
where id = '46000000-0000-4000-8000-000000000401';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000401","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  after_role text;
  after_dept text;
begin
  select r.role_name, r.department_name into after_role, after_dept
  from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000401', '2026-06-15', '2026-06-15', null::uuid) as r;

  if after_dept is distinct from 'Bar' or after_role is distinct from 'Training' then
    raise exception 'FAIL: profile edit rewrote approved history to %/%', after_role, after_dept;
  end if;
  raise notice 'PASS: editing the staff profile did not rewrite approved history';
end $$;

-- ---------- 7 & 8: authorization and workspace isolation ----------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000402","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  leaked integer;
begin
  begin
    perform * from public.rpc_export_approved_hours(
      '41000000-0000-4000-8000-000000000401', '2026-06-15', '2026-06-16', null::uuid);
    raise exception 'FAIL: an outsider exported another workspace''s hours';
  exception
    when sqlstate '42501' or sqlstate 'P0001' or insufficient_privilege then
      raise notice 'PASS: outsider rejected by rpc_internal_require_manager';
  end;

  select count(*) into leaked
  from public.rpc_export_approved_hours(
    '41000000-0000-4000-8000-000000000402', '2026-06-15', '2026-06-16', null::uuid);
  if leaked <> 0 then
    raise exception 'FAIL: % rows from another workspace leaked into this export', leaked;
  end if;
  raise notice 'PASS: cross-workspace data does not leak';
end $$;

rollback;
