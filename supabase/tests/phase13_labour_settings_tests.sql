-- Phase 13 labour settings + team visibility verification. Runs entirely inside
-- one rolled-back transaction against the local stack; the seeded database is
-- left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase13_labour_settings_tests.sql
--
-- Expected rejections are caught by exact SQLSTATE (42501 RLS violation,
-- 55000 immutable column). A failed check raises P0001 (FAIL) and aborts.

begin;

-- --------------------------------------------------------------------------
-- Setup (service path): claim seeded memberships for test auth identities.
-- Workspace 1 = 10000000-…0001 (Harbour View seed). Workspace 2 is created
-- fresh for cross-tenant probes.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'p13.manager@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'p13.olivia@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'p13.outsider@example.com');

-- Manager membership (workspace 1) and Olivia's staff membership (workspace 1).
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000001', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000010';
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000002', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000006';

-- Second workspace with its own staff member for isolation probes.
insert into public.workspaces (id, slug, name, timezone)
values ('31000000-0000-4000-8000-000000000001', 'p13-second-site', 'P13 Second Site', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'P13 Second Site', 'Europe/London');

insert into public.departments (id, workspace_id, name)
values ('33000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'Front of House');

insert into public.workspace_memberships (id, workspace_id, role, status, invited_at)
values ('34000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'staff', 'invited', '2026-06-01T08:00:00Z');

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('35000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'P13 Second Staff', 'Waiter');

-- --------------------------------------------------------------------------
-- MANAGER persona: workspace_settings CRUD and staff_pay_rates management.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  saved_budget integer;
begin
  insert into public.workspace_settings (workspace_id, weekly_budget_minutes, target_labour_pct, forecast_weekly_sales_pence, avg_hourly_cost_pence, budget_warning_pct)
  values ('10000000-0000-4000-8000-000000000001', 49200, 30, 1780000, 1400, 95);

  update public.workspace_settings
  set weekly_budget_minutes = 50400
  where workspace_id = '10000000-0000-4000-8000-000000000001';

  select weekly_budget_minutes into saved_budget
  from public.workspace_settings
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if saved_budget is distinct from 50400 then
    raise exception 'FAIL: manager could not read back updated weekly budget (got %)', saved_budget;
  end if;
  raise notice 'PASS: manager creates, updates, and reads workspace settings';

  begin
    update public.workspace_settings
    set workspace_id = '31000000-0000-4000-8000-000000000001'
    where workspace_id = '10000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: workspace_id was mutable on workspace_settings';
  exception when sqlstate '55000' then
    raise notice 'PASS: workspace_settings.workspace_id is immutable';
  end;

  begin
    insert into public.workspace_settings (workspace_id, weekly_budget_minutes)
    values ('31000000-0000-4000-8000-000000000001', 1000);
    raise exception 'FAIL: manager inserted settings into a foreign workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: cross-workspace settings insert rejected';
  end;

  insert into public.staff_pay_rates (workspace_id, staff_member_id, hourly_rate_pence, set_by_membership_id)
  values
    ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', 1250, '13000000-0000-4000-8000-000000000010'),
    ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 1450, '13000000-0000-4000-8000-000000000010');
  raise notice 'PASS: manager records staff pay rates';

  begin
    insert into public.staff_pay_rates (workspace_id, staff_member_id, hourly_rate_pence)
    values ('31000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001', 1000);
    raise exception 'FAIL: manager inserted a pay rate into a foreign workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: cross-workspace pay rate insert rejected';
  end;
end $$;

-- Manager is not a staff member: the team view must return nothing for them.
do $$
declare
  team_rows bigint;
begin
  select count(*) into team_rows from public.staff_portal_team_shifts;
  if team_rows <> 0 then
    raise exception 'FAIL: non-staff manager sees % team shift rows (expected 0)', team_rows;
  end if;
  raise notice 'PASS: team view is empty for members without a staff identity';
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia): settings hidden, all pay rates hidden, team visible.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  settings_rows bigint;
  rate_rows bigint;
  own_rate integer;
  colleague_rows bigint;
  colleague_named_rows bigint;
  draft_week_rows bigint;
  foreign_rows bigint;
begin
  select count(*) into settings_rows from public.workspace_settings;
  if settings_rows <> 0 then
    raise exception 'FAIL: staff can read % workspace_settings rows (expected 0)', settings_rows;
  end if;

  begin
    insert into public.workspace_settings (workspace_id, weekly_budget_minutes)
    values ('10000000-0000-4000-8000-000000000001', 1000);
    raise exception 'FAIL: staff inserted workspace settings';
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: workspace settings are manager-only';

  -- Phase 39 removed the staff self-read path: pay rates are manager-only.
  select count(*), min(hourly_rate_pence) into rate_rows, own_rate from public.staff_pay_rates;
  if rate_rows <> 0 then
    raise exception 'FAIL: staff sees % pay rate rows / rate % (expected none)', rate_rows, own_rate;
  end if;

  begin
    update public.staff_pay_rates set hourly_rate_pence = 9900
    where staff_member_id = '14000000-0000-4000-8000-000000000005';
    if found then
      raise exception 'FAIL: staff updated their own pay rate';
    end if;
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: staff cannot read or change any pay rate';

  -- Latest published snapshot (seeded week 2026-06-08) includes colleagues.
  select count(*) into colleague_rows
  from public.staff_portal_team_shifts
  where staff_member_id is distinct from '14000000-0000-4000-8000-000000000005';
  if colleague_rows < 1 then
    raise exception 'FAIL: staff cannot see any colleague shifts on the published rota';
  end if;

  select count(*) into colleague_named_rows
  from public.staff_portal_team_shifts
  where display_name = 'Sophie Carter' and role_name = 'FOH Supervisor';
  if colleague_named_rows < 1 then
    raise exception 'FAIL: colleague name/role missing from the team view';
  end if;

  -- The draft week (2026-06-15…21) must never leak through the team view.
  select count(*) into draft_week_rows
  from public.staff_portal_team_shifts
  where shift_date between '2026-06-15' and '2026-06-21';
  if draft_week_rows <> 0 then
    raise exception 'FAIL: draft-week shifts leaked into the team view (% rows)', draft_week_rows;
  end if;

  select count(*) into foreign_rows
  from public.staff_portal_team_shifts
  where workspace_id <> '10000000-0000-4000-8000-000000000001';
  if foreign_rows <> 0 then
    raise exception 'FAIL: staff sees % team rows from foreign workspaces', foreign_rows;
  end if;

  raise notice 'PASS: team view shows published colleagues only, workspace-scoped';
end $$;

-- --------------------------------------------------------------------------
-- OUTSIDER persona: no memberships anywhere — every surface must be empty.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare
  total_rows bigint;
begin
  select (select count(*) from public.workspace_settings)
       + (select count(*) from public.staff_pay_rates)
       + (select count(*) from public.staff_portal_team_shifts)
  into total_rows;
  if total_rows <> 0 then
    raise exception 'FAIL: outsider sees % phase-13 rows (expected 0)', total_rows;
  end if;
  raise notice 'PASS: outsider sees nothing';
end $$;

rollback;
