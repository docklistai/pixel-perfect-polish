-- Phase 46 export audit integrity verification. Rolled-back transaction
-- against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase46_export_audit_integrity_tests.sql
--
-- Fixtures: seeded Harbour View workspace, manager membership 13…011.

begin;

insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date,
  clocked_in_at, clocked_out_at, break_minutes,
  approval_status, approved_at, approved_by_membership_id
) values
  ('e4600000-0000-4000-8000-000000004601', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-01T09:00:00Z', '2099-03-01T17:00:00Z', 30, 'approved', now(), '13000000-0000-4000-8000-000000000011'),
  ('e4600000-0000-4000-8000-000000004602', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002', '2099-03-02', '2099-03-02T10:00:00Z', '2099-03-02T18:00:00Z', 60, 'approved', now(), '13000000-0000-4000-8000-000000000011'),
  ('e4600000-0000-4000-8000-000000004603', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2099-03-03', '2099-03-03T09:00:00Z', '2099-03-03T12:00:00Z', 0, 'pending', null, null);

select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

-- --------------------------------------------------------------------------
-- 1. Preview returns rows and a signature, and writes NO audit — however many
--    times it is opened, refetched or cancelled.
-- --------------------------------------------------------------------------
do $$
declare
  audits_before integer;
  audits_after integer;
  preview_rows integer;
  signature_count integer;
  distinct_signatures integer;
begin
  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  -- Open, refetch, refetch again, cancel: four preview round-trips.
  perform 1 from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);
  perform 1 from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);
  perform 1 from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  select count(*), count(distinct preview_signature)
  into preview_rows, distinct_signatures
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  if audits_after <> audits_before then
    raise exception 'FAIL: preview wrote % audit event(s)', audits_after - audits_before;
  end if;
  if preview_rows <> 2 then
    raise exception 'FAIL: expected 2 approved preview rows, got %', preview_rows;
  end if;
  if distinct_signatures <> 1 then
    raise exception 'FAIL: preview returned % distinct signatures', distinct_signatures;
  end if;

  select count(*) into signature_count
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null)
  where preview_signature is null or preview_signature = '';
  if signature_count > 0 then
    raise exception 'FAIL: preview returned an empty signature';
  end if;

  raise notice 'PASS: preview/refetch/cancel wrote zero export audits';
end $$;

-- --------------------------------------------------------------------------
-- 2. Download with the reviewed signature writes exactly one audit, and its
--    rows match the preview exactly.
-- --------------------------------------------------------------------------
do $$
declare
  reviewed_signature text;
  audits_before integer;
  audits_after integer;
  mismatched integer;
  recorded_confirm boolean;
begin
  select distinct preview_signature into reviewed_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  select count(*) into mismatched
  from (
    select staff_member_id, display_name, role_name, department_name,
           entry_count, approved_minutes, approved_hours
    from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, reviewed_signature)
    except
    select staff_member_id, display_name, role_name, department_name,
           entry_count, approved_minutes, approved_hours
    from public.rpc_preview_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null)
  ) as drift;

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  if mismatched <> 0 then
    raise exception 'FAIL: downloaded rows differ from the reviewed preview';
  end if;
  if audits_after - audits_before <> 1 then
    raise exception 'FAIL: download wrote % audit events, expected 1', audits_after - audits_before;
  end if;

  select (details ->> 'confirmed_download')::boolean into recorded_confirm
  from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported'
  order by occurred_at desc, id desc
  limit 1;
  if recorded_confirm is not true then
    raise exception 'FAIL: audit event did not record confirmed download intent';
  end if;

  raise notice 'PASS: confirmed download wrote exactly one audit matching the preview';
end $$;

-- --------------------------------------------------------------------------
-- 3. Double-click: an identical repeat inside the window returns the same rows
--    without recording a second, misleading export.
-- --------------------------------------------------------------------------
do $$
declare
  reviewed_signature text;
  audits_before integer;
  audits_after integer;
  repeat_rows integer;
begin
  select distinct preview_signature into reviewed_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  select count(*) into repeat_rows
  from public.rpc_export_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, reviewed_signature);

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  if repeat_rows <> 2 then
    raise exception 'FAIL: repeat download returned % rows', repeat_rows;
  end if;
  if audits_after <> audits_before then
    raise exception 'FAIL: double-click wrote % duplicate audit(s)', audits_after - audits_before;
  end if;
  raise notice 'PASS: double-click produced no duplicate audit';
end $$;

-- --------------------------------------------------------------------------
-- 4. A signature that does not match writes no audit and returns no rows.
-- --------------------------------------------------------------------------
do $$
declare
  audits_before integer;
  audits_after integer;
