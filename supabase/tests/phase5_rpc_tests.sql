-- Phase 5 RPC verification. Runs entirely inside one rolled-back transaction
-- against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase5_rpc_tests.sql
--
-- Every expected rejection is caught by its exact SQLSTATE (42501 privilege,
-- P0002 not found in workspace, 55000 invalid state, 22023 invalid parameter).
-- A check that fails raises P0001 (FAIL) and aborts the script.

begin;

-- --------------------------------------------------------------------------
-- Setup (service path): test auth identities, claimed memberships, a second
-- workspace for cross-tenant probes, and a CSV-injection staff member.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'manager.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'olivia.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sophie.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'outsider.test@example.com');

update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000001', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000001';
update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000002', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000010';
update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000003', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000006';
update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000004', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000002';

-- Second workspace: full minimal graph, no claimed users.
insert into public.workspaces (id, slug, name, timezone)
values ('21000000-0000-4000-8000-000000000001', 'second-site', 'Second Site Hotel', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('22000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Second Site Hotel', 'Europe/London');

insert into public.departments (id, workspace_id, name)
values ('23000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Front of House');

insert into public.workspace_memberships (id, workspace_id, role, status, invited_at)
values
  ('24000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'owner', 'invited', '2026-06-01T08:00:00Z'),
  ('24000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', 'staff', 'invited', '2026-06-01T08:00:00Z');

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('25000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'Second Site Staff', 'Waiter');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('26000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '2026-06-15', 'draft');

insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values ('27000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', '2026-06-16', '2026-06-16T09:00:00+01:00', '2026-06-16T17:00:00+01:00', 30, 'Waiter', 'scheduled');

insert into public.leave_requests (id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status, submitted_at)
values ('28000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', 'personal', '2026-07-01', '2026-07-01', 'Second site request.', 'pending', '2026-06-10T09:00:00+01:00');

insert into public.time_entries (id, workspace_id, staff_member_id, work_date, clocked_in_at, clocked_out_at, break_minutes, approval_status, approved_at, approved_by_membership_id)
values ('29000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', '2026-06-08', '2026-06-08T09:00:00+01:00', '2026-06-08T17:00:00+01:00', 30, 'approved', '2026-06-09T09:00:00+01:00', '24000000-0000-4000-8000-000000000001');

-- CSV-injection staff member in workspace 1 with an approved entry in range.
insert into public.staff_members (id, workspace_id, primary_location_id, display_name, role_name)
values ('14000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '=2+5', '@cmd');

insert into public.time_entries (id, workspace_id, staff_member_id, work_date, clocked_in_at, clocked_out_at, break_minutes, approval_status, approved_at, approved_by_membership_id)
values ('1b000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000009', '2026-06-08', '2026-06-08T09:00:00+01:00', '2026-06-08T17:00:00+01:00', 60, 'approved', '2026-06-09T09:00:00+01:00', '13000000-0000-4000-8000-000000000001');

-- --------------------------------------------------------------------------
-- MANAGER persona: publish happy path, versioning, fan-out, staff visibility
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

savepoint publish_happy;
do $$
declare
  result jsonb;
  portal_shift_count bigint;
  portal_notification_count bigint;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
  if (result ->> 'version')::int <> 1 then raise exception 'FAIL: first publish version was %', result ->> 'version'; end if;
  if (result ->> 'shift_count')::int <> 4 then raise exception 'FAIL: publish copied % shifts (expected 4)', result ->> 'shift_count'; end if;
  if (result ->> 'notified_memberships')::int <> 2 then raise exception 'FAIL: publish notified % memberships (expected 2 active staff)', result ->> 'notified_memberships'; end if;

  perform 1 from public.rota_weeks where id = '15000000-0000-4000-8000-000000000002' and status = 'published';
  if not found then raise exception 'FAIL: rota week not marked published'; end if;
  perform 1 from public.published_rota_snapshots
    where id = (result ->> 'snapshot_id')::uuid and version = 1
      and published_by_membership_id = '13000000-0000-4000-8000-000000000010';
  if not found then raise exception 'FAIL: snapshot missing or publisher not the caller'; end if;
  perform 1 from public.notifications
    where kind = 'rota_published' and created_by_membership_id = '13000000-0000-4000-8000-000000000010'
      and related_entity_id = (result ->> 'snapshot_id')::uuid;
  if not found then raise exception 'FAIL: rota_published notification missing'; end if;
  perform 1 from public.audit_events
    where action = 'rota.published' and actor_membership_id = '13000000-0000-4000-8000-000000000010'
      and subject_id = (result ->> 'snapshot_id')::uuid;
  if not found then raise exception 'FAIL: publish audit event missing'; end if;

  -- Republish: versions stay sequential through the RPC.
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
  if (result ->> 'version')::int <> 2 then raise exception 'FAIL: republish version was %', result ->> 'version'; end if;
  set constraints all immediate;

  -- Staff portal: Olivia sees only the latest published projection (2 seeded
  -- week-1 rows + 2 open shifts in the new week-2 snapshot) and her deliveries.
  perform set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
  select count(*) into portal_shift_count from public.staff_portal_published_shifts;
  if portal_shift_count <> 4 then raise exception 'FAIL: staff portal sees % published shifts (expected 4)', portal_shift_count; end if;
  select count(*) into portal_notification_count from public.staff_portal_notifications;
  if portal_notification_count <> 4 then raise exception 'FAIL: staff portal sees % notifications (expected 4)', portal_notification_count; end if;

  raise notice 'PASS: publish is atomic, sequential, fanned out, audited, and staff-visible';
end $$;
rollback to savepoint publish_happy;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

savepoint publish_failures;
do $$
declare
  empty_week_id uuid;
  audit_count_before bigint;
  audit_count_after bigint;
begin
  insert into public.rota_weeks (workspace_id, location_id, week_start)
  values ('10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2026-06-22')
  returning id into empty_week_id;

  select count(*) into audit_count_before from public.audit_events;
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', empty_week_id);
    raise exception 'FAIL: empty rota week published';
  exception when sqlstate '55000' then raise notice 'PASS: empty rota week publish rejected'; end;

  perform 1 from public.published_rota_snapshots where rota_week_id = empty_week_id;
  if found then raise exception 'FAIL: snapshot row survived a failed publish'; end if;
  select count(*) into audit_count_after from public.audit_events;
  if audit_count_after <> audit_count_before then raise exception 'FAIL: audit rows survived a failed publish'; end if;
  raise notice 'PASS: failed publish rolls back atomically';

  update public.rota_weeks set status = 'archived' where id = empty_week_id;
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', empty_week_id);
    raise exception 'FAIL: archived rota week published';
  exception when sqlstate '55000' then raise notice 'PASS: archived rota week publish rejected'; end;
end $$;
rollback to savepoint publish_failures;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', gen_random_uuid());
    raise exception 'FAIL: unknown rota week published';
  exception when no_data_found then raise notice 'PASS: unknown rota week rejected'; end;
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: another workspace''s rota week published through workspace 1';
  exception when no_data_found then raise notice 'PASS: cross-workspace rota week is invisible'; end;
  begin
    perform public.rpc_publish_rota_week('21000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: manager published in a foreign workspace';
  exception when insufficient_privilege then raise notice 'PASS: no membership in target workspace blocks publish'; end;
end $$;

-- --------------------------------------------------------------------------
-- MANAGER persona: leave decision lifecycle
-- --------------------------------------------------------------------------
savepoint leave_flow;
do $$
declare result jsonb;
begin
  result := public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'approved', 'Cover arranged.');
  perform 1 from public.leave_requests
    where id = '19000000-0000-4000-8000-000000000001' and status = 'approved'
      and decided_by_membership_id = '13000000-0000-4000-8000-000000000010'
      and decided_at is not null and decision_reason = 'Cover arranged.';
  if not found then raise exception 'FAIL: approval not recorded with caller attribution'; end if;
  perform 1 from public.leave_request_events
    where leave_request_id = '19000000-0000-4000-8000-000000000001' and event_type = 'approved'
      and resulting_status = 'approved' and actor_membership_id = '13000000-0000-4000-8000-000000000010';
  if not found then raise exception 'FAIL: approved event missing'; end if;
  perform 1 from public.notification_deliveries as delivery
    join public.notifications as notification
      on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
    where notification.kind = 'leave_approved'
      and notification.related_entity_id = '19000000-0000-4000-8000-000000000001'
      and delivery.recipient_membership_id = '13000000-0000-4000-8000-000000000002';
  if not found then raise exception 'FAIL: leave_approved delivery to the requester missing'; end if;
  perform 1 from public.audit_events
    where action = 'leave.approved' and subject_id = '19000000-0000-4000-8000-000000000001'
      and actor_membership_id = '13000000-0000-4000-8000-000000000010';
  if not found then raise exception 'FAIL: leave.approved audit event missing'; end if;

  begin
    perform public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'declined', null);
    raise exception 'FAIL: decided request was decided again';
  exception when sqlstate '55000' then raise notice 'PASS: double decision rejected'; end;

  result := public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'pending', 'Re-checking cover.');
  perform 1 from public.leave_requests
    where id = '19000000-0000-4000-8000-000000000001' and status = 'pending'
      and decided_at is null and decided_by_membership_id is null and decision_reason is null;
  if not found then raise exception 'FAIL: reopen did not reset decision fields'; end if;
  perform 1 from public.leave_request_events
    where leave_request_id = '19000000-0000-4000-8000-000000000001' and event_type = 'reopened' and resulting_status = 'pending';
  if not found then raise exception 'FAIL: reopened event missing'; end if;

  result := public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'declined', 'Short staffed.');
  perform 1 from public.leave_requests where id = '19000000-0000-4000-8000-000000000001' and status = 'declined';
  if not found then raise exception 'FAIL: decline not recorded'; end if;
  perform 1 from public.notifications where kind = 'leave_declined' and related_entity_id = '19000000-0000-4000-8000-000000000001';
  if not found then raise exception 'FAIL: leave_declined notification missing'; end if;

  begin
    perform public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'cancelled', null);
    raise exception 'FAIL: cancelled accepted as a manager decision';
  exception when invalid_parameter_value then raise notice 'PASS: cancelled is not a manager decision'; end;

  raise notice 'PASS: leave decision lifecycle (approve, reopen, decline) is recorded, notified, audited';
