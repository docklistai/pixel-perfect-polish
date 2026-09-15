-- Phase 66: source-sensitive leave authority at the shared apply boundary.
--
-- Runs inside one rolled-back transaction against the local stack; the seeded
-- database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase66_import_pending_leave_tests.sql
--
-- The product contract under test:
--
--   approved leave + headed-import  -> refused, nothing written
--   approved leave + Build          -> refused, nothing written   (unchanged)
--   pending  leave + headed-import  -> ALLOWED                    (the change)
--   pending  leave + Build          -> refused                    (unchanged)
--
-- Plus the two properties the change must not cost: an approved-leave refusal
-- writes nothing even when a legal operation precedes it in the same proposal,
-- and the refusal text still carries the fragment the app layer matches when it
-- rewrites the message for an importing manager.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000661',
        'authenticated', 'authenticated', 'p66.manager@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000661', 'p66-site', 'P66 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000661', '41000000-0000-4000-8000-000000000661', 'P66 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000661', '41000000-0000-4000-8000-000000000661', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000661', '41000000-0000-4000-8000-000000000661',
        'ad000000-0000-4000-8000-000000000661', 'owner', 'active',
        '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

-- Two chefs so approved and pending leave can be tested independently, without
-- one person's fixture masking the other's outcome.
insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values
  ('46000000-0000-4000-8000-00000000066a', '41000000-0000-4000-8000-000000000661', 'Approved Ana', 'Chef', '43000000-0000-4000-8000-000000000661', 'active', 2400),
  ('46000000-0000-4000-8000-00000000066b', '41000000-0000-4000-8000-000000000661', 'Pending Pat', 'Chef', '43000000-0000-4000-8000-000000000661', 'active', 2400),
  ('46000000-0000-4000-8000-00000000066c', '41000000-0000-4000-8000-000000000661', 'Free Fran', 'Chef', '43000000-0000-4000-8000-000000000661', 'active', 2400);

-- Target draft week, Monday 2026-08-03.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000661', '41000000-0000-4000-8000-000000000661',
        '42000000-0000-4000-8000-000000000661', '2026-08-03', 'draft');

-- Seeded as the fixture owner: RLS only lets a staff member file their own
-- leave, so a manager session cannot insert these directly.
--
-- Ana: APPROVED on Wednesday 2026-08-05, and again on Friday 2026-08-07 so the
-- overnight case has a next-day collision to find.
-- Pat: PENDING on Wednesday 2026-08-05. Pending rows must leave every decision
-- column null — the table's own check constraint enforces that.
insert into public.leave_requests (
  workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status,
  decided_at, decided_by_membership_id
)
values
  ('41000000-0000-4000-8000-000000000661', '46000000-0000-4000-8000-00000000066a',
   'annual_leave', '2026-08-05', '2026-08-05', 'p66 approved fixture', 'approved',
   '2026-07-01T09:00:00Z', '44000000-0000-4000-8000-000000000661'),
  ('41000000-0000-4000-8000-000000000661', '46000000-0000-4000-8000-00000000066a',
   'annual_leave', '2026-08-07', '2026-08-07', 'p66 overnight fixture', 'approved',
   '2026-07-01T09:00:00Z', '44000000-0000-4000-8000-000000000661');

-- Given a fixed id so case 7 can decide it through rpc_decide_leave_request,
-- which is the only path a manager actually has: `authenticated` holds no
-- direct UPDATE on leave_requests, and approving it any other way would prove
-- something the product cannot do.
insert into public.leave_requests (
  id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status
)
values ('48000000-0000-4000-8000-00000000066b', '41000000-0000-4000-8000-000000000661',
        '46000000-0000-4000-8000-00000000066b',
        'annual_leave', '2026-08-05', '2026-08-05', 'p66 pending fixture', 'pending');

-- Fran's own pending request, on a Saturday nothing else in this suite touches.
-- Case 7 decides Pat's, so hers cannot stand in for "still pending" afterwards,
-- and case 7b needs a request that is still undecided when it runs.
insert into public.leave_requests (
  workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status
)
values ('41000000-0000-4000-8000-000000000661', '46000000-0000-4000-8000-00000000066c',
        'annual_leave', '2026-08-08', '2026-08-08', 'p66 unnamed-source fixture', 'pending');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000661","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Helpers. Both sources go through the manager-guarded stamp, exactly as the
