-- Phase 71 — Time review, correction, hours queries and manual flags (WS-11).
--
-- Implements:
--   1. Flag for review on public.time_entries (flagged, flag_note, flagged_at, flagged_by_membership_id).
--      Manager-only, requires a note, clearable, does not mutate clock data or approval status.
--   2. Return note on public.time_entries (return_note).
--      Required when returning time for correction (p_approval_status = 'rejected').
--   3. time_entry_events event_type CHECK widened to accept:
--      'flagged', 'unflagged', 'query_raised', 'query_resolved'.
--   4. notifications kind CHECK widened to accept:
--      'time_returned', 'time_query_raised', 'time_query_resolved'.
--   5. public.time_hours_queries table + covering indexes + RLS (staff own only, manager workspace-all).
--   6. staff_portal_time_entries view updated to expose return_note.
--   7. RPCs:
--      - rpc_flag_time_entry
--      - rpc_unflag_time_entry
--      - rpc_batch_approve_time_entries updated (reason required on rejected, notifies staff)
--      - rpc_staff_raise_hours_query (staff own only, notifies active managers)
--      - rpc_resolve_hours_query (manager only, notifies staff)

-- ---------------------------------------------------------------------------
-- 1. Alter public.time_entries to add flag and return columns.
-- ---------------------------------------------------------------------------

alter table public.time_entries
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_note text check (flag_note is null or (char_length(trim(flag_note)) between 1 and 2000)),
  add column if not exists flagged_at timestamptz,
  add column if not exists flagged_by_membership_id uuid,
  add column if not exists return_note text check (return_note is null or (char_length(trim(return_note)) between 1 and 2000));

alter table public.time_entries
  add constraint time_entries_flagged_by_fkey
  foreign key (workspace_id, flagged_by_membership_id)
  references public.workspace_memberships (workspace_id, id) on delete restrict;

create index if not exists time_entries_workspace_flagged_by_idx
  on public.time_entries (workspace_id, flagged_by_membership_id)
  where flagged_by_membership_id is not null;

alter table public.time_entries
  add constraint time_entries_flag_consistency_check
  check (
    (flagged = false and flag_note is null and flagged_at is null and flagged_by_membership_id is null)
    or
    (flagged = true and flag_note is not null and flagged_at is not null and flagged_by_membership_id is not null)
  );

grant select (flagged, flag_note, flagged_at, flagged_by_membership_id, return_note)
  on public.time_entries to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Extend time_entry_events event_type CHECK.
-- ---------------------------------------------------------------------------

alter table public.time_entry_events drop constraint time_entry_events_event_type_check;
alter table public.time_entry_events add constraint time_entry_events_event_type_check
  check (event_type in (
    'created', 'adjusted', 'submitted', 'approved', 'rejected', 'reopened',
    'flagged', 'unflagged', 'query_raised', 'query_resolved'
  ));

-- ---------------------------------------------------------------------------
-- 3. Extend notifications kind CHECK.
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'shift_changed', 'rota_published', 'leave_approved', 'leave_declined',
  'leave_cancelled', 'announcement', 'timesheet_reminder', 'open_shift_update',
  'shift_release_update', 'unavailability_update', 'rota_update_required',
  'ops_assigned', 'ops_priority', 'ops_entry_resolved', 'ops_handover_issued',
  'ops_briefing_issued', 'ops_checklist_exception',
  'announcement_reminder', 'team_training_reminder',
  'time_returned', 'time_query_raised', 'time_query_resolved'
));

-- ---------------------------------------------------------------------------
-- 4. Create public.time_hours_queries table + indexes + RLS.
-- ---------------------------------------------------------------------------

create table public.time_hours_queries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  time_entry_id uuid not null,
  staff_member_id uuid not null,
  issue_type text not null
    check (issue_type in ('missing_clock_out', 'incorrect_times', 'incorrect_break', 'missing_shift', 'other')),
  note text not null
    check (char_length(trim(note)) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'dismissed')),
  resolution_note text
    check (resolution_note is null or (char_length(trim(resolution_note)) between 1 and 2000)),
  resolved_by_membership_id uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, time_entry_id)
    references public.time_entries (workspace_id, id) on delete cascade,
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, resolved_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (
    (status = 'pending' and resolution_note is null and resolved_by_membership_id is null and resolved_at is null)
    or
    (status in ('resolved', 'dismissed') and resolved_by_membership_id is not null and resolved_at is not null)
  )
);

create index time_hours_queries_workspace_entry_idx
  on public.time_hours_queries (workspace_id, time_entry_id);

