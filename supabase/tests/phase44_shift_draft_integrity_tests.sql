-- Phase 44 shift/draft transaction integrity verification. Rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase44_shift_draft_integrity_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'b4000000-0000-4000-8000-000000004401', 'authenticated', 'authenticated', 'p44.mgr@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('b4100000-0000-4000-8000-000000004401', 'p44-site', 'P44 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('b4200000-0000-4000-8000-000000004401', 'b4100000-0000-4000-8000-000000004401', 'P44 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('b4300000-0000-4000-8000-000000004401', 'b4100000-0000-4000-8000-000000004401', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('b4400000-0000-4000-8000-000000004401', 'b4100000-0000-4000-8000-000000004401', 'b4000000-0000-4000-8000-000000004401', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('b4500000-0000-4000-8000-000000004401', 'b4100000-0000-4000-8000-000000004401', 'b4400000-0000-4000-8000-000000004401', 'b4200000-0000-4000-8000-000000004401', 'b4300000-0000-4000-8000-000000004401', 'P44 Chef', 'Chef');

-- Week 01 published (the interesting case), 02 draft, 03 archived.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('b4600000-0000-4000-8000-000000004401', 'b4100000-0000-4000-8000-000000004401', 'b4200000-0000-4000-8000-000000004401', '2026-06-08', 'published'),
  ('b4600000-0000-4000-8000-000000004402', 'b4100000-0000-4000-8000-000000004401', 'b4200000-0000-4000-8000-000000004401', '2026-06-15', 'draft'),
  ('b4600000-0000-4000-8000-000000004403', 'b4100000-0000-4000-8000-000000004401', 'b4200000-0000-4000-8000-000000004401', '2026-06-22', 'archived');

insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values
  ('b4700000-0000-4000-8000-000000004401', 'b4100000-0000-4000-8000-000000004401', 'b4600000-0000-4000-8000-000000004401', 'b4200000-0000-4000-8000-000000004401', 'b4300000-0000-4000-8000-000000004401', 'b4500000-0000-4000-8000-000000004401',
   '2026-06-08', '2026-06-08 09:00:00+01', '2026-06-08 17:00:00+01', 30, 'Chef', 'scheduled');

-- The insert above already flipped week 01 to draft (that is the point of the
-- trigger). Reset it to published so each numbered case starts from a known
-- published week.
update public.rota_weeks set status = 'published'
where id = 'b4600000-0000-4000-8000-000000004401';

-- --------------------------------------------------------------------------
-- 1. INSERT into a published week marks it draft in the same statement.
-- --------------------------------------------------------------------------
do $$
declare
  week_status text;
begin
  insert into public.shifts (
    workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  ) values (
    'b4100000-0000-4000-8000-000000004401', 'b4600000-0000-4000-8000-000000004401',
    'b4200000-0000-4000-8000-000000004401', 'b4300000-0000-4000-8000-000000004401', null,
    '2026-06-09', '2026-06-09 12:00:00+01', '2026-06-09 18:00:00+01', 0, 'Bar', 'open');

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004401';
  if week_status <> 'draft' then
    raise exception 'FAIL: insert left week status %', week_status;
  end if;
  raise notice 'PASS: insert marked the published week draft';
end $$;

-- --------------------------------------------------------------------------
-- 2. UPDATE of an existing shift marks a published week draft.
-- --------------------------------------------------------------------------
update public.rota_weeks set status = 'published'
where id = 'b4600000-0000-4000-8000-000000004401';

do $$
declare
  week_status text;
begin
  update public.shifts
  set break_minutes = 45
  where id = 'b4700000-0000-4000-8000-000000004401';

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004401';
  if week_status <> 'draft' then
    raise exception 'FAIL: update left week status %', week_status;
  end if;
  raise notice 'PASS: update marked the published week draft';
end $$;

-- --------------------------------------------------------------------------
-- 3. DELETE marks a published week draft (uses OLD, since NEW is null).
-- --------------------------------------------------------------------------
update public.rota_weeks set status = 'published'
where id = 'b4600000-0000-4000-8000-000000004401';

do $$
declare
  week_status text;
begin
  delete from public.shifts
  where id = 'b4700000-0000-4000-8000-000000004401';

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004401';
  if week_status <> 'draft' then
    raise exception 'FAIL: delete left week status %', week_status;
  end if;
  raise notice 'PASS: delete marked the published week draft';
end $$;

-- --------------------------------------------------------------------------
-- 4. Idempotent on an already-draft week: status unchanged and updated_at is
--    not churned, because the trigger only touches published rows.
-- --------------------------------------------------------------------------
do $$
declare
  before_updated timestamptz;
  after_updated timestamptz;
  week_status text;
begin
  select updated_at into before_updated from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004402';

  insert into public.shifts (
    workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  ) values (
    'b4100000-0000-4000-8000-000000004401', 'b4600000-0000-4000-8000-000000004402',
    'b4200000-0000-4000-8000-000000004401', 'b4300000-0000-4000-8000-000000004401', null,
    '2026-06-16', '2026-06-16 12:00:00+01', '2026-06-16 18:00:00+01', 0, 'Bar', 'open');

  select status, updated_at into week_status, after_updated from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004402';

  if week_status <> 'draft' then
    raise exception 'FAIL: draft week became %', week_status;
  end if;
  if after_updated is distinct from before_updated then
    raise exception 'FAIL: draft week updated_at churned';
  end if;
  raise notice 'PASS: draft week untouched and idempotent';
end $$;

-- --------------------------------------------------------------------------
-- 5. An archived week is never silently reopened by a stray write.
-- --------------------------------------------------------------------------
do $$
declare
  week_status text;
begin
  insert into public.shifts (
    workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  ) values (
    'b4100000-0000-4000-8000-000000004401', 'b4600000-0000-4000-8000-000000004403',
    'b4200000-0000-4000-8000-000000004401', 'b4300000-0000-4000-8000-000000004401', null,
    '2026-06-23', '2026-06-23 12:00:00+01', '2026-06-23 18:00:00+01', 0, 'Bar', 'open');

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004403';
  if week_status <> 'archived' then
    raise exception 'FAIL: archived week was reopened as %', week_status;
  end if;
  raise notice 'PASS: archived week not reopened';
end $$;

-- --------------------------------------------------------------------------
-- 6. rota_week_id is immutable, so a shift can never move between weeks. This
--    is why the trigger's OLD/NEW week set always collapses to one row on
--    UPDATE; assert the guarantee rather than assume it.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    update public.shifts
    set rota_week_id = 'b4600000-0000-4000-8000-000000004402'
    where rota_week_id = 'b4600000-0000-4000-8000-000000004401';
    raise exception 'FAIL: a shift moved between rota weeks';
  exception when sqlstate '55000' then
    raise notice 'PASS: rota_week_id is immutable (55000)';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 7. Publish leaves the week published. No publish path writes public.shifts,
--    so the trigger must not fire and must not undo the publication.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b4000000-0000-4000-8000-000000004401","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  week_status text;
  result jsonb;
begin
  result := public.rpc_publish_rota_week(
    'b4100000-0000-4000-8000-000000004401',
    'b4600000-0000-4000-8000-000000004401',
    true);

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004401';
  if week_status <> 'published' then
    raise exception 'FAIL: publish left week status % (trigger interfered)', week_status;
  end if;
  if (result ->> 'snapshot_id') is null then
    raise exception 'FAIL: publish returned no snapshot';
  end if;
  raise notice 'PASS: publish remains published, snapshot written';
end $$;

-- --------------------------------------------------------------------------
-- 8. A shift write AFTER publication marks the week draft again — this is the
--    exact unpublished-change signal DL-001 could previously lose.
-- --------------------------------------------------------------------------
do $$
declare
  week_status text;
begin
  insert into public.shifts (
    workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
  ) values (
    'b4100000-0000-4000-8000-000000004401', 'b4600000-0000-4000-8000-000000004401',
    'b4200000-0000-4000-8000-000000004401', 'b4300000-0000-4000-8000-000000004401', null,
    '2026-06-10', '2026-06-10 12:00:00+01', '2026-06-10 18:00:00+01', 0, 'Bar', 'open');

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004401';
  if week_status <> 'draft' then
    raise exception 'FAIL: post-publish edit left week %', week_status;
  end if;
  raise notice 'PASS: post-publish shift write re-marked the week draft';
end $$;

reset role;

-- --------------------------------------------------------------------------
-- 9. Copy day / Clear day / Apply template refuse non-draft weeks outright, so
--    they can never diverge a published week. Recorded here as the standing
--    precondition the trigger complements rather than replaces.
-- --------------------------------------------------------------------------
update public.rota_weeks set status = 'published'
where id = 'b4600000-0000-4000-8000-000000004401';

-- Seeded as the owning role: this fixture is about what Apply template does to
-- the week status, not about who may create a template.
insert into public.rota_demand_templates (id, workspace_id, name)
values ('b4700000-0000-4000-8000-000000004401', 'b4100000-0000-4000-8000-000000004401', 'P44 Template');
insert into public.rota_demand_template_slots (
  workspace_id, template_id, weekday, role_name, department_id, start_time, end_time, quantity
) values (
  'b4100000-0000-4000-8000-000000004401', 'b4700000-0000-4000-8000-000000004401',
  3::smallint, 'Bar', 'b4300000-0000-4000-8000-000000004401', '10:00', '16:00', 2
);

select set_config('request.jwt.claims', '{"sub":"b4000000-0000-4000-8000-000000004401","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    perform public.rpc_copy_rota_day(
      'b4100000-0000-4000-8000-000000004401',
      'b4600000-0000-4000-8000-000000004401',
      0::smallint, array[1]::smallint[]);
    raise exception 'FAIL: copy day ran on a published week';
  exception when sqlstate '55000' then
    raise notice 'PASS: copy day refuses a published week (55000)';
  end;

  begin
    perform public.rpc_apply_demand_template(
      'b4100000-0000-4000-8000-000000004401',
      'b4600000-0000-4000-8000-000000004401',
      'b4700000-0000-4000-8000-000000004401');
    raise exception 'FAIL: apply template ran on a published week';
  exception when sqlstate '55000' then
    raise notice 'PASS: apply template refuses a published week (55000)';
  end;

  begin
    perform public.rpc_clear_rota_day(
      'b4100000-0000-4000-8000-000000004401',
      'b4600000-0000-4000-8000-000000004401',
      0::smallint);
    raise exception 'FAIL: clear day ran on a published week';
  exception when sqlstate '55000' then
    raise notice 'PASS: clear day refuses a published week (55000)';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 10. On a DRAFT week those same RPCs write shifts and the week stays draft.
-- --------------------------------------------------------------------------
do $$
declare
  week_status text;
  cleared integer;
begin
  perform public.rpc_copy_rota_day(
    'b4100000-0000-4000-8000-000000004401',
    'b4600000-0000-4000-8000-000000004402',
    1::smallint, array[2]::smallint[]);

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004402';
  if week_status <> 'draft' then
    raise exception 'FAIL: copy day left draft week as %', week_status;
  end if;

  perform public.rpc_clear_rota_day(
    'b4100000-0000-4000-8000-000000004401',
    'b4600000-0000-4000-8000-000000004402',
    2::smallint);

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004402';
  if week_status <> 'draft' then
    raise exception 'FAIL: clear day left draft week as %', week_status;
  end if;
  raise notice 'PASS: copy/clear day keep a draft week draft';

  -- Apply template writes shifts through its own RPC. The trigger fires on
  -- each of those rows and must leave the draft week exactly as it found it.
  select count(*) into cleared from public.shifts
  where rota_week_id = 'b4600000-0000-4000-8000-000000004402';

  perform public.rpc_apply_demand_template(
    'b4100000-0000-4000-8000-000000004401',
    'b4600000-0000-4000-8000-000000004402',
    'b4700000-0000-4000-8000-000000004401');

  if (select count(*) from public.shifts
      where rota_week_id = 'b4600000-0000-4000-8000-000000004402') <> cleared + 2 then
    raise exception 'FAIL: apply template did not write its two slot shifts';
  end if;

  select status into week_status from public.rota_weeks
  where id = 'b4600000-0000-4000-8000-000000004402';
  if week_status <> 'draft' then
    raise exception 'FAIL: apply template left draft week as %', week_status;
  end if;
  raise notice 'PASS: apply template writes shifts and keeps the week draft';
end $$;

reset role;

rollback;
