-- Phase 51 fresh-week schedule import verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase51_import_fresh_week_tests.sql
--
-- Covers: the fingerprint refactor is byte-identical to phase 47; a fresh-week
-- preview writes nothing; apply creates exactly one week plus the intended
-- shifts; a failed apply leaves neither behind; replay, staleness, digest
-- tampering, cross-workspace references, week-start alignment and the
-- manager-only boundary.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000511', 'authenticated', 'authenticated', 'p51.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000512', 'authenticated', 'authenticated', 'p51.outsider@example.com');

-- Monday-start workspace, so 2026-08-03 (a Monday) is a legal week start.
insert into public.workspaces (id, slug, name, timezone, rota_start_weekday)
values ('41000000-0000-4000-8000-000000000511', 'p51-site', 'P51 Site', 'Europe/London', 0);
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000511', '41000000-0000-4000-8000-000000000511', 'P51 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000511', '41000000-0000-4000-8000-000000000511', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000511', '41000000-0000-4000-8000-000000000511', 'ad000000-0000-4000-8000-000000000511', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values ('46000000-0000-4000-8000-00000000051a', '41000000-0000-4000-8000-000000000511', 'Ana Chef', 'Chef', '43000000-0000-4000-8000-000000000511', 'active', 2400);

-- A second workspace, used only to prove its rows are unreachable from the first.
insert into public.workspaces (id, slug, name, timezone, rota_start_weekday)
values ('41000000-0000-4000-8000-000000000521', 'p51-other', 'P51 Other', 'Europe/London', 0);
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000521', '41000000-0000-4000-8000-000000000521', 'P51 Other', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000521', '41000000-0000-4000-8000-000000000521', 'Other Kitchen');
insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values ('46000000-0000-4000-8000-00000000052a', '41000000-0000-4000-8000-000000000521', 'Other Chef', 'Chef', '43000000-0000-4000-8000-000000000521', 'active', 2400);

-- An existing week in the SAME workspace at a different week start, used by the
-- byte-identity check below. The fresh-week cases all target 2026-08-03, which
-- deliberately has no rota_weeks row.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000511', '41000000-0000-4000-8000-000000000511', '42000000-0000-4000-8000-000000000511', '2026-07-27', 'draft');
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values ('47000000-0000-4000-8000-0000000005a1', '41000000-0000-4000-8000-000000000511', '45000000-0000-4000-8000-000000000511', '42000000-0000-4000-8000-000000000511', '43000000-0000-4000-8000-000000000511', '46000000-0000-4000-8000-00000000051a',
        '2026-07-27', '2026-07-27 09:00:00+01', '2026-07-27 17:00:00+01', 30, 'Chef', 'scheduled');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000511","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function pg_temp.p51_signature(p_date text, p_start text, p_end text, p_overnight boolean)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'workDate', p_date, 'startLocal', p_start, 'endLocal', p_end,
    'overnight', p_overnight, 'roleKey', 'chef',
    'departmentId', '43000000-0000-4000-8000-000000000511',
    'locationId', '42000000-0000-4000-8000-000000000511',
    'breakMinutes', 30);
$$;

create or replace function pg_temp.p51_source()
returns jsonb language sql immutable as $$
  select jsonb_build_object('kind', 'headed-import', 'id', null,
    'contentVersion', 'rows:2', 'plannerRuleVersion', 'build-week/1');
$$;

-- Two open shifts, the operation list an import of two unassigned rows produces.
create or replace function pg_temp.p51_operations()
returns jsonb language sql stable as $$
  select jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef',
      'signature', pg_temp.p51_signature('2026-08-03', '09:00', '17:00', false),
      'reason', 'Imported from row 1'),
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef',
      'signature', pg_temp.p51_signature('2026-08-04', '12:00', '20:00', false),
      'reason', 'Imported from row 2')
  );
$$;

-- Goes through the manager-guarded wrapper, exactly as the app does.
create or replace function pg_temp.p51_stamp()
returns jsonb language sql volatile as $$
  select public.rpc_import_schedule_proposal_stamp(
    '41000000-0000-4000-8000-000000000511',
    '42000000-0000-4000-8000-000000000511',
    '2026-08-03',
    pg_temp.p51_source(),
    pg_temp.p51_operations());
