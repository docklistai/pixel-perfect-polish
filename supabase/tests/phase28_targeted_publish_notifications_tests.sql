-- Phase 28 targeted publish-notification verification. Runs inside one
-- rolled-back transaction against the local stack; the seeded database is
-- left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase28_targeted_publish_notifications_tests.sql
--
-- Covers: first publish still tells every active staff member; an unchanged
-- republish tells nobody; a republish tells ONLY affected staff (added /
-- removed-or-reassigned / materially changed), one aggregated message each;
-- open-shift requests finalise in the same transaction (confirmed, filled,
-- stale) with their own notifications; a confirmed win is told once, not
-- twice; publishing a brand-new open shift notifies nobody.

begin;

-- --------------------------------------------------------------------------
-- Setup (postgres context). Active staff: Liam (Bartender, membership
-- 13…0005), Noah (Porter, membership 13…0009), and a created Bartender Two.
-- Alex (ab…0001) is the active manager.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000281', 'authenticated', 'authenticated', 'p28.liam@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000282', 'authenticated', 'authenticated', 'p28.noah@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000283', 'authenticated', 'authenticated', 'p28.bartender2@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000284', 'authenticated', 'authenticated', 'p28.inactive@harbourview.co.uk');

update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000281', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000005';
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000282', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000009';

insert into public.workspace_memberships (id, workspace_id, role, status, invited_at)
values
  ('34000000-0000-4000-8000-000000000281', '10000000-0000-4000-8000-000000000001', 'staff', 'invited', '2026-06-01T08:00:00Z'),
  ('34000000-0000-4000-8000-000000000282', '10000000-0000-4000-8000-000000000001', 'staff', 'invited', '2026-06-01T08:00:00Z');
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000283', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '34000000-0000-4000-8000-000000000281';
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000284', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '34000000-0000-4000-8000-000000000282';

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name, employment_status)
values
  ('35000000-0000-4000-8000-000000000281', '10000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000281', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', 'P28 Bartender Two', 'Bartender', 'active'),
  ('35000000-0000-4000-8000-000000000282', '10000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000282', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', 'P28 Inactive Staff', 'Bartender', 'inactive');

-- Far-future week: Mon 2099-08-17. A = Liam scheduled, B/D = open Bartender,
-- C = Noah scheduled.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('38000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2099-08-17', 'draft');

insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values
  ('38000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004', '2099-08-18', '2099-08-18T10:00:00+01:00', '2099-08-18T18:00:00+01:00', 30, 'Bartender', 'scheduled'),
  ('38000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', null, '2099-08-19', '2099-08-19T17:00:00+01:00', '2099-08-19T23:00:00+01:00', 30, 'Bartender', 'open'),
  ('38000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000005', '14000000-0000-4000-8000-000000000008', '2099-08-20', '2099-08-20T07:00:00+01:00', '2099-08-20T15:00:00+01:00', 30, 'Porter', 'scheduled'),
  ('38000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', null, '2099-08-21', '2099-08-21T17:00:00+01:00', '2099-08-21T23:00:00+01:00', 30, 'Bartender', 'open');

create temp table p28_ids (key text primary key, id uuid);
grant select on p28_ids to public;

-- Helper: deliveries of one kind tied to one related entity.
create temp table p28_counts (key text primary key, n bigint);

-- --------------------------------------------------------------------------
-- v1: first publish tells every active staff member (and only them).
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001');
  if (result ->> 'version')::int <> 1 then raise exception 'FAIL: publish version %', result ->> 'version'; end if;
  if (result ->> 'notified_memberships')::int <> 3 then
    raise exception 'FAIL: first publish notified % (expected all 3 active staff)', result ->> 'notified_memberships';
  end if;
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  v1 uuid;
  delivered bigint;
begin
  select id into v1 from public.published_rota_snapshots
  where rota_week_id = '38000000-0000-4000-8000-000000000001' and version = 1;
  insert into p28_ids values ('v1', v1);

  select count(*) into delivered
  from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'rota_published' and notification.related_entity_id = v1;
  if delivered <> 3 then raise exception 'FAIL: v1 rota_published deliveries % (expected 3)', delivered; end if;
  perform 1
  from public.notification_deliveries as delivery
  join public.notifications as notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.related_entity_id = v1
    and delivery.recipient_membership_id = '34000000-0000-4000-8000-000000000282';
  if found then raise exception 'FAIL: inactive employee received the first-publish notification'; end if;
  raise notice 'PASS: first publish notifies every active staff member';
end $$;

insert into p28_ids (key, id)
select 'b_v1', shift.id from public.published_rota_shifts shift
where shift.snapshot_id = (select id from p28_ids where key = 'v1')
  and shift.source_shift_id = '38000000-0000-4000-8000-000000000012';
insert into p28_ids (key, id)
select 'd_v1', shift.id from public.published_rota_shifts shift
where shift.snapshot_id = (select id from p28_ids where key = 'v1')
  and shift.source_shift_id = '38000000-0000-4000-8000-000000000014';

-- --------------------------------------------------------------------------
-- Requests: Bartender Two wants B, Liam wants D.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000283","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p28_ids where key = 'b_v1'));
end $$;

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000281","role":"authenticated"}', true);
do $$
begin
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p28_ids where key = 'd_v1'));
end $$;

