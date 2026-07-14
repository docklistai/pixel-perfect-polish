-- Phase 25 break reconciliation + work_date timezone verification. Runs inside
-- one rolled-back transaction against the local stack; the seeded database is
-- left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase25_break_reconciliation_tests.sql
--
-- Covers: the pair-summing helper (normal, multiple, overnight, incomplete and
-- corrupt evidence), the clock_out reconciliation path end-to-end, manual
-- adjustment precedence, work_date at opposite timezone extremes, duplicate
-- break protection, and export agreement with the reconciled totals.
--
-- The migration exposes an internal eligibility predicate used by the
-- one-time backfill, so these tests exercise the exact historical gates.

begin;

-- --------------------------------------------------------------------------
-- Setup (postgres context, auth.uid() is null so actor guards stand down).
-- Workspace 1 = Harbour View. Olivia = staff 14…0005 via membership 13…0006.
-- Manager = membership 13…0010. Two extra staff sit at timezone-extreme
-- locations (UTC+14 / UTC-12) whose local dates always differ.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000251', 'authenticated', 'authenticated', 'p25.manager@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000252', 'authenticated', 'authenticated', 'p25.olivia@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000253', 'authenticated', 'authenticated', 'p25.east@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000254', 'authenticated', 'authenticated', 'p25.west@harbourview.co.uk');

update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000251', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000010';
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000252', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000006';

insert into public.locations (id, workspace_id, name, timezone)
values
  ('32000000-0000-4000-8000-000000000251', '10000000-0000-4000-8000-000000000001', 'P25 Far East Bar', 'Etc/GMT-14'),
  ('32000000-0000-4000-8000-000000000252', '10000000-0000-4000-8000-000000000001', 'P25 Far West Bar', 'Etc/GMT+12');

insert into public.workspace_memberships (id, workspace_id, role, status, invited_at)
values
  ('34000000-0000-4000-8000-000000000251', '10000000-0000-4000-8000-000000000001', 'staff', 'invited', '2026-06-01T08:00:00Z'),
  ('34000000-0000-4000-8000-000000000252', '10000000-0000-4000-8000-000000000001', 'staff', 'invited', '2026-06-01T08:00:00Z');
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000253', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '34000000-0000-4000-8000-000000000251';
update public.workspace_memberships set user_id = 'ad000000-0000-4000-8000-000000000254', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '34000000-0000-4000-8000-000000000252';

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values
  ('35000000-0000-4000-8000-000000000251', '10000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000251', '32000000-0000-4000-8000-000000000251', '12000000-0000-4000-8000-000000000003', 'P25 East Staff', 'Bartender'),
  ('35000000-0000-4000-8000-000000000252', '10000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000252', '32000000-0000-4000-8000-000000000252', '12000000-0000-4000-8000-000000000003', 'P25 West Staff', 'Bartender');