$$;

create or replace function pg_temp.p51_apply(p_fingerprint text, p_digest text, p_operations jsonb)
returns jsonb language sql volatile as $$
  select public.rpc_apply_import_to_new_week(
    '41000000-0000-4000-8000-000000000511',
    '42000000-0000-4000-8000-000000000511',
    '2026-08-03',
    p_fingerprint, p_digest, pg_temp.p51_source(), p_operations);
$$;

-- One open shift from 09:00 to whatever end is asked for, written as overnight.
-- Used to walk the 16-hour boundary: '01:00' is exactly 16 hours, '01:01' is one
-- minute over, '09:00' ends when it starts and is therefore 24 hours long.
create or replace function pg_temp.p51_long_operations(p_end text)
returns jsonb language sql stable as $$
  select jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef',
      'signature', pg_temp.p51_signature('2026-08-03', '09:00', p_end, true),
      'reason', 'Imported from row 1')
  );
$$;

-- Stamps an arbitrary operation list, through the same manager-guarded wrapper
-- the app uses. The internal digest helper is revoked, so this is the only way
-- a test running as `authenticated` can obtain a genuine digest.
create or replace function pg_temp.p51_stamp_for(p_operations jsonb)
returns jsonb language sql volatile as $$
  select public.rpc_import_schedule_proposal_stamp(
    '41000000-0000-4000-8000-000000000511',
    '42000000-0000-4000-8000-000000000511',
    '2026-08-03',
    pg_temp.p51_source(),
    p_operations);
$$;

create or replace function pg_temp.p51_fresh_week_count()
returns integer language sql stable as $$
  select count(*)::integer from public.rota_weeks as rw
  where rw.workspace_id = '41000000-0000-4000-8000-000000000511'
    and rw.location_id = '42000000-0000-4000-8000-000000000511'
    and rw.week_start = '2026-08-03';
$$;

create or replace function pg_temp.p51_fresh_shift_count()
returns integer language sql stable as $$
  select count(*)::integer
  from public.shifts as s
  join public.rota_weeks as rw on rw.id = s.rota_week_id
  where rw.workspace_id = '41000000-0000-4000-8000-000000000511'
    and rw.week_start = '2026-08-03';
$$;

-- ---------------------------------------------------------------------------
-- Case 1. The refactored fingerprint is byte-identical to the phase 47 form.
--
-- Hand-assembles the flat string phase 47 built and compares md5. Without this,
-- nesting the shared context block inside the caller's concat_ws is an
-- assumption rather than a fact, and a later edit to either side could silently
-- invalidate every fingerprint ever issued.
-- ---------------------------------------------------------------------------
do $$
declare
  expected text;
  actual text;
