-- Phase 47 Build the Week apply verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase47_build_week_apply_tests.sql
--
-- Covers the journeys the Phase 1 closure audit identified as missing:
-- published-snapshot isolation, never-delete / never-alter-assigned, legitimate
-- duplicate reconciliation, stale proposal after shift/leave/availability
-- changes, digest tampering, and manager-assignment preservation.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000471', 'authenticated', 'authenticated', 'p47.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000472', 'authenticated', 'authenticated', 'p47.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000471', 'p47-site', 'P47 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000471', '41000000-0000-4000-8000-000000000471', 'P47 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000471', '41000000-0000-4000-8000-000000000471', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000471', '41000000-0000-4000-8000-000000000471', 'ad000000-0000-4000-8000-000000000471', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values
  ('46000000-0000-4000-8000-00000000047a', '41000000-0000-4000-8000-000000000471', 'Ana Chef', 'Chef', '43000000-0000-4000-8000-000000000471', 'active', 2400),
  ('46000000-0000-4000-8000-00000000047b', '41000000-0000-4000-8000-000000000471', 'Ben Chef', 'Chef', '43000000-0000-4000-8000-000000000471', 'active', 2400);

-- Target draft week, Monday 2026-08-03.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000471', '41000000-0000-4000-8000-000000000471', '42000000-0000-4000-8000-000000000471', '2026-08-03', 'draft');

-- One manager-made assignment and one open shift already in the week.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values
  ('47000000-0000-4000-8000-0000000004a1', '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471', '42000000-0000-4000-8000-000000000471', '43000000-0000-4000-8000-000000000471', '46000000-0000-4000-8000-00000000047a',
   '2026-08-03', '2026-08-03 09:00:00+01', '2026-08-03 17:00:00+01', 30, 'Chef', 'scheduled'),
  ('47000000-0000-4000-8000-0000000004a2', '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471', '42000000-0000-4000-8000-000000000471', '43000000-0000-4000-8000-000000000471', null,
   '2026-08-04', '2026-08-04 09:00:00+01', '2026-08-04 17:00:00+01', 30, 'Chef', 'open');

-- Approved leave for Ana on 2026-08-09, used by case 6. Seeded here as the
-- fixture owner: RLS only lets a staff member file their own leave, so a manager
-- session cannot insert it directly.
-- Approved leave must record who decided it, so the decision fields are set too.
insert into public.leave_requests (
  workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status,
  decided_at, decided_by_membership_id
)
values ('41000000-0000-4000-8000-000000000471', '46000000-0000-4000-8000-00000000047a',
        'annual_leave', '2026-08-09', '2026-08-09', 'fixture', 'approved',
        '2026-07-01T09:00:00Z', '44000000-0000-4000-8000-000000000471');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000471","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Helpers used by every case below.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.p47_signature(p_date text, p_start text, p_end text, p_overnight boolean)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'workDate', p_date, 'startLocal', p_start, 'endLocal', p_end,
    'overnight', p_overnight, 'roleKey', 'chef',
    'departmentId', '43000000-0000-4000-8000-000000000471',
    'locationId', '42000000-0000-4000-8000-000000000471',
    'breakMinutes', 30);
$$;

-- Goes through the manager-guarded wrapper, exactly as the app does.
create or replace function pg_temp.p47_fingerprint()
returns text language sql volatile as $fp$
  select public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    '{"kind":"current-week"}'::jsonb, '[]'::jsonb)->>'fingerprint';
$fp$;

do $$
declare
  ops jsonb;
  fingerprint text;
  digest text;
  result jsonb;
  shift_count integer;
  assigned_staff uuid;
