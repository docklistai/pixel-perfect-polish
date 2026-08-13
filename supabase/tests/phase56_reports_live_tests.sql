-- Phase 56 fixed operational Reports authority and aggregation verification.
-- Runs inside one rolled-back transaction against the local Supabase stack.
begin;
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'a5600000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'owner.phase56@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a5600000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'staff.phase56@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a5600000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'other-manager.phase56@example.test');
update public.workspace_memberships
set user_id = 'a5600000-0000-4000-8000-000000000001', status = 'active',
    joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000001';
update public.workspace_memberships
set user_id = 'a5600000-0000-4000-8000-000000000002', status = 'active',
    joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000002';
insert into public.workspaces (id, slug, name, timezone, rota_start_weekday, status)
values ('56000000-0000-4000-8000-0000000000a1', 'phase56-other', 'Other Workspace',
        'Pacific/Kiritimati', 6, 'active');
insert into public.locations (id, workspace_id, name, timezone, status)
values ('56000000-0000-4000-8000-0000000000a2',
        '56000000-0000-4000-8000-0000000000a1', 'Foreign Venue',
        'Pacific/Kiritimati', 'active');
insert into public.departments (id, workspace_id, name, status)
values ('56000000-0000-4000-8000-0000000000a3',
        '56000000-0000-4000-8000-0000000000a1', 'Foreign Department', 'active');