begin
  select md5(concat_ws(
    E'\n',
    'week:' || rw.id || '|' || rw.week_start || '|' || rw.status
      || '|' || rw.location_id || '|' || coalesce(loc.timezone, 'UTC')
      || '|' || coalesce(w.rota_start_weekday, 0),
    'source:' || coalesce(pg_temp.p51_source()::text, 'null'),
    coalesce((
      select string_agg(
        shift.id || '|' || shift.shift_date || '|' || shift.starts_at || '|' || shift.ends_at
          || '|' || shift.role_name || '|' || coalesce(shift.staff_member_id::text, '-')
          || '|' || shift.department_id || '|' || shift.break_minutes
          || '|' || shift.assignment_status,
        E'\n' order by shift.id)
      from public.shifts as shift
      where shift.workspace_id = rw.workspace_id and shift.rota_week_id = rw.id
    ), 'shifts:none'),
    coalesce((
      select string_agg(
        staff.id || '|' || staff.employment_status || '|' || coalesce(staff.role_name, '-')
          || '|' || coalesce(staff.department_id::text, '-')
          || '|' || coalesce(staff.contracted_minutes_per_week::text, '-'),
        E'\n' order by staff.id)
      from public.staff_members as staff
      where staff.workspace_id = rw.workspace_id
    ), 'staff:none'),
    coalesce((
      select string_agg(
        lr.id || '|' || lr.staff_member_id || '|' || lr.start_date || '|' || lr.end_date
          || '|' || lr.status,
        E'\n' order by lr.id)
      from public.leave_requests as lr
      where lr.workspace_id = rw.workspace_id
        and lr.status in ('approved', 'pending')
        and lr.end_date >= rw.week_start
        and lr.start_date <= rw.week_start + 7
    ), 'leave:none'),
    coalesce((
      select string_agg(d.staff_member_id || '|' || d.weekday, E'\n'
        order by d.staff_member_id, d.weekday)
      from public.staff_recurring_day_off_requests as d
      where d.workspace_id = rw.workspace_id and d.status = 'approved'
    ), 'dayoff:none'),
    coalesce((
      select string_agg(u.staff_member_id || '|' || u.date, E'\n'
        order by u.staff_member_id, u.date)
      from public.staff_one_off_unavailability_requests as u
      where u.workspace_id = rw.workspace_id and u.status = 'approved'
        and u.date >= rw.week_start and u.date <= rw.week_start + 7
    ), 'unavailable:none')
  ))
  into expected
  from public.rota_weeks as rw
  join public.locations as loc on loc.id = rw.location_id
  join public.workspaces as w on w.id = rw.workspace_id
  where rw.id = '45000000-0000-4000-8000-000000000511';

  select (public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000511',
    '45000000-0000-4000-8000-000000000511',
    pg_temp.p51_source(),
    pg_temp.p51_operations())->>'fingerprint')
  into actual;

  if actual is distinct from expected then
    raise exception 'FAIL case 1: existing-week fingerprint changed shape (% vs %)', actual, expected;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 2. A fresh-week preview writes nothing.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
begin
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 2: fixture already has a 2026-08-03 week';
  end if;

  stamp := pg_temp.p51_stamp();

  if stamp->>'fingerprint' is null or length(stamp->>'fingerprint') <> 32 then
    raise exception 'FAIL case 2: no fingerprint issued for a fresh week';
  end if;
  if stamp->>'digest' is distinct from md5(pg_temp.p51_operations()::text) then
    raise exception 'FAIL case 2: digest is not taken over the operation list';
  end if;
  if stamp->>'week_state' is distinct from 'absent' then
    raise exception 'FAIL case 2: the stamp does not declare the week state';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 or pg_temp.p51_fresh_shift_count() <> 0 then
    raise exception 'FAIL case 2: previewing wrote to the database';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 3. The fresh-week stamp refuses once the week exists, and refuses a
-- week start that is not the first day of a rota week.
-- ---------------------------------------------------------------------------
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.rpc_import_schedule_proposal_stamp(
      '41000000-0000-4000-8000-000000000511',
      '42000000-0000-4000-8000-000000000511',
      '2026-07-27',                       -- this week DOES exist
      pg_temp.p51_source(), pg_temp.p51_operations());
  exception when sqlstate '55000' then refused := true;
  end;
  if not refused then
    raise exception 'FAIL case 3: stamped a fresh-week proposal against a live week';
  end if;

  refused := false;
  begin
    perform public.rpc_import_schedule_proposal_stamp(
      '41000000-0000-4000-8000-000000000511',
      '42000000-0000-4000-8000-000000000511',
      '2026-08-05',                       -- a Wednesday
      pg_temp.p51_source(), pg_temp.p51_operations());
  exception when sqlstate '55000' then refused := true;
  end;
  if not refused then
    raise exception 'FAIL case 3: accepted a week start that is not a week boundary';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 4. Apply creates exactly one week and the intended shifts, and records
-- the fingerprint and digest in the audit trail.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  applied jsonb;
  new_week_id uuid;