end $$;
rollback to savepoint leave_flow;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', gen_random_uuid(), 'approved', null);
    raise exception 'FAIL: unknown leave request decided';
  exception when no_data_found then raise notice 'PASS: unknown leave request rejected'; end;
  begin
    perform public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '28000000-0000-4000-8000-000000000001', 'approved', null);
    raise exception 'FAIL: another workspace''s leave request decided through workspace 1';
  exception when no_data_found then raise notice 'PASS: cross-workspace leave request is invisible'; end;
end $$;

-- --------------------------------------------------------------------------
-- MANAGER persona: batch time approvals
-- --------------------------------------------------------------------------
savepoint batch_flow;
do $$
declare
  result jsonb;
  event_count bigint;
begin
  result := public.rpc_batch_approve_time_entries(
    '10000000-0000-4000-8000-000000000001',
    array['1b000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000002']::uuid[],
    'approved', 'Weekly sign-off.');
  if (result ->> 'processed')::int <> 1 or (result ->> 'skipped')::int <> 1 then
    raise exception 'FAIL: batch approve processed/skipped = %/% (expected 1/1)', result ->> 'processed', result ->> 'skipped';
  end if;
  perform 1 from public.time_entries
    where id = '1b000000-0000-4000-8000-000000000002' and approval_status = 'approved'
      and approved_by_membership_id = '13000000-0000-4000-8000-000000000010' and approved_at is not null;
  if not found then raise exception 'FAIL: batch approval not caller-attributed'; end if;
  select count(*) into event_count from public.time_entry_events
    where time_entry_id = '1b000000-0000-4000-8000-000000000002' and event_type = 'approved'
      and actor_membership_id = '13000000-0000-4000-8000-000000000010';
  if event_count <> 1 then raise exception 'FAIL: expected exactly one approved event, got %', event_count; end if;
  perform 1 from public.audit_events
    where action = 'time_entry.batch_approved' and subject_type = 'time_entry_batch'
      and actor_membership_id = '13000000-0000-4000-8000-000000000010';
  if not found then raise exception 'FAIL: batch summary audit event missing'; end if;

  result := public.rpc_batch_approve_time_entries(
    '10000000-0000-4000-8000-000000000001',
    array['1b000000-0000-4000-8000-000000000001']::uuid[], 'pending', 'Re-check.');
  perform 1 from public.time_entries
    where id = '1b000000-0000-4000-8000-000000000001' and approval_status = 'pending'
      and approved_at is null and approved_by_membership_id is null;
  if not found then raise exception 'FAIL: batch reopen did not reset approval fields'; end if;
  perform 1 from public.time_entry_events
    where time_entry_id = '1b000000-0000-4000-8000-000000000001' and event_type = 'reopened';
  if not found then raise exception 'FAIL: reopened event missing'; end if;

  result := public.rpc_batch_approve_time_entries(
    '10000000-0000-4000-8000-000000000001',
    array['1b000000-0000-4000-8000-000000000001']::uuid[], 'rejected', 'Hours mismatch.');
  perform 1 from public.time_entries where id = '1b000000-0000-4000-8000-000000000001' and approval_status = 'rejected';
  if not found then raise exception 'FAIL: batch reject not recorded'; end if;

  -- Atomicity: a single unknown id aborts the whole batch.
  select count(*) into event_count from public.time_entry_events;
  begin
    perform public.rpc_batch_approve_time_entries(
      '10000000-0000-4000-8000-000000000001',
      array['1b000000-0000-4000-8000-000000000002', gen_random_uuid()]::uuid[], 'pending', null);
    raise exception 'FAIL: batch with unknown entry id succeeded';
  exception when no_data_found then raise notice 'PASS: unknown entry id aborts the batch'; end;
  if (select count(*) from public.time_entry_events) <> event_count then
    raise exception 'FAIL: partial batch effects survived the abort';
  end if;

  begin
    perform public.rpc_batch_approve_time_entries(
      '10000000-0000-4000-8000-000000000001',
      array['29000000-0000-4000-8000-000000000001']::uuid[], 'pending', null);
    raise exception 'FAIL: cross-workspace entry processed through workspace 1';
  exception when no_data_found then raise notice 'PASS: cross-workspace time entry is invisible to the batch'; end;
  begin
    perform public.rpc_batch_approve_time_entries('10000000-0000-4000-8000-000000000001', array[]::uuid[], 'approved', null);
    raise exception 'FAIL: empty batch accepted';
  exception when invalid_parameter_value then raise notice 'PASS: empty batch rejected'; end;
  begin
    perform public.rpc_batch_approve_time_entries(
      '10000000-0000-4000-8000-000000000001',
      array['1b000000-0000-4000-8000-000000000002']::uuid[], 'cancelled', null);
    raise exception 'FAIL: invalid approval status accepted';
  exception when invalid_parameter_value then raise notice 'PASS: invalid approval status rejected'; end;

  raise notice 'PASS: batch approvals are atomic, evented per entry, and summary-audited';
