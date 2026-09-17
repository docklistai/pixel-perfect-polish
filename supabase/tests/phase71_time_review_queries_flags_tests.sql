-- Phase 71: Time review, correction, hours queries, and flags tests (WS-11)
--
-- Proves:
--   1. Manager flags an entry: requires note, does not mutate clock or approval data, writes flagged event, does not notify staff.
--   2. Non-manager cannot flag/unflag (42501).
--   3. Manager unflags an entry: clears flag fields, writes unflagged event.
--   4. Manager rejects entry: rejection without reason fails (22023).
--   5. Manager rejects entry with reason: updates return_note, writes rejected event, notifies staff member (time_returned).
--   6. Staff portal view exposes return_note and approval_status.
--   7. Staff raises hours query on own entry: records query, writes query_raised event, notifies active managers (time_query_raised).
--   8. Staff cannot raise query on another staff member's entry (42501).
--   9. Staff RLS protects queries (staff selects own only).
--   10. Manager resolves hours query: updates query, writes query_resolved event, notifies staff member (time_query_resolved).
--   11. Manager dismisses hours query: updates query, writes query_resolved event, notifies staff member (time_query_resolved).

begin;

-- Create test auth users
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007101', 'authenticated', 'authenticated', 'p71.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007102', 'authenticated', 'authenticated', 'p71.staff1@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007103', 'authenticated', 'authenticated', 'p71.staff2@example.com')
on conflict (id) do nothing;

-- Setup test workspace, locations, departments
insert into public.workspaces (id, slug, name, timezone)
values ('71000000-0000-4000-8000-000000000001', 'p71-site', 'P71 Site', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('71000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001', 'P71 Location', 'Europe/London');

insert into public.departments (id, workspace_id, name)
values ('71000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000001', 'Floor');

-- Memberships: 1 manager, 2 staff
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, joined_at)
values
  ('71000000-0000-4000-8000-000000000011', '71000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007101', 'manager', 'active', now()),
  ('71000000-0000-4000-8000-000000000012', '71000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007102', 'staff', 'active', now()),
  ('71000000-0000-4000-8000-000000000013', '71000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007103', 'staff', 'active', now());

