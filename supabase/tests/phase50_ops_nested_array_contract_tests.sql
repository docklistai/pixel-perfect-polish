-- Phase 50 — every nested collection in the Ops read payload is always a JSON array.
-- A collection with no child rows must read as [], never null: the typed frontend
-- contract declares these fields as arrays and calls array operations on them directly.
begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

reset role;

-- Second location, so location scoping is exercised alongside the array contract.
insert into public.locations (id, workspace_id, name, timezone) values
('c1020000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'Contract Venue','Pacific/Kiritimati');

-- An unresolved entry, so the populated handover below can carry a real item.
insert into public.ops_entries (
  id, workspace_id, entry_type, parent_entry_id, title, location_id, status, priority,
  created_by_membership_id, logged_at, created_at, updated_at) values
('c1630000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','task',null,
 'Attachable entry','f5020000-0000-4000-8000-000000000001','open','normal',
 'f5040000-0000-4000-8000-000000000001',now(),now(),now());

-- LEGACY/IMPORT SHAPE: rows whose child collections are empty. The create RPCs refuse
-- these today, but a restore, import or future lifecycle change can produce them, and the
-- reader must still return [] rather than null.
insert into public.ops_handovers (id, workspace_id, location_id, handover_date,
  from_membership_id, notes, issued_at, created_at) values
('c1660000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'c1020000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'f5040000-0000-4000-8000-000000000001','Restored handover with no children.',now(),now());
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at) values
('c1670000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'c1020000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'Restored briefing','No recipients on this row.','f5040000-0000-4000-8000-000000000001',
 now(),now());
insert into public.ops_checklist_templates (id, workspace_id, name, location_id,
  department_id, active, created_by_membership_id) values
('c1680000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'Restored template','c1020000-0000-4000-8000-000000000001',
 'f5030000-0000-4000-8000-000000000001',true,'f5040000-0000-4000-8000-000000000001');
insert into public.ops_checklist_runs (id, workspace_id, template_id, location_id, run_date,
  status, started_by_membership_id, started_at) values
('c1690000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'c1680000-0000-4000-8000-000000000001','c1020000-0000-4000-8000-000000000001',
 (now() at time zone 'Pacific/Kiritimati')::date,'open',
 'f5040000-0000-4000-8000-000000000001',now());

-- POPULATED CONTROL: the same collections with real children, so the correction cannot
-- silently empty, duplicate or reorder a healthy payload.
insert into public.ops_handovers (id, workspace_id, location_id, handover_date,
  from_membership_id, notes, issued_at, created_at) values
