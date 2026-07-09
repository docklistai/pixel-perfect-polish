-- Phase 17 role-budget verification. Runs inside one rolled-back transaction
-- against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase17_role_budgets_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated', 'p17.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000302', 'authenticated', 'authenticated', 'p17.staff@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000303', 'authenticated', 'authenticated', 'p17.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('51000000-0000-4000-8000-000000000301', 'p17-site', 'P17 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('52000000-0000-4000-8000-000000000301', '51000000-0000-4000-8000-000000000301', 'P17 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('53000000-0000-4000-8000-000000000301', '51000000-0000-4000-8000-000000000301', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('54000000-0000-4000-8000-000000000301', '51000000-0000-4000-8000-000000000301', 'ad000000-0000-4000-8000-000000000301', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('54000000-0000-4000-8000-000000000302', '51000000-0000-4000-8000-000000000301', 'ad000000-0000-4000-8000-000000000302', 'staff', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('55000000-0000-4000-8000-000000000301', '51000000-0000-4000-8000-000000000301', '54000000-0000-4000-8000-000000000302', '52000000-0000-4000-8000-000000000301', '53000000-0000-4000-8000-000000000301', 'P17 Staff', 'Chef');

-- --------------------------------------------------------------------------
-- MANAGER: create, update, read a role budget; workspace_id is immutable.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000301","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  saved integer;
begin
  insert into public.workspace_role_budgets (workspace_id, role_name, weekly_budget_minutes)
  values ('51000000-0000-4000-8000-000000000301', 'Kitchen', 12000);

  update public.workspace_role_budgets set weekly_budget_minutes = 13200
  where workspace_id = '51000000-0000-4000-8000-000000000301' and role_name = 'Kitchen';

  select weekly_budget_minutes into saved
  from public.workspace_role_budgets
  where workspace_id = '51000000-0000-4000-8000-000000000301' and role_name = 'Kitchen';
  if saved is distinct from 13200 then
    raise exception 'FAIL: manager could not read back updated role budget (got %)', saved;
  end if;
  raise notice 'PASS: manager creates, updates, reads a role budget';

  begin
    update public.workspace_role_budgets set workspace_id = gen_random_uuid()
    where role_name = 'Kitchen';
    raise exception 'FAIL: workspace_id was mutable';
  exception when sqlstate '55000' then
    raise notice 'PASS: workspace_id is immutable';
  end;

  begin
    insert into public.workspace_role_budgets (workspace_id, role_name, weekly_budget_minutes)
    values ('51000000-0000-4000-8000-000000000301', 'Kitchen', 9000);
    raise exception 'FAIL: duplicate role budget accepted';
  exception when unique_violation then
    raise notice 'PASS: one budget per role enforced';
  end;
end $$;

-- --------------------------------------------------------------------------
-- STAFF: cannot read or write role budgets.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000302","role":"authenticated"}', true);

do $$
declare
  rows bigint;
begin
  select count(*) into rows from public.workspace_role_budgets;
  if rows <> 0 then
    raise exception 'FAIL: staff can read % role budgets (expected 0)', rows;
  end if;
  begin
    insert into public.workspace_role_budgets (workspace_id, role_name, weekly_budget_minutes)
    values ('51000000-0000-4000-8000-000000000301', 'Chef', 6000);
    raise exception 'FAIL: staff inserted a role budget';
  exception when sqlstate '42501' then
    raise notice 'PASS: role budgets are manager-only';
  end;
end $$;

-- --------------------------------------------------------------------------
-- OUTSIDER: sees nothing.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000303","role":"authenticated"}', true);

do $$
declare
  rows bigint;
begin
  select count(*) into rows from public.workspace_role_budgets;
  if rows <> 0 then
    raise exception 'FAIL: outsider sees % role budgets (expected 0)', rows;
  end if;
  raise notice 'PASS: outsider sees nothing';
end $$;

rollback;
