-- Phase 30 adversarial checks: rpc_publish_rota_week is the only
-- client-reachable publication transition. Direct writes to publication
-- evidence (snapshots, published shifts, open-shift requests, notifications,
-- deliveries) are refused for every client persona, the canonical RPC still
-- succeeds, and publication + request finalisation + notifications commit or
-- roll back together. Runs in one rolled-back transaction against the local
-- stack (seeded manager alex / membership 13…11 is already active).

begin;

-- --------------------------------------------------------------------------
-- Setup (service path): bind Liam (Bartender) to a test auth user; build two
-- future draft weeks, one open Bartender shift each (main site + annex).
-- --------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated', 'p30.liam@harbourview.co.uk');

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000301',
    status = 'active',
    joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000005';

insert into public.locations (id, workspace_id, name, timezone)
values ('3e000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'P30 Annex', 'Europe/London');

create temp table p30_dates as
select (
  (now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::integer) % 7)
  + 7
)::date as week_start;

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '3e000000-0000-4000-8000-000000000011'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid, week_start, 'draft'
from p30_dates
union all
select '3e000000-0000-4000-8000-000000000012'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '3e000000-0000-4000-8000-000000000001'::uuid, week_start, 'draft'
from p30_dates;

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, shift_date,
  starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '3e000000-0000-4000-8000-000000000021'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '3e000000-0000-4000-8000-000000000011'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid, week_start + 1,
       (week_start + 1 + time '10:00') at time zone 'Europe/London',
       (week_start + 1 + time '18:00') at time zone 'Europe/London',
       30, 'Bartender', 'open'
from p30_dates
union all
select '3e000000-0000-4000-8000-000000000022'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '3e000000-0000-4000-8000-000000000012'::uuid, '3e000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid, week_start + 2,
       (week_start + 2 + time '10:00') at time zone 'Europe/London',
       (week_start + 2 + time '18:00') at time zone 'Europe/London',
       30, 'Bartender', 'open'
from p30_dates;

-- First publish of both weeks through the canonical RPC (manager persona).
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000011');
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000012');
end $$;
set constraints all immediate;
set constraints all deferred;
reset role;
select set_config('request.jwt.claims', '', true);

create temp table p30_ids (key text primary key, id uuid);
grant select on p30_ids to authenticated;
insert into p30_ids (key, id)
select case shift.source_shift_id
         when '3e000000-0000-4000-8000-000000000021' then 'published_a'
         else 'published_b'
       end,
       shift.id
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot
  on snapshot.workspace_id = shift.workspace_id and snapshot.id = shift.snapshot_id
where snapshot.rota_week_id in (
  '3e000000-0000-4000-8000-000000000011',
  '3e000000-0000-4000-8000-000000000012'
);
insert into p30_ids (key, id)
select 'snapshot_a1', snapshot.id
from public.published_rota_snapshots as snapshot
where snapshot.rota_week_id = '3e000000-0000-4000-8000-000000000011';

-- Liam requests both open shifts through the canonical RPC.
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000301","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.rpc_request_open_shift(
    '10000000-0000-4000-8000-000000000001', (select id from p30_ids where key = 'published_a'));
  perform public.rpc_request_open_shift(
    '10000000-0000-4000-8000-000000000001', (select id from p30_ids where key = 'published_b'));
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona: no direct write path to publication evidence.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.published_rota_snapshots (workspace_id, rota_week_id, version, published_by_membership_id, published_at, created_at)
    values ('10000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000011', 2, '13000000-0000-4000-8000-000000000005', transaction_timestamp(), transaction_timestamp());
    raise exception 'FAIL: staff minted a published snapshot';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot insert published snapshots'; end;
  begin
    update public.open_shift_requests set status = 'confirmed'
    where workspace_id = '10000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: staff finalised their own open-shift request';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot write open-shift requests directly'; end;
end $$;
reset role;
select set_config('request.jwt.claims', '', true);

insert into p30_ids (key, id)
select case source_shift_id
         when '3e000000-0000-4000-8000-000000000021' then 'request_a'
         else 'request_b'
       end,
       id