begin
  stamp := pg_temp.p51_stamp();
  applied := pg_temp.p51_apply(stamp->>'fingerprint', stamp->>'digest', pg_temp.p51_operations());

  if (applied->>'week_created')::boolean is not true then
    raise exception 'FAIL case 4: apply did not report creating the week';
  end if;
  if (applied->>'created_open')::integer <> 2 or (applied->>'created_assigned')::integer <> 0 then
    raise exception 'FAIL case 4: wrong shifts created: %', applied;
  end if;
  if pg_temp.p51_fresh_week_count() <> 1 then
    raise exception 'FAIL case 4: expected exactly one new week, found %',
      pg_temp.p51_fresh_week_count();
  end if;
  if pg_temp.p51_fresh_shift_count() <> 2 then
    raise exception 'FAIL case 4: expected 2 shifts, found %', pg_temp.p51_fresh_shift_count();
  end if;

  new_week_id := (applied->>'rota_week_id')::uuid;

  if not exists (
    select 1 from public.rota_weeks as rw
    where rw.id = new_week_id and rw.status = 'draft'
  ) then
    raise exception 'FAIL case 4: the created week is not a draft';
  end if;

  if not exists (
    select 1 from public.audit_events as e
    where e.workspace_id = '41000000-0000-4000-8000-000000000511'
      and e.subject_id = new_week_id
      and e.action = 'rota_week.created_for_import'
      and e.details->>'input_fingerprint' = stamp->>'fingerprint'
      and e.details->>'proposal_digest' = stamp->>'digest'
  ) then
    raise exception 'FAIL case 4: the creation was not audited with its fingerprint and digest';
  end if;

  if not exists (
    select 1 from public.audit_events as e
    where e.subject_id = new_week_id and e.action = 'rota_week.built'
  ) then
    raise exception 'FAIL case 4: the delegated apply did not write its own audit event';
  end if;

  -- ------------------------------------------------------------------------
  -- Case 5. Replaying the same proposal is refused, and adds nothing.
  -- ------------------------------------------------------------------------
  declare
    replayed boolean := false;
  begin
    begin
      perform pg_temp.p51_apply(stamp->>'fingerprint', stamp->>'digest', pg_temp.p51_operations());
    exception when sqlstate '55000' then replayed := true;
    end;
    if not replayed then
      raise exception 'FAIL case 5: the same import applied twice';
    end if;
    if pg_temp.p51_fresh_week_count() <> 1 or pg_temp.p51_fresh_shift_count() <> 2 then
      raise exception 'FAIL case 5: a replayed import changed the week';
    end if;
  end;
end
$$;

-- The cases above committed a week inside this test transaction. Remove it so
-- the staleness and rollback cases below start from a genuinely fresh week
-- again; the outer transaction rolls back regardless.
delete from public.shifts
where workspace_id = '41000000-0000-4000-8000-000000000511'
  and rota_week_id in (
    select id from public.rota_weeks
    where workspace_id = '41000000-0000-4000-8000-000000000511' and week_start = '2026-08-03');
delete from public.rota_weeks
where workspace_id = '41000000-0000-4000-8000-000000000511' and week_start = '2026-08-03';

-- ---------------------------------------------------------------------------
-- Case 6. A week that appears after the preview is a refusal, not a merge.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  refused boolean := false;
  shifts_before integer;
begin
  stamp := pg_temp.p51_stamp();

  -- Somebody else creates the week — a copy-previous-week, a manual edit, or a
  -- second import that landed first.
  insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
  values ('45000000-0000-4000-8000-000000000512', '41000000-0000-4000-8000-000000000511',
          '42000000-0000-4000-8000-000000000511', '2026-08-03', 'draft');
  shifts_before := pg_temp.p51_fresh_shift_count();

  begin
    perform pg_temp.p51_apply(stamp->>'fingerprint', stamp->>'digest', pg_temp.p51_operations());
  exception when sqlstate '55000' then refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 6: a stale fresh-week import was applied into a live week';
  end if;
  if pg_temp.p51_fresh_shift_count() <> shifts_before then
    raise exception 'FAIL case 6: the refused import still wrote shifts';
  end if;
  if pg_temp.p51_fresh_week_count() <> 1 then
    raise exception 'FAIL case 6: the refused import created a second week';
  end if;
end
$$;

delete from public.rota_weeks
where workspace_id = '41000000-0000-4000-8000-000000000511' and week_start = '2026-08-03';

-- ---------------------------------------------------------------------------
-- Case 7. A failed apply leaves neither the week nor any shift behind.
--
-- The second operation names a department that is not active, which the
-- delegated apply refuses part-way through the loop — after the week was
-- created and after the first shift was inserted.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  bad_operations jsonb;
  refused boolean := false;