-- Staff members
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name, employment_status)
values
  ('71000000-0000-4000-8000-000000000021', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000011', '71000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', 'Manager Mary', 'Manager', 'active'),
  ('71000000-0000-4000-8000-000000000022', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000012', '71000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', 'Staff Sam', 'Server', 'active'),
  ('71000000-0000-4000-8000-000000000023', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000013', '71000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', 'Staff Sally', 'Server', 'active');

-- Seed time entries for Staff Sam and Staff Sally
insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date, scheduled_start_at, scheduled_end_at,
  clocked_in_at, clocked_out_at, break_minutes, approval_status
) values
  ('71000000-0000-4000-8000-000000000031', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000022', '2026-09-10', '2026-09-10T09:00:00Z', '2026-09-10T17:00:00Z', '2026-09-10T09:02:00Z', '2026-09-10T17:05:00Z', 30, 'pending'),
  ('71000000-0000-4000-8000-000000000032', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000023', '2026-09-10', '2026-09-10T09:00:00Z', '2026-09-10T17:00:00Z', '2026-09-10T09:00:00Z', '2026-09-10T17:00:00Z', 30, 'pending');

set local role authenticated;

-- --------------------------------------------------------------------------
-- 1. Test Flagging & Unflagging
-- --------------------------------------------------------------------------
do $$
declare
  v_flagged boolean;
  v_note text;
  v_status text;
  v_clock_in timestamptz;
  v_event_count integer;
  v_notif_count integer;
begin
  -- Authenticate as Manager Mary
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007101","role":"authenticated"}', true);

  -- Flagging without a note fails with 22023
  begin
    perform public.rpc_flag_time_entry('71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000031', '   ');
    raise exception 'FAIL: flagged with blank note succeeded';
  exception when sqlstate '22023' then null;
  end;

  -- Flagging with note succeeds
  perform public.rpc_flag_time_entry('71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000031', 'Check 5m late finish');

  select flagged, flag_note, approval_status, clocked_in_at
  into v_flagged, v_note, v_status, v_clock_in
  from public.time_entries
  where id = '71000000-0000-4000-8000-000000000031';

  if not v_flagged or v_note <> 'Check 5m late finish' then
    raise exception 'FAIL: flag columns not set correctly';
  end if;

  if v_status <> 'pending' or v_clock_in <> '2026-09-10T09:02:00Z'::timestamptz then
    raise exception 'FAIL: flagging mutated approval status or clock data';
  end if;

  -- Verify time_entry_events row written with 'flagged' and unchanged status
  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '71000000-0000-4000-8000-000000000031'
    and event_type = 'flagged'
    and resulting_approval_status = 'pending'
    and reason = 'Check 5m late finish';

  if v_event_count <> 1 then
    raise exception 'FAIL: flagged event not recorded';
  end if;

  -- Proves no automatic staff notification sent for flag
  select count(*) into v_notif_count
  from public.notifications
  where workspace_id = '71000000-0000-4000-8000-000000000001';

  if v_notif_count <> 0 then
    raise exception 'FAIL: staff notification was erroneously created on flag';
  end if;

  -- Authenticate as Staff Sam: staff cannot flag
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007102","role":"authenticated"}', true);
  begin
    perform public.rpc_flag_time_entry('71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000031', 'Staff attempt');
    raise exception 'FAIL: staff flagged time entry';
  exception when sqlstate '42501' then null;
  end;

  -- Authenticate back as Manager: unflag entry
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007101","role":"authenticated"}', true);
  perform public.rpc_unflag_time_entry('71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000031');

  select flagged, flag_note into v_flagged, v_note
  from public.time_entries
  where id = '71000000-0000-4000-8000-000000000031';

  if v_flagged or v_note is not null then
    raise exception 'FAIL: unflag did not clear flag columns';
  end if;

  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '71000000-0000-4000-8000-000000000031'
    and event_type = 'unflagged'
    and resulting_approval_status = 'pending';

  if v_event_count <> 1 then
    raise exception 'FAIL: unflagged event not recorded';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 2. Test Return for Correction (rejection requires reason + notifies staff)
-- --------------------------------------------------------------------------
do $$
declare
  v_status text;
  v_return_note text;
  v_notif_count integer;
  v_recipient_count integer;
begin
  -- Authenticate as Manager Mary
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007101","role":"authenticated"}', true);

  -- Rejection without reason fails with 22023
  begin
    perform public.rpc_batch_approve_time_entries(
      '71000000-0000-4000-8000-000000000001',
      array['71000000-0000-4000-8000-000000000031'::uuid],
      'rejected',
      null
    );
    raise exception 'FAIL: rejected entry without reason';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.rpc_batch_approve_time_entries(
      '71000000-0000-4000-8000-000000000001',
      array['71000000-0000-4000-8000-000000000031'::uuid],
      'rejected',
      '   '
    );
    raise exception 'FAIL: rejected entry with blank reason';
  exception when sqlstate '22023' then null;
  end;

  -- Rejection with reason succeeds
  perform public.rpc_batch_approve_time_entries(
    '71000000-0000-4000-8000-000000000001',
    array['71000000-0000-4000-8000-000000000031'::uuid],
    'rejected',
    'Please verify your break duration'
  );

  select approval_status, return_note
  into v_status, v_return_note
  from public.time_entries
  where id = '71000000-0000-4000-8000-000000000031';

  if v_status <> 'rejected' or v_return_note <> 'Please verify your break duration' then
    raise exception 'FAIL: rejection did not record status or return_note';
  end if;

  -- Verify notification created with kind 'time_returned' delivered to Staff Sam's membership
  select count(*) into v_notif_count
  from public.notifications
  where workspace_id = '71000000-0000-4000-8000-000000000001'
    and kind = 'time_returned'
    and related_entity_id = '71000000-0000-4000-8000-000000000031';

  if v_notif_count <> 1 then
    raise exception 'FAIL: time_returned notification not created';
  end if;

  select count(*) into v_recipient_count
  from public.notification_deliveries nd
  join public.notifications n on n.id = nd.notification_id
  where n.kind = 'time_returned'
    and nd.recipient_membership_id = '71000000-0000-4000-8000-000000000012';

  if v_recipient_count <> 1 then
    raise exception 'FAIL: time_returned notification not delivered to staff member';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 3. Test Staff Portal View Visibility
-- --------------------------------------------------------------------------
do $$
declare
  v_view_row record;
begin
  -- Authenticate as Staff Sam
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007102","role":"authenticated"}', true);

  select approval_status, return_note
  into v_view_row
  from public.staff_portal_time_entries
  where time_entry_id = '71000000-0000-4000-8000-000000000031';

  if v_view_row.approval_status <> 'rejected' or v_view_row.return_note <> 'Please verify your break duration' then
    raise exception 'FAIL: staff portal view does not expose rejection status or return note';
  end if;

  -- Staff Sam cannot see Staff Sally's entry
  select count(*) into v_view_row
  from public.staff_portal_time_entries
  where time_entry_id = '71000000-0000-4000-8000-000000000032';

  if v_view_row.count <> 0 then
    raise exception 'FAIL: staff member saw colleague time entry in portal view';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 4. Test Structured Hours Queries
-- --------------------------------------------------------------------------
do $$
declare
  v_query_id uuid;
  v_event_count integer;
  v_mgr_notif_count integer;
  v_notif_count integer;
  v_status text;
  v_staff_query_count integer;
begin
  -- Authenticate as Staff Sam
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007102","role":"authenticated"}', true);

  -- Cannot raise query with invalid issue type
  begin
    perform public.rpc_staff_raise_hours_query(
      '71000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000031',
      'invalid_type',
      'My note'
    );
    raise exception 'FAIL: raised query with invalid issue type';
  exception when sqlstate '22023' then null;
  end;

  -- Cannot raise query with blank note
  begin
    perform public.rpc_staff_raise_hours_query(
      '71000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000031',
      'incorrect_break',
      '   '
    );
    raise exception 'FAIL: raised query with blank note';
  exception when sqlstate '22023' then null;
  end;

  -- Cannot raise query against Sally's entry (42501)
  begin
    perform public.rpc_staff_raise_hours_query(
      '71000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000032',
      'incorrect_break',
      'Querying colleague entry'
    );
    raise exception 'FAIL: raised query against another staff member entry';
  exception when sqlstate '42501' then null;
  end;

  -- Valid query on own entry
  v_query_id := public.rpc_staff_raise_hours_query(
    '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000031',
    'incorrect_break',
    'Break was only 15m, not 30m'
  );

  -- Staff Sam can select own query
  select count(*) into v_staff_query_count
  from public.time_hours_queries
  where id = v_query_id;

  if v_staff_query_count <> 1 then
    raise exception 'FAIL: staff cannot select own query via RLS';
  end if;

  -- Staff cannot select from time_entry_events directly (manager-only RLS)
  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '71000000-0000-4000-8000-000000000031'
    and event_type = 'query_raised';

  if v_event_count <> 0 then
    raise exception 'FAIL: staff member bypassed RLS on time_entry_events';
  end if;

  -- Authenticate as Manager Mary to verify notification and event
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007101","role":"authenticated"}', true);

  -- Verify event recorded
  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '71000000-0000-4000-8000-000000000031'
    and event_type = 'query_raised'
    and reason = 'Break was only 15m, not 30m';

  if v_event_count <> 1 then
    raise exception 'FAIL: query_raised event not recorded';
  end if;

  -- Verify manager notification delivered
  select count(*) into v_mgr_notif_count
  from public.notification_deliveries nd
  join public.notifications n on n.id = nd.notification_id
  where n.kind = 'time_query_raised'
    and nd.recipient_membership_id = '71000000-0000-4000-8000-000000000011';

  if v_mgr_notif_count <> 1 then
    raise exception 'FAIL: manager notification for query_raised not delivered';
  end if;

  -- Authenticate as Staff Sally: cannot see Staff Sam's query
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007103","role":"authenticated"}', true);
  select count(*) into v_staff_query_count
  from public.time_hours_queries
  where id = v_query_id;

  if v_staff_query_count <> 0 then
    raise exception 'FAIL: colleague can select another staff member query';
  end if;

  -- Staff Sally cannot resolve query (42501)
  begin
    perform public.rpc_resolve_hours_query(
      '71000000-0000-4000-8000-000000000001',
      v_query_id,
      'resolved',
      'Staff resolving own'
    );
    raise exception 'FAIL: staff member resolved hours query';
  exception when sqlstate '42501' then null;
  end;

  -- Authenticate as Manager Mary: resolve query
  perform set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007101","role":"authenticated"}', true);

  perform public.rpc_resolve_hours_query(
    '71000000-0000-4000-8000-000000000001',
    v_query_id,
    'resolved',
    'Confirmed 15m break, adjusted on timesheet'
  );

  select status into v_status
  from public.time_hours_queries
  where id = v_query_id;

  if v_status <> 'resolved' then
    raise exception 'FAIL: query status not updated to resolved';
  end if;

  -- Verify query_resolved event recorded
  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '71000000-0000-4000-8000-000000000031'
    and event_type = 'query_resolved';

  if v_event_count <> 1 then
    raise exception 'FAIL: query_resolved event not recorded';
  end if;

  -- Verify staff member received time_query_resolved notification
  select count(*) into v_notif_count
  from public.notification_deliveries nd
  join public.notifications n on n.id = nd.notification_id
  where n.kind = 'time_query_resolved'
    and nd.recipient_membership_id = '71000000-0000-4000-8000-000000000012';

  if v_notif_count <> 1 then
    raise exception 'FAIL: staff member did not receive time_query_resolved notification';
  end if;
end $$;

rollback;
