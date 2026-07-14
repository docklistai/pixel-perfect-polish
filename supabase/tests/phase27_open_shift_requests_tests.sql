-- Phase 27 open-shift request loop verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase27_open_shift_requests_tests.sql
--
-- Covers: request / idempotent re-request / withdraw / re-request after
-- withdrawing, competing applicants, manager selection revalidation (role,
-- recurring day off, approved leave, overlap, weekly hours), decline with
-- notification, published-version staleness, request finalisation at
-- republish, and tenant/role isolation (staff cannot decide, managers cannot
-- request, base-table rows stay manager-only).

begin;

-- --------------------------------------------------------------------------
-- Setup (postgres context). Workspace 1 = Harbour View (Europe/London).
-- Alex (user ab…0001, manager membership 13…0011) is active in seed.
-- Liam = Bartender staff 14…0004 (membership 13…0005); Noah = Porter staff
-- 14…0008 (membership 13…0009). One extra bartender is created for the
-- competing-applicant and guard tests.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000271', 'authenticated', 'authenticated', 'p27.liam@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000272', 'authenticated', 'authenticated', 'p27.noah@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000273', 'authenticated', 'authenticated', 'p27.bartender2@harbourview.co.uk');

update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000271', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000005';
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000272', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000009';

insert into public.workspace_memberships (id, workspace_id, role, status, invited_at)
values ('34000000-0000-4000-8000-000000000271', '10000000-0000-4000-8000-000000000001', 'staff', 'invited', '2026-06-01T08:00:00Z');
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000273', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '34000000-0000-4000-8000-000000000271';

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('35000000-0000-4000-8000-000000000271', '10000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000271', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', 'P27 Bartender Two', 'Bartender');

-- Far-future draft week: Mon 2099-08-10, two open Bartender shifts.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('37000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2099-08-10', 'draft');

insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values
  ('37000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', null, '2099-08-12', '2099-08-12T17:00:00+01:00', '2099-08-12T23:00:00+01:00', 30, 'Bartender', 'open'),
  ('37000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', null, '2099-08-14', '2099-08-14T17:00:00+01:00', '2099-08-14T23:00:00+01:00', 30, 'Bartender', 'open');

-- Session-shared scratch ids (readable by every persona in this session).
create temp table p27_ids (key text primary key, id uuid);
grant select on p27_ids to public;

-- --------------------------------------------------------------------------
-- MANAGER (Alex): publish version 1.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001');
  if (result ->> 'version')::int <> 1 then raise exception 'FAIL: publish version %', result ->> 'version'; end if;
end $$;
-- Force outstanding deferred checks now, then restore deferred mode so the
-- next publish can insert its snapshot before its shifts.
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

insert into p27_ids (key, id)
select 'p1_v1', shift.id from public.published_rota_shifts shift
join public.published_rota_snapshots snap on snap.id = shift.snapshot_id
where snap.rota_week_id = '37000000-0000-4000-8000-000000000001' and snap.version = 1
  and shift.source_shift_id = '37000000-0000-4000-8000-000000000011';
insert into p27_ids (key, id)
select 'p2_v1', shift.id from public.published_rota_shifts shift
join public.published_rota_snapshots snap on snap.id = shift.snapshot_id
where snap.rota_week_id = '37000000-0000-4000-8000-000000000001' and snap.version = 1
  and shift.source_shift_id = '37000000-0000-4000-8000-000000000012';

-- --------------------------------------------------------------------------
-- STAFF (Liam): request → idempotent → withdraw → re-request. RLS checks.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000271","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  p1 uuid := (select id from p27_ids where key = 'p1_v1');
  first_id uuid;
  second_id uuid;
  request_status text;
  base_rows bigint;
  foreign_rows bigint;
begin
  first_id := (public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', p1) ->> 'request_id')::uuid;
  second_id := (public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', p1) ->> 'request_id')::uuid;
  if first_id <> second_id then raise exception 'FAIL: duplicate request created a second row'; end if;
  raise notice 'PASS: requesting is idempotent while pending';

  perform public.rpc_withdraw_open_shift_request('10000000-0000-4000-8000-000000000001', first_id);
  select status into request_status from public.staff_portal_open_shift_requests where request_id = first_id;
  if request_status <> 'withdrawn' then raise exception 'FAIL: withdraw left status %', request_status; end if;

  second_id := (public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', p1) ->> 'request_id')::uuid;
  if second_id <> first_id then raise exception 'FAIL: re-request after withdrawing made a new row'; end if;
  select status into request_status from public.staff_portal_open_shift_requests where request_id = first_id;
  if request_status <> 'pending' then raise exception 'FAIL: re-request left status %', request_status; end if;
  raise notice 'PASS: withdraw and re-request cycle works on one row';

  -- Staff have no base-table select path; the portal view is self-only.
  select count(*) into base_rows from public.open_shift_requests;
  if base_rows <> 0 then raise exception 'FAIL: staff read % base open_shift_requests rows', base_rows; end if;
  select count(*) into foreign_rows from public.staff_portal_open_shift_requests
  where staff_member_id <> '14000000-0000-4000-8000-000000000004';
  if foreign_rows <> 0 then raise exception 'FAIL: staff saw % colleague requests', foreign_rows; end if;
  raise notice 'PASS: request rows are manager-only at the base table, self-only in the portal view';

  -- Staff cannot run manager decisions.
  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', first_id);
    raise exception 'FAIL: staff selected an applicant';
  exception when insufficient_privilege then
    raise notice 'PASS: staff cannot select applicants';
  end;
end $$;

-- Competing applicants: Noah is eligible when requesting, then changes role
-- before the manager decides; Bartender Two applies for the other shift.
reset role;
select set_config('request.jwt.claims', '', true);
update public.staff_members set role_name = 'Bartender'
where id = '14000000-0000-4000-8000-000000000008';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000272","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p27_ids where key = 'p1_v1'));
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
update public.staff_members set role_name = 'Porter'
where id = '14000000-0000-4000-8000-000000000008';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000273","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p27_ids where key = 'p2_v1'));
end $$;