begin
  update public.departments set status = 'inactive'
  where id = '43000000-0000-4000-8000-000000000511';

  stamp := pg_temp.p51_stamp();
  bad_operations := pg_temp.p51_operations();

  begin
    perform pg_temp.p51_apply(stamp->>'fingerprint', stamp->>'digest', bad_operations);
  exception when sqlstate '55000' then refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 7: an import naming an inactive department was applied';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 7: the failed import left a week behind';
  end if;
  if pg_temp.p51_fresh_shift_count() <> 0 then
    raise exception 'FAIL case 7: the failed import left shifts behind';
  end if;

  update public.departments set status = 'active'
  where id = '43000000-0000-4000-8000-000000000511';
end
$$;

-- ---------------------------------------------------------------------------
-- Case 7b. The same, but failing *after* a shift has already been written.
--
-- The first operation is legal and is inserted; the second falls outside the
-- week and is refused. This is the case that actually proves the shift insert
-- and the week creation share one transaction — case 7 fails before any shift
-- is written, so on its own it only proves the week rolls back.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  mixed jsonb;
  refused boolean := false;
begin
  stamp := pg_temp.p51_stamp();
  mixed := jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef', 'reason', 'good row',
      'signature', pg_temp.p51_signature('2026-08-03', '09:00', '17:00', false)),
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef', 'reason', 'out of week',
      'signature', pg_temp.p51_signature('2026-08-20', '09:00', '17:00', false)));

  begin
    perform pg_temp.p51_apply(stamp->>'fingerprint', md5(mixed::text), mixed);
  exception when sqlstate '55000' then refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 7b: an out-of-week shift was applied';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 7b: a part-applied import left a week behind';
  end if;
  if pg_temp.p51_fresh_shift_count() <> 0 then
    raise exception 'FAIL case 7b: a part-applied import left its first shift behind';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 8. An altered proposal is refused before any week is created.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  altered jsonb;
  refused boolean := false;
begin
  stamp := pg_temp.p51_stamp();
  altered := pg_temp.p51_operations()
    || jsonb_build_array(jsonb_build_object('kind', 'create-open', 'roleName', 'Chef',
         'signature', pg_temp.p51_signature('2026-08-05', '09:00', '17:00', false),
         'reason', 'added after review'));

  begin
    perform pg_temp.p51_apply(stamp->>'fingerprint', stamp->>'digest', altered);
  exception when sqlstate '55000' then refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 8: an altered operation list was applied';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 8: a refused digest still created the week';
  end if;

  -- The same shape of check for a fingerprint that no longer matches.
  refused := false;
  begin
    perform pg_temp.p51_apply(md5('not the fingerprint'), stamp->>'digest', pg_temp.p51_operations());
  exception when sqlstate '55000' then refused := true;
  end;
  if not refused then
    raise exception 'FAIL case 8: a stale fingerprint was accepted';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 8: a stale fingerprint still created the week';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 9. Cross-workspace references are refused, and nothing is created.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  foreign_ops jsonb;
  refused boolean := false;
