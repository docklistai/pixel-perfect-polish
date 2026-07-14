-- Phase 33 one-off unavailability state, eligibility, warning override, RLS.
begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000',
        'ad000000-0000-4000-8000-000000000331',
        'authenticated', 'authenticated', 'p33.staff@example.test');
update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000331', status = 'active',
    joined_at = transaction_timestamp()
where id = '13000000-0000-4000-8000-000000000005';

do $$ begin
  if not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.staff_one_off_unavailability_requests'::regclass
      and constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.workspace_memberships'::regclass
      and constraint_row.confdeltype = 'r'
      and pg_get_constraintdef(constraint_row.oid)
          ilike '%decided_by_membership_id%'
  ) then
    raise exception 'FAIL: one-off decision actor is not delete-restricted';
  end if;
  raise notice 'PASS: one-off decision actor identity cannot be erased';
end $$;

create temp table p33_dates as
select ((now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::int) % 7)
  + 35)::date as week_start;
grant select on p33_dates to authenticated;

insert into public.rota_weeks (id, workspace_id, location_id, week_start)
select '43000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001', week_start
from p33_dates;
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '43000000-0000-4000-8000-000000000011'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '43000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid,
       '14000000-0000-4000-8000-000000000004'::uuid, week_start + 2,
       (week_start + 2 + time '09:00') at time zone 'Europe/London',
       (week_start + 2 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p33_dates
union all
select '43000000-0000-4000-8000-000000000012'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '43000000-0000-4000-8000-000000000001'::uuid,
       '11000000-0000-4000-8000-000000000001'::uuid,
       '12000000-0000-4000-8000-000000000003'::uuid, null::uuid, week_start + 2,
       (week_start + 2 + time '18:00') at time zone 'Europe/London',
       (week_start + 2 + time '23:00') at time zone 'Europe/London',
       0, 'Bartender', 'open'
from p33_dates;

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000001');
set constraints all immediate;
set constraints all deferred;

reset role;
create temp table p33_ids (key text primary key, id uuid);
grant select on p33_ids to authenticated;
insert into p33_ids
select 'open_shift', shift.id
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot on snapshot.id = shift.snapshot_id
where snapshot.rota_week_id = '43000000-0000-4000-8000-000000000001'
  and snapshot.version = 1
  and shift.source_shift_id = '43000000-0000-4000-8000-000000000012';

select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000331","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_request_id uuid;
  request_date date;
  notification_count integer;
  audit_count integer;
begin
  select week_start + 2 into request_date from p33_dates;
  v_request_id := (public.rpc_request_one_off_unavailability(
    '10000000-0000-4000-8000-000000000001', request_date, repeat('u', 500)
  ) ->> 'request_id')::uuid;
  select count(*) into notification_count from public.notifications
  where related_entity_type = 'one_off_unavailability'
    and related_entity_id = v_request_id;
  select count(*) into audit_count from public.audit_events
  where subject_type = 'one_off_unavailability'
    and subject_id = v_request_id;
  perform public.rpc_request_one_off_unavailability(
    '10000000-0000-4000-8000-000000000001', request_date, repeat('u', 500)
  );
  if (select count(*) from public.notifications
      where related_entity_type = 'one_off_unavailability'
        and related_entity_id = v_request_id) <> notification_count
     or (select count(*) from public.audit_events
      where subject_type = 'one_off_unavailability'
        and subject_id = v_request_id) <> audit_count then
    raise exception 'FAIL: exact pending retry duplicated one-off evidence';
  end if;
  perform public.rpc_request_open_shift(
    '10000000-0000-4000-8000-000000000001',
    (select id from p33_ids where key = 'open_shift'));
  begin
    perform public.rpc_request_one_off_unavailability(
      '21000000-0000-4000-8000-000000000001', request_date, 'cross tenant');
    raise exception 'FAIL: staff requested unavailability across workspaces';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.staff_one_off_unavailability_requests) <> 0 then
    raise exception 'FAIL: staff read manager base rows';
  end if;
  if (select status from public.staff_portal_one_off_unavailability
      where request_id = v_request_id) <> 'pending' then
    raise exception 'FAIL: portal did not expose pending request';
  end if;
  begin
    insert into public.staff_one_off_unavailability_requests (
      workspace_id, staff_member_id, date, note
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '14000000-0000-4000-8000-000000000004', request_date + 1,
      'bypass RPC'
    );
    raise exception 'FAIL: staff inserted one-off state directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.staff_one_off_unavailability_requests
    set status = 'approved'
    where id = v_request_id;
    raise exception 'FAIL: staff updated one-off state directly';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: staff request is self-only/idempotent and pending does not block applying';
end $$;

