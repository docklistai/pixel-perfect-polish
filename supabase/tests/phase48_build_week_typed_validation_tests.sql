-- Phase 48 typed operation validation. Runs inside one rolled-back transaction
-- against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase48_build_week_typed_validation_tests.sql
--
-- Phase 47 rendered the proposal side of a signature from raw JSON text and the
-- stored side from typed database values, so an equivalent-but-differently-
-- spelled value refused a legitimate assign-open. Phase 48 parses every
-- operation into database types once and renders both sides through one
-- builder. Proven here:
--
--   * equivalent typed uuid / date / time / integer values are accepted;
--   * seconds are refused rather than silently truncated;
--   * malformed, missing, foreign-workspace and mismatched values are refused;
--   * every refusal writes nothing at all;
--   * no existing assigned shift is altered, nothing is deleted, and nothing is
--     published;
--   * client operation order does not change the outcome.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000481',
        'authenticated', 'authenticated', 'p48.manager@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000481', 'p48-site', 'P48 Site', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481', 'Main', 'Europe/London');

insert into public.departments (id, workspace_id, name, status)
values ('43000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481', 'Kitchen', 'active');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481',
        'ad000000-0000-4000-8000-000000000481', 'owner', 'active',
        '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

-- A separate workspace, used only to supply a genuinely foreign department id.
insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000489', 'p48-other', 'P48 Other', 'Europe/London');
insert into public.departments (id, workspace_id, name, status)
values ('43000000-0000-4000-8000-000000000489', '41000000-0000-4000-8000-000000000489', 'Foreign', 'active');

-- Ana sorts below Ben. The order-independence case relies on that.
insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values
  ('46000000-0000-4000-8000-0000000004a1', '41000000-0000-4000-8000-000000000481', 'Ana Chef', 'Chef', '43000000-0000-4000-8000-000000000481', 'active', 2400),
  ('46000000-0000-4000-8000-0000000004b1', '41000000-0000-4000-8000-000000000481', 'Ben Chef', 'Chef', '43000000-0000-4000-8000-000000000481', 'active', 2400);

-- Target draft week, Monday 2026-08-03.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', '2026-08-03', 'draft');

-- One manager-made assignment that must survive untouched, and one open shift
-- for the assign-open cases.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values
  ('47000000-0000-4000-8000-0000000004c1', '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', '43000000-0000-4000-8000-000000000481', '46000000-0000-4000-8000-0000000004a1',
   '2026-08-03', '2026-08-03 09:00:00+01', '2026-08-03 17:00:00+01', 30, 'Chef', 'scheduled'),
  ('47000000-0000-4000-8000-0000000004c2', '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', '43000000-0000-4000-8000-000000000481', null,
   '2026-08-04', '2026-08-04 09:00:00+01', '2026-08-04 17:00:00+01', 30, 'Chef', 'open');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000481","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Stamps and applies in one step, exactly as the product does: the fingerprint
-- is always issued against the world as it stands immediately before the apply,
-- so a refusal here is never a staleness artefact.
create function pg_temp.p48_apply(p_week uuid, p_ops jsonb)
returns jsonb language plpgsql as $$
declare
  stamp jsonb;
begin
  stamp := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000481', p_week, '{"kind":"current-week"}'::jsonb, p_ops);
  return public.rpc_apply_build_week_proposal(
    '41000000-0000-4000-8000-000000000481', p_week,
    stamp->>'fingerprint', stamp->>'digest', '{"kind":"current-week"}'::jsonb, p_ops);
end;
$$;

-- Returns the refusal SQLSTATE, or 'APPLIED' when the proposal went through.
-- The nested block rolls the whole attempt back, which is what makes the
-- "wrote nothing" assertions after each case meaningful.
create function pg_temp.p48_refusal(p_week uuid, p_ops jsonb)
returns text language plpgsql as $$
begin
  perform pg_temp.p48_apply(p_week, p_ops);
  return 'APPLIED';
exception when others then
  return sqlstate;
end;
$$;

create function pg_temp.p48_shift_count() returns integer language sql as $$
  select count(*)::integer from public.shifts
  where workspace_id = '41000000-0000-4000-8000-000000000481';
$$;

-- The manager-made assignment, as one comparable value.
create function pg_temp.p48_protected_shift() returns text language sql as $$
  select concat_ws('|', s.staff_member_id, s.assignment_status, s.starts_at, s.ends_at,
                   s.role_name, s.break_minutes, s.shift_date)
  from public.shifts as s where s.id = '47000000-0000-4000-8000-0000000004c1';
$$;