-- app does, so the fingerprint each apply is handed is a real one.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.p66_signature(p_date text, p_start text, p_end text, p_overnight boolean)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'workDate', p_date, 'startLocal', p_start, 'endLocal', p_end,
    'overnight', p_overnight, 'roleKey', 'chef',
    'departmentId', '43000000-0000-4000-8000-000000000661',
    'locationId', '42000000-0000-4000-8000-000000000661',
    'breakMinutes', 30);
$$;

create or replace function pg_temp.p66_assign(p_staff uuid, p_signature jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object('kind', 'create-assigned', 'signature', p_signature,
    'roleName', 'Chef', 'staffId', p_staff, 'reason', 'p66');
$$;

create or replace function pg_temp.p66_shift_count()
returns integer language sql stable as $$
  select count(*)::integer from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-000000000661';
$$;

-- Applies through the door the given source uses in production: an import goes
-- via the public rpc_apply_import_to_existing_week, a Build goes straight to the
-- shared apply. Returns the refusal message, or null when it succeeded.
create or replace function pg_temp.p66_apply(p_source jsonb, p_ops jsonb)
returns text language plpgsql volatile as $ap$
declare
  stamp jsonb;
begin
  stamp := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000661', '45000000-0000-4000-8000-000000000661',
    p_source, p_ops);
  if p_source->>'kind' = 'headed-import' then
    perform public.rpc_apply_import_to_existing_week(
      '41000000-0000-4000-8000-000000000661', '45000000-0000-4000-8000-000000000661',
      stamp->>'fingerprint', stamp->>'digest', p_source, p_ops);
  else
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000661', '45000000-0000-4000-8000-000000000661',
      stamp->>'fingerprint', stamp->>'digest', p_source, p_ops);
  end if;
  return null;
exception when sqlstate '55000' then
  return sqlerrm;
end;
$ap$;

do $$
declare
  refusal text;
  before_count integer;