begin
  stamp := pg_temp.p51_stamp();

  -- A department belonging to the other workspace.
  foreign_ops := jsonb_build_array(jsonb_build_object(
    'kind', 'create-open', 'roleName', 'Chef', 'reason', 'cross-workspace',
    'signature', jsonb_build_object(
      'workDate', '2026-08-03', 'startLocal', '09:00', 'endLocal', '17:00',
      'overnight', false, 'roleKey', 'chef',
      'departmentId', '43000000-0000-4000-8000-000000000521',
      'locationId', '42000000-0000-4000-8000-000000000511',
      'breakMinutes', 30)));

  begin
    perform pg_temp.p51_apply(
      stamp->>'fingerprint', md5(foreign_ops::text), foreign_ops);
  exception when sqlstate '55000' then refused := true;
  end;
  if not refused then
    raise exception 'FAIL case 9: a department from another workspace was accepted';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 9: a cross-workspace import created a week';
  end if;

  -- A staff member belonging to the other workspace. The assignment validator
  -- scopes its lookup by workspace, so a foreign id is simply not found.
  refused := false;
  foreign_ops := jsonb_build_array(jsonb_build_object(
    'kind', 'create-assigned', 'roleName', 'Chef', 'reason', 'cross-workspace staff',
    'staffId', '46000000-0000-4000-8000-00000000052a',
    'signature', pg_temp.p51_signature('2026-08-03', '09:00', '17:00', false)));

  begin
    perform pg_temp.p51_apply(
      stamp->>'fingerprint', md5(foreign_ops::text), foreign_ops);
  exception when sqlstate '55000' then refused := true;
  end;
  if not refused then
    raise exception 'FAIL case 9: a staff member from another workspace was assigned';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 9: a cross-workspace assignment created a week';
  end if;

  -- And a location belonging to the other workspace, as the target itself.
  refused := false;
  begin
    perform public.rpc_apply_import_to_new_week(
      '41000000-0000-4000-8000-000000000511',
      '42000000-0000-4000-8000-000000000521',
      '2026-08-03',
      stamp->>'fingerprint', stamp->>'digest', pg_temp.p51_source(), pg_temp.p51_operations());
  exception when sqlstate '55000' then refused := true;
  end;
  if not refused then
    raise exception 'FAIL case 9: a location from another workspace was accepted as a target';
  end if;
  if exists (
    select 1 from public.rota_weeks as rw
    where rw.location_id = '42000000-0000-4000-8000-000000000521'
  ) then
    raise exception 'FAIL case 9: a week was created in the other workspace';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 10. Someone with no membership can neither stamp nor apply.
-- ---------------------------------------------------------------------------
do $$
declare
  refused_stamp boolean := false;
  refused_apply boolean := false;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ad000000-0000-4000-8000-000000000512","role":"authenticated"}', true);

  begin
    perform pg_temp.p51_stamp();
  exception when others then refused_stamp := true;
  end;
  begin
    perform pg_temp.p51_apply(md5('x'), md5('y'), pg_temp.p51_operations());
  exception when others then refused_apply := true;
  end;

  perform set_config('request.jwt.claims',
    '{"sub":"ad000000-0000-4000-8000-000000000511","role":"authenticated"}', true);

  if not refused_stamp then
    raise exception 'FAIL case 10: an outsider obtained a fresh-week stamp';
  end if;
  if not refused_apply then
    raise exception 'FAIL case 10: an outsider applied an import';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 10: an outsider created a week';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 11. The delegated apply's own ceilings still apply to a fresh week: an
-- empty list is refused, and so is one over 500 operations. Neither leaves a
-- week behind.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  huge jsonb;
  refused_empty boolean := false;
  refused_huge boolean := false;
begin
  stamp := pg_temp.p51_stamp();

  begin
    perform pg_temp.p51_apply(stamp->>'fingerprint', md5('[]'), '[]'::jsonb);
  exception when others then refused_empty := true;
  end;

  select jsonb_agg(jsonb_build_object(
           'kind', 'create-open', 'roleName', 'Chef', 'reason', 'bulk',
           'signature', pg_temp.p51_signature('2026-08-03', '09:00',
             to_char('00:01'::time + (n || ' minutes')::interval, 'HH24:MI'), false)))
  into huge
  from generate_series(1, 501) as n;

  begin
    perform pg_temp.p51_apply(stamp->>'fingerprint', md5(huge::text), huge);
  exception when sqlstate '55000' then refused_huge := true;
  end;

  if not refused_empty then
    raise exception 'FAIL case 11: an empty import was applied';
  end if;
  if not refused_huge then
    raise exception 'FAIL case 11: an oversized import was applied';
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 11: a refused import left a week behind';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 11b. The week-start alignment rule follows the workspace, not Monday.
--
-- The RPCs compare `extract(isodow from week_start) - 1` against
-- `rota_start_weekday`, which is the same 0 = Monday .. 6 = Sunday convention
-- weekStartForOffset produces in TypeScript. If the two ever disagreed, every
-- fresh-week import in a non-Monday workspace would be refused — so a
-- Sunday-start workspace is checked explicitly rather than assumed.
-- ---------------------------------------------------------------------------
do $$
declare
  refused_sunday boolean := false;
  refused_monday boolean := false;