reset role;
select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare unavailable_id uuid; open_request_id uuid; begin
  select id into unavailable_id from public.staff_one_off_unavailability_requests;
  begin
    perform public.rpc_decide_one_off_unavailability(
      '21000000-0000-4000-8000-000000000001', unavailable_id,
      'approved', null);
    raise exception 'FAIL: manager decided one-off state across tenants';
  exception when insufficient_privilege then null;
  end;
  perform public.rpc_decide_one_off_unavailability(
    '10000000-0000-4000-8000-000000000001', unavailable_id, 'approved', 'Approved');
  select id into open_request_id from public.open_shift_requests
  where source_shift_id = '43000000-0000-4000-8000-000000000012';
  begin
    perform public.rpc_select_open_shift_applicant(
      '10000000-0000-4000-8000-000000000001', open_request_id);
    raise exception 'FAIL: approved unavailable applicant was selected';
  exception when object_not_in_prerequisite_state then null;
  end;
  raise notice 'PASS: approved one-off unavailability excludes open-shift selection';
end $$;

reset role;
select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000331","role":"authenticated"}', true);
set local role authenticated;
do $$ declare request_date date; begin
  select week_start + 2 into request_date from p33_dates;
  begin
    perform public.rpc_request_one_off_unavailability(
      '10000000-0000-4000-8000-000000000001', request_date, 'rewrite');
    raise exception 'FAIL: staff rewrote approved unavailability';
  exception when object_not_in_prerequisite_state then null;
  end;
  begin
    perform public.rpc_withdraw_one_off_unavailability(
      '10000000-0000-4000-8000-000000000001', request_date);
    raise exception 'FAIL: staff withdrew approved unavailability';
  exception when object_not_in_prerequisite_state then null;
  end;
  raise notice 'PASS: approved removal remains manager-mediated';
end $$;

-- Add an approved recurring constraint on the same assigned shift. Default
-- publication must abort before a snapshot; explicit acknowledgement records
-- both exact clashes in the atomic rota.published audit.
reset role;
insert into public.staff_recurring_day_off_requests (
  workspace_id, staff_member_id, weekday, status,
  decided_by_membership_id, decided_at
)
select '10000000-0000-4000-8000-000000000001',
       '14000000-0000-4000-8000-000000000004',
       extract(isodow from week_start + 2)::smallint - 1, 'approved',
       '13000000-0000-4000-8000-000000000011', transaction_timestamp()
from p33_dates;

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare versions int; result jsonb; audit_details jsonb; begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '43000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: constraint clashes published without acknowledgement';
  exception when object_not_in_prerequisite_state then null;
  end;
  select count(*) into versions from public.published_rota_snapshots
  where rota_week_id = '43000000-0000-4000-8000-000000000001';
  if versions <> 1 then raise exception 'FAIL: rejected publish created snapshot'; end if;
  result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001', true);
  if (result ->> 'one_off_unavailability_clashes')::int <> 1
     or (result ->> 'recurring_day_off_clashes')::int <> 1 then
    raise exception 'FAIL: override result omitted clash counts %', result;
  end if;
  select details into audit_details from public.audit_events
  where action = 'rota.published' and subject_id = (result ->> 'snapshot_id')::uuid;
  if audit_details ->> 'constraint_override_acknowledged' <> 'true'
     or jsonb_array_length(audit_details -> 'scheduling_constraint_clashes') <> 2 then
    raise exception 'FAIL: exact override evidence missing %', audit_details;
  end if;
  raise notice 'PASS: warning override is explicit, atomic, and exactly audited';
end $$;
set constraints all immediate;
set constraints all deferred;

-- Manager reopen permits a later decline; staff can then re-request and retain
-- a withdrawn row instead of deleting its history.
do $$ declare unavailable_id uuid; begin
  select id into unavailable_id from public.staff_one_off_unavailability_requests;
  perform public.rpc_decide_one_off_unavailability(
    '10000000-0000-4000-8000-000000000001', unavailable_id, 'pending', null);
  perform public.rpc_decide_one_off_unavailability(
    '10000000-0000-4000-8000-000000000001', unavailable_id, 'declined', null);
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000331","role":"authenticated"}', true);
set local role authenticated;
do $$ declare request_date date; begin
  select week_start + 2 into request_date from p33_dates;
  perform public.rpc_request_one_off_unavailability(
    '10000000-0000-4000-8000-000000000001', request_date, 'Retry');
  perform public.rpc_withdraw_one_off_unavailability(
    '10000000-0000-4000-8000-000000000001', request_date);
  if (select status from public.staff_portal_one_off_unavailability) <> 'withdrawn' then
    raise exception 'FAIL: withdrawn state was not retained';
  end if;
  raise notice 'PASS: reopen/decline/re-request/withdraw transitions retain history';
end $$;

rollback;
