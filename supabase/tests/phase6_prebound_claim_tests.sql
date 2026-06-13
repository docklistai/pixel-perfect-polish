-- Regression for blocker 3/4: the staff-code issuer must refuse a membership
-- that is already bound to an auth identity (claimed or pre-bound) and must
-- never null its user_id. The pre-bound setup goes through real membership/
-- staff rows; the code path under test is the issuer RPC, not a direct digest
-- insertion into staff_portal_access_codes.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values (
  '00000000-0000-0000-0000-000000000000',
  'ba000000-0000-4000-8000-000000000010',
  'authenticated',
  'authenticated',
  'prebound.staff@example.com'
);

-- A staff membership that is invited but already linked to an auth identity.
insert into public.workspace_memberships (
  id, workspace_id, user_id, role, status, invited_at
)
values (
  '13000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000001',
  'ba000000-0000-4000-8000-000000000010',
  'staff',
  'invited',
  transaction_timestamp()
);

insert into public.staff_members (
  id, workspace_id, membership_id, primary_location_id, department_id,
  display_name, role_name
)
values (
  '14000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000012',
  '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  'Pre-bound Staff',
  'Waiter'
);

-- Manager Alex (membership 13..11) attempts to issue/reissue a code for the
-- pre-bound staff member.
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  bound_user uuid;
  bound_status text;
begin
  begin
    perform public.rpc_issue_staff_portal_code(
      '10000000-0000-4000-8000-000000000001',
      '14000000-0000-4000-8000-000000000010'
    );
    raise exception 'FAIL: issuer created a portal code for a pre-bound membership';
  exception when sqlstate '55000' then
    raise notice 'PASS: issuer refuses to reissue a code for a pre-bound membership';
  end;

  -- The refusal must leave the existing identity binding untouched.
  select user_id, status
  into bound_user, bound_status
  from public.workspace_memberships
  where id = '13000000-0000-4000-8000-000000000012';

  if bound_user is distinct from 'ba000000-0000-4000-8000-000000000010'
     or bound_status <> 'invited' then
    raise exception 'FAIL: reissue attempt mutated a pre-bound membership (user %, status %)',
      bound_user, bound_status;
  end if;

  raise notice 'PASS: pre-bound membership user_id is preserved';
end $$;

-- No staff code row should exist for that member: nothing reached the table.
reset role;

do $$
declare
  code_count int;
begin
  select count(*)
  into code_count
  from public.staff_portal_access_codes
  where staff_member_id = '14000000-0000-4000-8000-000000000010';

  if code_count <> 0 then
    raise exception 'FAIL: a code row was written for a pre-bound membership (% rows)', code_count;
  end if;

  raise notice 'PASS: no portal code row was created for the pre-bound membership';
end $$;

do $$ begin raise notice 'ALL PHASE 6 PRE-BOUND CHECKS PASSED'; end $$;

rollback;
