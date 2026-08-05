begin;
\i supabase/tests/fixtures/phase50_ops_fixture.sql

reset role;
insert into public.ops_entries (
  id, workspace_id, entry_type, parent_entry_id, title, location_id, status, priority,
  created_by_membership_id, logged_at, created_at, updated_at, resolved_at,
  severity, occurred_at, resolved_by_membership_id, archived_by_membership_id, archived_at
) values
('f5600000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','task',null,
 'Morning task','f5020000-0000-4000-8000-000000000001','open','normal',
 'f5040000-0000-4000-8000-000000000001',now()-interval '3 hours',now()-interval '3 hours',now()-interval '3 hours',null,null,null,null,null,null),
('f5600000-0000-4000-8000-000000000002','f5010000-0000-4000-8000-000000000001','incident',null,
 'Recent incident','f5020000-0000-4000-8000-000000000001','open','critical',
 'f5040000-0000-4000-8000-000000000001',now()-interval '1 hour',now()-interval '1 hour',now()-interval '1 hour',null,'critical',now()-interval '1 hour',null,null,null),
('f5600000-0000-4000-8000-000000000003','f5010000-0000-4000-8000-000000000001','maintenance',null,
 'Resolved pump','f5020000-0000-4000-8000-000000000001','resolved','high',
 'f5040000-0000-4000-8000-000000000001',now()-interval '2 hours',now()-interval '2 hours',now()-interval '2 hours',now()-interval '2 hours',null,null,'f5040000-0000-4000-8000-000000000001',null,null),
('f5600000-0000-4000-8000-000000000004','f5010000-0000-4000-8000-000000000001','note',null,
 'Archived note','f5020000-0000-4000-8000-000000000001','archived','low',
 'f5040000-0000-4000-8000-000000000001',now(),now(),now(),null,null,null,null,'f5040000-0000-4000-8000-000000000001',now()),
('f5600000-0000-4000-8000-000000000005','f5010000-0000-4000-8000-000000000001','task',
 'f5600000-0000-4000-8000-000000000001','Child follow-up','f5020000-0000-4000-8000-000000000001',
 'open','normal','f5040000-0000-4000-8000-000000000001',now(),now(),now(),null,null,null,null,null,null);

insert into public.ops_entry_events (
  id, workspace_id, ops_entry_id, actor_membership_id, request_id,
  event_type, resulting_status, occurred_at
) values
('f5610000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5600000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000001',
 'f5620000-0000-4000-8000-000000000001','created','open',now()),
('f5610000-0000-4000-8000-000000000002','f5010000-0000-4000-8000-000000000001',
 'f5600000-0000-4000-8000-000000000002','f5040000-0000-4000-8000-000000000001',
 'f5620000-0000-4000-8000-000000000002','created','open',now()),
('f5610000-0000-4000-8000-000000000003','f5010000-0000-4000-8000-000000000001',
 'f5600000-0000-4000-8000-000000000003','f5040000-0000-4000-8000-000000000001',
 'f5620000-0000-4000-8000-000000000003','resolved','resolved',now()-interval '2 days');

select set_config('request.jwt.claims',
  '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare page jsonb;
begin
  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',
    null,null,null,null,null,'timeline','time_desc',1,2,null);
  if (page->>'total')::integer <> 3 or jsonb_array_length(page->'entries') <> 2 then
    raise exception 'FAIL: default filtered pagination %', page;
  end if;
  if page#>>'{entries,0,title}' <> 'Recent incident' or page#>>'{entries,1,title}' <> 'Resolved pump' then
    raise exception 'FAIL: server time-desc aggregation order %', page->'entries';
  end if;
  if page#>>'{facets,topLevel}' <> '3' or page#>>'{facets,tasks}' <> '2'
     or page#>>'{facets,incidents}' <> '1' or page#>>'{facets,archived}' <> '1' then
    raise exception 'FAIL: workspace filtered facets %', page->'facets';
  end if;
  if exists (select 1 from jsonb_array_elements(page->'entries') row where row->>'status'='archived') then
    raise exception 'FAIL: archived entry entered default page';
  end if;
  -- Today's timeline is the location-day activity feed: both of today's entry events
  -- appear regardless of which entry page is being viewed. The two-day-old event does not.
  if jsonb_array_length(page->'timeline') <> 2 then
    raise exception 'FAIL: timeline not scoped to the location day %', page->'timeline';
  end if;

  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',
    null,null,null,null,null,'timeline','time_desc',2,2,null);
  if (page->>'total')::integer <> 3 or jsonb_array_length(page->'entries') <> 1
     or page#>>'{entries,0,title}' <> 'Morning task' then
    raise exception 'FAIL: page two does not share filtered dataset %', page->'entries';
  end if;
  if jsonb_array_length(page->'timeline') <> 2 then
    raise exception 'FAIL: page-two timeline changed with the entry page %', page->'timeline';
  end if;

  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',
    null,null,null,null,null,'tasks','priority_desc',1,20,null);
  if (page->>'total')::integer <> 2 or exists (
    select 1 from jsonb_array_elements(page->'entries') row where row->>'entryType'='incident') then
    raise exception 'FAIL: task classification %', page->'entries';
  end if;

  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',
    null,null,null,null,null,'incidents','time_desc',1,20,null);
  if (page->>'total')::integer <> 1 or page#>>'{entries,0,entryType}' <> 'incident' then
    raise exception 'FAIL: incident classification %', page->'entries';
  end if;

  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',
    'pump','maintenance','resolved','high',null,'tasks','status_asc',1,20,
    'f5600000-0000-4000-8000-000000000004');
  if (page->>'total')::integer <> 1 or page#>>'{entries,0,title}' <> 'Resolved pump' then
    raise exception 'FAIL: combined SQL filters %', page->'entries';
  end if;
  if page#>>'{selectedEntry,title}' <> 'Archived note'
     or exists (select 1 from jsonb_array_elements(page->'entries') row
       where row->>'title'='Archived note') then
    raise exception 'FAIL: deep-linked detail leaked into filtered page %', page;
  end if;

  page := public.rpc_ops_read_page('f5010000-0000-4000-8000-000000000001',
    null,null,'archived',null,null,'timeline','time_asc',1,20,null);
  if (page->>'total')::integer <> 1 or page#>>'{entries,0,title}' <> 'Archived note' then
    raise exception 'FAIL: explicit archive history filter %', page->'entries';
  end if;
end;
$$;

rollback;
