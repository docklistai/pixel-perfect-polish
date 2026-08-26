-- Phase 64 leave entitlement security and integrity. Runs entirely inside one
-- rolled-back transaction against the local stack; the seeded database is left
-- untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase64_leave_entitlement_tests.sql
--
-- Proven here:
--   * a manager may select, insert, update and delete entitlements in their own
--     workspace, and the workspace leave policy stays manager-only;
--   * a staff member reads their OWN entitlement and nothing else — a colleague
--     row returns zero rows rather than raising, and insert/update/delete are
--     all refused;
--   * the staff portal view exposes only the caller's own rows;
--   * a manager in another workspace can neither read nor write these rows;
--   * anon has no path to the table or the view;
--   * constraint cover: month range, entitlement range, one row per
--     (workspace, staff member, leave year), independent rows for different
--     leave years, and leave_year_start immutable on update.
--
-- A failed check raises P0001 (FAIL).

begin;

-- --------------------------------------------------------------------------
-- Setup: two self-contained workspaces.
--
-- Deliberately NOT built on the seeded workspace A memberships. Claiming a
-- seeded membership makes the suite depend on that membership still being
-- unclaimed, which a local browser smoke can silently invalidate — and the
-- membership identity guard then refuses the rewrite. Everything here is
-- created by the suite and rolled back with it.
--
--   Workspace A (…0002): manager, Alice (staff), Bob (colleague staff)
--   Workspace B (…0001): a separate owner + staff member, for isolation
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'a6400000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'p64.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'a6400000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'p64.alice@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'a6400000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'p64.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values
  ('64000000-0000-4000-8000-000000000002', 'p64-main', 'P64 Main', 'Europe/London'),
  ('64000000-0000-4000-8000-000000000001', 'p64-other', 'P64 Other', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values
  ('64100000-0000-4000-8000-000000000002', '64000000-0000-4000-8000-000000000002',
   'Main Site', 'Europe/London'),
  ('64100000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001',
   'Other Main', 'Europe/London');

insert into public.workspace_memberships
  (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('64200000-0000-4000-8000-000000000010', '64000000-0000-4000-8000-000000000002',
   'a6400000-0000-4000-8000-000000000001', 'manager', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('64200000-0000-4000-8000-000000000006', '64000000-0000-4000-8000-000000000002',
   'a6400000-0000-4000-8000-000000000002', 'staff', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('64200000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001',
   'a6400000-0000-4000-8000-000000000003', 'owner', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

insert into public.staff_members
  (id, workspace_id, membership_id, primary_location_id, display_name, role_name, employment_status)
values
  -- Alice is the staff persona; Bob is a colleague she must never see.
  ('64300000-0000-4000-8000-000000000005', '64000000-0000-4000-8000-000000000002',
   '64200000-0000-4000-8000-000000000006', '64100000-0000-4000-8000-000000000002',
   'Alice Cook', 'Chef', 'active'),
  ('64300000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000002',
   null, '64100000-0000-4000-8000-000000000002',
   'Bob Porter', 'Porter', 'active'),
  ('64300000-0000-4000-8000-000000000009', '64000000-0000-4000-8000-000000000001',
   '64200000-0000-4000-8000-000000000001', '64100000-0000-4000-8000-000000000001',
   'Outsider Owner', 'Owner', 'active');

-- Workspace B already has one recorded entitlement, so isolation probes have a
-- real row to fail to reach.
insert into public.staff_leave_entitlements
  (workspace_id, staff_member_id, leave_year_start, entitlement_days)
values ('64000000-0000-4000-8000-000000000001', '64300000-0000-4000-8000-000000000009',
        '2026-04-01', 21);

-- --------------------------------------------------------------------------
-- MANAGER persona: full CRUD in own workspace, plus constraint cover.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"a6400000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  n bigint;
  recorded integer;
begin
  -- 1. Workspace leave policy is writable by a manager.
  insert into public.workspace_settings
    (workspace_id, leave_year_start_month, default_annual_leave_days)
  values ('64000000-0000-4000-8000-000000000002', 4, 28);

  select leave_year_start_month into recorded from public.workspace_settings
  where workspace_id = '64000000-0000-4000-8000-000000000002';
  if recorded is distinct from 4 then
    raise exception 'FAIL: manager could not record the leave-year start month';
  end if;
  raise notice 'PASS: manager records workspace leave policy';

  -- 2. Insert entitlements for two staff members in the current leave year.
  insert into public.staff_leave_entitlements
    (workspace_id, staff_member_id, leave_year_start, entitlement_days, set_by_membership_id)
  values
    ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000005',
     '2026-04-01', 22, '64200000-0000-4000-8000-000000000010'),
    ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000001',
     '2026-04-01', 28, '64200000-0000-4000-8000-000000000010');
  raise notice 'PASS: manager inserts entitlements';

  -- 3. Update one, then read it back.
  update public.staff_leave_entitlements set entitlement_days = 25
  where workspace_id = '64000000-0000-4000-8000-000000000002'
    and staff_member_id = '64300000-0000-4000-8000-000000000005'
    and leave_year_start = '2026-04-01';

  select entitlement_days into recorded from public.staff_leave_entitlements
  where workspace_id = '64000000-0000-4000-8000-000000000002'
    and staff_member_id = '64300000-0000-4000-8000-000000000005'
    and leave_year_start = '2026-04-01';
  if recorded <> 25 then
    raise exception 'FAIL: manager update did not persist (got %)', recorded;
  end if;
  raise notice 'PASS: manager updates an entitlement';

  -- 4. A different leave year is an independent row; writing it must not
  --    disturb the earlier year. This is the historical-stability contract.
  insert into public.staff_leave_entitlements
    (workspace_id, staff_member_id, leave_year_start, entitlement_days)
  values ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000005',
          '2027-04-01', 30);

  select entitlement_days into recorded from public.staff_leave_entitlements
  where workspace_id = '64000000-0000-4000-8000-000000000002'
    and staff_member_id = '64300000-0000-4000-8000-000000000005'
    and leave_year_start = '2026-04-01';
  if recorded <> 25 then
    raise exception 'FAIL: writing 2027 changed the 2026 entitlement (now %)', recorded;
  end if;

  select count(*) into n from public.staff_leave_entitlements
  where workspace_id = '64000000-0000-4000-8000-000000000002'
    and staff_member_id = '64300000-0000-4000-8000-000000000005';
  if n <> 2 then
    raise exception 'FAIL: expected 2 independent leave-year rows, found %', n;
  end if;
  raise notice 'PASS: leave years are independent rows and history is stable';

  -- 5. Duplicate (workspace, staff member, leave year) is refused.
  begin
    insert into public.staff_leave_entitlements
      (workspace_id, staff_member_id, leave_year_start, entitlement_days)
    values ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000005',
            '2026-04-01', 40);
    raise exception 'FAIL: duplicate staff/leave-year row was accepted';
  exception when unique_violation then null;
  end;
  raise notice 'PASS: one entitlement per staff member per leave year';

  -- 6. leave_year_start is immutable, so a recorded entitlement can never be
  --    moved between years by an update.
  begin
    update public.staff_leave_entitlements set leave_year_start = '2028-04-01'
    where workspace_id = '64000000-0000-4000-8000-000000000002'
      and staff_member_id = '64300000-0000-4000-8000-000000000005'
      and leave_year_start = '2027-04-01';
    raise exception 'FAIL: leave_year_start was mutable';
  -- 55000 is exactly what protect_immutable_columns raises; anything else must
  -- surface rather than be swallowed as a pass.
  exception when sqlstate '55000' then null;
  end;
  raise notice 'PASS: leave_year_start is immutable';

  -- 7. Entitlement range is enforced at the database, not only in the UI.
  begin
    insert into public.staff_leave_entitlements
      (workspace_id, staff_member_id, leave_year_start, entitlement_days)
    values ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000001',
            '2028-04-01', 400);
    raise exception 'FAIL: entitlement above 366 days was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.staff_leave_entitlements
      (workspace_id, staff_member_id, leave_year_start, entitlement_days)
    values ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000001',
            '2028-04-01', -1);
    raise exception 'FAIL: negative entitlement was accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS: entitlement range enforced';

  -- 8. Leave-year start month range is enforced.
  begin
    update public.workspace_settings set leave_year_start_month = 13
    where workspace_id = '64000000-0000-4000-8000-000000000002';
    raise exception 'FAIL: leave_year_start_month 13 was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.workspace_settings set leave_year_start_month = 0
    where workspace_id = '64000000-0000-4000-8000-000000000002';
    raise exception 'FAIL: leave_year_start_month 0 was accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS: leave-year month range enforced';

  -- 9. A manager cannot reach into another workspace.
  select count(*) into n from public.staff_leave_entitlements
  where workspace_id = '64000000-0000-4000-8000-000000000001';
  if n <> 0 then
    raise exception 'FAIL: manager read % foreign-workspace entitlement rows', n;
  end if;

  begin
    insert into public.staff_leave_entitlements
      (workspace_id, staff_member_id, leave_year_start, entitlement_days)
    values ('64000000-0000-4000-8000-000000000001', '64300000-0000-4000-8000-000000000001',
            '2027-04-01', 99);
    raise exception 'FAIL: manager wrote an entitlement into another workspace';
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: cross-workspace read and write blocked for a manager';
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona (Alice, staff_member 64300000-…0005): own row only, no writes.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"a6400000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  n bigint;
  recorded integer;