create index time_hours_queries_workspace_staff_idx
  on public.time_hours_queries (workspace_id, staff_member_id);

create index time_hours_queries_workspace_resolver_idx
  on public.time_hours_queries (workspace_id, resolved_by_membership_id)
  where resolved_by_membership_id is not null;

create index time_hours_queries_workspace_status_created_idx
  on public.time_hours_queries (workspace_id, status, created_at desc);

create trigger time_hours_queries_set_updated_at
  before update on public.time_hours_queries
  for each row execute function public.set_updated_at();

alter table public.time_hours_queries enable row level security;
alter table public.time_hours_queries force row level security;

create policy time_hours_queries_manager_select
  on public.time_hours_queries
  for select
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy time_hours_queries_staff_select
  on public.time_hours_queries
  for select
  to authenticated
  using (staff_member_id = public.current_staff_member_id(workspace_id));

create policy time_hours_queries_staff_insert
  on public.time_hours_queries
  for insert
  to authenticated
  with check (staff_member_id = public.current_staff_member_id(workspace_id));

create policy time_hours_queries_manager_update
  on public.time_hours_queries
  for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

grant select, insert, update on table public.time_hours_queries to authenticated;

comment on table public.time_hours_queries is
  'Structured staff queries about recorded shift hours. Staff raise against their own entries; managers review and resolve with audit history.';

-- ---------------------------------------------------------------------------
-- 5. Update staff_portal_time_entries view to expose return_note.
-- ---------------------------------------------------------------------------

drop view if exists public.staff_portal_time_entries cascade;

create view public.staff_portal_time_entries
with (security_barrier = true, security_invoker = true)
as
select
  entry.workspace_id,
  entry.id as time_entry_id,
  entry.staff_member_id,
  entry.shift_id,
  entry.work_date,
  entry.scheduled_start_at,
  entry.scheduled_end_at,
  entry.clocked_in_at,
  entry.clocked_out_at,
  entry.break_minutes,
  entry.approval_status,
  entry.approved_at,
  entry.return_note
from public.time_entries as entry
where entry.staff_member_id = public.current_staff_member_id(entry.workspace_id);

