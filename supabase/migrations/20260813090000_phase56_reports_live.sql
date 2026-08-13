-- Phase 56: fixed, manager-only operational Reports read model.
--
-- Reports deliberately remains a read surface over existing scheduling, leave,
-- time and staff facts. No reporting tables, materialized views, financial
-- history, employee scoring or arbitrary report dimensions are introduced.

create or replace function public.rpc_reports_read_page(
  p_workspace_id uuid,
  p_period_start date default null,
  p_period_end date default null,
  p_location_id uuid default null,
  p_department_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  workspace_timezone text;
  rota_start_weekday smallint;
  workspace_today date;
  current_week_start date;
  period_start date;
  period_end date;
  result jsonb;
begin
  perform public.rpc_internal_require_manager(p_workspace_id);

  select workspace.timezone, workspace.rota_start_weekday
  into workspace_timezone, rota_start_weekday
  from public.workspaces as workspace
  where workspace.id = p_workspace_id;

  if not found then
    raise exception 'workspace not found' using errcode = '22023';
  end if;

  workspace_today := (transaction_timestamp() at time zone workspace_timezone)::date;
  current_week_start := workspace_today
    - ((extract(isodow from workspace_today)::integer - 1 - rota_start_weekday + 7) % 7);

  if p_period_start is null and p_period_end is null then
    period_start := current_week_start - 21;
    period_end := current_week_start + 6;
  elsif p_period_start is null or p_period_end is null then
    raise exception 'period start and end must be supplied together' using errcode = '22023';
  else
    period_start := p_period_start;
    period_end := p_period_end;
  end if;

  if period_end - period_start not in (6, 27) then
    raise exception 'Reports periods must contain one or four rota weeks'
      using errcode = '22023';
  end if;
  if extract(isodow from period_start)::integer - 1 <> rota_start_weekday then
    raise exception 'Reports period must start on the configured rota weekday'
      using errcode = '22023';
  end if;

  if p_location_id is not null and not exists (
    select 1 from public.locations as location
    where location.workspace_id = p_workspace_id and location.id = p_location_id
  ) then
    raise exception 'location filter does not belong to this workspace' using errcode = '22023';
  end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments as department
    where department.workspace_id = p_workspace_id and department.id = p_department_id
  ) then
    raise exception 'department filter does not belong to this workspace' using errcode = '22023';
  end if;

  with
  period_weeks as (
    select week_start::date, (week_start::date + 6) as week_end
    from generate_series(period_start::timestamp, period_end::timestamp, interval '7 days')
      as week_start
  ),
  candidate_rota_weeks as (
    select week.id, week.location_id, week.week_start
    from public.rota_weeks as week
    where week.workspace_id = p_workspace_id
      and week.week_start between period_start - 7 and period_end
      and (p_location_id is null or week.location_id = p_location_id)
  ),
  publication_scope as (
    select week.week_start, location.id as location_id
    from period_weeks as week
    join public.locations as location
      on location.workspace_id = p_workspace_id
     and (
       (p_location_id is null and location.status = 'active')
       or location.id = p_location_id
     )
    union
    select candidate.week_start, candidate.location_id
    from candidate_rota_weeks as candidate
    where candidate.week_start between period_start and period_end
  ),
  ranked_snapshots as (
    select snapshot.id, snapshot.rota_week_id, candidate.location_id,
           candidate.week_start,
           row_number() over (
             partition by snapshot.rota_week_id
             order by snapshot.version desc, snapshot.published_at desc, snapshot.id desc
           ) as snapshot_rank
    from public.published_rota_snapshots as snapshot
    join candidate_rota_weeks as candidate
      on candidate.id = snapshot.rota_week_id
    where snapshot.workspace_id = p_workspace_id
  ),
  latest_snapshots as (
    select id, rota_week_id, location_id, week_start
    from ranked_snapshots
    where snapshot_rank = 1
  ),
  effective_shifts as (
    select shift.id, shift.source_shift_id, shift.location_id, shift.department_id,
           shift.staff_member_id, shift.shift_date, shift.starts_at, shift.ends_at,
           shift.assignment_status,
           greatest(
             0,
             floor(extract(epoch from (shift.ends_at - shift.starts_at)) / 60)::integer
               - shift.break_minutes
           ) as net_minutes,
           period_start + (((shift.shift_date - period_start) / 7) * 7) as period_week_start
    from public.published_rota_shifts as shift
    join latest_snapshots as snapshot on snapshot.id = shift.snapshot_id
    where shift.workspace_id = p_workspace_id
      and shift.shift_date between period_start and period_end
      and (p_location_id is null or shift.location_id = p_location_id)
      and (p_department_id is null or shift.department_id = p_department_id)
  ),
  heatmap_shifts as (
    select shift.id, shift.starts_at, shift.ends_at
    from public.published_rota_shifts as shift
    join latest_snapshots as snapshot on snapshot.id = shift.snapshot_id
    where shift.workspace_id = p_workspace_id
      and shift.assignment_status = 'scheduled'
      and shift.starts_at < ((period_end + 1)::timestamp at time zone workspace_timezone)
      and shift.ends_at > (period_start::timestamp at time zone workspace_timezone)
      and (p_location_id is null or shift.location_id = p_location_id)
      and (p_department_id is null or shift.department_id = p_department_id)
  ),
  publication_counts as (
    select week.week_start,
           count(distinct scope.location_id)::integer as expected_locations,
           count(distinct snapshot.location_id)::integer as published_locations
    from period_weeks as week
    left join publication_scope as scope on scope.week_start = week.week_start
    left join latest_snapshots as snapshot
      on snapshot.week_start = week.week_start and snapshot.location_id = scope.location_id
    group by week.week_start
  ),
  schedule_week_stats as (
    select shift.period_week_start as week_start,
           coalesce(sum(shift.net_minutes) filter (
             where shift.assignment_status = 'scheduled'
           ), 0)::integer as scheduled_minutes,
           count(*) filter (where shift.assignment_status = 'scheduled')::integer
             as assigned_shifts,
           count(*) filter (where shift.assignment_status = 'open')::integer as open_shifts,
           coalesce(sum(shift.net_minutes) filter (
             where shift.assignment_status = 'open'
           ), 0)::integer as open_minutes
    from effective_shifts as shift
    group by shift.period_week_start
  ),
  time_schedule_context as (
    select distinct on (shift.source_shift_id)
           shift.source_shift_id, shift.location_id, shift.department_id
    from public.published_rota_shifts as shift
    join latest_snapshots as snapshot on snapshot.id = shift.snapshot_id
    where shift.workspace_id = p_workspace_id
      and shift.assignment_status = 'scheduled'
      and shift.shift_date between period_start and period_end
    order by shift.source_shift_id, shift.starts_at desc, shift.id desc
  ),
  time_facts as (
    select entry.id, entry.work_date, entry.approval_status,
           case
             when entry.clocked_in_at is null or entry.clocked_out_at is null then 0
             else greatest(
               0,
               floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::integer
                 - entry.break_minutes
             )
           end as worked_minutes
    from public.time_entries as entry
    join public.staff_members as staff
      on staff.workspace_id = entry.workspace_id and staff.id = entry.staff_member_id
    left join time_schedule_context as scheduled on scheduled.source_shift_id = entry.shift_id
    where entry.workspace_id = p_workspace_id
      and entry.work_date between period_start and period_end
      and (
        p_location_id is null
        or coalesce(scheduled.location_id, staff.primary_location_id) = p_location_id
      )
      and (
        p_department_id is null
        or coalesce(scheduled.department_id, staff.department_id) = p_department_id
      )
  ),
  time_week_stats as (
    select period_start + (((entry.work_date - period_start) / 7) * 7) as week_start,
           coalesce(sum(entry.worked_minutes) filter (
             where entry.approval_status = 'approved'
           ), 0)::integer as approved_worked_minutes,
           count(*) filter (where entry.approval_status = 'pending')::integer
             as awaiting_review_entries
    from time_facts as entry
    group by period_start + (((entry.work_date - period_start) / 7) * 7)
  ),
  pending_leave as (
    select request.id
    from public.leave_requests as request
    join public.staff_members as staff
      on staff.workspace_id = request.workspace_id and staff.id = request.staff_member_id
    where request.workspace_id = p_workspace_id
      and request.status = 'pending'
      and (p_location_id is null or staff.primary_location_id = p_location_id)
      and (p_department_id is null or staff.department_id = p_department_id)
  ),
  leave_shift_impacts as (
    select distinct request.id as leave_request_id, request.staff_member_id,
           request.leave_type, request.start_date, request.end_date, shift.id as shift_id,
           shift.net_minutes
    from public.leave_requests as request
    join effective_shifts as shift
      on shift.staff_member_id = request.staff_member_id
     and shift.assignment_status = 'scheduled'
    join public.locations as location
      on location.workspace_id = p_workspace_id and location.id = shift.location_id
    where request.workspace_id = p_workspace_id and request.status = 'approved'
      and exists (
        select 1
        from (values
          (shift.shift_date),
          (((shift.ends_at - interval '1 second') at time zone
            coalesce(location.timezone, workspace_timezone, 'UTC'))::date)
        ) as occupied(constraint_date)
        where occupied.constraint_date between request.start_date and request.end_date
      )
  ),
  unique_affected_shifts as (
    select shift_id, max(net_minutes)::integer as net_minutes
    from leave_shift_impacts
    group by shift_id
  ),
  leave_impact_rows as (
    select impact.leave_request_id, staff.display_name, impact.leave_type,
           impact.start_date, impact.end_date,
           count(*)::integer as affected_shifts,
           sum(impact.net_minutes)::integer as affected_minutes
    from leave_shift_impacts as impact
    join public.staff_members as staff
      on staff.workspace_id = p_workspace_id and staff.id = impact.staff_member_id
    group by impact.leave_request_id, staff.display_name, impact.leave_type,
             impact.start_date, impact.end_date
  ),
  department_hours as (
    select department.id, department.name, department.status,
           sum(shift.net_minutes)::integer as scheduled_minutes,
           count(*)::integer as assigned_shifts
    from effective_shifts as shift
    join public.departments as department
      on department.workspace_id = p_workspace_id and department.id = shift.department_id
    where shift.assignment_status = 'scheduled'
    group by department.id, department.name, department.status
  ),
  coverage_rows as (
    select shift.shift_date, location.name as location_name,
           department.name as department_name,
           count(*) filter (where shift.assignment_status = 'scheduled')::integer
             as assigned_shifts,
           count(*) filter (where shift.assignment_status = 'open')::integer as open_shifts,
           coalesce(sum(shift.net_minutes) filter (
             where shift.assignment_status = 'scheduled'
           ), 0)::integer as scheduled_minutes,
           coalesce(sum(shift.net_minutes) filter (
             where shift.assignment_status = 'open'
           ), 0)::integer as open_minutes
    from effective_shifts as shift
    join public.locations as location
      on location.workspace_id = p_workspace_id and location.id = shift.location_id
    join public.departments as department
      on department.workspace_id = p_workspace_id and department.id = shift.department_id
    group by shift.shift_date, location.name, department.name
  ),
  contract_reviews as (
    select staff.id, staff.display_name, staff.contracted_minutes_per_week,
           sum(shift.net_minutes)::integer as scheduled_minutes
    from effective_shifts as shift
    join public.staff_members as staff
      on staff.workspace_id = p_workspace_id and staff.id = shift.staff_member_id
    where period_start = current_week_start and period_end = current_week_start + 6
      and shift.assignment_status = 'scheduled'
      and staff.employment_status = 'active'
      and staff.contracted_minutes_per_week is not null
    group by staff.id, staff.display_name, staff.contracted_minutes_per_week
    having sum(shift.net_minutes) > staff.contracted_minutes_per_week
  ),
  local_buckets as (
    select week.week_start, weekday, bucket_start_hour,
           ((week.week_start + weekday)::timestamp
             + make_interval(hours => bucket_start_hour)) at time zone workspace_timezone
               as bucket_starts_at,
           ((week.week_start + weekday)::timestamp
             + make_interval(hours => bucket_start_hour + 3)) at time zone workspace_timezone
               as bucket_ends_at
    from period_weeks as week
    cross join generate_series(0, 6) as weekday
    cross join generate_series(0, 21, 3) as bucket_start_hour
  ),
  bucket_headcounts as (
    select bucket.week_start, bucket.weekday, bucket.bucket_start_hour,
           count(shift.id)::integer as headcount
    from local_buckets as bucket
    left join heatmap_shifts as shift
      on shift.starts_at < bucket.bucket_ends_at and shift.ends_at > bucket.bucket_starts_at
    group by bucket.week_start, bucket.weekday, bucket.bucket_start_hour
  ),
  heatmap_cells as (
    select weekday, bucket_start_hour,
           round(avg(headcount)::numeric, 1) as average_headcount
    from bucket_headcounts
    group by weekday, bucket_start_hour
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'source', 'latest_published_snapshots',
      'workspaceTimezone', workspace_timezone,
      'rotaStartWeekday', rota_start_weekday,
      'periodStart', period_start,
      'periodEnd', period_end,
      'currentWeekStart', current_week_start,
      'hourSemantics', 'net_after_breaks',
      'shiftAttribution', 'local_shift_start_date',
      'heatmapSemantics', 'average_assigned_headcount_by_local_3_hour_bucket',
      'contractBasis', 'exact_current_rota_week_only'
    ),
    'filters', jsonb_build_object(
      'locationId', p_location_id,
      'departmentId', p_department_id
    ),
    'options', jsonb_build_object(
      'locations', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', location.id, 'name', location.name, 'status', location.status
        ) order by location.status, location.name, location.id)
        from public.locations as location
        where location.workspace_id = p_workspace_id
      ), '[]'::jsonb),
      'departments', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', department.id, 'name', department.name, 'status', department.status
        ) order by department.status, department.name, department.id)
        from public.departments as department
        where department.workspace_id = p_workspace_id
      ), '[]'::jsonb)
    ),
    'totals', jsonb_build_object(
      'scheduledMinutes', coalesce((select sum(net_minutes)::integer from effective_shifts
        where assignment_status = 'scheduled'), 0),
      'assignedShifts', (select count(*)::integer from effective_shifts
        where assignment_status = 'scheduled'),
      'openShifts', (select count(*)::integer from effective_shifts
        where assignment_status = 'open'),
      'openMinutes', coalesce((select sum(net_minutes)::integer from effective_shifts
        where assignment_status = 'open'), 0),
      'approvedWorkedMinutes', coalesce((select sum(worked_minutes)::integer from time_facts
        where approval_status = 'approved'), 0),
      'approvedEntries', (select count(*)::integer from time_facts
        where approval_status = 'approved'),
      'awaitingReviewEntries', (select count(*)::integer from time_facts
        where approval_status = 'pending'),
      'pendingLeave', (select count(*)::integer from pending_leave),
      'approvedLeaveAffectedShifts', (select count(*)::integer from unique_affected_shifts),
      'approvedLeaveAffectedMinutes', coalesce((
        select sum(net_minutes)::integer from unique_affected_shifts
      ), 0)
    ),
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'weekStart', week.week_start,
        'weekEnd', week.week_end,
        'publicationStatus', case
          when publication.published_locations = 0 then 'not_published'
          when publication.published_locations < publication.expected_locations
            then 'partially_published'
          else 'published'
        end,
        'publishedLocations', publication.published_locations,
        'expectedLocations', publication.expected_locations,
        'scheduledMinutes', coalesce(schedule.scheduled_minutes, 0),
        'assignedShifts', coalesce(schedule.assigned_shifts, 0),
        'openShifts', coalesce(schedule.open_shifts, 0),
        'openMinutes', coalesce(schedule.open_minutes, 0),
        'approvedWorkedMinutes', coalesce(time_stats.approved_worked_minutes, 0),
        'awaitingReviewEntries', coalesce(time_stats.awaiting_review_entries, 0)
      ) order by week.week_start)
      from period_weeks as week
      join publication_counts as publication on publication.week_start = week.week_start
      left join schedule_week_stats as schedule on schedule.week_start = week.week_start
      left join time_week_stats as time_stats on time_stats.week_start = week.week_start
    ), '[]'::jsonb),
    'departmentHours', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', department.id,
        'name', department.name,
        'status', department.status,
        'scheduledMinutes', department.scheduled_minutes,
        'assignedShifts', department.assigned_shifts
      ) order by department.scheduled_minutes desc, department.name, department.id)
      from department_hours as department
    ), '[]'::jsonb),
    'heatmap', coalesce((
      select jsonb_agg(jsonb_build_object(
        'weekday', cell.weekday,
        'bucketStartHour', cell.bucket_start_hour,
        'bucketEndHour', cell.bucket_start_hour + 3,
        'averageHeadcount', cell.average_headcount
      ) order by cell.weekday, cell.bucket_start_hour)
      from heatmap_cells as cell
    ), '[]'::jsonb),
    'leaveImpacts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'leaveRequestId', impact.leave_request_id,
        'staffName', impact.display_name,
        'leaveType', impact.leave_type,
        'startDate', impact.start_date,
        'endDate', impact.end_date,
        'affectedShifts', impact.affected_shifts,
        'affectedMinutes', impact.affected_minutes
      ) order by impact.start_date, impact.display_name, impact.leave_request_id)
      from leave_impact_rows as impact
    ), '[]'::jsonb),
    'contractReviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'staffMemberId', review.id,
        'staffName', review.display_name,
        'contractedMinutes', review.contracted_minutes_per_week,
        'scheduledMinutes', review.scheduled_minutes,
        'differenceMinutes', review.scheduled_minutes - review.contracted_minutes_per_week,
        'basis', 'current_contract'
      ) order by review.display_name, review.id)
      from contract_reviews as review
    ), '[]'::jsonb),
    'coverageRows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', coverage.shift_date,
        'location', coverage.location_name,
        'department', coverage.department_name,
        'assignedShifts', coverage.assigned_shifts,
        'openShifts', coverage.open_shifts,
        'scheduledMinutes', coverage.scheduled_minutes,
        'openMinutes', coverage.open_minutes
      ) order by coverage.shift_date, coverage.location_name, coverage.department_name)
      from coverage_rows as coverage
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.rpc_reports_read_page(uuid, date, date, uuid, uuid)
  from public, anon;
grant execute on function public.rpc_reports_read_page(uuid, date, date, uuid, uuid)
  to authenticated;

comment on function public.rpc_reports_read_page(uuid, date, date, uuid, uuid) is
  'Manager-only fixed operational Reports read model. Uses only latest published rota snapshots, net minutes after breaks, bounded rota-week periods and workspace-owned filters; returns no pay, leave reasons, private notes or employee scores.';

notify pgrst, 'reload schema';