create function pg_temp.p48_sig(
  p_date text, p_start text, p_end text, p_dept text, p_loc text, p_break jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'workDate', p_date, 'startLocal', p_start, 'endLocal', p_end,
    'overnight', false, 'roleKey', 'chef',
    'departmentId', p_dept, 'locationId', p_loc, 'breakMinutes', p_break);
$$;

-- A create-assigned operation for one staff member on one date.
create function pg_temp.p48_assign_op(p_staff uuid, p_date text)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'kind', 'create-assigned', 'roleName', 'Chef', 'staffId', p_staff,
    'reason', 'fixture',
    'signature', pg_temp.p48_sig(p_date, '09:00', '17:00',
      '43000000-0000-4000-8000-000000000481',
      '42000000-0000-4000-8000-000000000481', to_jsonb(30)));
$$;

-- The shape of a day's assignments, with the date deliberately excluded so two
-- days can be compared for structural equality.
create function pg_temp.p48_day_shape(p_date date) returns text language sql as $$
  select string_agg(
    concat_ws('|', s.staff_member_id, s.assignment_status, s.role_name, s.break_minutes,
      to_char(s.starts_at at time zone 'Europe/London', 'HH24:MI'),
      to_char(s.ends_at at time zone 'Europe/London', 'HH24:MI')),
    E'\n' order by s.staff_member_id)
  from public.shifts as s
  where s.rota_week_id = '45000000-0000-4000-8000-000000000481' and s.shift_date = p_date;
$$;

-- ---------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------
do $$
declare
  baseline_shifts integer;
  baseline_protected text;
  baseline_ids uuid[];
  result text;
  applied jsonb;
  ascending_rows text;
  descending_rows text;
  assign_open_ops jsonb;
