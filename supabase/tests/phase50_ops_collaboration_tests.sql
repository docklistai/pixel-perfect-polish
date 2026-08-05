begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

do $$
<<create_case>>
declare entry_id uuid; handover_id uuid; briefing_id uuid; local_today date;
begin
  local_today := (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date;
  entry_id := (public.rpc_ops_create_entry('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000001','maintenance','Lift call button','Awaiting contractor',
    'f5020000-0000-4000-8000-000000000001','Lobby','f5030000-0000-4000-8000-000000000001',
    'f5060000-0000-4000-8000-000000000001',null,null,null,null,now() + interval '2 hours','high',null,null,null,null)->>'entry_id')::uuid;
  handover_id := (public.rpc_ops_create_handover('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000002','f5020000-0000-4000-8000-000000000001',local_today,
    'f5060000-0000-4000-8000-000000000001','Contractor due at 14:00',
    array['f5040000-0000-4000-8000-000000000002']::uuid[],array[entry_id])->>'handover_id')::uuid;
  if not exists (select 1 from public.ops_handover_items as item where item.handover_id=create_case.handover_id and item.ops_entry_id=create_case.entry_id) then
    raise exception 'FAIL: unresolved handover item missing';
  end if;
  if not exists (select 1 from public.notifications where kind='ops_handover_issued' and related_entity_id=handover_id) then
    raise exception 'FAIL: handover notification missing';
  end if;
  briefing_id := (public.rpc_ops_create_briefing('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000003','f5020000-0000-4000-8000-000000000001',local_today,
    'Engineering visit','Lift engineer and freezer engineer are both expected today.',
    array['f5040000-0000-4000-8000-000000000002']::uuid[],array[entry_id])->>'briefing_id')::uuid;
  if not exists (select 1 from public.notifications where kind='ops_briefing_issued' and related_entity_id=briefing_id) then
    raise exception 'FAIL: briefing notification missing';
  end if;
  if (select count(*) from public.audit_events where subject_id in (handover_id,briefing_id)) <> 2 then
    raise exception 'FAIL: issue audit behaviour not exact';
  end if;
end;
$$;

-- The recipient reads and acknowledges both records. Duplicate requests are no-ops.
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$
<<recipient_case>>
declare handover_id uuid; briefing_id uuid; response1 jsonb; response2 jsonb; audit_before integer;
begin
  select id into handover_id from public.ops_handovers;
  select id into briefing_id from public.ops_briefings;
  response1 := public.rpc_ops_acknowledge_handover('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000011',handover_id);
  response2 := public.rpc_ops_acknowledge_handover('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000011',handover_id);
  if response1 <> response2 or (select acknowledged_at from public.ops_handover_recipients
    where ops_handover_recipients.handover_id=recipient_case.handover_id and recipient_membership_id='f5040000-0000-4000-8000-000000000002') is null then
    raise exception 'FAIL: handover acknowledgement/idempotency';
  end if;
  perform public.rpc_ops_mark_briefing_read('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000012',briefing_id);
  select count(*) into audit_before from public.audit_events where subject_id=briefing_id;
  perform public.rpc_ops_acknowledge_briefing('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000013',briefing_id);
  if (select acknowledged_at from public.ops_briefing_recipients
      where ops_briefing_recipients.briefing_id=recipient_case.briefing_id and recipient_membership_id='f5040000-0000-4000-8000-000000000002') is null then
    raise exception 'FAIL: briefing acknowledgement missing';
  end if;
  if (select count(*) from public.audit_events where subject_id=briefing_id) <> audit_before + 1 then
    raise exception 'FAIL: read must not audit; acknowledgement must audit once';
  end if;
end;
$$;

-- Sender cannot acknowledge a record not addressed to them; wrong local date is deterministic 55000.
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare refused boolean; caught text; handover_id uuid; local_today date;
begin
  select id into handover_id from public.ops_handovers;
  refused := false;
  begin perform public.rpc_ops_acknowledge_handover('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000021',handover_id);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '42501' then raise exception 'FAIL: non-recipient acknowledgement %', caught; end if;
  local_today := (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date;
  refused := false;
  begin perform public.rpc_ops_create_handover('f5010000-0000-4000-8000-000000000001',
    'f5200000-0000-4000-8000-000000000022','f5020000-0000-4000-8000-000000000001',local_today + 1,null,
    'Wrong calendar day',array['f5040000-0000-4000-8000-000000000002']::uuid[],array[]::uuid[]);
  exception when others then refused:=true; caught:=sqlstate; end;
  if not refused or caught <> '55000' then raise exception 'FAIL: location-day refusal %', caught; end if;
end;
$$;

-- Collaboration content is immutable; only guarded recipient timestamps can change.
reset role;
do $$
declare refused boolean := false;
begin
  begin update public.ops_handovers set notes='tampered'; exception when sqlstate '55000' then refused:=true; end;
  if not refused then raise exception 'FAIL: handover content mutable'; end if;
  refused:=false;
  begin delete from public.ops_briefings; exception when sqlstate '55000' then refused:=true; end;
  if not refused then raise exception 'FAIL: briefing delete allowed'; end if;
end;
$$;

rollback;