from public.open_shift_requests
where source_shift_id in (
  '3e000000-0000-4000-8000-000000000021',
  '3e000000-0000-4000-8000-000000000022'
);

-- --------------------------------------------------------------------------
-- MANAGER persona: every direct bypass of the publish transition is refused.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    insert into public.published_rota_snapshots (workspace_id, rota_week_id, version, published_by_membership_id, published_at, created_at)
    values ('10000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000011', 2, '13000000-0000-4000-8000-000000000011', transaction_timestamp(), transaction_timestamp());
    raise exception 'FAIL: manager minted a snapshot without the publish RPC';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot insert published snapshots directly'; end;
  begin
    insert into public.published_rota_shifts (workspace_id, snapshot_id, source_shift_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
    select '10000000-0000-4000-8000-000000000001', (select id from p30_ids where key = 'snapshot_a1'),
           gen_random_uuid(), '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003',
           '14000000-0000-4000-8000-000000000004', week_start + 1,
           (week_start + 1 + time '10:00') at time zone 'Europe/London',
           (week_start + 1 + time '18:00') at time zone 'Europe/London',
           30, 'Bartender', 'scheduled'
    from p30_dates;
    raise exception 'FAIL: manager injected a published shift without the publish RPC';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot insert published shifts directly'; end;
  begin
    update public.open_shift_requests set status = 'confirmed', decided_by_membership_id = '13000000-0000-4000-8000-000000000011', decided_at = now()
    where id = (select id from p30_ids where key = 'request_a');
    raise exception 'FAIL: manager finalised an open-shift request without publish/decline RPCs';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot write open-shift requests directly'; end;
  begin
    insert into public.open_shift_requests (workspace_id, published_shift_id, source_shift_id, rota_week_id, staff_member_id)
    values ('10000000-0000-4000-8000-000000000001', (select id from p30_ids where key = 'published_a'),
            '3e000000-0000-4000-8000-000000000021', '3e000000-0000-4000-8000-000000000011',
            '14000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: manager forged an open-shift request';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot insert open-shift requests directly'; end;
  begin
    delete from public.open_shift_requests
    where id = (select id from p30_ids where key = 'request_a');
    raise exception 'FAIL: manager deleted open-shift request evidence';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot delete open-shift requests'; end;
  begin
    insert into public.notifications (workspace_id, created_by_membership_id, kind, title, body)
    values ('10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000011', 'rota_published', 'Fake publish', 'No snapshot exists for this.');
    raise exception 'FAIL: manager fabricated a publish notification';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot insert notifications directly'; end;
  begin
    insert into public.notification_deliveries (workspace_id, notification_id, recipient_membership_id, created_at)
    select delivery.workspace_id, delivery.notification_id, '13000000-0000-4000-8000-000000000011', now()
    from public.notification_deliveries as delivery limit 1;
    raise exception 'FAIL: manager fabricated a notification delivery';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot insert notification deliveries directly'; end;
end $$;

-- --------------------------------------------------------------------------
-- Canonical path: select Liam for both shifts, republish week A, and the
-- transition finalises + notifies exactly the affected person.
-- --------------------------------------------------------------------------
do $$
declare
  publish_result jsonb;
  request_status text;
  new_snapshot_id uuid;
  confirm_delivery_count integer;
  wrong_recipient_count integer;
begin
  perform public.rpc_select_open_shift_applicant(
    '10000000-0000-4000-8000-000000000001', (select id from p30_ids where key = 'request_a'));
  perform public.rpc_select_open_shift_applicant(
    '10000000-0000-4000-8000-000000000001', (select id from p30_ids where key = 'request_b'));

  publish_result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000011');
  if (publish_result ->> 'version')::int <> 2 then
    raise exception 'FAIL: canonical republish returned version %', publish_result ->> 'version';
  end if;
  if (publish_result ->> 'finalised_requests')::int <> 1 then
    raise exception 'FAIL: republish finalised % requests (expected 1)', publish_result ->> 'finalised_requests';
  end if;
  new_snapshot_id := (publish_result ->> 'snapshot_id')::uuid;

  select status into request_status
  from public.open_shift_requests
  where id = (select id from p30_ids where key = 'request_a');
  if request_status <> 'confirmed' then
    raise exception 'FAIL: selected request is % after republish (expected confirmed)', request_status;
  end if;

  select count(*) into confirm_delivery_count
  from public.notification_deliveries as delivery
  join public.notifications as notification
    on notification.workspace_id = delivery.workspace_id
   and notification.id = delivery.notification_id
  where notification.kind = 'open_shift_update'
    and notification.related_entity_id = (select id from p30_ids where key = 'request_a')
    and delivery.recipient_membership_id = '13000000-0000-4000-8000-000000000005';
  if confirm_delivery_count <> 1 then
    raise exception 'FAIL: applicant received % confirmation deliveries (expected 1)', confirm_delivery_count;
  end if;

  select count(*) into wrong_recipient_count
  from public.notification_deliveries as delivery
  join public.notifications as notification
    on notification.workspace_id = delivery.workspace_id
   and notification.id = delivery.notification_id
  where notification.related_entity_id in (new_snapshot_id, (select id from p30_ids where key = 'request_a'))
    and delivery.recipient_membership_id <> '13000000-0000-4000-8000-000000000005';
  if wrong_recipient_count <> 0 then
    raise exception 'FAIL: republish notified % unaffected memberships', wrong_recipient_count;
  end if;

  raise notice 'PASS: canonical republish confirms the applicant and notifies only them';
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

-- --------------------------------------------------------------------------
-- Atomicity: make the week-B selected applicant ineligible (service path),
-- then republish. The preflight failure must roll back the snapshot, the
-- request transition, and every notification together.
-- --------------------------------------------------------------------------
create temp table p30_before as
select
  (select count(*) from public.published_rota_snapshots
   where rota_week_id = '3e000000-0000-4000-8000-000000000012') as snapshot_count,
  (select count(*) from public.notification_deliveries
   where workspace_id = '10000000-0000-4000-8000-000000000001') as delivery_count,
  (select status from public.open_shift_requests
   where id = (select id from p30_ids where key = 'request_b')) as request_status;
grant select on p30_before to authenticated;

update public.staff_members set employment_status = 'inactive'
where id = '14000000-0000-4000-8000-000000000004';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare before_row record;
begin
  select * into before_row from p30_before;

  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000012');
    raise exception 'FAIL: published while the selected applicant was ineligible';
  exception when sqlstate '55000' then
    raise notice 'PASS: stale/ineligible selection blocks publication';
  end;

  if (select count(*) from public.published_rota_snapshots
      where rota_week_id = '3e000000-0000-4000-8000-000000000012') <> before_row.snapshot_count then
    raise exception 'FAIL: blocked publish leaked a snapshot';
  end if;
  if (select status from public.open_shift_requests
      where id = (select id from p30_ids where key = 'request_b')) <> before_row.request_status then
    raise exception 'FAIL: blocked publish leaked a request transition';
  end if;
  if (select count(*) from public.notification_deliveries
      where workspace_id = '10000000-0000-4000-8000-000000000001') <> before_row.delivery_count then
    raise exception 'FAIL: blocked publish leaked notifications';
  end if;
  raise notice 'PASS: publication, request resolution, and notifications roll back together';
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
update public.staff_members set employment_status = 'active'
where id = '14000000-0000-4000-8000-000000000004';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  publish_result jsonb;
  request_status text;
begin
  publish_result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000012');
  if (publish_result ->> 'version')::int <> 2 then
    raise exception 'FAIL: recovered republish returned version %', publish_result ->> 'version';
  end if;
  select status into request_status
  from public.open_shift_requests
  where id = (select id from p30_ids where key = 'request_b');
  if request_status <> 'confirmed' then
    raise exception 'FAIL: recovered republish left the request % (expected confirmed)', request_status;
  end if;
  raise notice 'PASS: the same publication commits whole once eligibility is restored';
end $$;
set constraints all immediate;

rollback;