begin
  baseline_shifts := pg_temp.p48_shift_count();
  baseline_protected := pg_temp.p48_protected_shift();
  select array_agg(id order by id) into baseline_ids from public.shifts
  where workspace_id = '41000000-0000-4000-8000-000000000481';

  -- 1. Malformed uuid: the department id is not a uuid at all.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'create-open', 'roleName', 'Chef', 'reason', 'fixture',
      'signature', pg_temp.p48_sig('2026-08-05', '09:00', '17:00',
        'not-a-uuid', '42000000-0000-4000-8000-000000000481', to_jsonb(30)))));
  if result <> '55000' then
    raise exception 'FAIL: a malformed uuid was not refused as 55000 (got %)', result;
  end if;
  if pg_temp.p48_shift_count() <> baseline_shifts then
    raise exception 'FAIL: the malformed-uuid refusal wrote rows';
  end if;
  raise notice 'PASS: refused — a department id that is not a uuid, writing nothing';

  -- 2. Malformed date: 30 February parses as a date shape but is not a date.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'create-open', 'roleName', 'Chef', 'reason', 'fixture',
      'signature', pg_temp.p48_sig('2026-02-30', '09:00', '17:00',
        '43000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', to_jsonb(30)))));
  if result <> '55000' then
    raise exception 'FAIL: an impossible date was not refused as 55000 (got %)', result;
  end if;
  if pg_temp.p48_shift_count() <> baseline_shifts then
    raise exception 'FAIL: the impossible-date refusal wrote rows';
  end if;
  raise notice 'PASS: refused — an impossible calendar date, writing nothing';

  -- 3. Malformed time.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'create-open', 'roleName', 'Chef', 'reason', 'fixture',
      'signature', pg_temp.p48_sig('2026-08-05', '25:00', '17:00',
        '43000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', to_jsonb(30)))));
  if result <> '55000' then
    raise exception 'FAIL: an out-of-range time was not refused as 55000 (got %)', result;
  end if;
  raise notice 'PASS: refused — an out-of-range local time';

  -- 4. Non-integer break minutes.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'create-open', 'roleName', 'Chef', 'reason', 'fixture',
      'signature', pg_temp.p48_sig('2026-08-05', '09:00', '17:00',
        '43000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481',
        to_jsonb('half an hour'::text)))));
  if result <> '55000' then
    raise exception 'FAIL: a non-integer break was not refused as 55000 (got %)', result;
  end if;
  raise notice 'PASS: refused — a break length that is not an integer';

  -- 5. Missing required key. Phase 47 let this through: a NULL workDate made
  --    `work_date < week_start` evaluate to NULL rather than true.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'create-open', 'roleName', 'Chef', 'reason', 'fixture',
      'signature', jsonb_build_object(
        'startLocal', '09:00', 'endLocal', '17:00', 'overnight', false, 'roleKey', 'chef',
        'departmentId', '43000000-0000-4000-8000-000000000481',
        'locationId', '42000000-0000-4000-8000-000000000481', 'breakMinutes', 30))));
  if result <> '55000' then
    raise exception 'FAIL: a missing workDate was not refused as 55000 (got %)', result;
  end if;
  if pg_temp.p48_shift_count() <> baseline_shifts then
    raise exception 'FAIL: the missing-workDate refusal wrote rows';
  end if;
  raise notice 'PASS: refused — a signature with no workDate, writing nothing';

  -- 6. Seconds are refused, not truncated to HH24:MI.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'create-open', 'roleName', 'Chef', 'reason', 'fixture',
      'signature', pg_temp.p48_sig('2026-08-05', '09:00:30', '17:00',
        '43000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', to_jsonb(30)))));
  if result <> '55000' then
    raise exception 'FAIL: a time carrying seconds was not refused as 55000 (got %)', result;
  end if;
  raise notice 'PASS: refused — a local time carrying seconds';

  -- 7. A department belonging to another workspace.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'create-open', 'roleName', 'Chef', 'reason', 'fixture',
      'signature', pg_temp.p48_sig('2026-08-05', '09:00', '17:00',
        '43000000-0000-4000-8000-000000000489', '42000000-0000-4000-8000-000000000481', to_jsonb(30)))));
  if result <> '55000' then
    raise exception 'FAIL: a foreign-workspace department was not refused as 55000 (got %)', result;
  end if;
  if pg_temp.p48_shift_count() <> baseline_shifts then
    raise exception 'FAIL: the foreign-department refusal wrote rows';
  end if;
  raise notice 'PASS: refused — a department from another workspace, writing nothing';

  -- 8. A non-object element in the operation array.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(to_jsonb('not an operation'::text)));
  if result <> '22023' then
    raise exception 'FAIL: a non-object operation was not refused as 22023 (got %)', result;
  end if;
  raise notice 'PASS: refused — an operation element that is not an object';

  -- 9. assign-open whose signature does not match the stored shift.
  result := pg_temp.p48_refusal('45000000-0000-4000-8000-000000000481',
    jsonb_build_array(jsonb_build_object(
      'kind', 'assign-open', 'staffId', '46000000-0000-4000-8000-0000000004b1',
      'shiftId', '47000000-0000-4000-8000-0000000004c2', 'reason', 'fixture',
      'expected', pg_temp.p48_sig('2026-08-04', '10:00', '17:00',
        '43000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', to_jsonb(30)))));
  if result <> '55000' then
    raise exception 'FAIL: a mismatched assign-open signature was not refused (got %)', result;
  end if;
  if pg_temp.p48_shift_count() <> baseline_shifts then
    raise exception 'FAIL: the mismatched-signature refusal wrote rows';
  end if;
  raise notice 'PASS: refused — an assign-open whose signature does not match the stored shift';

  -- 10. THE PHASE 48 FIX. The same assign-open, spelled differently but equal
  --     once typed: uppercase uuids, an unpadded hour, an unpadded month/day,
  --     and seconds-free times. Phase 47 refused this; it must now apply.
  assign_open_ops := jsonb_build_array(jsonb_build_object(
    'kind', 'assign-open', 'staffId', '46000000-0000-4000-8000-0000000004b1',
    'shiftId', '47000000-0000-4000-8000-0000000004c2', 'reason', 'fixture',
    'expected', jsonb_build_object(
      'workDate', '2026-8-4', 'startLocal', '9:00', 'endLocal', '17:00',
      'overnight', false, 'roleKey', 'chef',
      'departmentId', upper('43000000-0000-4000-8000-000000000481'),
      'locationId', upper('42000000-0000-4000-8000-000000000481'),
      'breakMinutes', 30)));

  applied := pg_temp.p48_apply('45000000-0000-4000-8000-000000000481', assign_open_ops);
  if (applied->>'assigned_existing')::integer <> 1 then
    raise exception 'FAIL: the equivalently-spelled assign-open did not apply (%)', applied;
  end if;
  if (select staff_member_id from public.shifts where id = '47000000-0000-4000-8000-0000000004c2')
     is distinct from '46000000-0000-4000-8000-0000000004b1' then
    raise exception 'FAIL: the open shift was not assigned to the expected staff member';
  end if;
  raise notice 'PASS: uppercase uuids, "9:00" and "2026-8-4" are accepted as typed equals';

  -- 11. The manager-made assignment is untouched by everything above.
  if pg_temp.p48_protected_shift() is distinct from baseline_protected then
    raise exception 'FAIL: the pre-existing assigned shift was altered';
  end if;
  raise notice 'PASS: the pre-existing assigned shift is byte-identical';

  -- 12. Nothing was deleted.
  if exists (
    select 1 from unnest(baseline_ids) as b(id)
    where not exists (select 1 from public.shifts as s where s.id = b.id)
  ) then
    raise exception 'FAIL: a shift that existed before the run has been deleted';
  end if;
  raise notice 'PASS: no shift was deleted';

  -- 13. Nothing was published.
  if exists (select 1 from public.published_rota_snapshots
             where workspace_id = '41000000-0000-4000-8000-000000000481') then
    raise exception 'FAIL: a published snapshot was created';
  end if;
  raise notice 'PASS: no publication occurred';

  -- 14. Client operation order cannot change the outcome. The same pair of
  --     assignments is submitted twice — once in ascending staff order, once in
  --     descending — onto two different days of the same week. Lock order is
  --     decided by the RPC from the parsed set, not by the list, so the two days
  --     must come out structurally identical. Separate days are used because the
  --     overlap check is workspace-wide: the same person cannot hold two shifts
  --     at the same time anywhere, which is correct and unrelated to ordering.
  perform pg_temp.p48_apply('45000000-0000-4000-8000-000000000481', jsonb_build_array(
    pg_temp.p48_assign_op('46000000-0000-4000-8000-0000000004a1', '2026-08-06'),
    pg_temp.p48_assign_op('46000000-0000-4000-8000-0000000004b1', '2026-08-06')));

  perform pg_temp.p48_apply('45000000-0000-4000-8000-000000000481', jsonb_build_array(
    pg_temp.p48_assign_op('46000000-0000-4000-8000-0000000004b1', '2026-08-07'),
    pg_temp.p48_assign_op('46000000-0000-4000-8000-0000000004a1', '2026-08-07')));

  ascending_rows := pg_temp.p48_day_shape('2026-08-06');
  descending_rows := pg_temp.p48_day_shape('2026-08-07');

  if ascending_rows is null or ascending_rows is distinct from descending_rows then
    raise exception 'FAIL: operation order changed the outcome (% vs %)',
      ascending_rows, descending_rows;
  end if;
  raise notice 'PASS: ascending and descending operation order produce identical results';

  -- 15. Exactly one audit event per successful apply — three succeeded above,
  --     and none of the many refusals may have left one behind.
  if (select count(*) from public.audit_events
      where workspace_id = '41000000-0000-4000-8000-000000000481'
        and action = 'rota_week.built') <> 3 then
    raise exception 'FAIL: expected 3 build audit events, got %',
      (select count(*) from public.audit_events
       where workspace_id = '41000000-0000-4000-8000-000000000481'
         and action = 'rota_week.built');
  end if;
  raise notice 'PASS: one audit event per successful apply, none from a refusal';