-- --------------------------------------------------------------------------
-- MANAGER (Alex): role revalidation, selection, decline + notification.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  liam_request uuid;
  noah_request uuid;
  draft record;
  week_status text;
begin
  select id into liam_request from public.open_shift_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000004' and source_shift_id = '37000000-0000-4000-8000-000000000011';
  select id into noah_request from public.open_shift_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000008' and source_shift_id = '37000000-0000-4000-8000-000000000011';

  -- A Porter cannot take a Bartender shift.
  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', noah_request);
    raise exception 'FAIL: role-mismatched applicant was selected';
  exception when sqlstate '55000' then
    raise notice 'PASS: selection revalidates role eligibility';
  end;

  begin
    perform public.rpc_select_open_shift_applicant('21000000-0000-4000-8000-000000000001', noah_request);
    raise exception 'FAIL: manager selected a request through another workspace';
  exception when insufficient_privilege then
    raise notice 'PASS: manager decisions reject cross-workspace access';
  end;

  perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', liam_request);
  select staff_member_id, assignment_status into draft from public.shifts where id = '37000000-0000-4000-8000-000000000011';
  if draft.staff_member_id is distinct from '14000000-0000-4000-8000-000000000004' or draft.assignment_status <> 'scheduled' then
    raise exception 'FAIL: selection did not assign the DRAFT shift (staff %, status %)', draft.staff_member_id, draft.assignment_status;
  end if;
  select status into week_status from public.rota_weeks where id = '37000000-0000-4000-8000-000000000001';
  if week_status <> 'draft' then raise exception 'FAIL: selection left week status % (expected draft — unpublished changes exist)', week_status; end if;
  perform 1 from public.published_rota_shifts
  where id = (select id from p27_ids where key = 'p1_v1') and assignment_status = 'open';
  if not found then raise exception 'FAIL: selection mutated the published snapshot'; end if;
  raise notice 'PASS: selection assigns the draft shift only; the published snapshot is untouched';

  perform public.rpc_decline_open_shift_request('10000000-0000-4000-8000-000000000001', noah_request, 'Need a bartender for this one');
  perform 1 from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'open_shift_update'
    and notification.related_entity_id = noah_request
    and delivery.recipient_membership_id = '13000000-0000-4000-8000-000000000009';
  if not found then raise exception 'FAIL: declined applicant was not notified'; end if;
  raise notice 'PASS: decline records the reason and notifies the staff member';

  -- Managers have no staff record, so they cannot request shifts.
  begin
    perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p27_ids where key = 'p2_v1'));
    raise exception 'FAIL: a manager requested an open shift';
  exception when insufficient_privilege then
    raise notice 'PASS: managers cannot request open shifts';
  end;
