-- Phase 25: trustworthy time-entry totals.
--
-- Two defects made timesheets untrustworthy:
--   1. Staff break_start/break_end clock events were recorded but never rolled
--      into time_entries.break_minutes (default 0), so the manager "paid"
--      column, the portal totals, and rpc_export_approved_hours all subtracted
--      a break of zero. Paid hours were systematically overstated.
--   2. work_date used the database session's `current_date` (UTC), so a
--      late-evening clock-in in a westward-of-UTC venue — or an after-midnight
--      clock-in in a BST venue — landed on the wrong calendar day.
--
-- Fixes, additive only (one RPC replace + one evidence-gated backfill):
--   * rpc_staff_clock_event derives work_date from the staff member's primary
--     location timezone, falling back to the workspace timezone, then UTC.
--   * On clock_out the RPC sums the entry's completed break pairs into
--     break_minutes in the same transaction. The RPC's own state machine
--     guarantees strict start/end alternation per entry (break_start only when
--     no break is open, break_end only when one is, clock_out only when none
--     is), so pairs cannot be negative, duplicated, or overlapping.
--   * Manual authority is preserved: if the entry already carries an
--     'adjusted' time_entry_events row (a manager rewrote its clock state),
--     clock_out does NOT overwrite break_minutes.
--   * Backfill below repairs only closed entries with complete, balanced break
--     evidence that were never manually adjusted and never approved.

-- ---------------------------------------------------------------------------
-- 1. Break-pair minutes helper (shared by the RPC and the backfill).
--    Pairs the Nth break_start with the Nth break_end in time order; the clock
--    RPC's alternation rules make that pairing exact. Result is clamped to the
--    time_entries.break_minutes CHECK range (0..1440).
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_break_minutes_from_events(
  p_workspace_id uuid,
  p_time_entry_id uuid
)
returns integer
language sql
stable
set search_path = ''
as $$
  with ordered_events as (
    select
      event.event_type,
      event.occurred_at,
      lead(event.event_type) over (order by event.occurred_at, event.id) as next_event_type,
      lead(event.occurred_at) over (order by event.occurred_at, event.id) as next_occurred_at
    from public.clock_events as event
    where event.workspace_id = p_workspace_id
      and event.time_entry_id = p_time_entry_id
      and event.event_type in ('break_start', 'break_end')
  )
  select least(
    1440,
    greatest(
      0,
      floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::integer
    ),
    greatest(
      0,
      coalesce(round(sum(extract(epoch from (event.next_occurred_at - event.occurred_at))) / 60.0), 0)::integer
    )
  )
  from public.time_entries as entry
  left join ordered_events as event
    on event.event_type = 'break_start'
   and event.next_event_type = 'break_end'
   and event.next_occurred_at >= event.occurred_at
  where entry.workspace_id = p_workspace_id
    and entry.id = p_time_entry_id
  group by entry.clocked_in_at, entry.clocked_out_at;
$$;