-- --------------------------------------------------------------------------
-- A. Helper unit checks on synthetic closed entries (postgres context).
-- --------------------------------------------------------------------------
insert into public.time_entries (id, workspace_id, staff_member_id, work_date, clocked_in_at, clocked_out_at)
values
  -- A1: two breaks, 30m + 15m.
  ('36000000-0000-4000-8000-000000000251', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-07-06', '2026-07-06T09:00:00Z', '2026-07-06T17:00:00Z'),
  -- A2: overnight shift, break crossing midnight.
  ('36000000-0000-4000-8000-000000000252', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-07-07', '2026-07-07T22:00:00Z', '2026-07-08T06:00:00Z'),
  -- A3: one complete 20m pair plus a trailing unpaired break_start.
  ('36000000-0000-4000-8000-000000000253', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-07-08', '2026-07-08T09:00:00Z', '2026-07-08T15:00:00Z'),
  -- A4: corrupt orphan break_end before any break_start.
  ('36000000-0000-4000-8000-000000000254', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-07-09', '2026-07-09T09:00:00Z', '2026-07-09T15:00:00Z'),
  -- A5: balanced but overlapping starts/ends (must never double-count/backfill).
  ('36000000-0000-4000-8000-000000000256', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-07-10', '2026-07-10T09:00:00Z', '2026-07-10T15:00:00Z'),
  -- A6: corrupt break evidence longer than the whole one-hour entry.
  ('36000000-0000-4000-8000-000000000257', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', '2026-07-11', '2026-07-11T09:00:00Z', '2026-07-11T10:00:00Z');

insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, event_type, source, occurred_at)
values
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251', '14000000-0000-4000-8000-000000000005', 'clock_in',    'staff', '2026-07-06T09:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-06T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-06T12:30:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-06T15:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-06T15:15:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251', '14000000-0000-4000-8000-000000000005', 'clock_out',   'staff', '2026-07-06T17:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000252', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-08T01:55:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000252', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-08T02:25:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000253', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-08T11:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000253', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-08T11:20:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000253', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-08T14:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000254', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-09T11:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256', '14000000-0000-4000-8000-000000000005', 'clock_in',    'staff', '2026-07-10T09:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-10T10:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-10T10:10:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-10T10:20:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-10T10:30:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256', '14000000-0000-4000-8000-000000000005', 'clock_out',   'staff', '2026-07-10T15:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000257', '14000000-0000-4000-8000-000000000005', 'clock_in',    'staff', '2026-07-11T09:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000257', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', '2026-07-11T08:30:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000257', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', '2026-07-11T10:30:00Z'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000257', '14000000-0000-4000-8000-000000000005', 'clock_out',   'staff', '2026-07-11T10:00:00Z');

do $$
declare
  minutes integer;
begin
  minutes := public.rpc_internal_break_minutes_from_events('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251');
  if minutes <> 45 then
    raise exception 'FAIL: two-break entry computed % minutes (expected 45)', minutes;
  end if;
  raise notice 'PASS: multiple break pairs sum correctly (45m)';

  minutes := public.rpc_internal_break_minutes_from_events('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000252');
  if minutes <> 30 then
    raise exception 'FAIL: overnight midnight-crossing break computed % minutes (expected 30)', minutes;
  end if;
  raise notice 'PASS: overnight break crossing midnight sums correctly (30m)';

  minutes := public.rpc_internal_break_minutes_from_events('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000253');
  if minutes <> 20 then
    raise exception 'FAIL: incomplete-evidence entry computed % minutes (expected 20 from the complete pair only)', minutes;
  end if;
  raise notice 'PASS: unpaired trailing break_start contributes nothing (20m)';

  minutes := public.rpc_internal_break_minutes_from_events('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000254');
  if minutes <> 0 then
    raise exception 'FAIL: orphan break_end computed % minutes (expected 0)', minutes;
  end if;
  raise notice 'PASS: corrupt orphan break_end yields 0, never negative';

  minutes := public.rpc_internal_break_minutes_from_events('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256');
  if minutes <> 10 then
    raise exception 'FAIL: overlapping evidence computed % minutes (expected only adjacent 10m pair)', minutes;
  end if;
  if public.rpc_internal_can_backfill_break_minutes('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000256') then
    raise exception 'FAIL: balanced overlapping evidence was eligible for backfill';
  end if;
  raise notice 'PASS: overlapping evidence is neither duplicated nor backfilled';

  minutes := public.rpc_internal_break_minutes_from_events('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000257');
  if minutes <> 60 then
    raise exception 'FAIL: break minutes % exceeded the one-hour entry duration', minutes;
  end if;
  raise notice 'PASS: corrupt long break is capped to entry duration, preventing negative paid time';

  if not public.rpc_internal_can_backfill_break_minutes('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251') then
    raise exception 'FAIL: complete alternating staff-clock evidence was not backfill eligible';
  end if;
  if public.rpc_internal_can_backfill_break_minutes('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000253') then
    raise exception 'FAIL: incomplete evidence was backfill eligible';
  end if;
  raise notice 'PASS: backfill eligibility accepts only complete alternating evidence';
end $$;

insert into public.time_entry_events (
  workspace_id, time_entry_id, actor_membership_id, event_type, resulting_approval_status, reason
)
values (
  '10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251',
  '13000000-0000-4000-8000-000000000010', 'adjusted', 'pending', 'P25 manual authority gate'
);

do $$
begin
  if public.rpc_internal_can_backfill_break_minutes('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000251') then
    raise exception 'FAIL: deliberately adjusted entry remained backfill eligible';
  end if;
  raise notice 'PASS: manual adjustment evidence blocks historical backfill';
end $$;

-- --------------------------------------------------------------------------
-- B. Synthetic OPEN entry for Olivia: clocked in 3h ago with one completed
--    30m break pair, so her authenticated clock_out has real durations.
-- --------------------------------------------------------------------------
insert into public.time_entries (id, workspace_id, staff_member_id, work_date, clocked_in_at)
values ('36000000-0000-4000-8000-000000000255', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', (now() at time zone 'Europe/London')::date, now() - interval '3 hours');

insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, event_type, source, occurred_at)
values
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000255', '14000000-0000-4000-8000-000000000005', 'clock_in',    'staff', now() - interval '3 hours'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000255', '14000000-0000-4000-8000-000000000005', 'break_start', 'staff', now() - interval '2 hours'),
  ('10000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000255', '14000000-0000-4000-8000-000000000005', 'break_end',   'staff', now() - interval '90 minutes');

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia): duplicate-break guard, clock_out reconciliation.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000252","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
  reconciled integer;
begin
  -- Duplicate break protection: a second break_start on the open entry fails.
  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'break_start', '36000000-0000-4000-8000-000000000255');
  begin
    perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'break_start', '36000000-0000-4000-8000-000000000255');
    raise exception 'FAIL: a second break_start was accepted while a break was open';
  exception when sqlstate '55000' then
    raise notice 'PASS: duplicate break_start rejected while a break is open';
  end;
  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'break_end', '36000000-0000-4000-8000-000000000255');

  -- Clock out: the 30m synthetic pair plus the instant RPC pair (~0m) must
  -- reconcile into break_minutes = 30.
  result := public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_out', '36000000-0000-4000-8000-000000000255');

  select break_minutes into reconciled
  from public.staff_portal_time_entries
  where time_entry_id = '36000000-0000-4000-8000-000000000255';
  if reconciled <> 30 then
    raise exception 'FAIL: clock_out reconciled % break minutes (expected 30)', reconciled;
  end if;
  raise notice 'PASS: clock_out reconciles completed break pairs into break_minutes (30m)';
