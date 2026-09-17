-- Phase 74: Hours Query staff RPC lockdown verification (R7).
-- Runs inside a rolled-back transaction against the local stack.
--
-- Proves:
--   1. Staff direct INSERT of an hours query is refused (42501).
--   2. Staff direct INSERT of a pre-resolved hours query is refused (42501).
--   3. Staff direct UPDATE of an hours query is refused (42501 or 0 rows modified).
--   4. Staff calling rpc_staff_raise_hours_query succeeds:
--      - query created with status 'pending'
--      - manager notified with kind 'time_query_raised'
--      - event 'query_raised' logged in time_entry_events
--   5. Manager calling rpc_resolve_hours_query succeeds:
--      - query updated to 'resolved' with resolution_note
--      - staff notified with kind 'time_query_resolved'
--      - event 'query_resolved' logged in time_entry_events
--   6. Staff can read the resolved query via RLS, but cannot modify it.

begin;

-- --------------------------------------------------------------------------
-- 1. Setup workspace, members, and a test time entry
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007401', 'authenticated', 'authenticated', 'p74.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007402', 'authenticated', 'authenticated', 'p74.staff@example.com')
on conflict (id) do nothing;

insert into public.workspaces (id, slug, name, timezone)
values ('74000000-0000-4000-8000-000000000001', 'p74-site', 'P74 Site', 'Europe/London');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, joined_at)
values
  ('74000000-0000-4000-8000-000000000011', '74000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007401', 'manager', 'active', now()),
  ('74000000-0000-4000-8000-000000000012', '74000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007402', 'staff', 'active', now());

insert into public.staff_members (id, workspace_id, membership_id, display_name, role_name, employment_status)
values
  ('74000000-0000-4000-8000-000000000021', '74000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000011', 'Manager Mary', 'Manager', 'active'),
  ('74000000-0000-4000-8000-000000000022', '74000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000012', 'Staff Sam', 'Server', 'active');

insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date, scheduled_start_at, scheduled_end_at,
  clocked_in_at, clocked_out_at, break_minutes, approval_status
) values (
  '74000000-0000-4000-8000-000000000031',
  '74000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000022',
  '2026-09-10',
  '2026-09-10T09:00:00Z',
  '2026-09-10T17:00:00Z',
  '2026-09-10T09:00:00Z',
  '2026-09-10T17:00:00Z',
  30,
  'pending'
);

-- --------------------------------------------------------------------------
-- 2. Staff Persona: Direct INSERT and UPDATE are refused
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007402","role":"authenticated"}', true);
set local role authenticated;

-- A. Direct query INSERT is refused (42501)
do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.time_hours_queries (
      workspace_id, time_entry_id, staff_member_id, issue_type, note, status
    ) values (
      '74000000-0000-4000-8000-000000000001',
      '74000000-0000-4000-8000-000000000031',
      '74000000-0000-4000-8000-000000000022',
      'incorrect_times',
      'Direct insert bypass attempt',
      'pending'
    );
  exception when insufficient_privilege then
    denied := true;
  end;

  if not denied then
    raise exception 'FAIL: staff direct query INSERT was not refused with 42501';
  end if;
  raise notice 'PASS: staff direct query INSERT refused (42501)';
end $$;

-- B. Direct resolved INSERT is refused (42501)
do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.time_hours_queries (
      workspace_id, time_entry_id, staff_member_id, issue_type, note, status
    ) values (
      '74000000-0000-4000-8000-000000000001',
      '74000000-0000-4000-8000-000000000031',
      '74000000-0000-4000-8000-000000000022',
      'incorrect_times',
      'Direct resolved bypass attempt',
      'resolved'
    );
  exception when insufficient_privilege then
    denied := true;
  end;

  if not denied then
    raise exception 'FAIL: staff direct resolved INSERT was not refused with 42501';
  end if;
  raise notice 'PASS: staff direct resolved INSERT refused (42501)';
end $$;

-- --------------------------------------------------------------------------
-- 3. Staff Persona: RPC Path succeeds
-- --------------------------------------------------------------------------
do $$
declare
  v_query_id uuid;
  v_query_status text;
  v_event_count integer;
  v_notif_count integer;
