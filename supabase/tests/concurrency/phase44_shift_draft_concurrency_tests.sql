-- Phase 44 two-session concurrency checks for the shift/draft trigger.
--
-- LOCAL ONLY. Run via `bash scripts/concurrency-tests.sh` (supabase_admin —
-- dblink needs a superuser caller on the local stack). Every session opens a
-- BEGIN that is never committed; disconnecting aborts it.
--
-- Asserts that making the draft transition transactional did not weaken, or
-- add to, the phase 40 week-lock protocol:
--   1. a concurrent shift write into the same week blocks on the existing week
--      lock rather than racing it, and the blocked writer then completes
--      deterministically once the first session releases;
--   2. because both sessions here are aborted rather than committed, the week
--      is left exactly as it started — this case proves serialization and
--      rollback symmetry, not that a committed transition happens once. The
--      committed path is asserted in
--      supabase/tests/phase44_shift_draft_integrity_tests.sql (cases 1-3, 8);
--   3. a rolled-back shift write leaves the week published, proving the shift
--      and the status change share one transaction in both directions;
--   4. publish blocks behind an in-flight shift write instead of publishing a
--      week that is about to change.
--
-- Fixture: a committed published week the remote sessions can see under MVCC.
-- The fixed identity is cleaned on rerun and after a successful suite.

create extension if not exists dblink;

-- Case 5 commits its drift on a second connection, so an aborted run cannot
-- roll it back. Restore the seeded name here as well as at the end, so a rerun
-- always starts from the seeded state.
update public.staff_members
set display_name = 'Olivia Bennett'
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '14000000-0000-4000-8000-000000000005'
  and display_name <> 'Olivia Bennett';

delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in ('15000000-0000-4000-8000-000000000044',
                       '15000000-0000-4000-8000-000000000045');
delete from public.published_rota_shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and snapshot_id in (
    select id from public.published_rota_snapshots
    where rota_week_id in ('15000000-0000-4000-8000-000000000044',
                           '15000000-0000-4000-8000-000000000045'));
delete from public.published_rota_snapshots
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in ('15000000-0000-4000-8000-000000000044',
                       '15000000-0000-4000-8000-000000000045');
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id in ('15000000-0000-4000-8000-000000000044',
             '15000000-0000-4000-8000-000000000045');

-- Week 44: published and empty — the subject of cases 1-3.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values (
  '15000000-0000-4000-8000-000000000044',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '2026-07-06', 'published'
);

-- Week 45: a draft week holding one committed shift, so the publish in case 4
-- has something real to publish once the competing writer releases.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values (
  '15000000-0000-4000-8000-000000000045',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '2026-07-13', 'draft'
);
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values (
  '16000000-0000-4000-8000-000000000045',
  '10000000-0000-4000-8000-000000000001',
  '15000000-0000-4000-8000-000000000045',
  '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001', null,
  '2026-07-13', '2026-07-13T09:00:00+01:00',
  '2026-07-13T13:00:00+01:00', 0, 'P44 publish subject', 'open'
);

begin;

create temp table p44c_conn (connstr text primary key);
insert into p44c_conn values ('dbname=postgres user=postgres');

create function pg_temp.p44c_wait_for(
  p_app_name text,
  p_condition text,          -- 'blocked' | 'done'
  p_timeout_seconds numeric
)
returns boolean
language plpgsql
as $$
declare
  waited numeric := 0;
  satisfied boolean := false;
begin
  while waited < p_timeout_seconds loop
    perform pg_stat_clear_snapshot();
    if p_condition = 'blocked' then
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name
          and wait_event_type = 'Lock'
      ) into satisfied;
    else
      select exists (
        select 1 from pg_stat_activity
        where application_name = p_app_name
          and state = 'idle in transaction'
      ) into satisfied;
    end if;
    exit when satisfied;
    perform pg_sleep(0.1);
    waited := waited + 0.1;
  end loop;
  return satisfied;
end;
$$;

-- --------------------------------------------------------------------------
-- 1 + 2. Concurrent shift writes into the same published week serialize on the
--        existing week lock. Both sessions are then aborted, so the assertion
--        at the end is that nothing survived — rollback symmetry under
--        contention, not a claim about committed transitions.
-- --------------------------------------------------------------------------
do $$
declare
  done boolean;
  blocked boolean;
  week_status text;
