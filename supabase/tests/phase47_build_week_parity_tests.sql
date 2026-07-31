-- Phase 47 Build the Week parity and privilege verification. Runs inside one
-- rolled-back transaction against the local stack; the seeded database is left
-- untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase47_build_week_parity_tests.sql
--
-- Two things are proven here that phase47_build_week_apply_tests.sql does not.
--
-- 1. PARITY. Every hard exclusion the TypeScript planner applies is also refused
--    by rpc_apply_build_week_proposal, and a proposal the planner would accept
--    applies cleanly. The planner side is
--    src/features/rota/lib/scheduling/buildWeekApplyParity.test.ts; these are the
--    same scenarios against real Postgres. Read the two together.
--
-- 2. PRIVILEGE. Who can execute each function, and what the digest actually
--    proves. In particular the stamp wrapper is manager-callable with arbitrary
--    operations, so the digest is change detection and NOT authentication — that
--    is asserted here rather than assumed, because the security argument depends
--    on it being true.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000481', 'authenticated', 'authenticated', 'p47p.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000482', 'authenticated', 'authenticated', 'p47p.outsider@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000483', 'authenticated', 'authenticated', 'p47p.staff@example.com');

-- Workspace A: the one being built.
insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000481', 'p47p-site', 'P47P Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values
  ('42000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481', 'Main', 'Europe/London'),
  ('42000000-0000-4000-8000-000000000482', '41000000-0000-4000-8000-000000000481', 'Annexe', 'Europe/London');
insert into public.departments (id, workspace_id, name, status)
values
  ('43000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481', 'Kitchen', 'active'),
  ('43000000-0000-4000-8000-000000000482', '41000000-0000-4000-8000-000000000481', 'Closed Dept', 'inactive');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('44000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481', 'ad000000-0000-4000-8000-000000000481', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('44000000-0000-4000-8000-000000000483', '41000000-0000-4000-8000-000000000481', 'ad000000-0000-4000-8000-000000000483', 'staff', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

-- Workspace B: exists only to prove isolation.
insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000489', 'p47p-other', 'P47P Other', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000489', '41000000-0000-4000-8000-000000000489', 'Other', 'Europe/London');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000489', '41000000-0000-4000-8000-000000000489', 'ad000000-0000-4000-8000-000000000482', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000489', '41000000-0000-4000-8000-000000000489', '42000000-0000-4000-8000-000000000489', '2026-08-03', 'draft');

--   ana        active Chef, the default candidate
--   ben        active Chef, used where ana is excluded
--   cara       active " cHeF " — role identity differs only by case and spacing
--   dan        left Chef
--   eve        active Barista — a role no demand here asks for
insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values
  ('46000000-0000-4000-8000-00000000048a', '41000000-0000-4000-8000-000000000481', 'Ana Chef',  'Chef',     '43000000-0000-4000-8000-000000000481', 'active',     2400),
  ('46000000-0000-4000-8000-00000000048b', '41000000-0000-4000-8000-000000000481', 'Ben Chef',  'Chef',     '43000000-0000-4000-8000-000000000481', 'active',     2400),
  ('46000000-0000-4000-8000-00000000048c', '41000000-0000-4000-8000-000000000481', 'Cara Chef', '  cHeF  ', '43000000-0000-4000-8000-000000000481', 'active',     null),
  ('46000000-0000-4000-8000-00000000048d', '41000000-0000-4000-8000-000000000481', 'Dan Gone',  'Chef',     '43000000-0000-4000-8000-000000000481', 'left', 2400),
  ('46000000-0000-4000-8000-00000000048e', '41000000-0000-4000-8000-000000000481', 'Eve Bar',   'Barista',  '43000000-0000-4000-8000-000000000481', 'active',     2400);

-- Target draft week, Monday 2026-08-03 .. Sunday 2026-08-09, at Main.
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('45000000-0000-4000-8000-000000000481', '41000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', '2026-08-03', 'draft'),
  -- The same dates at the OTHER location, which is a separate rota week with a
  -- separate id. Its shifts are invisible to the week being built — the planner
  -- reads shifts by rota_week_id — but fully visible to the apply RPC's overlap
  -- check, which filters on workspace and staff member only.
  ('45000000-0000-4000-8000-000000000482', '41000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000482', '2026-08-03', 'draft');

