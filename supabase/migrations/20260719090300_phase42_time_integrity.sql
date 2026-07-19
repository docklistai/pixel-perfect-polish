-- Phase 42: time integrity — validated, transactional manager time.
--
-- 1. Database-level validity: a break can never exceed the worked duration,
--    so a negative paid duration is impossible for any writer.
-- 2. Approval completeness: an entry can only become approved with complete
--    clock-in AND clock-out bounds (enforced by trigger for every writer).
-- 3. rpc_batch_approve_time_entries recreated (same signature) with the
--    approval preflight: complete bounds, valid break, and an explicit
--    resolution reason whenever an approved entry is unscheduled attendance
--    (no linked shift).
-- 4. rpc_create_manual_time_entry: manager manual entries become one atomic
--    operation — entry plus its audit-trail `created` event — replacing the
--    application-side two-step insert.
--
-- 5. Direct authenticated table writes are removed. Manager creation,
--    correction, and approval now have exactly the transactional RPC paths
--    above; staff clocking continues through its security-definer RPC.
--
-- The approved-hours export (rpc_export_approved_hours) reads only approved
-- entries, so it now exports only rows that passed this validation.

-- ---------------------------------------------------------------------------
-- 1. Break can never exceed worked duration.
-- ---------------------------------------------------------------------------

alter table public.time_entries
  add constraint time_entries_break_within_duration_check
  check (
    clocked_in_at is null
    or clocked_out_at is null
    or break_minutes <= floor(extract(epoch from (clocked_out_at - clocked_in_at)) / 60)
  );

-- ---------------------------------------------------------------------------
-- 2. Approval requires complete clock bounds (any writer).
-- ---------------------------------------------------------------------------

create or replace function public.guard_time_entry_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.approval_status = 'approved'
     and (new.clocked_in_at is null or new.clocked_out_at is null) then
    raise exception
      'a time entry cannot be approved without both clock-in and clock-out recorded'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_time_entry_approval()
  from public, anon, authenticated;

drop trigger if exists time_entries_guard_approval on public.time_entries;
create trigger time_entries_guard_approval
before insert or update on public.time_entries
for each row execute function public.guard_time_entry_approval();

comment on function public.guard_time_entry_approval() is
  'No writer can mark a time entry approved unless both clock bounds are recorded; combined with the break-within-duration check, every approved entry has a valid, non-negative paid duration.';

-- ---------------------------------------------------------------------------
-- 3. rpc_batch_approve_time_entries — recreated with approval preflight.
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
  unique_entry_ids uuid[];
  locked_entry_count integer;
  batch_id uuid := gen_random_uuid();
  processed_count integer := 0;
  skipped_count integer := 0;
  trimmed_reason text;
  entry_event_type text;
  target_entry record;
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
    select entry.id, entry.approval_status, entry.clocked_in_at, entry.clocked_out_at,
           entry.break_minutes, entry.shift_id, entry.work_date
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
          approved_at = transaction_timestamp(),
          approved_by_membership_id = caller_membership_id
      where workspace_id = p_workspace_id
        and id = target_entry.id;
    else
      update public.time_entries
      set approval_status = p_approval_status,
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

comment on function public.rpc_batch_approve_time_entries(uuid, uuid[], text, text) is
  'Manager-only atomic batch approval with preflight: approval requires complete clock bounds, a break within the worked duration, and an explicit resolution reason for unscheduled attendance. Reject/reopen unchanged.';

-- ---------------------------------------------------------------------------
-- 4. rpc_create_manual_time_entry — atomic manual entry + created event.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_create_manual_time_entry(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_work_date date,
  p_clocked_in_at timestamptz,
  p_clocked_out_at timestamptz,
  p_break_minutes integer,
  p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  trimmed_reason text;
  new_entry_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if trimmed_reason is null then
    raise exception 'a reason is required for a manual time entry' using errcode = '22023';
  end if;
  if length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  if p_work_date is null then
    raise exception 'a work date is required' using errcode = '22023';
  end if;
  if p_clocked_in_at is null or p_clocked_out_at is null then
    raise exception 'manual entries need both clock-in and clock-out times'
      using errcode = '22023';
  end if;
  if p_clocked_out_at <= p_clocked_in_at then
    raise exception 'clock-out must be after clock-in' using errcode = '22023';
  end if;
  if p_break_minutes is null or p_break_minutes not between 0 and 1440 then
    raise exception 'break minutes must be between 0 and 1440' using errcode = '22023';
  end if;
  if p_break_minutes >
     floor(extract(epoch from (p_clocked_out_at - p_clocked_in_at)) / 60) then
    raise exception 'the break cannot exceed the worked duration' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.staff_members as staff
    where staff.workspace_id = p_workspace_id
      and staff.id = p_staff_member_id
  ) then
    raise exception 'staff member not found in workspace' using errcode = 'P0002';
  end if;

  insert into public.time_entries (
    workspace_id, staff_member_id, work_date,
    clocked_in_at, clocked_out_at, break_minutes, approval_status
  )
  values (
    p_workspace_id, p_staff_member_id, p_work_date,
    p_clocked_in_at, p_clocked_out_at, p_break_minutes, 'pending'
  )
  returning id into new_entry_id;

  insert into public.time_entry_events (
    workspace_id, time_entry_id, actor_membership_id, event_type,
    resulting_approval_status, reason
  )
  values (
    p_workspace_id, new_entry_id, caller_membership_id, 'created',
    'pending', trimmed_reason
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'time_entry.manually_created',
    'time_entry', new_entry_id,
    jsonb_build_object(
      'staff_member_id', p_staff_member_id,
      'work_date', p_work_date,
      'clocked_in_at', p_clocked_in_at,
      'clocked_out_at', p_clocked_out_at,
      'break_minutes', p_break_minutes,
      'reason', trimmed_reason
    )
  );

  return jsonb_build_object('time_entry_id', new_entry_id);
end;
$$;

revoke all on function public.rpc_create_manual_time_entry(uuid, uuid, date, timestamptz, timestamptz, integer, text) from public, anon;
grant execute on function public.rpc_create_manual_time_entry(uuid, uuid, date, timestamptz, timestamptz, integer, text) to authenticated;

comment on function public.rpc_create_manual_time_entry(uuid, uuid, date, timestamptz, timestamptz, integer, text) is
  'Manager-only atomic manual time entry: validated bounds and break, pending status, audit-trail created event and audit record in one transaction.';

-- ---------------------------------------------------------------------------
-- 5. RPC authority: authenticated callers cannot bypass audit transactions.
-- ---------------------------------------------------------------------------

revoke insert, update, delete on table public.time_entries from authenticated;
revoke insert, update, delete on table public.time_entry_events from authenticated;

comment on table public.time_entries is
  'Authoritative time records. Authenticated callers may read through RLS; all creation, correction, approval and staff clocking writes go through audited transactional RPCs.';

comment on table public.time_entry_events is
  'Immutable time approval and adjustment history. Authenticated callers may read through RLS; only transactional security-definer RPCs append events.';

notify pgrst, 'reload schema';