insert into public.workspace_memberships
  (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('56000000-0000-4000-8000-0000000000a4',
   '56000000-0000-4000-8000-0000000000a1',
   'a5600000-0000-4000-8000-000000000003', 'manager', 'active',
   '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
-- A previous published week whose overnight shift ends inside the selected
-- period but starts outside it. Start-date attribution must exclude it.
insert into public.rota_weeks
  (id, workspace_id, location_id, week_start, status)
values
  ('56000000-0000-4000-8000-000000000101',
   '10000000-0000-4000-8000-000000000001',
   '11000000-0000-4000-8000-000000000001', '2026-05-25', 'published');
insert into public.published_rota_snapshots
  (id, workspace_id, rota_week_id, version, published_at, published_by_membership_id)
values
  ('56000000-0000-4000-8000-000000000111',
   '10000000-0000-4000-8000-000000000001',
   '56000000-0000-4000-8000-000000000101', 1, transaction_timestamp(),
   '13000000-0000-4000-8000-000000000011');
insert into public.published_rota_shifts
  (id, workspace_id, snapshot_id, source_shift_id, location_id, department_id,
   staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name,
   assignment_status)
values
  ('56000000-0000-4000-8000-000000000121',
   '10000000-0000-4000-8000-000000000001',
   '56000000-0000-4000-8000-000000000111',
   '56000000-0000-4000-8000-000000000131',
   '11000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000002',
   '14000000-0000-4000-8000-000000000002', '2026-05-31',
   '2026-05-31T22:00:00+01:00', '2026-06-01T06:00:00+01:00', 30,
   'Kitchen Supervisor', 'scheduled');
update public.rota_weeks set status = 'archived' where id = '56000000-0000-4000-8000-000000000101';
-- An archived week inside the period. Its overnight shift belongs wholly to
-- the Sunday start date for totals, but crosses local heatmap buckets.
insert into public.rota_weeks
  (id, workspace_id, location_id, week_start, status)
values
  ('56000000-0000-4000-8000-000000000201',
   '10000000-0000-4000-8000-000000000001',
   '11000000-0000-4000-8000-000000000001', '2026-06-01', 'published');
insert into public.published_rota_snapshots
  (id, workspace_id, rota_week_id, version, published_at, published_by_membership_id)
values
  ('56000000-0000-4000-8000-000000000211',
   '10000000-0000-4000-8000-000000000001',
   '56000000-0000-4000-8000-000000000201', 1, transaction_timestamp(),
   '13000000-0000-4000-8000-000000000011');
insert into public.published_rota_shifts
  (id, workspace_id, snapshot_id, source_shift_id, location_id, department_id,
   staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name,
   assignment_status)
values
  ('56000000-0000-4000-8000-000000000221',
   '10000000-0000-4000-8000-000000000001',
   '56000000-0000-4000-8000-000000000211',
   '56000000-0000-4000-8000-000000000231',
   '11000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000002',
   '14000000-0000-4000-8000-000000000002', '2026-06-07',
   '2026-06-07T22:00:00+01:00', '2026-06-08T06:00:00+01:00', 30,
   'Kitchen Supervisor', 'scheduled');
update public.rota_weeks set status = 'archived' where id = '56000000-0000-4000-8000-000000000201';
-- Republish the seeded 8 June week. Version 1 must be superseded, never added.
insert into public.published_rota_snapshots
  (id, workspace_id, rota_week_id, version, published_at, published_by_membership_id)
values
  ('56000000-0000-4000-8000-000000000311',
   '10000000-0000-4000-8000-000000000001',
   '15000000-0000-4000-8000-000000000001', 2, transaction_timestamp(),
   '13000000-0000-4000-8000-000000000011');
insert into public.published_rota_shifts
  (id, workspace_id, snapshot_id, source_shift_id, location_id, department_id,
   staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name,
   assignment_status)
values
  ('56000000-0000-4000-8000-000000000321',
   '10000000-0000-4000-8000-000000000001',
   '56000000-0000-4000-8000-000000000311',
   '56000000-0000-4000-8000-000000000331',
   '11000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000001',
   '14000000-0000-4000-8000-000000000005', '2026-06-08',
   '2026-06-08T08:00:00+01:00', '2026-06-08T16:00:00+01:00', 30,
   'Barista', 'scheduled'),
  ('56000000-0000-4000-8000-000000000322',
   '10000000-0000-4000-8000-000000000001',
   '56000000-0000-4000-8000-000000000311',
   '56000000-0000-4000-8000-000000000332',
   '11000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003',
   '14000000-0000-4000-8000-000000000004', '2026-06-12',
   '2026-06-12T18:00:00+01:00', '2026-06-13T02:00:00+01:00', 30,
   'Bartender', 'scheduled'),
  ('56000000-0000-4000-8000-000000000323',
   '10000000-0000-4000-8000-000000000001',
   '56000000-0000-4000-8000-000000000311',
   '56000000-0000-4000-8000-000000000333',
   '11000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000002', null, '2026-06-12',
   '2026-06-12T10:00:00+01:00', '2026-06-12T18:00:00+01:00', 30,
   'Kitchen', 'open');
-- Historical rows must survive later department/staff/access state changes.
update public.departments set status = 'inactive'
where id = '12000000-0000-4000-8000-000000000003';
update public.staff_members set employment_status = 'left', end_date = '2026-06-30'
where id = '14000000-0000-4000-8000-000000000005';
update public.workspace_memberships set status = 'revoked'
where id = '13000000-0000-4000-8000-000000000006';
-- Only the approved request may affect published work. None of the private
-- reason fields may be copied into the Reports payload.
insert into public.leave_requests
  (id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
   status, submitted_at, decided_at, decided_by_membership_id, decision_reason)
values
  ('56000000-0000-4000-8000-000000000401',
   '10000000-0000-4000-8000-000000000001',
   '14000000-0000-4000-8000-000000000005', 'annual_leave',
   '2026-06-08', '2026-06-08', 'TOP SECRET APPROVED REASON', 'approved',
   '2026-06-01T09:00:00Z', '2026-06-02T09:00:00Z',
   '13000000-0000-4000-8000-000000000011', 'TOP SECRET DECISION NOTE'),
  ('56000000-0000-4000-8000-000000000402',
   '10000000-0000-4000-8000-000000000001',
   '14000000-0000-4000-8000-000000000005', 'sick',
   '2026-06-08', '2026-06-08', 'TOP SECRET DECLINED REASON', 'declined',
   '2026-06-01T09:00:00Z', '2026-06-02T09:00:00Z',
   '13000000-0000-4000-8000-000000000011', 'TOP SECRET DECLINE NOTE'),
  ('56000000-0000-4000-8000-000000000403',
   '10000000-0000-4000-8000-000000000001',
   '14000000-0000-4000-8000-000000000005', 'other',
   '2026-06-08', '2026-06-08', 'TOP SECRET CANCELLED REASON', 'cancelled',
   '2026-06-01T09:00:00Z', null, null, null),
  ('56000000-0000-4000-8000-000000000404', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002', 'annual_leave',
   '2026-06-07', '2026-06-07', 'TOP SECRET START-DATE REASON', 'approved', now(), now(), '13000000-0000-4000-8000-000000000011', null),
  ('56000000-0000-4000-8000-000000000405', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002', 'annual_leave',
   '2026-06-08', '2026-06-08', 'TOP SECRET END-DATE REASON', 'approved', now(), now(), '13000000-0000-4000-8000-000000000011', null),
  ('56000000-0000-4000-8000-000000000406', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002', 'annual_leave',
   '2026-06-07', '2026-06-08', 'TOP SECRET BOTH-DATES REASON', 'approved', now(), now(), '13000000-0000-4000-8000-000000000011', null);
-- Current-week-only contract review data. Five 7.5-hour net shifts exceed
-- Sophie's current 32-hour contract, but must not leak into a historical range.
do $$
declare
  current_start date;
  week_id uuid := '56000000-0000-4000-8000-000000000501';
  snapshot_id uuid := '56000000-0000-4000-8000-000000000511';
begin
  current_start := ((transaction_timestamp() at time zone 'Europe/London')::date
    - ((extract(isodow from (transaction_timestamp() at time zone 'Europe/London')::date)::int - 1 + 7) % 7));
  insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
  values (week_id, '10000000-0000-4000-8000-000000000001',
          '11000000-0000-4000-8000-000000000001', current_start, 'published');
  insert into public.published_rota_snapshots
    (id, workspace_id, rota_week_id, version, published_at, published_by_membership_id)
  values (snapshot_id, '10000000-0000-4000-8000-000000000001', week_id, 1,
          transaction_timestamp(), '13000000-0000-4000-8000-000000000011');
  insert into public.published_rota_shifts
    (workspace_id, snapshot_id, source_shift_id, location_id, department_id,
     staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name,
     assignment_status)
  select '10000000-0000-4000-8000-000000000001', snapshot_id, gen_random_uuid(),
         '11000000-0000-4000-8000-000000000001',
         '12000000-0000-4000-8000-000000000001',
         '14000000-0000-4000-8000-000000000001', current_start + day_offset,
         ((current_start + day_offset)::timestamp + time '09:00') at time zone 'Europe/London',
         ((current_start + day_offset)::timestamp + time '17:00') at time zone 'Europe/London',
         30, 'FOH Supervisor', 'scheduled'
  from generate_series(0, 4) as day_offset;
end $$;
do $$
declare
  ws constant uuid := '10000000-0000-4000-8000-000000000001';
  other_ws constant uuid := '56000000-0000-4000-8000-0000000000a1';
  location_id constant uuid := '11000000-0000-4000-8000-000000000001';
  foh constant uuid := '12000000-0000-4000-8000-000000000001';
  foreign_location constant uuid := '56000000-0000-4000-8000-0000000000a2';
  foreign_department constant uuid := '56000000-0000-4000-8000-0000000000a3';
  response jsonb; filtered jsonb; current_response jsonb;
  item jsonb; status_code text; expected_start date;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  response := public.rpc_reports_read_page(
    ws, date '2026-06-01', date '2026-06-28', null, null);

  if response #>> '{meta,source}' <> 'latest_published_snapshots'
     or response #>> '{meta,workspaceTimezone}' <> 'Europe/London'
     or (response #>> '{meta,rotaStartWeekday}')::int <> 0 then
    raise exception 'FAIL: Reports source/timezone/week metadata is wrong: %', response->'meta';
  end if;
  if response #>> '{meta,periodStart}' <> '2026-06-01'
     or response #>> '{meta,periodEnd}' <> '2026-06-28' then
    raise exception 'FAIL: inclusive period metadata is wrong: %', response->'meta';
  end if;

  -- 450 archived overnight + 900 latest republish; the seeded version 1 and
  -- prior-period overnight must not be counted. Every included shift deducts
  -- its 30-minute break.
  if (response #>> '{totals,scheduledMinutes}')::int <> 1350
     or (response #>> '{totals,assignedShifts}')::int <> 3
     or (response #>> '{totals,openShifts}')::int <> 1
     or (response #>> '{totals,openMinutes}')::int <> 450 then
    raise exception 'FAIL: latest-snapshot/net-hour totals are wrong: %', response->'totals';
  end if;
  if (response #>> '{totals,approvedWorkedMinutes}')::int <> 450
     or (response #>> '{totals,approvedEntries}')::int <> 1
     or (response #>> '{totals,awaitingReviewEntries}')::int <> 1 then
    raise exception 'FAIL: Time review totals are wrong: %', response->'totals';
  end if;
  if (response #>> '{totals,pendingLeave}')::int <> 1
     or (response #>> '{totals,approvedLeaveAffectedShifts}')::int <> 2
     or (response #>> '{totals,approvedLeaveAffectedMinutes}')::int <> 900 then
    raise exception 'FAIL: leave queue/impact semantics are wrong: %', response->'totals';
  end if;
  if (select count(*) from jsonb_array_elements(response->'leaveImpacts') impact where
      impact->>'leaveRequestId' in ('56000000-0000-4000-8000-000000000404', '56000000-0000-4000-8000-000000000405', '56000000-0000-4000-8000-000000000406')
        and (impact->>'affectedShifts')::int = 1
        and (impact->>'affectedMinutes')::int = 450) <> 3 then
    raise exception 'FAIL: overnight occupied-date leave impact is wrong: %', response->'leaveImpacts';
  end if;
  if response::text like '%TOP SECRET%' then
    raise exception 'FAIL: a private leave reason or decision note leaked into Reports';
  end if;

  if jsonb_array_length(response->'weeks') <> 4 then
    raise exception 'FAIL: expected four calendar rota-week buckets, got %', response->'weeks';
  end if;
  select value into item from jsonb_array_elements(response->'weeks')
  where value->>'weekStart' = '2026-06-15';
  if item->>'publicationStatus' <> 'not_published'
     or (item->>'scheduledMinutes')::int <> 0 then
    raise exception 'FAIL: draft-only week was not retained as Not published: %', item;
  end if;
  select value into item from jsonb_array_elements(response->'weeks')
  where value->>'weekStart' = '2026-06-22';
  if item->>'publicationStatus' <> 'not_published' then
    raise exception 'FAIL: missing rota week was silently skipped: %', response->'weeks';
  end if;
  select value into item from jsonb_array_elements(response->'weeks')
  where value->>'weekStart' = '2026-06-01';
  if item->>'publicationStatus' <> 'published'
     or (item->>'scheduledMinutes')::int <> 450 then
    raise exception 'FAIL: archived published week was not retained: %', item;
  end if;

  -- The departed/revoked Olivia row and inactive Bar department stay in the
  -- immutable published facts. No portal Claim status participates.
  if not exists (
    select 1 from jsonb_array_elements(response->'departmentHours') as row
    where row->>'name' = 'Bar' and row->>'status' = 'inactive'
      and (row->>'scheduledMinutes')::int = 450
  ) then
    raise exception 'FAIL: inactive historical department hours were dropped: %',
      response->'departmentHours';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(response->'coverageRows') as row
    where row->>'date' = '2026-06-08' and (row->>'scheduledMinutes')::int = 450
  ) then
    raise exception 'FAIL: left/revoked staff historical published work was dropped';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(response->'heatmap') as row
    where (row->>'weekday')::int = 6 and (row->>'bucketStartHour')::int = 21
      and (row->>'averageHeadcount')::numeric > 0
  ) or not exists (
    select 1 from jsonb_array_elements(response->'heatmap') as row
    where (row->>'weekday')::int = 0 and (row->>'bucketStartHour')::int = 0
      and (row->>'averageHeadcount')::numeric > 0
  ) then
    raise exception 'FAIL: overnight interval was not split across local heatmap buckets';
  end if;

  if jsonb_array_length(response->'contractReviews') <> 0 then
    raise exception 'FAIL: current contract values were presented as historical: %',
      response->'contractReviews';
  end if;

  -- Current-week contract comparison is allowed only for the exact current
  -- rota week and labels its effective basis explicitly.
  current_response := public.rpc_reports_read_page(ws, null, null, null, null);
  current_response := public.rpc_reports_read_page(
    ws, (current_response #>> '{meta,currentWeekStart}')::date,
    (current_response #>> '{meta,currentWeekStart}')::date + 6, null, null);
  if jsonb_array_length(current_response->'contractReviews') <> 1
     or current_response->'contractReviews'->0->>'basis' <> 'current_contract'
     or (current_response->'contractReviews'->0->>'scheduledMinutes')::int <> 2250
     or (current_response->'contractReviews'->0->>'contractedMinutes')::int <> 1920 then
    raise exception 'FAIL: exact current-week contract review is wrong: %',
      current_response->'contractReviews';
  end if;

  -- Workspace-owned filters alter the schedule and export rows.
  filtered := public.rpc_reports_read_page(ws, date '2026-06-01', date '2026-06-28',
                                           location_id, foh);
  if (filtered #>> '{totals,scheduledMinutes}')::int <> 450
     or jsonb_array_length(filtered->'coverageRows') <> 1
     or filtered #>> '{filters,locationId}' <> location_id::text
     or filtered #>> '{filters,departmentId}' <> foh::text then
    raise exception 'FAIL: location/department filters were not applied: %', filtered;
  end if;

  status_code := null;
  begin
    perform public.rpc_reports_read_page(ws, date '2026-06-01', date '2026-06-28',
                                         foreign_location, null);
  exception when others then status_code := sqlstate;
  end;
  if status_code is distinct from '22023' then
    raise exception 'FAIL: foreign location filter raised %, expected 22023',
      coalesce(status_code, 'nothing');
  end if;
  status_code := null;
  begin
    perform public.rpc_reports_read_page(ws, date '2026-06-01', date '2026-06-28',
                                         null, foreign_department);
  exception when others then status_code := sqlstate;
  end;
  if status_code is distinct from '22023' then
    raise exception 'FAIL: foreign department filter raised %, expected 22023',
      coalesce(status_code, 'nothing');
  end if;

  -- Periods are bounded to one or four aligned rota weeks.
  status_code := null;
  begin
    perform public.rpc_reports_read_page(ws, date '2026-06-02', date '2026-06-29', null, null);
  exception when others then status_code := sqlstate;
  end;
  if status_code is distinct from '22023' then
    raise exception 'FAIL: misaligned period raised %, expected 22023', coalesce(status_code, 'nothing');
  end if;
  status_code := null;
  begin
    perform public.rpc_reports_read_page(ws, date '2026-06-01', date '2026-07-05', null, null);
  exception when others then status_code := sqlstate;
  end;
  if status_code is distinct from '22023' then
    raise exception 'FAIL: unbounded period raised %, expected 22023', coalesce(status_code, 'nothing');
  end if;

  -- Owner is allowed.
  perform set_config('request.jwt.claims',
    '{"sub":"a5600000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  perform public.rpc_reports_read_page(ws, date '2026-06-01', date '2026-06-07', null, null);

  -- Staff is refused by the manager role gate, not by incidental validation.
  perform set_config('request.jwt.claims',
    '{"sub":"a5600000-0000-4000-8000-000000000002","role":"authenticated"}', true);
  status_code := null;
  begin
    perform public.rpc_reports_read_page(ws, date '2026-06-01', date '2026-06-07', null, null);
  exception when others then status_code := sqlstate;
  end;
  if status_code is distinct from '42501' then
    raise exception 'FAIL: staff Reports read raised %, expected 42501', coalesce(status_code, 'nothing');
  end if;

  -- Main manager has no membership in the foreign workspace.
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  status_code := null;
  begin
    perform public.rpc_reports_read_page(other_ws, null, null, null, null);
  exception when others then status_code := sqlstate;
  end;
  if status_code is distinct from '42501' then
    raise exception 'FAIL: cross-workspace Reports read raised %, expected 42501',
      coalesce(status_code, 'nothing');
  end if;

  -- The foreign manager sees a complete empty contract with Sunday boundaries
  -- resolved from the Pacific/Kiritimati workspace calendar.
  perform set_config('request.jwt.claims',
    '{"sub":"a5600000-0000-4000-8000-000000000003","role":"authenticated"}', true);
  filtered := public.rpc_reports_read_page(other_ws, null, null, null, null);
  expected_start := (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date
    - ((extract(isodow from (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date)::int - 1 - 6 + 7) % 7);
  if filtered #>> '{meta,currentWeekStart}' <> expected_start::text
     or (filtered #>> '{meta,rotaStartWeekday}')::int <> 6 then
    raise exception 'FAIL: timezone/configurable rota start boundary is wrong: %', filtered->'meta';
  end if;
  if jsonb_typeof(filtered->'weeks') <> 'array'
     or jsonb_typeof(filtered->'departmentHours') <> 'array'
     or jsonb_typeof(filtered->'heatmap') <> 'array'
     or jsonb_typeof(filtered->'leaveImpacts') <> 'array'
     or jsonb_typeof(filtered->'contractReviews') <> 'array'
     or jsonb_typeof(filtered->'coverageRows') <> 'array' then
    raise exception 'FAIL: empty Reports collections were null/non-array: %', filtered;
  end if;
  if (filtered #>> '{totals,scheduledMinutes}')::int <> 0
     or jsonb_array_length(filtered->'weeks') <> 4 then
    raise exception 'FAIL: empty workspace/period response is dishonest: %', filtered;
  end if;

  -- Anonymous callers have no executable authority in practice or grants.
  perform set_config('request.jwt.claims', null, true);
  status_code := null;
  begin
    perform public.rpc_reports_read_page(ws, date '2026-06-01', date '2026-06-07', null, null);
  exception when others then status_code := sqlstate;
  end;
  if status_code is distinct from '42501' then
    raise exception 'FAIL: anonymous Reports read raised %, expected 42501', coalesce(status_code, 'nothing');
  end if;
  if has_function_privilege('anon',
       'public.rpc_reports_read_page(uuid,date,date,uuid,uuid)', 'execute') then
    raise exception 'FAIL: anon retained execute on rpc_reports_read_page';
  end if;
  if not has_function_privilege('authenticated',
       'public.rpc_reports_read_page(uuid,date,date,uuid,uuid)', 'execute') then
    raise exception 'FAIL: authenticated lacks execute on rpc_reports_read_page';
  end if;

  raise notice 'phase56: all Reports-live authority and aggregation assertions passed';
end $$;
rollback;
