-- ===========================================================================
-- Phase 68: Manager Request Notifications Tests (WS-5)
-- ---------------------------------------------------------------------------
-- Proves that staff operational requests deliver notifications exclusively to
-- active managers/owners:
--   * rpc_request_open_shift
--   * rpc_request_shift_release
--   * rpc_request_one_off_unavailability
--   * rpc_request_recurring_day_off
--
-- Invariants:
--   1. All four RPCs deliver notifications ONLY to active owner/manager memberships.
--   2. Staff recipients receive ZERO notifications on staff request creation.
--   3. Inactive manager memberships receive ZERO notifications.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Setup identities
-- Alex (ab000000-0000-4000-8000-000000000001, membership 13...0011) is active manager.
-- Owner membership (13...0001) will be activated with user ad...0680.
-- Inactive manager membership (13...0010) remains invited (inactive).
-- Liam (staff membership 13...0005, staff_member 14...0004) activated with user ad...0681.
-- Noah (staff membership 13...0009, staff_member 14...0008) activated with user ad...0682.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000680', 'authenticated', 'authenticated', 'p68.owner@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000681', 'authenticated', 'authenticated', 'p68.liam@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000682', 'authenticated', 'authenticated', 'p68.noah@harbourview.co.uk');

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000680', status = 'active', joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000001';

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000681', status = 'active', joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000005';

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000682', status = 'active', joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000009';

-- Setup a future rota week with one open Bartender shift and one assigned shift for Liam
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('68000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '2099-09-07', 'draft');

insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
values
  ('68000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '68000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', null, '2099-09-08', '2099-09-08T17:00:00+01:00', '2099-09-08T23:00:00+01:00', 30, 'Bartender', 'open'),
  ('68000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '68000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004', '2099-09-09', '2099-09-09T17:00:00+01:00', '2099-09-09T23:00:00+01:00', 30, 'Bartender', 'scheduled');

-- Manager Alex publishes the week
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', '68000000-0000-4000-8000-000000000001');

reset role;
select set_config('request.jwt.claims', '', true);

-- Locate the published shifts
create temp table p68_published_shifts (key text primary key, id uuid);
grant select on p68_published_shifts to public;
insert into p68_published_shifts
select
  case
    when s.source_shift_id = '68000000-0000-4000-8000-000000000011' then 'open_shift'
    else 'assigned_shift'
  end,
  s.id
from public.published_rota_shifts s
join public.published_rota_snapshots snap on snap.id = s.snapshot_id
where snap.rota_week_id = '68000000-0000-4000-8000-000000000001';

-- Temp table to capture request ids across calls
create temp table p68_requests (key text primary key, id uuid);
grant all on p68_requests to public;

-- Switch to Liam (staff member) to execute requests
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000681","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_open_shift_id uuid;
  v_assigned_shift_id uuid;
  v_res jsonb;
begin
  -- 1. Open shift request
  select id into v_open_shift_id from p68_published_shifts where key = 'open_shift';
  v_res := public.rpc_request_open_shift('10000000-0000-4000-8000-000000000001', v_open_shift_id);
  insert into p68_requests values ('open_shift', (v_res ->> 'request_id')::uuid);

  -- 2. Shift release request
  select id into v_assigned_shift_id from p68_published_shifts where key = 'assigned_shift';
  v_res := public.rpc_request_shift_release('10000000-0000-4000-8000-000000000001', v_assigned_shift_id, 'Need release for family event');
  insert into p68_requests values ('shift_release', (v_res ->> 'request_id')::uuid);

  -- 3. One-off unavailability request
  v_res := public.rpc_request_one_off_unavailability('10000000-0000-4000-8000-000000000001', '2099-09-20'::date, 'Doctor appointment');
  insert into p68_requests values ('one_off_unavailability', (v_res ->> 'request_id')::uuid);

  -- 4. Recurring day off request
  v_res := public.rpc_request_recurring_day_off('10000000-0000-4000-8000-000000000001', 2::smallint, 'College course on Wednesdays');
  insert into p68_requests values ('recurring_day_off', (v_res ->> 'request_id')::uuid);
end $$;

-- Liam sees ZERO deliveries for these requests because Liam is staff, not manager
do $$
declare
  v_staff_deliveries int;
begin
  select count(*) into v_staff_deliveries
  from public.staff_portal_notifications
  where related_entity_id in (select id from p68_requests);

  if v_staff_deliveries <> 0 then
    raise exception 'FAIL: staff caller received request notifications: %', v_staff_deliveries;
  end if;
  raise notice 'PASS: staff portal view received zero notifications on staff request creation';
end $$;

-- Switch back to postgres (bypasses RLS) to audit delivery fan-out
reset role;
select set_config('request.jwt.claims', '', true);

-- Verify delivery recipients for each request
do $$
declare
  r record;
  v_notif_count int;
  v_invalid_count int;
  v_alex_delivery int;
  v_owner_delivery int;
begin
  for r in (
    select 'open_shift' as key, 'open_shift_update' as kind union all
    select 'shift_release' as key, 'shift_release_update' as kind union all
    select 'one_off_unavailability' as key, 'unavailability_update' as kind union all
    select 'recurring_day_off' as key, 'announcement' as kind
  ) loop
    -- Count total deliveries for this notification
    select count(*) into v_notif_count
    from public.notification_deliveries d
    join public.notifications n on n.id = d.notification_id
    where n.workspace_id = '10000000-0000-4000-8000-000000000001'
      and n.kind = r.kind
      and n.related_entity_id = (select id from p68_requests where key = r.key);

    if v_notif_count <> 2 then
      raise exception 'FAIL: % notification delivered to % recipients (expected 2: active owner and active manager)', r.key, v_notif_count;
    end if;

    -- Verify no inactive or staff memberships received deliveries
    select count(*) into v_invalid_count
    from public.notification_deliveries d
    join public.notifications n on n.id = d.notification_id
    join public.workspace_memberships m on m.id = d.recipient_membership_id
    where n.workspace_id = '10000000-0000-4000-8000-000000000001'
      and n.kind = r.kind
      and n.related_entity_id = (select id from p68_requests where key = r.key)
      and (m.role not in ('owner', 'manager') or m.status <> 'active');

    if v_invalid_count > 0 then
      raise exception 'FAIL: % notification delivered to % non-manager or inactive recipients', r.key, v_invalid_count;
    end if;

    -- Verify specific active manager Alex and active owner were delivered to
    select count(*) into v_alex_delivery
    from public.notification_deliveries d
    join public.notifications n on n.id = d.notification_id
    where n.workspace_id = '10000000-0000-4000-8000-000000000001'
      and n.kind = r.kind
      and n.related_entity_id = (select id from p68_requests where key = r.key)
      and d.recipient_membership_id = '13000000-0000-4000-8000-000000000011';

    select count(*) into v_owner_delivery
    from public.notification_deliveries d
    join public.notifications n on n.id = d.notification_id
    where n.workspace_id = '10000000-0000-4000-8000-000000000001'
      and n.kind = r.kind
      and n.related_entity_id = (select id from p68_requests where key = r.key)
      and d.recipient_membership_id = '13000000-0000-4000-8000-000000000001';

    if v_alex_delivery <> 1 or v_owner_delivery <> 1 then
      raise exception 'FAIL: % delivery missing for active manager or owner (alex: %, owner: %)', r.key, v_alex_delivery, v_owner_delivery;
    end if;

    raise notice 'PASS: % request delivered exclusively to active managers', r.key;
  end loop;
end $$;

rollback;