end $$;
rollback to savepoint batch_flow;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- --------------------------------------------------------------------------
-- MANAGER persona: time entry adjustment
-- --------------------------------------------------------------------------
savepoint adjust_flow;
do $$
declare result jsonb;
begin
  result := public.rpc_adjust_time_entry(
    '10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001',
    '2026-06-08T07:05:00+01:00', '2026-06-08T15:10:00+01:00', 45, 'Forgot to record the full break.');
  perform 1 from public.time_entries
    where id = '1b000000-0000-4000-8000-000000000001' and approval_status = 'pending'
      and approved_at is null and approved_by_membership_id is null
      and clocked_in_at = '2026-06-08T07:05:00+01:00'::timestamptz
      and clocked_out_at = '2026-06-08T15:10:00+01:00'::timestamptz
      and break_minutes = 45;
  if not found then raise exception 'FAIL: adjustment did not rewrite clock state and reset approval'; end if;
  perform 1 from public.time_entry_events
    where time_entry_id = '1b000000-0000-4000-8000-000000000001' and event_type = 'adjusted'
      and resulting_approval_status = 'pending' and actor_membership_id = '13000000-0000-4000-8000-000000000010';
  if not found then raise exception 'FAIL: adjusted event missing'; end if;
  perform 1 from public.audit_events
    where action = 'time_entry.adjusted' and subject_id = '1b000000-0000-4000-8000-000000000001'
      and (details ->> 'previous_approval_status') = 'approved';
  if not found then raise exception 'FAIL: adjustment audit event with previous state missing'; end if;

  begin
    perform public.rpc_adjust_time_entry(
      '10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001',
      '2026-06-08T15:00:00+01:00', '2026-06-08T07:00:00+01:00', 30, 'Backwards.');
    raise exception 'FAIL: clock-out before clock-in accepted';
  exception when invalid_parameter_value then raise notice 'PASS: inverted clock times rejected'; end;
  begin
    perform public.rpc_adjust_time_entry(
      '10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001',
      '2026-06-08T07:00:00+01:00', '2026-06-08T15:00:00+01:00', 30, '   ');
    raise exception 'FAIL: blank adjustment reason accepted';
  exception when invalid_parameter_value then raise notice 'PASS: an adjustment reason is mandatory'; end;
  begin
    perform public.rpc_adjust_time_entry(
      '10000000-0000-4000-8000-000000000001', gen_random_uuid(),
      '2026-06-08T07:00:00+01:00', '2026-06-08T15:00:00+01:00', 30, 'Missing.');
    raise exception 'FAIL: unknown time entry adjusted';
  exception when no_data_found then raise notice 'PASS: unknown time entry rejected'; end;
  begin
    perform public.rpc_adjust_time_entry(
      '10000000-0000-4000-8000-000000000001', '29000000-0000-4000-8000-000000000001',
      '2026-06-08T07:00:00+01:00', '2026-06-08T15:00:00+01:00', 30, 'Cross workspace.');
    raise exception 'FAIL: cross-workspace time entry adjusted through workspace 1';
  exception when no_data_found then raise notice 'PASS: cross-workspace time entry is invisible to adjustment'; end;

  raise notice 'PASS: adjustments rewrite state, reset approval, and keep evented/audited history';
