begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

do $$
<<checklist_case>>
declare template_id uuid; run_id uuid; first_item uuid; second_item uuid; linked_entry uuid;
  local_today date; refused boolean; caught text; page jsonb;
begin
  local_today := (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date;
  template_id := (public.rpc_ops_create_checklist_template('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000001','Opening safety','f5020000-0000-4000-8000-000000000001',
    'f5030000-0000-4000-8000-000000000001','opening','morning',
    array['Check fire exit','Check first-aid kit'],array[false,true])->>'template_id')::uuid;
  perform public.rpc_ops_set_checklist_template_active('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000030',template_id,false);
  refused:=false;
  begin perform public.rpc_ops_start_checklist_run('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000031',template_id,'f5020000-0000-4000-8000-000000000001',
    local_today,null);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: inactive template start refusal %',caught; end if;
  perform public.rpc_ops_set_checklist_template_active('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000032',template_id,true);
  run_id := (public.rpc_ops_start_checklist_run('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000002',template_id,'f5020000-0000-4000-8000-000000000001',
    local_today,'f5050000-0000-4000-8000-000000000003')->>'run_id')::uuid;
  select item.id into first_item from public.ops_checklist_run_items as item where item.run_id=checklist_case.run_id and item.position=1;
  select item.id into second_item from public.ops_checklist_run_items as item where item.run_id=checklist_case.run_id and item.position=2;
  perform public.rpc_ops_set_checklist_run_item('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000003',first_item,'exception','Exit was obstructed');
  select linked_ops_entry_id into linked_entry from public.ops_checklist_run_items where id=first_item;
  if linked_entry is null or not exists (select 1 from public.ops_entries where id=linked_entry
      and entry_type='task' and priority='high') then
    raise exception 'FAIL: checklist exception did not create linked Ops task';
  end if;
  if not exists (select 1 from public.ops_entry_events where ops_entry_id=linked_entry and event_type='created') then
    raise exception 'FAIL: linked exception task event missing';
  end if;
  if (select count(*) from public.ops_checklist_run_item_events where run_item_id=first_item) <> 1 then
    raise exception 'FAIL: checklist item history count';
  end if;
  refused:=false;
  begin perform public.rpc_ops_review_checklist_run('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000004',run_id);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: incomplete review refusal %', caught; end if;
  perform public.rpc_ops_set_checklist_run_item('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000005',second_item,'done','Kit is stocked');
  if (select status from public.ops_checklist_runs where id=run_id) <> 'completed' then
    raise exception 'FAIL: completed run state missing';
  end if;
  perform public.rpc_ops_review_checklist_run('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000006',run_id);
  if (select status from public.ops_checklist_runs where id=run_id) <> 'reviewed' then
    raise exception 'FAIL: manager review missing';
  end if;
  refused:=false;
  begin perform public.rpc_ops_set_checklist_run_item('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000007',second_item,'pending',null);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: reviewed run mutation refusal %', caught; end if;
  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001');
  if page->'metrics'->>'checklistPercent' <> '100' or jsonb_array_length(page->'checklistRuns') <> 1 then
    raise exception 'FAIL: checklist read/metric mismatch (%)', page->'metrics';
  end if;
end;
$$;

reset role;
do $$
begin
  if (select count(*) from public.notifications where kind='ops_checklist_exception') <> 1 then
    raise exception 'FAIL: checklist exception notification exact count';
  end if;
  if (select count(*) from public.ops_entries as entry join public.ops_checklist_run_items as item
      on item.linked_ops_entry_id=entry.id where item.state='exception') <> 1 then
    raise exception 'FAIL: checklist exception authoritative link count';
  end if;
end;
$$;
set local role authenticated;

-- Duplicate start requests and duplicate business keys retain one run and one audit.
do $$
declare template_id uuid; local_today date; response1 jsonb; response2 jsonb;
begin
  select id into template_id from public.ops_checklist_templates;
  local_today := (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date;
  response1 := public.rpc_ops_start_checklist_run('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000011',template_id,'f5020000-0000-4000-8000-000000000001',local_today,null);
  response2 := public.rpc_ops_start_checklist_run('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000012',template_id,'f5020000-0000-4000-8000-000000000001',local_today,null);
  if response1 <> response2 or (select count(*) from public.ops_checklist_runs) <> 1 then
    raise exception 'FAIL: duplicate run business key was not idempotent';
  end if;
  if (select count(*) from public.audit_events where action='ops.checklist_run_started') <> 1 then
    raise exception 'FAIL: duplicate run wrote extra audit';
  end if;
end;
$$;

-- Wrong local day refuses deterministically and immutable definitions cannot be rewritten.
do $$
declare template_id uuid; refused boolean:=false; caught text;
begin
  select id into template_id from public.ops_checklist_templates;
  begin perform public.rpc_ops_start_checklist_run('f5010000-0000-4000-8000-000000000001',
    'f5300000-0000-4000-8000-000000000021',template_id,'f5020000-0000-4000-8000-000000000001',
    (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date + 1,null);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: checklist local-day refusal %',caught; end if;
end;
$$;

reset role;
do $$
declare refused boolean:=false;
begin
  begin update public.ops_checklist_template_items set label='Tampered';
  exception when sqlstate '55000' then refused:=true; end;
  if not refused then raise exception 'FAIL: template item mutation allowed'; end if;
  refused:=false;
  begin delete from public.ops_checklist_run_items;
  exception when sqlstate '55000' then refused:=true; end;
  if not refused then raise exception 'FAIL: run item deletion allowed'; end if;
end;
$$;

rollback;
