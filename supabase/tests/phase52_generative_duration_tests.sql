-- Phase 52 duration invariant across the GENERATIVE paths. Runs inside one
-- rolled-back transaction against the local stack; the seeded database is left
-- untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase52_generative_duration_tests.sql
--
-- The audit's finding was that `rpc_apply_build_week_proposal` validates ten
-- rules and NOT duration, while the phase 51 import wrapper — which delegates
-- every other rule to that same function — enforces the ceiling itself. So the
-- shared engine could persist a shift the import refused. These cases assert:
--
--   * Build the Week can no longer persist a >16h shift (the trigger closes it);
--   * Build the Week still applies a legal shift, so the guard is not blanket;
--   * import at or under the ceiling still works, unchanged;
--   * import over the ceiling still refuses through its OWN earlier guard, with
--     its own manager-facing wording, rather than falling through to the trigger.
--
-- That last one matters: the phase 51 message names the import and tells the
-- manager nothing was imported. Losing it to a generic trigger message would be
-- a regression even though the row would still be refused.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000541', 'authenticated', 'authenticated', 'p52.gen@example.com');

insert into public.workspaces (id, slug, name, timezone, rota_start_weekday)
values ('41000000-0000-4000-8000-000000000541', 'p52-gen', 'P52 Generative', 'Europe/London', 0);
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000541', '41000000-0000-4000-8000-000000000541', 'P52 Gen Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000541', '41000000-0000-4000-8000-000000000541', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000541', '41000000-0000-4000-8000-000000000541', 'ad000000-0000-4000-8000-000000000541', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values ('46000000-0000-4000-8000-00000000054a', '41000000-0000-4000-8000-000000000541', 'Gen Chef', 'Chef', '43000000-0000-4000-8000-000000000541', 'active', 2400);

-- 2026-08-03 is a Monday, so it is a legal week start for a Monday workspace.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000541', '41000000-0000-4000-8000-000000000541', '42000000-0000-4000-8000-000000000541', '2026-08-03', 'draft');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000541","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Helpers, matching the shapes phases 47 and 51 use.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.p52_signature(p_start text, p_end text, p_overnight boolean)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'workDate', '2026-08-03', 'startLocal', p_start, 'endLocal', p_end,
    'overnight', p_overnight, 'roleKey', 'chef',
    'departmentId', '43000000-0000-4000-8000-000000000541',
    'locationId', '42000000-0000-4000-8000-000000000541',
    'breakMinutes', 30);
$$;

create or replace function pg_temp.p52_ops(p_start text, p_end text, p_overnight boolean)
returns jsonb language sql stable as $$
  select jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef',
      'signature', pg_temp.p52_signature(p_start, p_end, p_overnight),
      'reason', 'phase 52 duration probe'));
$$;

create or replace function pg_temp.p52_import_source()
returns jsonb language sql immutable as $$
  select jsonb_build_object('kind', 'headed-import', 'id', null,
    'contentVersion', 'rows:1', 'plannerRuleVersion', 'build-week/1');
$$;

do $$
declare
  ops jsonb;
  fingerprint text;
  digest text;
  stamp jsonb;
  result jsonb;
  refused boolean;
  message text;
  persisted integer;