begin
  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  begin
    perform 1 from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null,
      'deadbeefdeadbeefdeadbeefdeadbeef');
    raise exception 'FAIL: a mismatched signature was accepted';
  exception when sqlstate '55000' then
    raise notice 'PASS: mismatched signature rejected (55000)';
  end;

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';
  if audits_after <> audits_before then
    raise exception 'FAIL: mismatched signature still wrote an audit';
  end if;
  raise notice 'PASS: mismatched signature wrote no audit';
end $$;

-- --------------------------------------------------------------------------
-- 5. A missing signature is refused outright.
-- --------------------------------------------------------------------------
do $$
declare
  audits_before integer;
  audits_after integer;
begin
  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  begin
    perform 1 from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, '   ');
    raise exception 'FAIL: an empty signature was accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: empty signature rejected (22023)';
  end;

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';
  if audits_after <> audits_before then
    raise exception 'FAIL: empty signature still wrote an audit';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 6. Data drift invalidates a stale signature: the manager must review again.
-- --------------------------------------------------------------------------
do $$
declare
  stale_signature text;
  fresh_signature text;
  audits_before integer;
  audits_after integer;
begin
  select distinct preview_signature into stale_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  -- Exported content changes after the preview was taken. A manager renaming a
  -- staff member is the smallest realistic drift that is also within manager
  -- privileges — direct time_entries writes are correctly forbidden (phase 42),
  -- and since phase 45 a direct staff_members UPDATE is too, so this goes
  -- through the manager edit RPC exactly as the dialog does.
  perform public.rpc_update_staff_member(
    '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001',
    'Sophie Carter (renamed mid-preview)', 'sophie.carter@harbourview.co.uk', null, 'FOH Supervisor',
    '12000000-0000-4000-8000-000000000001', 'part_time', 1920, null);

  select distinct preview_signature into fresh_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  if fresh_signature = stale_signature then
    raise exception 'FAIL: signature did not change when the data changed';
  end if;

  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  begin
    perform 1 from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, stale_signature);
    raise exception 'FAIL: a stale signature was accepted after data drift';
  exception when sqlstate '55000' then
    raise notice 'PASS: stale signature rejected after data drift (55000)';
  end;

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';
  if audits_after <> audits_before then
    raise exception 'FAIL: stale download still wrote an audit';
  end if;
  raise notice 'PASS: drift rejection wrote no audit';
end $$;

-- --------------------------------------------------------------------------
-- 7. Department scoping still works, and its signature differs from the
--    whole-workspace scope for the same dates.
-- --------------------------------------------------------------------------
do $$
declare
  workspace_signature text;
  department_signature text;
begin
  select distinct preview_signature into workspace_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);
  select distinct preview_signature into department_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31',
    '12000000-0000-4000-8000-000000000002');

  if department_signature is null or department_signature = workspace_signature then
    raise exception 'FAIL: department scope shares the workspace signature';
  end if;
  raise notice 'PASS: department scope produces a distinct signature';
end $$;

-- --------------------------------------------------------------------------
-- 8. An unknown department is still refused by the shared row builder.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    perform 1 from public.rpc_preview_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31',
      '00000000-0000-4000-8000-0000000000ff');
    raise exception 'FAIL: unknown department accepted by preview';
  exception when sqlstate 'P0002' then
    raise notice 'PASS: preview rejects an unknown department (P0002)';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 9. The retained four-argument overload still audits on call.
-- --------------------------------------------------------------------------
do $$
declare
  audits_before integer;
  audits_after integer;
begin
  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  perform 1 from public.rpc_export_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';
  if audits_after - audits_before <> 1 then
    raise exception 'FAIL: legacy overload wrote % audits', audits_after - audits_before;
  end if;
  raise notice 'PASS: retained overload keeps its audit-on-call behaviour';
end $$;

-- --------------------------------------------------------------------------
-- 10. Staff and anonymous callers cannot preview or export.
-- --------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform 1 from public.rpc_preview_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);
    raise exception 'FAIL: a non-manager previewed approved hours';
  exception when sqlstate '42501' then
    raise notice 'PASS: non-manager preview blocked (42501)';
  end;
end $$;

select set_config('request.jwt.claims', '', true);
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.rpc_preview_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);
    raise exception 'FAIL: anonymous previewed approved hours';
  exception when sqlstate '42501' then
    raise notice 'PASS: anonymous preview blocked (42501)';
  end;
end $$;

reset role;