grant select on public.staff_portal_time_entries to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC: rpc_flag_time_entry & rpc_unflag_time_entry.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_flag_time_entry(
  p_workspace_id uuid,
  p_time_entry_id uuid,
  p_note text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  target_entry record;
  trimmed_note text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is null or length(trimmed_note) > 2000 then
    raise exception 'flag note is required and must be at most 2000 characters'
      using errcode = '22023';
  end if;

  select entry.id, entry.approval_status
  into target_entry
  from public.time_entries as entry
  where entry.workspace_id = p_workspace_id
    and entry.id = p_time_entry_id
  for update;

  if target_entry.id is null then
    raise exception 'time entry not found in workspace'
      using errcode = 'P0002';
  end if;

  update public.time_entries
  set flagged = true,
      flag_note = trimmed_note,
      flagged_at = transaction_timestamp(),
      flagged_by_membership_id = caller_membership_id
  where workspace_id = p_workspace_id
    and id = p_time_entry_id;

  insert into public.time_entry_events (
    workspace_id, time_entry_id, actor_membership_id, event_type,
    resulting_approval_status, reason
  )
  values (
    p_workspace_id, p_time_entry_id, caller_membership_id, 'flagged',
    target_entry.approval_status, trimmed_note
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entry.flagged',
    'time_entry',
    p_time_entry_id,
    jsonb_build_object('flag_note', trimmed_note)
  );

  return true;
end;
$$;

revoke all on function public.rpc_flag_time_entry(uuid, uuid, text) from public, anon;
grant execute on function public.rpc_flag_time_entry(uuid, uuid, text) to authenticated;

comment on function public.rpc_flag_time_entry(uuid, uuid, text) is
  'Manager-only flag for review. Requires a short note, leaves clock data and approval status untouched, does not notify staff.';

create or replace function public.rpc_unflag_time_entry(
  p_workspace_id uuid,
  p_time_entry_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  target_entry record;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select entry.id, entry.approval_status
  into target_entry
  from public.time_entries as entry
  where entry.workspace_id = p_workspace_id
    and entry.id = p_time_entry_id
  for update;

  if target_entry.id is null then
    raise exception 'time entry not found in workspace'
      using errcode = 'P0002';
  end if;

  update public.time_entries
  set flagged = false,
      flag_note = null,
      flagged_at = null,
      flagged_by_membership_id = null
  where workspace_id = p_workspace_id
    and id = p_time_entry_id;

  insert into public.time_entry_events (
    workspace_id, time_entry_id, actor_membership_id, event_type,
    resulting_approval_status, reason
  )
  values (
    p_workspace_id, p_time_entry_id, caller_membership_id, 'unflagged',
    target_entry.approval_status, null
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entry.unflagged',
    'time_entry',
    p_time_entry_id,
    '{}'::jsonb
  );

  return true;
end;
$$;

revoke all on function public.rpc_unflag_time_entry(uuid, uuid) from public, anon;
grant execute on function public.rpc_unflag_time_entry(uuid, uuid) to authenticated;

comment on function public.rpc_unflag_time_entry(uuid, uuid) is
  'Manager-only clear of a review flag. Appends an unflagged audit event.';

-- ---------------------------------------------------------------------------
-- 7. Update rpc_batch_approve_time_entries: require reason on rejected + notify staff.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_batch_approve_time_entries(
  p_workspace_id uuid,
  p_time_entry_ids uuid[],
  p_approval_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  batch_id uuid := gen_random_uuid();
  unique_entry_ids uuid[];
  locked_entry_count integer;
  processed_count integer := 0;
  skipped_count integer := 0;
  trimmed_reason text;
  entry_event_type text;
  target_entry record;
  target_staff_membership_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_approval_status is null
     or p_approval_status not in ('approved', 'rejected', 'pending') then
    raise exception 'approval status must be approved, rejected, or pending (reopen)'
      using errcode = '22023';
  end if;

  if p_time_entry_ids is null
     or cardinality(p_time_entry_ids) = 0
     or exists (
       select 1 from unnest(p_time_entry_ids) as entry_id where entry_id is null
     ) then
    raise exception 'at least one non-null time entry id is required'
      using errcode = '22023';
  end if;

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if trimmed_reason is not null and length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  -- Rejection requires a non-null, non-empty reason (§17.3).
  if p_approval_status = 'rejected' and trimmed_reason is null then
    raise exception 'rejection reason is required when returning time for correction'
      using errcode = '22023';
  end if;

  select array_agg(distinct entry_id order by entry_id)
  into unique_entry_ids
  from unnest(p_time_entry_ids) as entry_id;

  -- Lock all targets in stable order; the whole batch is all-or-nothing.
  select count(*)
  into locked_entry_count
  from (
    select entry.id
    from public.time_entries as entry
    where entry.workspace_id = p_workspace_id
      and entry.id = any(unique_entry_ids)
    order by entry.id
    for update
  ) as locked_entries;

  if locked_entry_count <> cardinality(unique_entry_ids) then
    raise exception 'one or more time entries were not found in workspace'
      using errcode = 'P0002';
  end if;

  entry_event_type := case p_approval_status
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    else 'reopened'
  end;

  for target_entry in
    select entry.id, entry.staff_member_id, entry.approval_status, entry.clocked_in_at,
           entry.clocked_out_at, entry.break_minutes, entry.shift_id, entry.work_date
    from public.time_entries as entry
    where entry.workspace_id = p_workspace_id
      and entry.id = any(unique_entry_ids)
    order by entry.id
  loop
    if target_entry.approval_status = p_approval_status then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    if p_approval_status = 'approved' then
      -- Approval preflight: an approved entry is a validated, complete
      -- record — the exported hours are derived from exactly these fields.
      if target_entry.clocked_in_at is null or target_entry.clocked_out_at is null then
        raise exception
          'entry on % cannot be approved: clock-in and clock-out must both be recorded first',
          target_entry.work_date
          using errcode = '55000';
      end if;
      if target_entry.break_minutes >
         floor(extract(epoch from (target_entry.clocked_out_at - target_entry.clocked_in_at)) / 60) then
        raise exception
          'entry on % cannot be approved: the break exceeds the worked duration',
          target_entry.work_date
          using errcode = '55000';
      end if;
      -- Unscheduled attendance (no linked shift) needs an explicit recorded
      -- resolution before it becomes payable time.
      if target_entry.shift_id is null and trimmed_reason is null then
        raise exception
          'entry on % is unscheduled attendance: add a reason recording how it was resolved before approving',
          target_entry.work_date
          using errcode = '55000';
      end if;

      update public.time_entries
      set approval_status = 'approved',
          return_note = null,
          approved_at = transaction_timestamp(),
          approved_by_membership_id = caller_membership_id
      where workspace_id = p_workspace_id
        and id = target_entry.id;
    elsif p_approval_status = 'rejected' then
      update public.time_entries
      set approval_status = 'rejected',
          return_note = trimmed_reason,
          approved_at = null,
          approved_by_membership_id = null
      where workspace_id = p_workspace_id
        and id = target_entry.id;

      -- Notify staff member of return for correction (§8.7, §13.3)
      select sm.membership_id
      into target_staff_membership_id
      from public.staff_members as sm
      where sm.workspace_id = p_workspace_id
        and sm.id = target_entry.staff_member_id;

      if target_staff_membership_id is not null then
        perform public.rpc_internal_notify(
          p_workspace_id,
          caller_membership_id,
          'time_returned',
          'Time returned for correction',
          'Your hours recorded for ' || to_char(target_entry.work_date, 'YYYY-MM-DD') || ' were returned for correction: ' || trimmed_reason,
          'time_entry',
          target_entry.id,
          array[target_staff_membership_id]
        );
      end if;
    else
      -- p_approval_status = 'pending' (reopen)
      update public.time_entries
      set approval_status = 'pending',
          return_note = null,
          approved_at = null,
          approved_by_membership_id = null
      where workspace_id = p_workspace_id
        and id = target_entry.id;
    end if;

    insert into public.time_entry_events (
      workspace_id, time_entry_id, actor_membership_id, event_type,
      resulting_approval_status, reason
    )
    values (
      p_workspace_id, target_entry.id, caller_membership_id, entry_event_type,
      p_approval_status, trimmed_reason
    );

    processed_count := processed_count + 1;
  end loop;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entry.batch_' || entry_event_type,
    'time_entry_batch',
    batch_id,
    jsonb_build_object(
      'time_entry_ids', to_jsonb(unique_entry_ids),
      'resulting_approval_status', p_approval_status,
      'processed', processed_count,
      'skipped', skipped_count,
      'reason', trimmed_reason
    )
  );

  return jsonb_build_object(
    'batch_id', batch_id,
    'resulting_approval_status', p_approval_status,
    'processed', processed_count,
    'skipped', skipped_count
  );
end;
$$;

revoke all on function public.rpc_batch_approve_time_entries(uuid, uuid[], text, text) from public, anon;
grant execute on function public.rpc_batch_approve_time_entries(uuid, uuid[], text, text) to authenticated;

comment on function public.rpc_batch_approve_time_entries(uuid, uuid[], text, text) is
  'Manager-only atomic batch approval with preflight: approval requires complete clock bounds, a break within the worked duration, and an explicit resolution reason for unscheduled attendance. Rejection requires a reason and notifies staff.';

-- ---------------------------------------------------------------------------
-- 8. RPC: rpc_staff_raise_hours_query.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_staff_raise_hours_query(
  p_workspace_id uuid,
  p_time_entry_id uuid,
  p_issue_type text,
  p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  caller_staff_id uuid;
  staff_name text;
  trimmed_note text;
  target_entry record;
  new_query_id uuid;
  manager_membership_ids uuid[];
begin
  caller_membership_id := public.current_workspace_membership_id(p_workspace_id);
  caller_staff_id := public.current_staff_member_id(p_workspace_id);

  if caller_membership_id is null or caller_staff_id is null then
    raise exception 'caller is not an active staff member in workspace'
      using errcode = '42501';
  end if;

  if p_issue_type is null
     or p_issue_type not in ('missing_clock_out', 'incorrect_times', 'incorrect_break', 'missing_shift', 'other') then
    raise exception 'issue type must be one of: missing_clock_out, incorrect_times, incorrect_break, missing_shift, other'
      using errcode = '22023';
  end if;

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is null or length(trimmed_note) > 2000 then
    raise exception 'query note is required and must be at most 2000 characters'
      using errcode = '22023';
  end if;

  select entry.id, entry.staff_member_id, entry.work_date, entry.approval_status
  into target_entry
  from public.time_entries as entry
  where entry.workspace_id = p_workspace_id
    and entry.id = p_time_entry_id;

  if target_entry.id is null then
    raise exception 'time entry not found in workspace'
      using errcode = 'P0002';
  end if;

  if target_entry.staff_member_id <> caller_staff_id then
    raise exception 'cannot raise a query against another staff member''s time entry'
      using errcode = '42501';
  end if;

  insert into public.time_hours_queries (
    workspace_id, time_entry_id, staff_member_id, issue_type, note, status
  )
  values (
    p_workspace_id, p_time_entry_id, caller_staff_id, p_issue_type, trimmed_note, 'pending'
  )
  returning id into new_query_id;

  insert into public.time_entry_events (
    workspace_id, time_entry_id, actor_membership_id, event_type,
    resulting_approval_status, reason
  )
  values (
    p_workspace_id, p_time_entry_id, caller_membership_id, 'query_raised',
    target_entry.approval_status, trimmed_note
  );

  select display_name into staff_name
  from public.staff_members
  where id = caller_staff_id;

  select coalesce(array_agg(m.id), array[]::uuid[])
  into manager_membership_ids
  from public.workspace_memberships as m
  where m.workspace_id = p_workspace_id
    and m.role in ('owner', 'manager')
    and m.status = 'active';

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'time_query_raised',
    'Hours query raised',
    coalesce(staff_name, 'A team member') || ' queried recorded hours for ' || to_char(target_entry.work_date, 'YYYY-MM-DD') || ': ' || trimmed_note,
    'time_hours_query',
    new_query_id,
    manager_membership_ids
  );

  return new_query_id;
end;
$$;

revoke all on function public.rpc_staff_raise_hours_query(uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_staff_raise_hours_query(uuid, uuid, text, text) to authenticated;

comment on function public.rpc_staff_raise_hours_query(uuid, uuid, text, text) is
  'Staff raises a structured query on their own time entry. Records query_raised event and notifies active managers.';

-- ---------------------------------------------------------------------------
-- 9. RPC: rpc_resolve_hours_query.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_resolve_hours_query(
  p_workspace_id uuid,
  p_query_id uuid,
  p_status text,
  p_resolution_note text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  trimmed_res_note text;
  target_query record;
  target_staff_membership_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_status is null or p_status not in ('resolved', 'dismissed') then
    raise exception 'status must be resolved or dismissed'
      using errcode = '22023';
  end if;

  trimmed_res_note := nullif(btrim(coalesce(p_resolution_note, '')), '');
  if trimmed_res_note is not null and length(trimmed_res_note) > 2000 then
    raise exception 'resolution note must be at most 2000 characters'
      using errcode = '22023';
  end if;

  select q.id, q.time_entry_id, q.staff_member_id, q.status, e.work_date, e.approval_status
  into target_query
  from public.time_hours_queries as q
  join public.time_entries as e
    on e.workspace_id = q.workspace_id and e.id = q.time_entry_id
  where q.workspace_id = p_workspace_id
    and q.id = p_query_id
  for update;

  if target_query.id is null then
    raise exception 'hours query not found in workspace'
      using errcode = 'P0002';
  end if;

  update public.time_hours_queries
  set status = p_status,
      resolution_note = trimmed_res_note,
      resolved_by_membership_id = caller_membership_id,
      resolved_at = transaction_timestamp()
  where workspace_id = p_workspace_id
    and id = p_query_id;

  insert into public.time_entry_events (
    workspace_id, time_entry_id, actor_membership_id, event_type,
    resulting_approval_status, reason
  )
  values (
    p_workspace_id, target_query.time_entry_id, caller_membership_id, 'query_resolved',
    target_query.approval_status, coalesce(trimmed_res_note, 'Query ' || p_status)
  );

  select sm.membership_id
  into target_staff_membership_id
  from public.staff_members as sm
  where sm.workspace_id = p_workspace_id
    and sm.id = target_query.staff_member_id;

  if target_staff_membership_id is not null then
    perform public.rpc_internal_notify(
      p_workspace_id,
      caller_membership_id,
      'time_query_resolved',
      case when p_status = 'resolved' then 'Hours query resolved' else 'Hours query dismissed' end,
      case
        when trimmed_res_note is not null
          then 'Your hours query for ' || to_char(target_query.work_date, 'YYYY-MM-DD') || ' was marked as ' || p_status || ': ' || trimmed_res_note
        else 'Your hours query for ' || to_char(target_query.work_date, 'YYYY-MM-DD') || ' was marked as ' || p_status
      end,
      'time_hours_query',
      p_query_id,
      array[target_staff_membership_id]
    );
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_query.' || p_status,
    'time_hours_query',
    p_query_id,
    jsonb_build_object('status', p_status, 'resolution_note', trimmed_res_note)
  );

  return true;
end;
$$;

revoke all on function public.rpc_resolve_hours_query(uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_resolve_hours_query(uuid, uuid, text, text) to authenticated;

comment on function public.rpc_resolve_hours_query(uuid, uuid, text, text) is
  'Manager resolves or dismisses a staff hours query, records audit event, and notifies staff member.';
