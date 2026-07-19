-- Phase 40: transactional copy-previous-week.
--
-- Replaces the application-side delete → insert → best-effort-restore flow for
-- "copy previous week" with one atomic, workspace-authorised RPC. A failed
-- insert (constraint violation, lock conflict, crash) now rolls the whole
-- operation back — the target week's existing draft is never lost and no
-- partial copy can ever be observed.
--
-- Lock protocol:
--   1. the target rota_weeks row is created if absent, then SOURCE and TARGET
--      week rows are locked FOR UPDATE in UUID order;
--   2. shift inserts fire the phase 31 staff eligibility lock per row, and
--      rows are inserted in ascending staff_member_id order — the same
--      acquisition order the publish preflight and rpc_copy_rota_day use —
--      keeping the protocol deadlock-free.

-- Every shift writer locks its rota week before touching the shift row. This
-- makes the week row the serialization authority for ordinary edits as well
-- as copy/publish RPCs. Updates that move a shift lock both weeks in UUID
-- order, so there is one deterministic order for all week-scoped writers.
create or replace function public.lock_rota_week_for_shift_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  week_to_lock record;
begin
  for week_to_lock in
    select distinct candidate.workspace_id, candidate.rota_week_id
    from (
      values
        (case when tg_op <> 'INSERT' then old.workspace_id end,
         case when tg_op <> 'INSERT' then old.rota_week_id end),
        (case when tg_op <> 'DELETE' then new.workspace_id end,
         case when tg_op <> 'DELETE' then new.rota_week_id end)
    ) as candidate(workspace_id, rota_week_id)
    where candidate.workspace_id is not null
      and candidate.rota_week_id is not null
    order by candidate.workspace_id, candidate.rota_week_id
  loop
    perform 1
    from public.rota_weeks as week
    where week.workspace_id = week_to_lock.workspace_id
      and week.id = week_to_lock.rota_week_id
    for update;

    if not found then
      raise exception 'rota week not found in workspace' using errcode = 'P0002';
    end if;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.lock_rota_week_for_shift_write()
  from public, anon, authenticated;

drop trigger if exists shifts_00_lock_rota_week_for_write on public.shifts;
create trigger shifts_00_lock_rota_week_for_write
before insert or update or delete on public.shifts
for each row execute function public.lock_rota_week_for_shift_write();

comment on function public.lock_rota_week_for_shift_write() is
  'Deterministic week lock for every shift write. Serializes ordinary target edits with copy/publish operations before staff eligibility locks are acquired.';

create or replace function public.rpc_copy_previous_rota_week(
  p_workspace_id uuid,
  p_location_id uuid,
  p_target_week_start date
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  location_tz text;
  source_week_id uuid;
  source_week_start date;
  target_week_id uuid;
  target_week_status text;
  source_shift_count integer;
  replaced_count integer := 0;
  created_count integer := 0;
  src record;
  st time;
  et time;
  new_starts timestamptz;
  new_ends timestamptz;
  to_date date;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_target_week_start is null then
    raise exception 'a target week start date is required' using errcode = '22023';
  end if;

  select loc.timezone into location_tz
  from public.locations as loc
  where loc.workspace_id = p_workspace_id
    and loc.id = p_location_id
    and loc.status = 'active';
  if location_tz is null then
    raise exception 'location not found in workspace' using errcode = 'P0002';
  end if;

  source_week_start := p_target_week_start - 7;

  select week.id into source_week_id
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.location_id = p_location_id
    and week.week_start = source_week_start;
  if source_week_id is null then
    raise exception 'No previous week rota is available to copy.' using errcode = 'P0002';
  end if;

  -- Ensure the target week exists, then lock source and target in UUID order.
  -- The shift-write trigger above takes the same week lock, so neither the
  -- source set nor the target draft can change while this transaction copies.
  insert into public.rota_weeks (workspace_id, location_id, week_start, status)
  values (p_workspace_id, p_location_id, p_target_week_start, 'draft')
  on conflict (workspace_id, location_id, week_start) do nothing;

  select week.id into target_week_id
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.location_id = p_location_id
    and week.week_start = p_target_week_start;

  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id in (source_week_id, target_week_id)
  order by week.id
  for update;

  select week.status into target_week_status
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = target_week_id;

  if target_week_status = 'archived' then
    raise exception 'Archived rota weeks cannot be edited' using errcode = '55000';
  end if;

  select count(*) into source_shift_count
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = source_week_id;
  if source_shift_count = 0 then
    raise exception 'Previous week has no shifts to copy.' using errcode = '55000';
  end if;

  -- Replace the target draft. Atomic with the inserts below: if anything
  -- fails, this delete rolls back too and the original draft survives.
  delete from public.shifts
  where workspace_id = p_workspace_id
    and rota_week_id = target_week_id;
  get diagnostics replaced_count = row_count;

  for src in
    select shift.department_id, shift.staff_member_id, shift.shift_date,
           shift.starts_at, shift.ends_at, shift.break_minutes, shift.role_name,
           shift.assignment_status, shift.colour_override, shift.dept_override
    from public.shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = source_week_id
    order by shift.staff_member_id asc nulls last, shift.shift_date, shift.starts_at, shift.id
  loop
    -- Reconstruct wall-clock times in the location timezone so a copy across
    -- a DST boundary keeps the same local start/end. Overnight shifts (local
    -- end at or before local start) end on the following day.
    st := (src.starts_at at time zone location_tz)::time;
    et := (src.ends_at at time zone location_tz)::time;
    to_date := src.shift_date + 7;
    new_starts := (to_date + st) at time zone location_tz;
    new_ends := ((case when et <= st then to_date + 1 else to_date end) + et)
      at time zone location_tz;

    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status,
      colour_override, dept_override
    )
    values (
      p_workspace_id, target_week_id, p_location_id, src.department_id, src.staff_member_id,
      to_date, new_starts, new_ends, src.break_minutes, src.role_name, src.assignment_status,
      src.colour_override, src.dept_override
    );
    created_count := created_count + 1;
  end loop;

  update public.rota_weeks
  set status = 'draft'
  where workspace_id = p_workspace_id
    and id = target_week_id
    and status <> 'draft';

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'rota_week.previous_week_copied',
    'rota_week', target_week_id,
    jsonb_build_object(
      'source_week_start', source_week_start,
      'target_week_start', p_target_week_start,
      'shifts_created', created_count,
      'shifts_replaced', replaced_count
    )
  );

  return jsonb_build_object(
    'rota_week_id', target_week_id,
    'shifts_created', created_count,
    'shifts_replaced', replaced_count
  );
end;
$$;

revoke all on function public.rpc_copy_previous_rota_week(uuid, uuid, date) from public, anon;
grant execute on function public.rpc_copy_previous_rota_week(uuid, uuid, date) to authenticated;

comment on function public.rpc_copy_previous_rota_week(uuid, uuid, date) is
  'Manager-only, atomic: replaces the target week''s draft shifts with a copy of the previous week (same location), reconstructing wall-clock times in the location timezone. All-or-nothing — a failed insert rolls back the delete, so the existing draft is never lost.';

notify pgrst, 'reload schema';
