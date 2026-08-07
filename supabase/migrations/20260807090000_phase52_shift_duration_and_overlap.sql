-- Phase 52: the 16-hour shift ceiling becomes a database invariant, and
-- overlapping assigned shifts join the existing acknowledgeable publish clashes.
--
-- Confirmed defects this corrects (Phase 52 audit, 2026-08-07):
--
--   1. The 16-hour maximum shift duration was enforced in exactly two places —
--      `buildShiftDateTimeRange` in TypeScript (covering the inline grid) and
--      `rpc_internal_assert_import_shift_lengths` (covering schedule import).
--      It was NOT enforced by `public.shifts`, and NOT by
--      `rpc_apply_build_week_proposal`, whose own per-operation validation is
--      the documented safety boundary for a proposal whose digest is
--      deliberately not tamper-resistant. Because `getSupabaseServerClient()`
--      is built with the anon key plus the caller's cookies, every server
--      function writes as role `authenticated` under
--      `grant select, insert, update, delete on public.shifts to authenticated`,
--      so any manager could persist a shift of any length straight through
--      PostgREST. A 20-hour and a 47-hour shift were both inserted successfully
--      during the audit. Copy-day, copy-week and demand templates then replay
--      stored times verbatim, so one such row would be amplified forever with
--      no path that would ever reject it.
--
--   2. Assigning one staff member two overlapping shifts was refused outright
--      by `rpc_apply_build_week_proposal` ('would be working two shifts at
--      once') and by `rpc_select_open_shift_applicant` ('the applicant already
--      has an overlapping shift'), but the inline grid neither blocked nor
--      warned server-side. Overlap was detected only in the frontend
--      (`localConflicts.ts`), was absent from `getRotaPublishEligibility`, and
--      was not one of the three clash kinds `rpc_publish_rota_week` derives —
--      so a double-booked week published cleanly and reached staff in the
--      snapshot. The product treats the state as invalid in two of three
--      assignment paths; publication is where that judgement was missing.
--
-- Correction: the database becomes the final authority for duration, and
-- overlap becomes a fourth acknowledgeable clash rather than a hard block.
-- Drafting an overlap stays deliberately legal — managers routinely pass
-- through overlapping states mid-edit, and the manager remains the authority.
-- What changes is that publication now makes them say so explicitly, exactly
-- as it already does for approved leave, recurring days off and one-off
-- unavailability.
--
-- Both changes ship in one migration because they are one product decision
-- ("make the scheduling invariants authoritative at the boundary that binds
-- every path") and because the overlap change is only safe alongside the
-- frontend mirror update in the same commit. See the CONTRACT note below.

-- ---------------------------------------------------------------------------
-- 1. Duration ceiling
-- ---------------------------------------------------------------------------

-- Deliberately narrow: this guard knows one rule and reads no other table, so
-- it adds no lock, no dependency and no failure mode of its own.
--
-- Zero-length and reversed shifts are NOT this function's business — the table
-- has enforced `check (ends_at > starts_at)` since the original scheduling
-- migration, and duplicating it here would produce two different messages for
-- one condition.
--
-- Overnight shifts need no special handling: `starts_at` and `ends_at` are
-- timestamptz, so a shift crossing midnight has a real interval and the
-- subtraction is already correct. This is the same reason the overlap rule
-- below needs no date arithmetic.
--
-- The trigger fires on UPDATE as well as INSERT, and deliberately does not
-- restrict itself to time-column changes: a row that is already over the
-- ceiling must not be editable into permanence by touching some other column.
-- The local audit found zero such rows and hosted currently has zero shifts,
-- so no grandfather clause is warranted.
create or replace function public.guard_shift_duration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ends_at - new.starts_at > interval '16 hours' then
    raise exception 'Shift duration cannot exceed 16 hours.' using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_shift_duration() from public, anon, authenticated;

-- `10` places this after the phase 40 week lock (`00`) and before every
-- unprefixed BEFORE trigger on the table, so an over-long shift is refused
-- before the staff-eligibility locks are acquired rather than after.
drop trigger if exists shifts_10_guard_duration on public.shifts;
create trigger shifts_10_guard_duration
before insert or update on public.shifts
for each row execute function public.guard_shift_duration();

comment on function public.guard_shift_duration() is
  'Authoritative 16-hour shift ceiling. Binds every writer of public.shifts — inline server functions, Build the Week, schedule import, copy/template RPCs and direct authenticated table writes alike. The TypeScript and import guards are kept as earlier, friendlier feedback, not as the boundary.';

-- ---------------------------------------------------------------------------
-- 2. Overlapping assigned shifts become an acknowledgeable publish clash
-- ---------------------------------------------------------------------------

-- CONTRACT — READ BEFORE CHANGING THE CLASH SET.
--
-- The acknowledgement is a mirror implementation, not a payload the client
-- reads back. `publishLiveRotaWeekFn` rethrows this function's refusal through
-- `toSafeBusinessMessage`, which discards the PostgrestError `detail` carrying
-- `scheduling_constraint_clashes`. The frontend therefore decides
-- independently whether acknowledgement is needed, in
-- `publishConstraintAcknowledgement.ts`, and only sends
-- `p_acknowledge_constraints := true` when its own count is non-zero.
--
-- Consequence: ANY kind added to `clashes` below MUST also be represented in
-- that frontend count in the same commit. A kind that only this function knows
-- about refuses publication that the dialog can never acknowledge, hard-blocking
-- the manager with no override path — strictly worse than the defect it set out
-- to fix. Phase 52 adds `overlapping_shift` here and `conflictCount` there
-- together for exactly this reason.
--
-- OVERLAP DEFINITION. Reused verbatim from the two existing authorities —
-- `rpc_internal_validate_assignment` (phase 48) and
-- `rpc_select_open_shift_applicant` (phase 33):
--
--     a.starts_at < b.ends_at and b.starts_at < a.ends_at
--
-- Half-open intervals on timestamptz, so shifts that merely touch (one ends
-- exactly as the next begins) do not overlap, and a shift crossing midnight is
-- compared correctly against the following day without any date arithmetic.
-- No new definition is invented here.
--
-- Open shifts cannot match: the table's coherence CHECK makes
-- `staff_member_id` null for every `assignment_status = 'open'` row, so the
-- `other.staff_member_id = shift.staff_member_id` join can only ever pair two
-- assigned shifts. Different staff members cannot match for the same reason.
--
-- SCOPE. The two authorities above are workspace-scoped because they run at
-- assignment time, when the whole calendar is the relevant context. This one is
-- scoped to the week being published, matching the frontend's own conflict
-- derivation (`useRotaWeekDerivedData` only ever holds one week). That keeps
-- the mirror exact and makes the hard-block described above impossible. The
-- residual case — an overnight shift in the adjacent week overlapping this
-- one — is still refused at creation time by both authorities above, which is
-- where a workspace-wide view actually exists.
--
-- COUNTING. One row per AFFECTED SHIFT, never one per overlapping pair. A shift
-- overlapping two others is still one shift the manager must look at, and this
-- is what keeps the count identical to the frontend's `localConflictShiftIds`
-- set, which is a set of shift ids. The UI copy says "shifts" accordingly.

create or replace function public.rpc_publish_rota_week(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_acknowledge_constraints boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  week_status text;
  week_start_date date;
  draft_shift_count integer;
  published_shift_count integer;
  next_version integer;
  previous_snapshot_id uuid;
  new_snapshot_id uuid;
  notified_membership_count integer := 0;
  finalised_request_count integer := 0;
  finalised_release_count integer := 0;
  week_label text;
  request_row record;
  new_shift_row record;
  requested_shift_row record;
  request_staff_membership_id uuid;
  confirmed_pairs uuid[] := array[]::uuid[];  -- source_shift_ids confirmed to their applicant
  released_pairs uuid[] := array[]::uuid[];   -- source_shift_ids of completed releases
  affected_row record;
  change_parts text;
  final_request_status text;
  release_material_same boolean;
  scheduling_constraint_clashes jsonb := '[]'::jsonb;
  one_off_clash_count integer := 0;
  recurring_day_off_clash_count integer := 0;
  approved_leave_clash_count integer := 0;
  overlapping_shift_clash_count integer := 0;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select rota_week.status, rota_week.week_start
  into week_status, week_start_date
  from public.rota_weeks as rota_week
  where rota_week.workspace_id = p_workspace_id
    and rota_week.id = p_rota_week_id
  for update;

  if week_status is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;

  if week_status = 'archived' then
    raise exception 'an archived rota week cannot be published' using errcode = '55000';
  end if;

  -- Freeze the complete publication input set before reading counts,
  -- eligibility constraints, or material shift facts.
  perform public.rpc_internal_lock_rota_publication_inputs(
    p_workspace_id,
    p_rota_week_id
  );

  select count(*)
  into draft_shift_count
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id;

  if draft_shift_count = 0 then
    raise exception 'cannot publish a rota week with no shifts' using errcode = '55000';
  end if;

  with assigned_shift_dates as (
    select distinct
      shift.id as shift_id,
      shift.staff_member_id,
      local_date.constraint_date
    from public.shifts as shift
    join public.locations as location
      on location.workspace_id = shift.workspace_id
     and location.id = shift.location_id
    join public.workspaces as workspace on workspace.id = shift.workspace_id
    cross join lateral (
      select distinct candidate.constraint_date
      from (values
        (shift.shift_date),
        (((shift.ends_at - interval '1 second') at time zone
          coalesce(location.timezone, workspace.timezone, 'UTC'))::date)
      ) as candidate(constraint_date)
    ) as local_date
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = p_rota_week_id
      and shift.staff_member_id is not null
      and shift.assignment_status = 'scheduled'
  ), overlapping_assignments as (
    -- distinct collapses a shift that overlaps several others into the single
    -- row this clash set is defined in terms of. See COUNTING above.
    select distinct
      shift.id as shift_id,
      shift.staff_member_id,
      shift.shift_date as constraint_date
    from public.shifts as shift
    join public.shifts as other
      on other.workspace_id = shift.workspace_id
     and other.rota_week_id = shift.rota_week_id
     and other.staff_member_id = shift.staff_member_id
     and other.id <> shift.id
     and shift.starts_at < other.ends_at
     and other.starts_at < shift.ends_at
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = p_rota_week_id
      and shift.staff_member_id is not null
      and shift.assignment_status = 'scheduled'
  ), clashes as (
    select assigned.shift_id, assigned.staff_member_id,
           assigned.constraint_date, 'one_off_unavailability'::text as kind
    from assigned_shift_dates as assigned
    join public.staff_one_off_unavailability_requests as unavailable
      on unavailable.workspace_id = p_workspace_id
     and unavailable.staff_member_id = assigned.staff_member_id
     and unavailable.date = assigned.constraint_date
     and unavailable.status = 'approved'
    union all
    select assigned.shift_id, assigned.staff_member_id,
           assigned.constraint_date, 'recurring_day_off'::text as kind
    from assigned_shift_dates as assigned
    join public.staff_recurring_day_off_requests as day_off
      on day_off.workspace_id = p_workspace_id
     and day_off.staff_member_id = assigned.staff_member_id
     and day_off.weekday = extract(isodow from assigned.constraint_date)::smallint - 1
     and day_off.status = 'approved'
    union all
    select assigned.shift_id, assigned.staff_member_id,
           assigned.constraint_date, 'approved_leave'::text as kind
    from assigned_shift_dates as assigned
    join public.leave_requests as leave_request
      on leave_request.workspace_id = p_workspace_id
     and leave_request.staff_member_id = assigned.staff_member_id
     and assigned.constraint_date >= leave_request.start_date
     and assigned.constraint_date <= leave_request.end_date
     and leave_request.status = 'approved'
    union all
    select overlapping.shift_id, overlapping.staff_member_id,
           overlapping.constraint_date, 'overlapping_shift'::text as kind
    from overlapping_assignments as overlapping
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'kind', clashes.kind,
          'shift_id', clashes.shift_id,
          'staff_member_id', clashes.staff_member_id,
          'date', clashes.constraint_date
        )
        order by clashes.kind, clashes.shift_id, clashes.constraint_date
      ),
      '[]'::jsonb
    ),
    count(*) filter (where clashes.kind = 'one_off_unavailability')::integer,
    count(*) filter (where clashes.kind = 'recurring_day_off')::integer,
    count(*) filter (where clashes.kind = 'approved_leave')::integer,
    count(*) filter (where clashes.kind = 'overlapping_shift')::integer
  into scheduling_constraint_clashes, one_off_clash_count,
       recurring_day_off_clash_count, approved_leave_clash_count,
       overlapping_shift_clash_count
  from clashes;

  if jsonb_array_length(scheduling_constraint_clashes) > 0
     and not coalesce(p_acknowledge_constraints, false) then
    raise exception
      'approved scheduling constraints clash with assigned shifts; acknowledge the warning before publishing'
      using errcode = '55000',
            detail = scheduling_constraint_clashes::text;
  end if;

  update public.rota_weeks
  set status = 'published'
  where workspace_id = p_workspace_id
    and id = p_rota_week_id
    and status <> 'published';

  select coalesce(max(snapshot.version), 0) + 1
  into next_version
  from public.published_rota_snapshots as snapshot
  where snapshot.workspace_id = p_workspace_id
    and snapshot.rota_week_id = p_rota_week_id;

  if next_version > 1 then
    select snapshot.id into previous_snapshot_id
    from public.published_rota_snapshots as snapshot
    where snapshot.workspace_id = p_workspace_id
      and snapshot.rota_week_id = p_rota_week_id
      and snapshot.version = next_version - 1;
  end if;

  insert into public.published_rota_snapshots (
    workspace_id, rota_week_id, version, published_at,
    published_by_membership_id, created_at
  )
  values (
    p_workspace_id, p_rota_week_id, next_version, transaction_timestamp(),
    caller_membership_id, transaction_timestamp()
  )
  returning id into new_snapshot_id;

  insert into public.published_rota_shifts (
    workspace_id, snapshot_id, source_shift_id, location_id, department_id,
    staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name,
    assignment_status, created_at
  )
  select
    shift.workspace_id, new_snapshot_id, shift.id, shift.location_id,
    shift.department_id, shift.staff_member_id, shift.shift_date,
    shift.starts_at, shift.ends_at, shift.break_minutes, shift.role_name,
    shift.assignment_status, transaction_timestamp()
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id;

  get diagnostics published_shift_count = row_count;

  if published_shift_count = 0 then
    raise exception 'cannot publish a rota week with no shifts' using errcode = '55000';
  end if;

  week_label := format(
    '%s to %s',
    to_char(week_start_date, 'DD Mon'),
    to_char(week_start_date + 6, 'DD Mon YYYY')
  );

  for request_row in
    select request.id, request.status, request.staff_member_id,
           request.source_shift_id, request.published_shift_id
    from public.open_shift_requests as request
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status in ('pending', 'selected')
    order by request.id
    for update
  loop
    select shift.id, shift.staff_member_id, shift.assignment_status,
           shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into new_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.snapshot_id = new_snapshot_id
      and shift.source_shift_id = request_row.source_shift_id;

    select shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into requested_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.id = request_row.published_shift_id;

    select staff.membership_id into request_staff_membership_id
    from public.staff_members as staff
    join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
     and membership.status = 'active'
    where staff.workspace_id = p_workspace_id
      and staff.id = request_row.staff_member_id
      and staff.employment_status = 'active';

    if new_shift_row.id is not null
       and new_shift_row.staff_member_id = request_row.staff_member_id
       and new_shift_row.shift_date = requested_shift_row.shift_date
       and new_shift_row.starts_at = requested_shift_row.starts_at
       and new_shift_row.ends_at = requested_shift_row.ends_at
       and new_shift_row.break_minutes = requested_shift_row.break_minutes
       and new_shift_row.role_name = requested_shift_row.role_name
       and new_shift_row.location_id = requested_shift_row.location_id
       and new_shift_row.department_id = requested_shift_row.department_id then
      update public.open_shift_requests
      set status = 'confirmed',
          decided_by_membership_id = caller_membership_id,
          decided_at = transaction_timestamp(),
          published_shift_id = new_shift_row.id
      where workspace_id = p_workspace_id and id = request_row.id;

      confirmed_pairs := confirmed_pairs || request_row.source_shift_id;
      final_request_status := 'confirmed';
      finalised_request_count := finalised_request_count + 1;

      if request_staff_membership_id is not null then
        perform public.rpc_internal_notify(
          p_workspace_id, caller_membership_id, 'open_shift_update',
          'Open shift confirmed',
          format(
            'You have the %s shift on %s — it''s on your rota.',
            new_shift_row.role_name,
            to_char(new_shift_row.shift_date, 'DD Mon YYYY')
          ),
          'open_shift_request', request_row.id,
          array[request_staff_membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    elsif new_shift_row.id is not null
          and new_shift_row.assignment_status = 'open'
          and new_shift_row.shift_date = requested_shift_row.shift_date
          and new_shift_row.starts_at = requested_shift_row.starts_at
          and new_shift_row.ends_at = requested_shift_row.ends_at
          and new_shift_row.break_minutes = requested_shift_row.break_minutes
          and new_shift_row.role_name = requested_shift_row.role_name
          and new_shift_row.location_id = requested_shift_row.location_id
          and new_shift_row.department_id = requested_shift_row.department_id then
      update public.open_shift_requests
      set status = 'pending',
          decided_by_membership_id = null,
          decided_at = null,
          decision_reason = null,
          published_shift_id = new_shift_row.id
      where workspace_id = p_workspace_id and id = request_row.id;
      final_request_status := 'pending';
    elsif new_shift_row.id is not null
          and new_shift_row.assignment_status = 'scheduled'
          and new_shift_row.shift_date = requested_shift_row.shift_date
          and new_shift_row.starts_at = requested_shift_row.starts_at
          and new_shift_row.ends_at = requested_shift_row.ends_at
          and new_shift_row.break_minutes = requested_shift_row.break_minutes
          and new_shift_row.role_name = requested_shift_row.role_name
          and new_shift_row.location_id = requested_shift_row.location_id
          and new_shift_row.department_id = requested_shift_row.department_id then
      update public.open_shift_requests
      set status = 'filled',
          decided_by_membership_id = caller_membership_id,
          decided_at = transaction_timestamp()
      where workspace_id = p_workspace_id and id = request_row.id;

      finalised_request_count := finalised_request_count + 1;
      final_request_status := 'filled';

      if request_staff_membership_id is not null then
        perform public.rpc_internal_notify(
          p_workspace_id, caller_membership_id, 'open_shift_update',
          'Open shift filled',
          format(
            'The %s shift on %s has been filled.',
            requested_shift_row.role_name,
            to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
          ),
          'open_shift_request', request_row.id,
          array[request_staff_membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    else
      update public.open_shift_requests
      set status = 'stale',
          decided_by_membership_id = caller_membership_id,
          decided_at = transaction_timestamp()
      where workspace_id = p_workspace_id and id = request_row.id;

      finalised_request_count := finalised_request_count + 1;
      final_request_status := 'stale';

      if request_staff_membership_id is not null then
        perform public.rpc_internal_notify(
          p_workspace_id, caller_membership_id, 'open_shift_update',
          'Open shift no longer available',
          format(
            'The %s shift on %s you requested changed or was removed when the rota was updated.',
            requested_shift_row.role_name,
            to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
          ),
          'open_shift_request', request_row.id,
          array[request_staff_membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    end if;

    perform public.rpc_internal_write_audit(
      p_workspace_id,
      caller_membership_id,
      'open_shift.publish_finalised',
      'open_shift_request',
      request_row.id,
      jsonb_build_object(
        'previous_status', request_row.status,
        'status', final_request_status,
        'published_snapshot_id', new_snapshot_id,
        'published_shift_id', new_shift_row.id
      )
    );
  end loop;

  for request_row in
    select request.id, request.status, request.staff_member_id,
           request.source_shift_id, request.published_shift_id
    from public.shift_release_requests as request
    where request.workspace_id = p_workspace_id
      and request.rota_week_id = p_rota_week_id
      and request.status in ('pending', 'approved')
    order by request.id
    for update
  loop
    select shift.id, shift.staff_member_id, shift.assignment_status,
           shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into new_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.snapshot_id = new_snapshot_id
      and shift.source_shift_id = request_row.source_shift_id;

    select shift.shift_date, shift.starts_at, shift.ends_at, shift.break_minutes,
           shift.role_name, shift.location_id, shift.department_id
    into requested_shift_row
    from public.published_rota_shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.id = request_row.published_shift_id;

    select staff.membership_id into request_staff_membership_id
    from public.staff_members as staff
    join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
     and membership.status = 'active'
    where staff.workspace_id = p_workspace_id
      and staff.id = request_row.staff_member_id
      and staff.employment_status = 'active';

    release_material_same :=
      new_shift_row.id is not null
      and new_shift_row.shift_date is not distinct from requested_shift_row.shift_date
      and new_shift_row.starts_at is not distinct from requested_shift_row.starts_at
      and new_shift_row.ends_at is not distinct from requested_shift_row.ends_at
      and new_shift_row.break_minutes is not distinct from requested_shift_row.break_minutes
      and new_shift_row.role_name is not distinct from requested_shift_row.role_name
      and new_shift_row.location_id is not distinct from requested_shift_row.location_id
      and new_shift_row.department_id is not distinct from requested_shift_row.department_id;

    if request_row.status = 'approved' then
      if not release_material_same then
        update public.shift_release_requests
        set status = 'stale'
        where workspace_id = p_workspace_id and id = request_row.id;

        final_request_status := 'stale';
        finalised_release_count := finalised_release_count + 1;

        if request_staff_membership_id is not null then
          perform public.rpc_internal_notify(
            p_workspace_id, caller_membership_id, 'shift_release_update',
            'Release request no longer applies',
            format(
              'The %s shift on %s changed or was removed when the rota was updated, so your release request is stale.',
              requested_shift_row.role_name,
              to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
            ),
            'shift_release_request', request_row.id,
            array[request_staff_membership_id]
          );
          notified_membership_count := notified_membership_count + 1;
        end if;
      elsif new_shift_row.staff_member_id is distinct from request_row.staff_member_id then
        update public.shift_release_requests
        set status = 'completed',
            published_shift_id = new_shift_row.id
        where workspace_id = p_workspace_id and id = request_row.id;

        released_pairs := released_pairs || request_row.source_shift_id;
        final_request_status := 'completed';
        finalised_release_count := finalised_release_count + 1;

        if request_staff_membership_id is not null then
          perform public.rpc_internal_notify(
            p_workspace_id, caller_membership_id, 'shift_release_update',
            'Release complete',
            format(
              'You''re no longer scheduled for the %s shift on %s.',
              requested_shift_row.role_name,
              to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
            ),
            'shift_release_request', request_row.id,
            array[request_staff_membership_id]
          );
          notified_membership_count := notified_membership_count + 1;
        end if;
      else
        update public.shift_release_requests
        set published_shift_id = new_shift_row.id
        where workspace_id = p_workspace_id and id = request_row.id;

        final_request_status := 'approved';
      end if;
    else
      if release_material_same
         and new_shift_row.staff_member_id = request_row.staff_member_id
         and new_shift_row.assignment_status = 'scheduled'
      then
        update public.shift_release_requests
        set published_shift_id = new_shift_row.id
        where workspace_id = p_workspace_id and id = request_row.id;
        final_request_status := 'pending';
      else
        update public.shift_release_requests
        set status = 'stale',
            decided_by_membership_id = caller_membership_id,
            decided_at = transaction_timestamp()
        where workspace_id = p_workspace_id and id = request_row.id;

        final_request_status := 'stale';
        finalised_release_count := finalised_release_count + 1;

        if request_staff_membership_id is not null then
          perform public.rpc_internal_notify(
            p_workspace_id, caller_membership_id, 'shift_release_update',
            'Release request no longer applies',
            format(
              'The %s shift on %s changed when the rota was updated, so your release request was closed.',
              requested_shift_row.role_name,
              to_char(requested_shift_row.shift_date, 'DD Mon YYYY')
            ),
            'shift_release_request', request_row.id,
            array[request_staff_membership_id]
          );
          notified_membership_count := notified_membership_count + 1;
        end if;
      end if;
    end if;

    if final_request_status <> 'pending' or request_row.status <> 'pending' then
      perform public.rpc_internal_write_audit(
        p_workspace_id,
        caller_membership_id,
        'shift_release.publish_finalised',
        'shift_release_request',
        request_row.id,
        jsonb_build_object(
          'previous_status', request_row.status,
          'status', final_request_status,
          'published_snapshot_id', new_snapshot_id,
          'published_shift_id', new_shift_row.id
        )
      );
    end if;
  end loop;

  if previous_snapshot_id is null then
    perform public.rpc_internal_notify(
      p_workspace_id,
      caller_membership_id,
      'rota_published',
      'Rota published',
      format('The rota for %s is published.', week_label),
      'published_rota_snapshot',
      new_snapshot_id,
      array(
        select membership.id
        from public.workspace_memberships as membership
        join public.staff_members as staff
          on staff.workspace_id = membership.workspace_id
         and staff.membership_id = membership.id
         and staff.employment_status = 'active'
        where membership.workspace_id = p_workspace_id
          and membership.role = 'staff'
          and membership.status = 'active'
      )
    );

    select count(*) + notified_membership_count
    into notified_membership_count
    from public.notification_deliveries as delivery
    join public.notifications as notification
      on notification.workspace_id = delivery.workspace_id
     and notification.id = delivery.notification_id
    where delivery.workspace_id = p_workspace_id
      and notification.kind = 'rota_published'
      and notification.related_entity_id = new_snapshot_id;
  else
    for affected_row in
      with old_shifts as (
        select shift.source_shift_id, shift.staff_member_id, shift.shift_date,
               shift.starts_at, shift.ends_at, shift.break_minutes,
               shift.role_name, shift.location_id, shift.department_id
        from public.published_rota_shifts as shift
        where shift.workspace_id = p_workspace_id
          and shift.snapshot_id = previous_snapshot_id
      ),
      new_shifts as (
        select shift.source_shift_id, shift.staff_member_id, shift.shift_date,
               shift.starts_at, shift.ends_at, shift.break_minutes,
               shift.role_name, shift.location_id, shift.department_id
        from public.published_rota_shifts as shift
        where shift.workspace_id = p_workspace_id
          and shift.snapshot_id = new_snapshot_id
      ),
      changes as (
        select old_shift.staff_member_id, 'removed'::text as change
        from old_shifts as old_shift
        left join new_shifts as new_shift
          on new_shift.source_shift_id = old_shift.source_shift_id
        where old_shift.staff_member_id is not null
          and (new_shift.source_shift_id is null
               or new_shift.staff_member_id is distinct from old_shift.staff_member_id)
          and not (old_shift.source_shift_id = any(released_pairs))
        union all
        select new_shift.staff_member_id, 'added'::text
        from new_shifts as new_shift
        left join old_shifts as old_shift
          on old_shift.source_shift_id = new_shift.source_shift_id
        where new_shift.staff_member_id is not null
          and (old_shift.source_shift_id is null
               or old_shift.staff_member_id is distinct from new_shift.staff_member_id)
          and not (new_shift.source_shift_id = any(confirmed_pairs))
        union all
        select new_shift.staff_member_id, 'updated'::text
        from new_shifts as new_shift
        join old_shifts as old_shift
          on old_shift.source_shift_id = new_shift.source_shift_id
        where new_shift.staff_member_id is not null
          and new_shift.staff_member_id = old_shift.staff_member_id
          and (new_shift.shift_date <> old_shift.shift_date
               or new_shift.starts_at <> old_shift.starts_at
               or new_shift.ends_at <> old_shift.ends_at
               or new_shift.break_minutes <> old_shift.break_minutes
               or new_shift.role_name <> old_shift.role_name
               or new_shift.location_id <> old_shift.location_id
               or new_shift.department_id <> old_shift.department_id)
      )
      select
        staff.id as staff_member_id,
        staff.membership_id,
        count(*) filter (where changes.change = 'added') as added_count,
        count(*) filter (where changes.change = 'removed') as removed_count,
        count(*) filter (where changes.change = 'updated') as updated_count
      from changes
      join public.staff_members as staff
        on staff.workspace_id = p_workspace_id
       and staff.id = changes.staff_member_id
       and staff.employment_status = 'active'
      join public.workspace_memberships as membership
        on membership.workspace_id = p_workspace_id
       and membership.id = staff.membership_id
       and membership.status = 'active'
      group by staff.id, staff.membership_id
    loop
      change_parts := concat_ws(
        ', ',
        case when affected_row.added_count > 0
          then affected_row.added_count || ' added' end,
        case when affected_row.removed_count > 0
          then affected_row.removed_count || ' removed' end,
        case when affected_row.updated_count > 0
          then affected_row.updated_count || ' updated' end
      );

      if change_parts is not null and change_parts <> '' then
        perform public.rpc_internal_notify(
          p_workspace_id,
          caller_membership_id,
          'shift_changed',
          'Your shifts changed',
          format('Your shifts for %s changed: %s.', week_label, change_parts),
          'published_rota_snapshot',
          new_snapshot_id,
          array[affected_row.membership_id]
        );
        notified_membership_count := notified_membership_count + 1;
      end if;
    end loop;
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'rota.published',
    'published_rota_snapshot',
    new_snapshot_id,
    jsonb_build_object(
      'rota_week_id', p_rota_week_id,
      'version', next_version,
      'shift_count', published_shift_count,
      'notified_memberships', notified_membership_count,
      'republish', previous_snapshot_id is not null,
      'finalised_requests', finalised_request_count,
      'finalised_release_requests', finalised_release_count,
      'constraint_override_acknowledged',
        coalesce(p_acknowledge_constraints, false)
        and jsonb_array_length(scheduling_constraint_clashes) > 0,
      'one_off_unavailability_clashes', one_off_clash_count,
      'recurring_day_off_clashes', recurring_day_off_clash_count,
      'approved_leave_clashes', approved_leave_clash_count,
      'overlapping_shift_clashes', overlapping_shift_clash_count,
      'scheduling_constraint_clashes', scheduling_constraint_clashes
    )
  );

  return jsonb_build_object(
    'snapshot_id', new_snapshot_id,
    'version', next_version,
    'shift_count', published_shift_count,
    'notified_memberships', notified_membership_count,
    'finalised_requests', finalised_request_count,
    'finalised_release_requests', finalised_release_count,
    'one_off_unavailability_clashes', one_off_clash_count,
    'recurring_day_off_clashes', recurring_day_off_clash_count,
    'approved_leave_clashes', approved_leave_clash_count,
    'overlapping_shift_clashes', overlapping_shift_clash_count
  );
end;
$$;

revoke all on function public.rpc_publish_rota_week(uuid, uuid, boolean) from public, anon;
grant execute on function public.rpc_publish_rota_week(uuid, uuid, boolean) to authenticated;

comment on function public.rpc_publish_rota_week(uuid, uuid, boolean) is
  'Manager-only atomic publish: locks assigned staff, derives approved one-off/recurring, leave and overlapping-shift scheduling clashes, requires explicit warning acknowledgement, then commits versioned snapshot + requests + targeted notifications + exact audit evidence atomically. Third parameter defaults false. Any clash kind added here must also be represented in the frontend acknowledgement count (publishConstraintAcknowledgement.ts) in the same commit.';

notify pgrst, 'reload schema';
