-- Phase 45 transactional staff creation verification. Rolled-back transaction
-- against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase45_transactional_staff_creation_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'b5000000-0000-4000-8000-000000004501', 'authenticated', 'authenticated', 'p45.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'b5000000-0000-4000-8000-000000004502', 'authenticated', 'authenticated', 'p45.staff@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'b5000000-0000-4000-8000-000000004503', 'authenticated', 'authenticated', 'p45.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('b5100000-0000-4000-8000-000000004501', 'p45-site', 'P45 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('b5200000-0000-4000-8000-000000004501', 'b5100000-0000-4000-8000-000000004501', 'P45 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('b5300000-0000-4000-8000-000000004501', 'b5100000-0000-4000-8000-000000004501', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('b5400000-0000-4000-8000-000000004501', 'b5100000-0000-4000-8000-000000004501', 'b5000000-0000-4000-8000-000000004501', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('b5400000-0000-4000-8000-000000004502', 'b5100000-0000-4000-8000-000000004501', 'b5000000-0000-4000-8000-000000004502', 'staff', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-000000004501","role":"authenticated"}', true);
set local role authenticated;

-- --------------------------------------------------------------------------
-- 1. Successful create: both rows exist, linked, and the membership is seeded
--    unclaimed so a personal portal code can be issued immediately.
-- --------------------------------------------------------------------------
do $$
declare
  result jsonb;
  new_staff_id uuid;
  new_membership_id uuid;
  membership_role text;
  membership_status text;
  membership_user uuid;
  staff_status text;
  linked_membership uuid;
  stored_email text;
begin
  result := public.rpc_create_staff_member(
    'b5100000-0000-4000-8000-000000004501',
    '  Ada Lovelace  ', '  ADA@Example.COM ', '  Chef  ',
    'b5300000-0000-4000-8000-000000004501', 'full_time', 2400);

  new_staff_id := (result ->> 'staff_member_id')::uuid;
  new_membership_id := (result ->> 'membership_id')::uuid;

  if new_staff_id is null or new_membership_id is null then
    raise exception 'FAIL: create returned incomplete identifiers %', result;
  end if;

  select role, status, user_id into membership_role, membership_status, membership_user
  from public.workspace_memberships where id = new_membership_id;
  if membership_role <> 'staff' or membership_status <> 'invited' or membership_user is not null then
    raise exception 'FAIL: membership seeded as %/%/% ', membership_role, membership_status, membership_user;
  end if;

  select employment_status, membership_id, email
  into staff_status, linked_membership, stored_email
  from public.staff_members where id = new_staff_id;
  if staff_status <> 'active' then
    raise exception 'FAIL: staff created with status %', staff_status;
  end if;
  if linked_membership is distinct from new_membership_id then
    raise exception 'FAIL: staff not linked to its membership';
  end if;
  if stored_email <> 'ada@example.com' then
    raise exception 'FAIL: email not normalised, got %', stored_email;
  end if;
  raise notice 'PASS: atomic create links an unclaimed membership and normalises input';
end $$;

-- --------------------------------------------------------------------------
-- 2. Duplicate email raises 23505 AND leaves no orphan membership. This is the
--    exact failure the previous best-effort compensation could not guarantee.
-- --------------------------------------------------------------------------
do $$
declare
  before_memberships integer;
  after_memberships integer;
begin
  select count(*) into before_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';

  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501',
      'Ada Clone', 'ada@example.com', 'Chef',
      'b5300000-0000-4000-8000-000000004501', 'full_time', 2400);
    raise exception 'FAIL: duplicate email was accepted';
  exception when sqlstate '23505' then
    raise notice 'PASS: duplicate email rejected (23505)';
  end;

  select count(*) into after_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';

  if after_memberships <> before_memberships then
    raise exception 'FAIL: orphan membership survived a failed create (% -> %)',
      before_memberships, after_memberships;
  end if;
  raise notice 'PASS: failed create left no orphan membership';
