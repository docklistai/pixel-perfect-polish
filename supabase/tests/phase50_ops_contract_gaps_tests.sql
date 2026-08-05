-- Phase 50 — write-family contract facets not covered by the entry, collaboration or
-- checklist suites: notification deep links, entry notes, requires_note, briefing
-- visibility for authors and non-recipients, and compatible-template filtering.
begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

do $$
declare
  v_workspace uuid := 'f5010000-0000-4000-8000-000000000001';
  v_location uuid := 'f5020000-0000-4000-8000-000000000001';
  v_owner uuid := 'f5040000-0000-4000-8000-000000000001';
  v_manager uuid := 'f5040000-0000-4000-8000-000000000002';
  v_staff uuid := 'f5050000-0000-4000-8000-000000000003';
  v_today date;
  v_entry uuid;
  v_handover uuid;
  v_briefing uuid;
  v_template uuid;
  v_scoped_template uuid;
  v_run uuid;
  v_note_item uuid;
  v_plain_item uuid;
  v_linked uuid;
  v_response jsonb;
  v_page jsonb;
  v_refusal text;
  v_count integer;
begin
  v_today := (transaction_timestamp() at time zone 'Pacific/Kiritimati')::date;

  -- ── Entry note ───────────────────────────────────────────────────────────────
  v_response := public.rpc_ops_create_entry(v_workspace,'f5800000-0000-4000-8000-000000000001',
    'task','Noted entry',null,v_location,null,null,null,null,null,null,null,null,
    'normal',null,null,null,null,false);
  v_entry := (v_response->>'entry_id')::uuid;
  if v_entry is null then raise exception 'FAIL: entry not created %', v_response; end if;

  perform public.rpc_ops_add_entry_note(v_workspace,'f5800000-0000-4000-8000-000000000002',
    v_entry,'Contractor attended at 14:05.');
  select count(*) into v_count from public.ops_entry_events as event
  where event.workspace_id = v_workspace and event.ops_entry_id = v_entry
    and event.event_type = 'note_added';
  if v_count <> 1 then
    raise exception 'FAIL: note did not write exactly one note_added event, got %', v_count;
  end if;
  if not exists (select 1 from public.ops_entry_events as event
    where event.workspace_id = v_workspace and event.ops_entry_id = v_entry
      and event.event_type = 'note_added' and event.note = 'Contractor attended at 14:05.') then
    raise exception 'FAIL: note text was not recorded verbatim';
  end if;
  if (select entry.status from public.ops_entries as entry where entry.id = v_entry) <> 'open' then
    raise exception 'FAIL: adding a note changed the entry status';
  end if;
  -- Replaying the same request id must not write a second event.
  perform public.rpc_ops_add_entry_note(v_workspace,'f5800000-0000-4000-8000-000000000002',
    v_entry,'Contractor attended at 14:05.');
  select count(*) into v_count from public.ops_entry_events as event
  where event.workspace_id = v_workspace and event.ops_entry_id = v_entry
    and event.event_type = 'note_added';
  if v_count <> 1 then
    raise exception 'FAIL: replayed note request wrote a second event';
  end if;

  -- ── Assignment notification deep link ────────────────────────────────────────
  -- Assigning to a non-manager must not notify: staff never receive manager Ops data.
  perform public.rpc_ops_assign_entry(v_workspace,'f5800000-0000-4000-8000-000000000003',
    v_entry, v_staff);
  select count(*) into v_count from public.notifications as note
  where note.workspace_id = v_workspace and note.kind = 'ops_assigned';
  if v_count <> 0 then
    raise exception 'FAIL: assigning to staff produced a manager Ops notification (%)', v_count;
  end if;

  -- Assigning to an active manager notifies exactly once, deep-linked to the entry.
  perform public.rpc_ops_assign_entry(v_workspace,'f5800000-0000-4000-8000-00000000000e',
    v_entry, 'f5050000-0000-4000-8000-000000000002');
  select count(*) into v_count from public.notifications as note
  where note.workspace_id = v_workspace and note.kind = 'ops_assigned'
    and note.related_entity_type = 'ops_entry' and note.related_entity_id = v_entry;
  if v_count <> 1 then
    raise exception 'FAIL: manager assignment deep link is not exactly one ops_entry row (%)',
      v_count;
  end if;

  -- ── Handover: locked recipients, attached entries, exact deep link ───────────
  v_response := public.rpc_ops_create_handover(v_workspace,'f5800000-0000-4000-8000-000000000004',
    v_location, v_today, null, 'Lift 3 still isolated.',
    array[v_manager]::uuid[], array[v_entry]::uuid[]);
  v_handover := (v_response->>'handover_id')::uuid;
  if v_handover is null then raise exception 'FAIL: handover not created %', v_response; end if;
  select count(*) into v_count from public.notifications as note
  where note.workspace_id = v_workspace and note.kind = 'ops_handover_issued'
    and note.related_entity_type = 'ops_handover' and note.related_entity_id = v_handover;
  if v_count <> 1 then
    raise exception 'FAIL: handover deep link is not exactly one ops_handover notification (%)',
      v_count;
  end if;
  select count(*) into v_count from public.ops_handover_recipients as recipient
  where recipient.workspace_id = v_workspace and recipient.handover_id = v_handover;
  if v_count <> 1 then
    raise exception 'FAIL: handover recipients were not locked to the named manager (%)', v_count;
  end if;
  select count(*) into v_count from public.ops_handover_items as item
  where item.workspace_id = v_workspace and item.handover_id = v_handover
    and item.ops_entry_id = v_entry;
  if v_count <> 1 then
    raise exception 'FAIL: handover did not attach the named entry exactly once';
  end if;

  -- ── Briefing: exact deep link, author visibility, no silent self-recipient ───
  v_response := public.rpc_ops_create_briefing(v_workspace,'f5800000-0000-4000-8000-000000000005',
    v_location, v_today, 'Evening briefing', 'Agency cover confirmed.',
    array[v_manager]::uuid[], array[v_entry]::uuid[]);
  v_briefing := (v_response->>'briefing_id')::uuid;
  if v_briefing is null then raise exception 'FAIL: briefing not created %', v_response; end if;
  select count(*) into v_count from public.notifications as note
  where note.workspace_id = v_workspace and note.kind = 'ops_briefing_issued'
    and note.related_entity_type = 'ops_briefing' and note.related_entity_id = v_briefing;
  if v_count <> 1 then
    raise exception 'FAIL: briefing deep link is not exactly one ops_briefing notification (%)',
      v_count;
  end if;

  -- The author is not a recipient, yet must still read their own briefing unrefused.
  v_page := public.rpc_ops_read_page(v_workspace,null,null,null,null,v_location,
    'briefings','time_desc',1,20,null);
  if not exists (select 1 from jsonb_array_elements(v_page->'briefings') as row
    where row->>'id' = v_briefing::text) then
    raise exception 'FAIL: the author cannot see their own briefing';
  end if;
  select count(*) into v_count from public.ops_briefing_recipients as recipient
  where recipient.workspace_id = v_workspace and recipient.briefing_id = v_briefing
    and recipient.recipient_membership_id = v_owner;
  if v_count <> 0 then
    raise exception 'FAIL: the author was silently added as a briefing recipient';
  end if;

  -- ── Checklist: requires_note and the compatible-template contract ────────────
  v_response := public.rpc_ops_create_checklist_template(v_workspace,
    'f5800000-0000-4000-8000-000000000006','Opening checks',null,null,null,null,
    array['Fire panel clear','Cellar temperature'], array[false, true]);
  v_template := (v_response->>'template_id')::uuid;
  if v_template is null then raise exception 'FAIL: template not created %', v_response; end if;

  v_response := public.rpc_ops_start_checklist_run(v_workspace,
    'f5800000-0000-4000-8000-000000000007', v_template, v_location, v_today, null);
  v_run := (v_response->>'run_id')::uuid;
  if v_run is null then raise exception 'FAIL: run not started %', v_response; end if;

  select item.id into v_plain_item from public.ops_checklist_run_items as item
  where item.workspace_id = v_workspace and item.run_id = v_run and item.requires_note = false;
  select item.id into v_note_item from public.ops_checklist_run_items as item
  where item.workspace_id = v_workspace and item.run_id = v_run and item.requires_note = true;
  if v_plain_item is null or v_note_item is null then
    raise exception 'FAIL: requires_note flags were not carried onto the run items';
  end if;

  -- requires_note: completing without a note is refused; with a note it is accepted.
  v_refusal := null;
  begin
    perform public.rpc_ops_set_checklist_run_item(v_workspace,
      'f5800000-0000-4000-8000-000000000008', v_note_item, 'done', null);
  exception when others then
    get stacked diagnostics v_refusal = returned_sqlstate;
  end;
  if v_refusal <> '22023' then
    raise exception 'FAIL: requires_note item completed without a note (%)',
      coalesce(v_refusal, 'accepted');
  end if;
  perform public.rpc_ops_set_checklist_run_item(v_workspace,
    'f5800000-0000-4000-8000-000000000009', v_note_item, 'done', 'Cellar at 11C.');
  if (select item.state from public.ops_checklist_run_items as item
      where item.id = v_note_item) <> 'done' then
    raise exception 'FAIL: requires_note item did not complete with a note';
  end if;
  perform public.rpc_ops_set_checklist_run_item(v_workspace,
    'f5800000-0000-4000-8000-00000000000a', v_plain_item, 'done', null);
  if (select item.state from public.ops_checklist_run_items as item
      where item.id = v_plain_item) <> 'done' then
    raise exception 'FAIL: a plain item could not complete without a note';
  end if;

  -- An exception raises an authoritative linked Ops entry with a deep-linked alert.
  perform public.rpc_ops_set_checklist_run_item(v_workspace,
    'f5800000-0000-4000-8000-00000000000b', v_plain_item, 'exception', 'Panel showing a fault.');
  select item.linked_ops_entry_id into v_linked from public.ops_checklist_run_items as item
  where item.id = v_plain_item;
  if v_linked is null then
    raise exception 'FAIL: checklist exception did not raise a linked Ops entry';
  end if;
  select count(*) into v_count from public.notifications as note
  where note.workspace_id = v_workspace and note.kind = 'ops_checklist_exception'
    and note.related_entity_type = 'ops_entry' and note.related_entity_id = v_linked;
  if v_count <> 1 then
    raise exception 'FAIL: checklist exception deep link is not exactly one row (%)', v_count;
  end if;

  -- Compatible-template filtering: a template scoped to another location is offered only
  -- for that location, and cannot start a run elsewhere.
  insert into public.locations (id, workspace_id, name, timezone) values
    ('f5021000-0000-4000-8000-000000000009', v_workspace, 'Second Venue', 'Pacific/Kiritimati');
  v_response := public.rpc_ops_create_checklist_template(v_workspace,
    'f5800000-0000-4000-8000-00000000000c','Second venue checks',
    'f5021000-0000-4000-8000-000000000009',null,null,null,array['Gate secure'],array[false]);
  v_scoped_template := (v_response->>'template_id')::uuid;

  v_page := public.rpc_ops_read_page(v_workspace,null,null,null,null,v_location,
    'checks','time_desc',1,20,null);
  if not exists (select 1 from jsonb_array_elements(v_page->'checklistTemplates') as row
    where row->>'id' = v_template::text) then
    raise exception 'FAIL: a global template was filtered out of a location';
  end if;
  if exists (select 1 from jsonb_array_elements(v_page->'checklistTemplates') as row
    where row->>'id' = v_scoped_template::text) then
    raise exception 'FAIL: another location''s template was offered';
  end if;

  v_refusal := null;
  begin
    perform public.rpc_ops_start_checklist_run(v_workspace,
      'f5800000-0000-4000-8000-00000000000d', v_scoped_template, v_location, v_today, null);
  exception when others then
    get stacked diagnostics v_refusal = returned_sqlstate;
  end;
  if v_refusal <> '55000' then
    raise exception 'FAIL: mismatched template/location run was not refused deterministically (%)',
      coalesce(v_refusal, 'accepted');
  end if;
end;
$$;

-- A second active manager reads the same workspace collaboration records unrefused.
select set_config('request.jwt.claims',
  '{"sub":"f5000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

do $$
declare v_page jsonb;
begin
  v_page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',
    null,null,null,null,null,'briefings','time_desc',1,20,null);
  if jsonb_array_length(v_page->'briefings') < 1 then
    raise exception 'FAIL: a second active manager cannot see workspace briefings';
  end if;
  if jsonb_array_length(v_page->'handovers') < 1 then
    raise exception 'FAIL: a second active manager cannot see workspace handovers';
  end if;
end;
$$;

rollback;