end $$;

-- A selected request can no longer be withdrawn by the staff member.
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000271","role":"authenticated"}', true);
do $$
declare
  liam_request uuid;
begin
  select request_id into liam_request from public.staff_portal_open_shift_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000004' and status = 'selected';
  begin
    perform public.rpc_withdraw_open_shift_request('10000000-0000-4000-8000-000000000001', liam_request);
    raise exception 'FAIL: a selected request was withdrawn';
  exception when sqlstate '55000' then
    raise notice 'PASS: only pending requests can be withdrawn';
  end;
end $$;

-- --------------------------------------------------------------------------
-- MANAGER (Alex): republish finalises — selected → confirmed, untouched
-- pending requests carry forward onto the new published rows.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001');
  if (result ->> 'version')::int <> 2 then raise exception 'FAIL: republish version %', result ->> 'version'; end if;
  if (result ->> 'finalised_requests')::int <> 1 then
    raise exception 'FAIL: republish finalised % requests (expected 1 confirmation)', result ->> 'finalised_requests';
  end if;
  if (result ->> 'notified_memberships')::int <> 1 then
    raise exception 'FAIL: republish notified % memberships (expected only the confirmed applicant)', result ->> 'notified_memberships';
  end if;
end $$;
-- Force outstanding deferred checks now, then restore deferred mode so the
-- next publish can insert its snapshot before its shifts.
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  liam record;
  b2 record;
  p2_v2 uuid;
begin
  select status, published_shift_id into liam from public.open_shift_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000004' and source_shift_id = '37000000-0000-4000-8000-000000000011';
  if liam.status <> 'confirmed' then raise exception 'FAIL: selected request finalised as % (expected confirmed)', liam.status; end if;

  select shift.id into p2_v2 from public.published_rota_shifts shift
  join public.published_rota_snapshots snap on snap.id = shift.snapshot_id
  where snap.rota_week_id = '37000000-0000-4000-8000-000000000001' and snap.version = 2
    and shift.source_shift_id = '37000000-0000-4000-8000-000000000012';

  select status, published_shift_id into b2 from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000271';
  if b2.status <> 'pending' or b2.published_shift_id <> p2_v2 then
    raise exception 'FAIL: carried-forward request status % / row not re-pointed at v2', b2.status;
  end if;
  insert into p27_ids (key, id) values ('p2_v2', p2_v2), ('p1_v2', (
    select shift.id from public.published_rota_shifts shift
    join public.published_rota_snapshots snap on snap.id = shift.snapshot_id
    where snap.rota_week_id = '37000000-0000-4000-8000-000000000001' and snap.version = 2
      and shift.source_shift_id = '37000000-0000-4000-8000-000000000011'));
  raise notice 'PASS: republish confirms the selection and carries the untouched pending request forward';
end $$;

-- --------------------------------------------------------------------------
-- STALE + NOT-OPEN GUARDS after the republish.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000272","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  -- Requesting a superseded published row is blocked with a clear reason.
  begin
    perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p27_ids where key = 'p2_v1'));
    raise exception 'FAIL: a stale published row was requestable';
  exception when sqlstate '55000' then
    raise notice 'PASS: requests against a superseded published version are blocked';
  end;
  -- Requesting a published SCHEDULED shift is blocked.
  begin
    perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p27_ids where key = 'p1_v2'));
    raise exception 'FAIL: a scheduled published shift was requestable';
  exception when sqlstate '55000' then
    raise notice 'PASS: only open published shifts can be requested';
  end;