begin
  update public.workspaces set rota_start_weekday = 6
  where id = '41000000-0000-4000-8000-000000000511';

  -- 2026-08-02 is a Sunday: isodow 7, so 7 - 1 = 6. This must be accepted.
  begin
    perform public.rpc_import_schedule_proposal_stamp(
      '41000000-0000-4000-8000-000000000511',
      '42000000-0000-4000-8000-000000000511',
      '2026-08-02', pg_temp.p51_source(), pg_temp.p51_operations());
  exception when sqlstate '55000' then refused_sunday := true;
  end;

  -- And the Monday that was legal a moment ago must now be refused.
  begin
    perform public.rpc_import_schedule_proposal_stamp(
      '41000000-0000-4000-8000-000000000511',
      '42000000-0000-4000-8000-000000000511',
      '2026-08-03', pg_temp.p51_source(), pg_temp.p51_operations());
  exception when sqlstate '55000' then refused_monday := true;
  end;

  update public.workspaces set rota_start_weekday = 0
  where id = '41000000-0000-4000-8000-000000000511';

  if refused_sunday then
    raise exception 'FAIL case 11b: a Sunday-start workspace could not import its own week';
  end if;
  if not refused_monday then
    raise exception 'FAIL case 11b: a Sunday-start workspace accepted a Monday week start';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 12. The internal helpers stay unreachable, and the two new entry points
-- are granted to authenticated only.
-- ---------------------------------------------------------------------------
do $$
declare
  leaked text;