('c1661000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'f5040000-0000-4000-8000-000000000001','Populated handover.',now(),now());
insert into public.ops_handover_recipients (workspace_id, handover_id, recipient_membership_id) values
('f5010000-0000-4000-8000-000000000001','c1661000-0000-4000-8000-000000000001',
 'f5040000-0000-4000-8000-000000000002'),
('f5010000-0000-4000-8000-000000000001','c1661000-0000-4000-8000-000000000001',
 'f5040000-0000-4000-8000-000000000003');
insert into public.ops_handover_items (workspace_id, handover_id, ops_entry_id, carried_forward) values
('f5010000-0000-4000-8000-000000000001','c1661000-0000-4000-8000-000000000001',
 'c1630000-0000-4000-8000-000000000001',true);
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at) values
('c1671000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'Populated briefing','Has recipients.','f5040000-0000-4000-8000-000000000001',now(),now());
insert into public.ops_briefing_recipients (workspace_id, briefing_id, recipient_membership_id) values
('f5010000-0000-4000-8000-000000000001','c1671000-0000-4000-8000-000000000001',
 'f5040000-0000-4000-8000-000000000002');
insert into public.ops_checklist_templates (id, workspace_id, name, location_id,
  department_id, active, created_by_membership_id) values
('c1681000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'Populated template','f5020000-0000-4000-8000-000000000001',
 'f5030000-0000-4000-8000-000000000001',true,'f5040000-0000-4000-8000-000000000001');
insert into public.ops_checklist_template_items (workspace_id, template_id, position, label) values
('f5010000-0000-4000-8000-000000000001','c1681000-0000-4000-8000-000000000001',1,'Check the cellar'),
('f5010000-0000-4000-8000-000000000001','c1681000-0000-4000-8000-000000000001',2,'Check the lifts');
insert into public.ops_checklist_runs (id, workspace_id, template_id, location_id, run_date,
  status, started_by_membership_id, started_at) values
('c1691000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'c1681000-0000-4000-8000-000000000001','f5020000-0000-4000-8000-000000000001',
 (now() at time zone 'Pacific/Kiritimati')::date,'open',
 'f5040000-0000-4000-8000-000000000001',now());
insert into public.ops_checklist_run_items (workspace_id, run_id, template_item_id, position,
  label, requires_note, state)
select 'f5010000-0000-4000-8000-000000000001','c1691000-0000-4000-8000-000000000001',
  template_item.id, template_item.position, template_item.label, template_item.requires_note, 'pending'
from public.ops_checklist_template_items as template_item
where template_item.template_id = 'c1681000-0000-4000-8000-000000000001';

select set_config('request.jwt.claims',
  '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  page jsonb; created jsonb; handover jsonb; briefing jsonb; template jsonb; run jsonb;
  workspace uuid := 'f5010000-0000-4000-8000-000000000001';
  collection text; value jsonb;
begin
  -- 1. THE REAL REACHABLE PRODUCT PATH. rpc_ops_create_handover accepts an empty
  --    p_entry_ids, and the Ops handover dialog submits on notes + recipients alone, so a
  --    manager can issue an item-less handover in one click.
  created := public.rpc_ops_create_handover(workspace,
    'c1700000-0000-4000-8000-000000000001',
    'f5020000-0000-4000-8000-000000000001',
    (now() at time zone 'Pacific/Kiritimati')::date, null,
    'Issued with no attached entries.',
    array['f5040000-0000-4000-8000-000000000002']::uuid[],
    array[]::uuid[]);
  if created is null then
    raise exception 'FAIL: the item-less handover was not created through the real RPC';
  end if;

  page := public.rpc_ops_read_page(workspace,
    null,null,null,null,'f5020000-0000-4000-8000-000000000001','timeline','time_desc',1,20,null);
  handover := (select row from jsonb_array_elements(page->'handovers') as row
    where row->>'notes' = 'Issued with no attached entries.');
  if handover is null then
    raise exception 'FAIL: the RPC-created handover is missing from the read payload';
  end if;
  if jsonb_typeof(handover->'items') <> 'array' then
    raise exception 'FAIL: RPC-created handover items is %, not an array',
      jsonb_typeof(handover->'items');
  end if;
  if jsonb_array_length(handover->'items') <> 0 then
    raise exception 'FAIL: item-less handover reported % items',
      jsonb_array_length(handover->'items');
  end if;
  if jsonb_typeof(handover->'recipients') <> 'array'
     or jsonb_array_length(handover->'recipients') <> 1 then
    raise exception 'FAIL: RPC-created handover recipients are wrong %',
      handover->'recipients';
  end if;
  if handover#>>'{recipients,0,membershipId}' <> 'f5040000-0000-4000-8000-000000000002'
     or handover#>>'{recipients,0,name}' <> 'Manny Manager'
     or handover#>>'{recipients,0,acknowledgedAt}' is not null then
    raise exception 'FAIL: recipient data was altered %', handover->'recipients';
  end if;

  -- 2. ALL FIVE AFFECTED COLLECTIONS, in their empty state, must read as [].
  page := public.rpc_ops_read_page(workspace,
    null,null,null,null,'c1020000-0000-4000-8000-000000000001','timeline','time_desc',1,20,null);
  handover := (select row from jsonb_array_elements(page->'handovers') as row
    where row->>'id' = 'c1660000-0000-4000-8000-000000000001');
  briefing := (select row from jsonb_array_elements(page->'briefings') as row
    where row->>'id' = 'c1670000-0000-4000-8000-000000000001');
  template := (select row from jsonb_array_elements(page->'checklistTemplates') as row
    where row->>'id' = 'c1680000-0000-4000-8000-000000000001');
  run := (select row from jsonb_array_elements(page->'checklistRuns') as row
    where row->>'id' = 'c1690000-0000-4000-8000-000000000001');
  if handover is null or briefing is null or template is null or run is null then
    raise exception 'FAIL: an empty-collection record is missing from the payload';
  end if;

  foreach collection in array array[
    'handovers[].recipients','handovers[].items','briefings[].recipients',
    'checklistTemplates[].items','checklistRuns[].items'
  ] loop
    value := case collection
      when 'handovers[].recipients' then handover->'recipients'
      when 'handovers[].items' then handover->'items'
      when 'briefings[].recipients' then briefing->'recipients'
      when 'checklistTemplates[].items' then template->'items'
      else run->'items' end;
    if jsonb_typeof(value) <> 'array' then
      raise exception 'FAIL: % is %, not an array — the typed contract calls .length on it',
        collection, coalesce(jsonb_typeof(value), 'absent');
    end if;
    if jsonb_array_length(value) <> 0 then
      raise exception 'FAIL: % should be empty here, got %', collection, value;
    end if;
  end loop;

  -- 3. POPULATED REGRESSION: healthy collections keep their contents, ordering and
  --    cardinality, with no duplication.
  page := public.rpc_ops_read_page(workspace,
    null,null,null,null,'f5020000-0000-4000-8000-000000000001','timeline','time_desc',1,20,null);
  handover := (select row from jsonb_array_elements(page->'handovers') as row
    where row->>'id' = 'c1661000-0000-4000-8000-000000000001');
  briefing := (select row from jsonb_array_elements(page->'briefings') as row
    where row->>'id' = 'c1671000-0000-4000-8000-000000000001');
  template := (select row from jsonb_array_elements(page->'checklistTemplates') as row
    where row->>'id' = 'c1681000-0000-4000-8000-000000000001');
  run := (select row from jsonb_array_elements(page->'checklistRuns') as row
    where row->>'id' = 'c1691000-0000-4000-8000-000000000001');
  if jsonb_array_length(handover->'recipients') <> 2
     or jsonb_array_length(handover->'items') <> 1
     or jsonb_array_length(briefing->'recipients') <> 1
     or jsonb_array_length(template->'items') <> 2
     or jsonb_array_length(run->'items') <> 2 then
    raise exception 'FAIL: a populated collection changed cardinality';
  end if;
  if handover#>>'{items,0,title}' <> 'Attachable entry'
     or (handover#>>'{items,0,carriedForward}')::boolean is not true then
    raise exception 'FAIL: populated handover item content changed %', handover->'items';
  end if;
  if template#>>'{items,0,label}' <> 'Check the cellar'
     or template#>>'{items,1,label}' <> 'Check the lifts' then
    raise exception 'FAIL: template item ordering by position changed %', template->'items';
  end if;
  if run#>>'{items,0,position}' <> '1' or run#>>'{items,1,position}' <> '2' then
    raise exception 'FAIL: run item ordering by position changed %', run->'items';
  end if;
  if jsonb_typeof(run#>'{items,0,history}') <> 'array' then
    raise exception 'FAIL: run item history stopped being an array';
  end if;

  -- 4. No record is duplicated by the nested aggregates, and the handover list keeps its
  --    created_at desc ordering.
  if (select count(*) from jsonb_array_elements(page->'handovers')) <>
     (select count(distinct row->>'id') from jsonb_array_elements(page->'handovers') as row) then
    raise exception 'FAIL: a handover appears more than once';
  end if;
  if exists (select 1 from (
      select (row->>'createdAt')::timestamptz as created_at,
        lag((row->>'createdAt')::timestamptz) over (order by ordinality) as previous
      from jsonb_array_elements(page->'handovers') with ordinality as t(row, ordinality)
    ) as ordered where ordered.previous is not null and ordered.previous < ordered.created_at) then
    raise exception 'FAIL: handover ordering is no longer created_at desc';
  end if;

  -- 5. The timeline contract is untouched by this correction.
  if jsonb_typeof(page->'timeline') <> 'array'
     or (page->>'timelineEntryEventLimit')::integer <> 100
     or (page->>'timelineTruncated') <> 'false' then
    raise exception 'FAIL: the timeline contract changed %',
      jsonb_build_object('limit', page->'timelineEntryEventLimit',
        'truncated', page->'timelineTruncated');
  end if;
end;
$$;

-- 6. Payload keys stay exactly 1:1 with the OpsPageData interface.
do $$
declare keys text;
begin
  select string_agg(k, ',' order by k) into keys from (
    select jsonb_object_keys(public.rpc_ops_read_page(
      'f5010000-0000-4000-8000-000000000001',
      null,null,null,null,null,'timeline','time_desc',1,20,null)) as k) as payload;
  if keys <> 'actorMembershipId,briefings,checklistRuns,checklistTemplates,departments,'
    || 'detail,entries,facets,filters,handovers,linkableEntries,locations,managers,metrics,'
    || 'risks,selectedEntry,staff,timeline,timelineEntryEventLimit,timelineTruncated,total' then
    raise exception 'FAIL: the read payload key set changed: %', keys;
  end if;
end;
$$;

rollback;
