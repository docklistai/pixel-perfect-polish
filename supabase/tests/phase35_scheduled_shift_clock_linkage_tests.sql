-- Phase 35 deterministic location-timezone/overnight clock linkage matrix.
begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000',
        'ad000000-0000-4000-8000-000000000351',
        'authenticated', 'authenticated', 'p35.staff@example.test');
update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000351', status = 'active',
    joined_at = transaction_timestamp()
where id = '13000000-0000-4000-8000-000000000005';

insert into public.locations (id, workspace_id, name, timezone)
values
  ('45000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'P35 London', 'Europe/London'),
  ('45000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001', 'P35 New York', 'America/New_York'),
  ('45000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001', 'P35 Current', 'Europe/London');

create temp table p35_now as
select (clock_timestamp() at time zone 'Europe/London')::date as local_today,
       ((clock_timestamp() at time zone 'Europe/London')::date
        - (extract(isodow from (clock_timestamp() at time zone 'Europe/London')::date)::int - 1))::date
         as week_start,
       clock_timestamp() as event_time;

insert into public.rota_weeks (id, workspace_id, location_id, week_start)
values
  ('45000000-0000-4000-8000-000000000011',
   '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000001', '2099-08-10'),
  ('45000000-0000-4000-8000-000000000012',
   '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000002', '2099-08-10');
insert into public.rota_weeks (id, workspace_id, location_id, week_start)
select '45000000-0000-4000-8000-000000000013',
       '10000000-0000-4000-8000-000000000001',
       '45000000-0000-4000-8000-000000000003', week_start
from p35_now;

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values
  ('45000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-11', '2099-08-11 09:00 Europe/London', '2099-08-11 17:00 Europe/London', 30, 'Bartender', 'scheduled'),
  ('45000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-12', '2099-08-12 09:00 Europe/London', '2099-08-12 17:00 Europe/London', 30, 'Bartender', 'scheduled'),
  ('45000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-13', '2099-08-13 09:00 Europe/London', '2099-08-13 17:00 Europe/London', 30, 'Bartender', 'scheduled'),
  ('45000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-14', '2099-08-14 22:00 Europe/London', '2099-08-15 06:00 Europe/London', 30, 'Bartender', 'scheduled'),
  ('45000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-16', '2099-08-16 08:00 Europe/London', '2099-08-16 12:00 Europe/London', 0, 'Bartender', 'scheduled'),
  ('45000000-0000-4000-8000-000000000106', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-16', '2099-08-16 15:00 Europe/London', '2099-08-16 20:00 Europe/London', 0, 'Bartender', 'scheduled'),
  ('45000000-0000-4000-8000-000000000107', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-10', '2099-08-10 09:00 Europe/London', '2099-08-10 17:00 Europe/London', 30, 'Bartender', 'scheduled'),
  ('45000000-0000-4000-8000-000000000108', '10000000-0000-4000-8000-000000000001',
   '45000000-0000-4000-8000-000000000012', '45000000-0000-4000-8000-000000000002',
   '12000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000004',
   '2099-08-10', '2099-08-10 09:00 America/New_York', '2099-08-10 17:00 America/New_York', 30, 'Bartender', 'scheduled');

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '45000000-0000-4000-8000-000000000109',
       '10000000-0000-4000-8000-000000000001',
       '45000000-0000-4000-8000-000000000013',
       '45000000-0000-4000-8000-000000000003',
       '12000000-0000-4000-8000-000000000003',
       '14000000-0000-4000-8000-000000000004', local_today,
       event_time - interval '5 minutes', event_time + interval '4 hours',
       0, 'Bartender', 'scheduled'
from p35_now;

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.rpc_publish_rota_week('10000000-0000-4000-8000-000000000001', week_id)
from (values
  ('45000000-0000-4000-8000-000000000011'::uuid),
  ('45000000-0000-4000-8000-000000000012'::uuid),
  ('45000000-0000-4000-8000-000000000013'::uuid)
) as weeks(week_id);
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);
do $$
declare matched uuid;
begin
  select shift_id into matched from public.rpc_internal_match_published_shift_for_clock(
    '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
    '2099-08-11 09:00 Europe/London');
  if matched <> '45000000-0000-4000-8000-000000000101' then raise exception 'FAIL: normal match %', matched; end if;
  select shift_id into matched from public.rpc_internal_match_published_shift_for_clock(
    '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
    '2099-08-12 06:00 Europe/London');
  if matched <> '45000000-0000-4000-8000-000000000102' then raise exception 'FAIL: early match %', matched; end if;
  select shift_id into matched from public.rpc_internal_match_published_shift_for_clock(
    '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
    '2099-08-13 12:00 Europe/London');
  if matched <> '45000000-0000-4000-8000-000000000103' then raise exception 'FAIL: late match %', matched; end if;
  select shift_id into matched from public.rpc_internal_match_published_shift_for_clock(
    '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
    '2099-08-15 01:00 Europe/London');
  if matched <> '45000000-0000-4000-8000-000000000104' then raise exception 'FAIL: overnight match %', matched; end if;
  select shift_id into matched from public.rpc_internal_match_published_shift_for_clock(
    '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
    '2099-08-10 09:00 America/New_York');
  if matched <> '45000000-0000-4000-8000-000000000108' then raise exception 'FAIL: cross-location match %', matched; end if;
  if exists (select 1 from public.rpc_internal_match_published_shift_for_clock(
      '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
      '2099-08-16 11:00 Europe/London')) then
    raise exception 'FAIL: ambiguous split-shift clock linked';
  end if;
  if exists (select 1 from public.rpc_internal_match_published_shift_for_clock(
      '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000008',
      '2099-08-11 09:00 Europe/London')) then
    raise exception 'FAIL: staff without published shift linked';
  end if;
  raise notice 'PASS: normal/early/late/overnight/cross-location match; ambiguous/no shift stay unscheduled';
end $$;

-- A previously linked source is intentionally not linked twice.
insert into public.time_entries (
  workspace_id, staff_member_id, shift_id, work_date,
  scheduled_start_at, scheduled_end_at, clocked_in_at, clocked_out_at
)
values (
  '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
  '45000000-0000-4000-8000-000000000101', '2099-08-11',
  '2099-08-11 09:00 Europe/London', '2099-08-11 17:00 Europe/London',
  '2099-08-11 09:00 Europe/London', '2099-08-11 17:00 Europe/London');
do $$ begin
  if exists (select 1 from public.rpc_internal_match_published_shift_for_clock(
      '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004',
      '2099-08-11 09:00 Europe/London')) then
    raise exception 'FAIL: already-linked shift matched twice';
  end if;
  raise notice 'PASS: already-linked source is excluded';
end $$;

select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000351","role":"authenticated"}', true);
set local role authenticated;
do $$ declare result jsonb; second_result jsonb; entry record; begin
  begin
    perform public.rpc_staff_clock_event(
      '21000000-0000-4000-8000-000000000001', 'clock_in', null);
    raise exception 'FAIL: staff clocked across workspaces';
  exception when insufficient_privilege then null;
  end;
  result := public.rpc_staff_clock_event(
    '10000000-0000-4000-8000-000000000001', 'clock_in', null);
  select shift_id, scheduled_start_at, scheduled_end_at into entry
  from public.time_entries where id = (result ->> 'time_entry_id')::uuid;
  if entry.shift_id <> '45000000-0000-4000-8000-000000000109'
     or entry.scheduled_start_at is null or entry.scheduled_end_at is null then
    raise exception 'FAIL: live clock-in did not persist published schedule %', entry;
  end if;
  begin
    perform public.rpc_staff_clock_event(
      '10000000-0000-4000-8000-000000000001', 'clock_in', null);
    raise exception 'FAIL: duplicate clock-in opened another entry';
  exception when object_not_in_prerequisite_state then null;
  end;
  perform public.rpc_staff_clock_event(
    '10000000-0000-4000-8000-000000000001',
    'clock_out',
    (result ->> 'time_entry_id')::uuid
  );
  second_result := public.rpc_staff_clock_event(
    '10000000-0000-4000-8000-000000000001', 'clock_in', null);
  select shift_id, scheduled_start_at, scheduled_end_at into entry
  from public.time_entries where id = (second_result ->> 'time_entry_id')::uuid;
  if entry.shift_id is not null
     or entry.scheduled_start_at is not null
     or entry.scheduled_end_at is not null then
    raise exception 'FAIL: already-linked published source was falsely reused %', entry;
  end if;
  raise notice 'PASS: live clock stores schedule, rejects duplicate open clock, and later stays honestly unscheduled';
end $$;

rollback;
