-- Phase 35: conservative scheduled-versus-actual linkage at staff clock-in.
--
-- Matching authority is the latest immutable published snapshot for each rota
-- week, never the mutable draft assignment. For every candidate, its location
-- timezone supplies the local current/previous dates. A candidate is eligible
-- only when the clock instant is within four hours either side of its start,
-- still before its scheduled end, and its source draft row still exists so the
-- existing time_entries.shift_id composite FK can be stored. Exactly one
-- candidate must survive. Zero or multiple candidates deliberately produce an
-- unscheduled entry: a missed link is safer than a false schedule claim.
--
-- Split/overlapping windows therefore become unscheduled when ambiguous;
-- overnight shifts match from the previous local date; cross-location shifts
-- evaluate each venue timezone independently. A shift already linked to any
-- entry for this staff member is excluded, and the phase-25 open-entry guard
-- still rejects duplicate concurrent clock-ins under the staff row lock.
-- No clocking location is collected or implied.

-- ---------------------------------------------------------------------------
-- 1. Internal unique-candidate matcher.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_match_published_shift_for_clock(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_event_time timestamptz
)
returns table (
  shift_id uuid,
  work_date date,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_snapshots as (
    select distinct on (snapshot.rota_week_id)
      snapshot.rota_week_id,
      snapshot.id
    from public.published_rota_snapshots as snapshot
    where snapshot.workspace_id = p_workspace_id
    order by snapshot.rota_week_id, snapshot.version desc
  ), candidates as (
    select
      published.source_shift_id as shift_id,
      published.shift_date as work_date,
      published.starts_at as scheduled_start_at,
      published.ends_at as scheduled_end_at
    from latest_snapshots as latest
    join public.published_rota_shifts as published
      on published.workspace_id = p_workspace_id
     and published.snapshot_id = latest.id
    join public.shifts as source_shift
      on source_shift.workspace_id = published.workspace_id
     and source_shift.id = published.source_shift_id
    join public.locations as location
      on location.workspace_id = published.workspace_id
     and location.id = published.location_id
    join public.workspaces as workspace on workspace.id = published.workspace_id
    where published.staff_member_id = p_staff_member_id
      and published.assignment_status = 'scheduled'
      and published.shift_date in (
        (p_event_time at time zone
          coalesce(location.timezone, workspace.timezone, 'UTC'))::date,
        (p_event_time at time zone
          coalesce(location.timezone, workspace.timezone, 'UTC'))::date - 1
      )
      and p_event_time >= published.starts_at - interval '4 hours'
      and p_event_time <= published.starts_at + interval '4 hours'
      and p_event_time < published.ends_at
      and not exists (
        select 1
        from public.time_entries as existing
        where existing.workspace_id = p_workspace_id
          and existing.staff_member_id = p_staff_member_id
          and existing.shift_id = published.source_shift_id
      )
  ), unique_candidate as (
    select candidates.*, count(*) over () as candidate_count
    from candidates
  )
  select
    unique_candidate.shift_id,
    unique_candidate.work_date,
    unique_candidate.scheduled_start_at,
    unique_candidate.scheduled_end_at
  from unique_candidate
  where unique_candidate.candidate_count = 1;
$$;

revoke all on function public.rpc_internal_match_published_shift_for_clock(uuid, uuid, timestamptz)
  from public, anon, authenticated;

comment on function public.rpc_internal_match_published_shift_for_clock(uuid, uuid, timestamptz) is
  'Internal conservative matcher: latest published snapshots, per-location local current/previous date, +/-4h start window, before end, unlinked source row, and exactly one candidate. Ambiguous/no candidate returns no row.';

-- ---------------------------------------------------------------------------
-- 2. Allow immutable published assignment authority for a new time-entry link.
--    Existing links are not revalidated on ordinary clock-out/break updates.
-- ---------------------------------------------------------------------------

create or replace function public.guard_time_entry_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
  linked_shift_staff_member_id uuid;
  has_latest_published_assignment boolean := false;
begin
  if new.shift_id is not null
     and (tg_op = 'INSERT' or new.shift_id is distinct from old.shift_id) then
    select shift.staff_member_id
    into linked_shift_staff_member_id
    from public.shifts as shift
    where shift.workspace_id = new.workspace_id
      and shift.id = new.shift_id;

    select exists (
      select 1
      from public.published_rota_shifts as published
      join public.published_rota_snapshots as snapshot
        on snapshot.workspace_id = published.workspace_id
       and snapshot.id = published.snapshot_id
      where published.workspace_id = new.workspace_id
        and published.source_shift_id = new.shift_id
        and published.staff_member_id = new.staff_member_id
        and published.assignment_status = 'scheduled'
        and not exists (
          select 1
          from public.published_rota_snapshots as later
          where later.workspace_id = snapshot.workspace_id
            and later.rota_week_id = snapshot.rota_week_id
            and later.version > snapshot.version
        )
    ) into has_latest_published_assignment;

    if (linked_shift_staff_member_id is null
        or linked_shift_staff_member_id <> new.staff_member_id)
       and not has_latest_published_assignment then
      raise exception 'time entry shift must be assigned to the same staff member in the draft or latest published rota'
        using errcode = '55000';
    end if;
  end if;

  if acting_user_id is not null
     and new.approved_by_membership_id is not null
     and (tg_op = 'INSERT'
          or new.approved_by_membership_id is distinct from old.approved_by_membership_id)
     and new.approved_by_membership_id
         <> public.current_workspace_membership_id(new.workspace_id) then
    raise exception 'approved_by_membership_id must be the active membership of the approving caller'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_time_entry_write()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Staff clock state machine from phase 25, with linkage only at clock-in.
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
  candidate_shift_id uuid;
  matched_shift_id uuid;
  matched_work_date date;
  matched_scheduled_start_at timestamptz;
  matched_scheduled_end_at timestamptz;
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

  if p_event_type = 'clock_in' then
    if p_time_entry_id is not null then
      raise exception 'clock_in opens a new time entry; p_time_entry_id must be null'
        using errcode = '22023';
    end if;

    -- Discover a candidate without locks, then acquire the draft source row
    -- before the per-person authority. Release approval and publication use
    -- the same shift -> membership -> staff order, so neither can deadlock a
    -- clock-in by holding the shift while waiting for this staff row.
    select match.shift_id
    into candidate_shift_id
    from public.rpc_internal_match_published_shift_for_clock(
      p_workspace_id, own_staff_member_id, event_time
    ) as match;

    if candidate_shift_id is not null then
      select shift.id
      into candidate_shift_id
      from public.shifts as shift
      where shift.workspace_id = p_workspace_id
        and shift.id = candidate_shift_id
      for key share;
    end if;

    perform public.rpc_internal_lock_staff_eligibility(
      p_workspace_id,
      array[own_staff_member_id]
    );

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

    if candidate_shift_id is not null then
      -- Re-run only after both locks. If publication, an earlier time entry,
      -- or another material fact changed the unique answer, leave this entry
      -- unscheduled; never acquire a different shift after the staff lock.
      select match.shift_id, match.work_date,
             match.scheduled_start_at, match.scheduled_end_at
      into matched_shift_id, matched_work_date,
           matched_scheduled_start_at, matched_scheduled_end_at
      from public.rpc_internal_match_published_shift_for_clock(
        p_workspace_id, own_staff_member_id, event_time
      ) as match;

      if matched_shift_id is distinct from candidate_shift_id then
        matched_shift_id := null;
        matched_work_date := null;
        matched_scheduled_start_at := null;
        matched_scheduled_end_at := null;
      end if;
    end if;

    if matched_shift_id is null then
      select coalesce(location.timezone, workspace.timezone, 'UTC')
      into staff_timezone
      from public.staff_members as staff
      join public.workspaces as workspace on workspace.id = staff.workspace_id
      left join public.locations as location
        on location.workspace_id = staff.workspace_id
       and location.id = staff.primary_location_id
      where staff.workspace_id = p_workspace_id
        and staff.id = own_staff_member_id;
    end if;

    insert into public.time_entries (
      workspace_id, staff_member_id, shift_id, work_date,
      scheduled_start_at, scheduled_end_at, clocked_in_at
    )
    values (
      p_workspace_id,
      own_staff_member_id,
      matched_shift_id,
      coalesce(matched_work_date, (event_time at time zone staff_timezone)::date),
      matched_scheduled_start_at,
      matched_scheduled_end_at,
      event_time
    )
    returning id into target_time_entry_id;
  else
    -- Non-clock-in events do not discover a shift. They still serialise on the
    -- same membership/staff authority before touching an open time entry.
    perform public.rpc_internal_lock_staff_eligibility(
      p_workspace_id,
      array[own_staff_member_id]
    );

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

      select exists (
        select 1
        from public.time_entry_events as entry_event
        where entry_event.workspace_id = p_workspace_id
          and entry_event.time_entry_id = target_time_entry_id
          and entry_event.event_type = 'adjusted'
      ) into entry_was_adjusted;

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
    'occurred_at', event_time,
    'shift_id', matched_shift_id,
    'scheduled_start_at', matched_scheduled_start_at,
    'scheduled_end_at', matched_scheduled_end_at
  );
end;
$$;

revoke all on function public.rpc_staff_clock_event(uuid, text, uuid) from public, anon;
grant execute on function public.rpc_staff_clock_event(uuid, text, uuid) to authenticated;

comment on function public.rpc_staff_clock_event(uuid, text, uuid) is
  'Staff clock state machine. Clock-in conservatively links exactly one latest-published assigned shift using phase-35 timezone/overnight rules; ambiguity/no match stays honestly unscheduled. Records clock events only and never claims physical location.';

notify pgrst, 'reload schema';