-- Ben already works Monday 2026-08-03 12:00-20:00 at the Annexe. Nothing in the
-- target week can overlap it for him.
insert into public.shifts (
  id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
)
values ('47000000-0000-4000-8000-0000000004b1', '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000482', '42000000-0000-4000-8000-000000000482', '43000000-0000-4000-8000-000000000481', '46000000-0000-4000-8000-00000000048b',
        '2026-08-03', '2026-08-03 12:00:00+01', '2026-08-03 20:00:00+01', 30, 'Chef', 'scheduled');

-- Ana: pending leave Tuesday, recurring Wednesday off, unavailable Thursday.
-- All three are seeded by the fixture owner because RLS scopes staff-filed rows.
insert into public.leave_requests (
  workspace_id, staff_member_id, leave_type, start_date, end_date, reason, status
)
values ('41000000-0000-4000-8000-000000000481', '46000000-0000-4000-8000-00000000048a',
        'annual_leave', '2026-08-04', '2026-08-04', 'parity fixture', 'pending');

insert into public.staff_recurring_day_off_requests (
  workspace_id, staff_member_id, weekday, status, decided_at, decided_by_membership_id
)
values ('41000000-0000-4000-8000-000000000481', '46000000-0000-4000-8000-00000000048a',
        2, 'approved', '2026-07-01T09:00:00Z', '44000000-0000-4000-8000-000000000481');

insert into public.staff_one_off_unavailability_requests (
  workspace_id, staff_member_id, date, status, decided_at, decided_by_membership_id
)
values ('41000000-0000-4000-8000-000000000481', '46000000-0000-4000-8000-00000000048a',
        '2026-08-06', 'approved', '2026-07-01T09:00:00Z', '44000000-0000-4000-8000-000000000481');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000481","role":"authenticated"}', true);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Helpers.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.sig(
  p_date text, p_start text, p_end text, p_overnight boolean,
  p_role text default 'chef',
  p_dept text default '43000000-0000-4000-8000-000000000481',
  p_loc text default '42000000-0000-4000-8000-000000000481',
  p_break integer default 30
)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'workDate', p_date, 'startLocal', p_start, 'endLocal', p_end,
    'overnight', p_overnight, 'roleKey', p_role,
    'departmentId', p_dept, 'locationId', p_loc, 'breakMinutes', p_break);
$$;

create or replace function pg_temp.assign_op(p_staff text, p_signature jsonb, p_role text default 'Chef')
returns jsonb language sql immutable as $$
  select jsonb_build_array(jsonb_build_object(
    'kind', 'create-assigned', 'signature', p_signature,
    'roleName', p_role, 'staffId', p_staff, 'reason', 'parity'));
$$;

-- Applies through the same manager-guarded stamp the app uses, so the
-- fingerprint and digest are always current and only the operation under test
-- can be the reason for a refusal.
create or replace function pg_temp.apply(p_ops jsonb)
returns jsonb language plpgsql volatile as $ap$
declare
  stamp jsonb;
begin
  stamp := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
    '{"kind":"current-week"}'::jsonb, p_ops);
  return public.rpc_apply_build_week_proposal(
    '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
    stamp->>'fingerprint', stamp->>'digest', '{"kind":"current-week"}'::jsonb, p_ops);
end;
$ap$;

-- Asserts the RPC refuses p_ops with a deliberate 55000 business refusal.
create or replace function pg_temp.expect_refused(p_ops jsonb, p_label text)
returns void language plpgsql volatile as $er$
declare
  before_count integer;
  after_count integer;
begin
  select count(*) into before_count from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-000000000481';
  begin
    perform pg_temp.apply(p_ops);
    raise exception 'FAIL: % was applied but should have been refused', p_label;
  exception
    when sqlstate '55000' then null;
    when sqlstate '22023' then null;
  end;
  select count(*) into after_count from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-000000000481';
  if after_count <> before_count then
    raise exception 'FAIL: % wrote % row(s) before refusing', p_label, after_count - before_count;
  end if;
  raise notice 'PASS: refused — %', p_label;
end;
$er$;

-- ---------------------------------------------------------------------------
-- PARITY: hard exclusions refused by both engines.
-- ---------------------------------------------------------------------------
do $$
declare
  result jsonb;
  shift_count integer;