begin
  -- =========================================================================
  -- 1. headed-import + APPROVED leave -> refused, nothing written.
  --    Driven through the public import door, not the shared apply, so the
  --    import-specific entry point is proven to inherit the rule.
  -- =========================================================================
  before_count := pg_temp.p66_shift_count();
  refusal := pg_temp.p66_apply(
    '{"kind":"headed-import"}'::jsonb,
    jsonb_build_array(pg_temp.p66_assign(
      '46000000-0000-4000-8000-00000000066a',
      pg_temp.p66_signature('2026-08-05', '09:00', '17:00', false))));
  if refusal is null then
    raise exception 'FAIL case 1: an import onto approved leave was applied';
  end if;
  if pg_temp.p66_shift_count() <> before_count then
    raise exception 'FAIL case 1: the refused import wrote % row(s)',
      pg_temp.p66_shift_count() - before_count;
  end if;
  -- The app layer rewrites this message for an importing manager by matching
  -- this fragment. If the wording below ever changes, that mapper goes stale
  -- silently — so it is asserted here rather than trusted.
  if position('has leave on that day' in refusal) = 0 then
    raise exception 'FAIL case 1: refusal no longer carries the fragment the app maps on: %', refusal;
  end if;
  raise notice 'PASS: headed-import onto approved leave is refused, writing nothing';

  -- =========================================================================
  -- 2. headed-import + PENDING leave -> allowed. This is the change.
  -- =========================================================================
  before_count := pg_temp.p66_shift_count();
  refusal := pg_temp.p66_apply(
    '{"kind":"headed-import"}'::jsonb,
    jsonb_build_array(pg_temp.p66_assign(
      '46000000-0000-4000-8000-00000000066b',
      pg_temp.p66_signature('2026-08-05', '09:00', '17:00', false))));
  if refusal is not null then
    raise exception 'FAIL case 2: an import onto pending leave was refused: %', refusal;
  end if;
  if pg_temp.p66_shift_count() <> before_count + 1 then
    raise exception 'FAIL case 2: expected one shift written, got %',
      pg_temp.p66_shift_count() - before_count;
  end if;
  raise notice 'PASS: headed-import onto pending leave is allowed';

  -- =========================================================================
  -- 3. Build + PENDING leave -> still refused. Build is automatic scheduling
  --    and must not quietly schedule over an unanswered request.
  --    Pat already holds the shift case 2 wrote, so a second identical one
  --    would overlap; Wednesday evening is free of both leave and that shift.
  -- =========================================================================
  before_count := pg_temp.p66_shift_count();
  refusal := pg_temp.p66_apply(
    '{"kind":"current-week"}'::jsonb,
    jsonb_build_array(pg_temp.p66_assign(
      '46000000-0000-4000-8000-00000000066b',
      pg_temp.p66_signature('2026-08-05', '18:00', '22:00', false))));
  if refusal is null then
    raise exception 'FAIL case 3: Build onto pending leave was applied';
  end if;
  if pg_temp.p66_shift_count() <> before_count then
    raise exception 'FAIL case 3: the refused Build wrote % row(s)',
      pg_temp.p66_shift_count() - before_count;
  end if;
  raise notice 'PASS: Build onto pending leave is still refused';

  -- =========================================================================
  -- 4. Build + APPROVED leave -> still refused.
  -- =========================================================================
  before_count := pg_temp.p66_shift_count();
  refusal := pg_temp.p66_apply(
    '{"kind":"current-week"}'::jsonb,
    jsonb_build_array(pg_temp.p66_assign(
      '46000000-0000-4000-8000-00000000066a',
      pg_temp.p66_signature('2026-08-05', '09:00', '17:00', false))));
  if refusal is null then
    raise exception 'FAIL case 4: Build onto approved leave was applied';
  end if;
  if pg_temp.p66_shift_count() <> before_count then
    raise exception 'FAIL case 4: the refused Build wrote % row(s)',
      pg_temp.p66_shift_count() - before_count;
  end if;
  raise notice 'PASS: Build onto approved leave is still refused';

  -- =========================================================================
  -- 5. No partial writes. A legal operation precedes the approved-leave one in
  --    the same proposal; neither survives. Case 1 refused before writing
  --    anything, so on its own it does not prove the rollback.
  -- =========================================================================
  before_count := pg_temp.p66_shift_count();
  refusal := pg_temp.p66_apply(
    '{"kind":"headed-import"}'::jsonb,
    jsonb_build_array(
      pg_temp.p66_assign('46000000-0000-4000-8000-00000000066c',
        pg_temp.p66_signature('2026-08-06', '09:00', '17:00', false)),
      pg_temp.p66_assign('46000000-0000-4000-8000-00000000066a',
        pg_temp.p66_signature('2026-08-05', '09:00', '17:00', false))));
  if refusal is null then
    raise exception 'FAIL case 5: a proposal containing approved leave was applied';
  end if;
  if pg_temp.p66_shift_count() <> before_count then
    raise exception 'FAIL case 5: a part-applied import left % row(s) behind',
      pg_temp.p66_shift_count() - before_count;
  end if;
  raise notice 'PASS: an approved-leave refusal rolls back the legal rows beside it';

  -- =========================================================================
  -- 6. Overnight. The shift starts on a free Thursday and runs into Ana's
  --    approved Friday leave. touched_dates must reach the second date.
  -- =========================================================================
  before_count := pg_temp.p66_shift_count();
  refusal := pg_temp.p66_apply(
    '{"kind":"headed-import"}'::jsonb,
    jsonb_build_array(pg_temp.p66_assign(
      '46000000-0000-4000-8000-00000000066a',
      pg_temp.p66_signature('2026-08-06', '22:00', '02:00', true))));
  if refusal is null then
    raise exception 'FAIL case 6: an overnight import reaching into approved leave was applied';
  end if;
  if pg_temp.p66_shift_count() <> before_count then
    raise exception 'FAIL case 6: the refused overnight import wrote % row(s)',
      pg_temp.p66_shift_count() - before_count;
  end if;
  raise notice 'PASS: an overnight import is checked against the day it ends on';

  -- =========================================================================
  -- 7. Pending leave is allowed, not ignored: an APPROVED request on the same
  --    dates still refuses the same import. Proves case 2 turned on status and
  --    not on the source kind skipping the leave check altogether.
  -- =========================================================================
  perform public.rpc_decide_leave_request(
    '41000000-0000-4000-8000-000000000661', '48000000-0000-4000-8000-00000000066b',
    'approved', 'p66 approved after preview');

  before_count := pg_temp.p66_shift_count();
  refusal := pg_temp.p66_apply(
    '{"kind":"headed-import"}'::jsonb,
    jsonb_build_array(pg_temp.p66_assign(
      '46000000-0000-4000-8000-00000000066b',
      pg_temp.p66_signature('2026-08-05', '18:00', '22:00', false))));
  if refusal is null then
    raise exception 'FAIL case 7: an import was applied after the request became approved';
  end if;
  if pg_temp.p66_shift_count() <> before_count then
    raise exception 'FAIL case 7: the refused import wrote % row(s)',
      pg_temp.p66_shift_count() - before_count;
  end if;
  raise notice 'PASS: a request approved after preview refuses the same import';