end $$;

-- --------------------------------------------------------------------------
-- Manual adjustment precedence: Olivia opens a fresh entry, the manager
-- rewrites it (break 45m) while it is still open, staff then clock out — the
-- manual 45 must survive, not be overwritten by the 30m of event evidence.
-- --------------------------------------------------------------------------
do $$
begin
  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_in', null);
end $$;

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000251","role":"authenticated"}', true);

do $$
declare
  open_entry_id uuid;
begin
  select id into open_entry_id
  from public.time_entries
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and staff_member_id = '14000000-0000-4000-8000-000000000005'
    and clocked_out_at is null;

  perform public.rpc_adjust_time_entry(
    '10000000-0000-4000-8000-000000000001', open_entry_id,
    now() - interval '2 hours', null, 45, 'P25: agreed 45m break with Olivia');
  raise notice 'PASS: manager adjusted the open entry (break 45m, adjusted event recorded)';
end $$;

-- Synthetic 30m of break evidence lands after the manual adjustment.
reset role;
select set_config('request.jwt.claims', '', true);

insert into public.clock_events (workspace_id, time_entry_id, staff_member_id, event_type, source, occurred_at)
select '10000000-0000-4000-8000-000000000001', entry.id, entry.staff_member_id, pair.event_type, 'staff', pair.occurred_at
from public.time_entries as entry
cross join (values
  ('break_start'::text, now() - interval '80 minutes'),
  ('break_end'::text, now() - interval '50 minutes')
) as pair(event_type, occurred_at)
where entry.workspace_id = '10000000-0000-4000-8000-000000000001'
  and entry.staff_member_id = '14000000-0000-4000-8000-000000000005'
  and entry.clocked_out_at is null;

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000252","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  final_break integer;
begin
  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_out', null);

  select break_minutes into final_break
  from public.staff_portal_time_entries
  where clocked_out_at is not null
  order by clocked_out_at desc
  limit 1;
  if final_break <> 45 then
    raise exception 'FAIL: clock_out overwrote a manual adjustment (break %m, expected 45m preserved)', final_break;
  end if;
  raise notice 'PASS: manual adjustment survives clock_out (45m kept, event evidence not forced)';
