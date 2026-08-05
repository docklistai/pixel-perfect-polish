-- Phase 50 — Today's timeline bounds ENTRY EVENTS only. Every handover and briefing for
-- the selected location-day stays visible no matter how loaded the entry feed is.
begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

reset role;

-- A quiet second location in the same workspace proves the under-cap case reads the same
-- contract as the loaded one.
insert into public.locations (id, workspace_id, name, timezone) values
('f5022000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'Quiet Venue','Pacific/Kiritimati');

-- Four busy entries at the primary location, two quiet entries at the second.
insert into public.ops_entries (
  id, workspace_id, entry_type, parent_entry_id, title, location_id, status, priority,
  created_by_membership_id, logged_at, created_at, updated_at
)
select ('f5680000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001','task',null,'Busy entry ' || counter,
  'f5020000-0000-4000-8000-000000000001','open','normal',
  'f5040000-0000-4000-8000-000000000001', now(), now(), now()
from generate_series(1, 4) as counter;

insert into public.ops_entries (
  id, workspace_id, entry_type, parent_entry_id, title, location_id, status, priority,
  created_by_membership_id, logged_at, created_at, updated_at
)
select ('f5681000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001','task',null,'Quiet entry ' || counter,
  'f5022000-0000-4000-8000-000000000001','open','normal',
  'f5040000-0000-4000-8000-000000000001', now(), now(), now()
from generate_series(1, 2) as counter;

-- 130 entry events inside today's local calendar day, anchored to local midday so the
-- seeded window can never straddle the venue's local midnight. Two active managers act,
-- alternating, exactly as a real shift would.
insert into public.ops_entry_events (
  id, workspace_id, ops_entry_id, actor_membership_id, request_id,
  event_type, resulting_status, occurred_at
)
select ('f5690000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001',
  ('f5680000-0000-4000-8000-' || lpad((((counter - 1) % 4) + 1)::text, 12, '0'))::uuid,
  case when counter % 2 = 0
    then 'f5040000-0000-4000-8000-000000000001'::uuid
    else 'f5040000-0000-4000-8000-000000000002'::uuid end,
  ('f56a0000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'updated','open',
  ((((now() at time zone 'Pacific/Kiritimati')::date + time '12:00')
    at time zone 'Pacific/Kiritimati') - (counter || ' seconds')::interval)
from generate_series(1, 130) as counter;

-- Three entry events at the quiet location: far below the cap.
insert into public.ops_entry_events (
  id, workspace_id, ops_entry_id, actor_membership_id, request_id,
  event_type, resulting_status, occurred_at
)
select ('f5691000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001',
  ('f5681000-0000-4000-8000-' || lpad((((counter - 1) % 2) + 1)::text, 12, '0'))::uuid,
  'f5040000-0000-4000-8000-000000000001',
  ('f56a1000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'updated','open',
  ((((now() at time zone 'Pacific/Kiritimati')::date + time '12:00')
    at time zone 'Pacific/Kiritimati') - (counter || ' seconds')::interval)
from generate_series(1, 3) as counter;

-- An entry event just before today's local midnight yesterday: the day boundary must
-- still exclude it even though the feed is loaded.
insert into public.ops_entry_events (
  id, workspace_id, ops_entry_id, actor_membership_id, request_id,
  event_type, resulting_status, occurred_at
) values
('f5692000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5680000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000001',
 'f56a2000-0000-4000-8000-000000000001','updated','open',
 (((now() at time zone 'Pacific/Kiritimati')::date at time zone 'Pacific/Kiritimati')
   - interval '1 minute'));

-- Today's collaboration events are deliberately OLDER than every seeded entry event, so a
-- cap applied to the combined feed would drop all four of them.
insert into public.ops_handovers (id, workspace_id, location_id, handover_date,
  from_membership_id, notes, issued_at, created_at)
select ('f56b0000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001','f5020000-0000-4000-8000-000000000001',
  (now() at time zone 'Pacific/Kiritimati')::date,
  'f5040000-0000-4000-8000-000000000001','Handover ' || counter,
  ((((now() at time zone 'Pacific/Kiritimati')::date + time '12:00')
    at time zone 'Pacific/Kiritimati') - ((200 + counter) || ' seconds')::interval),
  ((((now() at time zone 'Pacific/Kiritimati')::date + time '12:00')
    at time zone 'Pacific/Kiritimati') - ((200 + counter) || ' seconds')::interval)
from generate_series(1, 2) as counter;

insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at)
select ('f56c0000-0000-4000-8000-' || lpad(counter::text, 12, '0'))::uuid,
  'f5010000-0000-4000-8000-000000000001','f5020000-0000-4000-8000-000000000001',
  (now() at time zone 'Pacific/Kiritimati')::date,
  'Briefing ' || counter,'Lift 3 remains offline.',
  'f5040000-0000-4000-8000-000000000002',
  ((((now() at time zone 'Pacific/Kiritimati')::date + time '12:00')
    at time zone 'Pacific/Kiritimati') - ((300 + counter) || ' seconds')::interval),
  ((((now() at time zone 'Pacific/Kiritimati')::date + time '12:00')
    at time zone 'Pacific/Kiritimati') - ((300 + counter) || ' seconds')::interval)
from generate_series(1, 2) as counter;

-- One handover and one briefing at the quiet location.
insert into public.ops_handovers (id, workspace_id, location_id, handover_date,
  from_membership_id, notes, issued_at, created_at) values
('f56b1000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5022000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'f5040000-0000-4000-8000-000000000001','Quiet handover',now(),now());
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at) values
('f56c1000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5022000-0000-4000-8000-000000000001',(now() at time zone 'Pacific/Kiritimati')::date,
 'Quiet briefing','Nothing outstanding.','f5040000-0000-4000-8000-000000000001',now(),now());

-- A briefing dated yesterday at the busy location: never today's feed.
insert into public.ops_briefings (id, workspace_id, location_id, briefing_date, title,
  summary, authored_by_membership_id, issued_at, created_at) values
('f56c2000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',
 ((now() at time zone 'Pacific/Kiritimati')::date - 1),
 'Yesterday briefing','Stale.','f5040000-0000-4000-8000-000000000001',
 now() - interval '1 day', now() - interval '1 day');

select set_config('request.jwt.claims',
  '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  loaded jsonb; page_three jsonb; filtered jsonb; tasks_tab jsonb; quiet jsonb;
  workspace uuid := 'f5010000-0000-4000-8000-000000000001';
  busy_location uuid := 'f5020000-0000-4000-8000-000000000001';
  quiet_location uuid := 'f5022000-0000-4000-8000-000000000001';
  entry_event_count integer; collaboration jsonb; collaboration_id text;
begin
  loaded := public.rpc_ops_read_page(workspace,
    null,null,null,null,busy_location,'timeline','time_desc',1,2,null);
  page_three := public.rpc_ops_read_page(workspace,
    null,null,null,null,busy_location,'timeline','time_desc',3,2,null);
  filtered := public.rpc_ops_read_page(workspace,
    'Busy','task','open','normal',busy_location,'timeline','time_desc',1,2,null);
  tasks_tab := public.rpc_ops_read_page(workspace,
    null,null,null,null,busy_location,'tasks','priority_desc',2,2,null);
  quiet := public.rpc_ops_read_page(workspace,
    null,null,null,null,quiet_location,'timeline','time_desc',1,2,null);

  -- 1. The 100-event cap bounds ENTRY EVENTS, not the combined feed.
  select count(*) into entry_event_count from jsonb_array_elements(loaded->'timeline') as row
    where row->>'kind' = 'entry_event';
  if entry_event_count <> 100 then
    raise exception 'FAIL: expected exactly 100 bounded entry events, got %', entry_event_count;
  end if;

  -- 2. Every handover and briefing for the selected location-day survives the cap, and
  --    each appears exactly once. Before the correction all four were silently dropped.
  foreach collaboration_id in array array[
    'f56b0000-0000-4000-8000-000000000001','f56b0000-0000-4000-8000-000000000002',
    'f56c0000-0000-4000-8000-000000000001','f56c0000-0000-4000-8000-000000000002'
  ] loop
    if (select count(*) from jsonb_array_elements(loaded->'timeline') as row
        where row->>'id' = collaboration_id) <> 1 then
      raise exception 'FAIL: collaboration event % is not present exactly once under load',
        collaboration_id;
    end if;
  end loop;
  collaboration := (select jsonb_agg(row order by row->>'id')
    from jsonb_array_elements(loaded->'timeline') as row
    where row->>'kind' in ('handover','briefing'));
  if jsonb_array_length(collaboration) <> 4 then
    raise exception 'FAIL: expected 2 handovers and 2 briefings, got %', collaboration;
  end if;

  -- 3. The feed is the bounded entry events plus every collaboration event, nothing else.
  if jsonb_array_length(loaded->'timeline') <> 104 then
    raise exception 'FAIL: unexpected timeline length %',
      jsonb_array_length(loaded->'timeline');
  end if;

  -- 4. No repeated event identities anywhere in the feed.
  if (select count(*) from jsonb_array_elements(loaded->'timeline') as row)
     <> (select count(distinct (row->>'kind', row->>'id'))
         from jsonb_array_elements(loaded->'timeline') as row) then
    raise exception 'FAIL: timeline contains duplicate event identities';
  end if;

  -- 5. The kept entry events are the NEWEST 100: event 100 is in, event 101 is out.
  if not exists (select 1 from jsonb_array_elements(loaded->'timeline') as row
      where row->>'id' = 'f5690000-0000-4000-8000-000000000100') then
    raise exception 'FAIL: the 100th newest entry event was dropped';
  end if;
  if exists (select 1 from jsonb_array_elements(loaded->'timeline') as row
      where row->>'id' in ('f5690000-0000-4000-8000-000000000101',
                           'f5690000-0000-4000-8000-000000000130')) then
    raise exception 'FAIL: an entry event beyond the cap was returned';
  end if;

  -- 6. Location-timezone day boundaries hold under load.
  if exists (select 1 from jsonb_array_elements(loaded->'timeline') as row
      where row->>'id' in ('f5692000-0000-4000-8000-000000000001',
                           'f56c2000-0000-4000-8000-000000000001')) then
    raise exception 'FAIL: an out-of-day event leaked into the loaded timeline';
  end if;
  if exists (select 1 from jsonb_array_elements(loaded->'timeline') as row
      where row->>'id' in ('f56b1000-0000-4000-8000-000000000001',
                           'f56c1000-0000-4000-8000-000000000001')) then
    raise exception 'FAIL: another location''s collaboration event leaked in';
  end if;

  -- 7. Truncation metadata is honest: entry events were bounded here.
  if (loaded->>'timelineTruncated') <> 'true' then
    raise exception 'FAIL: loaded timeline did not report entry-event truncation %',
      loaded->>'timelineTruncated';
  end if;
  if (loaded->>'timelineEntryEventLimit')::integer <> 100 then
    raise exception 'FAIL: unexpected reported entry-event limit %',
      loaded->>'timelineEntryEventLimit';
  end if;

  -- 8. Ordering is occurredAt desc and stable across identical reads.
  if exists (select 1 from (
      select (row->>'occurredAt')::timestamptz as occurred_at,
        lag((row->>'occurredAt')::timestamptz) over (order by ordinality) as previous_at
      from jsonb_array_elements(loaded->'timeline') with ordinality as t(row, ordinality)
    ) as ordered where ordered.previous_at is not null
      and ordered.previous_at < ordered.occurred_at) then
    raise exception 'FAIL: bounded timeline is not ordered by occurredAt desc';
  end if;
  if loaded->'timeline' <> (public.rpc_ops_read_page(workspace,
       null,null,null,null,busy_location,'timeline','time_desc',1,2,null))->'timeline' then
    raise exception 'FAIL: bounded timeline ordering is not stable across identical reads';
  end if;

  -- 9. Entry page, search, filters and tab never change the bounded feed.
  if loaded->'timeline' <> page_three->'timeline' then
    raise exception 'FAIL: bounded timeline changed with the entry page offset';
  end if;
  if loaded->'timeline' <> filtered->'timeline' then
    raise exception 'FAIL: entry search and filters changed the bounded timeline';
  end if;
  if loaded->'timeline' <> tasks_tab->'timeline' then
    raise exception 'FAIL: the entry tab changed the bounded timeline';
  end if;
  if loaded->>'timelineTruncated' <> page_three->>'timelineTruncated'
     or loaded->>'timelineTruncated' <> filtered->>'timelineTruncated'
     or loaded->>'timelineTruncated' <> tasks_tab->>'timelineTruncated' then
    raise exception 'FAIL: truncation metadata depends on entry paging or filters';
  end if;

  -- 10. Under the cap, every entry and collaboration event is returned and the feed
  --     reports no truncation.
  if jsonb_array_length(quiet->'timeline') <> 5 then
    raise exception 'FAIL: under-cap timeline lost events %', quiet->'timeline';
  end if;
  if (select count(*) from jsonb_array_elements(quiet->'timeline') as row
      where row->>'kind' = 'entry_event') <> 3 then
    raise exception 'FAIL: under-cap timeline did not return all entry events';
  end if;
  if (select count(*) from jsonb_array_elements(quiet->'timeline') as row
      where row->>'id' in ('f56b1000-0000-4000-8000-000000000001',
                           'f56c1000-0000-4000-8000-000000000001')) <> 2 then
    raise exception 'FAIL: under-cap timeline lost a collaboration event';
  end if;
  if (quiet->>'timelineTruncated') <> 'false' then
    raise exception 'FAIL: under-cap timeline falsely reported truncation';
  end if;
end;
$$;

rollback;
