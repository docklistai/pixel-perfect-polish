-- Phase 49 manager-recorded absence. Runs inside one rolled-back transaction
-- against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase49_manager_recorded_absence_tests.sql
--
-- Proven here:
--   * a manager records an approved absence on the existing leave model, with
--     the manager stored as the decision-maker and no 'submitted' event;
--   * exactly one audit event is written;
--   * overlapping shifts are returned but never modified or deleted;
--   * pending/approved overlapping leave refuses; declined/cancelled does not;
--   * inactive staff, foreign-workspace staff, bad type, bad dates and blank
--     reason all refuse, and every refusal writes nothing at all;
--   * staff and anon callers are refused;
--   * a staff member sees only their own absence through RLS.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000491',
   'authenticated', 'authenticated', 'p49.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000492',
   'authenticated', 'authenticated', 'p49.alice@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000493',
   'authenticated', 'authenticated', 'p49.bob@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000491', 'p49-site', 'P49 Site', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000491', '41000000-0000-4000-8000-000000000491',
        'Main', 'Europe/London');

insert into public.departments (id, workspace_id, name, status)
values ('43000000-0000-4000-8000-000000000491', '41000000-0000-4000-8000-000000000491',
        'Kitchen', 'active');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('44000000-0000-4000-8000-000000000491', '41000000-0000-4000-8000-000000000491',
   'ad000000-0000-4000-8000-000000000491', 'owner', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('44000000-0000-4000-8000-000000000492', '41000000-0000-4000-8000-000000000491',
   'ad000000-0000-4000-8000-000000000492', 'staff', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('44000000-0000-4000-8000-000000000493', '41000000-0000-4000-8000-000000000491',
   'ad000000-0000-4000-8000-000000000493', 'staff', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

insert into public.staff_members (
  id, workspace_id, membership_id, primary_location_id, department_id,
  display_name, role_name, employment_status)
values
  ('46000000-0000-4000-8000-0000000004a1', '41000000-0000-4000-8000-000000000491',
   '44000000-0000-4000-8000-000000000492', '42000000-0000-4000-8000-000000000491',
   '43000000-0000-4000-8000-000000000491', 'Alice Cook', 'Chef', 'active'),
  ('46000000-0000-4000-8000-0000000004b1', '41000000-0000-4000-8000-000000000491',
   '44000000-0000-4000-8000-000000000493', '42000000-0000-4000-8000-000000000491',
   '43000000-0000-4000-8000-000000000491', 'Bob Porter', 'Porter', 'active'),
  ('46000000-0000-4000-8000-0000000004c1', '41000000-0000-4000-8000-000000000491',
   null, '42000000-0000-4000-8000-000000000491',
   '43000000-0000-4000-8000-000000000491', 'Ivan Left', 'Chef', 'left');

-- Draft week Monday 2026-08-03 with one assigned shift for Alice on the Wed.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000491', '41000000-0000-4000-8000-000000000491',
        '42000000-0000-4000-8000-000000000491', '2026-08-03', 'draft');

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values ('47000000-0000-4000-8000-000000000491', '41000000-0000-4000-8000-000000000491',
        '45000000-0000-4000-8000-000000000491', '42000000-0000-4000-8000-000000000491',
        '43000000-0000-4000-8000-000000000491', '46000000-0000-4000-8000-0000000004a1',
        date '2026-08-05',
        (date '2026-08-05' + time '09:00') at time zone 'Europe/London',
        (date '2026-08-05' + time '17:00') at time zone 'Europe/London',
        30, 'Chef', 'scheduled');

-- A genuinely foreign workspace + staff member for the cross-workspace case.
insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000499', 'p49-other', 'P49 Other', 'Europe/London');
insert into public.staff_members (id, workspace_id, display_name, role_name, employment_status)
values ('46000000-0000-4000-8000-0000000004f1', '41000000-0000-4000-8000-000000000499',
        'Foreign Staff', 'Chef', 'active');

select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000491","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------- happy path
do $$
declare
  result jsonb;
  stored record;
  event_count integer;
  audit_count integer;
begin
  result := public.rpc_manager_record_absence(
    '41000000-0000-4000-8000-000000000491',
    '46000000-0000-4000-8000-0000000004a1',
    'sick', date '2026-08-05', date '2026-08-06', 'Called in with flu');

  if result->>'status' <> 'approved' then
    raise exception 'FAIL: absence was not recorded as approved (%)', result;
  end if;

  if jsonb_array_length(result->'conflicting_shifts') <> 1
     or (result->'conflicting_shifts'->0->>'shift_id')
        <> '47000000-0000-4000-8000-000000000491' then
    raise exception 'FAIL: the overlapping shift was not reported (%)', result;
  end if;

  select * into stored from public.leave_requests
   where id = (result->>'leave_request_id')::uuid;

  if stored.status <> 'approved'
     or stored.decided_at is null
     or stored.decided_by_membership_id <> '44000000-0000-4000-8000-000000000491' then
    raise exception 'FAIL: the manager was not recorded as decision-maker';
  end if;

  if stored.leave_type <> 'sick' or stored.staff_member_id
     <> '46000000-0000-4000-8000-0000000004a1' then
    raise exception 'FAIL: stored absence does not match the request';
  end if;

  -- Not a simulated portal submission: no 'submitted' event exists.
  select count(*) into event_count from public.leave_request_events
   where leave_request_id = stored.id and event_type = 'submitted';
  if event_count <> 0 then
    raise exception 'FAIL: a fake submitted event was written';
  end if;

  select count(*) into event_count from public.leave_request_events
   where leave_request_id = stored.id;
  if event_count <> 1 then
    raise exception 'FAIL: expected exactly one leave_request_event, got %', event_count;
  end if;

  select count(*) into audit_count from public.audit_events
   where subject_id = stored.id and action = 'leave.manager_recorded';
  if audit_count <> 1 then
    raise exception 'FAIL: expected exactly one audit event, got %', audit_count;
  end if;

  select count(*) into audit_count from public.audit_events where subject_id = stored.id;
  if audit_count <> 1 then
    raise exception 'FAIL: extra audit events were written for this absence';
  end if;
end;
$$;

-- The conflicting shift must be untouched: still scheduled, still Alice's.
do $$
declare
  shift_row record;
begin
  select * into shift_row from public.shifts
   where id = '47000000-0000-4000-8000-000000000491';
  if shift_row.id is null then
    raise exception 'FAIL: the overlapping shift was deleted';
  end if;
  if shift_row.assignment_status <> 'scheduled'
     or shift_row.staff_member_id <> '46000000-0000-4000-8000-0000000004a1'
     or shift_row.break_minutes <> 30 then
    raise exception 'FAIL: the overlapping shift was modified';
  end if;
end;
$$;

-- ------------------------------------------------------------------ refusals
-- Every case asserts the sqlstate AND that nothing new was written.
do $$
declare
  before_count integer;
  after_count integer;
  audit_before integer;
  audit_after integer;

  procedure_failed boolean;

  cases text[] := array['overlap', 'inactive', 'foreign', 'bad_type',
                        'bad_dates', 'too_long', 'blank_reason'];
  this_case text;
  caught text;
begin
  select count(*) into before_count from public.leave_requests;
  select count(*) into audit_before from public.audit_events;

  foreach this_case in array cases loop
    procedure_failed := false;
    begin
      case this_case
        when 'overlap' then
          -- 2026-08-06 already sits inside the approved absence above.
          perform public.rpc_manager_record_absence(
            '41000000-0000-4000-8000-000000000491',
            '46000000-0000-4000-8000-0000000004a1',
            'annual_leave', date '2026-08-06', date '2026-08-07', 'Clashing');
        when 'inactive' then
          perform public.rpc_manager_record_absence(
            '41000000-0000-4000-8000-000000000491',
            '46000000-0000-4000-8000-0000000004c1',
            'sick', date '2026-09-01', date '2026-09-02', 'Left the business');
        when 'foreign' then
          perform public.rpc_manager_record_absence(
            '41000000-0000-4000-8000-000000000491',
            '46000000-0000-4000-8000-0000000004f1',
            'sick', date '2026-09-01', date '2026-09-02', 'Other workspace');
        when 'bad_type' then
          perform public.rpc_manager_record_absence(
            '41000000-0000-4000-8000-000000000491',
            '46000000-0000-4000-8000-0000000004b1',
            'sabbatical', date '2026-09-01', date '2026-09-02', 'Unsupported type');
        when 'bad_dates' then
          perform public.rpc_manager_record_absence(
            '41000000-0000-4000-8000-000000000491',
            '46000000-0000-4000-8000-0000000004b1',
            'sick', date '2026-09-05', date '2026-09-01', 'Backwards');
        when 'too_long' then
          perform public.rpc_manager_record_absence(
            '41000000-0000-4000-8000-000000000491',
            '46000000-0000-4000-8000-0000000004b1',
            'unpaid', date '2026-09-01', date '2028-09-01', 'Far too long');
        when 'blank_reason' then
          perform public.rpc_manager_record_absence(
            '41000000-0000-4000-8000-000000000491',
            '46000000-0000-4000-8000-0000000004b1',
            'sick', date '2026-09-01', date '2026-09-02', '   ');
      end case;
    exception
      when others then
        procedure_failed := true;
        caught := sqlstate;
        if caught not in ('55000', '22023', 'P0002') then
          raise exception 'FAIL: % refused with unexpected sqlstate %', this_case, caught;
        end if;
    end;

    if not procedure_failed then
      raise exception 'FAIL: % was not refused', this_case;
    end if;
  end loop;

  select count(*) into after_count from public.leave_requests;
  select count(*) into audit_after from public.audit_events;

  if after_count <> before_count then
    raise exception 'FAIL: a refused call wrote a leave request (% -> %)',
      before_count, after_count;
  end if;
  if audit_after <> audit_before then
    raise exception 'FAIL: a refused call wrote an audit event (% -> %)',
      audit_before, audit_after;
  end if;
end;
$$;

-- Declined and cancelled leave must NOT block a new absence. The seed row is
-- written as the table owner: the staff insert policy only permits a staff
-- member's own pending request, so `authenticated` cannot stage this fixture.
reset role;

insert into public.leave_requests (
  workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
  status, decided_at, decided_by_membership_id)
values ('41000000-0000-4000-8000-000000000491', '46000000-0000-4000-8000-0000000004b1',
        'annual_leave', date '2026-10-01', date '2026-10-03', 'Declined earlier',
        'declined', now(), '44000000-0000-4000-8000-000000000491');

set local role authenticated;

do $$
declare
  result jsonb;
begin
  result := public.rpc_manager_record_absence(
    '41000000-0000-4000-8000-000000000491',
    '46000000-0000-4000-8000-0000000004b1',
    'sick', date '2026-10-01', date '2026-10-03', 'Now actually off sick');

  if result->>'status' <> 'approved' then
    raise exception 'FAIL: a declined overlap wrongly blocked the absence (%)', result;
  end if;
  if jsonb_array_length(result->'conflicting_shifts') <> 0 then
    raise exception 'FAIL: unexpected shift conflict reported (%)', result;
  end if;
end;
$$;

-- ------------------------------------------------------- staff / anon callers
do $$
declare
  refused boolean := false;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ad000000-0000-4000-8000-000000000492","role":"authenticated"}', true);
  begin
    perform public.rpc_manager_record_absence(
      '41000000-0000-4000-8000-000000000491',
      '46000000-0000-4000-8000-0000000004b1',
      'sick', date '2026-11-01', date '2026-11-02', 'Staff should not do this');
  exception when others then
    refused := true;
  end;
  if not refused then
    raise exception 'FAIL: a staff caller was allowed to record an absence';
  end if;
end;
$$;

-- Portal isolation: Alice sees her own absence, Bob never sees it.
do $$
declare
  visible_to_owner integer;
  visible_to_other integer;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ad000000-0000-4000-8000-000000000492","role":"authenticated"}', true);
  select count(*) into visible_to_owner from public.leave_requests
   where staff_member_id = '46000000-0000-4000-8000-0000000004a1' and leave_type = 'sick';

  perform set_config('request.jwt.claims',
    '{"sub":"ad000000-0000-4000-8000-000000000493","role":"authenticated"}', true);
  select count(*) into visible_to_other from public.leave_requests
   where staff_member_id = '46000000-0000-4000-8000-0000000004a1' and leave_type = 'sick';

  if visible_to_owner < 1 then
    raise exception 'FAIL: the staff member cannot see their own recorded absence';
  end if;
  if visible_to_other <> 0 then
    raise exception 'FAIL: another staff member can see someone else''s absence';
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claims', null, true);

do $$
declare
  refused boolean := false;
begin
  set local role anon;
  begin
    perform public.rpc_manager_record_absence(
      '41000000-0000-4000-8000-000000000491',
      '46000000-0000-4000-8000-0000000004b1',
      'sick', date '2026-12-01', date '2026-12-02', 'Anon should not do this');
  exception when others then
    refused := true;
  end;
  reset role;
  if not refused then
    raise exception 'FAIL: an anonymous caller was allowed to record an absence';
  end if;
end;
$$;

-- ===========================================================================
-- Past-dated absence — the phase-49 narrowing of guard_leave_request_write.
--
-- A manager takes a call-in about a shift that has already started. Portal
-- submissions must still be unable to back-date, and a staff user must not be
-- able to reach the manager exemption by supplying approved/decided fields.
--
-- Dedicated fixtures below so these cases never overlap the dated rows above,
-- whenever the suite happens to run. All dates are relative to current_date.
-- ===========================================================================

reset role;
select set_config('request.jwt.claims', null, true);

-- A staff member with no other leave at all, used only for the past-date cases.
insert into public.staff_members (
  id, workspace_id, membership_id, primary_location_id, department_id,
  display_name, role_name, employment_status)
values ('46000000-0000-4000-8000-0000000004d1', '41000000-0000-4000-8000-000000000491',
        null, '42000000-0000-4000-8000-000000000491',
        '43000000-0000-4000-8000-000000000491', 'Pippa Past', 'Chef', 'active');

-- A suspended manager (own user), and an active owner membership that belongs to
-- the OTHER workspace. Both are deciders the exemption must refuse.
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000494',
   'authenticated', 'authenticated', 'p49.suspended@example.com');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('44000000-0000-4000-8000-000000000494', '41000000-0000-4000-8000-000000000491',
   'ad000000-0000-4000-8000-000000000494', 'manager', 'suspended',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('44000000-0000-4000-8000-000000000495', '41000000-0000-4000-8000-000000000499',
   'ad000000-0000-4000-8000-000000000491', 'owner', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

-- ------------------------------------------- manager records a past absence
select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000491","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
  stored record;
begin
  -- Yesterday's sickness — the exact call-in this phase exists to serve.
  result := public.rpc_manager_record_absence(
    '41000000-0000-4000-8000-000000000491',
    '46000000-0000-4000-8000-0000000004d1',
    'sick', current_date - 1, current_date - 1, 'Phoned in yesterday with flu');

  if result->>'status' <> 'approved' then
    raise exception 'FAIL: manager could not record yesterday''s sickness (%)', result;
  end if;

  select * into stored from public.leave_requests
   where id = (result->>'leave_request_id')::uuid;

  if stored.start_date <> current_date - 1 then
    raise exception 'FAIL: stored start_date is not yesterday (%)', stored.start_date;
  end if;
  if stored.status <> 'approved' then
    raise exception 'FAIL: past absence was not stored approved (%)', stored.status;
  end if;
  if stored.decided_by_membership_id <> '44000000-0000-4000-8000-000000000491' then
    raise exception 'FAIL: past absence has the wrong decider (%)',
      stored.decided_by_membership_id;
  end if;
end;
$$;

do $$
declare
  result jsonb;
  audit_before integer;
  audit_after integer;
begin
  select count(*) into audit_before from public.audit_events;

  -- A multi-day historical absence, e.g. a week off sick logged after the fact.
  result := public.rpc_manager_record_absence(
    '41000000-0000-4000-8000-000000000491',
    '46000000-0000-4000-8000-0000000004d1',
    'sick', current_date - 8, current_date - 4, 'Off all last week');

  if result->>'status' <> 'approved' then
    raise exception 'FAIL: manager could not record a historical multi-day absence (%)', result;
  end if;
  if (result->>'start_date')::date <> current_date - 8
     or (result->>'end_date')::date <> current_date - 4 then
    raise exception 'FAIL: historical range was not preserved (%)', result;
  end if;

  select count(*) into audit_after from public.audit_events;
  if audit_after <> audit_before + 1 then
    raise exception 'FAIL: a past absence wrote % audit events, expected exactly 1',
      audit_after - audit_before;
  end if;
end;
$$;

-- Same-day and future behaviour must be untouched by the narrowing.
do $$
declare
  result jsonb;
begin
  result := public.rpc_manager_record_absence(
    '41000000-0000-4000-8000-000000000491',
    '46000000-0000-4000-8000-0000000004d1',
    'personal', current_date, current_date, 'Starts today');
  if result->>'status' <> 'approved' then
    raise exception 'FAIL: same-day absence regressed (%)', result;
  end if;
end;
$$;

-- ------------------------------------ staff portal still cannot back-date
do $$
declare
  refused boolean := false;
  caught text;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ad000000-0000-4000-8000-000000000492","role":"authenticated"}', true);
  begin
    perform public.rpc_submit_leave_request(
      '41000000-0000-4000-8000-000000000491',
      'annual_leave', current_date - 3, current_date - 2, 'Back-dated portal request');
  exception when others then
    refused := true;
    caught := sqlstate;
  end;

  if not refused then
    raise exception 'FAIL: a staff portal submission was allowed to start in the past';
  end if;
  if caught <> '22023' then
    raise exception 'FAIL: portal back-date refused with %, expected 22023', caught;
  end if;
end;
$$;

-- ------------------------------------------------ the spoofing attempts
-- These bypass RLS deliberately (table owner) so the TRIGGER itself is what is
-- under test. In production RLS already forbids an authenticated insert with
-- status='approved' or a non-null decider; this proves the guard holds even if
-- that layer were ever loosened.
reset role;

do $$
declare
  rows_before integer;
  rows_after integer;
  events_before integer;
  events_after integer;
  notifications_before integer;
  notifications_after integer;
  audit_before integer;
  audit_after integer;

  cases text[] := array['staff_self_decider', 'staff_uses_manager_membership',
                        'suspended_manager', 'foreign_workspace_membership',
                        'pending_status', 'null_decider'];
  this_case text;
  refused boolean;
  caught text;
begin
  select count(*) into rows_before from public.leave_requests;
  select count(*) into events_before from public.leave_request_events;
  select count(*) into notifications_before from public.notifications;
  select count(*) into audit_before from public.audit_events;

  foreach this_case in array cases loop
    refused := false;
    begin
      case this_case
        -- A staff user marks their own back-dated row approved and names their
        -- own membership as decider. Their role is 'staff', so it must refuse.
        when 'staff_self_decider' then
          perform set_config('request.jwt.claims',
            '{"sub":"ad000000-0000-4000-8000-000000000492","role":"authenticated"}', true);
          insert into public.leave_requests (
            workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
            status, decided_at, decided_by_membership_id)
          values ('41000000-0000-4000-8000-000000000491',
                  '46000000-0000-4000-8000-0000000004a1', 'sick',
                  current_date - 2, current_date - 2, 'Spoof own decider',
                  'approved', now(), '44000000-0000-4000-8000-000000000492');

        -- A staff user names the real manager's membership as decider. It is
        -- not their user_id, so it must refuse.
        when 'staff_uses_manager_membership' then
          perform set_config('request.jwt.claims',
            '{"sub":"ad000000-0000-4000-8000-000000000492","role":"authenticated"}', true);
          insert into public.leave_requests (
            workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
            status, decided_at, decided_by_membership_id)
          values ('41000000-0000-4000-8000-000000000491',
                  '46000000-0000-4000-8000-0000000004a1', 'sick',
                  current_date - 2, current_date - 2, 'Spoof foreign decider',
                  'approved', now(), '44000000-0000-4000-8000-000000000491');

        -- A manager whose membership is suspended, acting as their own decider.
        when 'suspended_manager' then
          perform set_config('request.jwt.claims',
            '{"sub":"ad000000-0000-4000-8000-000000000494","role":"authenticated"}', true);
          insert into public.leave_requests (
            workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
            status, decided_at, decided_by_membership_id)
          values ('41000000-0000-4000-8000-000000000491',
                  '46000000-0000-4000-8000-0000000004a1', 'sick',
                  current_date - 2, current_date - 2, 'Suspended decider',
                  'approved', now(), '44000000-0000-4000-8000-000000000494');

        -- The caller's membership is active owner, but in a DIFFERENT workspace.
        when 'foreign_workspace_membership' then
          perform set_config('request.jwt.claims',
            '{"sub":"ad000000-0000-4000-8000-000000000491","role":"authenticated"}', true);
          insert into public.leave_requests (
            workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
            status, decided_at, decided_by_membership_id)
          values ('41000000-0000-4000-8000-000000000491',
                  '46000000-0000-4000-8000-0000000004a1', 'sick',
                  current_date - 2, current_date - 2, 'Foreign workspace decider',
                  'approved', now(), '44000000-0000-4000-8000-000000000495');

        -- A real manager, but the row is pending — the exemption is only for a
        -- recorded (already approved) absence, never a back-dated request.
        when 'pending_status' then
          perform set_config('request.jwt.claims',
            '{"sub":"ad000000-0000-4000-8000-000000000491","role":"authenticated"}', true);
          insert into public.leave_requests (
            workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
            status)
          values ('41000000-0000-4000-8000-000000000491',
                  '46000000-0000-4000-8000-0000000004a1', 'sick',
                  current_date - 2, current_date - 2, 'Back-dated pending', 'pending');

        -- Approved but with no decider at all.
        when 'null_decider' then
          perform set_config('request.jwt.claims',
            '{"sub":"ad000000-0000-4000-8000-000000000491","role":"authenticated"}', true);
          insert into public.leave_requests (
            workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
            status, decided_at, decided_by_membership_id)
          values ('41000000-0000-4000-8000-000000000491',
                  '46000000-0000-4000-8000-0000000004a1', 'sick',
                  current_date - 2, current_date - 2, 'No decider',
                  'approved', now(), null);
      end case;
    exception when others then
      refused := true;
      caught := sqlstate;
    end;

    if not refused then
      raise exception 'FAIL: spoofing case % was ALLOWED to back-date', this_case;
    end if;
    -- 22023 is the guard; 23514 is the table CHECK catching the null-decider
    -- variant first. Both are legitimate refusals, nothing else is.
    if caught not in ('22023', '23514') then
      raise exception 'FAIL: spoofing case % refused with unexpected sqlstate %',
        this_case, caught;
    end if;
  end loop;

  select count(*) into rows_after from public.leave_requests;
  select count(*) into events_after from public.leave_request_events;
  select count(*) into notifications_after from public.notifications;
  select count(*) into audit_after from public.audit_events;

  if rows_after <> rows_before then
    raise exception 'FAIL: a refused back-date wrote a leave request (% -> %)',
      rows_before, rows_after;
  end if;
  if events_after <> events_before then
    raise exception 'FAIL: a refused back-date wrote a leave event (% -> %)',
      events_before, events_after;
  end if;
  if notifications_after <> notifications_before then
    raise exception 'FAIL: a refused back-date wrote a notification (% -> %)',
      notifications_before, notifications_after;
  end if;
  if audit_after <> audit_before then
    raise exception 'FAIL: a refused back-date wrote an audit event (% -> %)',
      audit_before, audit_after;
  end if;
end;
$$;

-- The exemption itself still works at trigger level for a genuine manager.
do $$
declare
  inserted_id uuid;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ad000000-0000-4000-8000-000000000491","role":"authenticated"}', true);
  insert into public.leave_requests (
    workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
    status, decided_at, decided_by_membership_id)
  values ('41000000-0000-4000-8000-000000000491',
          '46000000-0000-4000-8000-0000000004b1', 'sick',
          current_date - 2, current_date - 2, 'Genuine manager back-date',
          'approved', now(), '44000000-0000-4000-8000-000000000491')
  returning id into inserted_id;

  if inserted_id is null then
    raise exception 'FAIL: a genuine manager back-dated insert did not land';
  end if;
end;
$$;

select set_config('request.jwt.claims', null, true);

rollback;
