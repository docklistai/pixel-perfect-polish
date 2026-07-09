-- Phase 21 role-colours verification. Rolled-back transaction against the local
-- stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase21_role_colours_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000501', 'authenticated', 'authenticated', 'p21.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000502', 'authenticated', 'authenticated', 'p21.staff@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000503', 'authenticated', 'authenticated', 'p21.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('71000000-0000-4000-8000-000000000501', 'p21-site', 'P21 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('72000000-0000-4000-8000-000000000501', '71000000-0000-4000-8000-000000000501', 'P21 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('73000000-0000-4000-8000-000000000501', '71000000-0000-4000-8000-000000000501', 'Front of House');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('74000000-0000-4000-8000-000000000501', '71000000-0000-4000-8000-000000000501', 'ad000000-0000-4000-8000-000000000501', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z'),
  ('74000000-0000-4000-8000-000000000502', '71000000-0000-4000-8000-000000000501', 'ad000000-0000-4000-8000-000000000502', 'staff', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('75000000-0000-4000-8000-000000000501', '71000000-0000-4000-8000-000000000501', '74000000-0000-4000-8000-000000000502', '72000000-0000-4000-8000-000000000501', '73000000-0000-4000-8000-000000000501', 'P21 Staff', 'Waiter');

-- MANAGER: create, update, read; reject an invalid preset.
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000501","role":"authenticated"}', true);
set local role authenticated;

do $$
declare saved text;
begin
  insert into public.workspace_role_colours (workspace_id, role_name, colour_preset)
  values ('71000000-0000-4000-8000-000000000501', 'Waiter', 'teal');
  update public.workspace_role_colours set colour_preset = 'blue'
  where workspace_id = '71000000-0000-4000-8000-000000000501' and role_name = 'Waiter';
  select colour_preset into saved from public.workspace_role_colours
  where workspace_id = '71000000-0000-4000-8000-000000000501' and role_name = 'Waiter';
  if saved is distinct from 'blue' then
    raise exception 'FAIL: manager could not read back updated colour (got %)', saved;
  end if;
  raise notice 'PASS: manager creates, updates, reads a role colour';

  begin
    insert into public.workspace_role_colours (workspace_id, role_name, colour_preset)
    values ('71000000-0000-4000-8000-000000000501', 'Chef', 'neon');
    raise exception 'FAIL: invalid colour preset accepted';
  exception when check_violation then
    raise notice 'PASS: invalid colour preset rejected';
  end;
end $$;

-- STAFF: cannot read or write.
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000502","role":"authenticated"}', true);
do $$
declare rows bigint;
begin
  select count(*) into rows from public.workspace_role_colours;
  if rows <> 0 then raise exception 'FAIL: staff sees % role colours', rows; end if;
  begin
    insert into public.workspace_role_colours (workspace_id, role_name, colour_preset)
    values ('71000000-0000-4000-8000-000000000501', 'Chef', 'amber');
    raise exception 'FAIL: staff inserted a role colour';
  exception when sqlstate '42501' then
    raise notice 'PASS: role colours are manager-only';
  end;
end $$;

-- OUTSIDER: sees nothing.
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000503","role":"authenticated"}', true);
do $$
declare rows bigint;
begin
  select count(*) into rows from public.workspace_role_colours;
  if rows <> 0 then raise exception 'FAIL: outsider sees % role colours', rows; end if;
  raise notice 'PASS: outsider sees nothing';
end $$;

rollback;
