-- Phase 50 — Today's timeline is a location-day activity feed, independent of the
-- entry-list tab, filters and page offset.
begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

reset role;

-- A second location in the same workspace, in a different timezone, proves both
-- location isolation and location-timezone day boundaries.
insert into public.locations (id, workspace_id, name, timezone) values
('f5021000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'Late Venue','UTC');

-- Twelve top-level entries so a page size of 2 yields many distinct entry pages.
insert into public.ops_entries (
  id, workspace_id, entry_type, parent_entry_id, title, location_id, status, priority,
  created_by_membership_id, logged_at, created_at, updated_at
)
select ('f5630000-0000-4000-8000-0000000000' || lpad(counter::text, 2, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001','task',null,'Entry ' || counter,
  'f5020000-0000-4000-8000-000000000001','open','normal',
  'f5040000-0000-4000-8000-000000000001',
  now() - (counter || ' minutes')::interval,
  now() - (counter || ' minutes')::interval,
  now() - (counter || ' minutes')::interval
from generate_series(1, 12) as counter;

-- One follow-up child, to prove follow-ups never inflate top-level entry facets.
insert into public.ops_entries (
  id, workspace_id, entry_type, parent_entry_id, title, location_id, status, priority,
  created_by_membership_id, logged_at, created_at, updated_at
) values
('f5631000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','task',
 'f5630000-0000-4000-8000-000000000001','Follow-up','f5020000-0000-4000-8000-000000000001',
 'open','normal','f5040000-0000-4000-8000-000000000001',now(),now(),now());

-- One entry event per entry, all inside today's local calendar day.
insert into public.ops_entry_events (
  id, workspace_id, ops_entry_id, actor_membership_id, request_id,
  event_type, resulting_status, occurred_at
)
select ('f5640000-0000-4000-8000-0000000000' || lpad(counter::text, 2, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001',
  ('f5630000-0000-4000-8000-0000000000' || lpad(counter::text, 2, '0'))::uuid,
  'f5040000-0000-4000-8000-000000000001',
  ('f5650000-0000-4000-8000-0000000000' || lpad(counter::text, 2, '0'))::uuid,
  'created','open', now() - (counter || ' minutes')::interval
from generate_series(1, 12) as counter;

-- A follow-up event: it belongs to a child entry, so it must appear exactly once and
-- must never be emitted a second time because its parent is on the current page.
insert into public.ops_entry_events (
  id, workspace_id, ops_entry_id, actor_membership_id, request_id,
  event_type, resulting_status, occurred_at
) values
('f5641000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5631000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000001',
 'f5651000-0000-4000-8000-000000000001','created','open', now());

-- Today's collaboration events for the primary location.
insert into public.ops_handovers (id, workspace_id, location_id, handover_date,
  from_membership_id, notes, issued_at, created_at) values
('f5660000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',
 (now() at time zone 'Pacific/Kiritimati')::date,
 'f5040000-0000-4000-8000-000000000001','Night handover notes',now(),now());
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at) values
('f5670000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',
 (now() at time zone 'Pacific/Kiritimati')::date,
 'Morning briefing','Lift 3 remains offline.','f5040000-0000-4000-8000-000000000001',now(),now());

-- A briefing at the OTHER location, same workspace: must not appear when the primary
-- location is selected.
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at) values
('f5670000-0000-4000-8000-000000000002','f5010000-0000-4000-8000-000000000001',
 'f5021000-0000-4000-8000-000000000001',
 (now() at time zone 'UTC')::date,
 'Other location briefing','Different site.','f5040000-0000-4000-8000-000000000001',now(),now());

-- A briefing dated outside the local calendar day: must never appear.
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at) values
('f5670000-0000-4000-8000-000000000003','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',
 ((now() at time zone 'Pacific/Kiritimati')::date - 1),
 'Yesterday briefing','Stale.','f5040000-0000-4000-8000-000000000001',
 now() - interval '1 day', now() - interval '1 day');

select set_config('request.jwt.claims',
  '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  page_one jsonb; page_two jsonb; page_six jsonb; other jsonb; filtered jsonb; tasks_tab jsonb;
  collaboration_one jsonb; collaboration_two jsonb; collaboration_six jsonb;
  location_filter uuid := 'f5020000-0000-4000-8000-000000000001';
  workspace uuid := 'f5010000-0000-4000-8000-000000000001';
begin
  page_one := public.rpc_ops_read_page(workspace,
    null,null,null,null,location_filter,'timeline','time_desc',1,2,null);
  page_two := public.rpc_ops_read_page(workspace,
    null,null,null,null,location_filter,'timeline','time_desc',2,2,null);
  page_six := public.rpc_ops_read_page(workspace,
    null,null,null,null,location_filter,'timeline','time_desc',6,2,null);

  -- The entry list really is paginating.
  if page_one#>>'{entries,0,id}' = page_two#>>'{entries,0,id}' then
    raise exception 'FAIL: entry pages are identical, pagination is not exercised';
  end if;
  if jsonb_array_length(page_one->'entries') <> 2
     or jsonb_array_length(page_two->'entries') <> 2 then
    raise exception 'FAIL: unexpected entry page size';
  end if;

  -- 1. Changing entry pages does not change today's timeline at all.
  if page_one->'timeline' <> page_two->'timeline'
     or page_one->'timeline' <> page_six->'timeline' then
    raise exception 'FAIL: timeline changed with the entry page offset';
  end if;

  -- 2. Handover and briefing events survive every entry page, exactly once each.
  collaboration_one := (select jsonb_agg(row order by row->>'id')
    from jsonb_array_elements(page_one->'timeline') as row
    where row->>'kind' in ('handover','briefing'));
  collaboration_two := (select jsonb_agg(row order by row->>'id')
    from jsonb_array_elements(page_two->'timeline') as row
    where row->>'kind' in ('handover','briefing'));
  collaboration_six := (select jsonb_agg(row order by row->>'id')
    from jsonb_array_elements(page_six->'timeline') as row
    where row->>'kind' in ('handover','briefing'));
  if collaboration_one is null or jsonb_array_length(collaboration_one) <> 2 then
    raise exception 'FAIL: expected exactly one handover and one briefing, got %',
      collaboration_one;
  end if;
  if collaboration_one <> collaboration_two or collaboration_one <> collaboration_six then
    raise exception 'FAIL: collaboration events differ across entry pages';
  end if;

  -- 3. No repeated events of any kind, by event identity.
  if (select count(*) from jsonb_array_elements(page_one->'timeline') as row)
     <> (select count(distinct (row->>'kind', row->>'id'))
         from jsonb_array_elements(page_one->'timeline') as row) then
    raise exception 'FAIL: timeline contains duplicate event identities %',
      page_one->'timeline';
  end if;

  -- 4. The follow-up's own event appears exactly once, even though its parent entry is
  --    on page one — the old page join emitted it twice.
  if (select count(*) from jsonb_array_elements(page_one->'timeline') as row
      where row->>'referenceId' = 'f5631000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'FAIL: follow-up event not emitted exactly once';
  end if;

  -- 5. Location isolation: the other location's briefing never appears here.
  if exists (select 1 from jsonb_array_elements(page_one->'timeline') as row
      where row->>'id' = 'f5670000-0000-4000-8000-000000000002') then
    raise exception 'FAIL: other location briefing leaked into the timeline';
  end if;
  other := public.rpc_ops_read_page(workspace,
    null,null,null,null,'f5021000-0000-4000-8000-000000000001','timeline','time_desc',1,2,null);
  if not exists (select 1 from jsonb_array_elements(other->'timeline') as row
      where row->>'id' = 'f5670000-0000-4000-8000-000000000002') then
    raise exception 'FAIL: other location briefing missing from its own timeline';
  end if;

  -- 6. Local-date isolation: yesterday's briefing never appears.
  if exists (select 1 from jsonb_array_elements(page_one->'timeline') as row
      where row->>'id' = 'f5670000-0000-4000-8000-000000000003') then
    raise exception 'FAIL: out-of-day briefing leaked into the timeline';
  end if;

  -- 7. Entry filters and the entry tab never silently strip the activity feed.
  filtered := public.rpc_ops_read_page(workspace,
    'Entry','task','open','normal',location_filter,'timeline','time_desc',1,2,null);
  tasks_tab := public.rpc_ops_read_page(workspace,
    null,null,null,null,location_filter,'tasks','priority_desc',1,2,null);
  if filtered->'timeline' <> page_one->'timeline' then
    raise exception 'FAIL: entry filters changed the location-day timeline';
  end if;
  if tasks_tab->'timeline' <> page_one->'timeline' then
    raise exception 'FAIL: entry tab changed the location-day timeline';
  end if;

  -- 8. Stable ordering: occurredAt desc, then kind, then id. Re-reading is identical, and
  --    the handover and briefing share a created_at so the tie-break is what orders them.
  if page_one->'timeline' <> (public.rpc_ops_read_page(workspace,
       null,null,null,null,location_filter,'timeline','time_desc',1,2,null))->'timeline' then
    raise exception 'FAIL: timeline ordering is not stable across identical reads';
  end if;
  if (select row_number() over (order by ordinality)
      from jsonb_array_elements(page_one->'timeline') with ordinality as t(row, ordinality)
      where row->>'kind' = 'briefing') >
     (select row_number() over (order by ordinality)
      from jsonb_array_elements(page_one->'timeline') with ordinality as t(row, ordinality)
      where row->>'kind' = 'handover') then
    raise exception 'FAIL: tied collaboration events are not ordered by kind then id';
  end if;

  -- 9. Archived defaults and entry facets stay correct, and follow-ups do not inflate them.
  if page_one#>>'{facets,topLevel}' <> '12' or page_one#>>'{facets,tasks}' <> '12'
     or page_one#>>'{facets,incidents}' <> '0' or page_one#>>'{facets,archived}' <> '0' then
    raise exception 'FAIL: follow-up inflated top-level entry facets %', page_one->'facets';
  end if;
  if (page_one->>'total')::integer <> 12 then
    raise exception 'FAIL: follow-up inflated the entry total %', page_one->>'total';
  end if;
  if exists (select 1 from jsonb_array_elements(page_one->'entries') as row
      where row->>'id' = 'f5631000-0000-4000-8000-000000000001') then
    raise exception 'FAIL: follow-up entered the top-level entry page';
  end if;
end;
$$;

rollback;
