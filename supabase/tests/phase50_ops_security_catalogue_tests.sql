begin;

do $$
declare table_name text; missing text[] := array[]::text[];
  ops_tables text[] := array[
    'ops_rpc_requests','ops_entries','ops_entry_events','ops_handovers',
    'ops_handover_recipients','ops_handover_items','ops_briefings',
    'ops_briefing_recipients','ops_briefing_items','ops_checklist_templates',
    'ops_checklist_template_items','ops_checklist_runs','ops_checklist_run_items',
    'ops_checklist_run_item_events'
  ];
begin
  foreach table_name in array ops_tables loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=table_name and c.relrowsecurity) then
      missing := array_append(missing,table_name||':rls');
    end if;
    if has_table_privilege('anon','public.'||table_name,'SELECT,INSERT,UPDATE,DELETE')
       or has_table_privilege('authenticated','public.'||table_name,'INSERT,UPDATE,DELETE') then
      missing := array_append(missing,table_name||':direct-grant');
    end if;
  end loop;
  if cardinality(missing) > 0 then raise exception 'FAIL: Ops table security %',missing; end if;
  if has_table_privilege('authenticated','public.ops_rpc_requests','SELECT') then
    raise exception 'FAIL: receipt table readable by authenticated';
  end if;
end;
$$;

do $$
declare total integer; unsafe integer; client_exec integer; internal_exec integer;
begin
  select count(*) into total from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'rpc_ops_%';
  if total <> 21 then raise exception 'FAIL: expected 21 Ops RPC functions, got %',total; end if;
  select count(*) into unsafe from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'rpc_ops_%'
    and (not p.prosecdef or coalesce(array_to_string(p.proconfig,','),'') <> 'search_path=""');
  if unsafe <> 0 then raise exception 'FAIL: unsafe Ops RPC count %',unsafe; end if;
  select count(*) into client_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'rpc_ops_%'
    and has_function_privilege('authenticated',p.oid,'EXECUTE');
  if client_exec <> 19 then raise exception 'FAIL: expected 19 authenticated Ops RPCs, got %',client_exec; end if;
  select count(*) into internal_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('rpc_ops_claim_request','rpc_ops_finish_request')
    and (has_function_privilege('authenticated',p.oid,'EXECUTE')
      or has_function_privilege('anon',p.oid,'EXECUTE'));
  if internal_exec <> 0 then raise exception 'FAIL: internal receipt helper executable'; end if;
end;
$$;

do $$
declare helper text; executable boolean;
begin
  foreach helper in array array[
    'guard_ops_rpc_request_change','guard_ops_entry_parent',
    'guard_ops_handover_recipient_change','guard_ops_briefing_recipient_change',
    'guard_ops_checklist_template_change','guard_ops_checklist_run_change',
    'guard_ops_checklist_run_item_change'
  ] loop
    select exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=helper
        and (has_function_privilege('authenticated',p.oid,'EXECUTE')
          or has_function_privilege('anon',p.oid,'EXECUTE'))) into executable;
    if executable then raise exception 'FAIL: internal helper executable %',helper; end if;
  end loop;
end;
$$;

rollback;