end $$;

-- --------------------------------------------------------------------------
-- 3. A department outside the workspace rolls the membership back too.
-- --------------------------------------------------------------------------
do $$
declare
  before_memberships integer;
  after_memberships integer;
begin
  select count(*) into before_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';

  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501',
      'Bad Dept', 'bad.dept@example.com', 'Chef',
      '00000000-0000-4000-8000-0000000000ff', 'full_time', 2400);
    raise exception 'FAIL: unknown department was accepted';
  exception when sqlstate '23503' then
    raise notice 'PASS: unknown department rejected (23503)';
  end;

  select count(*) into after_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';
  if after_memberships <> before_memberships then
    raise exception 'FAIL: orphan membership survived a department failure';
  end if;
  raise notice 'PASS: department failure rolled the membership back';
end $$;

-- --------------------------------------------------------------------------
-- 4. Invalid contracted hours (check constraint) also rolls back cleanly.
-- --------------------------------------------------------------------------
do $$
declare
  before_memberships integer;
  after_memberships integer;
begin
  select count(*) into before_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';

  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501',
      'Too Many Hours', 'hours@example.com', 'Chef',
      'b5300000-0000-4000-8000-000000004501', 'full_time', 99999);
    raise exception 'FAIL: out-of-range hours accepted';
  exception when sqlstate '23514' then
    raise notice 'PASS: out-of-range hours rejected (23514)';
  end;

  select count(*) into after_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';
  if after_memberships <> before_memberships then
    raise exception 'FAIL: orphan membership survived a check violation';
  end if;
  raise notice 'PASS: check violation rolled the membership back';
end $$;

-- --------------------------------------------------------------------------
-- 5. Blank name and blank role are refused before any write.
-- --------------------------------------------------------------------------
do $$
begin
  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501', '   ', null, 'Chef', null, null, null);
    raise exception 'FAIL: blank name accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: blank name rejected (22023)';
  end;

  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501', 'No Role', null, '  ', null, null, null);
    raise exception 'FAIL: blank role accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: blank role rejected (22023)';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 6. A staff-role member of the same workspace cannot create staff.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-000000004502","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501',
      'Staff Escalation', 'esc@example.com', 'Chef', null, null, null);
    raise exception 'FAIL: staff member created staff';
  exception when sqlstate '42501' then
    raise notice 'PASS: staff role blocked (42501)';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 7. Cross-workspace rejection: a signed-in user with no membership here.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-000000004503","role":"authenticated"}', true);

do $$
declare
  before_memberships integer;
  after_memberships integer;
begin
  select count(*) into before_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';

  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501',
      'Outsider Hire', 'outsider@example.com', 'Chef', null, null, null);
    raise exception 'FAIL: outsider created staff';
  exception when sqlstate '42501' then
    raise notice 'PASS: outsider blocked (42501)';
  end;

  select count(*) into after_memberships
  from public.workspace_memberships
  where workspace_id = 'b5100000-0000-4000-8000-000000004501';
  if after_memberships <> before_memberships then
    raise exception 'FAIL: rejected outsider still created a membership';
  end if;
  raise notice 'PASS: outsider create wrote nothing';
end $$;

-- --------------------------------------------------------------------------
-- 8. Anonymous callers are refused.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '', true);
reset role;
set local role anon;

do $$
begin
  begin
    perform public.rpc_create_staff_member(
      'b5100000-0000-4000-8000-000000004501',
      'Anon Hire', 'anon@example.com', 'Chef', null, null, null);
    raise exception 'FAIL: anonymous caller created staff';
  exception when sqlstate '42501' then
    raise notice 'PASS: anonymous blocked (42501)';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 9. The generic edit path: rpc_update_staff_member.
--
--    These cases are the reason the direct UPDATE grant can be revoked. Every
--    one of them is the state a manager could previously reach by hand.
-- --------------------------------------------------------------------------
reset role;

