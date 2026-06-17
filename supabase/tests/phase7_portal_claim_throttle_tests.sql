-- Phase 7 portal-claim throttle + anonymous-user hygiene verification. Runs
-- entirely inside one rolled-back transaction against the local stack; the
-- seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase7_portal_claim_throttle_tests.sql
--
-- The claim RPC now uses a non-raising { ok, reason } contract for normal
-- credential/state failures (so the failed-attempt ledger commits) and only
-- raises 42501 (null auth.uid) / 22023 (empty codes). A failed check raises
-- P0001 (FAIL) and aborts the script. The throttle is keyed on workspace_id, so
-- failed attempts from any identity converge on one per-workspace ledger row.

begin;

-- --------------------------------------------------------------------------
-- Setup. Two anonymous-style claimers; a manager issues fresh codes for an
-- unbound seeded staff member (Daniel, staff 14..02 / membership 13..03).
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, is_anonymous, created_at)
values
  ('00000000-0000-0000-0000-000000000000', 'ca000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', null, true, now()),
  ('00000000-0000-0000-0000-000000000000', 'ca000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, now());

create temporary table phase7_codes (label text primary key, code text not null) on commit drop;
grant select, insert on table phase7_codes to public;

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  ws_code text;
  daniel_code text;
begin
  ws_code := public.rpc_issue_workspace_portal_code('10000000-0000-4000-8000-000000000001');
  daniel_code := public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002');
  insert into phase7_codes (label, code) values ('ws', ws_code), ('daniel', daniel_code);
end $$;

reset role;

-- --------------------------------------------------------------------------
-- 1. Invalid workspace code creates no ledger row (unkeyed path is untouched).
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ca000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
begin
  result := public.rpc_claim_staff_portal_access('NOPE-NOPE', 'WHATEVER1');
  if (result ->> 'ok')::boolean is not false or result ->> 'reason' <> 'invalid' then
    raise exception 'FAIL: invalid workspace code returned %', result;
  end if;
end $$;

reset role;

do $$
declare
  ledger_rows integer;
begin
  select count(*) into ledger_rows from public.portal_claim_attempts;
  if ledger_rows <> 0 then
    raise exception 'FAIL: invalid workspace code created a ledger row (% rows)', ledger_rows;
  end if;
  raise notice 'PASS: invalid workspace code does not create or lock a ledger row';
end $$;

-- --------------------------------------------------------------------------
-- 2. A failed valid-workspace staff-code attempt increments the ledger, and a
--    failure returns normally without aborting the calling transaction.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ca000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  ws_code text;
  result jsonb;
begin
  select code into ws_code from phase7_codes where label = 'ws';

  result := public.rpc_claim_staff_portal_access(ws_code, 'WRNGCODE1');
  if result ->> 'reason' <> 'invalid' then
    raise exception 'FAIL: first failed attempt returned %', result;
  end if;

  -- Same transaction is still usable: the previous failure did not abort it.
  result := public.rpc_claim_staff_portal_access(ws_code, 'WRNGCODE2');
  if result ->> 'reason' <> 'invalid' then
    raise exception 'FAIL: second failed attempt aborted the transaction: %', result;
  end if;

  raise notice 'PASS: failed claims return normally and do not abort the transaction';
end $$;

reset role;

do $$
declare
  fc integer;
begin
  select failed_count into fc
  from public.portal_claim_attempts
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if fc is distinct from 2 then
    raise exception 'FAIL: ledger did not durably increment to 2 (got %)', fc;
  end if;
  raise notice 'PASS: failed valid-workspace staff-code attempts durably increment the ledger';
end $$;

-- --------------------------------------------------------------------------
-- 3. Threshold locks the workspace; a direct RPC call from any identity is then
--    throttled, even with a valid staff code.
-- --------------------------------------------------------------------------
reset role;
delete from public.portal_claim_attempts;

select set_config('request.jwt.claims', '{"sub":"ca000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  ws_code text;
  i integer;
begin
  select code into ws_code from phase7_codes where label = 'ws';
  for i in 1..10 loop
    perform public.rpc_claim_staff_portal_access(ws_code, 'BADCODE' || i::text);
  end loop;
end $$;

reset role;

do $$
declare
  fc integer;
  lu timestamptz;
begin
  select failed_count, locked_until into fc, lu
  from public.portal_claim_attempts
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if fc < 10 or lu is null or lu <= now() then
    raise exception 'FAIL: workspace not locked after threshold (count %, locked_until %)', fc, lu;
  end if;
  raise notice 'PASS: a workspace locks after the failed-attempt threshold';
end $$;

-- A different fresh identity calling the RPC directly is throttled identically,
-- and even the correct staff code is refused while the workspace is locked.
select set_config('request.jwt.claims', '{"sub":"ca000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  ws_code text;
  daniel_code text;
  result jsonb;
begin
  select code into ws_code from phase7_codes where label = 'ws';
  select code into daniel_code from phase7_codes where label = 'daniel';

  result := public.rpc_claim_staff_portal_access(ws_code, daniel_code);
  if (result ->> 'ok')::boolean is not false or result ->> 'reason' <> 'locked' then
    raise exception 'FAIL: locked workspace did not throttle a direct valid-code call: %', result;
  end if;
  raise notice 'PASS: a locked workspace throttles direct RPC calls from any identity';
end $$;

reset role;

-- --------------------------------------------------------------------------
-- 4. An elapsed window/lock resets the counter on the next attempt.
-- --------------------------------------------------------------------------
update public.portal_claim_attempts
set window_started_at = now() - interval '1 hour',
    locked_until = now() - interval '1 minute'
where workspace_id = '10000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claims', '{"sub":"ca000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  ws_code text;
  result jsonb;
begin
  select code into ws_code from phase7_codes where label = 'ws';
  result := public.rpc_claim_staff_portal_access(ws_code, 'POSTEXPIRY');
  if result ->> 'reason' <> 'invalid' then
    raise exception 'FAIL: post-expiry attempt returned %', result;
  end if;
end $$;

reset role;

do $$
declare
  fc integer;
  lu timestamptz;
begin
  select failed_count, locked_until into fc, lu
  from public.portal_claim_attempts
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if fc is distinct from 1 or lu is not null then
    raise exception 'FAIL: window did not reset (count %, locked_until %)', fc, lu;
  end if;
  raise notice 'PASS: an elapsed window/lock resets the failed-attempt counter';
end $$;

-- --------------------------------------------------------------------------
-- 5. A successful claim clears the workspace ledger.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ca000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  ws_code text;
  daniel_code text;
  result jsonb;
begin
  select code into ws_code from phase7_codes where label = 'ws';
  select code into daniel_code from phase7_codes where label = 'daniel';

  result := public.rpc_claim_staff_portal_access(ws_code, daniel_code);
  if (result ->> 'ok')::boolean is not true
     or (result ->> 'membership_id')::uuid <> '13000000-0000-4000-8000-000000000003' then
    raise exception 'FAIL: legitimate claim did not succeed: %', result;
  end if;
end $$;

reset role;

do $$
declare
  ledger_rows integer;
begin
  select count(*) into ledger_rows
  from public.portal_claim_attempts
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if ledger_rows <> 0 then
    raise exception 'FAIL: a successful claim did not clear the ledger (% rows)', ledger_rows;
  end if;
  raise notice 'PASS: a successful claim clears the workspace ledger';
end $$;

-- --------------------------------------------------------------------------
-- 6. Ledger table is unreachable by authenticated/anon roles.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    perform 1 from public.portal_claim_attempts limit 1;
    raise exception 'FAIL: authenticated role can read portal_claim_attempts directly';
  exception when insufficient_privilege then
    raise notice 'PASS: the attempt ledger is unreachable by authenticated roles';
  end;
end $$;

reset role;

-- --------------------------------------------------------------------------
-- 7. Anonymous cleanup deletes only stale, unlinked anonymous users.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, is_anonymous, created_at)
values
  ('00000000-0000-0000-0000-000000000000', 'cb000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', null, true, now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000000', 'cb000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, now()),
  ('00000000-0000-0000-0000-000000000000', 'cb000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000000', 'cb000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'real.manager@example.com', false, now() - interval '2 hours');

-- cb..03 is stale + anonymous but LINKED to a membership: it must survive.
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('13000000-0000-4000-8000-0000000000aa', '10000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000003', 'staff', 'active', now(), now());

do $$
declare
  deleted_count integer;
begin
  deleted_count := public.rpc_internal_cleanup_stale_anonymous_users();

  if exists (select 1 from auth.users where id = 'cb000000-0000-4000-8000-000000000001') then
    raise exception 'FAIL: stale unlinked anonymous user was not deleted';
  end if;
  if not exists (select 1 from auth.users where id = 'cb000000-0000-4000-8000-000000000002') then
    raise exception 'FAIL: a recent anonymous user was deleted';
  end if;
  if not exists (select 1 from auth.users where id = 'cb000000-0000-4000-8000-000000000003') then
    raise exception 'FAIL: a stale but linked anonymous user was deleted';
  end if;
  if not exists (select 1 from auth.users where id = 'cb000000-0000-4000-8000-000000000004') then
    raise exception 'FAIL: a stale non-anonymous user was deleted';
  end if;
  -- Only cb..01 qualified in this transaction.
  if deleted_count <> 1 then
    raise exception 'FAIL: cleanup deleted % users (expected exactly 1)', deleted_count;
  end if;

  raise notice 'PASS: cleanup deletes only stale, unlinked anonymous users';
end $$;

do $$ begin raise notice 'ALL PHASE 7 PORTAL CLAIM THROTTLE CHECKS PASSED'; end $$;

rollback;