-- --------------------------------------------------------------------------
-- 11. Signature encoding is collision-safe against control characters.
--
--     This does NOT reproduce a previously shipped implementation. No released
--     DocklistAI migration ever defined this signature function; a delimiter
--     encoding — fields joined with chr(31), rows with chr(30) — was drafted
--     and rejected while phase 46 was being developed, and the committed design
--     is canonical JSONB throughout.
--
--     The rejected draft is reconstructed inline below purely to demonstrate
--     why delimiter encoding is unsafe, and to stop anyone reintroducing it. It
--     was justified by a claim that rpc_internal_csv_safe strips control
--     characters — it does not, it only flattens CR/LF. A display name
--     containing chr(31) can therefore move a field boundary and make two
--     genuinely different result sets hash the same. This asserts both halves:
--     the reconstructed delimiter encoding does collide on these two result
--     sets, and the shipped JSONB encoding does not.
-- --------------------------------------------------------------------------
do $$
declare
  rows_a jsonb;
  rows_b jsonb;
  legacy_a text;
  legacy_b text;
  staff_id uuid := '14000000-0000-4000-8000-000000000001';
begin
  -- Same staff, same numbers. A is name "Alice<US>Chef" with role "Kitchen";
  -- B is name "Alice" with role "Chef<US>Kitchen". Different data.
  rows_a := pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_array(
      staff_id, 'Alice' || chr(31) || 'Chef', 'Kitchen', 'Front', 1::bigint, 60::bigint, 1.00));
  rows_b := pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_array(
      staff_id, 'Alice', 'Chef' || chr(31) || 'Kitchen', 'Front', 1::bigint, 60::bigint, 1.00));

  if rows_a = rows_b then
    raise exception 'FAIL: the two probe result sets are not actually different';
  end if;

  -- What the rejected draft encoding would have produced for each.
  legacy_a := pg_catalog.concat_ws(chr(31), staff_id::text, 'Alice' || chr(31) || 'Chef',
    'Kitchen', 'Front', '1', '60', '1.00');
  legacy_b := pg_catalog.concat_ws(chr(31), staff_id::text, 'Alice',
    'Chef' || chr(31) || 'Kitchen', 'Front', '1', '60', '1.00');
  if legacy_a is distinct from legacy_b then
    raise exception 'FAIL: the delimiter encoding did not collide, so this is not the right probe';
  end if;
  raise notice 'PASS: the rejected draft delimiter encoding collided on these two result sets';

  if public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, rows_a)
     = public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, rows_b) then
    raise exception 'FAIL: control characters still collide two different result sets';
  end if;
  raise notice 'PASS: JSONB encoding gives the two result sets different signatures';

  -- chr(30), the old record separator, cannot merge or split rows either.
  if public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null,
       pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_array(
         staff_id, 'A' || chr(30) || 'B', 'R', 'D', 1::bigint, 60::bigint, 1.00)))
     = public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null,
       pg_catalog.jsonb_build_array(
         pg_catalog.jsonb_build_array(staff_id, 'A', 'R', 'D', 1::bigint, 60::bigint, 1.00),
         pg_catalog.jsonb_build_array(staff_id, 'B', 'R', 'D', 1::bigint, 60::bigint, 1.00))) then
    raise exception 'FAIL: a record separator merged two rows into one signature';
  end if;
  raise notice 'PASS: a record separator cannot forge a row boundary';

  -- NULL and empty string produce different output, so they must differ here.
  if public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null,
       pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_array(
         staff_id, 'A', 'R', null, 1::bigint, 60::bigint, 1.00)))
     = public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null,
       pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_array(
         staff_id, 'A', 'R', '', 1::bigint, 60::bigint, 1.00))) then
    raise exception 'FAIL: a null department is indistinguishable from an empty one';
  end if;
  raise notice 'PASS: null and empty string are distinguishable';

  -- The filters are part of the signature, not just the rows.
  if public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, rows_a)
     = public.rpc_internal_approved_hours_signature(
       '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-30', null, rows_a) then
    raise exception 'FAIL: the date range is not part of the signature';
  end if;
  raise notice 'PASS: filter inputs are part of the signature';
end $$;

-- A control character in real data must still change the real signature.
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  before_signature text;
  after_signature text;
  audits_before integer;
  audits_after integer;