end
$$;

-- ---------------------------------------------------------------------------
-- 7b. An unnamed source falls back to Build's rules, not past them.
--
-- The assertion is called directly here because no production caller can
-- produce this state: rpc_apply_build_week_proposal always passes
-- p_source->>'kind'. The parameter still defaults to null, and the default has
-- to mean "not an import".
--
-- This is a regression test for three-valued logic. `p_source_kind =
-- 'headed-import'` against a NULL yields NULL, `not NULL` is NULL, and
-- `if NULL then` never fires — so a plain equality silently ALLOWED pending
-- leave for an unnamed source. `is not distinct from` is what makes the guard
-- return a real boolean.
-- ---------------------------------------------------------------------------
-- The helper is revoked from `authenticated` — case 8 asserts exactly that — so
-- calling it directly needs the suite's own superuser session back.
reset role;

do $$
begin
  -- No source kind at all: must refuse.
  begin
    perform public.rpc_internal_assert_build_week_assignable(
      '41000000-0000-4000-8000-000000000661', '46000000-0000-4000-8000-00000000066c',
      'chef', '2026-08-08 09:00:00+01', '2026-08-08 17:00:00+01', 'Europe/London', null);
    raise exception 'FAIL case 7b: an unnamed source was allowed onto pending leave';
  exception when sqlstate '55000' then null;
  end;

  -- An unrecognised source kind: must also refuse.
  begin
    perform public.rpc_internal_assert_build_week_assignable(
      '41000000-0000-4000-8000-000000000661', '46000000-0000-4000-8000-00000000066c',
      'chef', '2026-08-08 09:00:00+01', '2026-08-08 17:00:00+01', 'Europe/London', null,
      'something-else');
    raise exception 'FAIL case 7b: an unrecognised source was allowed onto pending leave';
  exception when sqlstate '55000' then null;
  end;

  -- The import kind is still allowed on the same row, so the guard is
  -- discriminating rather than simply refusing everything.
  perform public.rpc_internal_assert_build_week_assignable(
    '41000000-0000-4000-8000-000000000661', '46000000-0000-4000-8000-00000000066c',
    'chef', '2026-08-08 09:00:00+01', '2026-08-08 17:00:00+01', 'Europe/London', null,
    'headed-import');

  raise notice 'PASS: an unnamed or unrecognised source keeps Build''s pending-leave rules';
end
$$;

-- ---------------------------------------------------------------------------
-- 8. The source-blind signature is gone, and the new one stays internal.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure(
      'public.rpc_internal_assert_build_week_assignable(uuid, uuid, text, timestamptz, timestamptz, text, uuid)')
     is not null then
    raise exception 'FAIL case 8: the phase 48 source-blind assignability signature still exists';
  end if;
  if has_function_privilege('authenticated',
      'public.rpc_internal_assert_build_week_assignable(uuid, uuid, text, timestamptz, timestamptz, text, uuid, text)',
      'execute') then
    raise exception 'FAIL case 8: authenticated can execute the assignability check directly';
  end if;
  raise notice 'PASS: only the source-aware assignability signature exists, and it stays internal';
end
$$;

rollback;
