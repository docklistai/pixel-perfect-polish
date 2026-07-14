-- Phase 4 adversarial verification. Runs entirely inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/tests/phase4_adversarial.sql
--
-- Every expected rejection is caught by its exact SQLSTATE (42501 RLS/grant or
-- guard privilege, 55000 guard state, 23514 check). An attack that succeeds
-- raises P0001 (FAIL) and aborts the script.

begin;

-- --------------------------------------------------------------------------
-- Setup (service path): test auth identities, claimed memberships.
-- Rolled back with everything else; the committed seed keeps user_id null.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'manager.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'olivia.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sophie.test@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'aa000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'outsider.test@example.com');

update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000001', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000001';
update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000002', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000010';
update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000003', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000006';
update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000004', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000002';

-- --------------------------------------------------------------------------
-- MANAGER persona: membership privilege escalation
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    update public.workspace_memberships set role = 'owner' where id = '13000000-0000-4000-8000-000000000010';
    raise exception 'FAIL: manager self-escalated to owner';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot self-escalate to owner'; end;
  begin
    insert into public.workspace_memberships (workspace_id, role, status) values ('10000000-0000-4000-8000-000000000001', 'owner', 'invited');
    raise exception 'FAIL: manager created an owner membership';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot create owner memberships'; end;
  begin
    update public.workspace_memberships set role = 'staff' where id = '13000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: manager demoted an owner';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot demote an owner'; end;
  begin
    update public.workspace_memberships set status = 'revoked' where id = '13000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: manager revoked an owner';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot revoke an owner'; end;
  begin
    delete from public.workspace_memberships where id = '13000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: manager deleted an owner';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot delete an owner'; end;
end $$;

savepoint manager_allowed;
do $$
declare affected_rows integer;
begin
  update public.workspace_memberships set role = 'manager' where id = '13000000-0000-4000-8000-000000000003';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'FAIL: manager could not promote staff to manager'; end if;
  raise notice 'PASS: manager can still promote staff to manager';
end $$;
rollback to savepoint manager_allowed;

-- --------------------------------------------------------------------------
-- OWNER persona: last-owner protection, identity rewrite
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
begin
  begin
    update public.workspace_memberships set role = 'manager' where id = '13000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: last owner demoted themselves';
  exception when sqlstate '55000' then raise notice 'PASS: last owner cannot be demoted'; end;
  begin
    update public.workspace_memberships set status = 'revoked' where id = '13000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: last owner revoked themselves';
  exception when sqlstate '55000' then raise notice 'PASS: last owner cannot be revoked'; end;
  begin
    delete from public.workspace_memberships where id = '13000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: last owner deleted themselves';
  exception when sqlstate '55000' then raise notice 'PASS: last owner cannot be deleted'; end;
  begin
    update public.workspace_memberships set user_id = 'aa000000-0000-4000-8000-000000000005' where id = '13000000-0000-4000-8000-000000000006';
    raise exception 'FAIL: claimed membership user identity was rewritten';
  exception when sqlstate '55000' then raise notice 'PASS: claimed membership identity cannot be rewritten'; end;
end $$;

savepoint owner_succession;
do $$
declare affected_rows integer;
begin
  insert into public.workspace_memberships (workspace_id, role, status) values ('10000000-0000-4000-8000-000000000001', 'owner', 'invited');
  update public.workspace_memberships set role = 'manager' where id = '13000000-0000-4000-8000-000000000001';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'FAIL: owner handover did not update the membership'; end if;
  raise notice 'PASS: owner handover works once a second owner exists';
end $$;
rollback to savepoint owner_succession;

