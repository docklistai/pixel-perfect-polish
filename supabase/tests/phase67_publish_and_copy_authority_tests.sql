-- Phase 67 publish and copy authority verification suite.
--
-- Proves:
--   1. rpc_publish_rota_week allows publishing an empty week when p_allow_empty = true;
--   2. rpc_publish_rota_week refuses 0 shifts when p_allow_empty = false (55000);
--   3. republishing an empty week creates a new version with 0 shifts and sends 'removed' notifications;
--   4. rpc_copy_previous_rota_week sources exclusively from latest published snapshot;
--   5. rpc_copy_previous_rota_week ignores unpublished draft edits in the previous week;
--   6. rpc_copy_previous_rota_week refuses when previous week has no published snapshot (55000);
--   7. rpc_copy_previous_rota_week refuses when previous week has 0 published shifts (55000);
--   8. rpc_copy_previous_rota_week refuses when previous week does not exist (P0002).

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-6700-8000-000000000001', 'authenticated', 'authenticated', 'p67.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-6700-8000-000000000002', 'authenticated', 'authenticated', 'p67.staff@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('71000000-0000-6700-8000-000000000001', 'p67-site', 'P67 Site', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('72000000-0000-6700-8000-000000000001', '71000000-0000-6700-8000-000000000001', 'P67 Site', 'Europe/London');

insert into public.departments (id, workspace_id, name)
values ('73000000-0000-6700-8000-000000000001', '71000000-0000-6700-8000-000000000001', 'Floor');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('74000000-0000-6700-8000-000000000001', '71000000-0000-6700-8000-000000000001', 'ad000000-0000-6700-8000-000000000001', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('74000000-0000-6700-8000-000000000002', '71000000-0000-6700-8000-000000000001', 'ad000000-0000-6700-8000-000000000002', 'staff', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name, employment_status)
values
  ('75000000-0000-6700-8000-000000000001', '71000000-0000-6700-8000-000000000001', '74000000-0000-6700-8000-000000000001', '72000000-0000-6700-8000-000000000001', '73000000-0000-6700-8000-000000000001', 'Manager', 'Manager', 'active'),
  ('75000000-0000-6700-8000-000000000002', '71000000-0000-6700-8000-000000000001', '74000000-0000-6700-8000-000000000002', '72000000-0000-6700-8000-000000000001', '73000000-0000-6700-8000-000000000001', 'Worker', 'Server', 'active');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('76000000-0000-6700-8000-000000000001', '71000000-0000-6700-8000-000000000001', '72000000-0000-6700-8000-000000000001', '2026-06-08', 'draft'),
  ('76000000-0000-6700-8000-000000000002', '71000000-0000-6700-8000-000000000001', '72000000-0000-6700-8000-000000000001', '2026-06-15', 'draft');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-6700-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- --------------------------------------------------------------------------
-- 1. Publishing an empty week without allow_empty = true is refused.
-- --------------------------------------------------------------------------
do $$
begin
  perform public.rpc_publish_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '76000000-0000-6700-8000-000000000001',
    false,
    false
  );
  raise exception 'FAIL: publish empty week without allow_empty succeeded';
exception when sqlstate '55000' then
  raise notice 'PASS: 0 shifts refused when allow_empty is false';
end $$;

-- --------------------------------------------------------------------------
-- 2. Publishing an empty week with allow_empty = true succeeds.
-- --------------------------------------------------------------------------
do $$
declare
  result jsonb;
  week_status text;
  snap_count integer;
begin
  result := public.rpc_publish_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '76000000-0000-6700-8000-000000000001',
    false,
    true
  );

  if (result->>'shift_count')::int <> 0 or (result->>'version')::int <> 1 then
    raise exception 'FAIL: unexpected empty publish result %', result;
  end if;

  select status into week_status from public.rota_weeks
  where id = '76000000-0000-6700-8000-000000000001';
  if week_status <> 'published' then
    raise exception 'FAIL: week status not published: %', week_status;
  end if;

  select count(*) into snap_count from public.published_rota_snapshots
  where rota_week_id = '76000000-0000-6700-8000-000000000001';
  if snap_count <> 1 then
    raise exception 'FAIL: snapshot was not created (count %)', snap_count;
  end if;

  raise notice 'PASS: empty week published successfully with version 1';
end $$;

-- --------------------------------------------------------------------------
-- 3. Copying from an empty published week is refused with 55000.
-- --------------------------------------------------------------------------
do $$
begin
  perform public.rpc_copy_previous_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '72000000-0000-6700-8000-000000000001',
    '2026-06-15'
  );
  raise exception 'FAIL: copied from empty week';
exception when sqlstate '55000' then
  raise notice 'PASS: empty published week refused on copy (55000)';
end $$;

-- --------------------------------------------------------------------------
-- 4. Publish shifts, then modify draft: copy must source published, not draft.
-- --------------------------------------------------------------------------
reset role;
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status, colour_override
) values (
  '77000000-0000-6700-8000-000000000001', '71000000-0000-6700-8000-000000000001',
  '76000000-0000-6700-8000-000000000001', '72000000-0000-6700-8000-000000000001',
  '73000000-0000-6700-8000-000000000001', '75000000-0000-6700-8000-000000000002',
  '2026-06-08', '2026-06-08 09:00:00+01', '2026-06-08 17:00:00+01', 30, 'Server', 'scheduled', 'blue'
);
set local role authenticated;