begin
  v_query_id := public.rpc_staff_raise_hours_query(
    '74000000-0000-4000-8000-000000000001',
    '74000000-0000-4000-8000-000000000031',
    'incorrect_break',
    'Break was only 15m, not 30m'
  );

  if v_query_id is null then
    raise exception 'FAIL: rpc_staff_raise_hours_query did not return query ID';
  end if;

  -- Verify query exists and has pending status via staff RLS
  select status into v_query_status
  from public.time_hours_queries
  where id = v_query_id;

  if v_query_status <> 'pending' then
    raise exception 'FAIL: created query status is not pending';
  end if;

  -- Verify staff cannot bypass RLS on time_entry_events (returns 0 rows)
  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '74000000-0000-4000-8000-000000000031'
    and event_type = 'query_raised';

  if v_event_count <> 0 then
    raise exception 'FAIL: staff member bypassed RLS on time_entry_events';
  end if;

  raise notice 'PASS: staff raised query via RPC successfully';
end $$;

-- C. Direct UPDATE by staff on existing query is refused
do $$
declare
  v_updated integer;
begin
  update public.time_hours_queries
  set status = 'resolved', resolution_note = 'Staff self-resolved'
  where workspace_id = '74000000-0000-4000-8000-000000000001';

  get diagnostics v_updated = row_count;
  if v_updated <> 0 then
    raise exception 'FAIL: staff directly updated time_hours_queries (% rows)', v_updated;
  end if;
  raise notice 'PASS: staff direct UPDATE on time_hours_queries refused (0 rows updated)';
end $$;

-- --------------------------------------------------------------------------
-- 4. Manager Persona: Verifies query_raised event/notification and resolves via RPC
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007401","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_query_id uuid;
  v_status text;
  v_res_note text;
  v_notif_count integer;
  v_event_count integer;
begin
  select id into v_query_id
  from public.time_hours_queries
  where workspace_id = '74000000-0000-4000-8000-000000000001'
  limit 1;

  -- Manager verifies time_entry_events row written for query_raised
  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '74000000-0000-4000-8000-000000000031'
    and event_type = 'query_raised';

  if v_event_count <> 1 then
    raise exception 'FAIL: query_raised event not found in time_entry_events';
  end if;

  -- Manager verifies notification received for time_query_raised
  select count(*) into v_notif_count
  from public.notifications
  where workspace_id = '74000000-0000-4000-8000-000000000001'
    and kind = 'time_query_raised'
    and related_entity_id = v_query_id;

  if v_notif_count <> 1 then
    raise exception 'FAIL: manager notification not generated for query_raised';
  end if;

  perform public.rpc_resolve_hours_query(
    '74000000-0000-4000-8000-000000000001',
    v_query_id,
    'resolved',
    'Corrected break to 15m'
  );

  select status, resolution_note
  into v_status, v_res_note
  from public.time_hours_queries
  where id = v_query_id;

  if v_status <> 'resolved' or v_res_note <> 'Corrected break to 15m' then
    raise exception 'FAIL: query not resolved properly';
  end if;

  -- Verify query_resolved event
  select count(*) into v_event_count
  from public.time_entry_events
  where time_entry_id = '74000000-0000-4000-8000-000000000031'
    and event_type = 'query_resolved';

  if v_event_count <> 1 then
    raise exception 'FAIL: query_resolved event not found';
  end if;

  -- Verify staff notified of resolution
  select count(*) into v_notif_count
  from public.notifications
  where workspace_id = '74000000-0000-4000-8000-000000000001'
    and kind = 'time_query_resolved'
    and related_entity_id = v_query_id;

  if v_notif_count <> 1 then
    raise exception 'FAIL: time_query_resolved notification not created';
  end if;

  raise notice 'PASS: manager resolved hours query via RPC';
end $$;

-- --------------------------------------------------------------------------
-- 5. Staff Persona: Reads resolution but cannot modify it
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007402","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_rec record;
  v_updated integer;
begin
  select status, resolution_note
  into v_rec
  from public.time_hours_queries
  where workspace_id = '74000000-0000-4000-8000-000000000001';

  if v_rec.status <> 'resolved' or v_rec.resolution_note <> 'Corrected break to 15m' then
    raise exception 'FAIL: staff cannot read resolved status or note';
  end if;
  raise notice 'PASS: staff reads resolved query via RLS';

  -- Staff cannot alter resolved query
  update public.time_hours_queries
  set resolution_note = 'Staff modified'
  where workspace_id = '74000000-0000-4000-8000-000000000001';

  get diagnostics v_updated = row_count;
  if v_updated <> 0 then
    raise exception 'FAIL: staff altered resolved query (% rows)', v_updated;
  end if;
  raise notice 'PASS: staff cannot modify resolved query';
end $$;

rollback;