begin
  -- =========================================================================
  -- Case 1: Build the Week can no longer persist a shift over the ceiling.
  -- 09:00 -> 01:01 written as overnight is 16h01m.
  -- =========================================================================
  ops := pg_temp.p52_ops('09:00', '01:01', true);
  fingerprint := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    '{"kind":"current-week"}'::jsonb, '[]'::jsonb)->>'fingerprint';
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';

  refused := false;
  begin
    result := public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
      fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);
  exception when sqlstate '55000' then
    refused := true;
    message := sqlerrm;
  end;

  if not refused then
    raise exception 'FAIL case 1: Build the Week applied a 16h01m shift';
  end if;
  if message not like '%16 hours%' then
    raise exception 'FAIL case 1: the refusal did not mention the 16-hour ceiling (got: %)', message;
  end if;

  -- Nothing may survive the refusal: the apply is one transaction.
  select count(*) into persisted from public.shifts
  where workspace_id = '41000000-0000-4000-8000-000000000541';
  if persisted <> 0 then
    raise exception 'FAIL case 1: % shift row(s) survived a refused Build the Week apply', persisted;
  end if;

  -- =========================================================================
  -- Case 2: Build the Week still applies a legal shift, so case 1 proves the
  -- duration rule rather than a broken apply path. 09:00 -> 01:00 is exactly 16h.
  -- =========================================================================
  ops := pg_temp.p52_ops('09:00', '01:00', true);
  fingerprint := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    '{"kind":"current-week"}'::jsonb, '[]'::jsonb)->>'fingerprint';
  digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    '{"kind":"current-week"}'::jsonb, ops)->>'digest';

  result := public.rpc_apply_build_week_proposal(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    fingerprint, digest, '{"kind":"current-week"}'::jsonb, ops);

  if (result->>'created_open')::int <> 1 then
    raise exception 'FAIL case 2: an exactly-16h Build the Week shift was not created (got: %)',
      result->>'created_open';
  end if;

  -- Clear it so the import cases below start from a known-empty week.
  delete from public.shifts where workspace_id = '41000000-0000-4000-8000-000000000541';
end;
$$;

do $$
declare
  ops jsonb;
  stamp jsonb;
  result jsonb;
  refused boolean;
  message text;
  persisted integer;
begin
  -- =========================================================================
  -- Case 3: import at the ceiling still works, unchanged by this phase.
  -- =========================================================================
  ops := pg_temp.p52_ops('09:00', '01:00', true);
  -- The existing-week door is stamped through the build-week wrapper, since it
  -- delegates its fingerprint and digest to the same apply (phase 51 case 13).
  stamp := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    pg_temp.p52_import_source(), ops);

  result := public.rpc_apply_import_to_existing_week(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    stamp->>'fingerprint', stamp->>'digest', pg_temp.p52_import_source(), ops);

  if (result->>'created_open')::int <> 1 then
    raise exception 'FAIL case 3: an exactly-16h import was not applied (got: %)',
      result->>'created_open';
  end if;

  delete from public.shifts where workspace_id = '41000000-0000-4000-8000-000000000541';

  -- =========================================================================
  -- Case 4: import over the ceiling still refuses through its OWN guard.
  -- The phase 51 wording names the import and states nothing was imported; the
  -- generic trigger message would be a regression in manager feedback even
  -- though the row would still be refused.
  -- =========================================================================
  ops := pg_temp.p52_ops('09:00', '01:01', true);
  -- The existing-week door is stamped through the build-week wrapper, since it
  -- delegates its fingerprint and digest to the same apply (phase 51 case 13).
  stamp := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
    pg_temp.p52_import_source(), ops);

  refused := false;
  begin
    result := public.rpc_apply_import_to_existing_week(
      '41000000-0000-4000-8000-000000000541', '45000000-0000-4000-8000-000000000541',
      stamp->>'fingerprint', stamp->>'digest', pg_temp.p52_import_source(), ops);
  exception when sqlstate '55000' then
    refused := true;
    message := sqlerrm;
  end;

  if not refused then
    raise exception 'FAIL case 4: a 16h01m import was applied';
  end if;
  if message not like '%Nothing was imported%' then
    raise exception 'FAIL case 4: the import lost its own earlier guard message (got: %)', message;
  end if;

  select count(*) into persisted from public.shifts
  where workspace_id = '41000000-0000-4000-8000-000000000541';
  if persisted <> 0 then
    raise exception 'FAIL case 4: % shift row(s) survived a refused import', persisted;
  end if;
end;
$$;

reset role;

rollback;
