-- Phase 41 offboarding + publish assignee preflight verification. Rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase41_offboarding_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000004101', 'authenticated', 'authenticated', 'p41.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000004102', 'authenticated', 'authenticated', 'p41.staff@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000004103', 'authenticated', 'authenticated', 'p41.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('81000000-0000-4000-8000-000000004101', 'p41-site', 'P41 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('82000000-0000-4000-8000-000000004101', '81000000-0000-4000-8000-000000004101', 'P41 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('83000000-0000-4000-8000-000000004101', '81000000-0000-4000-8000-000000004101', 'FOH');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('84000000-0000-4000-8000-000000004101', '81000000-0000-4000-8000-000000004101', 'ad000000-0000-4000-8000-000000004101', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('84000000-0000-4000-8000-000000004102', '81000000-0000-4000-8000-000000004101', 'ad000000-0000-4000-8000-000000004102', 'staff', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values
  ('85000000-0000-4000-8000-000000004101', '81000000-0000-4000-8000-000000004101', '84000000-0000-4000-8000-000000004102', '82000000-0000-4000-8000-000000004101', '83000000-0000-4000-8000-000000004101', 'P41 Waiter', 'Waiter'),
  ('85000000-0000-4000-8000-000000004102', '81000000-0000-4000-8000-000000004101', '84000000-0000-4000-8000-000000004101', '82000000-0000-4000-8000-000000004101', '83000000-0000-4000-8000-000000004101', 'P41 Manager Staff Record', 'Manager');

-- Unclaimed portal access code + pending recovery code for the waiter.
insert into public.staff_portal_access_codes (workspace_id, staff_member_id, code_digest, issued_by_membership_id)
values ('81000000-0000-4000-8000-000000004101', '85000000-0000-4000-8000-000000004101', sha256('P41CODE'::bytea), '84000000-0000-4000-8000-000000004101');
insert into public.staff_portal_recovery_codes (workspace_id, staff_member_id, code_digest, issued_by_membership_id, expires_at, reason, previous_user_id)
values ('81000000-0000-4000-8000-000000004101', '85000000-0000-4000-8000-000000004101', sha256('P41RECOVERY'::bytea), '84000000-0000-4000-8000-000000004101', now() + interval '2 days', 'Device change', 'ad000000-0000-4000-8000-000000004102');

-- A future week with a draft shift assigned to the waiter, published once
-- while the waiter was still active.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('86000000-0000-4000-8000-000000004101', '81000000-0000-4000-8000-000000004101', '82000000-0000-4000-8000-000000004101', (current_date + 7)::date, 'published');

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values
  ('87000000-0000-4000-8000-000000004101','81000000-0000-4000-8000-000000004101','86000000-0000-4000-8000-000000004101','82000000-0000-4000-8000-000000004101','83000000-0000-4000-8000-000000004101','85000000-0000-4000-8000-000000004101',
   (current_date + 8)::date, (current_date + 8)::timestamptz + interval '9 hours', (current_date + 8)::timestamptz + interval '17 hours', 30, 'Waiter', 'scheduled');

insert into public.published_rota_snapshots (id, workspace_id, rota_week_id, version, published_at, published_by_membership_id)
values ('88000000-0000-4000-8000-000000004101', '81000000-0000-4000-8000-000000004101', '86000000-0000-4000-8000-000000004101', 1, now(), '84000000-0000-4000-8000-000000004101');

insert into public.published_rota_shifts (
  workspace_id, snapshot_id, source_shift_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values
  ('81000000-0000-4000-8000-000000004101','88000000-0000-4000-8000-000000004101','87000000-0000-4000-8000-000000004101','82000000-0000-4000-8000-000000004101','83000000-0000-4000-8000-000000004101','85000000-0000-4000-8000-000000004101',
   (current_date + 8)::date, (current_date + 8)::timestamptz + interval '9 hours', (current_date + 8)::timestamptz + interval '17 hours', 30, 'Waiter', 'scheduled');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000004101","role":"authenticated"}', true);
set local role authenticated;

-- --------------------------------------------------------------------------
-- 1. Validation and cross-workspace denial.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    perform public.rpc_offboard_staff_member(
      '81000000-0000-4000-8000-000000004101',
      '85000000-0000-4000-8000-000000004101', '   ');
    raise exception 'FAIL: offboarded without a reason';
  exception when sqlstate '22023' then
    raise notice 'PASS: reason required';
  end;

  begin
    perform public.rpc_offboard_staff_member(
      '81000000-0000-4000-8000-000000004101',
      '99000000-0000-4000-8000-000000009999', 'Left the business');
    raise exception 'FAIL: offboarded a non-existent staff member';
  exception when sqlstate 'P0002' then
    raise notice 'PASS: unknown staff rejected';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 2. Full offboarding: access revoked, history retained, future work listed.
-- --------------------------------------------------------------------------
do $$
declare
  result jsonb;
  emp_status text;
  emp_end date;
  mem_status text;
begin
  result := public.rpc_offboard_staff_member(
    '81000000-0000-4000-8000-000000004101',
    '85000000-0000-4000-8000-000000004101',
    'Left the business');

  if (result->>'already_offboarded')::boolean then
    raise exception 'FAIL: first offboarding reported already_offboarded';
  end if;
  if not (result->>'membership_revoked')::boolean then
    raise exception 'FAIL: staff membership was not revoked';
  end if;
  if (result->>'access_codes_revoked')::int <> 1
     or (result->>'recovery_codes_revoked')::int <> 1 then
    raise exception 'FAIL: outstanding codes not revoked (%)', result;
  end if;
  if jsonb_array_length(result->'future_draft_assignments') <> 1 then
    raise exception 'FAIL: future draft assignments not listed (%)', result->'future_draft_assignments';
  end if;
  if jsonb_array_length(result->'future_published_assignments') <> 1 then
    raise exception 'FAIL: future published assignments not listed (%)', result->'future_published_assignments';
  end if;

  select employment_status, end_date into emp_status, emp_end
  from public.staff_members where id = '85000000-0000-4000-8000-000000004101';
  if emp_status <> 'left' or emp_end is null then
    raise exception 'FAIL: staff record not marked left with an end date (% / %)', emp_status, emp_end;
  end if;

  select status into mem_status from public.workspace_memberships
  where id = '84000000-0000-4000-8000-000000004102';
  if mem_status <> 'revoked' then
    raise exception 'FAIL: membership status % (expected revoked)', mem_status;
  end if;

  -- Historical records retained: the shift row still exists, still assigned.
  if not exists (select 1 from public.shifts where id = '87000000-0000-4000-8000-000000004101') then
    raise exception 'FAIL: historical shift deleted during offboarding';
  end if;

  raise notice 'PASS: offboarding revokes access, retains history, lists future work';

  -- Repeat request is idempotent.
  result := public.rpc_offboard_staff_member(
    '81000000-0000-4000-8000-000000004101',
    '85000000-0000-4000-8000-000000004101',
    'Left the business');
  if not (result->>'already_offboarded')::boolean then
    raise exception 'FAIL: repeat offboarding not reported as already offboarded';
  end if;
  raise notice 'PASS: repeat offboarding is idempotent';
end $$;

-- The internal credential tables are intentionally unreadable to the
-- authenticated role. Verify their persisted revocation through the local
-- service fixture role after the manager RPC assertions above.
reset role;
do $$
declare
  code_revoked timestamptz;
  recovery_revoked timestamptz;
begin
  select revoked_at into code_revoked from public.staff_portal_access_codes
  where staff_member_id = '85000000-0000-4000-8000-000000004101';
  select revoked_at into recovery_revoked from public.staff_portal_recovery_codes
  where staff_member_id = '85000000-0000-4000-8000-000000004101';
  if code_revoked is null or recovery_revoked is null then
    raise exception 'FAIL: outstanding codes not actually revoked';
  end if;
  raise notice 'PASS: credential revocation persisted behind internal-table permissions';
end $$;

-- --------------------------------------------------------------------------
-- 3. Publish preflight rejects the offboarded assignee and lists the shift;
--    republishing succeeds once the shift is unassigned.
-- --------------------------------------------------------------------------
do $$
declare
  err_message text;
begin
  begin
    insert into public.published_rota_snapshots (workspace_id, rota_week_id, version, published_at, published_by_membership_id)
    values ('81000000-0000-4000-8000-000000004101', '86000000-0000-4000-8000-000000004101', 2, now(), '84000000-0000-4000-8000-000000004101');
    raise exception 'FAIL: published a week with an offboarded assignee';
  exception when sqlstate '55000' then
    get stacked diagnostics err_message = message_text;
    if position('P41 Waiter' in err_message) = 0 then
      raise exception 'FAIL: preflight error does not list the affected shift (%)', err_message;
    end if;
    raise notice 'PASS: publish preflight rejects offboarded assignee and lists the shift';
  end;

  update public.shifts
  set staff_member_id = null, assignment_status = 'open'
  where id = '87000000-0000-4000-8000-000000004101';

  -- Missing staff keys cannot persist as assignees: the composite FK rejects
  -- them before publication, while the preflight still defensively handles a
  -- missing joined record.
  begin
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    ) values (
      '81000000-0000-4000-8000-000000004101',
      '86000000-0000-4000-8000-000000004101',
      '82000000-0000-4000-8000-000000004101',
      '83000000-0000-4000-8000-000000004101',
      '85000000-0000-4000-8000-000000009999',
      (current_date + 9)::date,
      (current_date + 9)::timestamptz + interval '9 hours',
      (current_date + 9)::timestamptz + interval '17 hours',
      30, 'Missing assignee', 'scheduled'
    );
    raise exception 'FAIL: a shift retained a missing staff assignee';
  exception when foreign_key_violation then
    raise notice 'PASS: missing staff assignees cannot persist';
  end;

  -- Employment-inactive is blocked independently of portal membership.
  insert into public.staff_members (
    id, workspace_id, primary_location_id, department_id, display_name,
    role_name, employment_status
  ) values (
    '85000000-0000-4000-8000-000000004103',
    '81000000-0000-4000-8000-000000004101',
    '82000000-0000-4000-8000-000000004101',
    '83000000-0000-4000-8000-000000004101',
    'P41 Inactive', 'Host', 'inactive'
  );
  insert into public.shifts (
    id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  ) values (
    '87000000-0000-4000-8000-000000004103',
    '81000000-0000-4000-8000-000000004101',
    '86000000-0000-4000-8000-000000004101',
    '82000000-0000-4000-8000-000000004101',
    '83000000-0000-4000-8000-000000004101',
    '85000000-0000-4000-8000-000000004103',
    (current_date + 9)::date,
    (current_date + 9)::timestamptz + interval '9 hours',
    (current_date + 9)::timestamptz + interval '17 hours',
    30, 'Host', 'scheduled'
  );
  begin
    insert into public.published_rota_snapshots (
      workspace_id, rota_week_id, version, published_at, published_by_membership_id
    ) values (
      '81000000-0000-4000-8000-000000004101',
      '86000000-0000-4000-8000-000000004101', 2, now(),
      '84000000-0000-4000-8000-000000004101'
    );
    raise exception 'FAIL: published a week with employment-inactive staff';
  exception when sqlstate '55000' then
    get stacked diagnostics err_message = message_text;
    if position('P41 Inactive' in err_message) = 0 or position('Host' in err_message) = 0 then
      raise exception 'FAIL: inactive preflight did not identify the shift (%)', err_message;
    end if;
    raise notice 'PASS: employment-inactive assignee blocked and identified';
  end;
  update public.shifts set staff_member_id = null, assignment_status = 'open'
  where id = '87000000-0000-4000-8000-000000004103';

  -- Suspended portal authority is blocked independently of employment state.
  insert into public.workspace_memberships (
    id, workspace_id, role, status, invited_at
  ) values (
    '84000000-0000-4000-8000-000000004104',
    '81000000-0000-4000-8000-000000004101', 'staff', 'suspended', now()
  );
  insert into public.staff_members (
    id, workspace_id, membership_id, primary_location_id, department_id,
    display_name, role_name, employment_status
  ) values (
    '85000000-0000-4000-8000-000000004104',
    '81000000-0000-4000-8000-000000004101',
    '84000000-0000-4000-8000-000000004104',
    '82000000-0000-4000-8000-000000004101',
    '83000000-0000-4000-8000-000000004101',
    'P41 Suspended', 'Runner', 'active'
  );
  insert into public.shifts (
    id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  ) values (
    '87000000-0000-4000-8000-000000004104',
    '81000000-0000-4000-8000-000000004101',
    '86000000-0000-4000-8000-000000004101',
    '82000000-0000-4000-8000-000000004101',
    '83000000-0000-4000-8000-000000004101',
    '85000000-0000-4000-8000-000000004104',
    (current_date + 10)::date,
    (current_date + 10)::timestamptz + interval '9 hours',
    (current_date + 10)::timestamptz + interval '17 hours',
    30, 'Runner', 'scheduled'
  );
  begin
    insert into public.published_rota_snapshots (
      workspace_id, rota_week_id, version, published_at, published_by_membership_id
    ) values (
      '81000000-0000-4000-8000-000000004101',
      '86000000-0000-4000-8000-000000004101', 2, now(),
      '84000000-0000-4000-8000-000000004101'
    );
    raise exception 'FAIL: published a week with suspended staff access';
  exception when sqlstate '55000' then
    get stacked diagnostics err_message = message_text;
    if position('P41 Suspended' in err_message) = 0 or position('Runner' in err_message) = 0 then
      raise exception 'FAIL: suspended preflight did not identify the shift (%)', err_message;
    end if;
    raise notice 'PASS: suspended assignee blocked and identified';
  end;
  update public.shifts set staff_member_id = null, assignment_status = 'open'
  where id = '87000000-0000-4000-8000-000000004104';

  insert into public.published_rota_snapshots (id, workspace_id, rota_week_id, version, published_at, published_by_membership_id)
  values ('88000000-0000-4000-8000-000000004102', '81000000-0000-4000-8000-000000004101', '86000000-0000-4000-8000-000000004101', 2, now(), '84000000-0000-4000-8000-000000004101');
  raise notice 'PASS: publish succeeds once the offboarded assignee is unassigned';
end $$;

-- --------------------------------------------------------------------------
-- 4. A manager-role membership is never revoked via a staff record.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000004101","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
  mem_status text;
begin
  result := public.rpc_offboard_staff_member(
    '81000000-0000-4000-8000-000000004101',
    '85000000-0000-4000-8000-000000004102',
    'Record cleanup');
  if (result->>'membership_revoked')::boolean then
    raise exception 'FAIL: offboarding a manager-linked staff record revoked the manager membership';
  end if;
  select status into mem_status from public.workspace_memberships
  where id = '84000000-0000-4000-8000-000000004101';
  if mem_status <> 'active' then
    raise exception 'FAIL: manager membership status % (expected active)', mem_status;
  end if;
  raise notice 'PASS: manager membership protected from staff offboarding';
end $$;

-- --------------------------------------------------------------------------
-- 5. Outsider cannot offboard.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000004103","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_offboard_staff_member(
      '81000000-0000-4000-8000-000000004101',
      '85000000-0000-4000-8000-000000004101', 'Hostile');
    raise exception 'FAIL: outsider offboarded staff';
  exception when sqlstate '42501' then
    raise notice 'PASS: outsider blocked (42501)';
  end;
end $$;

rollback;