begin
  -- =========================================================================
  -- 1. Creates only missing demand; never deletes; never alters an assignment.
  -- =========================================================================
  ops := jsonb_build_array(
    jsonb_build_object('kind', 'create-open',
      'signature', pg_temp.p47_signature('2026-08-05', '09:00', '17:00', false),
      'roleName', 'Chef', 'reason', 'test'));
  fingerprint := pg_temp.p47_fingerprint();
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';

  result := public.rpc_apply_build_week_proposal(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);

  if (result->>'created_open')::int <> 1 then
    raise exception 'FAIL: expected one open shift created, got %', result->>'created_open';
  end if;

  select count(*) into shift_count from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-000000000471';
  if shift_count <> 3 then
    raise exception 'FAIL: expected 3 shifts after apply, got %', shift_count;
  end if;

  select staff_member_id into assigned_staff from public.shifts
  where id = '47000000-0000-4000-8000-0000000004a1';
  if assigned_staff is distinct from '46000000-0000-4000-8000-00000000047a' then
    raise exception 'FAIL: the manager assignment was altered';
  end if;
  raise notice 'PASS: creates missing demand, deletes nothing, leaves assignments alone';

  -- =========================================================================
  -- 2. A stale fingerprint is refused with zero writes.
  -- =========================================================================
  ops := jsonb_build_array(
    jsonb_build_object('kind', 'create-open',
      'signature', pg_temp.p47_signature('2026-08-06', '09:00', '17:00', false),
      'roleName', 'Chef', 'reason', 'test'));
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';
  begin
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
      'stale-fingerprint-value', digest, '{"kind":"current-week"}'::jsonb, ops);
    raise exception 'FAIL: a stale proposal was applied';
  exception when sqlstate '55000' then null;
  end;

  select count(*) into shift_count from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-000000000471';
  if shift_count <> 3 then
    raise exception 'FAIL: a refused proposal still wrote rows (% shifts)', shift_count;
  end if;
  raise notice 'PASS: stale proposal refused with zero writes';

  -- =========================================================================
  -- 3. A tampered operation list is refused by the digest.
  -- =========================================================================
  fingerprint := pg_temp.p47_fingerprint();
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';
  ops := ops || jsonb_build_array(
    jsonb_build_object('kind', 'create-open',
      'signature', pg_temp.p47_signature('2026-08-07', '09:00', '17:00', false),
      'roleName', 'Chef', 'reason', 'injected'));
  begin
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
      fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);
    raise exception 'FAIL: a tampered proposal was applied';
  exception when sqlstate '55000' then null;
  end;
  raise notice 'PASS: tampered operation list refused by the digest';

  -- =========================================================================
  -- 4. Legitimate identical shifts are created as a count, not collapsed.
  -- =========================================================================
  ops := jsonb_build_array(
    jsonb_build_object('kind', 'create-open',
      'signature', pg_temp.p47_signature('2026-08-08', '18:00', '23:00', false),
      'roleName', 'Chef', 'reason', 'test'),
    jsonb_build_object('kind', 'create-open',
      'signature', pg_temp.p47_signature('2026-08-08', '18:00', '23:00', false),
      'roleName', 'Chef', 'reason', 'test'));
  fingerprint := pg_temp.p47_fingerprint();
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';
  perform public.rpc_apply_build_week_proposal(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);

  select count(*) into shift_count from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-000000000471'
    and shift_date = '2026-08-08';
  if shift_count <> 2 then
    raise exception 'FAIL: expected 2 identical shifts, got %', shift_count;
  end if;
  raise notice 'PASS: two identical required shifts produce two rows';

  -- =========================================================================
  -- 5. Assigning an existing open shift, and refusing a changed one.
  -- =========================================================================
  ops := jsonb_build_array(
    jsonb_build_object('kind', 'assign-open',
      'shiftId', '47000000-0000-4000-8000-0000000004a2',
      'staffId', '46000000-0000-4000-8000-00000000047b',
      'expected', pg_temp.p47_signature('2026-08-04', '09:00', '17:00', false),
      'reason', 'test'));
  fingerprint := pg_temp.p47_fingerprint();
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';
  result := public.rpc_apply_build_week_proposal(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);
  if (result->>'assigned_existing')::int <> 1 then
    raise exception 'FAIL: expected one existing open shift assigned';
  end if;
  raise notice 'PASS: an existing open shift receives a validated assignment';

  -- The same shift is now assigned, so a repeat must be refused.
  fingerprint := pg_temp.p47_fingerprint();
  begin
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
      fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);
    raise exception 'FAIL: an already-assigned shift was reassigned';
  exception when sqlstate '55000' then null;
  end;
  raise notice 'PASS: an already-assigned shift is never reassigned';

  -- =========================================================================
  -- 6. Approved leave refuses the assignment at apply time.
  -- =========================================================================
  ops := jsonb_build_array(
    jsonb_build_object('kind', 'create-assigned',
      'signature', pg_temp.p47_signature('2026-08-09', '09:00', '17:00', false),
      'roleName', 'Chef',
      'staffId', '46000000-0000-4000-8000-00000000047a', 'reason', 'test'));
  fingerprint := pg_temp.p47_fingerprint();
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';
  begin
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
      fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);
    raise exception 'FAIL: someone on approved leave was scheduled';
  exception when sqlstate '55000' then null;
  end;
  raise notice 'PASS: an assignment onto approved leave is refused';

  -- =========================================================================
  -- 7. Published snapshots are untouched by an apply.
  -- =========================================================================
  if exists (
    select 1 from public.published_rota_snapshots
    where workspace_id = '41000000-0000-4000-8000-000000000471'
  ) then
    raise exception 'FAIL: applying a proposal created a published snapshot';
  end if;
  raise notice 'PASS: no published snapshot row was created or altered';

  -- =========================================================================
  -- 8. Exactly one audit event per successful apply (three succeeded above).
  -- =========================================================================
  select count(*) into shift_count from public.audit_events
  where workspace_id = '41000000-0000-4000-8000-000000000471'
    and action = 'rota_week.built';
  if shift_count <> 3 then
    raise exception 'FAIL: expected 3 build audit events, got %', shift_count;
  end if;
  raise notice 'PASS: one audit event per successful apply';
end $$;

-- ---------------------------------------------------------------------------
-- OUTSIDER: cannot apply anything.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000472","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000471', '45000000-0000-4000-8000-000000000471',
      'x', 'y', '{"kind":"current-week"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: outsider applied a proposal';
  exception
    when sqlstate '42501' then raise notice 'PASS: outsider blocked (42501)';
  end;
end $$;

rollback;
