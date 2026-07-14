-- Phase 28: republishing tells only the people it affects, and settles the
-- week's open-shift requests.
--
-- Before this, every publish — first or fifteenth — sent "Rota published" to
-- every active staff member. Now:
--   * The FIRST publish of a week keeps that behaviour: everyone learns the
--     rota exists (kind rota_published, unchanged).
--   * A REPUBLISH diffs the new snapshot against the previous version by
--     source_shift_id and sends one aggregated shift_changed notification per
--     affected staff member (added / removed / updated shifts). Unaffected
--     staff hear nothing.
--   * Open-shift requests for the week are finalised in the same transaction:
--       selected → confirmed  when the new snapshot assigns that applicant
--                              (notified via open_shift_update; excluded from
--                              the generic "added" diff so they get one
--                              message, not two);
--       selected → pending    when the shift is published open again (the
--                              manager undid the draft assignment);
--       pending  → filled     when someone else got the shift (notified);
--       pending/selected → stale  when the shift left the snapshot or its
--                              date/time/role changed (notified);
--       pending  → pending    when the shift is republished unchanged — the
--                              request is re-pointed at the new published row
--                              so it stays actionable against the latest
--                              version.
--
-- Concurrency: unchanged from phase 5 — the rota_weeks row is locked first
-- (the phase 27 RPCs lock the same row), then requests are locked in stable
-- id order, so publish, selection, decline, and new requests serialise.

-- The publish finaliser re-points carried-forward requests at the new
-- published row; every other write path still treats the column as fixed.
drop trigger if exists open_shift_requests_protect_immutable on public.open_shift_requests;
create trigger open_shift_requests_protect_immutable
before update on public.open_shift_requests
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'source_shift_id', 'rota_week_id', 'staff_member_id', 'created_at'
);

create or replace function public.rpc_publish_rota_week(
  p_workspace_id uuid,
  p_rota_week_id uuid
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
  week_label text;
  request_row record;
  new_shift_row record;
  requested_shift_row record;
  request_staff_membership_id uuid;
  confirmed_pairs uuid[] := array[]::uuid[];  -- source_shift_ids confirmed to their applicant
  affected_row record;
  change_parts text;
  final_request_status text;
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

  select count(*)
  into draft_shift_count
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id;

  if draft_shift_count = 0 then
    raise exception 'cannot publish a rota week with no shifts' using errcode = '55000';
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

  -- -------------------------------------------------------------------------
  -- Finalise the week's open-shift requests against the new snapshot.
  -- -------------------------------------------------------------------------
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
      -- The applicant got the shift: the republish is the confirmation.
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
      -- Still open and unchanged: the request carries forward to the new
      -- version. A selection that never got republished returns to pending.
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
      -- Someone else got it.
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
      -- Removed from the rota, or its date/time/role changed: the request no
      -- longer describes what was asked for.
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

  -- -------------------------------------------------------------------------
  -- Notify. First publish: everyone. Republish: only affected staff, one
  -- aggregated message each.
  -- -------------------------------------------------------------------------
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
        -- A shift they had is gone or now belongs to someone else.
        select old_shift.staff_member_id, 'removed'::text as change
        from old_shifts as old_shift
        left join new_shifts as new_shift
          on new_shift.source_shift_id = old_shift.source_shift_id
        where old_shift.staff_member_id is not null
          and (new_shift.source_shift_id is null
               or new_shift.staff_member_id is distinct from old_shift.staff_member_id)
        union all
        -- A shift is newly theirs (confirmed open-shift wins are told separately).
        select new_shift.staff_member_id, 'added'::text
        from new_shifts as new_shift
        left join old_shifts as old_shift
          on old_shift.source_shift_id = new_shift.source_shift_id
        where new_shift.staff_member_id is not null
          and (old_shift.source_shift_id is null
               or old_shift.staff_member_id is distinct from new_shift.staff_member_id)
          and not (new_shift.source_shift_id = any(confirmed_pairs))
        union all
        -- Same shift, same person, materially different facts.
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
      'finalised_requests', finalised_request_count
    )
  );

  return jsonb_build_object(
    'snapshot_id', new_snapshot_id,
    'version', next_version,
    'shift_count', published_shift_count,
    'notified_memberships', notified_membership_count,
    'finalised_requests', finalised_request_count
  );
end;
$$;

revoke all on function public.rpc_publish_rota_week(uuid, uuid) from public, anon;
grant execute on function public.rpc_publish_rota_week(uuid, uuid) to authenticated;

comment on function public.rpc_publish_rota_week(uuid, uuid) is
  'Manager-only atomic publish: versioned snapshot + shifts, open-shift request finalisation, targeted notifications (everyone on first publish, only affected staff on republish), audit record.';

notify pgrst, 'reload schema';
