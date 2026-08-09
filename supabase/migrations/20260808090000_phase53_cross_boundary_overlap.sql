-- Phase 53: overlapping assigned shifts stop being a within-week question.
--
-- Confirmed defect this corrects (Phase 53 audit, 2026-08-08):
--
--   Phase 52 made overlapping assigned shifts an acknowledgeable publish clash,
--   but deliberately scoped the comparison to one rota week
--   (`other.rota_week_id = shift.rota_week_id`). Its SCOPE note justified that
--   with:
--
--     "The residual case — an overnight shift in the adjacent week overlapping
--      this one — is still refused at creation time by both authorities above,
--      which is where a workspace-wide view actually exists."
--
--   That sentence is FALSE for the manual path. The two authorities named,
--   `rpc_internal_assert_build_week_assignable` (phase 48) and
--   `rpc_select_open_shift_applicant` (phase 33), are genuinely workspace-wide,
--   but neither is on the inline grid's write path: `insertShift` and
--   `buildShiftUpdate` are raw PostgREST writes to `public.shifts` with no
--   overlap predicate at all. So a manager could create
--
--     week A, Sunday 22:00 -> Monday 06:00
--     week B, Monday 05:00 -> 13:00        (same staff member)
--
--   and publish BOTH weeks cleanly. Neither week's publication could see the
--   other's shifts, the grid showed no conflict, and a physically impossible
--   schedule reached staff in the snapshot.
--
--   The same predicate hid a second case: `rota_weeks` is unique on
--   (workspace_id, location_id, week_start), so two locations in the SAME
--   calendar week are two different rota weeks. One person double-booked across
--   two locations was invisible from both sides for exactly the same reason.
--
-- Correction: the `other` side becomes workspace-wide, matching the two
-- assignment authorities that have always compared that way. A person cannot be
-- in two places at once, and neither a week boundary nor a location boundary
-- changes that.
--
-- What does NOT change: overlap remains an ACKNOWLEDGEABLE clash, never a hard
-- block. Drafting overlaps stays legal, managers keep passing through
-- overlapping states mid-edit, and publication still proceeds once the manager
-- says so explicitly. Leave, recurring day-off and one-off unavailability
-- handling is untouched.

-- ---------------------------------------------------------------------------
-- Overlapping assigned shifts, workspace-wide
-- ---------------------------------------------------------------------------