end $$;
rollback to savepoint adjust_flow;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- --------------------------------------------------------------------------
-- MANAGER persona: approved hours export
-- --------------------------------------------------------------------------
savepoint export_flow;
do $$
declare
  export_row_count bigint;
  olivia_minutes bigint;
  olivia_hours numeric;
begin
  select count(*) into export_row_count
  from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14');
  if export_row_count <> 2 then
    raise exception 'FAIL: export returned % rows (expected 2: approved entries only, workspace 1 only)', export_row_count;
  end if;

  select export.approved_minutes, export.approved_hours into olivia_minutes, olivia_hours
  from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14') as export
  where export.staff_member_id = '14000000-0000-4000-8000-000000000005';
  if olivia_minutes <> 450 or olivia_hours <> 7.50 then
    raise exception 'FAIL: Olivia exported as % minutes / % hours (expected 450 / 7.50)', olivia_minutes, olivia_hours;
  end if;

  perform 1 from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14') as export
  where export.staff_member_id = '14000000-0000-4000-8000-000000000009'
    and left(export.display_name, 1) = '''' and left(export.role_name, 1) = '''';
  if not found then raise exception 'FAIL: CSV formula injection not neutralised'; end if;

  perform 1 from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14') as export
  where export.staff_member_id = '14000000-0000-4000-8000-000000000002';
  if found then raise exception 'FAIL: pending entry leaked into the approved export'; end if;

  select count(*) into export_row_count
  from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-09', '2026-06-14');
  if export_row_count <> 0 then raise exception 'FAIL: date scope ignored (% rows outside range)', export_row_count; end if;

  perform 1 from public.audit_events
    where action = 'time_entries.exported' and actor_membership_id = '13000000-0000-4000-8000-000000000010'
      and (details ->> 'start_date') = '2026-06-01' and (details ->> 'entry_count') = '2';
  if not found then raise exception 'FAIL: export audit event missing'; end if;

  begin
    perform 1 from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-14', '2026-06-01');
    raise exception 'FAIL: inverted export range accepted';
  exception when invalid_parameter_value then raise notice 'PASS: inverted export range rejected'; end;
  begin
    perform 1 from public.rpc_export_approved_hours('21000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14');
    raise exception 'FAIL: export ran against a foreign workspace';
  exception when insufficient_privilege then raise notice 'PASS: export requires membership in the target workspace'; end;

  raise notice 'PASS: export is approved-only, workspace-scoped, date-scoped, CSV-safe, audited';
