-- Phase 6 portal access-code verification. Runs entirely inside one
-- rolled-back transaction against the local stack; the seeded database is
-- left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase6_portal_access_tests.sql
--
-- Expected rejections are caught by exact SQLSTATE (42501 privilege/unknown
-- code, P0002 not found, 55000 invalid state, 22023 invalid parameter).
-- A failed check raises P0001 (FAIL) and aborts the script.

begin;

-- --------------------------------------------------------------------------
-- Setup (service path). The seeded demo manager (ab..01 on membership
-- 13..11) is the issuing manager. Claimers simulate anonymous-auth users.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ba000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', null),
  ('00000000-0000-0000-0000-000000000000', 'ba000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null),
  ('00000000-0000-0000-0000-000000000000', 'ba000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'owner.ws2@example.com');

-- Second workspace for cross-tenant probes.
insert into public.workspaces (id, slug, name, timezone)
values ('31000000-0000-4000-8000-000000000001', 'phase6-second', 'Phase6 Second Site', 'Europe/London');

insert into public.locations (id, workspace_id, name, timezone)
values ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'Phase6 Second Site', 'Europe/London');

insert into public.departments (id, workspace_id, name)
values ('33000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'Front of House');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('34000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000003', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('34000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', null, 'staff', 'invited', '2026-06-01T08:00:00Z', null);

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('35000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'Phase6 Staff', 'Waiter');

-- Adversarial fixtures: a staff member with no membership, and a staff member
-- wired to a non-staff (owner) membership.
insert into public.staff_members (id, workspace_id, primary_location_id, display_name, role_name)
values ('35000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 'No Membership', 'Waiter');

insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, display_name, role_name)
values ('35000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 'Owner Linked', 'Waiter');

-- Plaintext codes cross persona switches through this temp table.
create temporary table phase6_codes (label text primary key, code text not null) on commit drop;
grant select, insert, update on table phase6_codes to public;

-- --------------------------------------------------------------------------
-- MANAGER persona: lockdown, issue flows, audit
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    perform 1 from public.staff_portal_access_codes limit 1;
    raise exception 'FAIL: authenticated role can read staff_portal_access_codes directly';
  exception when insufficient_privilege then
    raise notice 'PASS: code digests are unreachable by authenticated roles';
  end;

  -- Blocker 1: the workspace code digest now lives in its own definer-only table.
  begin
    perform 1 from public.workspace_portal_access_codes limit 1;
    raise exception 'FAIL: authenticated role can read workspace_portal_access_codes directly';
  exception when insufficient_privilege then
    raise notice 'PASS: workspace code digest is unreachable by authenticated roles';
  end;

  begin
    update public.workspace_portal_access_codes
    set code_digest = '\x00'::bytea
    where workspace_id = '10000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: manager updated the workspace code digest directly';
  exception when insufficient_privilege then
    raise notice 'PASS: managers cannot overwrite the workspace code digest outside the RPC';
  end;
end $$;

do $$
declare
  workspace_code text;
  staff_code text;
begin
  workspace_code := public.rpc_issue_workspace_portal_code('10000000-0000-4000-8000-000000000001');
  if workspace_code !~ '^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{5}-[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{5}$' then
    raise exception 'FAIL: workspace code format was %', workspace_code;
  end if;

  staff_code := public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001');
  if staff_code !~ '^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{5}-[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{5}$' then
    raise exception 'FAIL: staff code format was %', staff_code;
  end if;

  insert into phase6_codes (label, code) values ('ws1', workspace_code), ('sophie', staff_code);

  perform 1 from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'workspace_portal_code_issued'
    and actor_membership_id = '13000000-0000-4000-8000-000000000011';
  if not found then raise exception 'FAIL: workspace code issue not audited'; end if;

  perform 1 from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'staff_portal_code_issued'
    and subject_id = '14000000-0000-4000-8000-000000000001';
  if not found then raise exception 'FAIL: staff code issue not audited'; end if;

  raise notice 'PASS: manager issues workspace and staff codes with audit trail';
end $$;

do $$
begin
  begin
    perform public.rpc_issue_staff_portal_code('31000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: ws1 manager issued a code in workspace 2';
  exception when sqlstate '42501' then
    raise notice 'PASS: managers cannot issue codes outside their workspace';
  end;
end $$;

-- --------------------------------------------------------------------------
-- CLAIMER 1 persona: happy path, normalization, idempotence
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ba000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  ws1_code text;
  sophie_code text;
  result jsonb;
  bound_user uuid;
  bound_status text;
  profile_name text;
begin
  select code into ws1_code from phase6_codes where label = 'ws1';
  select code into sophie_code from phase6_codes where label = 'sophie';

  -- lowercase + separators must normalize to the stored digest
  result := public.rpc_claim_staff_portal_access(lower(ws1_code), replace(lower(sophie_code), '-', ' '));

  if (result ->> 'ok')::boolean is not true then
    raise exception 'FAIL: happy-path claim did not return ok: %', result;
  end if;

  if (result ->> 'membership_id')::uuid <> '13000000-0000-4000-8000-000000000002' then
    raise exception 'FAIL: claim bound the wrong membership: %', result;
  end if;

  select user_id, status into bound_user, bound_status
  from public.workspace_memberships where id = '13000000-0000-4000-8000-000000000002';
  if bound_user <> 'ba000000-0000-4000-8000-000000000001' or bound_status <> 'active' then
    raise exception 'FAIL: membership not bound/activated (user %, status %)', bound_user, bound_status;
  end if;

  select display_name into profile_name from public.staff_portal_profile
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if profile_name is distinct from 'Sophie Carter' then
    raise exception 'FAIL: staff portal profile not visible after claim (got %)', profile_name;
  end if;

  -- idempotent re-claim by the same identity
  result := public.rpc_claim_staff_portal_access(ws1_code, sophie_code);
  if (result ->> 'ok')::boolean is not true
     or (result ->> 'staff_member_id')::uuid <> '14000000-0000-4000-8000-000000000001' then
    raise exception 'FAIL: idempotent re-claim returned %', result;
  end if;

  raise notice 'PASS: anonymous identity claims, binds, sees staff-safe profile, re-claims idempotently';
end $$;

-- Audit assertion runs on the service path: audit_events is manager-only
-- under RLS, so the staff claimer must not (and cannot) see it.
reset role;

do $$
begin
  perform 1 from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'staff_portal_access_claimed'
    and subject_id = '13000000-0000-4000-8000-000000000002';
  if not found then raise exception 'FAIL: claim not audited'; end if;
  raise notice 'PASS: claim is audited';
end $$;

set local role authenticated;

-- --------------------------------------------------------------------------
-- CLAIMER 2 persona: takeover and bad-input rejections
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ba000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  ws1_code text;
  sophie_code text;
  result jsonb;
begin
  select code into ws1_code from phase6_codes where label = 'ws1';
  select code into sophie_code from phase6_codes where label = 'sophie';

  -- Non-raising contract: a claimed code returns { ok:false, reason:'claimed' }.
  result := public.rpc_claim_staff_portal_access(ws1_code, sophie_code);
  if (result ->> 'ok')::boolean is not false or result ->> 'reason' <> 'claimed' then
    raise exception 'FAIL: second identity took over a claimed code: %', result;
  end if;
  raise notice 'PASS: claimed code cannot be taken over by another identity';

  -- Unknown staff code in a valid workspace: enumeration-safe 'invalid'.
  result := public.rpc_claim_staff_portal_access(ws1_code, 'WRNG-CODE');
  if (result ->> 'ok')::boolean is not false or result ->> 'reason' <> 'invalid' then
    raise exception 'FAIL: wrong staff code not rejected as invalid: %', result;
  end if;
  raise notice 'PASS: unknown staff code rejected without enumeration detail';

  -- Unknown workspace code: same enumeration-safe 'invalid'.
  result := public.rpc_claim_staff_portal_access('WRNG-CODE', sophie_code);
  if (result ->> 'ok')::boolean is not false or result ->> 'reason' <> 'invalid' then
    raise exception 'FAIL: wrong workspace code not rejected as invalid: %', result;
  end if;
  raise notice 'PASS: unknown workspace code rejected without enumeration detail';

  -- Empty input is still a hard 22023 raise (not a brute-force vector).
  begin
    perform public.rpc_claim_staff_portal_access(ws1_code, '  --  ');
    raise exception 'FAIL: empty staff code accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: empty code rejected as invalid parameter';
  end;
end $$;

-- --------------------------------------------------------------------------
-- MANAGER persona: reissue is refused for a claimed membership (blocker 3)
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  reissue_blocked boolean := false;
  bound_user uuid;
  bound_status text;
  james_code text;
begin
  -- Sophie's membership (13..02) is claimed; reissue must be refused, user_id kept.
  begin
    perform public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: reissue succeeded for a claimed membership';
  exception when sqlstate '55000' then
    reissue_blocked := true;
  end;

  select user_id, status into bound_user, bound_status
  from public.workspace_memberships where id = '13000000-0000-4000-8000-000000000002';
  if not reissue_blocked
     or bound_user <> 'ba000000-0000-4000-8000-000000000001'
     or bound_status <> 'active' then
    raise exception 'FAIL: reissue disturbed a claimed membership (user %, status %)', bound_user, bound_status;
  end if;
  raise notice 'PASS: reissue is refused for a claimed membership and leaves user_id intact';

  -- James (14..06 / 13..07) is still unbound; issue him a fresh code.
  james_code := public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000006');
  insert into phase6_codes (label, code) values ('james', james_code);
end $$;

-- --------------------------------------------------------------------------
-- CLAIMER 2 persona: claims its own code, becoming active staff in ws1
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ba000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  ws1_code text;
  james_code text;
  result jsonb;
begin
  select code into ws1_code from phase6_codes where label = 'ws1';
  select code into james_code from phase6_codes where label = 'james';

  result := public.rpc_claim_staff_portal_access(ws1_code, james_code);
  if (result ->> 'ok')::boolean is not true
     or (result ->> 'membership_id')::uuid <> '13000000-0000-4000-8000-000000000007' then
    raise exception 'FAIL: James claim bound the wrong membership: %', result;
  end if;

  raise notice 'PASS: a second identity claims its own staff code';
end $$;

-- Manager issues a code for a different unbound staff member (Daniel) so we can
-- prove one identity cannot hold two memberships in the same workspace.
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  daniel_code text;
begin
  daniel_code := public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002');
  insert into phase6_codes (label, code) values ('daniel', daniel_code);
end $$;

-- Claimer 2 is now active staff in ws1: issuing must be forbidden, and a
-- second membership in the same workspace must be refused.
select set_config('request.jwt.claims', '{"sub":"ba000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  ws1_code text;
  daniel_code text;
  result jsonb;
begin
  select code into ws1_code from phase6_codes where label = 'ws1';
  select code into daniel_code from phase6_codes where label = 'daniel';

  begin
    perform public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: staff member issued a portal code';
  exception when sqlstate '42501' then
    raise notice 'PASS: staff cannot issue portal codes';
  end;

  begin
    perform public.rpc_issue_workspace_portal_code('10000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: staff member rotated the workspace code';
  exception when sqlstate '42501' then
    raise notice 'PASS: staff cannot rotate the workspace code';
  end;

  -- Caller already holds a membership here: non-raising 'already_member'.
  result := public.rpc_claim_staff_portal_access(ws1_code, daniel_code);
  if (result ->> 'ok')::boolean is not false or result ->> 'reason' <> 'already_member' then
    raise exception 'FAIL: one identity claimed two memberships in a workspace: %', result;
  end if;
  raise notice 'PASS: an identity cannot hold two memberships in one workspace';
end $$;

-- --------------------------------------------------------------------------
-- WS2 OWNER persona: cross-tenant probes and broken staff wiring
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ba000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare
  ws2_code text;
begin
  ws2_code := public.rpc_issue_workspace_portal_code('31000000-0000-4000-8000-000000000001');
  insert into phase6_codes (label, code) values ('ws2', ws2_code);

  begin
    perform public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: ws2 owner issued a code in ws1';
  exception when sqlstate '42501' then
    raise notice 'PASS: ws2 owner cannot issue codes in ws1';
  end;

  begin
    perform public.rpc_issue_staff_portal_code('31000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: code issued for a staff member with no membership';
  exception when sqlstate '55000' then
    raise notice 'PASS: staff member without a membership cannot receive a code';
  end;

  begin
    perform public.rpc_issue_staff_portal_code('31000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000003');
    raise exception 'FAIL: code issued against a non-staff membership';
  exception when sqlstate '55000' then
    raise notice 'PASS: codes are restricted to staff-role memberships';
  end;
end $$;

-- Cross-tenant claim: ws2 workspace code + ws1 staff code must not resolve.
select set_config('request.jwt.claims', '{"sub":"ba000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  ws2_code text;
  james_code text;
  result jsonb;
begin
  select code into ws2_code from phase6_codes where label = 'ws2';
  select code into james_code from phase6_codes where label = 'james';

  -- ws1 staff code does not resolve inside ws2: enumeration-safe 'invalid'.
  result := public.rpc_claim_staff_portal_access(ws2_code, james_code);
  if (result ->> 'ok')::boolean is not false or result ->> 'reason' <> 'invalid' then
    raise exception 'FAIL: staff code resolved across workspaces: %', result;
  end if;
  raise notice 'PASS: staff codes are workspace-scoped';
end $$;

-- --------------------------------------------------------------------------
-- Unauthenticated and anon-role lockout
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_claim_staff_portal_access('AAAA-AAAA', 'BBBB-BBBB');
    raise exception 'FAIL: claim ran without auth.uid()';
  exception when sqlstate '42501' then
    raise notice 'PASS: claim requires an authenticated identity';
  end;
end $$;

set local role anon;

do $$
begin
  begin
    perform public.rpc_claim_staff_portal_access('AAAA-AAAA', 'BBBB-BBBB');
    raise exception 'FAIL: anon role can execute the claim RPC';
  exception when insufficient_privilege then
    raise notice 'PASS: anon role cannot execute the claim RPC';
  end;
end $$;

reset role;

-- --------------------------------------------------------------------------
-- Grant surface: no anon execute on rpc_*, no authenticated on internals
-- --------------------------------------------------------------------------
do $$
declare
  offenders text;
begin
  select string_agg(routine.proname || '(' || pg_get_function_identity_arguments(routine.oid) || ')', ', ')
  into offenders
  from pg_proc as routine
  where routine.pronamespace = 'public'::regnamespace
    and routine.proname like 'rpc\_%'
    and has_function_privilege('anon', routine.oid, 'execute');
  if offenders is not null then
    raise exception 'FAIL: anon can execute: %', offenders;
  end if;

  select string_agg(routine.proname || '(' || pg_get_function_identity_arguments(routine.oid) || ')', ', ')
  into offenders
  from pg_proc as routine
  where routine.pronamespace = 'public'::regnamespace
    and routine.proname like 'rpc\_internal\_%'
    and has_function_privilege('authenticated', routine.oid, 'execute');
  if offenders is not null then
    raise exception 'FAIL: authenticated can execute internal helpers: %', offenders;
  end if;

  raise notice 'PASS: phase 6 grant surface is anon-free and helpers are internal-only';
end $$;

do $$ begin raise notice 'ALL PHASE 6 PORTAL ACCESS CHECKS PASSED'; end $$;

rollback;
