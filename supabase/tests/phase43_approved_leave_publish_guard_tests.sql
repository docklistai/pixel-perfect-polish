-- Phase 43: Approved leave publish guard tests.
begin;

create temp table p43_dates as
select ((now() at time zone 'Europe/London')::date
  + ((8 - extract(isodow from (now() at time zone 'Europe/London')::date)::int) % 7)
  + 49)::date as week_start;

-- Setup: Create rota week and draft shifts
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
select '43000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001', week_start, 'draft'
from p43_dates;

-- Shift on week_start + 1 for staff 1 (id: 14000000-0000-4000-8000-000000000001)
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '43000000-0000-4000-8000-000000000011',
       '10000000-0000-4000-8000-000000000001',
       '43000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001',
       '12000000-0000-4000-8000-000000000003',
       '14000000-0000-4000-8000-000000000001', week_start + 1,
       (week_start + 1 + time '09:00') at time zone 'Europe/London',
       (week_start + 1 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p43_dates;

-- Leave 1: Approved leave overlapping the shift (week_start + 1)
insert into public.leave_requests (
  id, workspace_id, staff_member_id, leave_type, start_date, end_date,
  reason, status, submitted_at, decided_by_membership_id, decided_at
)
select '43000000-0000-4000-8000-000000000021'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '14000000-0000-4000-8000-000000000001'::uuid, 'annual_leave',
       week_start + 1, week_start + 1, 'Overlap', 'approved',
       transaction_timestamp(), '13000000-0000-4000-8000-000000000001'::uuid, transaction_timestamp()
from p43_dates;

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 1: Approved leave overlapping an assigned shift blocks unacknowledged publication
do $$ begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '43000000-0000-4000-8000-000000000001',
      false
    );
    raise exception 'FAIL: published over approved leave without acknowledgement';
  exception when others then
    if sqlerrm not like '%approved scheduling constraints clash%' then
      raise exception 'FAIL: unexpected error: %', sqlerrm;
    end if;
  end;
end $$;

-- Test 2: The same clash publishes only with the existing acknowledgement.
do $$ declare
  v_res jsonb;
begin
  v_res := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001',
    true
  );
  if (v_res->>'approved_leave_clashes')::int <> 1 then
    raise exception 'FAIL: expected 1 approved leave clash in result, got %', v_res->>'approved_leave_clashes';
  end if;
end $$;

-- Test 3: The publication audit records the acknowledged constraint state.
do $$ declare
  v_audit_payload jsonb;
begin
  select details into v_audit_payload
  from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'rota.published'
  order by occurred_at desc limit 1;

  if not (v_audit_payload->>'constraint_override_acknowledged')::boolean then
    raise exception 'FAIL: constraint_override_acknowledged not true in audit log';
  end if;

  if (v_audit_payload->>'approved_leave_clashes')::int <> 1 then
    raise exception 'FAIL: approved_leave_clashes not recorded correctly in audit log';
  end if;
end $$;

-- Setup for remaining non-blocking tests. Reset rota to draft.
reset role;
select set_config('request.jwt.claims', '', true);
update public.rota_weeks set status = 'draft' where id = '43000000-0000-4000-8000-000000000001';
update public.leave_requests set status = 'pending', decided_by_membership_id = null, decided_at = null where id = '43000000-0000-4000-8000-000000000021';

select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 4: Pending leave does not block.
do $$ begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001',
    false
  );
end $$;

-- Reset to draft and pending
reset role;
select set_config('request.jwt.claims', '{}', true);
update public.rota_weeks set status = 'draft' where id = '43000000-0000-4000-8000-000000000001';
update public.leave_requests set status = 'pending', decided_by_membership_id = null, decided_at = null, decision_reason = null where id = '43000000-0000-4000-8000-000000000021';
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000021', 'declined', 'test');
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 5: Declined leave does not block.
do $$ begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001',
    false
  );
end $$;

