-- ===========================================================================
-- Phase 69: Workspace Staff Contact & Bulk Portal Access Codes Tests (WS-9)
-- ---------------------------------------------------------------------------
-- Proves:
--   1. Workspace staff contact:
--      * Manager can update workspace staff contact info.
--      * Non-manager (staff caller) cannot update contact info (42501).
--      * Authenticated staff member querying staff_portal_profile sees contact info.
--      * Anon caller cannot see staff_portal_profile rows.
--   2. Bulk portal access code issuance:
--      * Staff caller cannot call rpc_bulk_issue_staff_portal_access_codes (42501).
--      * Nonexistent staff member raises P0002.
--      * Inactive staff member raises 55000.
--      * Already claimed staff member raises 55000.
--      * Eligible staff members receive 14-day single-use access codes with digests
--        stored in staff_portal_access_codes and audit event logged.
-- ===========================================================================

begin;

-- Setup test users
insert into auth.users (instance_id, id, aud, role, email, is_anonymous, created_at)
values
  ('00000000-0000-0000-0000-000000000000', 'e6900000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'p69.staff@example.test', false, now()),
  ('00000000-0000-0000-0000-000000000002', 'e6900000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'p69.claimed@example.test', false, now());

-- Activate staff membership 13...0005 for user e69...0001 (staff member 14...0004 Liam)
update public.workspace_memberships
set user_id = 'e6900000-0000-4000-8000-000000000001',
    status = 'active',
    joined_at = now()
where id = '13000000-0000-4000-8000-000000000005';

-- Bind claimed staff membership 13...0009 for user e69...0002 (staff member 14...0008 Noah)
update public.workspace_memberships
set user_id = 'e6900000-0000-4000-8000-000000000002',
    status = 'active',
    joined_at = now()
where id = '13000000-0000-4000-8000-000000000009';

-- Setup an inactive staff member for refusal testing
insert into public.staff_members (
  id, workspace_id, display_name, role_name, employment_status
) values (
  'e6910000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Inactive Staff Test',
  'Server',
  'inactive'
);

-- Setup an active unclaimed staff member with an invited membership
insert into public.workspace_memberships (
  id, workspace_id, user_id, role, status
) values (
  'e6920000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  null,
  'staff',
  'invited'
);

insert into public.staff_members (
  id, workspace_id, display_name, role_name, employment_status, membership_id
) values (
  'e6930000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Unclaimed Active Staff 1',
  'Bartender',
  'active',
  'e6920000-0000-4000-8000-000000000001'
);

-- ---------------------------------------------------------------------------
-- 1. Workspace Staff Contact
-- ---------------------------------------------------------------------------

-- Manager Alex sets the workspace staff contact
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select public.rpc_update_workspace_staff_contact(
  '10000000-0000-4000-8000-000000000001',
  'Alex Thompson',
  'manager@harbourview.co.uk',
  '+44 20 7946 0123'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- Verify stored in public.workspaces
do $$
declare
  v_name text;
  v_email text;
  v_phone text;
begin
  select staff_contact_name, staff_contact_email, staff_contact_phone
  into v_name, v_email, v_phone
  from public.workspaces
  where id = '10000000-0000-4000-8000-000000000001';

  if v_name <> 'Alex Thompson' or v_email <> 'manager@harbourview.co.uk' or v_phone <> '+44 20 7946 0123' then
    raise exception 'FAIL: workspace staff contact not stored correctly: %, %, %', v_name, v_email, v_phone;
  end if;
end $$;

-- Non-manager (staff Liam) cannot update workspace contact
select set_config('request.jwt.claims', '{"sub":"e6900000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  perform public.rpc_update_workspace_staff_contact(
    '10000000-0000-4000-8000-000000000001',
    'Malicious Override',
    'hacker@example.com',
    null
  );
  raise exception 'FAIL: staff member was able to update workspace staff contact';
exception
  when sqlstate '42501' then
    -- Expected: permission denied
    null;
end $$;

-- Staff Liam querying staff_portal_profile sees the contact info
do $$
declare
  v_name text;
  v_email text;
  v_phone text;
begin
  select staff_contact_name, staff_contact_email, staff_contact_phone
  into v_name, v_email, v_phone
  from public.staff_portal_profile
  where workspace_id = '10000000-0000-4000-8000-000000000001';

  if v_name <> 'Alex Thompson' or v_email <> 'manager@harbourview.co.uk' or v_phone <> '+44 20 7946 0123' then
    raise exception 'FAIL: staff_portal_profile did not expose staff contact: %, %, %', v_name, v_email, v_phone;
  end if;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- Anon caller cannot read staff_portal_profile (permission denied)
set local role anon;
do $$
declare
  v_count int;
begin
  begin
    select count(*) into v_count from public.staff_portal_profile;
    raise exception 'FAIL: anon was granted access to staff_portal_profile';
  exception
    when sqlstate '42501' then
      null; -- Expected: permission denied
  end;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 2. Bulk Portal Access Codes
-- ---------------------------------------------------------------------------

-- Staff caller cannot call rpc_bulk_issue_staff_portal_access_codes
select set_config('request.jwt.claims', '{"sub":"e6900000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  perform * from public.rpc_bulk_issue_staff_portal_access_codes('10000000-0000-4000-8000-000000000001');
  raise exception 'FAIL: staff member was able to invoke rpc_bulk_issue_staff_portal_access_codes';
exception
  when sqlstate '42501' then
    null;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- Manager Alex tests refusals
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Nonexistent staff member ID -> P0002
do $$
begin
  perform * from public.rpc_bulk_issue_staff_portal_access_codes(
    '10000000-0000-4000-8000-000000000001',
    array['00000000-0000-4000-8000-000000000099'::uuid]
  );
  raise exception 'FAIL: nonexistent staff ID did not raise P0002';
exception
  when sqlstate 'P0002' then
    null;
end $$;

-- Inactive staff member -> 55000
do $$
begin
  perform * from public.rpc_bulk_issue_staff_portal_access_codes(
    '10000000-0000-4000-8000-000000000001',
    array['e6910000-0000-4000-8000-000000000001'::uuid]
  );
  raise exception 'FAIL: inactive staff ID did not raise 55000';
exception
  when sqlstate '55000' then
    null;
end $$;

-- Already claimed staff member (Noah) -> 55000
do $$
begin
  perform * from public.rpc_bulk_issue_staff_portal_access_codes(
    '10000000-0000-4000-8000-000000000001',
    array['14000000-0000-4000-8000-000000000008'::uuid]
  );
  raise exception 'FAIL: already-claimed staff member did not raise 55000';
exception
  when sqlstate '55000' then
    null;
end $$;

-- Successful bulk issuance for unclaimed active staff member
create temporary table p69_issued_codes (
  staff_member_id uuid,
  display_name text,
  role_name text,
  access_code text,
  expires_at timestamptz
) on commit drop;

insert into p69_issued_codes
select * from public.rpc_bulk_issue_staff_portal_access_codes(
  '10000000-0000-4000-8000-000000000001',
  array['e6930000-0000-4000-8000-000000000001'::uuid]
);

reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  v_row p69_issued_codes%rowtype;
  v_stored_digest bytea;
  v_audit_count int;
begin
  select * into v_row from p69_issued_codes where staff_member_id = 'e6930000-0000-4000-8000-000000000001';
  if not found then
    raise exception 'FAIL: expected issued code row not returned';
  end if;

  if length(v_row.access_code) <> 10 then
    raise exception 'FAIL: access code length is not 10: %', v_row.access_code;
  end if;

  if v_row.expires_at < now() + interval '13 days' or v_row.expires_at > now() + interval '15 days' then
    raise exception 'FAIL: unexpected expires_at: %', v_row.expires_at;
  end if;

  -- Verify staff_portal_access_codes record
  select code_digest into v_stored_digest
  from public.staff_portal_access_codes
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and staff_member_id = 'e6930000-0000-4000-8000-000000000001';

  if v_stored_digest <> public.rpc_internal_portal_code_digest(v_row.access_code) then
    raise exception 'FAIL: stored code digest does not match issued code';
  end if;

  -- Verify audit event logged
  select count(*) into v_audit_count
  from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'staff_portal_code_issued'
    and subject_id = 'e6930000-0000-4000-8000-000000000001';

  if v_audit_count = 0 then
    raise exception 'FAIL: audit event staff_portal_code_issued not found';
  end if;
end $$;

rollback;