-- A second workspace, to prove the update is scoped and not merely filtered.
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'b5000000-0000-4000-8000-000000004504', 'authenticated', 'authenticated', 'p45.other@example.com');
insert into public.workspaces (id, slug, name, timezone)
values ('b5100000-0000-4000-8000-000000004502', 'p45-other', 'P45 Other', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('b5200000-0000-4000-8000-000000004502', 'b5100000-0000-4000-8000-000000004502', 'P45 Other', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('b5300000-0000-4000-8000-000000004502', 'b5100000-0000-4000-8000-000000004502', 'Bar');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('b5400000-0000-4000-8000-000000004503', 'b5100000-0000-4000-8000-000000004502', 'b5000000-0000-4000-8000-000000004504', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (
  id, workspace_id, primary_location_id, department_id, display_name, role_name
) values (
  'b5500000-0000-4000-8000-000000004502', 'b5100000-0000-4000-8000-000000004502',
  'b5200000-0000-4000-8000-000000004502', 'b5300000-0000-4000-8000-000000004502',
  'Other Workspace Staff', 'Bartender'
);

select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-000000004501","role":"authenticated"}', true);
set local role authenticated;

-- 9a. A direct authenticated table UPDATE is denied by the database itself.
do $$
declare
  target_id uuid;
begin
  select id into target_id from public.staff_members
  where workspace_id = 'b5100000-0000-4000-8000-000000004501' limit 1;

  begin
    update public.staff_members
    set employment_status = 'left'
    where workspace_id = 'b5100000-0000-4000-8000-000000004501' and id = target_id;
    raise exception 'FAIL: a handcrafted table update wrote employment_status';
  exception when insufficient_privilege then
    raise notice 'PASS: direct authenticated UPDATE on staff_members denied (42501)';
  end;

  -- Not just the status column: the whole direct write surface is closed.
  begin
    update public.staff_members
    set display_name = 'Direct Write'
    where workspace_id = 'b5100000-0000-4000-8000-000000004501' and id = target_id;
    raise exception 'FAIL: a handcrafted table update rewrote a staff field';
  exception when insufficient_privilege then
    raise notice 'PASS: direct authenticated UPDATE is closed for every column';
  end;
end $$;

-- 9b. active -> inactive -> active through the RPC, and omitted status preserved.
do $$
declare
  target_id uuid;
  result jsonb;
  status_now text;
  name_now text;
  phone_now text;
begin
  select id into target_id from public.staff_members
  where workspace_id = 'b5100000-0000-4000-8000-000000004501'
    and email = 'ada@example.com';

  result := public.rpc_update_staff_member(
    'b5100000-0000-4000-8000-000000004501', target_id,
    '  Ada Lovelace  ', '  ADA@Example.COM ', '  07700 900111  ', '  Head Chef  ',
    'b5300000-0000-4000-8000-000000004501', 'full_time', 2400, 'inactive');

  if (result ->> 'staff_member_id')::uuid is distinct from target_id then
    raise exception 'FAIL: update returned %', result;
  end if;

  select employment_status, display_name, phone into status_now, name_now, phone_now
  from public.staff_members where id = target_id;
  if status_now <> 'inactive' then
    raise exception 'FAIL: active -> inactive left status %', status_now;
  end if;
  if name_now <> 'Ada Lovelace' or phone_now <> '07700 900111' then
    raise exception 'FAIL: normalisation wrong (% / %)', name_now, phone_now;
  end if;
  raise notice 'PASS: active -> inactive through the update RPC, input normalised';

  perform public.rpc_update_staff_member(
    'b5100000-0000-4000-8000-000000004501', target_id,
    'Ada Lovelace', 'ada@example.com', null, 'Head Chef',
    'b5300000-0000-4000-8000-000000004501', 'full_time', 2400, 'active');

  select employment_status, phone into status_now, phone_now
  from public.staff_members where id = target_id;
  if status_now <> 'active' then
    raise exception 'FAIL: inactive -> active left status %', status_now;
  end if;
  if phone_now is not null then
    raise exception 'FAIL: an explicit null phone did not clear the field';
  end if;
  raise notice 'PASS: inactive -> active through the update RPC';

  -- Omitting the status preserves the stored one rather than resetting it.
  perform public.rpc_update_staff_member(
    'b5100000-0000-4000-8000-000000004501', target_id,
    'Ada Lovelace', 'ada@example.com', null, 'Head Chef',
    'b5300000-0000-4000-8000-000000004501', 'full_time', 2400, null);

  select employment_status into status_now from public.staff_members where id = target_id;
  if status_now <> 'active' then
    raise exception 'FAIL: omitted status changed it to %', status_now;
  end if;
  raise notice 'PASS: an omitted status preserves the stored value';
end $$;

-- 9c. The update RPC refuses 'left' outright.
do $$
declare
  target_id uuid;
  status_now text;
begin
  select id into target_id from public.staff_members
  where workspace_id = 'b5100000-0000-4000-8000-000000004501'
    and email = 'ada@example.com';

  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004501', target_id,
      'Ada Lovelace', 'ada@example.com', null, 'Head Chef',
      'b5300000-0000-4000-8000-000000004501', 'full_time', 2400, 'left');
    raise exception 'FAIL: the generic update accepted left';
  exception when sqlstate '55000' then
    raise notice 'PASS: generic update refuses left (55000)';
  end;

  select employment_status into status_now from public.staff_members where id = target_id;
  if status_now <> 'active' then
    raise exception 'FAIL: the refused left write still changed status to %', status_now;
  end if;

  -- An unsupported status is a validation error, not a silent coercion.
  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004501', target_id,
      'Ada Lovelace', 'ada@example.com', null, 'Head Chef',
      'b5300000-0000-4000-8000-000000004501', 'full_time', 2400, 'retired');
    raise exception 'FAIL: an unsupported status was accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: unsupported status rejected (22023)';
  end;
end $$;

-- 9d. Cross-workspace and unauthorised callers.
do $$
declare
  foreign_staff_id uuid;
  target_id uuid;
begin
  select id into target_id from public.staff_members
  where workspace_id = 'b5100000-0000-4000-8000-000000004501'
    and email = 'ada@example.com';

  -- The caller manages workspace 1; naming workspace 2 is refused outright.
  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004502', target_id,
      'Cross Tenant', null, null, 'Chef', null, null, null, 'active');
    raise exception 'FAIL: a manager updated another workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: cross-workspace update blocked (42501)';
  end;

  -- Naming their own workspace but another workspace's staff id finds nothing.
  foreign_staff_id := 'b5500000-0000-4000-8000-000000004502';

  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004501', foreign_staff_id,
      'Cross Tenant', null, null, 'Chef', null, null, null, 'active');
    raise exception 'FAIL: a foreign staff id was updated';
  exception when sqlstate 'P0002' then
    raise notice 'PASS: foreign staff id not found in this workspace (P0002)';
  end;

  -- A department belonging to another workspace is refused.
  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004501', target_id,
      'Ada Lovelace', 'ada@example.com', null, 'Head Chef',
      'b5300000-0000-4000-8000-000000004502', 'full_time', 2400, 'active');
    raise exception 'FAIL: a cross-workspace department was accepted';
  exception when sqlstate '55000' then
    raise notice 'PASS: cross-workspace department refused (55000)';
  end;