end $$;

-- --------------------------------------------------------------------------
-- Selection guards: recurring day off, approved leave, overlap, weekly hours.
-- The pending Bartender Two request for the Fri 2099-08-14 shift is the target.
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);

insert into public.staff_recurring_day_off_requests (id, workspace_id, staff_member_id, weekday, status, decided_by_membership_id, decided_at)
values ('37000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000271', 4, 'approved', '13000000-0000-4000-8000-000000000011', now());

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  b2_request uuid;
begin
  select id into b2_request from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000271' and status = 'pending';
  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', b2_request);
    raise exception 'FAIL: selected despite an approved recurring day off';
  exception when sqlstate '55000' then
    raise notice 'PASS: selection respects approved recurring days off';
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
delete from public.staff_recurring_day_off_requests where id = '37000000-0000-4000-8000-000000000021';
insert into public.leave_requests (id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status, decided_at, decided_by_membership_id)
values ('37000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000271', 'annual_leave', '2099-08-14', '2099-08-15', 'P27 leave guard', 'approved', now(), '13000000-0000-4000-8000-000000000011');

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  b2_request uuid;
begin
  select id into b2_request from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000271' and status = 'pending';
  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', b2_request);
    raise exception 'FAIL: selected despite approved leave on the day';
  exception when sqlstate '55000' then
    raise notice 'PASS: selection respects approved leave';
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
delete from public.leave_requests where id = '37000000-0000-4000-8000-000000000022';
insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values ('37000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', '35000000-0000-4000-8000-000000000271', '2099-08-14', '2099-08-14T18:00:00+01:00', '2099-08-14T22:00:00+01:00', 0, 'Bartender', 'scheduled');

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  b2_request uuid;
begin
  select id into b2_request from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000271' and status = 'pending';
  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', b2_request);
    raise exception 'FAIL: selected despite an overlapping shift';
  exception when sqlstate '55000' then
    raise notice 'PASS: selection respects overlapping shifts';
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
delete from public.shifts where id = '37000000-0000-4000-8000-000000000023';
-- 6 × 8h = 48 scheduled hours already this week → the 5.5h shift must be blocked.
insert into public.shifts (workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
select '10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', '35000000-0000-4000-8000-000000000271',
       ('2099-08-10'::date + day_offset), (('2099-08-10'::date + day_offset) + time '08:00') at time zone 'Europe/London', (('2099-08-10'::date + day_offset) + time '16:00') at time zone 'Europe/London', 0, 'Bartender', 'scheduled'
from generate_series(0, 5) as day_offset
where day_offset <> 4; -- keep Friday clear of overlaps
insert into public.shifts (workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values ('10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', '35000000-0000-4000-8000-000000000271', '2099-08-16', '2099-08-16T08:00:00+01:00', '2099-08-16T16:00:00+01:00', 0, 'Bartender', 'scheduled');

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  b2_request uuid;
begin
  select id into b2_request from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000271' and status = 'pending';
  begin
    perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', b2_request);
    raise exception 'FAIL: selected despite exceeding 48 weekly hours';
  exception when sqlstate '55000' then
    raise notice 'PASS: selection respects the 48-hour weekly ceiling';
  end;
end $$;

  reset role;
  select set_config('request.jwt.claims', '', true);
  delete from public.shifts
  where staff_member_id = '35000000-0000-4000-8000-000000000271' and assignment_status = 'scheduled'
    and id <> '37000000-0000-4000-8000-000000000012';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  b2_request uuid;
  draft record;
begin
  select id into b2_request from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000271' and status = 'pending';
  perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', b2_request);
  select staff_member_id, assignment_status into draft from public.shifts where id = '37000000-0000-4000-8000-000000000012';
  if draft.staff_member_id is distinct from '35000000-0000-4000-8000-000000000271' or draft.assignment_status <> 'scheduled' then
    raise exception 'FAIL: clean selection did not assign the draft shift';
  end if;
  raise notice 'PASS: a clean applicant is selected against the latest published version';
end $$;

rollback;