-- --------------------------------------------------------------------------
-- MANAGER persona: snapshot publication chain
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- Since phase 30, publication evidence has exactly one client-reachable
-- writer: rpc_publish_rota_week. Any direct insert — even a perfectly formed
-- one — is refused at the grant/RLS layer before the phase 4 guards run. The
-- guards remain as defence in depth for the definer/service paths.
do $$
begin
  begin
    insert into public.published_rota_snapshots (workspace_id, rota_week_id, version, published_by_membership_id, published_at, created_at)
    values ('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 2, '13000000-0000-4000-8000-000000000010', transaction_timestamp(), transaction_timestamp());
    raise exception 'FAIL: manager minted a snapshot by direct insert';
  exception when insufficient_privilege then raise notice 'PASS: snapshots can only be created by the publish RPC'; end;
  begin
    insert into public.published_rota_shifts (workspace_id, snapshot_id, source_shift_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
    values ('10000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000001', gen_random_uuid(), '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2026-06-09', '2026-06-09T08:00:00+01:00', '2026-06-09T16:00:00+01:00', 30, 'FOH Supervisor', 'scheduled');
    raise exception 'FAIL: shift injected into a published snapshot by direct insert';
  exception when insufficient_privilege then raise notice 'PASS: published shifts can only be created by the publish RPC'; end;
end $$;

savepoint honest_publish;
do $$
declare publish_result jsonb;
begin
  -- Week 15…02 is the seeded draft week that still has draft shifts; the RPC
  -- publishes it atomically as version 1.
  publish_result := public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
  if (publish_result ->> 'version')::int <> 1 then
    raise exception 'FAIL: canonical publish RPC returned version %', publish_result ->> 'version';
  end if;
  raise notice 'PASS: honest atomic publication succeeds through the publish RPC';
end $$;
set constraints all immediate;
set constraints all deferred;
rollback to savepoint honest_publish;

-- --------------------------------------------------------------------------
-- MANAGER persona: actor integrity
-- --------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.leave_request_events (workspace_id, leave_request_id, actor_membership_id, event_type, resulting_status)
    values ('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'approved', 'approved');
    raise exception 'FAIL: leave event written as another membership';
  exception when insufficient_privilege then raise notice 'PASS: leave event actor cannot be forged'; end;
  begin
    insert into public.time_entry_events (workspace_id, time_entry_id, actor_membership_id, event_type, resulting_approval_status)
    values ('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000006', 'approved', 'approved');
    raise exception 'FAIL: time entry event written as another membership';
  exception when insufficient_privilege then raise notice 'PASS: time entry event actor cannot be forged'; end;
  begin
    insert into public.notifications (workspace_id, created_by_membership_id, kind, title, body)
    values ('10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'announcement', 'Forged', 'Forged sender');
    raise exception 'FAIL: notification created as another membership';
  exception when insufficient_privilege then raise notice 'PASS: notification creator cannot be forged'; end;
  begin
    update public.time_entries set approval_status = 'approved', approved_at = now(), approved_by_membership_id = '13000000-0000-4000-8000-000000000001'
    where id = '1b000000-0000-4000-8000-000000000002';
    raise exception 'FAIL: time entry approved as the owner';
  exception when insufficient_privilege then raise notice 'PASS: time entry approver cannot be forged'; end;
  begin
    update public.leave_requests set status = 'approved', decided_at = now(), decided_by_membership_id = '13000000-0000-4000-8000-000000000001'
    where id = '19000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: leave decided as the owner';
  exception when insufficient_privilege then raise notice 'PASS: leave decider cannot be forged'; end;
end $$;

savepoint honest_actor_writes;
do $$
declare affected_rows integer;
begin
  insert into public.leave_request_events (workspace_id, leave_request_id, actor_membership_id, event_type, resulting_status)
  values ('10000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000010', 'reopened', 'pending');
  update public.time_entries set approval_status = 'approved', approved_at = now(), approved_by_membership_id = '13000000-0000-4000-8000-000000000010'
  where id = '1b000000-0000-4000-8000-000000000002';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'FAIL: caller-attributed approval did not update'; end if;
  update public.leave_requests set status = 'approved', decided_at = now(), decided_by_membership_id = '13000000-0000-4000-8000-000000000010', decision_reason = 'Cover arranged.'
  where id = '19000000-0000-4000-8000-000000000001';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'FAIL: caller-attributed decision did not update'; end if;
  raise notice 'PASS: caller-attributed event, approval, and decision succeed';
end $$;
rollback to savepoint honest_actor_writes;

-- --------------------------------------------------------------------------
-- MANAGER persona: clock event integrity
-- --------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, actor_membership_id, event_type, source, occurred_at)
    values ('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000010', 'break_start', 'manager', now());
    raise exception 'FAIL: clock event staff mismatched its time entry';
  exception when sqlstate '55000' then raise notice 'PASS: clock event staff must match the time entry'; end;
  begin
    insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, actor_membership_id, event_type, source, occurred_at)
    values ('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '13000000-0000-4000-8000-000000000006', 'break_start', 'staff', now());
    raise exception 'FAIL: clock event actor forged';
  exception when insufficient_privilege then raise notice 'PASS: clock event actor cannot be forged'; end;
  begin
    insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, actor_membership_id, event_type, source, occurred_at)
    values ('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '13000000-0000-4000-8000-000000000010', 'break_start', 'staff', now());
    raise exception 'FAIL: manager wrote a staff-sourced clock event';
  exception when sqlstate '55000' then raise notice 'PASS: manager clock events must use source manager'; end;
  begin
    insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, actor_membership_id, event_type, source, occurred_at)
    values ('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '13000000-0000-4000-8000-000000000010', 'break_start', 'system', now());
    raise exception 'FAIL: authenticated caller wrote a system clock event';
  exception when sqlstate '55000' then raise notice 'PASS: system clock events are service-only'; end;
end $$;

savepoint honest_clock_event;
insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, actor_membership_id, event_type, source, occurred_at)
values ('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000010', 'break_start', 'manager', now());
do $$ begin raise notice 'PASS: honest manager clock event succeeds'; end $$;
rollback to savepoint honest_clock_event;

-- --------------------------------------------------------------------------
-- MANAGER persona: relational consistency on drafts and time entries
-- --------------------------------------------------------------------------
do $$
declare second_location_id uuid;
begin
  insert into public.locations (workspace_id, name, timezone) values ('10000000-0000-4000-8000-000000000001', 'Annex Test Site', 'Europe/London') returning id into second_location_id;
  begin
    insert into public.shifts (workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
    values ('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', second_location_id, '12000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2026-06-16', '2026-06-16T08:00:00+01:00', '2026-06-16T16:00:00+01:00', 30, 'FOH Supervisor', 'scheduled');
    raise exception 'FAIL: shift accepted outside its rota week location';
  exception when sqlstate '55000' then raise notice 'PASS: shift location must match the rota week'; end;
  begin
    insert into public.shifts (workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
    values ('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2026-06-30', '2026-06-30T08:00:00+01:00', '2026-06-30T16:00:00+01:00', 30, 'FOH Supervisor', 'scheduled');
    raise exception 'FAIL: shift accepted outside its rota week dates';
  exception when sqlstate '55000' then raise notice 'PASS: shift date must fall inside the rota week'; end;
  begin
    update public.rota_weeks set week_start = '2026-06-22' where id = '15000000-0000-4000-8000-000000000002';
    raise exception 'FAIL: rota week moved under its shifts';
  exception when sqlstate '55000' then raise notice 'PASS: rota week boundaries freeze once shifts exist'; end;
  begin
    insert into public.time_entries (workspace_id, staff_member_id, shift_id, work_date)
    values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '16000000-0000-4000-8000-000000000001', '2026-06-15');
    raise exception 'FAIL: time entry linked to another staff member''s shift';
  exception when sqlstate '55000' then raise notice 'PASS: time entry shift must belong to the same staff member'; end;
  begin
    insert into public.time_entries (workspace_id, staff_member_id, shift_id, work_date)
    values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000004', '16000000-0000-4000-8000-000000000003', '2026-06-19');
    raise exception 'FAIL: time entry linked to an open shift';
  exception when sqlstate '55000' then raise notice 'PASS: time entries cannot link to open shifts'; end;
end $$;

savepoint shift_reassignment;
insert into public.time_entries (workspace_id, staff_member_id, shift_id, work_date)
values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', '2026-06-15');
do $$
begin
  begin
    update public.shifts set staff_member_id = '14000000-0000-4000-8000-000000000003' where id = '16000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: shift reassigned while a time entry references it';
  exception when sqlstate '55000' then raise notice 'PASS: shift assignment freezes while time entries reference it'; end;
end $$;
rollback to savepoint shift_reassignment;

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia): canonical facts, self-service limits, visibility
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
begin
  begin
    update public.notification_deliveries set delivered_at = now() where id = '1f000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: staff rewrote delivered_at';
  exception when sqlstate '55000' then raise notice 'PASS: delivered_at is immutable once set'; end;
  begin
    update public.notification_deliveries set notification_id = '1e000000-0000-4000-8000-000000000002' where id = '1f000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: staff updated a delivery identity column';
  exception when insufficient_privilege then raise notice 'PASS: delivery updates are limited to delivery state columns'; end;
  begin
    insert into public.leave_requests (workspace_id, staff_member_id, leave_type, start_date, end_date, reason, submitted_at)
    values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', 'annual_leave', current_date + 7, current_date + 8, 'Backdated request.', '2020-01-01T09:00:00Z');
    raise exception 'FAIL: staff backdated a leave submission';
  exception when sqlstate '55000' then raise notice 'PASS: leave submissions carry transaction time'; end;
  begin
    insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, actor_membership_id, event_type, source, occurred_at)
    values ('10000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '13000000-0000-4000-8000-000000000006', 'break_start', 'staff', now());
    raise exception 'FAIL: staff inserted a clock event directly';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot write clock events directly'; end;
  begin
    insert into public.time_entries (workspace_id, staff_member_id, work_date) values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-06-12');
    raise exception 'FAIL: staff inserted a time entry directly';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot write time entries directly'; end;
  begin
    insert into public.shifts (workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status)
    values ('10000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-06-17', '2026-06-17T08:00:00+01:00', '2026-06-17T16:00:00+01:00', 30, 'Barista', 'scheduled');
    raise exception 'FAIL: staff inserted a draft shift';
  exception when insufficient_privilege then raise notice 'PASS: staff cannot write draft shifts'; end;
end $$;

savepoint staff_allowed_writes;
do $$
declare affected_rows integer;
begin
  update public.notification_deliveries set read_at = null where id = '1f000000-0000-4000-8000-000000000001';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'FAIL: staff could not toggle own read state'; end if;
  insert into public.leave_requests (workspace_id, staff_member_id, leave_type, start_date, end_date, reason)
  values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', 'personal', current_date + 7, current_date + 7, 'Appointment.');
  raise notice 'PASS: staff self-service writes (read state, own leave submission) succeed';
end $$;
rollback to savepoint staff_allowed_writes;

-- Sophie owns the seeded pending leave request; her persona exercises the
-- update paths that RLS allows for pending rows, where only the canonical
-- guards stand between staff and the columns.
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
begin
  begin
    update public.leave_requests set created_at = now() - interval '30 days' where id = '19000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: staff rewrote leave created_at';
  exception when sqlstate '55000' then raise notice 'PASS: leave created_at is immutable for the owning staff'; end;
  begin
    update public.leave_requests set submitted_at = now() - interval '30 days' where id = '19000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: staff rewrote leave submitted_at';
  exception when sqlstate '55000' then raise notice 'PASS: leave submitted_at is immutable for the owning staff'; end;
  begin
    update public.leave_requests set status = 'approved', decided_at = now(), decided_by_membership_id = '13000000-0000-4000-8000-000000000002' where id = '19000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: staff decided their own leave request';
  exception
    when insufficient_privilege or check_violation then raise notice 'PASS: staff cannot decide their own leave requests';
  end;
end $$;

savepoint staff_pending_edits;
do $$
declare affected_rows integer;
begin
  update public.leave_requests set reason = 'Friend''s wedding in Manchester (updated).' where id = '19000000-0000-4000-8000-000000000001';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'FAIL: staff could not edit own pending leave'; end if;
  update public.leave_requests set status = 'cancelled' where id = '19000000-0000-4000-8000-000000000001';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'FAIL: staff could not cancel own pending leave'; end if;
  raise notice 'PASS: staff can edit and cancel their own pending leave';
end $$;
rollback to savepoint staff_pending_edits;

-- Back to Olivia: the visibility expectations below are hers.
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare
  expected_counts constant jsonb := '{
    "shifts": 0, "rota_weeks": 0, "audit_events": 0, "leave_request_events": 0,
    "time_entry_events": 0, "workspace_memberships": 1, "staff_members": 1,
    "leave_requests": 1, "time_entries": 1, "clock_events": 2, "notifications": 2,
    "notification_deliveries": 2, "workspaces": 1, "published_rota_snapshots": 1,
    "published_rota_shifts": 2, "staff_portal_profile": 1,
    "staff_portal_published_shifts": 2, "staff_portal_leave_requests": 1,
    "staff_portal_time_entries": 1, "staff_portal_clock_events": 2,
    "staff_portal_notifications": 2}';
  relation_name text;
  actual_count bigint;
begin
  for relation_name in select jsonb_object_keys(expected_counts) loop
    execute format('select count(*) from public.%I', relation_name) into actual_count;
    if actual_count <> (expected_counts ->> relation_name)::bigint then
      raise exception 'FAIL: staff sees % rows in % (expected %)', actual_count, relation_name, expected_counts ->> relation_name;
    end if;
  end loop;
  raise notice 'PASS: staff visibility is scoped to own rows, published data, and no drafts/audit/event streams';
end $$;

-- --------------------------------------------------------------------------
-- OUTSIDER persona: authenticated but no membership
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $$
declare
  relation_name text;
  actual_count bigint;
begin
  foreach relation_name in array array[
    'workspaces', 'locations', 'departments', 'workspace_memberships', 'staff_members',
    'rota_weeks', 'shifts', 'published_rota_snapshots', 'published_rota_shifts',
    'leave_requests', 'leave_request_events', 'time_entries', 'clock_events',
    'time_entry_events', 'notifications', 'notification_deliveries', 'audit_events',
    'staff_portal_profile', 'staff_portal_published_shifts', 'staff_portal_leave_requests',
    'staff_portal_time_entries', 'staff_portal_clock_events', 'staff_portal_notifications'
  ] loop
    execute format('select count(*) from public.%I', relation_name) into actual_count;
    if actual_count <> 0 then
      raise exception 'FAIL: non-member sees % rows in %', actual_count, relation_name;
    end if;
  end loop;
  begin
    insert into public.leave_requests (workspace_id, staff_member_id, leave_type, start_date, end_date, reason)
    values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', 'personal', current_date + 7, current_date + 7, 'Intrusion.');
    raise exception 'FAIL: non-member inserted workspace data';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: non-members see and write nothing in any workspace relation';
end $$;

-- --------------------------------------------------------------------------
-- OWNER persona: canonical records stay immutable
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
begin
  -- Published tables carry no update/delete grant for authenticated at all;
  -- the immutability triggers behind them are exercised on the service path
  -- further below.
  begin
    update public.published_rota_snapshots set version = 9 where id = '17000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: published snapshot mutated';
  exception when insufficient_privilege then raise notice 'PASS: published snapshots are immutable for authenticated roles'; end;
  begin
    delete from public.published_rota_snapshots where id = '17000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: published snapshot deleted';
  exception when insufficient_privilege then raise notice 'PASS: published snapshots cannot be deleted by authenticated roles'; end;
  begin
    update public.published_rota_shifts set role_name = 'Edited' where id = '18000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: published shift mutated';
  exception when insufficient_privilege then raise notice 'PASS: published shifts are immutable for authenticated roles'; end;
  begin
    update public.workspaces set created_at = now() where id = '10000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: workspace created_at mutated';
  exception when sqlstate '55000' then raise notice 'PASS: workspace created_at is immutable'; end;
  begin
    update public.shifts set created_at = now() where id = '16000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: shift created_at mutated';
  exception when sqlstate '55000' then raise notice 'PASS: shift created_at is immutable'; end;
  begin
    update public.time_entries set staff_member_id = '14000000-0000-4000-8000-000000000001' where id = '1b000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: time entry staff_member_id mutated';
  exception when sqlstate '55000' then raise notice 'PASS: time entry staff_member_id is immutable'; end;
  begin
    update public.leave_requests set staff_member_id = '14000000-0000-4000-8000-000000000001' where id = '19000000-0000-4000-8000-000000000002';
    raise exception 'FAIL: leave request staff_member_id mutated';
  exception when sqlstate '55000' then raise notice 'PASS: leave request staff_member_id is immutable'; end;
  -- Since phase 30 managers have no delivery write policy at all: the update
  -- reaches no rows instead of tripping the immutability guard.
  declare
    affected_rows integer;
  begin
    update public.notification_deliveries set delivered_at = delivered_at + interval '1 hour' where id = '1f000000-0000-4000-8000-000000000001';
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then
      raise exception 'FAIL: manager-path delivered_at rewrite touched % rows', affected_rows;
    end if;
    raise notice 'PASS: managers have no write path to notification deliveries';
  end;
end $$;

-- --------------------------------------------------------------------------
-- Service path: immutable records hold even without RLS or grants
-- --------------------------------------------------------------------------
reset role;

do $$
begin
  begin
    update public.published_rota_snapshots set version = 9 where id = '17000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: service path mutated a published snapshot';
  exception when sqlstate '55000' then raise notice 'PASS: published snapshots are immutable on the service path'; end;
  begin
    delete from public.published_rota_snapshots where id = '17000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: service path deleted a published snapshot';
  exception when sqlstate '55000' then raise notice 'PASS: published snapshots cannot be deleted on the service path'; end;
  begin
    update public.published_rota_shifts set role_name = 'Edited' where id = '18000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: service path mutated a published shift';
  exception when sqlstate '55000' then raise notice 'PASS: published shifts are immutable on the service path'; end;
  begin
    update public.audit_events set occurred_at = now() where id = '20000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: service path mutated an audit event';
  exception when sqlstate '55000' then raise notice 'PASS: audit events are immutable on the service path'; end;
  begin
    update public.leave_request_events set reason = 'Edited' where id = '1a000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: service path mutated a leave event';
  exception when sqlstate '55000' then raise notice 'PASS: leave events are immutable on the service path'; end;
  begin
    update public.time_entry_events set reason = 'Edited' where id = '1d000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: service path mutated a time entry event';
  exception when sqlstate '55000' then raise notice 'PASS: time entry events are immutable on the service path'; end;
  begin
    update public.clock_events set occurred_at = now() where id = '1c000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: service path mutated a clock event';
  exception when sqlstate '55000' then raise notice 'PASS: clock events are immutable on the service path'; end;
end $$;

-- --------------------------------------------------------------------------
-- Service path: catalog and helper checks
-- --------------------------------------------------------------------------

do $$
declare offenders text;
begin
  -- Covering = the FK's columns are all among some index's leading columns.
  -- The repo's partial indexes qualify: each predicate is exactly
  -- "<fk column> is not null", which every FK enforcement probe implies.
  select string_agg(c.conrelid::regclass::text || '.' || c.conname, ', ') into offenders
  from pg_constraint c
  where c.contype = 'f'
    and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1
      from pg_index i
      where i.indrelid = c.conrelid
        and (string_to_array(i.indkey::text, ' ')::smallint[])[1:cardinality(c.conkey)] @> c.conkey
    );
  if offenders is not null then
    raise exception 'FAIL: foreign keys without covering indexes: %', offenders;
  end if;
  raise notice 'PASS: every public foreign key has a covering index';
end $$;

do $$
begin
  if not public.published_snapshot_has_shifts('10000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000001') then
    raise exception 'FAIL: seeded snapshot reported as empty';
  end if;
  if public.published_snapshot_has_shifts('10000000-0000-4000-8000-000000000001', gen_random_uuid()) then
    raise exception 'FAIL: unknown snapshot reported as having shifts';
  end if;
  raise notice 'PASS: staff latest-snapshot view ignores shiftless versions by construction';
end $$;

do $$ begin raise notice 'ALL ADVERSARIAL CHECKS PASSED'; end $$;

rollback;