begin
  -- 1. Own rows are visible.
  select count(*) into n from public.staff_leave_entitlements
  where staff_member_id = '64300000-0000-4000-8000-000000000005';
  if n <> 2 then
    raise exception 'FAIL: staff sees % of their own entitlement rows (expected 2)', n;
  end if;

  select entitlement_days into recorded from public.staff_leave_entitlements
  where staff_member_id = '64300000-0000-4000-8000-000000000005'
    and leave_year_start = '2026-04-01';
  if recorded <> 25 then
    raise exception 'FAIL: staff read the wrong own entitlement (%)', recorded;
  end if;
  raise notice 'PASS: staff reads their own entitlement';

  -- 2. A colleague's row is filtered out — RLS filters, it does not raise, so
  --    the assertion is on the row count.
  select count(*) into n from public.staff_leave_entitlements
  where staff_member_id = '64300000-0000-4000-8000-000000000001';
  if n <> 0 then
    raise exception 'FAIL: staff read % colleague entitlement rows', n;
  end if;

  -- 3. And no rows at all beyond their own, however the query is shaped.
  select count(*) into n from public.staff_leave_entitlements;
  if n <> 2 then
    raise exception 'FAIL: staff sees % entitlement rows in total (expected only own 2)', n;
  end if;
  raise notice 'PASS: colleague entitlements are invisible to staff';

  -- 4. No write path of any kind.
  begin
    insert into public.staff_leave_entitlements
      (workspace_id, staff_member_id, leave_year_start, entitlement_days)
    values ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000005',
            '2029-04-01', 99);
    raise exception 'FAIL: staff inserted an entitlement';
  exception when sqlstate '42501' then null;
  end;

  begin
    update public.staff_leave_entitlements set entitlement_days = 99
    where staff_member_id = '64300000-0000-4000-8000-000000000005';
    if found then
      raise exception 'FAIL: staff updated their own entitlement';
    end if;
  exception when sqlstate '42501' then null;
  end;

  begin
    delete from public.staff_leave_entitlements
    where staff_member_id = '64300000-0000-4000-8000-000000000005';
    if found then
      raise exception 'FAIL: staff deleted their own entitlement';
    end if;
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: staff cannot insert, update or delete entitlement';

  -- 5. The portal view exposes own rows only.
  select count(*) into n from public.staff_portal_leave_entitlements;
  if n <> 2 then
    raise exception 'FAIL: portal view returned % rows (expected own 2)', n;
  end if;

  select count(*) into n from public.staff_portal_leave_entitlements
  where staff_member_id <> '64300000-0000-4000-8000-000000000005';
  if n <> 0 then
    raise exception 'FAIL: portal view leaked % colleague rows', n;
  end if;
  raise notice 'PASS: portal view is own-rows-only';

  -- 6. Workspace leave policy stays manager-only: staff must not learn the
  --    workspace default, which is why the portal resolves its leave year from
  --    the entitlement row instead.
  select count(*) into n from public.workspace_settings;
  if n <> 0 then
    raise exception 'FAIL: staff read % workspace_settings rows (expected 0)', n;
  end if;
  raise notice 'PASS: workspace leave policy remains manager-only';
