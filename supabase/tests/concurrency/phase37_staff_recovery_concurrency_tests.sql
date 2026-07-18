-- Phase 37 two-session proof: exactly one claimant can consume a recovery code.
-- LOCAL ONLY; the concurrency runner invokes this as supabase_admin.
begin;
create extension if not exists dblink;

create temp table phase37c_conn (connstr text primary key);
insert into phase37c_conn values ('dbname=postgres user=postgres');

-- Committed disposable fixture visible to both real database sessions.
select dblink_connect('phase37c_setup', (select connstr from phase37c_conn));
select dblink_exec('phase37c_setup', $setup$
  begin;
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, is_anonymous)
  values
    ('00000000-0000-0000-0000-000000000000', 'e4000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase37c.manager@example.test', now(), false),
    ('00000000-0000-0000-0000-000000000000', 'e4000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, null, true),
    ('00000000-0000-0000-0000-000000000000', 'e4000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, null, true),
    ('00000000-0000-0000-0000-000000000000', 'e4000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', null, null, true);

  insert into public.workspaces (id, slug, name, timezone)
  values ('e4100000-0000-4000-8000-000000000001', 'phase37-concurrency', 'Phase37 Concurrency', 'Europe/London');
  insert into public.locations (id, workspace_id, name, timezone)
  values ('e4200000-0000-4000-8000-000000000001', 'e4100000-0000-4000-8000-000000000001', 'Main', 'Europe/London');
  insert into public.departments (id, workspace_id, name)
  values ('e4300000-0000-4000-8000-000000000001', 'e4100000-0000-4000-8000-000000000001', 'Front of house');
  insert into public.workspace_memberships (
    id, workspace_id, user_id, role, status, invited_at, joined_at
  ) values
    ('e4400000-0000-4000-8000-000000000001', 'e4100000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'owner', 'active', now(), now()),
    ('e4400000-0000-4000-8000-000000000002', 'e4100000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000002', 'staff', 'active', now(), now());
  insert into public.staff_members (
    id, workspace_id, membership_id, primary_location_id, department_id,
    display_name, role_name, employment_status
  ) values (
    'e4500000-0000-4000-8000-000000000001',
    'e4100000-0000-4000-8000-000000000001',
    'e4400000-0000-4000-8000-000000000002',
    'e4200000-0000-4000-8000-000000000001',
    'e4300000-0000-4000-8000-000000000001',
    'Recovery Race Staff', 'Server', 'active'
  );
  insert into public.workspace_portal_access_codes (workspace_id, code_digest, issued_by_membership_id)
  values (
    'e4100000-0000-4000-8000-000000000001',
    public.rpc_internal_portal_code_digest('RACE-WS'),
    'e4400000-0000-4000-8000-000000000001'
  );
  insert into public.staff_portal_recovery_codes (
    id, workspace_id, staff_member_id, code_digest, issued_by_membership_id,
    expires_at, reason, previous_user_id
  ) values (
    'e4600000-0000-4000-8000-000000000001',
    'e4100000-0000-4000-8000-000000000001',
    'e4500000-0000-4000-8000-000000000001',
    public.rpc_internal_portal_code_digest('RACE-RECOVERY'),
    'e4400000-0000-4000-8000-000000000001',
    now() + interval '1 hour',
    'Two-session atomic claim proof',
    'e4000000-0000-4000-8000-000000000002'
  );
  commit;
$setup$);
select dblink_disconnect('phase37c_setup');

select dblink_connect('phase37c_a', (select connstr from phase37c_conn) || ' application_name=phase37c_a');
select dblink_connect('phase37c_b', (select connstr from phase37c_conn) || ' application_name=phase37c_b');

select dblink_send_query('phase37c_a', $claim_a$
  with auth_context as materialized (
    select set_config(
      'request.jwt.claims',
      '{"sub":"e4000000-0000-4000-8000-000000000003","role":"authenticated"}',
      false
    )
  )
  select public.rpc_claim_staff_portal_recovery('RACE-WS', 'RACE-RECOVERY')::text
  from auth_context;
$claim_a$);

select dblink_send_query('phase37c_b', $claim_b$
  with auth_context as materialized (
    select set_config(
      'request.jwt.claims',
      '{"sub":"e4000000-0000-4000-8000-000000000004","role":"authenticated"}',
      false
    )
  )
  select public.rpc_claim_staff_portal_recovery('RACE-WS', 'RACE-RECOVERY')::text
  from auth_context;
$claim_b$);

do $$
declare
  waited numeric := 0;
  result_a jsonb;
  result_b jsonb;
  success_count integer;
  used_count integer;
begin
  while (dblink_is_busy('phase37c_a') = 1 or dblink_is_busy('phase37c_b') = 1)
        and waited < 10 loop
    perform pg_sleep(0.05);
    waited := waited + 0.05;
  end loop;

  if dblink_is_busy('phase37c_a') = 1 or dblink_is_busy('phase37c_b') = 1 then
    raise exception 'FAIL: concurrent recovery claims did not finish';
  end if;

  select result::jsonb into result_a
  from dblink_get_result('phase37c_a') as response(result text);
  select result::jsonb into result_b
  from dblink_get_result('phase37c_b') as response(result text);

  success_count := ((result_a ->> 'ok')::boolean is true)::integer
                 + ((result_b ->> 'ok')::boolean is true)::integer;
  used_count := (result_a ->> 'reason' = 'used')::integer
              + (result_b ->> 'reason' = 'used')::integer;

  if success_count <> 1 or used_count <> 1 then
    raise exception 'FAIL: expected one success and one used result, got % / %', result_a, result_b;
  end if;

  perform 1 from public.workspace_memberships
  where id = 'e4400000-0000-4000-8000-000000000002'
    and user_id in (
      'e4000000-0000-4000-8000-000000000003',
      'e4000000-0000-4000-8000-000000000004'
    );
  if not found then raise exception 'FAIL: membership was not rebound to the winner'; end if;

  perform 1 from public.staff_portal_recovery_codes
  where id = 'e4600000-0000-4000-8000-000000000001'
    and claimed_at is not null
    and claimed_by_user_id in (
      'e4000000-0000-4000-8000-000000000003',
      'e4000000-0000-4000-8000-000000000004'
    );
  if not found then raise exception 'FAIL: recovery credential has no single winner'; end if;

  raise notice 'PASS: concurrent recovery claims serialize to one rebind and one replay rejection';
end $$;

select dblink_disconnect('phase37c_a');
select dblink_disconnect('phase37c_b');

-- Exact cleanup of the committed disposable fixture. Replica mode is local
-- test-only and needed solely to remove immutable audit evidence afterwards.
select dblink_connect('phase37c_cleanup', (select connstr from phase37c_conn));
select dblink_exec('phase37c_cleanup', $cleanup$
  begin;
  set local session_replication_role = replica;
  delete from public.audit_events where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.portal_claim_attempts where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.staff_portal_recovery_codes where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.workspace_portal_access_codes where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.staff_members where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.workspace_memberships where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.departments where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.locations where workspace_id = 'e4100000-0000-4000-8000-000000000001';
  delete from public.workspaces where id = 'e4100000-0000-4000-8000-000000000001';
  delete from auth.users where id in (
    'e4000000-0000-4000-8000-000000000001',
    'e4000000-0000-4000-8000-000000000002',
    'e4000000-0000-4000-8000-000000000003',
    'e4000000-0000-4000-8000-000000000004'
  );
  commit;
$cleanup$);
select dblink_disconnect('phase37c_cleanup');

rollback;
