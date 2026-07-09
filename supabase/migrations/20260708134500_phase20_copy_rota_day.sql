-- Phase 20: copy a rota day onto other days.
--
-- A common hospitality pattern is "every weekday looks like Monday". Rebuilding
-- that by hand is slow; this copies one day's shifts (roles, times, breaks,
-- assignments, overrides) onto chosen target weekdays of the same draft week.
-- Wall-clock times are reconstructed in the workspace timezone so a copy across
-- a DST boundary keeps the same local start/end. Additive: it never clears the
-- target days, so a manager reviews the result.

create or replace function public.rpc_copy_rota_day(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_from_weekday smallint,
  p_to_weekdays smallint[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  workspace_tz text;
  week_start date;
  week_status text;
  created_count integer := 0;
  target smallint;
  to_date date;
  from_date date;
  src record;
  st time;
  et time;
  new_starts timestamptz;
  new_ends timestamptz;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_from_weekday is null or p_from_weekday < 0 or p_from_weekday > 6 then
    raise exception 'source weekday must be between 0 (Monday) and 6 (Sunday)'
      using errcode = '22023';
  end if;

  select rw.week_start, rw.status into week_start, week_status
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = p_rota_week_id;
  if week_start is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;
  if week_status <> 'draft' then
    raise exception 'only draft rota weeks can be edited' using errcode = '55000';
  end if;

  select timezone into workspace_tz from public.workspaces where id = p_workspace_id;
  workspace_tz := coalesce(workspace_tz, 'UTC');
  from_date := week_start + p_from_weekday;

  for target in select distinct unnest(coalesce(p_to_weekdays, array[]::smallint[])) loop
    if target < 0 or target > 6 or target = p_from_weekday then
      continue;
    end if;
    to_date := week_start + target;

    for src in
      select location_id, department_id, staff_member_id, starts_at, ends_at,
             break_minutes, role_name, assignment_status, colour_override, dept_override
      from public.shifts
      where workspace_id = p_workspace_id
        and rota_week_id = p_rota_week_id
        and shift_date = from_date
    loop
      st := (src.starts_at at time zone workspace_tz)::time;
      et := (src.ends_at at time zone workspace_tz)::time;
      new_starts := (to_date + st) at time zone workspace_tz;
      new_ends := ((case when et <= st then to_date + 1 else to_date end) + et) at time zone workspace_tz;

      insert into public.shifts (
        workspace_id, rota_week_id, location_id, department_id, staff_member_id,
        shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status,
        colour_override, dept_override
      )
      values (
        p_workspace_id, p_rota_week_id, src.location_id, src.department_id, src.staff_member_id,
        to_date, new_starts, new_ends, src.break_minutes, src.role_name, src.assignment_status,
        src.colour_override, src.dept_override
      );
      created_count := created_count + 1;
    end loop;
  end loop;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'rota_day.copied',
    'rota_week', p_rota_week_id,
    jsonb_build_object('from_weekday', p_from_weekday, 'shifts_created', created_count)
  );

  return jsonb_build_object('shifts_created', created_count);
end;
$$;

revoke all on function public.rpc_copy_rota_day(uuid, uuid, smallint, smallint[]) from public, anon;
grant execute on function public.rpc_copy_rota_day(uuid, uuid, smallint, smallint[]) to authenticated;

comment on function public.rpc_copy_rota_day(uuid, uuid, smallint, smallint[]) is
  'Manager-only: copy one draft day''s shifts (with assignments/overrides) onto other weekdays of the same week, reconstructing wall-clock times in the workspace timezone.';

notify pgrst, 'reload schema';
