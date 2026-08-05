-- Phase 50 — one typed, workspace-scoped Ops read model and audited export.

create or replace function public.rpc_ops_read_page(
  p_workspace_id uuid,
  p_search text default null,
  p_entry_type text default null,
  p_status text default null,
  p_priority text default null,
  p_location_id uuid default null,
  p_tab text default 'timeline',
  p_sort text default 'time_desc',
  p_page integer default 1,
  p_page_size integer default 20,
  p_selected_entry_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor_id uuid; result jsonb; entry_event_cap constant integer := 100;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  if p_entry_type is not null and p_entry_type not in
     ('task', 'incident', 'maintenance', 'service_request', 'note') then
    raise exception 'invalid ops entry type filter' using errcode = '22023';
  end if;
  if p_status is not null and p_status not in ('open', 'in_progress', 'resolved', 'archived') then
    raise exception 'invalid ops status filter' using errcode = '22023';
  end if;
  if p_priority is not null and p_priority not in ('low', 'normal', 'high', 'critical') then
    raise exception 'invalid ops priority filter' using errcode = '22023';
  end if;
  if p_tab not in ('timeline', 'briefings', 'tasks', 'incidents', 'checks') then
    raise exception 'invalid ops tab' using errcode = '22023';
  end if;
  if p_sort not in ('time_desc', 'time_asc', 'priority_desc', 'status_asc') then
    raise exception 'invalid ops sort' using errcode = '22023';
  end if;
  if p_page < 1 or p_page_size < 1 or p_page_size > 100 then
    raise exception 'invalid ops pagination' using errcode = '22023';
  end if;

  with latest_snapshots as (
    select distinct on (snapshot.rota_week_id)
      snapshot.workspace_id, snapshot.rota_week_id, snapshot.id
    from public.published_rota_snapshots as snapshot
    where snapshot.workspace_id = p_workspace_id
    order by snapshot.rota_week_id, snapshot.version desc
  ), live_published_shifts as (
    select published.id, published.source_shift_id, published.location_id,
      published.department_id, published.staff_member_id, published.shift_date,
      published.starts_at, published.ends_at, published.assignment_status,
      snapshot.rota_week_id
    from public.published_rota_shifts as published
    join latest_snapshots as snapshot on snapshot.workspace_id = published.workspace_id
      and snapshot.id = published.snapshot_id
  ), rota_week_context as (
    select rota_week.id, rota_week.location_id, rota_week.week_start,
      ((rota_week.week_start - (
        (transaction_timestamp() at time zone location.timezone)::date -
        mod(extract(isodow from (transaction_timestamp() at time zone location.timezone)::date)::integer
          - 1 - workspace.rota_start_weekday + 7, 7)
      )) / 7)::integer as week_offset
    from public.rota_weeks as rota_week
    join public.locations as location on location.workspace_id = rota_week.workspace_id
      and location.id = rota_week.location_id
    join public.workspaces as workspace on workspace.id = rota_week.workspace_id
    where rota_week.workspace_id = p_workspace_id
  ), facet_entries as (
    select entry.id, entry.workspace_id, entry.entry_type, entry.parent_entry_id,
      entry.title, entry.description, entry.location_id, entry.area_label,
      entry.department_id, entry.rota_week_id, entry.shift_id,
      entry.subject_staff_member_id, entry.leave_request_id,
      entry.assigned_staff_member_id, entry.status, entry.priority, entry.severity,
      entry.occurred_at, entry.immediate_action, entry.logged_at, entry.due_at,
      entry.pinned_at, entry.created_by_membership_id,
      entry.resolved_by_membership_id, entry.resolved_at, entry.resolution_note,
      entry.archived_by_membership_id, entry.archived_at, entry.created_at,
      entry.updated_at
    from public.ops_entries as entry
    where entry.workspace_id = p_workspace_id
      and (p_location_id is null or entry.location_id = p_location_id)
      and (case when p_status is null then entry.status <> 'archived'
                else entry.status = p_status end)
      and (p_priority is null or entry.priority = p_priority)
      and (p_entry_type is null or entry.entry_type = p_entry_type)
      and (nullif(btrim(coalesce(p_search, '')), '') is null or
        to_tsvector('simple', entry.title || ' ' || coalesce(entry.description, '') || ' ' ||
          coalesce(entry.area_label, '')) @@ plainto_tsquery('simple', p_search))
  ), filtered_entries as (
    select entry.id, entry.workspace_id, entry.entry_type, entry.parent_entry_id,
      entry.title, entry.description, entry.location_id, entry.area_label,
      entry.department_id, entry.rota_week_id, entry.shift_id,
      entry.subject_staff_member_id, entry.leave_request_id,
      entry.assigned_staff_member_id, entry.status, entry.priority, entry.severity,
      entry.occurred_at, entry.immediate_action, entry.logged_at, entry.due_at,
      entry.pinned_at, entry.created_by_membership_id,
      entry.resolved_by_membership_id, entry.resolved_at, entry.resolution_note,
      entry.archived_by_membership_id, entry.archived_at, entry.created_at,
      entry.updated_at
    from facet_entries as entry
    where entry.parent_entry_id is null
      and (p_entry_type is null or entry.entry_type = p_entry_type)
      and (p_tab <> 'tasks' or entry.entry_type <> 'incident')
      and (p_tab <> 'incidents' or entry.entry_type = 'incident')
  ), page_entries as (
    select entry.id, entry.workspace_id, entry.entry_type, entry.parent_entry_id,
      entry.title, entry.description, entry.location_id, entry.area_label,
      entry.department_id, entry.rota_week_id, entry.shift_id,
      entry.subject_staff_member_id, entry.leave_request_id,
      entry.assigned_staff_member_id, entry.status, entry.priority, entry.severity,
      entry.occurred_at, entry.immediate_action, entry.logged_at, entry.due_at,
      entry.pinned_at, entry.created_by_membership_id,
      entry.resolved_by_membership_id, entry.resolved_at, entry.resolution_note,
      entry.archived_by_membership_id, entry.archived_at, entry.created_at,
      entry.updated_at,
      row_number() over (order by
        case when p_sort = 'time_asc' then entry.updated_at end asc,
        case when p_sort = 'priority_desc' then
          case entry.priority when 'critical' then 4 when 'high' then 3 when 'normal' then 2 else 1 end
        end desc,
        case when p_sort = 'status_asc' then
          case entry.status when 'open' then 1 when 'in_progress' then 2 when 'resolved' then 3 else 4 end
        end asc,
        case when p_sort = 'time_desc' then entry.updated_at end desc,
        entry.updated_at desc, entry.id) as sort_order
    from filtered_entries as entry
    order by
      case when p_sort = 'time_asc' then entry.updated_at end asc,
      case when p_sort = 'priority_desc' then
        case entry.priority when 'critical' then 4 when 'high' then 3 when 'normal' then 2 else 1 end
      end desc,
      case when p_sort = 'status_asc' then
        case entry.status when 'open' then 1 when 'in_progress' then 2 when 'resolved' then 3 else 4 end
      end asc,
      case when p_sort = 'time_desc' then entry.updated_at end desc,
      entry.updated_at desc, entry.id
    limit p_page_size offset ((p_page - 1) * p_page_size)
  ), requested_entries as (
    select entry.id, entry.workspace_id, entry.entry_type, entry.parent_entry_id,
      entry.title, entry.description, entry.location_id, entry.area_label,
      entry.department_id, entry.rota_week_id, entry.shift_id,
      entry.subject_staff_member_id, entry.leave_request_id,
      entry.assigned_staff_member_id, entry.status, entry.priority, entry.severity,
      entry.occurred_at, entry.immediate_action, entry.logged_at, entry.due_at,
      entry.pinned_at, entry.created_by_membership_id,
      entry.resolved_by_membership_id, entry.resolved_at, entry.resolution_note,
      entry.archived_by_membership_id, entry.archived_at, entry.created_at,
      entry.updated_at, entry.sort_order, true as is_page
    from page_entries as entry
    union all
    select selected.id, selected.workspace_id, selected.entry_type, selected.parent_entry_id,
      selected.title, selected.description, selected.location_id, selected.area_label,
      selected.department_id, selected.rota_week_id, selected.shift_id,
      selected.subject_staff_member_id, selected.leave_request_id,
      selected.assigned_staff_member_id, selected.status, selected.priority, selected.severity,
      selected.occurred_at, selected.immediate_action, selected.logged_at, selected.due_at,
      selected.pinned_at, selected.created_by_membership_id,
      selected.resolved_by_membership_id, selected.resolved_at, selected.resolution_note,
      selected.archived_by_membership_id, selected.archived_at, selected.created_at,
      selected.updated_at, null::bigint as sort_order, false as is_page
    from public.ops_entries as selected
    where selected.workspace_id = p_workspace_id and selected.id = p_selected_entry_id
  ), entry_rows as (
    select entry.id, entry.sort_order, entry.is_page, jsonb_build_object(
      'id', entry.id, 'entryType', entry.entry_type, 'parentEntryId', entry.parent_entry_id,
      'title', entry.title, 'description', entry.description, 'locationId', entry.location_id,
      'locationName', location.name, 'area', entry.area_label, 'departmentId', entry.department_id,
      'locationTimezone', location.timezone,
      'departmentName', department.name, 'rotaWeekId', entry.rota_week_id,
      'rotaWeekStart', rota_week.week_start,
      'rotaWeekOffset', week_context.week_offset,
      'shiftId', entry.shift_id, 'subjectStaffMemberId', entry.subject_staff_member_id,
      'subjectStaffName', subject_staff.display_name, 'leaveRequestId', entry.leave_request_id,
      'assignedStaffMemberId', entry.assigned_staff_member_id,
      'assignedStaffName', assignee.display_name, 'dueAt', entry.due_at,
      'priority', entry.priority, 'status', entry.status, 'severity', entry.severity,
      'occurredAt', entry.occurred_at, 'immediateAction', entry.immediate_action,
      'pinned', entry.pinned_at is not null,
      'createdByMembershipId', entry.created_by_membership_id,
      'createdByName', coalesce(creator_staff.display_name, 'Manager'),
      'resolvedAt', entry.resolved_at, 'archivedAt', entry.archived_at,
      'createdAt', entry.created_at, 'updatedAt', entry.updated_at,
      'followUpCount', (select count(*) from public.ops_entries as child
        where child.workspace_id = entry.workspace_id and child.parent_entry_id = entry.id
          and child.status <> 'archived'),
      'noteCount', (select count(*) from public.ops_entry_events as event
        where event.workspace_id = entry.workspace_id and event.ops_entry_id = entry.id
          and event.event_type = 'note_added')
    ) as value
    from requested_entries as entry
    join public.locations as location on location.workspace_id = entry.workspace_id
      and location.id = entry.location_id
    left join public.departments as department on department.workspace_id = entry.workspace_id
      and department.id = entry.department_id
    left join public.rota_weeks as rota_week on rota_week.workspace_id = entry.workspace_id
      and rota_week.id = entry.rota_week_id
    left join rota_week_context as week_context on week_context.id = entry.rota_week_id
    left join public.staff_members as subject_staff on subject_staff.workspace_id = entry.workspace_id
      and subject_staff.id = entry.subject_staff_member_id
    left join public.staff_members as assignee on assignee.workspace_id = entry.workspace_id
      and assignee.id = entry.assigned_staff_member_id
    left join public.staff_members as creator_staff on creator_staff.workspace_id = entry.workspace_id
      and creator_staff.membership_id = entry.created_by_membership_id
  -- Today's timeline is a separate chronological activity feed. It is scoped only by
  -- location and the local calendar day, never by the entry-list tab, filters or page
  -- offset, so entry pagination can never duplicate, remove or reorder these events.
  ), timeline_rows as (
    select 'entry_event'::text as kind, event.id as event_id, event.occurred_at, jsonb_build_object(
      'id', event.id, 'kind', 'entry_event', 'referenceId', event.ops_entry_id,
      'entryType', timeline_entry.entry_type, 'title', timeline_entry.title, 'summary',
        coalesce(event.note, replace(event.event_type, '_', ' ')),
      'status', event.resulting_status, 'occurredAt', event.occurred_at,
      'actorName', coalesce(actor_staff.display_name, 'Manager'),
      'locationName', location.name, 'area', timeline_entry.area_label,
      'priority', timeline_entry.priority
    ) as value
    from public.ops_entry_events as event
    join public.ops_entries as timeline_entry on timeline_entry.workspace_id = event.workspace_id
      and timeline_entry.id = event.ops_entry_id
    join public.locations as location on location.workspace_id = timeline_entry.workspace_id
      and location.id = timeline_entry.location_id
    left join public.staff_members as actor_staff on actor_staff.workspace_id = event.workspace_id
      and actor_staff.membership_id = event.actor_membership_id
    where event.workspace_id = p_workspace_id
      and (p_location_id is null or timeline_entry.location_id = p_location_id)
      and (event.occurred_at at time zone location.timezone)::date =
          (transaction_timestamp() at time zone location.timezone)::date
    union all
    select 'handover'::text, handover.id, handover.created_at, jsonb_build_object(
      'id', handover.id, 'kind', 'handover', 'referenceId', handover.id,
      'title', 'Manager handover', 'summary', handover.notes, 'status', 'issued',
      'occurredAt', handover.created_at, 'actorName', coalesce(sender.display_name, 'Manager'),
      'locationName', location.name, 'area', null, 'priority', 'normal'
    )
    from public.ops_handovers as handover
    join public.locations as location on location.workspace_id = handover.workspace_id
      and location.id = handover.location_id
    left join public.staff_members as sender on sender.workspace_id = handover.workspace_id
      and sender.membership_id = handover.from_membership_id
    where handover.workspace_id = p_workspace_id
      and (p_location_id is null or handover.location_id = p_location_id)
      and handover.handover_date =
          (transaction_timestamp() at time zone location.timezone)::date
    union all
    select 'briefing'::text, briefing.id, briefing.created_at, jsonb_build_object(
      'id', briefing.id, 'kind', 'briefing', 'referenceId', briefing.id,
      'title', briefing.title, 'summary', briefing.summary, 'status', 'issued',
      'occurredAt', briefing.created_at, 'actorName', coalesce(author_staff.display_name, 'Manager'),
      'locationName', location.name, 'area', null, 'priority', 'normal'
    )
    from public.ops_briefings as briefing
    join public.locations as location on location.workspace_id = briefing.workspace_id
      and location.id = briefing.location_id
    left join public.staff_members as author_staff on author_staff.workspace_id = briefing.workspace_id
      and author_staff.membership_id = briefing.authored_by_membership_id
    where briefing.workspace_id = p_workspace_id
      and (p_location_id is null or briefing.location_id = p_location_id)
      and briefing.briefing_date =
          (transaction_timestamp() at time zone location.timezone)::date
  -- Deterministic deduplication by event identity, so a fan-out in any lookup join can
  -- never emit the same collaboration event twice.
  ), timeline_feed as (
    select distinct on (row.kind, row.event_id)
      row.kind, row.event_id, row.occurred_at, row.value
    from timeline_rows as row
    order by row.kind, row.event_id, row.occurred_at desc, row.value::text
  -- Only entry events are bounded. The selected location-day's handover and briefing
  -- events are unioned after that cap, so a busy entry feed can never push the day's
  -- collaboration record out of the timeline. The two branches are disjoint by kind, so
  -- the union cannot reintroduce a duplicate after the deduplication above.
  ), timeline_bounded as (
    select capped.kind, capped.event_id, capped.occurred_at, capped.value
    from (
      select feed.kind, feed.event_id, feed.occurred_at, feed.value
      from timeline_feed as feed
      where feed.kind = 'entry_event'
      order by feed.occurred_at desc, feed.kind, feed.event_id
      limit entry_event_cap
    ) as capped
    union all
    select feed.kind, feed.event_id, feed.occurred_at, feed.value
    from timeline_feed as feed
    where feed.kind <> 'entry_event'
  ), risk_rows as (
    select entry.updated_at as occurred_at, jsonb_build_object(
      'id', 'entry:' || entry.id::text,
      'kind', case
        when entry.entry_type = 'incident' and entry.severity = 'critical' then 'critical_incident'
        when entry.due_at < transaction_timestamp() then 'overdue_entry'
        when entry.assigned_staff_member_id is null and entry.priority in ('high', 'critical') then 'unassigned_priority'
        else 'priority_entry' end,
      'title', entry.title,
      'body', case
        when entry.entry_type = 'incident' and entry.severity = 'critical' then 'Critical incident remains unresolved.'
        when entry.due_at < transaction_timestamp() then 'Due time has passed.'
        when entry.assigned_staff_member_id is null then 'High-priority item has no assignee.'
        else 'Critical-priority item remains unresolved.' end,
      'tone', case when entry.priority = 'critical' or entry.severity = 'critical' then 'danger' else 'warning' end,
      'entryId', entry.id, 'shiftId', entry.shift_id, 'rotaWeekId', entry.rota_week_id,
      'rotaWeekOffset', week_context.week_offset, 'locationId', entry.location_id
    ) as value
    from public.ops_entries as entry
    left join rota_week_context as week_context on week_context.id = entry.rota_week_id
    where entry.workspace_id = p_workspace_id and entry.status in ('open', 'in_progress')
      and (p_location_id is null or entry.location_id = p_location_id)
      and (entry.priority = 'critical' or entry.severity = 'critical' or
           entry.due_at < transaction_timestamp() or
           (entry.priority = 'high' and entry.assigned_staff_member_id is null))
    union all
    select shift.starts_at, jsonb_build_object(
      'id', 'shift:' || shift.id::text, 'kind', 'uncovered_shift',
      'title', 'Uncovered published shift',
      'body', to_char(shift.starts_at, 'Dy DD Mon HH24:MI') || ' has no assignee.',
      'tone', 'warning', 'entryId', null, 'shiftId', shift.source_shift_id,
      'rotaWeekId', shift.rota_week_id, 'rotaWeekOffset', week_context.week_offset,
      'locationId', shift.location_id
    )
    from live_published_shifts as shift
    left join rota_week_context as week_context on week_context.id = shift.rota_week_id
    where shift.assignment_status = 'open' and shift.ends_at > transaction_timestamp()
      and (p_location_id is null or shift.location_id = p_location_id)
    union all
    select issue.opened_at, jsonb_build_object(
      'id', 'rota-issue:' || issue.id::text, 'kind', 'published_rota_issue',
      'title', 'Published rota update required',
      'body', 'A leave change requires manager review and a later rota publication.',
      'tone', 'warning', 'entryId', null, 'rotaWeekId', issue.rota_week_id,
      'rotaWeekOffset', week_context.week_offset, 'leaveRequestId', issue.leave_request_id,
      'locationId', rota_week.location_id
    )
    from public.rota_operational_issues as issue
    join public.rota_weeks as rota_week on rota_week.workspace_id = issue.workspace_id
      and rota_week.id = issue.rota_week_id
    left join rota_week_context as week_context on week_context.id = issue.rota_week_id
    where issue.workspace_id = p_workspace_id and issue.status = 'open'
      and (p_location_id is null or rota_week.location_id = p_location_id)
    union all
    select handover.created_at, jsonb_build_object(
      'id', 'handover:' || handover.id::text, 'kind', 'unacknowledged_handover',
      'title', 'Handover awaiting acknowledgement',
      'body', location.name || ' handover has unacknowledged recipients.',
      'tone', 'info', 'handoverId', handover.id, 'entryId', null,
      'locationId', handover.location_id, 'rotaWeekId', handover.rota_week_id,
      'rotaWeekOffset', week_context.week_offset
    )
    from public.ops_handovers as handover
    join public.locations as location on location.workspace_id = handover.workspace_id
      and location.id = handover.location_id
    left join rota_week_context as week_context on week_context.id = handover.rota_week_id
    where handover.workspace_id = p_workspace_id
      and (p_location_id is null or handover.location_id = p_location_id)
      and exists (select 1 from public.ops_handover_recipients as recipient
        where recipient.workspace_id = handover.workspace_id and recipient.handover_id = handover.id
          and recipient.acknowledged_at is null)
    union all
    select run.started_at, jsonb_build_object(
      'id', 'checklist:' || run.id::text, 'kind', 'incomplete_checklist',
      'title', template.name, 'body', 'Today''s checklist run is not manager reviewed.',
      'tone', 'info', 'checklistRunId', run.id, 'entryId', null,
      'locationId', run.location_id
    )
    from public.ops_checklist_runs as run
    join public.ops_checklist_templates as template on template.workspace_id = run.workspace_id
      and template.id = run.template_id
    join public.locations as location on location.workspace_id = run.workspace_id
      and location.id = run.location_id
    where run.workspace_id = p_workspace_id and run.status <> 'reviewed'
      and run.run_date = (transaction_timestamp() at time zone location.timezone)::date
      and (p_location_id is null or run.location_id = p_location_id)
  )
  select jsonb_build_object(
    'actorMembershipId', actor_id,
    'filters', jsonb_build_object('search', coalesce(p_search, ''), 'entryType', p_entry_type,
      'status', p_status, 'priority', p_priority, 'locationId', p_location_id,
      'tab', p_tab, 'sort', p_sort, 'page', p_page, 'pageSize', p_page_size),
    'total', (select count(*) from filtered_entries),
    'facets', jsonb_build_object(
      'topLevel', (select count(*) from facet_entries where parent_entry_id is null),
      'tasks', (select count(*) from facet_entries
        where parent_entry_id is null and entry_type <> 'incident'),
      'incidents', (select count(*) from facet_entries
        where parent_entry_id is null and entry_type = 'incident'),
      'open', (select count(*) from facet_entries
        where parent_entry_id is null and status = 'open'),
      'inProgress', (select count(*) from facet_entries
        where parent_entry_id is null and status = 'in_progress'),
      'resolved', (select count(*) from facet_entries
        where parent_entry_id is null and status = 'resolved'),
      'archived', (select count(*) from public.ops_entries as entry
        where entry.workspace_id = p_workspace_id and entry.parent_entry_id is null
          and entry.status = 'archived'
          and (p_location_id is null or entry.location_id = p_location_id)
          and (p_priority is null or entry.priority = p_priority)
          and (p_entry_type is null or entry.entry_type = p_entry_type)
          and (nullif(btrim(coalesce(p_search, '')), '') is null or
            to_tsvector('simple', entry.title || ' ' || coalesce(entry.description, '') || ' ' ||
              coalesce(entry.area_label, '')) @@ plainto_tsquery('simple', p_search)))
    ),
    'entries', coalesce((select jsonb_agg(value order by sort_order)
      from entry_rows where is_page), '[]'::jsonb),
    'selectedEntry', (select value from entry_rows where not is_page limit 1),
    'timeline', coalesce((select jsonb_agg(value order by occurred_at desc, kind, event_id)
      from timeline_bounded), '[]'::jsonb),
    'timelineEntryEventLimit', entry_event_cap,
    'timelineTruncated', (select count(*) from timeline_feed as feed
      where feed.kind = 'entry_event') > entry_event_cap,
    'risks', coalesce((select jsonb_agg(value order by occurred_at desc)
      from risk_rows), '[]'::jsonb),
    'metrics', jsonb_build_object(
      'activeShifts', (select count(*) from live_published_shifts as shift
        where transaction_timestamp() >= shift.starts_at and transaction_timestamp() < shift.ends_at
          and (p_location_id is null or shift.location_id = p_location_id)),
      'openIncidents', (select count(*) from public.ops_entries as entry where entry.workspace_id = p_workspace_id
        and entry.entry_type = 'incident' and entry.status in ('open', 'in_progress')
        and (p_location_id is null or entry.location_id = p_location_id)),
      'onShift', (select count(distinct shift.staff_member_id) from live_published_shifts as shift
        where shift.staff_member_id is not null and transaction_timestamp() >= shift.starts_at
          and transaction_timestamp() < shift.ends_at
          and (p_location_id is null or shift.location_id = p_location_id)),
      'uncoveredShifts', (select count(*) from live_published_shifts as shift
        where shift.assignment_status = 'open' and shift.ends_at > transaction_timestamp()
          and (p_location_id is null or shift.location_id = p_location_id)),
      'tasksCompletedToday', (select count(*) from public.ops_entries as entry
        join public.locations as location on location.workspace_id = entry.workspace_id
          and location.id = entry.location_id
        where entry.workspace_id = p_workspace_id and entry.entry_type = 'task'
          and entry.parent_entry_id is null and entry.resolved_at is not null
          and (entry.resolved_at at time zone location.timezone)::date =
              (transaction_timestamp() at time zone location.timezone)::date
          and (p_location_id is null or entry.location_id = p_location_id)),
      'briefingsToday', (select count(*) from public.ops_briefings as briefing
        join public.locations as location on location.workspace_id = briefing.workspace_id
          and location.id = briefing.location_id
        where briefing.workspace_id = p_workspace_id and briefing.briefing_date =
          (transaction_timestamp() at time zone location.timezone)::date
          and (p_location_id is null or briefing.location_id = p_location_id)),
      'checklistPercent', coalesce((select round(100.0 * count(*) filter (where item.state <> 'pending') /
          nullif(count(*), 0))::integer
        from public.ops_checklist_run_items as item
        join public.ops_checklist_runs as run on run.workspace_id = item.workspace_id and run.id = item.run_id
        join public.locations as location on location.workspace_id = run.workspace_id and location.id = run.location_id
        where item.workspace_id = p_workspace_id and run.run_date =
          (transaction_timestamp() at time zone location.timezone)::date
          and (p_location_id is null or run.location_id = p_location_id)), 0)
    ),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('id', location.id, 'name', location.name,
        'timezone', location.timezone) order by location.name) from public.locations as location
      where location.workspace_id = p_workspace_id and location.status = 'active'), '[]'::jsonb),
    'departments', coalesce((select jsonb_agg(jsonb_build_object('id', department.id, 'name', department.name)
        order by department.name) from public.departments as department
      where department.workspace_id = p_workspace_id and department.status = 'active'), '[]'::jsonb),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', staff.id, 'name', staff.display_name,
        'departmentId', staff.department_id, 'locationId', staff.primary_location_id,
        'onShift', exists (select 1 from live_published_shifts as shift where shift.staff_member_id = staff.id
          and transaction_timestamp() >= shift.starts_at and transaction_timestamp() < shift.ends_at))
        order by staff.display_name) from public.staff_members as staff
      where staff.workspace_id = p_workspace_id and staff.employment_status = 'active'), '[]'::jsonb),
    'managers', coalesce((select jsonb_agg(jsonb_build_object('id', membership.id,
        'name', coalesce(manager_staff.display_name, 'Manager'), 'isSelf', membership.id = actor_id)
        order by coalesce(manager_staff.display_name, 'Manager'))
      from public.workspace_memberships as membership
      left join public.staff_members as manager_staff on manager_staff.workspace_id = membership.workspace_id
        and manager_staff.membership_id = membership.id
      where membership.workspace_id = p_workspace_id and membership.status = 'active'
        and membership.role in ('owner', 'manager')), '[]'::jsonb),
    'linkableEntries', coalesce((select jsonb_agg(jsonb_build_object(
        'id', entry.id, 'title', entry.title, 'locationId', entry.location_id,
        'status', entry.status, 'priority', entry.priority, 'rotaWeekId', entry.rota_week_id)
        || jsonb_build_object('dueAt', entry.due_at, 'severity', entry.severity,
          'assignedStaffMemberId', entry.assigned_staff_member_id)
        order by entry.pinned_at desc nulls last, entry.updated_at desc, entry.id)
      from public.ops_entries as entry
      where entry.workspace_id = p_workspace_id and entry.status <> 'archived'
        and (p_location_id is null or entry.location_id = p_location_id)), '[]'::jsonb),
    'detail', case when p_selected_entry_id is null then null else (
      select jsonb_build_object('events', coalesce((select jsonb_agg(jsonb_build_object(
          'id', event.id, 'eventType', event.event_type, 'note', event.note,
          'resultingStatus', event.resulting_status, 'occurredAt', event.occurred_at,
          'actorName', coalesce(actor_staff.display_name, 'Manager'), 'details', event.details)
          order by event.occurred_at, event.id)
        from public.ops_entry_events as event
        left join public.staff_members as actor_staff on actor_staff.workspace_id = event.workspace_id
          and actor_staff.membership_id = event.actor_membership_id
        where event.workspace_id = selected.workspace_id and event.ops_entry_id = selected.id), '[]'::jsonb),
        'followUps', coalesce((select jsonb_agg(jsonb_build_object('id', child.id, 'title', child.title,
          'status', child.status, 'priority', child.priority, 'dueAt', child.due_at)
          order by child.created_at) from public.ops_entries as child
          where child.workspace_id = selected.workspace_id and child.parent_entry_id = selected.id), '[]'::jsonb))
      from public.ops_entries as selected where selected.workspace_id = p_workspace_id
        and selected.id = p_selected_entry_id) end,
    'handovers', coalesce((select jsonb_agg(jsonb_build_object('id', handover.id,
        'locationId', handover.location_id, 'locationName', location.name,
        'rotaWeekId', handover.rota_week_id, 'handoverDate', handover.handover_date,
        'notes', handover.notes, 'senderName', coalesce(sender.display_name, 'Manager'),
        'createdAt', handover.created_at,
        'recipients', (select coalesce(jsonb_agg(jsonb_build_object('membershipId', recipient.recipient_membership_id,
          'name', coalesce(recipient_staff.display_name, 'Manager'),
          'acknowledgedAt', recipient.acknowledged_at) order by coalesce(recipient_staff.display_name, 'Manager')), '[]'::jsonb)
          from public.ops_handover_recipients as recipient
          left join public.staff_members as recipient_staff on recipient_staff.workspace_id = recipient.workspace_id
            and recipient_staff.membership_id = recipient.recipient_membership_id
          where recipient.workspace_id = handover.workspace_id and recipient.handover_id = handover.id),
        'items', (select coalesce(jsonb_agg(jsonb_build_object('entryId', item.ops_entry_id,
          'title', entry.title, 'carriedForward', item.carried_forward) order by entry.title), '[]'::jsonb)
          from public.ops_handover_items as item join public.ops_entries as entry
            on entry.workspace_id = item.workspace_id and entry.id = item.ops_entry_id
          where item.workspace_id = handover.workspace_id and item.handover_id = handover.id))
        order by handover.created_at desc)
      from public.ops_handovers as handover join public.locations as location
        on location.workspace_id = handover.workspace_id and location.id = handover.location_id
      left join public.staff_members as sender on sender.workspace_id = handover.workspace_id
        and sender.membership_id = handover.from_membership_id
      where handover.workspace_id = p_workspace_id
        and (p_location_id is null or handover.location_id = p_location_id)), '[]'::jsonb),
    'briefings', coalesce((select jsonb_agg(jsonb_build_object('id', briefing.id,
        'locationId', briefing.location_id, 'locationName', location.name,
        'briefingDate', briefing.briefing_date, 'title', briefing.title, 'summary', briefing.summary,
        'isToday', briefing.briefing_date = (transaction_timestamp() at time zone location.timezone)::date,
        'authorName', coalesce(author_staff.display_name, 'Manager'), 'createdAt', briefing.created_at,
        'recipients', (select coalesce(jsonb_agg(jsonb_build_object('membershipId', recipient.recipient_membership_id,
          'name', coalesce(recipient_staff.display_name, 'Manager'), 'readAt', recipient.read_at,
          'acknowledgedAt', recipient.acknowledged_at) order by coalesce(recipient_staff.display_name, 'Manager')), '[]'::jsonb)
          from public.ops_briefing_recipients as recipient
          left join public.staff_members as recipient_staff on recipient_staff.workspace_id = recipient.workspace_id
            and recipient_staff.membership_id = recipient.recipient_membership_id
          where recipient.workspace_id = briefing.workspace_id and recipient.briefing_id = briefing.id),
        'entryIds', (select coalesce(jsonb_agg(item.ops_entry_id order by item.ops_entry_id), '[]'::jsonb)
          from public.ops_briefing_items as item where item.workspace_id = briefing.workspace_id
            and item.briefing_id = briefing.id)) order by briefing.created_at desc)
      from public.ops_briefings as briefing join public.locations as location
        on location.workspace_id = briefing.workspace_id and location.id = briefing.location_id
      left join public.staff_members as author_staff on author_staff.workspace_id = briefing.workspace_id
        and author_staff.membership_id = briefing.authored_by_membership_id
      where briefing.workspace_id = p_workspace_id
        and (p_location_id is null or briefing.location_id = p_location_id)), '[]'::jsonb),
    'checklistTemplates', coalesce((select jsonb_agg(jsonb_build_object('id', template.id,
        'name', template.name, 'locationId', template.location_id, 'departmentId', template.department_id,
        'shiftType', template.shift_type, 'daypart', template.daypart, 'active', template.active,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('id', item.id, 'position', item.position,
          'label', item.label, 'requiresNote', item.requires_note) order by item.position), '[]'::jsonb)
          from public.ops_checklist_template_items as item where item.workspace_id = template.workspace_id
            and item.template_id = template.id)) order by template.name)
      from public.ops_checklist_templates as template where template.workspace_id = p_workspace_id
        and (p_location_id is null or template.location_id is null or template.location_id = p_location_id)), '[]'::jsonb),
    'checklistRuns', coalesce((select jsonb_agg(jsonb_build_object('id', run.id,
        'templateId', run.template_id, 'templateName', template.name, 'locationId', run.location_id,
        'locationName', location.name, 'runDate', run.run_date,
        'assignedStaffMemberId', run.assigned_staff_member_id, 'assignedStaffName', assignee.display_name,
        'status', run.status, 'startedAt', run.started_at, 'completedAt', run.completed_at,
        'reviewedAt', run.reviewed_at,
        'isToday', run.run_date = (transaction_timestamp() at time zone location.timezone)::date,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('id', item.id, 'position', item.position,
          'label', item.label, 'requiresNote', item.requires_note, 'state', item.state,
          'note', item.note, 'linkedOpsEntryId', item.linked_ops_entry_id,
          'history', coalesce((select jsonb_agg(jsonb_build_object(
            'id', item_event.id, 'previousState', item_event.previous_state,
            'resultingState', item_event.resulting_state, 'note', item_event.note,
            'linkedOpsEntryId', item_event.linked_ops_entry_id,
            'occurredAt', item_event.occurred_at,
            'actorName', coalesce(event_actor.display_name, 'Manager'))
            order by item_event.occurred_at, item_event.id)
            from public.ops_checklist_run_item_events as item_event
            left join public.staff_members as event_actor
              on event_actor.workspace_id = item_event.workspace_id
             and event_actor.membership_id = item_event.actor_membership_id
            where item_event.workspace_id = item.workspace_id
              and item_event.run_item_id = item.id), '[]'::jsonb)) order by item.position), '[]'::jsonb)
          from public.ops_checklist_run_items as item where item.workspace_id = run.workspace_id
            and item.run_id = run.id)) order by run.started_at desc)
      from public.ops_checklist_runs as run join public.ops_checklist_templates as template
        on template.workspace_id = run.workspace_id and template.id = run.template_id
      join public.locations as location on location.workspace_id = run.workspace_id and location.id = run.location_id
      left join public.staff_members as assignee on assignee.workspace_id = run.workspace_id
        and assignee.id = run.assigned_staff_member_id
      where run.workspace_id = p_workspace_id
        and (p_location_id is null or run.location_id = p_location_id)), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.rpc_ops_export_entries(
  p_workspace_id uuid, p_request_id uuid, p_location_id uuid default null
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entries.export');
  if not request_is_new then return result; end if;
  result := jsonb_build_object('exportedAt', transaction_timestamp(), 'entries', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', entry.id, 'type', entry.entry_type, 'title', entry.title,
      'description', entry.description, 'location', location.name, 'area', entry.area_label,
      'department', department.name, 'assignee', assignee.display_name,
      'dueAt', entry.due_at, 'priority', entry.priority, 'status', entry.status,
      'severity', entry.severity, 'occurredAt', entry.occurred_at,
      'immediateAction', entry.immediate_action, 'createdAt', entry.created_at,
      'updatedAt', entry.updated_at) order by entry.updated_at desc)
    from public.ops_entries as entry
    join public.locations as location on location.workspace_id = entry.workspace_id
      and location.id = entry.location_id
    left join public.departments as department on department.workspace_id = entry.workspace_id
      and department.id = entry.department_id
    left join public.staff_members as assignee on assignee.workspace_id = entry.workspace_id
      and assignee.id = entry.assigned_staff_member_id
    where entry.workspace_id = p_workspace_id
      and (p_location_id is null or entry.location_id = p_location_id)
      and (entry.logged_at at time zone location.timezone)::date =
          (transaction_timestamp() at time zone location.timezone)::date), '[]'::jsonb));
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'ops.entries_exported', 'workspace', p_workspace_id,
    jsonb_build_object('location_id', p_location_id,
      'entry_count', jsonb_array_length(result->'entries'))
  );
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

revoke all on function public.rpc_ops_read_page(uuid, text, text, text, text, uuid, text, text, integer, integer, uuid)
  from public, anon;
revoke all on function public.rpc_ops_export_entries(uuid, uuid, uuid) from public, anon;
grant execute on function public.rpc_ops_read_page(uuid, text, text, text, text, uuid, text, text, integer, integer, uuid)
  to authenticated;
grant execute on function public.rpc_ops_export_entries(uuid, uuid, uuid) to authenticated;

comment on function public.rpc_ops_read_page(uuid, text, text, text, text, uuid, text, text, integer, integer, uuid)
  is 'Phase 50 stable manager-only Ops read snapshot with typed filters and explicit fields.';
comment on function public.rpc_ops_export_entries(uuid, uuid, uuid)
  is 'Phase 50 idempotent manager-only Ops export with one audit event.';

notify pgrst, 'reload schema';
