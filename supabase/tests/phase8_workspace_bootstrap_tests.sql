-- Phase 8 first-workspace bootstrap verification. Runs entirely inside one
-- rolled-back transaction against the local stack; the seeded database is left
-- untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase8_workspace_bootstrap_tests.sql
--
-- Expected rejections are caught by exact SQLSTATE (42501 unauthenticated,
-- 55000 already has workspace, 22023 invalid parameter). A failed check raises
-- P0001 (FAIL) and aborts the script.

begin;

insert into auth.users (instance_id, id, aud, role, email, created_at)
values
  ('00000000-0000-0000-0000-000000000000', 'da000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'bootstrap.owner@example.com', now()),
  ('00000000-0000-0000-0000-000000000000', 'da000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'bootstrap.second@example.com', now()),
  ('00000000-0000-0000-0000-000000000000', 'da000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'bootstrap.guard.manager@example.com', now()),
  ('00000000-0000-0000-0000-000000000000', 'da000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'bootstrap.guard.owner@example.com', now()),
  ('00000000-0000-0000-0000-000000000000', 'da000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'bootstrap.validation@example.com', now());

select set_config('request.jwt.claims', '{"sub":"da000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
  created_workspace_id uuid;
  created_membership_id uuid;
  created_location_id uuid;
  created_department_id uuid;
  active_owner_count integer;
begin
  result := public.rpc_bootstrap_workspace(
    p_workspace_name := '  Bootstrap Bistro  ',
    p_slug := null,
    p_timezone := 'Europe/London',
    p_location_name := '  Main location  ',
    p_department_name := '  Front of house  '
  );

  created_workspace_id := (result ->> 'workspace_id')::uuid;
  created_membership_id := (result -> 'membership' ->> 'id')::uuid;
  created_location_id := (result -> 'location' ->> 'id')::uuid;
  created_department_id := (result -> 'department' ->> 'id')::uuid;

  if created_workspace_id is null or created_membership_id is null or created_location_id is null or created_department_id is null then
    raise exception 'FAIL: bootstrap result did not include all created ids: %', result;
  end if;

  perform 1 from public.workspaces
  where id = created_workspace_id
    and name = 'Bootstrap Bistro'
    and timezone = 'Europe/London'
    and slug ~ '^bootstrap-bistro(-[a-f0-9]{6})?$';
  if not found then
    raise exception 'FAIL: workspace was not created with normalized setup data: %', result;
  end if;

  select count(*) into active_owner_count
  from public.workspace_memberships as membership
  where membership.id = created_membership_id
    and membership.workspace_id = created_workspace_id
    and user_id = 'da000000-0000-4000-8000-000000000001'
    and role = 'owner'
    and status = 'active'
    and joined_at is not null;
  if active_owner_count <> 1 then
    raise exception 'FAIL: active owner membership was not created';
  end if;

  perform 1 from public.locations
  where id = created_location_id
    and workspace_id = created_workspace_id
    and name = 'Main location'
    and timezone = 'Europe/London'
    and status = 'active';
  if not found then
    raise exception 'FAIL: starter location was not created';
  end if;

  perform 1 from public.departments
  where id = created_department_id
    and workspace_id = created_workspace_id
    and name = 'Front of house'
    and status = 'active';
  if not found then
    raise exception 'FAIL: starter department was not created';
  end if;

  begin
    perform public.rpc_bootstrap_workspace('Second Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: second bootstrap succeeded for an existing active member';
  exception when sqlstate '55000' then
    raise notice 'PASS: second bootstrap is rejected';
  end;

  raise notice 'PASS: authenticated no-membership user bootstraps exactly once';
end $$;

select set_config('request.jwt.claims', '{"sub":"da000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_bootstrap_workspace(' ', null, 'Europe/London', null, null);
    raise exception 'FAIL: blank workspace name accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: blank workspace name rejected';
  end;

  begin
    perform public.rpc_bootstrap_workspace('Bad TZ', null, 'Not/A_Timezone', null, null);
    raise exception 'FAIL: invalid timezone accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: invalid timezone rejected';
  end;

  begin
    perform public.rpc_bootstrap_workspace('Bad Slug', 'Bad Slug', 'Europe/London', null, null);
    raise exception 'FAIL: invalid slug accepted';
  exception when sqlstate '22023' then
    raise notice 'PASS: invalid slug rejected';
  end;
end $$;

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

do $$
begin
  begin
    perform public.rpc_bootstrap_workspace('Unauthenticated Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: bootstrap ran without auth.uid()';
  exception when sqlstate '42501' then
    raise notice 'PASS: bootstrap requires auth.uid()';
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"da000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  result jsonb;
begin
  result := public.rpc_bootstrap_workspace(
    p_workspace_name := 'Whitespace Defaults',
    p_slug := null,
    p_timezone := '   ',
    p_location_name := '   ',
    p_department_name := '   '
  );

  if result -> 'workspace' ->> 'timezone' <> 'Europe/London'
     or result -> 'location' ->> 'name' <> 'Main location'
     or result -> 'department' ->> 'name' <> 'Front of house' then
    raise exception 'FAIL: whitespace optional setup fields did not use defaults: %', result;
  end if;

  raise notice 'PASS: whitespace optional setup fields use starter defaults';
end $$;

set local role anon;

do $$
begin
  begin
    perform public.rpc_bootstrap_workspace('Anon Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: anon role can execute bootstrap RPC';
  exception when insufficient_privilege then
    raise notice 'PASS: anon role cannot execute bootstrap RPC';
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);

-- Guard regression: a non-owner manager still cannot grant owner after the
-- bootstrap RPC has been introduced.
insert into public.workspaces (id, slug, name, timezone)
values ('41000000-0000-4000-8000-000000000001', 'phase8-guard', 'Phase8 Guard Workspace', 'Europe/London');

insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values
  ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000004', 'owner', 'active', now(), now()),
  ('42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000003', 'manager', 'active', now(), now());

select set_config('request.jwt.claims', '{"sub":"da000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    insert into public.workspace_memberships (workspace_id, role, status)
    values ('41000000-0000-4000-8000-000000000001', 'owner', 'invited');
    raise exception 'FAIL: manager created an owner membership after bootstrap migration';
  exception when insufficient_privilege then
    raise notice 'PASS: guard still blocks non-owner owner grants';
  end;
end $$;

reset role;

do $$
declare
  offenders text;
begin
  select string_agg(routine.proname || '(' || pg_get_function_identity_arguments(routine.oid) || ')', ', ')
  into offenders
  from pg_proc as routine
  where routine.pronamespace = 'public'::regnamespace
    and routine.proname = 'rpc_bootstrap_workspace'
    and has_function_privilege('anon', routine.oid, 'execute');
  if offenders is not null then
    raise exception 'FAIL: anon can execute: %', offenders;
  end if;

  raise notice 'PASS: bootstrap RPC grant surface is anon-free';
end $$;

do $$ begin raise notice 'ALL PHASE 8 WORKSPACE BOOTSTRAP CHECKS PASSED'; end $$;

rollback;