begin
  -- Approved leave is already covered by the apply suite; pending leave is the
  -- one an earlier fill surface used to allow, so it is proven here.
  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-04', '09:00', '17:00', false)),
    'pending leave');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-05', '09:00', '17:00', false)),
    'approved recurring day off (Wednesday, isodow-1 = 2)');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-06', '09:00', '17:00', false)),
    'one-off unavailability');

  -- An overnight shift STARTING the day before the unavailability still touches
  -- it, because touched_dates runs to (ends_at - 1 second).
  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-05', '22:00', '02:00', true)),
    'overnight shift reaching into an unavailable day');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048d', pg_temp.sig('2026-08-07', '09:00', '17:00', false)),
    'a staff member who has left');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048e', pg_temp.sig('2026-08-07', '09:00', '17:00', false)),
    'staff member who does not hold the role');

  -- THE CROSS-BOUNDARY CASE. Ben's Annexe shift belongs to a different rota
  -- week, so the planner — which reads shifts by rota_week_id — never sees it
  -- while building Main's week. The RPC compares against every shift he holds
  -- in the workspace, with no week and no location filter, so it refuses. This
  -- asymmetry is why the proposal function loads external commitments; without
  -- them the planner proposes this and, being deterministic, proposes it again
  -- every time the manager follows the "Build it again" the refusal suggests.
  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048b', pg_temp.sig('2026-08-03', '16:00', '23:00', false)),
    'overlap with a shift in another rota week at another location');

  -- Same person, same day, adjacent rather than overlapping: SQL overlap is
  -- half-open, so a clean handover must be allowed.
  result := pg_temp.apply(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048b', pg_temp.sig('2026-08-03', '20:00', '23:00', false)));
  if (result->>'created_assigned')::int <> 1 then
    raise exception 'FAIL: an end-to-start handover was refused';
  end if;
  raise notice 'PASS: end-to-start handover accepted (half-open overlap)';

  -- Role identity is normalized the same way on both sides: Cara's stored role
  -- is "  cHeF  " and the proposal's roleKey is "chef".
  result := pg_temp.apply(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048c', pg_temp.sig('2026-08-07', '09:00', '17:00', false)));
  if (result->>'created_assigned')::int <> 1 then
    raise exception 'FAIL: a role differing only in case and spacing was refused';
  end if;
  raise notice 'PASS: role identity normalizes identically to normaliseRoleKey';

  -- Contracted minutes are a planner-side balancing signal only. Cara has none
  -- recorded, and the validator neither reads nor refuses on that.
  select count(*) into shift_count from public.shifts
  where rota_week_id = '45000000-0000-4000-8000-000000000481'
    and staff_member_id = '46000000-0000-4000-8000-00000000048c';
  if shift_count <> 1 then
    raise exception 'FAIL: a null contracted_minutes_per_week affected validation';
  end if;
  raise notice 'PASS: null contracted minutes are neutral at apply time';

  -- Shape refusals that are decidable from the operation alone.
  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-17', '09:00', '17:00', false)),
    'a date outside the week being built');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a',
      pg_temp.sig('2026-08-07', '09:00', '17:00', false, 'chef', '43000000-0000-4000-8000-000000000482')),
    'an inactive department');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a',
      pg_temp.sig('2026-08-07', '09:00', '17:00', false, 'chef',
                  '43000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000482')),
    'a location that is not the week''s own');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-07', '22:00', '02:00', false)),
    'an overnight flag that disagrees with the times');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-07', '09:00', '17:00', false), 'Waiter'),
    'a display role name that does not match its own roleKey');

  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048a',
      pg_temp.sig('2026-08-07', '09:00', '17:00', false, 'chef',
                  '43000000-0000-4000-8000-000000000481', '42000000-0000-4000-8000-000000000481', 5000)),
    'an unusable break length');

  perform pg_temp.expect_refused(
    jsonb_build_array(jsonb_build_object(
      'kind', 'delete-shift',
      'signature', pg_temp.sig('2026-08-07', '09:00', '17:00', false),
      'roleName', 'Chef', 'reason', 'parity')),
    'an operation kind that does not exist');
end $$;

-- ---------------------------------------------------------------------------
-- PRIVILEGE: what the stamp and the digest actually prove.
-- ---------------------------------------------------------------------------
do $$
declare
  first_digest text;
  second_digest text;
  altered_ops jsonb;
  original_ops jsonb;
