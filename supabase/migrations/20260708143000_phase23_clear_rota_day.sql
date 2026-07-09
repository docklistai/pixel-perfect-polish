-- Phase 23: clear a rota day.
--
-- Complements copy-a-day (phase 20): remove all of one day's shifts in a draft
-- week in a single action, instead of deleting them one by one. Manager-only,
-- draft-only. Returns the number of shifts removed so the UI can report it.

create or replace function public.rpc_clear_rota_day(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_weekday smallint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  week_start date;
  week_status text;
  removed_count integer;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_weekday is null or p_weekday < 0 or p_weekday > 6 then
    raise exception 'weekday must be between 0 (Monday) and 6 (Sunday)' using errcode = '22023';
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

  delete from public.shifts
  where workspace_id = p_workspace_id
    and rota_week_id = p_rota_week_id
    and shift_date = week_start + p_weekday;
  get diagnostics removed_count = row_count;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'rota_day.cleared',
    'rota_week', p_rota_week_id,
    jsonb_build_object('weekday', p_weekday, 'shifts_removed', removed_count)
  );

  return jsonb_build_object('shifts_removed', removed_count);
end;
$$;

revoke all on function public.rpc_clear_rota_day(uuid, uuid, smallint) from public, anon;
grant execute on function public.rpc_clear_rota_day(uuid, uuid, smallint) to authenticated;

comment on function public.rpc_clear_rota_day(uuid, uuid, smallint) is
  'Manager-only: remove all shifts on one weekday of a draft rota week.';

notify pgrst, 'reload schema';