-- Manager selects Bartender Two for B (draft-only assignment).
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare
  b2_request uuid;
begin
  select id into b2_request from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000281' and status = 'pending';
  perform public.rpc_select_open_shift_applicant('10000000-0000-4000-8000-000000000001', b2_request);
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- Manager draft edits before republishing: shift A moves an hour later, and
-- open shift D is filled by hand with Noah.
update public.shifts
set starts_at = '2099-08-18T11:00:00+01:00', ends_at = '2099-08-18T19:00:00+01:00'
where id = '38000000-0000-4000-8000-000000000011';
update public.shifts
set staff_member_id = '14000000-0000-4000-8000-000000000008', assignment_status = 'scheduled'
where id = '38000000-0000-4000-8000-000000000014';
-- Reassign C from Noah to Liam: one removal and one addition, aggregated with
-- their other changes rather than broadcast as separate messages.
update public.shifts
set staff_member_id = '14000000-0000-4000-8000-000000000004'
where id = '38000000-0000-4000-8000-000000000013';

-- --------------------------------------------------------------------------
-- v2: republish tells only the affected staff, finalises both requests.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001');
  if (result ->> 'version')::int <> 2 then raise exception 'FAIL: republish version %', result ->> 'version'; end if;
  if (result ->> 'finalised_requests')::int <> 2 then
    raise exception 'FAIL: republish finalised % requests (expected confirmed + filled)', result ->> 'finalised_requests';
  end if;
  if (result ->> 'notified_memberships')::int <> 4 then
    raise exception 'FAIL: republish notified % memberships (expected 4 targeted messages)', result ->> 'notified_memberships';
  end if;
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  v2 uuid;
  b2_status text;
  liam_status text;
  liam_changed bigint;
  noah_changed bigint;
  b2_changed bigint;
  rota_published_v2 bigint;
  finalisation_audits bigint;
  liam_body text;
  noah_body text;
begin
  select id into v2 from public.published_rota_snapshots
  where rota_week_id = '38000000-0000-4000-8000-000000000001' and version = 2;
  insert into p28_ids values ('v2', v2);

  select status into b2_status from public.open_shift_requests where staff_member_id = '35000000-0000-4000-8000-000000000281';
  if b2_status <> 'confirmed' then raise exception 'FAIL: selected request finalised as %', b2_status; end if;
  select status into liam_status from public.open_shift_requests where staff_member_id = '14000000-0000-4000-8000-000000000004';
  if liam_status <> 'filled' then raise exception 'FAIL: outcompeted request finalised as %', liam_status; end if;

  select count(*) into finalisation_audits
  from public.audit_events
  where action = 'open_shift.publish_finalised'
    and details ->> 'published_snapshot_id' = v2::text;
  if finalisation_audits <> 2 then
    raise exception 'FAIL: republish wrote % per-request finalisation audits (expected 2)', finalisation_audits;
  end if;

  -- No blanket rota_published on a republish.
  select count(*) into rota_published_v2
  from public.notifications where kind = 'rota_published' and related_entity_id = v2;
  if rota_published_v2 <> 0 then raise exception 'FAIL: republish sent % blanket rota_published notifications', rota_published_v2; end if;

  -- Confirmed winner: exactly one open_shift_update, no duplicate shift_changed.
  select count(*) into b2_changed
  from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'shift_changed' and notification.related_entity_id = v2
    and delivery.recipient_membership_id = '34000000-0000-4000-8000-000000000281';
  if b2_changed <> 0 then raise exception 'FAIL: confirmed applicant also got % generic shift_changed messages', b2_changed; end if;
  perform 1 from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'open_shift_update' and notification.title = 'Open shift confirmed'
    and delivery.recipient_membership_id = '34000000-0000-4000-8000-000000000281';
  if not found then raise exception 'FAIL: confirmed applicant was not told'; end if;

  -- Liam: one aggregated shift_changed (one added + one updated) plus filled.
  select count(*), min(notification.body) into liam_changed, liam_body
  from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'shift_changed' and notification.related_entity_id = v2
    and delivery.recipient_membership_id = '13000000-0000-4000-8000-000000000005';
  if liam_changed <> 1
     or position('1 added' in liam_body) = 0
     or position('1 updated' in liam_body) = 0 then
    raise exception 'FAIL: updated-shift staff got % messages (body %)', liam_changed, liam_body;
  end if;
  perform 1 from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'open_shift_update' and notification.title = 'Open shift filled'
    and delivery.recipient_membership_id = '13000000-0000-4000-8000-000000000005';
  if not found then raise exception 'FAIL: outcompeted applicant was not told the shift filled'; end if;

  -- Noah: one aggregated shift_changed (one added + one removed).
  select count(*), min(notification.body) into noah_changed, noah_body
  from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'shift_changed' and notification.related_entity_id = v2
    and delivery.recipient_membership_id = '13000000-0000-4000-8000-000000000009';
  if noah_changed <> 1
     or position('1 added' in noah_body) = 0
     or position('1 removed' in noah_body) = 0 then
    raise exception 'FAIL: newly-assigned staff got % messages (body %)', noah_changed, noah_body;
  end if;

  raise notice 'PASS: republish notifies only affected staff, once each, and finalises requests';