end $$;
rollback to savepoint export_flow;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_in');
    raise exception 'FAIL: manager used the staff clock';
  exception when insufficient_privilege then raise notice 'PASS: the staff clock rejects manager/owner roles'; end;
  begin
    perform public.rpc_submit_leave_request('10000000-0000-4000-8000-000000000001', 'personal', '2026-07-06', '2026-07-06', 'No staff record.');
    raise exception 'FAIL: manager without staff record submitted leave';
  exception when insufficient_privilege then raise notice 'PASS: leave submission requires an active staff record'; end;
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia): manager RPCs are closed
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: staff published a rota week';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot publish'; end;
  begin
    perform public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000002', 'pending', null);
    raise exception 'FAIL: staff decided a leave request';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot decide leave'; end;
  begin
    perform public.rpc_batch_approve_time_entries('10000000-0000-4000-8000-000000000001', array['1b000000-0000-4000-8000-000000000001']::uuid[], 'approved', null);
    raise exception 'FAIL: staff approved time entries';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot approve time entries'; end;
  begin
    perform public.rpc_adjust_time_entry('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', null, null, 0, 'Hijack.');
    raise exception 'FAIL: staff adjusted a time entry';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot adjust time entries'; end;
  begin
    perform 1 from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14');
    raise exception 'FAIL: staff exported approved hours';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot export approved hours'; end;
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia): clock lifecycle on own records only
-- --------------------------------------------------------------------------
savepoint staff_clock;
do $$
declare
  clock_in_result jsonb;
  clock_out_result jsonb;
  own_entry_id uuid;