end $$;

-- Staff role and anonymous callers cannot use the update RPC.
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-000000004502","role":"authenticated"}', true);
do $$
declare
  target_id uuid;
begin
  select id into target_id from public.staff_members
  where workspace_id = 'b5100000-0000-4000-8000-000000004501'
    and email = 'ada@example.com';
  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004501', target_id,
      'Escalated', null, null, 'Chef', null, null, null, 'inactive');
    raise exception 'FAIL: a staff-role member updated staff';
  exception when sqlstate '42501' then
    raise notice 'PASS: staff role blocked from the update RPC (42501)';
  end;
end $$;

select set_config('request.jwt.claims', '', true);
reset role;
set local role anon;
do $$
begin
  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004501', 'b5500000-0000-4000-8000-000000004501',
      'Anon Edit', null, null, 'Chef', null, null, null, 'inactive');
    raise exception 'FAIL: anonymous caller updated staff';
  exception when sqlstate '42501' then
    raise notice 'PASS: anonymous blocked from the update RPC (42501)';
  end;
end $$;

-- --------------------------------------------------------------------------
-- 10. Offboarding still works, and an offboarded member cannot be reactivated
--     or corrupted through the generic edit.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-000000004501","role":"authenticated"}', true);
reset role;
set local role authenticated;