begin
  -- Every rpc_internal_* helper must be unreachable from `authenticated`. The
  -- fingerprint one especially: it takes a workspace id and checks no
  -- membership, so a direct grant would be a cross-workspace oracle.
  if has_function_privilege('authenticated',
      'public.rpc_internal_build_week_input_fingerprint(uuid, uuid, jsonb)', 'execute') then
    raise exception 'FAIL: authenticated can execute the fingerprint function directly';
  end if;
  if has_function_privilege('authenticated', 'public.rpc_internal_build_week_digest(jsonb)', 'execute') then
    raise exception 'FAIL: authenticated can execute the digest function directly';
  end if;
  if has_function_privilege('authenticated',
      'public.rpc_internal_assert_build_week_assignable(uuid, uuid, jsonb, timestamptz, timestamptz, uuid)', 'execute') then
    raise exception 'FAIL: authenticated can execute the assignability check directly';
  end if;
  if has_function_privilege('authenticated', 'public.rpc_internal_normalise_role_key(text)', 'execute') then
    raise exception 'FAIL: authenticated can execute the role-key helper directly';
  end if;
  if has_function_privilege('authenticated', 'public.rpc_internal_proposal_signature_text(jsonb)', 'execute') then
    raise exception 'FAIL: authenticated can execute the proposal signature helper directly';
  end if;
  if has_function_privilege('anon',
      'public.rpc_build_week_proposal_stamp(uuid, uuid, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL: anon can execute the stamp wrapper';
  end if;
  if has_function_privilege('anon',
      'public.rpc_apply_build_week_proposal(uuid, uuid, text, text, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL: anon can execute the apply RPC';
  end if;
  raise notice 'PASS: every internal helper is revoked; anon reaches neither entry point';

  -- THE DIGEST IS NOT AUTHENTICATION. A manager can obtain a valid stamp for
  -- any operation list they like, including one they have altered, because the
  -- wrapper takes p_operations as a free parameter and md5 is unkeyed. This is
  -- asserted rather than assumed: the security argument elsewhere depends on it
  -- being understood as change detection, with the real boundary being the
  -- manager role, RLS, and the per-operation validation above.
  original_ops := pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-07', '09:00', '17:00', false));
  altered_ops := pg_temp.assign_op('46000000-0000-4000-8000-00000000048b', pg_temp.sig('2026-08-08', '09:00', '17:00', false));

  first_digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
    '{"kind":"current-week"}'::jsonb, original_ops)->>'digest';
  second_digest := public.rpc_build_week_proposal_stamp(
    '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
    '{"kind":"current-week"}'::jsonb, altered_ops)->>'digest';

  if first_digest = second_digest then
    raise exception 'FAIL: the digest did not change when the operations changed';
  end if;
  raise notice 'PASS: the digest detects an altered operation list';
  raise notice 'NOTE: a manager can re-stamp altered operations — the digest is change detection, not authentication';

  -- Which is exactly why the per-operation validation must never be relaxed:
  -- a re-stamped proposal is still checked operation by operation. Ben is
  -- already working 2026-08-03 12:00-20:00 at the Annexe.
  perform pg_temp.expect_refused(
    pg_temp.assign_op('46000000-0000-4000-8000-00000000048b', pg_temp.sig('2026-08-03', '13:00', '19:00', false)),
    'a freshly re-stamped proposal that is still illegal');
end $$;

-- ---------------------------------------------------------------------------
-- ISOLATION: a manager of another workspace reaches nothing here.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000482","role":"authenticated"}', true);

do $$
begin
  -- Manager of workspace B, naming workspace A.
  begin
    perform public.rpc_build_week_proposal_stamp(
      '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
      '{"kind":"current-week"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: an outsider obtained a stamp for another workspace';
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: the stamp wrapper refuses a foreign workspace id (42501)';

  begin
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
      'x', 'y', '{"kind":"current-week"}'::jsonb,
      pg_temp.assign_op('46000000-0000-4000-8000-00000000048a', pg_temp.sig('2026-08-07', '09:00', '17:00', false)));
    raise exception 'FAIL: an outsider applied into another workspace';
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: apply refuses a foreign workspace id (42501)';

  -- Naming their OWN workspace but another workspace's rota week must not leak
  -- a fingerprint either: the lookup is scoped by both ids.
  begin
    perform public.rpc_build_week_proposal_stamp(
      '41000000-0000-4000-8000-000000000489', '45000000-0000-4000-8000-000000000481',
      '{"kind":"current-week"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: a foreign rota week produced a fingerprint';
  exception when sqlstate 'P0002' then null;
  end;
  raise notice 'PASS: a rota week from another workspace is not found (P0002)';
end $$;

-- ---------------------------------------------------------------------------
-- STAFF: a non-manager member reaches neither entry point.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000483","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_build_week_proposal_stamp(
      '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
      '{"kind":"current-week"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: a staff member obtained a proposal stamp';
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.rpc_apply_build_week_proposal(
      '41000000-0000-4000-8000-000000000481', '45000000-0000-4000-8000-000000000481',
      'x', 'y', '{"kind":"current-week"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: a staff member applied a proposal';
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: a staff member is refused by both entry points (42501)';
end $$;

rollback;
