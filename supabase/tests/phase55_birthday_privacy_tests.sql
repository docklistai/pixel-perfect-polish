-- Phase 55 birthday-column privacy verification. Every authority assertion uses
-- the real authenticated PostgreSQL role and the transaction is rolled back.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'a5520000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'staff-a.birthday-privacy@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a5520000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'staff-b.birthday-privacy@example.test');

update public.workspace_memberships
set user_id = 'a5520000-0000-4000-8000-000000000001', status = 'active',
    joined_at = '2026-08-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000002';

update public.workspace_memberships
set user_id = 'a5520000-0000-4000-8000-000000000002', status = 'active',
    joined_at = '2026-08-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000003';

update public.staff_members
set birth_day = 9, birth_month = 6
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '14000000-0000-4000-8000-000000000001';

update public.staff_members
set birth_day = 18, birth_month = 11
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and id = '14000000-0000-4000-8000-000000000002';

insert into public.workspaces (id, slug, name, timezone, status)
values ('55200000-0000-4000-8000-000000000001', 'phase55-birthday-private-other',
        'Phase 55 Birthday Privacy Other', 'Europe/London', 'active');

-- Staff A: all established non-birthday self-service columns remain readable,
-- another staff row remains hidden by RLS, and birthday columns fail at the
-- column-authority boundary rather than merely returning zero rows.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a5520000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  own_id constant uuid := '14000000-0000-4000-8000-000000000001';
  other_id constant uuid := '14000000-0000-4000-8000-000000000002';
  ws constant uuid := '10000000-0000-4000-8000-000000000001';
  n integer;
  item jsonb;
  denied boolean;
begin
  select count(*) into n
  from public.staff_members
  where workspace_id = ws and id = own_id
    and display_name = 'Sophie Carter';
  if n <> 1 then
    raise exception 'FAIL: staff lost permitted own-row identity/profile access';
  end if;

  -- Compile and execute every approved non-birthday column under the staff role.
  perform id, workspace_id, membership_id, primary_location_id, department_id,
          display_name, email, phone, role_name, employment_status, contract_type,
          contracted_minutes_per_week, start_date, end_date, created_at, updated_at
  from public.staff_members
  where workspace_id = ws and id = own_id;

  select count(*) into n
  from public.staff_members
  where workspace_id = ws and id = other_id;
  if n <> 0 then
    raise exception 'FAIL: staff can read another staff row';
  end if;

  denied := false;
  begin
    perform birth_day, birth_month
    from public.staff_members
    where workspace_id = ws and id = own_id;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FAIL: staff direct own-birthday SELECT was not denied';
  end if;

  denied := false;
  begin
    perform birth_day, birth_month
    from public.staff_members
    where workspace_id = ws and id = other_id;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FAIL: staff direct other-birthday SELECT was not denied';
  end if;

  select to_jsonb(profile) into item
  from public.staff_portal_profile as profile
  where profile.staff_member_id = own_id;
  if item is null or item ? 'birth_day' or item ? 'birth_month' then
    raise exception 'FAIL: staff portal profile failed or exposed birthday: %', item;
  end if;

  select count(*) into n
  from public.staff_portal_profile
  where staff_member_id = own_id;
  if n <> 1 then
    raise exception 'FAIL: security-invoker staff_portal_profile no longer works';
  end if;

  if public.current_staff_member_id(ws) is distinct from own_id then
    raise exception 'FAIL: authenticated staff identity resolution changed';
  end if;

  denied := false;
  begin
    perform * from public.rpc_team_read_staff_birthdays(ws);
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FAIL: staff used the manager birthday reader';
  end if;
end;
$$;