begin
  clock_in_result := public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_in');
  own_entry_id := (clock_in_result ->> 'time_entry_id')::uuid;
  perform 1 from public.time_entries
    where id = own_entry_id and staff_member_id = '14000000-0000-4000-8000-000000000005'
      and work_date = current_date and clocked_in_at is not null
      and clocked_out_at is null and approval_status = 'pending';
  if not found then raise exception 'FAIL: clock_in did not open an own pending entry'; end if;
  perform 1 from public.clock_events
    where id = (clock_in_result ->> 'clock_event_id')::uuid and event_type = 'clock_in'
      and source = 'staff' and actor_membership_id = '13000000-0000-4000-8000-000000000006'
      and staff_member_id = '14000000-0000-4000-8000-000000000005';
  if not found then raise exception 'FAIL: clock_in event not staff-sourced and caller-attributed'; end if;

  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_in');
    raise exception 'FAIL: double clock_in accepted';
  exception when sqlstate '55000' then raise notice 'PASS: double clock_in rejected'; end;

  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'break_start');
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'break_start');
    raise exception 'FAIL: second concurrent break accepted';
  exception when sqlstate '55000' then raise notice 'PASS: overlapping break rejected'; end;
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_out');
    raise exception 'FAIL: clock_out accepted with an open break';
  exception when sqlstate '55000' then raise notice 'PASS: clock_out requires the break to be closed'; end;
  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'break_end');
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'break_end');
    raise exception 'FAIL: break_end without an open break accepted';
  exception when sqlstate '55000' then raise notice 'PASS: unmatched break_end rejected'; end;

  clock_out_result := public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_out');
  perform 1 from public.time_entries
    where id = own_entry_id and clocked_out_at is not null and clocked_out_at > clocked_in_at;
  if not found then raise exception 'FAIL: clock_out did not close the entry'; end if;

  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_out');
    raise exception 'FAIL: clock_out accepted with no open entry';
  exception when sqlstate '55000' then raise notice 'PASS: clock_out without an open entry rejected'; end;
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'teleport');
    raise exception 'FAIL: invalid clock event type accepted';
  exception when invalid_parameter_value then raise notice 'PASS: invalid clock event type rejected'; end;
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_out', '1b000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: staff clocked on another staff member''s entry';
  exception when no_data_found then raise notice 'PASS: another staff member''s entry is unreachable'; end;
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_out', '1b000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: clock_out accepted on an already-closed entry';
  exception when sqlstate '55000' then raise notice 'PASS: closed entries reject further clocking'; end;

  raise notice 'PASS: staff clock lifecycle is own-record-only with break pairing';