begin
  select string_agg(p.proname, ', ')
  into leaked
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('rpc_internal_build_week_context_text',
                      'rpc_internal_import_absent_week_fingerprint')
    and (has_function_privilege('authenticated', p.oid, 'execute')
      or has_function_privilege('anon', p.oid, 'execute'));
  if leaked is not null then
    raise exception 'FAIL case 12: internal helper is callable: %', leaked;
  end if;

  if not has_function_privilege('authenticated',
       'public.rpc_import_schedule_proposal_stamp(uuid, uuid, date, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 12: managers cannot reach the fresh-week stamp';
  end if;
  if not has_function_privilege('authenticated',
       'public.rpc_apply_import_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 12: managers cannot reach the fresh-week apply';
  end if;
  if has_function_privilege('anon',
       'public.rpc_apply_import_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 12: anon can reach the fresh-week apply';
  end if;

  if has_function_privilege('authenticated',
       'public.rpc_internal_assert_import_shift_lengths(jsonb)', 'execute') then
    raise exception 'FAIL case 12: the shift-length guard is callable directly';
  end if;
  if not has_function_privilege('authenticated',
       'public.rpc_apply_import_to_existing_week(uuid, uuid, text, text, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 12: managers cannot reach the existing-week import apply';
  end if;
  if has_function_privilege('anon',
       'public.rpc_apply_import_to_existing_week(uuid, uuid, text, text, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 12: anon can reach the existing-week import apply';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Case 13. No import writes a shift longer than 16 hours, whichever door it
-- comes through.
--
-- The rota grid has always refused a typed cell that long, and the preview now
-- refuses a pasted row that long — but the operation list passes through the
-- client between preview and apply, so the rule has to hold here too. Both
-- import entry points are checked, because until this phase only one of them
-- existed and the other went straight to the Build apply.
--
-- 16 hours exactly is accepted and 16 hours and one minute is refused, so this
-- pins the boundary rather than the general idea of a limit.
-- ---------------------------------------------------------------------------
do $$
declare
  stamp jsonb;
  long_reason text := '';
  zero_reason text := '';
  existing_reason text := '';
  applied jsonb;
  existing_week_id uuid;
  existing_stamp jsonb;
begin
  -- 16h01m, written as an overnight shift: 09:00 on one day to 01:01 the next.
  -- The message is captured rather than only the SQLSTATE, because a staleness
  -- or digest refusal raises 55000 too and would otherwise pass for this one.
  stamp := pg_temp.p51_stamp_for(pg_temp.p51_long_operations('01:01'));
  begin
    perform pg_temp.p51_apply(
      stamp->>'fingerprint', stamp->>'digest', pg_temp.p51_long_operations('01:01'));
  exception when sqlstate '55000' then
    get stacked diagnostics long_reason = message_text;
  end;

  if long_reason not like '%longer than 16 hours%' then
    raise exception 'FAIL case 13: the fresh-week import accepted a 16h01m shift (got: %)',
      coalesce(nullif(long_reason, ''), 'no refusal');
  end if;
  if pg_temp.p51_fresh_week_count() <> 0 then
    raise exception 'FAIL case 13: the refused import created a week anyway';
  end if;

  -- A shift ending exactly when it starts is a 24-hour shift, not a short one.
  stamp := pg_temp.p51_stamp_for(pg_temp.p51_long_operations('09:00'));
  begin
    perform pg_temp.p51_apply(
      stamp->>'fingerprint', stamp->>'digest', pg_temp.p51_long_operations('09:00'));
  exception when sqlstate '55000' then
    get stacked diagnostics zero_reason = message_text;
  end;
  if zero_reason not like '%longer than 16 hours%' then
    raise exception 'FAIL case 13: the fresh-week import accepted a zero-length shift (got: %)',
      coalesce(nullif(zero_reason, ''), 'no refusal');
  end if;

  -- 16 hours exactly, through the same door, is a shift a manager may import.
  stamp := pg_temp.p51_stamp_for(pg_temp.p51_long_operations('01:00'));
  applied := pg_temp.p51_apply(
    stamp->>'fingerprint', stamp->>'digest', pg_temp.p51_long_operations('01:00'));
  if (applied->>'created_open')::integer <> 1 then
    raise exception 'FAIL case 13: a 16-hour shift was not imported';
  end if;

  -- The same rule on the existing-week door. The week the apply above created
  -- is a real draft week, so it is the right target for it.
  select rw.id into existing_week_id
  from public.rota_weeks as rw
  where rw.workspace_id = '41000000-0000-4000-8000-000000000511'
    and rw.location_id = '42000000-0000-4000-8000-000000000511'
    and rw.week_start = '2026-08-03';

  -- First that the new door opens at all: 16 hours exactly, delegated through
  -- to the same apply. Without this, a wrapper that refused everything would
  -- pass the refusal case below.
  existing_stamp := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000511',
    existing_week_id,
    pg_temp.p51_source(),
    pg_temp.p51_long_operations('01:00'));

  applied := public.rpc_apply_import_to_existing_week(
    '41000000-0000-4000-8000-000000000511',
    existing_week_id,
    existing_stamp->>'fingerprint',
    existing_stamp->>'digest',
    pg_temp.p51_source(),
    pg_temp.p51_long_operations('01:00'));

  if (applied->>'created_open')::integer <> 1 then
    raise exception 'FAIL case 13: the existing-week import did not write a 16-hour shift';
  end if;
  if pg_temp.p51_fresh_shift_count() <> 2 then
    raise exception 'FAIL case 13: the existing-week import did not land in the week';
  end if;

  existing_stamp := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000511',
    existing_week_id,
    pg_temp.p51_source(),
    pg_temp.p51_long_operations('01:01'));

  begin
    perform public.rpc_apply_import_to_existing_week(
      '41000000-0000-4000-8000-000000000511',
      existing_week_id,
      existing_stamp->>'fingerprint',
      existing_stamp->>'digest',
      pg_temp.p51_source(),
      pg_temp.p51_long_operations('01:01'));
  exception when sqlstate '55000' then
    get stacked diagnostics existing_reason = message_text;
  end;

  if existing_reason not like '%longer than 16 hours%' then
    raise exception 'FAIL case 13: the existing-week import accepted a 16h01m shift (got: %)',
      coalesce(nullif(existing_reason, ''), 'no refusal');
  end if;
  -- Refused before anything was written: the week still holds only the two
  -- 16-hour shifts the accepted imports put there.
  if pg_temp.p51_fresh_shift_count() <> 2 then
    raise exception 'FAIL case 13: the refused existing-week import changed the week';
  end if;

  delete from public.shifts as s
  where s.rota_week_id = existing_week_id;
  delete from public.rota_weeks as rw
  where rw.id = existing_week_id;
end
$$;

rollback;