end
$$;

-- ---------------------------------------------------------------------------
-- Privilege: the parsed-operation type is internal.
--
-- Postgres grants USAGE on a new type to PUBLIC by default. These assertions
-- are paired deliberately: proving the type is locked down is only meaningful
-- alongside proof that the manager RPC still works, because a SECURITY DEFINER
-- function's access comes from its owner, not from the ACL.
-- ---------------------------------------------------------------------------
do $$
declare
  applied jsonb;
begin
  if has_type_privilege('authenticated', 'public.build_week_operation', 'USAGE') then
    raise exception 'FAIL: authenticated can use the internal parsed-operation type';
  end if;
  if has_type_privilege('anon', 'public.build_week_operation', 'USAGE') then
    raise exception 'FAIL: anon can use the internal parsed-operation type';
  end if;
  if has_type_privilege('public', 'public.build_week_operation', 'USAGE') then
    raise exception 'FAIL: PUBLIC still holds the default USAGE grant on the type';
  end if;
  raise notice 'PASS: build_week_operation USAGE is revoked from PUBLIC, anon and authenticated';

  -- The owner still holds it implicitly, so the definer RPC keeps working.
  if not has_type_privilege('postgres', 'public.build_week_operation', 'USAGE') then
    raise exception 'FAIL: the type owner lost USAGE on its own type';
  end if;

  -- And prove it end to end rather than by inference: a real apply, as the
  -- manager, after the revoke.
  applied := pg_temp.p48_apply('45000000-0000-4000-8000-000000000481', jsonb_build_array(
    pg_temp.p48_assign_op('46000000-0000-4000-8000-0000000004a1', '2026-08-08')));
  if (applied->>'created_assigned')::integer <> 1 then
    raise exception 'FAIL: the manager RPC stopped working after the type revoke (%)', applied;
  end if;
  raise notice 'PASS: the manager RPC remains callable and functional after the revoke';
end
$$;

rollback;