end $$;

-- --------------------------------------------------------------------------
-- Timezone extremes: work_date comes from each staff member's location, so
-- the UTC+14 and UTC-12 staff clocking in at the same instant land on
-- different calendar days (the old UTC current_date gave both the same day).
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000253","role":"authenticated"}', true);
do $$
begin
  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_in', null);
end $$;

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000254","role":"authenticated"}', true);
do $$
begin
  perform public.rpc_staff_clock_event('10000000-0000-4000-8000-000000000001', 'clock_in', null);
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  east_date date;
  west_date date;
begin
  select work_date into east_date from public.time_entries
  where staff_member_id = '35000000-0000-4000-8000-000000000251' and clocked_out_at is null;
  select work_date into west_date from public.time_entries
  where staff_member_id = '35000000-0000-4000-8000-000000000252' and clocked_out_at is null;

  if east_date is distinct from (now() at time zone 'Etc/GMT-14')::date then
    raise exception 'FAIL: UTC+14 staff work_date % (expected %)', east_date, (now() at time zone 'Etc/GMT-14')::date;
  end if;
  if west_date is distinct from (now() at time zone 'Etc/GMT+12')::date then
    raise exception 'FAIL: UTC-12 staff work_date % (expected %)', west_date, (now() at time zone 'Etc/GMT+12')::date;
  end if;
  if east_date = west_date then
    raise exception 'FAIL: timezone-extreme staff share work_date % — location timezone is not being applied', east_date;
  end if;
  raise notice 'PASS: work_date derives from each staff member''s location timezone (% vs %)', east_date, west_date;
end $$;

-- --------------------------------------------------------------------------
-- Export agreement: approve Olivia's reconciled 3h/30m entry, then the
-- export's approved minutes must equal clocked span minus reconciled break.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000251","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  expected_minutes bigint;
  exported_minutes bigint;
begin
  perform public.rpc_batch_approve_time_entries(
    '10000000-0000-4000-8000-000000000001',
    array['36000000-0000-4000-8000-000000000255']::uuid[],
    'approved', null);

  select greatest(
    0,
    floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::bigint - entry.break_minutes
  )
  into expected_minutes
  from public.time_entries as entry
  where entry.id = '36000000-0000-4000-8000-000000000255';

  select export.approved_minutes into exported_minutes
  from public.rpc_export_approved_hours(
    '10000000-0000-4000-8000-000000000001',
    (now() at time zone 'Europe/London')::date - 1,
    (now() at time zone 'Europe/London')::date + 1
  ) as export
  where export.staff_member_id = '14000000-0000-4000-8000-000000000005';

  if exported_minutes is distinct from expected_minutes then
    raise exception 'FAIL: export minutes % disagree with the reconciled entry maths % ', exported_minutes, expected_minutes;
  end if;
  if exported_minutes < 140 or exported_minutes > 160 then
    raise exception 'FAIL: export minutes % outside the expected ~150m window for a 3h shift with a 30m break', exported_minutes;
  end if;
  raise notice 'PASS: export agrees with reconciled totals (%m for the 3h/30m entry)', exported_minutes;
end $$;

rollback;