-- Publish week 1 with 1 shift (version 2).
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '76000000-0000-6700-8000-000000000001',
    false,
    false
  );
  if (result->>'version')::int <> 2 or (result->>'shift_count')::int <> 1 then
    raise exception 'FAIL: publish v2 failed: %', result;
  end if;
  raise notice 'PASS: published v2 with 1 shift';
end $$;

-- Add an UNPUBLISHED draft shift to week 1.
reset role;
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '77000000-0000-6700-8000-000000000002', '71000000-0000-6700-8000-000000000001',
  '76000000-0000-6700-8000-000000000001', '72000000-0000-6700-8000-000000000001',
  '73000000-0000-6700-8000-000000000001', '75000000-0000-6700-8000-000000000002',
  '2026-06-09', '2026-06-09 10:00:00+01', '2026-06-09 16:00:00+01', 0, 'Server', 'scheduled'
);
set local role authenticated;

-- Now copy week 1 into week 2.
-- It must copy exactly 1 shift (from the published snapshot), NOT 2 (ignoring the draft shift).
do $$
declare
  result jsonb;
  target_count integer;
  copied_colour text;
begin
  result := public.rpc_copy_previous_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '72000000-0000-6700-8000-000000000001',
    '2026-06-15'
  );

  if (result->>'shifts_created')::int <> 1 then
    raise exception 'FAIL: copy created % shifts, expected 1 (published truth)', result->>'shifts_created';
  end if;

  select count(*) into target_count from public.shifts
  where rota_week_id = '76000000-0000-6700-8000-000000000002';
  if target_count <> 1 then
    raise exception 'FAIL: target week has % shifts (expected 1)', target_count;
  end if;

  select colour_override into copied_colour from public.shifts
  where rota_week_id = '76000000-0000-6700-8000-000000000002';
  if copied_colour is distinct from 'blue' then
    raise exception 'FAIL: colour override not preserved (got %)', copied_colour;
  end if;

  raise notice 'PASS: copy sourced 1 shift from published truth, ignoring draft edit, and preserved colour override';
end $$;

-- --------------------------------------------------------------------------
-- 5. Distinct refusal when previous week exists but was never published.
-- --------------------------------------------------------------------------
reset role;
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('76000000-0000-6700-8000-000000000003', '71000000-0000-6700-8000-000000000001', '72000000-0000-6700-8000-000000000001', '2026-06-22', 'draft');
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '77000000-0000-6700-8000-000000000003', '71000000-0000-6700-8000-000000000001',
  '76000000-0000-6700-8000-000000000003', '72000000-0000-6700-8000-000000000001',
  '73000000-0000-6700-8000-000000000001', null,
  '2026-06-22', '2026-06-22 10:00:00+01', '2026-06-22 18:00:00+01', 0, 'Server', 'open'
);
set local role authenticated;

-- Try copying week 22 June into 29 June. Week 22 June exists with shifts, but is NOT published.
do $$
begin
  perform public.rpc_copy_previous_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '72000000-0000-6700-8000-000000000001',
    '2026-06-29'
  );
  raise exception 'FAIL: copied from unpublished draft week';
exception when sqlstate '55000' then
  raise notice 'PASS: unpublished week refused with 55000';
end $$;

-- --------------------------------------------------------------------------
-- 6. Missing previous week refused with P0002.
-- --------------------------------------------------------------------------
do $$
begin
  perform public.rpc_copy_previous_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '72000000-0000-6700-8000-000000000001',
    '2026-07-20'
  );
  raise exception 'FAIL: copied from non-existent week';
exception when sqlstate 'P0002' then
  raise notice 'PASS: non-existent previous week refused with P0002';
end $$;

-- --------------------------------------------------------------------------
-- 7. Republishing empty week notifies affected staff of removed shifts.
-- --------------------------------------------------------------------------
-- In week 1, delete all draft shifts so it becomes an empty week.
reset role;
delete from public.shifts where rota_week_id = '76000000-0000-6700-8000-000000000001';
set local role authenticated;

do $$
declare
  result jsonb;
  notified_count integer;
begin
  result := public.rpc_publish_rota_week(
    '71000000-0000-6700-8000-000000000001',
    '76000000-0000-6700-8000-000000000001',
    false,
    true
  );

  if (result->>'version')::int <> 3 or (result->>'shift_count')::int <> 0 then
    raise exception 'FAIL: republish v3 empty failed: %', result;
  end if;

  select count(*) into notified_count
  from public.notifications
  where workspace_id = '71000000-0000-6700-8000-000000000001'
    and kind = 'shift_changed'
    and body like '%1 removed%';

  if notified_count <> 1 then
    raise exception 'FAIL: removed shift notification not sent (got %)', notified_count;
  end if;

  raise notice 'PASS: republishing empty week minted v3 and notified staff of removed shifts';
end $$;

rollback;
