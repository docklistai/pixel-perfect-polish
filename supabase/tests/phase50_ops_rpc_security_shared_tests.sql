-- Phase 50 — the guarantees every client-executable Ops RPC must share.
-- Driven from pg_proc, so a new rpc_ops_* function is covered the moment it is granted.
begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

reset role;

-- A suspended manager and a revoked manager in the real workspace.
insert into auth.users (instance_id, id, aud, role, email) values
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000005',
 'authenticated','authenticated','ops.suspended@example.com'),
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000006',
 'authenticated','authenticated','ops.revoked@example.com');
insert into public.workspace_memberships
  (id, workspace_id, user_id, role, status, invited_at, joined_at) values
('f5040000-0000-4000-8000-000000000005','f5010000-0000-4000-8000-000000000001',
 'f5000000-0000-4000-8000-000000000005','manager','suspended',now(),now()),
('f5040000-0000-4000-8000-000000000006','f5010000-0000-4000-8000-000000000001',
 'f5000000-0000-4000-8000-000000000006','manager','revoked',now(),now());

-- Seed one entry and one lifecycle event so immutability has something to protect.
insert into public.ops_entries (
  id, workspace_id, entry_type, parent_entry_id, title, location_id, status, priority,
  created_by_membership_id, logged_at, created_at, updated_at
) values
('f5680000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','task',null,
 'Guarded entry','f5020000-0000-4000-8000-000000000001','open','normal',
 'f5040000-0000-4000-8000-000000000001',now(),now(),now());
insert into public.ops_entry_events (
  id, workspace_id, ops_entry_id, actor_membership_id, request_id,
  event_type, resulting_status, occurred_at
) values
('f5690000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5680000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000001',
 'f56a0000-0000-4000-8000-000000000001','created','open',now());

-- Row-level reject triggers only fire against real rows, so every append-only table
-- gets one before immutability is asserted.
insert into public.ops_handovers (id, workspace_id, location_id, handover_date,
  from_membership_id, notes) values