revoke all on function public.rpc_internal_break_minutes_from_events(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. rpc_staff_clock_event — same contract and state machine as phase 5, plus
--    timezone-correct work_date and break reconciliation at clock_out.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_staff_clock_event(
  p_workspace_id uuid,
  p_event_type text,
  p_time_entry_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  own_staff_member_id uuid;
  staff_timezone text;
  target_time_entry_id uuid;
  target_clocked_in_at timestamptz;
  target_clocked_out_at timestamptz;
  open_break_count integer;
  break_sequence_valid boolean;
  reconciled_break_minutes integer;
  entry_was_adjusted boolean;
  event_time timestamptz := clock_timestamp();
  new_clock_event_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_membership(p_workspace_id);

  if public.has_workspace_role(p_workspace_id, array['owner', 'manager']) then
    raise exception 'the staff clock is for staff-role members only'
      using errcode = '42501';
  end if;

  own_staff_member_id := public.current_staff_member_id(p_workspace_id);

  if own_staff_member_id is null then
    raise exception 'caller has no active staff record in this workspace'
      using errcode = '42501';
  end if;

  if p_event_type is null
     or p_event_type not in ('clock_in', 'clock_out', 'break_start', 'break_end') then
    raise exception 'event type must be clock_in, clock_out, break_start, or break_end'
      using errcode = '22023';
  end if;

  -- Serialise clock operations per staff member.
  perform 1
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id
  for update;

  if p_event_type = 'clock_in' then
    if p_time_entry_id is not null then
      raise exception 'clock_in opens a new time entry; p_time_entry_id must be null'
        using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.time_entries as entry
      where entry.workspace_id = p_workspace_id
        and entry.staff_member_id = own_staff_member_id
        and entry.clocked_in_at is not null
        and entry.clocked_out_at is null
    ) then
      raise exception 'staff member is already clocked in' using errcode = '55000';
    end if;

    -- The working day belongs to the venue the staff member works at, not to
    -- the database session timezone.
    select coalesce(location.timezone, workspace.timezone, 'UTC')
    into staff_timezone
    from public.staff_members as staff
    join public.workspaces as workspace
      on workspace.id = staff.workspace_id
    left join public.locations as location
      on location.workspace_id = staff.workspace_id
     and location.id = staff.primary_location_id
    where staff.workspace_id = p_workspace_id
      and staff.id = own_staff_member_id;

    insert into public.time_entries (
      workspace_id, staff_member_id, work_date, clocked_in_at
    )
    values (
      p_workspace_id,
      own_staff_member_id,
      (event_time at time zone staff_timezone)::date,
      event_time
    )
    returning id into target_time_entry_id;
  else
    if p_time_entry_id is not null then
      select entry.id, entry.clocked_in_at, entry.clocked_out_at
      into target_time_entry_id, target_clocked_in_at, target_clocked_out_at
      from public.time_entries as entry
      where entry.workspace_id = p_workspace_id
        and entry.id = p_time_entry_id
        and entry.staff_member_id = own_staff_member_id
      for update;

      if target_time_entry_id is null then
        raise exception 'time entry not found in workspace for this staff member'
          using errcode = 'P0002';
      end if;
    else
      select entry.id, entry.clocked_in_at, entry.clocked_out_at
      into target_time_entry_id, target_clocked_in_at, target_clocked_out_at
      from public.time_entries as entry
      where entry.workspace_id = p_workspace_id
        and entry.staff_member_id = own_staff_member_id
        and entry.clocked_in_at is not null
        and entry.clocked_out_at is null
      order by entry.clocked_in_at desc
      limit 1
      for update;

      if target_time_entry_id is null then
        raise exception 'no open time entry for this action' using errcode = '55000';
      end if;
    end if;

    if target_clocked_in_at is null then
      raise exception 'time entry has no clock-in' using errcode = '55000';
    end if;

    if target_clocked_out_at is not null then
      raise exception 'time entry is already clocked out' using errcode = '55000';
    end if;

    select
      count(*) filter (where event.event_type = 'break_start')
        - count(*) filter (where event.event_type = 'break_end'),
      coalesce(bool_and(
        (event.sequence_no % 2 = 1 and event.event_type = 'break_start')
        or (event.sequence_no % 2 = 0 and event.event_type = 'break_end')
      ), true)
    into open_break_count, break_sequence_valid
    from (
      select clock.event_type,
             row_number() over (order by clock.occurred_at, clock.id) as sequence_no
      from public.clock_events as clock
      where clock.workspace_id = p_workspace_id
        and clock.time_entry_id = target_time_entry_id
        and clock.event_type in ('break_start', 'break_end')
    ) as event;

    if not break_sequence_valid or open_break_count not between 0 and 1 then
      raise exception 'break history is inconsistent; a manager must review this entry'
        using errcode = '55000';
    end if;

    if p_event_type = 'clock_out' then
      if open_break_count > 0 then
        raise exception 'close the open break before clocking out' using errcode = '55000';
      end if;

      -- All break pairs are complete here (the guard above). Reconcile them
      -- into break_minutes unless a manager has explicitly rewritten this
      -- entry — a prior 'adjusted' event marks manual authority, and the
      -- recorded events are no longer the whole truth for it.
      select exists (
        select 1
        from public.time_entry_events as entry_event
        where entry_event.workspace_id = p_workspace_id
          and entry_event.time_entry_id = target_time_entry_id
          and entry_event.event_type = 'adjusted'
      )
      into entry_was_adjusted;

      update public.time_entries
      set clocked_out_at = event_time
      where workspace_id = p_workspace_id
        and id = target_time_entry_id;

      if not entry_was_adjusted then
        reconciled_break_minutes := public.rpc_internal_break_minutes_from_events(
          p_workspace_id, target_time_entry_id
        );
        update public.time_entries
        set break_minutes = reconciled_break_minutes
        where workspace_id = p_workspace_id
          and id = target_time_entry_id;
      end if;
    elsif p_event_type = 'break_start' then
      if open_break_count > 0 then
        raise exception 'a break is already in progress' using errcode = '55000';
      end if;
    else
      if open_break_count <= 0 then
        raise exception 'no break in progress' using errcode = '55000';
      end if;
    end if;
  end if;

  insert into public.clock_events (
    workspace_id, time_entry_id, staff_member_id, actor_membership_id,
    event_type, source, occurred_at
  )
  values (
    p_workspace_id, target_time_entry_id, own_staff_member_id,
    caller_membership_id, p_event_type, 'staff', event_time
  )
  returning id into new_clock_event_id;

  return jsonb_build_object(
    'time_entry_id', target_time_entry_id,
    'clock_event_id', new_clock_event_id,
    'event_type', p_event_type,
    'occurred_at', event_time
  );
end;
$$;

revoke all on function public.rpc_staff_clock_event(uuid, text, uuid) from public, anon;
grant execute on function public.rpc_staff_clock_event(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Evidence-gated backfill of historical break minutes.
--
-- Repairs only entries where every part of the evidence is unambiguous:
--   * the entry is closed (clocked out) — open entries reconcile at clock_out;
--   * break_minutes is still the untouched default 0;
--   * break events are balanced (every start has an end) with at least one pair;
--   * the entry has no 'created' event (manager manual entries never had
--     staff clock events) and no 'adjusted' event (manual authority wins);
--   * the entry is not approved — an approved entry's totals were reviewed as
--     they stood, and silently changing approved history would falsify what
--     the manager signed off. Those entries surface through normal review
--     (managers can reopen and adjust with a reason).
--
-- No time_entry_events row is written: time_entry_events.actor_membership_id
-- is NOT NULL and a migration has no acting membership. The clock_events rows
-- themselves remain the immutable evidence for this correction.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_can_backfill_break_minutes(
  p_workspace_id uuid,
  p_time_entry_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.time_entries as entry
    where entry.workspace_id = p_workspace_id
      and entry.id = p_time_entry_id
      and entry.clocked_in_at is not null
      and entry.clocked_out_at is not null
      and entry.break_minutes = 0
      and entry.approval_status <> 'approved'
      and not exists (
        select 1
        from public.time_entry_events as entry_event
        where entry_event.workspace_id = entry.workspace_id
          and entry_event.time_entry_id = entry.id
          and entry_event.event_type in ('created', 'adjusted')
      )
      and 1 = (
        select count(*)
        from public.clock_events as event
        where event.workspace_id = entry.workspace_id
          and event.time_entry_id = entry.id
          and event.event_type = 'clock_in'
      )
      and 1 = (
        select count(*)
        from public.clock_events as event
        where event.workspace_id = entry.workspace_id
          and event.time_entry_id = entry.id
          and event.event_type = 'clock_out'
      )
      and (
        select count(*) > 0
           and count(*) % 2 = 0
           and bool_and(event.occurred_at between entry.clocked_in_at and entry.clocked_out_at)
           and bool_and(
             (event.sequence_no % 2 = 1 and event.event_type = 'break_start')
             or (event.sequence_no % 2 = 0 and event.event_type = 'break_end')
           )
        from (
          select clock.event_type, clock.occurred_at,
                 row_number() over (order by clock.occurred_at, clock.id) as sequence_no
          from public.clock_events as clock
          where clock.workspace_id = entry.workspace_id
            and clock.time_entry_id = entry.id
            and clock.event_type in ('break_start', 'break_end')
        ) as event
      )
  );
$$;

revoke all on function public.rpc_internal_can_backfill_break_minutes(uuid, uuid)
  from public, anon, authenticated;

update public.time_entries as entry
set break_minutes = public.rpc_internal_break_minutes_from_events(entry.workspace_id, entry.id)
where public.rpc_internal_can_backfill_break_minutes(entry.workspace_id, entry.id);

comment on function public.rpc_internal_break_minutes_from_events(uuid, uuid) is
  'Sum of adjacent completed break_start→break_end durations for one time entry, capped by entry duration and 1440 minutes. Internal only.';

comment on function public.rpc_internal_can_backfill_break_minutes(uuid, uuid) is
  'True only for an unapproved, unadjusted closed staff-clock entry with one clock-in/out and strictly alternating, bounded break evidence. Internal only.';

notify pgrst, 'reload schema';