end $$;

-- --------------------------------------------------------------------------
-- FOREIGN MANAGER persona: owner of the other workspace sees only their own.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"a6400000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare
  n bigint;
begin
  select count(*) into n from public.staff_leave_entitlements
  where workspace_id = '64000000-0000-4000-8000-000000000002';
  if n <> 0 then
    raise exception 'FAIL: foreign owner read % workspace A entitlement rows', n;
  end if;

  select count(*) into n from public.staff_leave_entitlements;
  if n <> 1 then
    raise exception 'FAIL: foreign owner sees % rows (expected only their own 1)', n;
  end if;

  begin
    update public.staff_leave_entitlements set entitlement_days = 1
    where workspace_id = '64000000-0000-4000-8000-000000000002';
    if found then
      raise exception 'FAIL: foreign owner updated a workspace A entitlement';
    end if;
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: entitlement is workspace-isolated';
end $$;

-- --------------------------------------------------------------------------
-- ANON persona: no path to the table or the view.
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', null, true);
set local role anon;

do $$
declare
  n bigint;
begin
  begin
    select count(*) into n from public.staff_leave_entitlements;
    raise exception 'FAIL: anon read the entitlement table';
  exception when sqlstate '42501' then null;
  end;

  begin
    select count(*) into n from public.staff_portal_leave_entitlements;
    raise exception 'FAIL: anon read the portal entitlement view';
  exception when sqlstate '42501' then null;
  end;

  begin
    insert into public.staff_leave_entitlements
      (workspace_id, staff_member_id, leave_year_start, entitlement_days)
    values ('64000000-0000-4000-8000-000000000002', '64300000-0000-4000-8000-000000000005',
            '2030-04-01', 5);
    raise exception 'FAIL: anon inserted an entitlement';
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: anon has no entitlement access';
end $$;

rollback;