do $$
declare
  target_id uuid;
  membership uuid;
  result jsonb;
  status_now text;
  end_date_now date;
  membership_status text;
  audit_rows integer;
  name_now text;
begin
  select id, membership_id into target_id, membership from public.staff_members
  where workspace_id = 'b5100000-0000-4000-8000-000000004501'
    and email = 'ada@example.com';

  result := public.rpc_offboard_staff_member(
    'b5100000-0000-4000-8000-000000004501', target_id, 'Left for another role');

  select employment_status, end_date into status_now, end_date_now
  from public.staff_members where id = target_id;
  select status into membership_status from public.workspace_memberships where id = membership;
  select count(*) into audit_rows from public.audit_events
  where workspace_id = 'b5100000-0000-4000-8000-000000004501'
    and action = 'staff.offboarded'
    and subject_id = target_id;

  if status_now <> 'left' then
    raise exception 'FAIL: offboarding left status %', status_now;
  end if;
  if end_date_now is null then
    raise exception 'FAIL: offboarding recorded no end date';
  end if;
  if membership_status <> 'revoked' then
    raise exception 'FAIL: portal membership left as %', membership_status;
  end if;
  if audit_rows <> 1 then
    raise exception 'FAIL: offboarding wrote % audit events', audit_rows;
  end if;
  if (result ->> 'membership_revoked')::boolean is not true then
    raise exception 'FAIL: offboarding did not report the revocation';
  end if;
  raise notice 'PASS: offboarding still marks left, revokes access and audits';

  -- The generic edit may correct their details but must not reinstate them.
  begin
    perform public.rpc_update_staff_member(
      'b5100000-0000-4000-8000-000000004501', target_id,
      'Ada Lovelace', 'ada@example.com', null, 'Head Chef',
      'b5300000-0000-4000-8000-000000004501', 'full_time', 2400, 'active');
    raise exception 'FAIL: a generic edit reactivated an offboarded member';
  exception when sqlstate '55000' then
    raise notice 'PASS: generic edit cannot reinstate an offboarded member (55000)';
  end;

  perform public.rpc_update_staff_member(
    'b5100000-0000-4000-8000-000000004501', target_id,
    'Ada Lovelace-Byron', 'ada@example.com', null, 'Head Chef',
    'b5300000-0000-4000-8000-000000004501', 'full_time', 2400, null);

  select employment_status, display_name, end_date
  into status_now, name_now, end_date_now
  from public.staff_members where id = target_id;
  select status into membership_status from public.workspace_memberships where id = membership;

  if status_now <> 'left' then
    raise exception 'FAIL: editing an offboarded member changed status to %', status_now;
  end if;
  if name_now <> 'Ada Lovelace-Byron' then
    raise exception 'FAIL: the detail edit did not apply';
  end if;
  if end_date_now is null or membership_status <> 'revoked' then
    raise exception 'FAIL: editing corrupted the offboarded state';
  end if;
  raise notice 'PASS: an offboarded member can be corrected without being reinstated';
end $$;

reset role;

rollback;