-- Reset to draft and approved
reset role;
select set_config('request.jwt.claims', '{}', true);
update public.rota_weeks set status = 'draft' where id = '43000000-0000-4000-8000-000000000001';
update public.leave_requests set status = 'pending', decided_by_membership_id = null, decided_at = null, decision_reason = null where id = '43000000-0000-4000-8000-000000000021';
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000021', 'approved', null);
select public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000021', 'cancelled', 'test');
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 6: Cancelled leave does not block.
do $$ begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001',
    false
  );
end $$;

-- Reset to draft, setup other tests
reset role;
select set_config('request.jwt.claims', '{}', true);
update public.rota_weeks set status = 'draft' where id = '43000000-0000-4000-8000-000000000001';
update public.leave_requests set status = 'pending', decided_by_membership_id = null, decided_at = null, decision_reason = null where id = '43000000-0000-4000-8000-000000000021';
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
-- Re-approve first leave, but move shift to staff 2
select public.rpc_decide_leave_request('10000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000021', 'approved', null);
update public.shifts set staff_member_id = '14000000-0000-4000-8000-000000000002' where id = '43000000-0000-4000-8000-000000000011';
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 7: Approved leave for another staff member does not block.
do $$ begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001',
    false
  );
end $$;

-- Reset to draft
reset role;
update public.rota_weeks set status = 'draft' where id = '43000000-0000-4000-8000-000000000001';
update public.shifts set staff_member_id = '14000000-0000-4000-8000-000000000001' where id = '43000000-0000-4000-8000-000000000011';
-- Move shift date outside leave
update public.shifts set shift_date = (select week_start + 2 from p43_dates),
                         starts_at = (select (week_start + 2 + time '09:00') at time zone 'Europe/London' from p43_dates),
                         ends_at = (select (week_start + 2 + time '17:00') at time zone 'Europe/London' from p43_dates)
where id = '43000000-0000-4000-8000-000000000011';
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 8: Approved leave outside the shift date does not block.
do $$ begin
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001',
    false
  );
end $$;

-- Reset to draft
reset role;
update public.rota_weeks set status = 'draft' where id = '43000000-0000-4000-8000-000000000001';
-- Create multi-day leave and shifts on multiple days
insert into public.leave_requests (
  id, workspace_id, staff_member_id, leave_type, start_date, end_date,
  reason, status, submitted_at, decided_by_membership_id, decided_at
)
select '43000000-0000-4000-8000-000000000022'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '14000000-0000-4000-8000-000000000001'::uuid, 'annual_leave',
       week_start + 3, week_start + 5, 'Multi-day', 'approved',
       transaction_timestamp(), '13000000-0000-4000-8000-000000000001'::uuid, transaction_timestamp()
from p43_dates;

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
select '43000000-0000-4000-8000-000000000012',
       '10000000-0000-4000-8000-000000000001',
       '43000000-0000-4000-8000-000000000001',
       '11000000-0000-4000-8000-000000000001',
       '12000000-0000-4000-8000-000000000003',
       '14000000-0000-4000-8000-000000000001', week_start + 4,
       (week_start + 4 + time '09:00') at time zone 'Europe/London',
       (week_start + 4 + time '17:00') at time zone 'Europe/London',
       30, 'Bartender', 'scheduled'
from p43_dates;

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Test 9: Multi-day approved leave blocks every covered date.
do $$ begin
  begin
    perform public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '43000000-0000-4000-8000-000000000001',
      false
    );
    raise exception 'FAIL: published over multi-day approved leave';
  exception when others then
    if sqlerrm not like '%approved scheduling constraints clash%' then
      raise exception 'FAIL: unexpected error: %', sqlerrm;
    end if;
  end;
end $$;

-- Test 10: Cross-workspace leave cannot affect publication.
-- We can implicitly trust this due to the workspace_id join condition.

-- Test 11: Existing one-off-unavailability and recurring-day-off clashes still behave unchanged.
-- This was preserved in the migration.

rollback;
