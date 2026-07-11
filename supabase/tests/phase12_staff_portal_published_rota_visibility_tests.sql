-- Phase 11/12 staff-safe published-rota visibility verification. Covers the
-- staff_portal_published_rota_weeks view (created phase 11, made staff-safe in
-- phase 12): staff-only metadata columns, latest-version-wins supersession,
-- workspace isolation, and no direct staff access to manager-only rota_weeks.
-- Runs entirely inside one rolled-back transaction against the local stack;
-- the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase12_staff_portal_published_rota_visibility_tests.sql
--
-- A failed check raises P0001 (FAIL) and aborts the script.

begin;

-- --------------------------------------------------------------------------
-- Setup (service path). Workspace 1 = seeded Harbour View (10…0001) with a
-- published week 15…0001 and seeded snapshot 17…0001 (version 1, has shifts).
-- Workspace 2 is created fresh with its own published snapshot so both sides
-- of the isolation probe have data to leak.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ae000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'p12.staff.ws1@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ae000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'p12.staff.ws2@example.com');

-- Bind Olivia's seeded staff membership (workspace 1) to the ws1 test user.
update public.workspace_memberships
set user_id = 'ae000000-0000-4000-8000-000000000001', status = 'active', joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000006';

-- Second workspace with a bound staff member and a published snapshot.
insert into public.workspaces (id, slug, name, timezone)
values ('36000000-0000-4000-8000-000000000001', 'p12-second-site', 'P12 Second Site', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('37000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', 'P12 Second Site', 'Europe/London');

insert into public.departments (id, workspace_id, name)
values ('38000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', 'Front of House');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('39000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', null, 'owner', 'invited', '2026-06-01T08:00:00Z', null),
  ('39000000-0000-4000-8000-000000000002', '36000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000002', 'staff', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('3a000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', '39000000-0000-4000-8000-000000000002', '37000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', 'P12 Second Staff', 'Waiter');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('3b000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', '2026-06-08', 'published');

insert into public.published_rota_snapshots (id, workspace_id, rota_week_id, version, published_by_membership_id, published_at, created_at)
values ('3c000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', '3b000000-0000-4000-8000-000000000001', 1, '39000000-0000-4000-8000-000000000001', transaction_timestamp(), transaction_timestamp());

insert into public.published_rota_shifts (workspace_id, snapshot_id, source_shift_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values ('36000000-0000-4000-8000-000000000001', '3c000000-0000-4000-8000-000000000001', gen_random_uuid(), '37000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000001', '2026-06-09', '2026-06-09T09:00:00+01:00', '2026-06-09T17:00:00+01:00', 30, 'Waiter', 'scheduled');

-- Workspace 1: supersede the seeded version-1 snapshot with a version 2 that
-- has shifts, so latest-version-wins is observable from the staff side.
insert into public.published_rota_snapshots (id, workspace_id, rota_week_id, version, published_by_membership_id, published_at, created_at)
values ('3d000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 2, '13000000-0000-4000-8000-000000000010', transaction_timestamp(), transaction_timestamp());

insert into public.published_rota_shifts (workspace_id, snapshot_id, source_shift_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values ('10000000-0000-4000-8000-000000000001', '3d000000-0000-4000-8000-000000000001', gen_random_uuid(), '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-06-09', '2026-06-09T07:00:00+01:00', '2026-06-09T15:00:00+01:00', 30, 'Barista', 'scheduled');

-- --------------------------------------------------------------------------
-- Shape check (service path): the staff-safe view must expose metadata only.
-- Manager-only fields (rota_week_id, publisher, week_start) must stay out.
-- --------------------------------------------------------------------------
do $$
declare
  actual_columns text;
begin
  select string_agg(column_name, ',' order by column_name) into actual_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'staff_portal_published_rota_weeks';

  if actual_columns is distinct from 'published_at,snapshot_version,workspace_id' then
    raise exception 'FAIL: staff-safe view exposes unexpected columns: %', actual_columns;
  end if;
  raise notice 'PASS: view exposes only workspace_id, snapshot_version, published_at';
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona (workspace 1): sees only the latest real snapshot of own
-- workspace; no cross-tenant rows; no direct manager-table access.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ae000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  own_rows integer;
  own_version integer;
  foreign_rows integer;
  manager_rows integer;
begin
  select count(*), min(snapshot_version) into own_rows, own_version
  from public.staff_portal_published_rota_weeks
  where workspace_id = '10000000-0000-4000-8000-000000000001';

  if own_rows <> 1 then
    raise exception 'FAIL: ws1 staff sees % published-week rows (expected 1)', own_rows;
  end if;
  if own_version <> 2 then
    raise exception 'FAIL: ws1 staff sees version % (expected superseding version 2)', own_version;
  end if;
  raise notice 'PASS: ws1 staff sees exactly the latest snapshot version';

  select count(*) into foreign_rows
  from public.staff_portal_published_rota_weeks
  where workspace_id = '36000000-0000-4000-8000-000000000001';
  if foreign_rows <> 0 then
    raise exception 'FAIL: ws1 staff sees % rows from workspace 2 via the view', foreign_rows;
  end if;

  select count(*) into foreign_rows
  from public.published_rota_snapshots
  where workspace_id = '36000000-0000-4000-8000-000000000001';
  if foreign_rows <> 0 then
    raise exception 'FAIL: ws1 staff reads % workspace-2 snapshot rows directly', foreign_rows;
  end if;
  raise notice 'PASS: ws1 staff sees no cross-tenant rows (view or base table)';

  select count(*) into manager_rows from public.rota_weeks;
  if manager_rows <> 0 then
    raise exception 'FAIL: staff can read % manager-only rota_weeks rows', manager_rows;
  end if;
  raise notice 'PASS: rota_weeks stays manager-only under RLS';
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona (workspace 2): the mirror probe.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ae000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  own_rows integer;
  own_version integer;
  foreign_rows integer;
begin
  select count(*), min(snapshot_version) into own_rows, own_version
  from public.staff_portal_published_rota_weeks
  where workspace_id = '36000000-0000-4000-8000-000000000001';

  if own_rows <> 1 or own_version <> 1 then
    raise exception 'FAIL: ws2 staff sees % rows / version % (expected 1 row, version 1)', own_rows, own_version;
  end if;
  raise notice 'PASS: ws2 staff sees own published week';

  select count(*) into foreign_rows
  from public.staff_portal_published_rota_weeks
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if foreign_rows <> 0 then
    raise exception 'FAIL: ws2 staff sees % workspace-1 rows via the view', foreign_rows;
  end if;
  raise notice 'PASS: ws2 staff sees no workspace-1 rows';
end $$;

rollback;