begin
  perform dblink_connect('p44c_a',
    (select connstr from p44c_conn) || ' application_name=p44c_a');
  perform dblink_send_query('p44c_a', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000044',
      '11000000-0000-4000-8000-000000000001',
      '12000000-0000-4000-8000-000000000001', null,
      '2026-07-06', '2026-07-06T09:00:00+01:00',
      '2026-07-06T13:00:00+01:00', 0, 'P44 session A', 'open'
    );
  $q$);

  done := pg_temp.p44c_wait_for('p44c_a', 'done', 10);
  if not done then
    raise exception 'FAIL: uncontended shift write did not complete';
  end if;
  raise notice 'PASS: uncontended shift write completes and holds its week lock';

  perform dblink_connect('p44c_b',
    (select connstr from p44c_conn) || ' application_name=p44c_b');
  perform dblink_send_query('p44c_b', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000044',
      '11000000-0000-4000-8000-000000000001',
      '12000000-0000-4000-8000-000000000001', null,
      '2026-07-07', '2026-07-07T09:00:00+01:00',
      '2026-07-07T13:00:00+01:00', 0, 'P44 session B', 'open'
    );
  $q$);

  blocked := pg_temp.p44c_wait_for('p44c_b', 'blocked', 10);
  if not blocked then
    raise exception 'FAIL: concurrent shift write into the same week did not block';
  end if;
  raise notice 'PASS: concurrent write into the same week blocks on the week lock';

  -- Releasing the first session aborts its transaction, so the week returns to
  -- published; the second session then applies its own write and transition.
  perform dblink_disconnect('p44c_a');
  done := pg_temp.p44c_wait_for('p44c_b', 'done', 10);
  if not done then
    raise exception 'FAIL: blocked shift write did not complete after release';
  end if;
  raise notice 'PASS: blocked shift write completes deterministically after release';

  perform dblink_disconnect('p44c_b');

  -- Both sessions aborted, so nothing survives: the week is published again.
  select status into week_status from public.rota_weeks
  where id = '15000000-0000-4000-8000-000000000044';
  if week_status <> 'published' then
    raise exception 'FAIL: aborted sessions left week status %', week_status;
  end if;
  raise notice 'PASS: no draft transition survived two aborted writers';
end $$;

-- --------------------------------------------------------------------------
-- 3. Rollback symmetry: a shift write that is rolled back takes its draft
--    transition with it. The shift and the status change are one transaction
--    in both directions, not just on success.
-- --------------------------------------------------------------------------
do $$
declare
  done boolean;
  week_status text;
  shift_count integer;
begin
  perform dblink_connect('p44c_rb',
    (select connstr from p44c_conn) || ' application_name=p44c_rb');
  perform dblink_send_query('p44c_rb', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000044',
      '11000000-0000-4000-8000-000000000001',
      '12000000-0000-4000-8000-000000000001', null,
      '2026-07-08', '2026-07-08T09:00:00+01:00',
      '2026-07-08T13:00:00+01:00', 0, 'P44 rollback probe', 'open'
    );
  $q$);

  done := pg_temp.p44c_wait_for('p44c_rb', 'done', 10);
  if not done then
    raise exception 'FAIL: rollback probe write did not complete';
  end if;

  -- Abort it.
  perform dblink_disconnect('p44c_rb');
  perform pg_sleep(0.3);

  select status into week_status from public.rota_weeks
  where id = '15000000-0000-4000-8000-000000000044';
  select count(*) into shift_count from public.shifts
  where rota_week_id = '15000000-0000-4000-8000-000000000044';

  if week_status <> 'published' then
    raise exception 'FAIL: rolled-back write left the week as %', week_status;
  end if;
  if shift_count <> 0 then
    raise exception 'FAIL: rolled-back write left % shift(s)', shift_count;
  end if;
  raise notice 'PASS: rollback discarded the shift and the draft transition together';
end $$;

-- --------------------------------------------------------------------------
-- 4. Publish blocks behind an in-flight shift write rather than publishing a
--    week that is mid-change.
-- --------------------------------------------------------------------------
do $$
declare
  done boolean;
  blocked boolean;
begin
  perform dblink_connect('p44c_write',
    (select connstr from p44c_conn) || ' application_name=p44c_write');
  perform dblink_send_query('p44c_write', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000045',
      '11000000-0000-4000-8000-000000000001',
      '12000000-0000-4000-8000-000000000001', null,
      '2026-07-14', '2026-07-14T09:00:00+01:00',
      '2026-07-14T13:00:00+01:00', 0, 'P44 publish race', 'open'
    );
  $q$);

  done := pg_temp.p44c_wait_for('p44c_write', 'done', 10);
  if not done then
    raise exception 'FAIL: shift write ahead of publish did not complete';
  end if;

  perform dblink_connect('p44c_pub',
    (select connstr from p44c_conn) || ' application_name=p44c_pub');
  perform dblink_send_query('p44c_pub', $q$
    begin;
    select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    select public.rpc_publish_rota_week(
      '10000000-0000-4000-8000-000000000001',
      '15000000-0000-4000-8000-000000000045',
      true);
  $q$);

  blocked := pg_temp.p44c_wait_for('p44c_pub', 'blocked', 10);
  if not blocked then
    raise exception 'FAIL: publish did not block behind an in-flight shift write';
  end if;
  raise notice 'PASS: publish serializes behind an in-flight shift write';

  perform dblink_disconnect('p44c_write');
  done := pg_temp.p44c_wait_for('p44c_pub', 'done', 10);
  if not done then
    raise exception 'FAIL: publish did not resolve after the writer released';
  end if;
  raise notice 'PASS: publish resolves deterministically after the writer releases';

  perform dblink_disconnect('p44c_pub');