-- CONTRACT — READ BEFORE CHANGING THE CLASH SET. Unchanged from phase 52 and
-- still binding: the acknowledgement is a MIRROR IMPLEMENTATION, not a payload
-- the client reads back. `publishLiveRotaWeekFn` rethrows this function's
-- refusal through `toSafeBusinessMessage`, which discards the PostgrestError
-- `detail` carrying `scheduling_constraint_clashes`. The frontend decides
-- independently whether acknowledgement is needed, in
-- `publishConstraintAcknowledgement.ts`, and only sends
-- `p_acknowledge_constraints := true` when its own count is non-zero. A clash
-- this function knows about and that count does not refuses a publication the
-- dialog can never acknowledge — a hard block with no override path, strictly
-- worse than the defect it set out to fix.
--
-- Phase 53 keeps that mirror exact by moving the frontend's half of the
-- comparison server-side rather than by narrowing this one. `boundaryOverlaps`
-- in `api/boundaryOverlaps.ts` runs the predicate below, on the same raw
-- `timestamptz` values, over every assigned shift outside the week; the hook
-- unions its shift ids with the in-week detector's. Both sides therefore count
-- the same thing. The frontend interval engine is deliberately NOT used for
-- external partners: it compares naive local `HH:MM` in the selected location's
-- clock, which can disagree with an instant comparison across locations or a
-- DST transition.
--
-- OVERLAP DEFINITION. Reused verbatim, again:
--
--     a.starts_at < b.ends_at and b.starts_at < a.ends_at
--
-- Half-open on timestamptz, so shifts that merely touch do not overlap and a
-- shift crossing midnight — or a week boundary, or a timezone boundary — is
-- compared correctly with no date arithmetic. Instants are the whole point:
-- there is no local-date approximation anywhere in this rule.
--
-- SCOPE. `shift` (the affected side) stays pinned to `p_rota_week_id`.
-- `other` (the partner) is now bounded ONLY by workspace and staff member. It
-- may sit in another rota week, at another location, or in another department;
-- none of those make simultaneous work possible. Workspace isolation is
-- absolute and doubly stated: `other.workspace_id = shift.workspace_id` and
-- `shift.workspace_id = p_workspace_id`.
--
-- BOUNDING. `week_envelope` is the published week's own occupied interval. It
-- discards partners that cannot possibly overlap before the pairwise test runs.
-- It is a superset filter on the same axis as the comparison, so it can only
-- remove non-overlapping rows — no duration, timezone or calendar assumption
-- enters. A fixed `shift_date` band would need one and is NOT safe: `shift_date`
-- is local to each shift's own location, and two locations in one workspace can
-- differ by more than a day of UTC offset. The real bound is
-- `other.staff_member_id = shift.staff_member_id`, which uses the
-- (workspace_id, staff_member_id) prefix of `shifts_workspace_staff_date_idx`,
-- so the candidate set is one person's shifts, never the workspace's.
--
-- Open shifts still cannot match: the table's coherence CHECK makes
-- `staff_member_id` null for every `assignment_status = 'open'` row, so the
-- `other.staff_member_id = shift.staff_member_id` join can only ever pair two
-- assigned shifts. Different staff members cannot match for the same reason.
--
-- COUNTING. One row per AFFECTED SHIFT IN THE WEEK BEING PUBLISHED, never one
-- per pair and never the external half. `select distinct` on the `shift` side
-- collapses a shift overlapping several others into the one row this clash set
-- is defined in terms of. Deliberately NOT a symmetric `shift.id < other.id`
-- pair de-duplication: that would drop a boundary conflict whenever the
-- external shift's id happened to sort first, which is half of them. The
-- frontend counts the same way, and the UI copy says "shifts" accordingly.

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
  -- eligibility constraints, or material shift facts. This also takes the staff
  -- eligibility lock for every staff member assigned in this week, which is what
  -- serialises two concurrent publications of different weeks that share a
  -- person — the second re-reads the workspace-wide `other` side below only
  -- after the first has committed.
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
  ), week_envelope as (
    -- The published week's own occupied interval. See BOUNDING above.
    select min(shift.starts_at) as min_starts_at,
           max(shift.ends_at) as max_ends_at
    from public.shifts as shift
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
    cross join week_envelope as envelope
    join public.shifts as other
      on other.workspace_id = shift.workspace_id
     and other.staff_member_id = shift.staff_member_id
     and other.id <> shift.id
     -- Candidate reduction: cannot exclude a real overlap, since any shift
     -- overlapping ANY shift of this week must intersect the week's envelope.
     and other.starts_at < envelope.max_ends_at
     and other.ends_at > envelope.min_starts_at
     -- The rule itself, unchanged. No rota_week_id, location_id or
     -- department_id predicate: none of them make simultaneous work possible.
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
  'Manager-only atomic publish: locks assigned staff, derives approved one-off/recurring, leave and overlapping-shift scheduling clashes, requires explicit warning acknowledgement, then commits versioned snapshot + requests + targeted notifications + exact audit evidence atomically. Overlap authority is workspace-wide and staff-wide (phase 53): the partner shift may sit in another rota week, at another location or in another department, since none of those make simultaneous work possible; only shifts in the week being published are counted. Third parameter defaults false. Any clash kind added here must also be represented in the frontend acknowledgement count (publishConstraintAcknowledgement.ts) in the same commit.';

notify pgrst, 'reload schema';
