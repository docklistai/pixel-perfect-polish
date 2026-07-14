-- Phase 27b focused adversarial checks for manager selection. Runs in one
-- rolled-back transaction against the local stack.

begin;

-- Liam is an active Bartender in the seed. Bind his invitation to a test user.
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000274', 'authenticated', 'authenticated', 'p27b.liam@harbourview.co.uk');

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000274',
    status = 'active',
    joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000005';

insert into public.locations (id, workspace_id, name, timezone)
values ('39000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'P27B Annex', 'Europe/London');

create temp table p27b_dates as
select (
  (now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::integer) % 7)
  + 7
)::date as week_start;

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '39000000-0000-4000-8000-000000000011'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid, week_start, 'draft'
from p27b_dates
union all
select '39000000-0000-4000-8000-000000000012'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '39000000-0000-4000-8000-000000000001'::uuid, week_start, 'draft'
from p27b_dates;

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, shift_date,
  starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '39000000-0000-4000-8000-000000000021'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '39000000-0000-4000-8000-000000000011'::uuid, '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid, week_start + 1,
       (week_start + 1 + time '10:00') at time zone 'Europe/London',
       (week_start + 1 + time '18:00') at time zone 'Europe/London',
       30, 'Bartender', 'open'
from p27b_dates
union all
select '39000000-0000-4000-8000-000000000022'::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
       '39000000-0000-4000-8000-000000000012'::uuid, '39000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid, week_start + 1,
       (week_start + 1 + time '10:00') at time zone 'Europe/London',
       (week_start + 1 + time '18:00') at time zone 'Europe/London',
       30, 'Bartender', 'open'
from p27b_dates;

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001', '39000000-0000-4000-8000-000000000011');
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001', '39000000-0000-4000-8000-000000000012');
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

create temp table p27b_ids (key text primary key, id uuid);
grant select on p27b_ids to authenticated;
insert into p27b_ids (key, id)
select case shift.source_shift_id
         when '39000000-0000-4000-8000-000000000021' then 'published_one'
         else 'published_two'
       end,
       shift.id
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot
  on snapshot.workspace_id = shift.workspace_id and snapshot.id = shift.snapshot_id
where snapshot.rota_week_id in (
  '39000000-0000-4000-8000-000000000011',
  '39000000-0000-4000-8000-000000000012'
);

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000274","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  perform public.rpc_request_open_shift(
    '10000000-0000-4000-8000-000000000001',
    (select id from p27b_ids where key = 'published_one'));
  perform public.rpc_request_open_shift(
    '10000000-0000-4000-8000-000000000001',
    (select id from p27b_ids where key = 'published_two'));
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

insert into p27b_ids (key, id)
select case source_shift_id
         when '39000000-0000-4000-8000-000000000021' then 'request_one'
         else 'request_two'
       end,
       id
from public.open_shift_requests
where source_shift_id in (
  '39000000-0000-4000-8000-000000000021',
  '39000000-0000-4000-8000-000000000022'
);

-- A pending request describes immutable published facts. Changing the draft
-- behind it must force a republish instead of silently selecting old consent.
update public.shifts set break_minutes = 15
where id = '39000000-0000-4000-8000-000000000021';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    perform public.rpc_select_open_shift_applicant(
      '10000000-0000-4000-8000-000000000001',
      (select id from p27b_ids where key = 'request_one'));
    raise exception 'FAIL: manager selected against materially changed draft facts';
  exception when sqlstate '55000' then
    raise notice 'PASS: materially changed draft requires republish before selection';
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
update public.shifts set break_minutes = 30
where id = '39000000-0000-4000-8000-000000000021';

-- The active-membership guard moved here to keep the primary Phase 27 suite
-- below its hard line limit.
update public.workspace_memberships set status = 'suspended'
where id = '13000000-0000-4000-8000-000000000005';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.rpc_select_open_shift_applicant(
      '10000000-0000-4000-8000-000000000001',
      (select id from p27b_ids where key = 'request_one'));
    raise exception 'FAIL: selected an applicant whose membership was suspended';
  exception when sqlstate '55000' then
    raise notice 'PASS: selection revalidates active workspace membership';
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
update public.workspace_memberships set status = 'active'
where id = '13000000-0000-4000-8000-000000000005';

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  perform public.rpc_select_open_shift_applicant(
    '10000000-0000-4000-8000-000000000001',
    (select id from p27b_ids where key = 'request_two'));

  perform 1
  from pg_locks
  where pid = pg_backend_pid()
    and locktype = 'relation'
    and relation = 'public.staff_members'::regclass
    and mode = 'RowShareLock'
    and granted;
  if not found then
    raise exception 'FAIL: selection did not retain a staff-row update lock';
  end if;
  raise notice 'PASS: applicant row is locked through schedule revalidation';

  begin
    perform public.rpc_select_open_shift_applicant(
      '10000000-0000-4000-8000-000000000001',
      (select id from p27b_ids where key = 'request_one'));
    raise exception 'FAIL: cross-location overlapping selection was accepted';
  exception when sqlstate '55000' then
    raise notice 'PASS: cross-location overlap is rejected after applicant serialization';
  end;
end $$;

rollback;
