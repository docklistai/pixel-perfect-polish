begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

do $$
declare first_result jsonb; retry_result jsonb; entry_id uuid; page jsonb; export_result jsonb;
  count_value integer; refused boolean; caught text;
begin
  first_result := public.rpc_ops_create_entry(
    'f5010000-0000-4000-8000-000000000001','f5100000-0000-4000-8000-000000000001',
    'incident','Freezer alarm','Temperature above range','f5020000-0000-4000-8000-000000000001',
    'Kitchen cold store','f5030000-0000-4000-8000-000000000001','f5060000-0000-4000-8000-000000000001',
    'f5070000-0000-4000-8000-000000000001','f5050000-0000-4000-8000-000000000003',null,
    'f5050000-0000-4000-8000-000000000002',now() - interval '5 minutes','critical','critical',
    now() - interval '20 minutes','Stock moved and engineer called',null);
  retry_result := public.rpc_ops_create_entry(
    'f5010000-0000-4000-8000-000000000001','f5100000-0000-4000-8000-000000000001',
    'incident','Freezer alarm','Temperature above range','f5020000-0000-4000-8000-000000000001',
    'Kitchen cold store','f5030000-0000-4000-8000-000000000001','f5060000-0000-4000-8000-000000000001',
    'f5070000-0000-4000-8000-000000000001','f5050000-0000-4000-8000-000000000003',null,
    'f5050000-0000-4000-8000-000000000002',now() - interval '5 minutes','critical','critical',
    now() - interval '20 minutes','Stock moved and engineer called',null);
  if first_result <> retry_result then raise exception 'FAIL: idempotent create response changed'; end if;
  entry_id := (first_result->>'entry_id')::uuid;
  select count(*) into count_value from public.ops_entries where title='Freezer alarm';
  if count_value <> 1 then raise exception 'FAIL: retry duplicated entry'; end if;
  select count(*) into count_value from public.ops_entry_events where ops_entry_id=entry_id;
  if count_value <> 1 then raise exception 'FAIL: create did not write exactly one event'; end if;
  select count(*) into count_value from public.audit_events where subject_id=entry_id and action='ops.entry_created';
  if count_value <> 1 then raise exception 'FAIL: create audit count %', count_value; end if;

  perform public.rpc_ops_add_entry_note('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000002',entry_id,'Engineer ETA 20 minutes');
  perform public.rpc_ops_update_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000030',entry_id,'Freezer alarm updated',
    'Temperature above range','Kitchen cold store','f5030000-0000-4000-8000-000000000001',
    'f5060000-0000-4000-8000-000000000001','f5070000-0000-4000-8000-000000000001',
    'f5050000-0000-4000-8000-000000000003',null,'f5050000-0000-4000-8000-000000000001',
    now() - interval '5 minutes','critical','critical','Stock moved and engineer called');
  if (select assigned_staff_member_id from public.ops_entries where id=entry_id) <>
     'f5050000-0000-4000-8000-000000000001' then
    raise exception 'FAIL: edited assignee did not persist';
  end if;
  perform public.rpc_ops_assign_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000003',entry_id,'f5050000-0000-4000-8000-000000000003');
  perform public.rpc_ops_pin_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000004',entry_id,true);
  perform public.rpc_ops_set_entry_status('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000005',entry_id,'in_progress',null);
  perform public.rpc_ops_set_entry_status('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000006',entry_id,'resolved','Temperature restored');
  refused:=false;
  begin perform public.rpc_ops_assign_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000033',entry_id,null);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: resolved assignment refusal %',caught; end if;
  refused:=false;
  begin perform public.rpc_ops_pin_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000034',entry_id,false);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: resolved pin refusal %',caught; end if;
  perform public.rpc_ops_set_entry_status('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000007',entry_id,'open',null);
  if (select status from public.ops_entries where id=entry_id) <> 'open' then
    raise exception 'FAIL: lifecycle did not reopen';
  end if;

  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',null,null,null,null,null,
    'timeline','priority_desc',1,20,entry_id);
  if (page->'facets'->>'open')::integer <> 1 or jsonb_array_length(page->'risks') < 1 then
    raise exception 'FAIL: read metrics and deterministic risks disagree (%)', page->'metrics';
  end if;
  if page->'metrics'->>'onShift' <> '1' then raise exception 'FAIL: published on-shift count missing'; end if;
  if jsonb_array_length(page->'detail'->'events') <> 8 then
    raise exception 'FAIL: lifecycle detail event count %', jsonb_array_length(page->'detail'->'events');
  end if;
  export_result := public.rpc_ops_export_entries('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000032',null);
  if jsonb_array_length(export_result->'entries') <> 1 then
    raise exception 'FAIL: today export semantics %', export_result;
  end if;
  if (select count(*) from public.audit_events where action='ops.entries_exported') <> 1 then
    raise exception 'FAIL: export exact audit count';
  end if;
end;
$$;

