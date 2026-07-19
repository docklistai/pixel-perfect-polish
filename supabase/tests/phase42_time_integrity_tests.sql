-- Phase 42 time integrity verification (adversarial). Rolled-back transaction
-- against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase42_time_integrity_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000004201', 'authenticated', 'authenticated', 'p42.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000004202', 'authenticated', 'authenticated', 'p42.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('91000000-0000-4000-8000-000000004201', 'p42-site', 'P42 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('92000000-0000-4000-8000-000000004201', '91000000-0000-4000-8000-000000004201', 'P42 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('93000000-0000-4000-8000-000000004201', '91000000-0000-4000-8000-000000004201', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('94000000-0000-4000-8000-000000004201', '91000000-0000-4000-8000-000000004201', 'ad000000-0000-4000-8000-000000004201', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('95000000-0000-4000-8000-000000004201', '91000000-0000-4000-8000-000000004201', '94000000-0000-4000-8000-000000004201', '92000000-0000-4000-8000-000000004201', '93000000-0000-4000-8000-000000004201', 'P42 Chef', 'Chef');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000004201","role":"authenticated"}', true);
set local role authenticated;

-- --------------------------------------------------------------------------
-- 1. Manual entry: atomic create with validated bounds and audit event.
-- --------------------------------------------------------------------------
do $$
declare
  result jsonb;
  entry_id uuid;
  entry_status text;
  event_count integer;
begin
  -- Invalid inputs are rejected in the database.
  begin
    perform public.rpc_create_manual_time_entry(
      '91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201',
      '2026-06-10', '2026-06-10T17:00:00Z', '2026-06-10T09:00:00Z', 0, 'Backwards');
    raise exception 'FAIL: created an entry with clock-out before clock-in';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.rpc_create_manual_time_entry(
      '91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201',
      '2026-06-10', '2026-06-10T09:00:00Z', '2026-06-10T13:00:00Z', 300, 'Break too long');
    raise exception 'FAIL: created an entry whose break exceeds the worked duration';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.rpc_create_manual_time_entry(
      '91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201',
      '2026-06-10', '2026-06-10T09:00:00Z', '2026-06-10T17:00:00Z', 30, '   ');
    raise exception 'FAIL: created an entry without a reason';
  exception when sqlstate '22023' then null;
  end;
  raise notice 'PASS: manual entry rejects impossible bounds, oversized breaks, missing reason';

  result := public.rpc_create_manual_time_entry(
    '91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201',
    '2026-06-10', '2026-06-10T09:00:00Z', '2026-06-10T17:00:00Z', 30, 'Forgot to clock in');
  entry_id := (result->>'time_entry_id')::uuid;

  select approval_status into entry_status
  from public.time_entries where id = entry_id;
  if entry_status <> 'pending' then
    raise exception 'FAIL: manual entry status % (expected pending)', entry_status;
  end if;

  select count(*) into event_count
  from public.time_entry_events
  where time_entry_id = entry_id and event_type = 'created' and reason = 'Forgot to clock in';
  if event_count <> 1 then
    raise exception 'FAIL: manual entry created event missing';
  end if;
  raise notice 'PASS: manual entry lands pending with its audit-trail created event';
end $$;

-- --------------------------------------------------------------------------
-- 2. Database-level rejection of impossible rows for ANY writer.
-- --------------------------------------------------------------------------
reset role;

do $$
begin
  begin
    insert into public.time_entries (workspace_id, staff_member_id, work_date, clocked_in_at, clocked_out_at, break_minutes)
    values ('91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201', '2026-06-11', '2026-06-11T09:00:00Z', '2026-06-11T11:00:00Z', 600);
    raise exception 'FAIL: direct insert with break > duration was accepted';
  exception when sqlstate '23514' then
    raise notice 'PASS: break-within-duration enforced at table level';
  end;

  begin
    insert into public.time_entries (workspace_id, staff_member_id, work_date, clocked_in_at, clocked_out_at, break_minutes, approval_status, approved_at, approved_by_membership_id)
    values ('91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201', '2026-06-11', '2026-06-11T09:00:00Z', null, 0, 'approved', now(), '94000000-0000-4000-8000-000000004201');
    raise exception 'FAIL: approved an entry without a clock-out (direct write)';
  exception when sqlstate '55000' then
    raise notice 'PASS: approval requires complete clock bounds for any writer';
  end;
end $$;

-- Seed a missing-clock-out entry and an unscheduled complete entry for the
-- approval preflight probes.
insert into public.time_entries (id, workspace_id, staff_member_id, work_date, clocked_in_at, clocked_out_at, break_minutes)
values
  ('96000000-0000-4000-8000-000000004201', '91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201', '2026-06-12', '2026-06-12T09:00:00Z', null, 0),
  ('96000000-0000-4000-8000-000000004202', '91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201', '2026-06-13', '2026-06-13T09:00:00Z', '2026-06-13T17:00:00Z', 30);

set local role authenticated;

-- --------------------------------------------------------------------------
-- 3. Direct authenticated writes are denied: RPCs are authoritative.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.time_entries (
      workspace_id, staff_member_id, work_date, clocked_in_at, clocked_out_at
    ) values (
      '91000000-0000-4000-8000-000000004201',
      '95000000-0000-4000-8000-000000004201',
      '2026-06-14', '2026-06-14T09:00:00Z', '2026-06-14T17:00:00Z'
    );
    raise exception 'FAIL: manager inserted a time entry outside the RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.time_entries
    set approval_status = 'approved', approved_at = now(),
        approved_by_membership_id = '94000000-0000-4000-8000-000000004201'
    where id = '96000000-0000-4000-8000-000000004202';
    raise exception 'FAIL: manager approved a time entry outside the RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.time_entry_events (
      workspace_id, time_entry_id, actor_membership_id, event_type,
      resulting_approval_status, reason
    ) values (
      '91000000-0000-4000-8000-000000004201',
      '96000000-0000-4000-8000-000000004202',
      '94000000-0000-4000-8000-000000004201',
      'approved', 'approved', 'Forged direct event'
    );
    raise exception 'FAIL: manager inserted time audit evidence outside the RPC';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: time creation, state changes, and audit events are RPC-authoritative';
end $$;

-- --------------------------------------------------------------------------
-- 4. Approval preflight: incomplete bounds and unresolved unscheduled
--    attendance cannot be approved; correction then approval succeeds.
-- --------------------------------------------------------------------------
do $$
declare
  result jsonb;
  entry_status text;
begin
  begin
    perform public.rpc_batch_approve_time_entries(
      '91000000-0000-4000-8000-000000004201',
      array['96000000-0000-4000-8000-000000004201']::uuid[],
      'approved', 'Weekly batch');
    raise exception 'FAIL: approved an entry missing its clock-out';
  exception when sqlstate '55000' then
    raise notice 'PASS: missing clock-out blocks approval';
  end;

  -- Unscheduled attendance (no linked shift) without a reason is blocked.
  begin
    perform public.rpc_batch_approve_time_entries(
      '91000000-0000-4000-8000-000000004201',
      array['96000000-0000-4000-8000-000000004202']::uuid[],
      'approved', null);
    raise exception 'FAIL: approved unscheduled attendance without a resolution reason';
  exception when sqlstate '55000' then
    raise notice 'PASS: unscheduled attendance needs a recorded resolution reason';
  end;

  -- Correction path: manager fixes the missing clock-out, then approves both
  -- with an explicit reason.
  perform public.rpc_adjust_time_entry(
    '91000000-0000-4000-8000-000000004201',
    '96000000-0000-4000-8000-000000004201',
    '2026-06-12T09:00:00Z', '2026-06-12T17:30:00Z', 30,
    'Missed clock-out — confirmed with chef');

  result := public.rpc_batch_approve_time_entries(
    '91000000-0000-4000-8000-000000004201',
    array['96000000-0000-4000-8000-000000004201','96000000-0000-4000-8000-000000004202']::uuid[],
    'approved', 'Reviewed against the rota — hours confirmed');
  if (result->>'processed')::int <> 2 then
    raise exception 'FAIL: corrected entries not approved (%)', result;
  end if;

  select approval_status into entry_status
  from public.time_entries where id = '96000000-0000-4000-8000-000000004201';
  if entry_status <> 'approved' then
    raise exception 'FAIL: corrected entry status % (expected approved)', entry_status;
  end if;
  raise notice 'PASS: correction then reasoned approval succeeds';

  -- Adjustment audit evidence retained.
  if not exists (
    select 1 from public.audit_events
    where workspace_id = '91000000-0000-4000-8000-000000004201'
      and subject_type = 'time_entry'
      and subject_id = '96000000-0000-4000-8000-000000004201'
      and action = 'time_entry.adjusted'
  ) then
    raise exception 'FAIL: adjustment audit evidence missing';
  end if;
  raise notice 'PASS: adjustment audit evidence retained';

  -- An adjustment whose break exceeds the new duration hits the table check.
  begin
    perform public.rpc_adjust_time_entry(
      '91000000-0000-4000-8000-000000004201',
      '96000000-0000-4000-8000-000000004202',
      '2026-06-13T09:00:00Z', '2026-06-13T10:00:00Z', 120,
      'Bad adjustment');
    raise exception 'FAIL: adjusted an entry so its break exceeds the worked time';
  exception when sqlstate '23514' then
    raise notice 'PASS: invalid adjustment rejected by the database';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 5. Export reconciliation: approved hours match the validated fields, and
--    only approved entries are exported (the pending manual entry from
--    section 1 must not appear). corrected 2026-06-12: 8.5h - 30m = 480;
--    unscheduled 2026-06-13: 8h - 30m = 450. Total 930 minutes.
-- --------------------------------------------------------------------------
do $$
declare
  export_minutes bigint;
  export_entries bigint;
begin
  select approved_minutes, entry_count into export_minutes, export_entries
  from public.rpc_export_approved_hours(
    '91000000-0000-4000-8000-000000004201', '2026-06-01', '2026-06-30')
  where staff_member_id = '95000000-0000-4000-8000-000000004201';

  if export_entries <> 2 or export_minutes <> 930 then
    raise exception 'FAIL: export gave % entries / % minutes (expected 2 approved / 930)', export_entries, export_minutes;
  end if;
  raise notice 'PASS: approved export reconciles with validated clock facts; pending rows excluded';
end $$;

-- --------------------------------------------------------------------------
-- 6. Outsider denial.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000004202","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_create_manual_time_entry(
      '91000000-0000-4000-8000-000000004201', '95000000-0000-4000-8000-000000004201',
      '2026-06-10', '2026-06-10T09:00:00Z', '2026-06-10T17:00:00Z', 30, 'Hostile');
    raise exception 'FAIL: outsider created a manual entry';
  exception when sqlstate '42501' then
    raise notice 'PASS: outsider blocked (42501)';
  end;
end $$;

rollback;
