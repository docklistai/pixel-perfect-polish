-- Phase 32 controlled shift-release state machine and tenant isolation.
begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000',
        'ad000000-0000-4000-8000-000000000321',
        'authenticated', 'authenticated', 'p32.staff@example.test');
update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000321', status = 'active',
    joined_at = transaction_timestamp()
where id = '13000000-0000-4000-8000-000000000005';

create temp table p32_dates as
select ((now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::int) % 7)
  + 21)::date as week_start;

insert into public.rota_weeks (id, workspace_id, location_id, week_start)
select '42000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001', week_start
from p32_dates;

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select id, '10000000-0000-4000-8000-000000000001',
       '42000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001',
       '12000000-0000-4000-8000-000000000003',
       '14000000-0000-4000-8000-000000000004', week_start + day_offset,
       (week_start + day_offset + time '09:00') at time zone 'Europe/London',
       (week_start + day_offset + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p32_dates
cross join (values
  ('42000000-0000-4000-8000-000000000011'::uuid, 1),
  ('42000000-0000-4000-8000-000000000012'::uuid, 2),
  ('42000000-0000-4000-8000-000000000013'::uuid, 3),
  ('42000000-0000-4000-8000-000000000014'::uuid, 4)
) as fixture(id, day_offset);

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001');
set constraints all immediate;
set constraints all deferred;

reset role;
create temp table p32_ids (key text primary key, id uuid);
grant select on p32_ids to authenticated;
insert into p32_ids
select source_shift_id::text, id
from public.published_rota_shifts
where snapshot_id = (
  select id from public.published_rota_snapshots
  where rota_week_id = '42000000-0000-4000-8000-000000000001' and version = 1
);

do $$ begin
  begin
    insert into public.shift_release_requests (
      id, workspace_id, published_shift_id, source_shift_id, rota_week_id,
      staff_member_id, reason
    ) values (
      '42000000-0000-4000-8000-000000000099',
      '10000000-0000-4000-8000-000000000001',
      (select id from p32_ids
       where key = '42000000-0000-4000-8000-000000000011'),
      '42000000-0000-4000-8000-000000000012',
      '42000000-0000-4000-8000-000000000001',
      '14000000-0000-4000-8000-000000000004',
      'Mismatched source must fail'
    );
    raise exception 'FAIL: release accepted a source from another published row';
  exception when foreign_key_violation then null;
  end;
  raise notice 'PASS: composite published/source identity is enforced';
end $$;

select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000321","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  r1 uuid;
  r2 uuid;
  r3 uuid;
  r4 uuid;
  portal_count int;
  notification_count int;
  audit_count int;
begin
  r1 := (public.rpc_request_shift_release(
    '10000000-0000-4000-8000-000000000001',
    (select id from p32_ids where key = '42000000-0000-4000-8000-000000000011'),
    repeat('r', 2000)) ->> 'request_id')::uuid;
  select count(*) into notification_count from public.notifications
  where related_entity_type = 'shift_release_request' and related_entity_id = r1;
  select count(*) into audit_count from public.audit_events
  where subject_type = 'shift_release_request' and subject_id = r1
    and action = 'shift_release.requested';
  if (public.rpc_request_shift_release(
      '10000000-0000-4000-8000-000000000001',
      (select id from p32_ids where key = '42000000-0000-4000-8000-000000000011'),
      'duplicate retry') ->> 'request_id')::uuid <> r1
     or (select count(*) from public.notifications
         where related_entity_type = 'shift_release_request'
           and related_entity_id = r1) <> notification_count
     or (select count(*) from public.audit_events
         where subject_type = 'shift_release_request' and subject_id = r1
           and action = 'shift_release.requested') <> audit_count then
    raise exception 'FAIL: pending request retry duplicated identity/evidence';
  end if;
  perform public.rpc_withdraw_shift_release(
    '10000000-0000-4000-8000-000000000001', r1);
  if (select status from public.staff_portal_shift_release_requests
      where request_id = r1) <> 'withdrawn' then
    raise exception 'FAIL: withdrawal was not retained';
  end if;
  if (public.rpc_request_shift_release(
      '10000000-0000-4000-8000-000000000001',
      (select id from p32_ids where key = '42000000-0000-4000-8000-000000000011'),
      'Need cover') ->> 'request_id')::uuid <> r1 then
    raise exception 'FAIL: re-request created a second identity';
  end if;
  r2 := (public.rpc_request_shift_release(
    '10000000-0000-4000-8000-000000000001',
    (select id from p32_ids where key = '42000000-0000-4000-8000-000000000012'),
    'Cannot attend') ->> 'request_id')::uuid;
  r3 := (public.rpc_request_shift_release(
    '10000000-0000-4000-8000-000000000001',
    (select id from p32_ids where key = '42000000-0000-4000-8000-000000000013'),
    'Family appointment') ->> 'request_id')::uuid;
  r4 := (public.rpc_request_shift_release(
    '10000000-0000-4000-8000-000000000001',
    (select id from p32_ids where key = '42000000-0000-4000-8000-000000000014'),
    'Pending source will disappear') ->> 'request_id')::uuid;
  select count(*) into portal_count from public.staff_portal_shift_release_requests;
  if portal_count <> 4 then raise exception 'FAIL: portal request count %', portal_count; end if;
  begin
    perform public.rpc_request_shift_release(
      '21000000-0000-4000-8000-000000000001',
      (select id from p32_ids limit 1), 'cross tenant');
    raise exception 'FAIL: cross-tenant release request succeeded';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: staff request/withdraw/re-request, idempotency, and self-only view';
end $$;

reset role;
select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare r1 uuid; r3 uuid; published_staff uuid;
begin
  select id into r1 from public.shift_release_requests
  where source_shift_id = '42000000-0000-4000-8000-000000000011';
  select id into r3 from public.shift_release_requests
  where source_shift_id = '42000000-0000-4000-8000-000000000013';
  perform public.rpc_decline_shift_release(
    '10000000-0000-4000-8000-000000000001', r3, repeat('n', 2000));
  perform public.rpc_approve_shift_release(
    '10000000-0000-4000-8000-000000000001', r1, repeat('a', 2000));
  select staff_member_id into published_staff from public.published_rota_shifts
  where id = (select id from p32_ids
    where key = '42000000-0000-4000-8000-000000000011');
  if published_staff is distinct from '14000000-0000-4000-8000-000000000004'
     or (select assignment_status from public.shifts
         where id = '42000000-0000-4000-8000-000000000011') <> 'open' then
    raise exception 'FAIL: approval changed published evidence or did not reopen draft';
  end if;
  if exists (
    select 1 from public.notifications
    where related_entity_id in (r1, r3) and length(body) > 2000
  ) then raise exception 'FAIL: max decision note overflowed notification body'; end if;
  raise notice 'PASS: approve/decline preserve snapshot and bound notification copy';
end $$;

-- Reassigning the requester before republish keeps an unchanged approval live.
update public.shifts set staff_member_id = '14000000-0000-4000-8000-000000000004',
  assignment_status = 'scheduled'
where id = '42000000-0000-4000-8000-000000000011';
select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001');
set constraints all immediate;
set constraints all deferred;
do $$ begin
  if (select status from public.shift_release_requests
      where source_shift_id = '42000000-0000-4000-8000-000000000011') <> 'approved' then
    raise exception 'FAIL: unchanged still-assigned approval did not carry';
  end if;
  raise notice 'PASS: unchanged still-assigned release remains approved';
end $$;

-- A second approval becomes stale on material drift; the first completes only
-- because its unchanged source is no longer assigned to the requester.
do $$ declare r2 uuid; begin
  select id into r2 from public.shift_release_requests
  where source_shift_id = '42000000-0000-4000-8000-000000000012';
  perform public.rpc_approve_shift_release(
    '10000000-0000-4000-8000-000000000001', r2, null);
end $$;
update public.shifts set staff_member_id = null, assignment_status = 'open'
where id = '42000000-0000-4000-8000-000000000011';
update public.shifts set role_name = 'Bar Lead'
where id = '42000000-0000-4000-8000-000000000012';
delete from public.shifts
where id = '42000000-0000-4000-8000-000000000014';
select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001');
set constraints all immediate;
set constraints all deferred;

do $$ begin
  if (select status from public.shift_release_requests
      where source_shift_id = '42000000-0000-4000-8000-000000000011') <> 'completed'
     or (select status from public.shift_release_requests
      where source_shift_id = '42000000-0000-4000-8000-000000000012') <> 'stale'
     or (select status from public.shift_release_requests
      where source_shift_id = '42000000-0000-4000-8000-000000000014') <> 'stale' then
    raise exception 'FAIL: release publish finalisation states are wrong';
  end if;
  if not exists (select 1 from public.audit_events
    where action = 'shift_release.publish_finalised') then
    raise exception 'FAIL: publish finalisation lacks audit evidence';
  end if;
  raise notice 'PASS: unchanged removal completes; material drift/disappearance become stale atomically';
end $$;

rollback;