-- Seeded manager: non-birthday roster access stays intact, direct birthday
-- columns are denied, and the guarded contract supplies only scoped birthdays.
select set_config('request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  ws constant uuid := '10000000-0000-4000-8000-000000000001';
  other_ws constant uuid := '55200000-0000-4000-8000-000000000001';
  sophie constant uuid := '14000000-0000-4000-8000-000000000001';
  day_value smallint;
  month_value smallint;
  n integer;
  denied boolean;
begin
  select count(*) into n
  from public.staff_members
  where workspace_id = ws;
  if n <> 8 then
    raise exception 'FAIL: manager roster access changed: % rows', n;
  end if;

  denied := false;
  begin
    perform birth_day, birth_month
    from public.staff_members
    where workspace_id = ws;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FAIL: manager bypassed birthday contract with direct SELECT';
  end if;

  select birthday.birth_day, birthday.birth_month
  into day_value, month_value
  from public.rpc_team_read_staff_birthdays(ws) as birthday
  where birthday.staff_member_id = sophie;
  if day_value is distinct from 9 or month_value is distinct from 6 then
    raise exception 'FAIL: manager birthday reader returned %, %', day_value, month_value;
  end if;

  perform public.rpc_team_set_staff_birthday(
    ws, gen_random_uuid(), sophie, null, null
  );
  select birthday.birth_day, birthday.birth_month
  into day_value, month_value
  from public.rpc_team_read_staff_birthdays(ws) as birthday
  where birthday.staff_member_id = sophie;
  if day_value is not null or month_value is not null then
    raise exception 'FAIL: manager could not clear the birthday';
  end if;

  perform public.rpc_team_set_staff_birthday(
    ws, gen_random_uuid(), sophie, 9::smallint, 6::smallint
  );
  select birthday.birth_day, birthday.birth_month
  into day_value, month_value
  from public.rpc_team_read_staff_birthdays(ws) as birthday
  where birthday.staff_member_id = sophie;
  if day_value is distinct from 9 or month_value is distinct from 6 then
    raise exception 'FAIL: manager could not restore the birthday after clearing it';
  end if;

  denied := false;
  begin
    perform * from public.rpc_team_read_staff_birthdays(other_ws);
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'FAIL: manager read birthdays from another workspace';
  end if;
end;
$$;

reset role;

do $$
declare
  n integer;
begin
  if has_table_privilege('authenticated', 'public.staff_members', 'SELECT') then
    raise exception 'FAIL: authenticated still has table-wide staff_members SELECT';
  end if;

  if not has_table_privilege('authenticated', 'public.staff_members', 'INSERT')
     or not has_table_privilege('authenticated', 'public.staff_members', 'DELETE')
     or has_table_privilege('authenticated', 'public.staff_members', 'UPDATE') then
    raise exception 'FAIL: unrelated staff_members INSERT/DELETE/UPDATE grants changed';
  end if;

  if has_column_privilege('authenticated', 'public.staff_members', 'birth_day', 'SELECT')
     or has_column_privilege('authenticated', 'public.staff_members', 'birth_month', 'SELECT') then
    raise exception 'FAIL: birthday columns remain granted to authenticated';
  end if;

  select count(*) into n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'staff_members'
    and column_name in ('birth_year', 'date_of_birth', 'dob');
  if n <> 0 then
    raise exception 'FAIL: a birthday year/DOB column exists';
  end if;

  if has_table_privilege('anon', 'public.staff_members', 'SELECT')
     or has_function_privilege(
       'anon', 'public.rpc_team_read_staff_birthdays(uuid)', 'EXECUTE'
     ) then
    raise exception 'FAIL: anonymous birthday authority exists';
  end if;

  if not has_function_privilege(
       'authenticated', 'public.rpc_team_read_staff_birthdays(uuid)', 'EXECUTE'
     ) then
    raise exception 'FAIL: authenticated cannot invoke the guarded birthday reader';
  end if;

  select count(*) into n
  from pg_policies
  where schemaname = 'public' and tablename = 'staff_members'
    and policyname in ('staff_members_self_select', 'staff_members_manager_all');
  if n <> 2 then
    raise exception 'FAIL: existing staff_members RLS policies changed';
  end if;
end;
$$;

rollback;
