-- Phase 73 internal flag note privacy verification (R6).
-- Runs inside a rolled-back transaction against the local stack.
--
-- Proves:
--   1. Manager can read internal review notes (flag_note, flagged_by_membership_id) and return_note
--      directly from public.time_entries.
--   2. In public.time_entries:
--      - staff cannot read flagged entries containing manager internal notes (0 rows returned)
--      - staff can read unflagged/returned entries and see return_note
--      - staff cannot read other staff members' entries (0 rows returned)
--   3. In public.staff_portal_time_entries:
--      - staff sees all their entries (both flagged and unflagged)
--      - staff sees return_note for returned entries
--      - view does not expose flag_note or flagged_by_membership_id columns
--      - staff cannot see colleague entries

begin;

-- --------------------------------------------------------------------------
-- 1. Setup test data
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007301', 'authenticated', 'authenticated', 'p73.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007302', 'authenticated', 'authenticated', 'p73.staff1@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000007303', 'authenticated', 'authenticated', 'p73.staff2@example.com')
on conflict (id) do nothing;

insert into public.workspaces (id, name, slug, timezone)
values ('73000000-0000-4000-8000-000000000001', 'P73 Workspace', 'p73-workspace', 'Europe/London');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, joined_at)
values
  ('73000000-0000-4000-8000-000000000011', '73000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007301', 'manager', 'active', now()),
  ('73000000-0000-4000-8000-000000000012', '73000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007302', 'staff', 'active', now()),
  ('73000000-0000-4000-8000-000000000013', '73000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000007303', 'staff', 'active', now());

insert into public.staff_members (id, workspace_id, membership_id, display_name, role_name, employment_status)
values
  ('73000000-0000-4000-8000-000000000021', '73000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000011', 'Manager Mary', 'Manager', 'active'),
  ('73000000-0000-4000-8000-000000000022', '73000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000012', 'Staff Sam', 'Server', 'active'),
  ('73000000-0000-4000-8000-000000000023', '73000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000013', 'Staff Sally', 'Server', 'active');

-- Entry 1: Flagged entry for Staff Sam (contains internal review notes)
insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date,
  clocked_in_at, clocked_out_at, break_minutes, approval_status,
  flagged, flag_note, flagged_at, flagged_by_membership_id
) values (
  '73000000-0000-4000-8000-000000000031',
  '73000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000022',
  '2026-09-10',
  '2026-09-10T09:00:00Z',
  '2026-09-10T17:00:00Z',
  30,
  'pending',
  true,
  'Manager confidential flag note',
  now(),
  '73000000-0000-4000-8000-000000000011'
);

-- Entry 2: Returned entry for Staff Sam (contains return_note, NO internal flag note)
insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date,
  clocked_in_at, clocked_out_at, break_minutes, approval_status,
  return_note
) values (
  '73000000-0000-4000-8000-000000000032',
  '73000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000022',
  '2026-09-11',
  '2026-09-11T09:00:00Z',
  '2026-09-11T17:00:00Z',
  30,
  'rejected',
  'Please check your recorded break duration'
);

-- Entry 3: Entry for Staff Sally
insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date,
  clocked_in_at, clocked_out_at, break_minutes, approval_status
) values (
  '73000000-0000-4000-8000-000000000033',
  '73000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000023',
  '2026-09-10',
  '2026-09-10T09:00:00Z',
  '2026-09-10T17:00:00Z',
  30,
  'pending'
);

