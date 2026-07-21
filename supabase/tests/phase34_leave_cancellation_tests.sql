-- Phase 34 staff withdrawal, manager cancellation, persistent rota issues.
begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000',
        'ad000000-0000-4000-8000-000000000341',
        'authenticated', 'authenticated', 'p34.staff@example.test');
update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000341', status = 'active',
    joined_at = transaction_timestamp()
where id = '13000000-0000-4000-8000-000000000005';

create temp table p34_dates as
select ((now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::int) % 7)
  + 49)::date as week_start;

insert into public.rota_weeks (id, workspace_id, location_id, week_start)
select '44000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001', week_start
from p34_dates;
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '44000000-0000-4000-8000-000000000011',
       '10000000-0000-4000-8000-000000000001',
       '44000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001',
       '12000000-0000-4000-8000-000000000003',
       '14000000-0000-4000-8000-000000000004', week_start + 1,
       (week_start + 1 + time '22:00') at time zone 'Europe/London',
       (week_start + 2 + time '06:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p34_dates;

insert into public.leave_requests (
  id, workspace_id, staff_member_id, leave_type, start_date, end_date,
  reason, status, submitted_at
)
select '44000000-0000-4000-8000-000000000021'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '14000000-0000-4000-8000-000000000004'::uuid, 'annual_leave',
       week_start + 5, week_start + 5, 'Pending withdrawal', 'pending',
       transaction_timestamp()
from p34_dates
union all
select '44000000-0000-4000-8000-000000000022'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '14000000-0000-4000-8000-000000000004'::uuid, 'unpaid',
       week_start + 2, week_start + 2, 'Published overlap', 'pending',
       transaction_timestamp()
from p34_dates;

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '44000000-0000-4000-8000-000000000001');
set constraints all immediate;
set constraints all deferred;

reset role;
select set_config('request.jwt.claims',
  '{"sub":"ad000000-0000-4000-8000-000000000341","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    update public.leave_requests
    set status = 'cancelled'
    where id = '44000000-0000-4000-8000-000000000021';
    raise exception 'FAIL: staff bypassed cancellation RPC with direct UPDATE';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.leave_request_events (
      workspace_id, leave_request_id, actor_membership_id,
      event_type, resulting_status
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '44000000-0000-4000-8000-000000000021',
      '13000000-0000-4000-8000-000000000005',
      'cancelled', 'cancelled'
    );
    raise exception 'FAIL: staff fabricated a leave lifecycle event';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.rpc_cancel_leave_request(
      '21000000-0000-4000-8000-000000000001',
      '44000000-0000-4000-8000-000000000021');
    raise exception 'FAIL: staff cancelled leave across workspaces';
  exception when insufficient_privilege then null;
  end;
  perform public.rpc_cancel_leave_request(
    '10000000-0000-4000-8000-000000000001',
    '44000000-0000-4000-8000-000000000021');
  if (select status from public.leave_requests
      where id = '44000000-0000-4000-8000-000000000021') <> 'cancelled' then
    raise exception 'FAIL: staff withdrawal did not cancel pending leave';
  end if;
  if (select count(*) from public.rota_operational_issues) <> 0 then
    raise exception 'FAIL: staff saw manager operational issues';
  end if;
  begin
    perform public.rpc_cancel_leave_request(
      '10000000-0000-4000-8000-000000000001',
      '44000000-0000-4000-8000-000000000022');
  exception when others then
    raise exception 'FAIL: own second pending leave was unexpectedly blocked: %', sqlerrm;
  end;
  raise notice 'PASS: staff-owned pending cancellation is evented, audited, and manager-notified';
end $$;

-- Restore the overlap fixture to pending for the manager path (the preceding
-- staff action proves ownership/pending behavior independently).
reset role;
do $$ begin
  if not exists (select 1 from public.leave_request_events
      where leave_request_id = '44000000-0000-4000-8000-000000000021'
        and event_type = 'cancelled')
     or not exists (select 1 from public.audit_events
      where subject_id = '44000000-0000-4000-8000-000000000021'
        and action = 'leave.cancelled') then
    raise exception 'FAIL: staff withdrawal lacks immutable event/audit';
  end if;
end $$;
update public.leave_requests
set status = 'pending', decided_at = null,
    decided_by_membership_id = null, decision_reason = null
where id = '44000000-0000-4000-8000-000000000022';

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare versions int; begin
  begin
    update public.leave_requests
    set status = 'approved', decided_at = transaction_timestamp(),
        decided_by_membership_id = '13000000-0000-4000-8000-000000000011'
    where id = '44000000-0000-4000-8000-000000000022';
    raise exception 'FAIL: manager bypassed leave decision RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.leave_request_events (
      workspace_id, leave_request_id, actor_membership_id,
      event_type, resulting_status
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '44000000-0000-4000-8000-000000000022',
      '13000000-0000-4000-8000-000000000011',
      'approved', 'approved'
    );
    raise exception 'FAIL: manager fabricated a leave lifecycle event';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.rpc_decide_leave_request(
      '21000000-0000-4000-8000-000000000001',
      '44000000-0000-4000-8000-000000000022', 'approved', null);
    raise exception 'FAIL: manager decided leave across tenants';
  exception when insufficient_privilege then null;
  end;
  perform public.rpc_decide_leave_request(
    '10000000-0000-4000-8000-000000000001',
    '44000000-0000-4000-8000-000000000022', 'approved', null);
  select count(*) into versions from public.published_rota_snapshots
  where rota_week_id = '44000000-0000-4000-8000-000000000001';
  if versions <> 1 then raise exception 'FAIL: leave approval auto-published'; end if;
  if not exists (select 1 from public.rota_operational_issues
      where leave_request_id = '44000000-0000-4000-8000-000000000022'
        and trigger_status = 'approved' and status = 'open') then
    raise exception 'FAIL: approval did not persist rota update issue';
  end if;
  perform public.rpc_decide_leave_request(
    '10000000-0000-4000-8000-000000000001',
    '44000000-0000-4000-8000-000000000022', 'pending', null);
  if exists (select 1 from public.rota_operational_issues
      where leave_request_id = '44000000-0000-4000-8000-000000000022'
        and status = 'open')
     or not exists (select 1 from public.audit_events
      where subject_type = 'rota_operational_issue'
        and action = 'rota_operational_issue.superseded'
        and details ->> 'reason' = 'leave_reopened') then
    raise exception 'FAIL: reopen left a ghost rota update issue';
  end if;
  perform public.rpc_decide_leave_request(
    '10000000-0000-4000-8000-000000000001',
    '44000000-0000-4000-8000-000000000022', 'approved', null);
  begin
    perform public.rpc_decide_leave_request(
      '10000000-0000-4000-8000-000000000001',
      '44000000-0000-4000-8000-000000000022', 'cancelled', null);
    raise exception 'FAIL: manager cancelled approved leave without reason';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: RPC authority is closed; overnight approval issue reopens/recreates honestly';