do $$
declare response jsonb; parent_id uuid; child_id uuid;
begin
  response := public.rpc_ops_create_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000031','maintenance','Atomic root',null,
    'f5020000-0000-4000-8000-000000000001',null,null,null,null,null,null,null,null,
    'normal',null,null,null,null,true);
  parent_id := (response->>'entry_id')::uuid;
  child_id := (response->>'follow_up_entry_id')::uuid;
  if child_id is null or (select parent_entry_id from public.ops_entries where id=child_id) <> parent_id then
    raise exception 'FAIL: atomic follow-up linkage missing';
  end if;
  if (select count(*) from public.ops_entry_events where ops_entry_id in (parent_id,child_id)) <> 2
     or (select count(*) from public.audit_events where subject_id in (parent_id,child_id)
       and action='ops.entry_created') <> 2 then
    raise exception 'FAIL: atomic follow-up exact event/audit count';
  end if;
end;
$$;

reset role;
do $$
begin
  if (select count(*) from public.notifications where kind='ops_assigned'
      and related_entity_id=(select id from public.ops_entries where title='Freezer alarm updated')) <> 1 then
    raise exception 'FAIL: assignment notification exact count; kinds=%',
      (select jsonb_agg(jsonb_build_object('kind',kind,'entity',related_entity_id)) from public.notifications);
  end if;
  if (select count(*) from public.notifications where kind='ops_priority'
      and related_entity_id=(select id from public.ops_entries where title='Freezer alarm updated')) <> 0 then
    raise exception 'FAIL: duplicate priority notification targeted the assignee';
  end if;
  if (select count(*) from public.notification_deliveries as delivery
      join public.notifications as notification on notification.id=delivery.notification_id
      where notification.kind='ops_assigned' and notification.related_entity_id=
        (select id from public.ops_entries where title='Freezer alarm updated')) <> 1 then
    raise exception 'FAIL: assignment delivery exact count';
  end if;
end;
$$;
set local role authenticated;

-- One-level follow-ups only; archived parents cannot receive children.
do $$
declare parent_id uuid; child_id uuid; refused boolean := false; caught text;
begin
  parent_id := (public.rpc_ops_create_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000011','task','Root task',null,
    'f5020000-0000-4000-8000-000000000001',null,null,null,null,null,null,null,null,'normal',null,null,null,null)->>'entry_id')::uuid;
  child_id := (public.rpc_ops_create_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000012','task','Follow-up',null,null,null,null,null,null,null,null,null,null,
    'normal',null,null,null,parent_id)->>'entry_id')::uuid;
  begin
    perform public.rpc_ops_create_entry('f5010000-0000-4000-8000-000000000001',
      'f5100000-0000-4000-8000-000000000013','task','Grandchild',null,null,null,null,null,null,null,null,null,null,
      'normal',null,null,null,child_id);
  exception when others then refused := true; caught := sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: nested follow-up refusal %', caught; end if;
  perform public.rpc_ops_archive_entry('f5010000-0000-4000-8000-000000000001',
    'f5100000-0000-4000-8000-000000000014',parent_id,'No longer required');
  if (select status from public.ops_entries where id=parent_id) <> 'archived' then raise exception 'FAIL: archive failed'; end if;
end;
$$;

-- Event history and archived identity are immutable even to table owner.
reset role;
do $$
declare refused boolean := false;
begin
  begin update public.ops_entries set parent_entry_id=(select id from public.ops_entries where title='Atomic root')
    where title='Root task';
  exception when sqlstate '55000' then refused := true; end;
  if not refused then raise exception 'FAIL: later parent mutation bypassed one-level rule'; end if;
  refused := false;
  begin update public.ops_entry_events set note='tampered' where note='Engineer ETA 20 minutes';
  exception when sqlstate '55000' then refused := true; end;
  if not refused then raise exception 'FAIL: event update allowed'; end if;
end;
$$;

-- Authenticated staff can neither read Ops nor write directly or through RPC.
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $$
declare visible integer; refused boolean := false; caught text;
begin
  select count(*) into visible from public.ops_entries;
  if visible <> 0 then raise exception 'FAIL: staff can read manager Ops rows'; end if;
  begin
    perform public.rpc_ops_create_entry('f5010000-0000-4000-8000-000000000001',
      'f5100000-0000-4000-8000-000000000021','note','Staff write',null,
      'f5020000-0000-4000-8000-000000000001',null,null,null,null,null,null,null,null,'normal',null,null,null,null);
  exception when others then refused := true; caught := sqlstate; end;
  if not refused or caught <> '42501' then raise exception 'FAIL: staff RPC refusal %', caught; end if;
  refused := false;
  begin insert into public.ops_entries(workspace_id,entry_type,title,location_id,priority,created_by_membership_id)
    values('f5010000-0000-4000-8000-000000000001','note','Direct write','f5020000-0000-4000-8000-000000000001','normal','f5040000-0000-4000-8000-000000000003');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: direct client insert allowed'; end if;
end;
$$;

rollback;