begin
  select distinct preview_signature into before_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  perform public.rpc_update_staff_member(
    '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001',
    'Sophie' || chr(31) || 'Carter', 'sophie.carter@harbourview.co.uk', null, 'FOH Supervisor',
    '12000000-0000-4000-8000-000000000001', 'part_time', 1920, null);

  select distinct preview_signature into after_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  if after_signature = before_signature then
    raise exception 'FAIL: a control character in a name did not change the signature';
  end if;

  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';
  begin
    perform 1 from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, before_signature);
    raise exception 'FAIL: the pre-rename signature was accepted';
  exception when sqlstate '55000' then
    null;
  end;
  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';
  if audits_after <> audits_before then
    raise exception 'FAIL: the refused control-character export wrote an audit';
  end if;
  raise notice 'PASS: control characters in real data change the signature and still fail closed';
end $$;

reset role;

-- --------------------------------------------------------------------------
-- 12. The audited export reads the data exactly once.
--
--     DDL is transactional, so the shared builder is renamed aside and replaced
--     with a counting delegate for the length of this check; the surrounding
--     rollback restores it. The shipped gate 3 export read the data twice — one
--     statement for the audited counts, a second for the returned rows — so it
--     would report 2, each read taking its own READ COMMITTED snapshot. The
--     rejected phase 46 draft would have reported 3, adding a third read for the
--     signature. It must report exactly 1 call, which is what makes the audited
--     signature and counts provably describe the rows returned.
-- --------------------------------------------------------------------------
create temp table p46_builder_calls (calls integer not null);
insert into p46_builder_calls values (0);
-- The probe runs while the session role is 'authenticated', so it needs access
-- to the counter. Temp objects vanish with the connection.
grant select, update on pg_temp.p46_builder_calls to authenticated;

alter function public.rpc_internal_approved_hours_rows(uuid, date, date, uuid)
  rename to rpc_internal_approved_hours_rows_probe_original;

-- The delegate is VOLATILE where the original is STABLE, because a
-- non-volatile function may not perform DML. That only ever makes the planner
-- call it more often, never fewer times, so "exactly 1" remains a sound proof
-- of single materialisation. Temp objects are schema-qualified because the
-- callers run with search_path = ''.
create function public.rpc_internal_approved_hours_rows(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric
)
language plpgsql
volatile
as $$
begin
  update pg_temp.p46_builder_calls set calls = calls + 1;
  return query select * from public.rpc_internal_approved_hours_rows_probe_original(
    p_workspace_id, p_start_date, p_end_date, p_department_id);
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  reviewed_signature text;
  call_count integer;
  returned_rows integer;
  audits_before integer;
  audits_after integer;
  audited_staff integer;
  audited_entries integer;
  actual_staff integer;
  actual_entries integer;
begin
  select distinct preview_signature into reviewed_signature
  from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);

  select count(*) into audits_before from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  update pg_temp.p46_builder_calls set calls = 0;

  create temp table p46_downloaded on commit drop as
  select * from public.rpc_export_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null, reviewed_signature);

  select calls into call_count from pg_temp.p46_builder_calls;
  select count(*) into returned_rows from p46_downloaded;
  select count(*) into audits_after from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported';

  if call_count <> 1 then
    raise exception 'FAIL: the audited export read the data % times, expected 1', call_count;
  end if;
  raise notice 'PASS: the audited export captures the result exactly once';

  if audits_after - audits_before <> 1 then
    raise exception 'FAIL: single-capture export wrote % audits', audits_after - audits_before;
  end if;

  -- The audit metadata must describe the rows that were actually returned.
  select (details ->> 'staff_count')::integer, (details ->> 'entry_count')::integer
  into audited_staff, audited_entries
  from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported'
  order by occurred_at desc, id desc
  limit 1;

  select count(distinct staff_member_id), coalesce(sum(entry_count), 0)
  into actual_staff, actual_entries
  from p46_downloaded;

  if audited_staff is distinct from actual_staff
     or audited_entries is distinct from actual_entries then
    raise exception 'FAIL: audit says %/% but % staff and % entries were downloaded',
      audited_staff, audited_entries, actual_staff, actual_entries;
  end if;
  if returned_rows = 0 then
    raise exception 'FAIL: the probe downloaded no rows, so it proves nothing';
  end if;
  raise notice 'PASS: the audit metadata describes exactly the rows downloaded';

  -- The preview is single-capture too.
  update pg_temp.p46_builder_calls set calls = 0;
  perform 1 from public.rpc_preview_approved_hours(
    '10000000-0000-4000-8000-000000000001', '2099-03-01', '2099-03-31', null);
  select calls into call_count from pg_temp.p46_builder_calls;
  if call_count <> 1 then
    raise exception 'FAIL: the preview read the data % times, expected 1', call_count;
  end if;
  raise notice 'PASS: the preview captures the result exactly once';
end $$;

reset role;

rollback;