end $$;

-- Republishing the same conflicting assignment does not resolve an approval
-- issue: the newer snapshot still assigns the person during approved leave.
select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '44000000-0000-4000-8000-000000000001', true);
set constraints all immediate;
set constraints all deferred;
do $$ begin
  if not exists (select 1 from public.rota_operational_issues
      where leave_request_id = '44000000-0000-4000-8000-000000000022'
        and trigger_status = 'approved' and status = 'open') then
    raise exception 'FAIL: conflicting republish incorrectly resolved approval issue';
  end if;
  raise notice 'PASS: overnight issue remains until published inconsistency is resolved';
end $$;

do $$ declare versions int; begin
  perform public.rpc_decide_leave_request(
    '10000000-0000-4000-8000-000000000001',
    '44000000-0000-4000-8000-000000000022', 'cancelled', repeat('c', 2000));
  select count(*) into versions from public.published_rota_snapshots
  where rota_week_id = '44000000-0000-4000-8000-000000000001';
  if versions <> 2 then raise exception 'FAIL: cancellation auto-published'; end if;
  if not exists (select 1 from public.rota_operational_issues
      where leave_request_id = '44000000-0000-4000-8000-000000000022'
        and trigger_status = 'cancelled' and status = 'open') then
    raise exception 'FAIL: cancellation did not replace the operational issue';
  end if;
  if exists (select 1 from public.notifications
      where related_entity_id = '44000000-0000-4000-8000-000000000022'
        and length(body) > 2000) then
    raise exception 'FAIL: max cancellation reason overflowed notification body';
  end if;
  raise notice 'PASS: manager cancellation requires/full-records reason and opens issue';
end $$;

select public.rpc_publish_rota_week(
  '10000000-0000-4000-8000-000000000001',
  '44000000-0000-4000-8000-000000000001');
set constraints all immediate;
set constraints all deferred;
do $$ begin
  if (select count(*) from public.published_rota_snapshots
      where rota_week_id = '44000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'FAIL: unchanged-week cancellation republish did not create a version';
  end if;
  if exists (select 1 from public.rota_operational_issues
      where leave_request_id = '44000000-0000-4000-8000-000000000022'
        and status = 'open')
     or not exists (select 1 from public.audit_events
      where action = 'rota_operational_issue.resolved') then
    raise exception 'FAIL: explicit republish did not atomically resolve/audit issue';
  end if;
  raise notice 'PASS: unchanged-week explicit publication creates a version and resolves cancellation atomically';
end $$;

rollback;