-- --------------------------------------------------------------------------
-- 2. Manager Persona: Can read flag_note and return_note from time_entries
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007301","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_rec record;
begin
  select flagged, flag_note, flagged_by_membership_id, return_note
  into v_rec
  from public.time_entries
  where id = '73000000-0000-4000-8000-000000000031';

  if not v_rec.flagged or v_rec.flag_note <> 'Manager confidential flag note' then
    raise exception 'FAIL: manager did not see flag_note in time_entries';
  end if;

  if v_rec.flagged_by_membership_id <> '73000000-0000-4000-8000-000000000011'::uuid then
    raise exception 'FAIL: manager did not see flagged_by_membership_id';
  end if;

  select return_note into v_rec
  from public.time_entries
  where id = '73000000-0000-4000-8000-000000000032';

  if v_rec.return_note <> 'Please check your recorded break duration' then
    raise exception 'FAIL: manager did not see return_note in time_entries';
  end if;

  raise notice 'PASS: manager sees all columns in time_entries';
end $$;

-- --------------------------------------------------------------------------
-- 3. Staff Sam Persona: Internal flag note is private, return_note is visible
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000007302","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_rec record;
  v_count integer;
begin
  -- A. Flagged entry: Staff Sam gets 0 rows from public.time_entries
  select count(*) into v_count
  from public.time_entries
  where id = '73000000-0000-4000-8000-000000000031';

  if v_count <> 0 then
    raise exception 'FAIL: staff could query flagged entry with internal notes directly from time_entries';
  end if;
  raise notice 'PASS: staff direct select of flagged entry with internal notes returned 0 rows';

  -- B. Returned entry: Staff Sam CAN query directly from time_entries and read return_note
  select return_note into v_rec
  from public.time_entries
  where id = '73000000-0000-4000-8000-000000000032';

  if v_rec.return_note <> 'Please check your recorded break duration' then
    raise exception 'FAIL: staff could not read return_note from time_entries';
  end if;
  raise notice 'PASS: staff direct select of return_note succeeded';

  -- C. Colleague entry: Staff Sam cannot read Staff Sally's entry
  select count(*) into v_count
  from public.time_entries
  where id = '73000000-0000-4000-8000-000000000033';

  if v_count <> 0 then
    raise exception 'FAIL: staff could query colleague entry from time_entries';
  end if;
  raise notice 'PASS: staff cannot query colleague entry from time_entries';

  -- D. Staff Portal View: Staff Sam sees BOTH of their own entries
  select count(*) into v_count
  from public.staff_portal_time_entries
  where workspace_id = '73000000-0000-4000-8000-000000000001';

  if v_count <> 2 then
    raise exception 'FAIL: staff portal view returned % entries (expected 2)', v_count;
  end if;
  raise notice 'PASS: staff portal view returned both staff entries';

  -- E. Staff Portal View: exposes return_note for returned entry
  select return_note, approval_status into v_rec
  from public.staff_portal_time_entries
  where time_entry_id = '73000000-0000-4000-8000-000000000032';

  if v_rec.return_note <> 'Please check your recorded break duration' or v_rec.approval_status <> 'rejected' then
    raise exception 'FAIL: staff portal view did not expose return_note or rejection status';
  end if;
  raise notice 'PASS: staff portal view exposed return_note';

  -- F. Staff Portal View: Staff Sam cannot see Staff Sally's entry
  select count(*) into v_count
  from public.staff_portal_time_entries
  where time_entry_id = '73000000-0000-4000-8000-000000000033';

  if v_count <> 0 then
    raise exception 'FAIL: staff saw colleague entry in staff_portal_time_entries';
  end if;
  raise notice 'PASS: staff portal view scopes to caller';
end $$;

-- --------------------------------------------------------------------------
-- 4. Verify staff_portal_time_entries does NOT expose flag_note columns
-- --------------------------------------------------------------------------
reset role;

do $$
declare
  v_col_count integer;
begin
  select count(*) into v_col_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'staff_portal_time_entries'
    and column_name in ('flag_note', 'flagged_by_membership_id', 'flagged_at');

  if v_col_count <> 0 then
    raise exception 'FAIL: staff_portal_time_entries view contains internal flag columns';
  end if;
  raise notice 'PASS: staff_portal_time_entries excludes internal flag columns';
end $$;

rollback;