('f56b0000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'f5040000-0000-4000-8000-000000000001','Immutable handover');
insert into public.ops_handover_items (id, workspace_id, handover_id, ops_entry_id) values
('f56c0000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f56b0000-0000-4000-8000-000000000001','f5680000-0000-4000-8000-000000000001');
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id) values
('f56d0000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'Immutable briefing','Recorded history.','f5040000-0000-4000-8000-000000000001');
insert into public.ops_briefing_items (id, workspace_id, briefing_id, ops_entry_id) values
('f56e0000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f56d0000-0000-4000-8000-000000000001','f5680000-0000-4000-8000-000000000001');
insert into public.ops_checklist_templates (id, workspace_id, name, location_id,
  created_by_membership_id) values
('f56f0000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'Immutable template','f5020000-0000-4000-8000-000000000001',
 'f5040000-0000-4000-8000-000000000001');
insert into public.ops_checklist_template_items (id, workspace_id, template_id, position,
  label, requires_note) values
('f5700000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f56f0000-0000-4000-8000-000000000001',1,'Check the plant room',false);
insert into public.ops_checklist_runs (id, workspace_id, template_id, location_id, run_date,
  started_by_membership_id) values
('f5710000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f56f0000-0000-4000-8000-000000000001','f5020000-0000-4000-8000-000000000001',
 (now() at time zone 'Pacific/Kiritimati')::date,'f5040000-0000-4000-8000-000000000001');
insert into public.ops_checklist_run_items (id, workspace_id, run_id, template_item_id,
  position, label, requires_note) values
('f5720000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5710000-0000-4000-8000-000000000001','f5700000-0000-4000-8000-000000000001',1,
 'Check the plant room',false);
insert into public.ops_checklist_run_item_events (id, workspace_id, run_item_id,
  actor_membership_id, request_id, previous_state, resulting_state) values
('f5730000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5720000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000001',
 'f5740000-0000-4000-8000-000000000001','pending','done');

-- 1. Catalogue guarantees: anon can execute nothing; every client RPC is a definer
--    function with a pinned empty search_path.
do $$
declare anon_exec integer; unsafe integer; client_exec integer;
begin
  select count(*) into anon_exec from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'rpc_ops_%'
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  if anon_exec <> 0 then
    raise exception 'FAIL: % Ops RPC(s) executable by anon', anon_exec;
  end if;
  select count(*) into client_exec from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'rpc_ops_%'
    and has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if client_exec <> 19 then
    raise exception 'FAIL: expected 19 client Ops RPCs, got %', client_exec;
  end if;
  select count(*) into unsafe from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'rpc_ops_%'
    and (not p.prosecdef or coalesce(array_to_string(p.proconfig, ','), '') <> 'search_path=""');
  if unsafe <> 0 then
    raise exception 'FAIL: % Ops RPC(s) not definer with pinned search_path', unsafe;
  end if;
end;
$$;

-- 2. Every client-executable RPC refuses every unauthorised actor, and writes nothing.
do $$
declare
  actor record;
  rpc record;
  call_sql text;
  refused boolean;
  refusal_state text;
  allowed text[];
  before_counts jsonb;
  after_counts jsonb;
  ops_table text;
  counted bigint;
  workspace uuid := 'f5010000-0000-4000-8000-000000000001';
  ops_tables text[] := array[
    'ops_entries','ops_entry_events','ops_handovers','ops_handover_recipients',
    'ops_handover_items','ops_briefings','ops_briefing_recipients','ops_briefing_items',
    'ops_checklist_templates','ops_checklist_template_items','ops_checklist_runs',
    'ops_checklist_run_items','ops_checklist_run_item_events','ops_rpc_requests',
    'notifications','audit_events'
  ];
begin
  before_counts := '{}'::jsonb;
  foreach ops_table in array ops_tables loop
    execute format('select count(*) from public.%I', ops_table) into counted;
    before_counts := before_counts || jsonb_build_object(ops_table, counted);
  end loop;

  for actor in
    select * from (values
      ('anon', null::text, 'anon'),
      ('staff', 'f5000000-0000-4000-8000-000000000003', 'authenticated'),
      ('suspended manager', 'f5000000-0000-4000-8000-000000000005', 'authenticated'),
      ('revoked manager', 'f5000000-0000-4000-8000-000000000006', 'authenticated'),
      ('foreign workspace owner', 'f5000000-0000-4000-8000-000000000004', 'authenticated')
    ) as t(label, subject, db_role)
  loop
    allowed := array[]::text[];
    for rpc in
      select p.proname, p.pronargs
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname like 'rpc_ops_%'
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      order by p.proname
    loop
      -- Every Ops RPC takes p_workspace_id first and calls the manager guard before it
      -- validates anything else, so null arguments still exercise the refusal path.
      call_sql := format('select public.%I(%L::uuid%s)', rpc.proname, workspace,
        repeat(',null', rpc.pronargs - 1));
      if actor.subject is null then
        perform set_config('request.jwt.claims', null, true);
      else
        perform set_config('request.jwt.claims',
          json_build_object('sub', actor.subject, 'role', 'authenticated')::text, true);
      end if;
      perform set_config('role', actor.db_role, true);

      refused := false;
      begin
        execute call_sql;
      exception when others then
        refused := true;
        get stacked diagnostics refusal_state = returned_sqlstate;
      end;

      perform set_config('role', 'postgres', true);
      if not refused then
        allowed := array_append(allowed, rpc.proname);
      elsif refusal_state <> '42501' then
        -- Proves the refusal is an authorisation decision, not a malformed call.
        allowed := array_append(allowed,
          format('%s(refused with %s)', rpc.proname, refusal_state));
      end if;
    end loop;

    if cardinality(allowed) > 0 then
      raise exception 'FAIL: % was allowed to execute %', actor.label, allowed;
    end if;
  end loop;

  perform set_config('role', 'postgres', true);
  after_counts := '{}'::jsonb;
  foreach ops_table in array ops_tables loop
    execute format('select count(*) from public.%I', ops_table) into counted;
    after_counts := after_counts || jsonb_build_object(ops_table, counted);
  end loop;
  if before_counts <> after_counts then
    raise exception 'FAIL: refused Ops RPCs wrote rows. before % after %',
      before_counts, after_counts;
  end if;
end;
$$;

-- 3. Immutable history cannot be rewritten, by any role, through any path.
do $$
declare
  target record;
  mutated text[] := array[]::text[];
  blocked boolean;
  seeded_rows bigint;
begin
  for target in
    select * from (values
      ('ops_entry_events'),
      ('ops_handovers'),
      ('ops_briefings'),
      ('ops_briefing_items'),
      ('ops_handover_items'),
      ('ops_checklist_template_items'),
      ('ops_checklist_run_item_events')
    ) as t(table_name)
  loop
    -- Each table holds a seeded row, so the row-level reject trigger actually fires.
    execute format('select count(*) from public.%I', target.table_name) into seeded_rows;
    if seeded_rows = 0 then
      raise exception 'FAIL: immutability target % has no seeded row to protect',
        target.table_name;
    end if;
    blocked := false;
    begin
      execute format('update public.%I set workspace_id = workspace_id', target.table_name);
    exception when others then
      blocked := true;
    end;
    if not blocked then
      mutated := array_append(mutated, target.table_name || ':update');
    end if;

    blocked := false;
    begin
      execute format('delete from public.%I', target.table_name);
    exception when others then
      blocked := true;
    end;
    if not blocked then
      mutated := array_append(mutated, target.table_name || ':delete');
    end if;
  end loop;

  if cardinality(mutated) > 0 then
    raise exception 'FAIL: immutable Ops history was mutable %', mutated;
  end if;
end;
$$;

-- 4. The seeded lifecycle event is still exactly as written.
do $$
declare surviving integer;
begin
  select count(*) into surviving from public.ops_entry_events
  where id = 'f5690000-0000-4000-8000-000000000001'
    and event_type = 'created' and resulting_status = 'open';
  if surviving <> 1 then
    raise exception 'FAIL: seeded lifecycle event was altered or removed';
  end if;
end;
$$;

rollback;