end $$;

-- --------------------------------------------------------------------------
-- 5. Phase 46: a change to the exported data committed by ANOTHER session
--    between the manager's preview and their Download is refused, writes no
--    audit and returns no rows.
--
--    This is the cross-session half of the single-capture guarantee. The
--    in-function half — that one audited export reads the data exactly once,
--    so its signature, counts and rows cannot describe different snapshots —
--    is asserted deterministically in
--    supabase/tests/phase46_export_audit_integrity_tests.sql case 12.
-- --------------------------------------------------------------------------

-- The connection string and the dblink call stay on the admin role; only the
-- RPC calls run as the manager, because dblink and the temp fixture table are
-- not reachable from 'authenticated'.
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

-- 5a. Take the preview the manager reviews, and remember it for later.
set local role authenticated;
do $$
declare
  reviewed_signature text;
  audits_before integer;
begin
  select distinct preview_signature into reviewed_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-30', null);

  if reviewed_signature is null then
    raise exception 'FAIL: the fixture range has no approved hours to preview';
  end if;

  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  perform set_config('p46c.reviewed_signature', reviewed_signature, true);
  perform set_config('p46c.audits_before', audits_before::text, true);
end $$;
reset role;

-- 5b. Another session commits a change to the exported content. dblink runs it
--     on its own connection, so it is genuinely committed and visible here.
do $$
begin
  perform dblink_connect('p46c_drift',
    (select connstr from p44c_conn) || ' application_name=p46c_drift');
  perform dblink_exec('p46c_drift', $q$
    update public.staff_members
    set display_name = 'P46 concurrent rename'
    where workspace_id = '10000000-0000-4000-8000-000000000001'
      and id = '14000000-0000-4000-8000-000000000005';
  $q$);
  perform dblink_disconnect('p46c_drift');
end $$;

-- 5c. The reviewed signature is now stale: refused, no audit, no rows.
set local role authenticated;
do $$
declare
  reviewed_signature text := current_setting('p46c.reviewed_signature', true);
  audits_before integer := current_setting('p46c.audits_before', true)::integer;
  audits_after integer;
  refused boolean := false;
  downloaded integer := 0;
begin
  begin
    select count(*) into downloaded
    from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001',
      '2026-06-01', '2026-06-30', null, reviewed_signature);
  exception when sqlstate '55000' then
    refused := true;
  end;

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  if not refused then
    raise exception 'FAIL: a concurrently changed export was still downloaded (% rows)', downloaded;
  end if;
  if audits_after <> audits_before then
    raise exception 'FAIL: a concurrently changed export wrote % audit(s)',
      audits_after - audits_before;
  end if;
  raise notice 'PASS: a concurrent commit invalidates the reviewed preview, with no audit';

  -- Re-previewing yields a signature that matches the data as it now stands,
  -- and confirming that writes exactly one audit.
  select distinct preview_signature into reviewed_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2026-06-01', '2026-06-30', null);

  perform 1 from public.rpc_export_approved_hours(
    '10000000-0000-4000-8000-000000000001',
    '2026-06-01', '2026-06-30', null, reviewed_signature);

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';
  if audits_after - audits_before <> 1 then
    raise exception 'FAIL: the re-confirmed export wrote % audits', audits_after - audits_before;
  end if;
  raise notice 'PASS: re-previewing then confirming writes exactly one audit';
end $$;

reset role;

rollback;

-- Fixture cleanup (outside the rolled-back transaction).
-- The case 5 rename was committed by a second connection, so the rollback above
-- does not undo it; restore the seeded name explicitly.
update public.staff_members
set display_name = 'Olivia Bennett'
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '14000000-0000-4000-8000-000000000005';
delete from public.shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in ('15000000-0000-4000-8000-000000000044',
                       '15000000-0000-4000-8000-000000000045');
delete from public.published_rota_shifts
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and snapshot_id in (
    select id from public.published_rota_snapshots
    where rota_week_id in ('15000000-0000-4000-8000-000000000044',
                           '15000000-0000-4000-8000-000000000045'));
delete from public.published_rota_snapshots
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and rota_week_id in ('15000000-0000-4000-8000-000000000044',
                       '15000000-0000-4000-8000-000000000045');
delete from public.rota_weeks
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id in ('15000000-0000-4000-8000-000000000044',
             '15000000-0000-4000-8000-000000000045');