end $$;
rollback to savepoint staff_clock;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia): leave submission with manager fan-out
-- --------------------------------------------------------------------------
savepoint staff_leave;
do $$
declare
  result jsonb;
  new_request_id uuid;
  delivery_count bigint;
begin
  result := public.rpc_submit_leave_request('10000000-0000-4000-8000-000000000001', 'personal', current_date + 7, current_date + 8, 'Family appointment.');
  new_request_id := (result ->> 'leave_request_id')::uuid;
  perform 1 from public.leave_requests
    where id = new_request_id and staff_member_id = '14000000-0000-4000-8000-000000000005'
      and status = 'pending' and submitted_at = transaction_timestamp();
  if not found then raise exception 'FAIL: submission not recorded as own pending request at transaction time'; end if;

  -- Event, fan-out, and audit verification needs manager visibility.
  perform set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
  perform 1 from public.leave_request_events
    where leave_request_id = new_request_id and event_type = 'submitted'
      and resulting_status = 'pending' and actor_membership_id = '13000000-0000-4000-8000-000000000006';
  if not found then raise exception 'FAIL: submitted event missing or not caller-attributed'; end if;
  select count(*) into delivery_count
  from public.notification_deliveries as delivery
  join public.notifications as notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.related_entity_id = new_request_id and notification.kind = 'announcement'
    and delivery.recipient_membership_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000010');
  if delivery_count <> 2 then raise exception 'FAIL: manager fan-out delivered % notifications (expected 2)', delivery_count; end if;
  perform 1 from public.audit_events
    where action = 'leave.submitted' and subject_id = new_request_id
      and actor_membership_id = '13000000-0000-4000-8000-000000000006';
  if not found then raise exception 'FAIL: leave.submitted audit event missing'; end if;

  raise notice 'PASS: staff leave submission is own-record, evented, fanned out to managers, audited';
end $$;
rollback to savepoint staff_leave;

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_submit_leave_request('10000000-0000-4000-8000-000000000001', 'sabbatical', '2026-07-06', '2026-07-07', 'Bad type.');
    raise exception 'FAIL: invalid leave type accepted';
  exception when invalid_parameter_value then raise notice 'PASS: invalid leave type rejected'; end;
  begin
    perform public.rpc_submit_leave_request('10000000-0000-4000-8000-000000000001', 'personal', '2026-07-07', '2026-07-06', 'Bad dates.');
    raise exception 'FAIL: inverted leave dates accepted';
  exception when invalid_parameter_value then raise notice 'PASS: inverted leave dates rejected'; end;
  begin
    perform public.rpc_submit_leave_request('10000000-0000-4000-8000-000000000001', 'personal', '2026-07-06', '2026-07-07', '   ');
    raise exception 'FAIL: blank leave reason accepted';
  exception when invalid_parameter_value then raise notice 'PASS: a leave reason is mandatory'; end;
  begin
    perform public.rpc_internal_write_audit('10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000006', 'forged.action', 'workspace', '10000000-0000-4000-8000-000000000001', '{}'::jsonb);
    raise exception 'FAIL: staff invoked the internal audit writer';
  exception when insufficient_privilege then raise notice 'PASS: the internal audit writer is unreachable for authenticated roles'; end;
  begin
    perform public.rpc_internal_notify('10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000006', 'announcement', 'Forged', 'Forged body', null, null, array['13000000-0000-4000-8000-000000000006']::uuid[]);
    raise exception 'FAIL: staff invoked the internal notifier';
  exception when insufficient_privilege then raise notice 'PASS: the internal notifier is unreachable for authenticated roles'; end;
