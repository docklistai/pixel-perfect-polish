-- Phase 29 publication-preflight regression checks. All fixtures roll back.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values (
  '00000000-0000-0000-0000-000000000000',
  'ad000000-0000-4000-8000-000000000291',
  'authenticated', 'authenticated', 'p29.liam@harbourview.co.uk'
);

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000291',
    status = 'active',
    joined_at = transaction_timestamp()
where id = '13000000-0000-4000-8000-000000000005';

create temp table p29_dates as
select (
  (now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::integer) % 7)
  + 7
)::date as week_start;

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '3a000000-0000-4000-8000-000000000001'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid,
       week_start, 'draft'
from p29_dates;

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, shift_date,
  starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '3a000000-0000-4000-8000-000000000011'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '3a000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid,
       week_start + 1,
       (week_start + 1 + time '09:00') at time zone 'Europe/London',
       (week_start + 1 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'open'
from p29_dates
union all
select '3a000000-0000-4000-8000-000000000012'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '3a000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid,
       week_start + 2,
       (week_start + 2 + time '09:00') at time zone 'Europe/London',
       (week_start + 2 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'open'
from p29_dates;

select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '3a000000-0000-4000-8000-000000000001'
  );
end $$;
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims', '', true);

create temp table p29_ids (key text primary key, id uuid);
grant select on p29_ids to authenticated;
insert into p29_ids (key, id)
select
  case shift.source_shift_id
    when '3a000000-0000-4000-8000-000000000011' then 'published_selected'
    else 'published_pending'
  end,
  shift.id
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot
  on snapshot.workspace_id = shift.workspace_id
 and snapshot.id = shift.snapshot_id
where snapshot.rota_week_id = '3a000000-0000-4000-8000-000000000001'
  and snapshot.version = 1;

select set_config(
  'request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000291","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  perform public.rpc_request_open_shift(
    '10000000-0000-4000-8000-000000000001',
    (select id from p29_ids where key = 'published_selected')
  );
  perform public.rpc_request_open_shift(
    '10000000-0000-4000-8000-000000000001',
    (select id from p29_ids where key = 'published_pending')
  );
end $$;

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  selected_request_id uuid;
begin
  select request.id
  into selected_request_id
  from public.open_shift_requests as request
  where request.source_shift_id = '3a000000-0000-4000-8000-000000000011'
    and request.staff_member_id = '14000000-0000-4000-8000-000000000004';
  perform public.rpc_select_open_shift_applicant(
    '10000000-0000-4000-8000-000000000001', selected_request_id
  );
end $$;

-- A direct draft assignment must not turn a pending request into confirmed.
update public.shifts
set staff_member_id = '14000000-0000-4000-8000-000000000004',
    assignment_status = 'scheduled'
where id = '3a000000-0000-4000-8000-000000000012';

do $$
begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '3a000000-0000-4000-8000-000000000001'
  );
  raise exception 'FAIL: a pending requester was published via manual assignment';
exception
  when object_not_in_prerequisite_state then
    raise notice 'PASS: pending manual assignment cannot bypass applicant selection';
end $$;

update public.shifts
set staff_member_id = null, assignment_status = 'open'
where id = '3a000000-0000-4000-8000-000000000012';

-- Material drift after selection blocks before any snapshot is created.
update public.shifts set break_minutes = 15
where id = '3a000000-0000-4000-8000-000000000011';

do $$
declare
  versions integer;
  selected_status text;
begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '3a000000-0000-4000-8000-000000000001'
    );
    raise exception 'FAIL: a materially changed selected shift was published';
  exception when object_not_in_prerequisite_state then
    null;
  end;
  select count(*) into versions
  from public.published_rota_snapshots
  where rota_week_id = '3a000000-0000-4000-8000-000000000001';
  select status into selected_status
  from public.open_shift_requests
  where source_shift_id = '3a000000-0000-4000-8000-000000000011';
  if versions <> 1 or selected_status <> 'selected' then
    raise exception 'FAIL: blocked publish left % versions and request status %',
      versions, selected_status;
  end if;
  raise notice 'PASS: selected material drift rolls back before snapshot creation';
end $$;

update public.shifts set break_minutes = 30
where id = '3a000000-0000-4000-8000-000000000011';

-- Employment changes after selection are revalidated at publication.
-- Phase 45 revoked direct UPDATE on staff_members from authenticated, so this
-- fixture flip drops to the owning role; the assertion below is unchanged and
-- still runs as the manager.
reset role;
update public.staff_members set employment_status = 'inactive'
where id = '14000000-0000-4000-8000-000000000004';
set local role authenticated;
do $$
begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '3a000000-0000-4000-8000-000000000001'
  );
  raise exception 'FAIL: an inactive selected applicant was published';
exception
  when object_not_in_prerequisite_state then
    raise notice 'PASS: publication revalidates active employment';
end $$;
reset role;
update public.staff_members set employment_status = 'active'
where id = '14000000-0000-4000-8000-000000000004';
set local role authenticated;

-- Once safe again, republish confirms only the selected request.
do $$
declare
  result jsonb;
  selected_status text;
  pending_status text;
begin
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '3a000000-0000-4000-8000-000000000001'
  );
  if (result ->> 'version')::integer <> 2 then
    raise exception 'FAIL: safe republish produced version %', result ->> 'version';
  end if;
  select status into selected_status from public.open_shift_requests
  where source_shift_id = '3a000000-0000-4000-8000-000000000011';
  select status into pending_status from public.open_shift_requests
  where source_shift_id = '3a000000-0000-4000-8000-000000000012';
  if selected_status <> 'confirmed' or pending_status <> 'pending' then
    raise exception 'FAIL: final statuses selected=% pending=%', selected_status, pending_status;
  end if;
  raise notice 'PASS: safe selected request confirms; untouched pending request carries forward';
end $$;
set constraints all immediate;
set constraints all deferred;

-- Defense in depth: no direct pending-to-confirmed transition exists.
reset role;
select set_config('request.jwt.claims', '', true);
do $$
begin
  update public.open_shift_requests
  set status = 'confirmed'
  where source_shift_id = '3a000000-0000-4000-8000-000000000012';
  raise exception 'FAIL: a pending request transitioned directly to confirmed';
exception
  when object_not_in_prerequisite_state then
    raise notice 'PASS: only a selected request can transition to confirmed';
end $$;

rollback;