end $$;

-- --------------------------------------------------------------------------
-- v3: an unchanged republish notifies nobody and touches no request.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001');
  if (result ->> 'notified_memberships')::int <> 0 then
    raise exception 'FAIL: unchanged republish notified % memberships', result ->> 'notified_memberships';
  end if;
  if (result ->> 'finalised_requests')::int <> 0 then
    raise exception 'FAIL: unchanged republish finalised % requests', result ->> 'finalised_requests';
  end if;
  raise notice 'PASS: an unchanged republish stays silent';
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

-- --------------------------------------------------------------------------
-- v4/v5: a brand-new open shift notifies nobody; changing it after a request
-- marks the request stale at the next republish, with a clear notice.
-- --------------------------------------------------------------------------
insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values ('38000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', null, '2099-08-22', '2099-08-22T17:00:00+01:00', '2099-08-22T23:00:00+01:00', 0, 'Bartender', 'open');

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001');
  if (result ->> 'notified_memberships')::int <> 0 then
    raise exception 'FAIL: publishing a new OPEN shift notified % memberships (expected 0)', result ->> 'notified_memberships';
  end if;
  raise notice 'PASS: adding an open shift blasts nobody';
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

insert into p28_ids (key, id)
select 'e_v4', shift.id from public.published_rota_shifts shift
join public.published_rota_snapshots snap on snap.id = shift.snapshot_id
where snap.rota_week_id = '38000000-0000-4000-8000-000000000001' and snap.version = 4
  and shift.source_shift_id = '38000000-0000-4000-8000-000000000015';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000283","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', (select id from p28_ids where key = 'e_v4'));
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
update public.shifts
set break_minutes = 15
where id = '38000000-0000-4000-8000-000000000015';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  result jsonb;
begin
  result := public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001');
  if (result ->> 'finalised_requests')::int <> 1 then
    raise exception 'FAIL: v5 finalised % requests (expected the stale one)', result ->> 'finalised_requests';
  end if;
  if (result ->> 'notified_memberships')::int <> 1 then
    raise exception 'FAIL: v5 notified % memberships (expected only the stale requester)', result ->> 'notified_memberships';
  end if;
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  request_status text;
begin
  select status into request_status from public.open_shift_requests
  where staff_member_id = '35000000-0000-4000-8000-000000000281'
    and source_shift_id = '38000000-0000-4000-8000-000000000015';
  if request_status <> 'stale' then raise exception 'FAIL: changed-shift request finalised as %', request_status; end if;
  perform 1 from public.notification_deliveries delivery
  join public.notifications notification
    on notification.workspace_id = delivery.workspace_id and notification.id = delivery.notification_id
  where notification.kind = 'open_shift_update'
    and notification.title = 'Open shift no longer available'
    and delivery.recipient_membership_id = '34000000-0000-4000-8000-000000000281';
  if not found then raise exception 'FAIL: stale requester was not told'; end if;
  raise notice 'PASS: a materially changed pending request becomes stale';
end $$;

rollback;