end $$;

-- --------------------------------------------------------------------------
-- OUTSIDER persona: authenticated but no membership anywhere
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: outsider published';
  exception when insufficient_privilege then null; end;
  begin
    perform public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'approved', null);
    raise exception 'FAIL: outsider decided leave';
  exception when insufficient_privilege then null; end;
  begin
    perform public.rpc_batch_approve_time_entries('10000000-0000-4000-8000-000000000001', array['1b000000-0000-4000-8000-000000000002']::uuid[], 'approved', null);
    raise exception 'FAIL: outsider approved time entries';
  exception when insufficient_privilege then null; end;
  begin
    perform public.rpc_adjust_time_entry('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', null, null, 0, 'Intrusion.');
    raise exception 'FAIL: outsider adjusted a time entry';
  exception when insufficient_privilege then null; end;
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_in');
    raise exception 'FAIL: outsider clocked in';
  exception when insufficient_privilege then null; end;
  begin
    perform public.rpc_submit_leave_request('10000000-0000-4000-8000-000000000001', 'personal', '2026-07-06', '2026-07-06', 'Intrusion.');
    raise exception 'FAIL: outsider submitted leave';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14');
    raise exception 'FAIL: outsider exported approved hours';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: non-members are rejected by every RPC';
end $$;

-- --------------------------------------------------------------------------
-- Identity-less callers: authenticated role without a uid, and anon
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '', true);

do $$
begin
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: authenticated role without identity invoked an RPC';
  exception when insufficient_privilege then raise notice 'PASS: a null auth.uid() is rejected'; end;
end $$;

set local role anon;
do $$
begin
  begin
    perform public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: anon invoked an RPC';
  exception when insufficient_privilege then raise notice 'PASS: anon has no execute path to any RPC'; end;
end $$;

-- --------------------------------------------------------------------------
-- Service path: RPCs demand identity, and the grant surface is closed
-- --------------------------------------------------------------------------
reset role;

do $$
begin
  begin
    perform 1 from public.rpc_export_approved_hours('10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-14');
    raise exception 'FAIL: service path without identity invoked an RPC';
  exception when insufficient_privilege then raise notice 'PASS: RPCs require a caller identity even on the service path'; end;
end $$;

do $$
declare offenders text;
begin
  select string_agg(routine.proname || '(' || pg_get_function_identity_arguments(routine.oid) || ')', ', ')
  into offenders
  from pg_proc as routine
  where routine.pronamespace = 'public'::regnamespace
    and routine.proname like 'rpc\_%'
    and has_function_privilege('anon', routine.oid, 'execute');
  if offenders is not null then
    raise exception 'FAIL: anon can execute: %', offenders;
  end if;

  select string_agg(routine.proname || '(' || pg_get_function_identity_arguments(routine.oid) || ')', ', ')
  into offenders
  from pg_proc as routine
  where routine.pronamespace = 'public'::regnamespace
    and routine.proname like 'rpc\_internal\_%'
    and has_function_privilege('authenticated', routine.oid, 'execute');
  if offenders is not null then
    raise exception 'FAIL: authenticated can execute internal helpers: %', offenders;
  end if;

  raise notice 'PASS: rpc grant surface is anon-free and helpers are internal-only';
end $$;

do $$ begin raise notice 'ALL PHASE 5 RPC CHECKS PASSED'; end $$;

rollback;
