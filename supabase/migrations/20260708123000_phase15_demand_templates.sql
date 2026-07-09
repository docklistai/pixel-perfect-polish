-- Phase 15: rota demand templates.
--
-- A demand template captures the SHAPE of a week ("a busy event week needs 3
-- FOH, 4 kitchen, 1 supervisor on Saturday") rather than a copy of one exact
-- rota. Managers save the current week's demand, then stamp it onto another
-- week as OPEN shifts to fill — far faster than rebuilding coverage by hand.
--
-- Additive only. Two tables + two manager RPCs:
--   * rota_demand_templates       — a named saved pattern.
--   * rota_demand_template_slots  — one row per (weekday, role, times) with a
--                                   quantity, carrying department_id + local
--                                   times so apply is deterministic.
--   * rpc_save_demand_template    — derive slots server-side from a week's
--                                   shifts (they carry department_id).
--   * rpc_apply_demand_template   — stamp a template onto a draft week as open
--                                   shifts, reconstructing wall-clock times in
--                                   the workspace timezone.
--
-- weekday is 0..6 with 0 = Monday .. 6 = Sunday (rota weeks start Monday).

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table public.rota_demand_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  notes text check (notes is null or length(notes) <= 500),
  created_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  foreign key (workspace_id, created_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (created_by_membership_id)
);

create table public.rota_demand_template_slots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  role_name text not null check (length(btrim(role_name)) between 1 and 120),
  department_id uuid not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  quantity integer not null check (quantity between 1 and 100),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, template_id)
    references public.rota_demand_templates (workspace_id, id) on delete cascade,
  foreign key (workspace_id, department_id)
    references public.departments (workspace_id, id) on delete restrict
);

create index rota_demand_template_slots_template_idx
  on public.rota_demand_template_slots (workspace_id, template_id);

create trigger rota_demand_templates_set_updated_at
before update on public.rota_demand_templates
for each row execute function public.set_updated_at();

create trigger rota_demand_templates_protect_immutable
before update on public.rota_demand_templates
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

alter table public.rota_demand_templates enable row level security;
alter table public.rota_demand_template_slots enable row level security;

revoke all on table public.rota_demand_templates from public, anon;
revoke all on table public.rota_demand_template_slots from public, anon;
-- Managers read templates directly and delete them directly (slots cascade
-- via the template FK); save/apply writes go through the RPCs below.
grant select, delete on table public.rota_demand_templates to authenticated;
grant select on table public.rota_demand_template_slots to authenticated;

create policy rota_demand_templates_manager_select
on public.rota_demand_templates for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy rota_demand_templates_manager_delete
on public.rota_demand_templates for delete to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy rota_demand_template_slots_manager_select
on public.rota_demand_template_slots for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.rota_demand_templates is
  'Named demand patterns (weekday role/count coverage) managers reuse to stamp open shifts onto a week. Not a copy of one exact rota. Manager-only.';

-- ---------------------------------------------------------------------------
-- 2. rpc_save_demand_template — derive slots from a week's shifts
-- ---------------------------------------------------------------------------

create or replace function public.rpc_save_demand_template(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_name text,
  p_notes text default null
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
  trimmed_name text;
  trimmed_notes text;
  new_template_id uuid;
  slot_count integer;
  week_start_date date;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_name := nullif(btrim(coalesce(p_name, '')), '');
  if trimmed_name is null or length(trimmed_name) > 80 then
    raise exception 'a template name of at most 80 characters is required' using errcode = '22023';
  end if;
  trimmed_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if trimmed_notes is not null and length(trimmed_notes) > 500 then
    raise exception 'notes must be at most 500 characters' using errcode = '22023';
  end if;

  select week_start into week_start_date from public.rota_weeks
  where workspace_id = p_workspace_id and id = p_rota_week_id;
  if week_start_date is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;

  select timezone into workspace_tz from public.workspaces where id = p_workspace_id;
  workspace_tz := coalesce(workspace_tz, 'UTC');

  insert into public.rota_demand_templates (workspace_id, name, notes, created_by_membership_id)
  values (p_workspace_id, trimmed_name, trimmed_notes, caller_membership_id)
  returning id into new_template_id;

  -- Group the week's shifts (assigned or open) into demand slots: for each
  -- weekday + role + department + local start/end/break, how many are needed.
  insert into public.rota_demand_template_slots (
    workspace_id, template_id, weekday, role_name, department_id,
    start_time, end_time, break_minutes, quantity
  )
  select
    p_workspace_id,
    new_template_id,
    (shift.shift_date - week_start_date)::int::smallint,
    shift.role_name,
    shift.department_id,
    (shift.starts_at at time zone workspace_tz)::time,
    (shift.ends_at at time zone workspace_tz)::time,
    shift.break_minutes,
    count(*)::int
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.rota_week_id = p_rota_week_id
  group by
    (shift.shift_date - week_start_date)::int,
    shift.role_name,
    shift.department_id,
    (shift.starts_at at time zone workspace_tz)::time,
    (shift.ends_at at time zone workspace_tz)::time,
    shift.break_minutes;

  get diagnostics slot_count = row_count;
  if slot_count = 0 then
    raise exception 'this week has no shifts to save as a template' using errcode = '55000';
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'demand_template.saved',
    'demand_template', new_template_id,
    jsonb_build_object('name', trimmed_name, 'slots', slot_count)
  );

  return jsonb_build_object('template_id', new_template_id, 'slots', slot_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. rpc_apply_demand_template — stamp a template onto a draft week
-- ---------------------------------------------------------------------------

create or replace function public.rpc_apply_demand_template(
  p_workspace_id uuid,
  p_rota_week_id uuid,
  p_template_id uuid
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
  week_location_id uuid;
  created_count integer := 0;
  slot record;
  shift_date date;
  starts_at timestamptz;
  ends_at timestamptz;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select rw.week_start, rw.status, rw.location_id
  into week_start, week_status, week_location_id
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = p_rota_week_id;

  if week_start is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;
  if week_status <> 'draft' then
    raise exception 'only draft rota weeks can take a template' using errcode = '55000';
  end if;

  if not exists (
    select 1 from public.rota_demand_templates
    where workspace_id = p_workspace_id and id = p_template_id
  ) then
    raise exception 'template not found in workspace' using errcode = 'P0002';
  end if;

  select timezone into workspace_tz from public.workspaces where id = p_workspace_id;
  workspace_tz := coalesce(workspace_tz, 'UTC');

  for slot in
    select weekday, role_name, department_id, start_time, end_time, break_minutes, quantity
    from public.rota_demand_template_slots
    where workspace_id = p_workspace_id and template_id = p_template_id
  loop
    shift_date := week_start + slot.weekday;
    starts_at := (shift_date + slot.start_time) at time zone workspace_tz;
    -- end at or before start means the shift runs past midnight.
    ends_at := ((case when slot.end_time <= slot.start_time then shift_date + 1 else shift_date end)
                 + slot.end_time) at time zone workspace_tz;

    insert into public.shifts (
      workspace_id, rota_week_id, location_id, department_id, staff_member_id,
      shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
    )
    select
      p_workspace_id, p_rota_week_id, week_location_id, slot.department_id, null,
      shift_date, starts_at, ends_at, slot.break_minutes, slot.role_name, 'open'
    from generate_series(1, slot.quantity);

    created_count := created_count + slot.quantity;
  end loop;

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'demand_template.applied',
    'demand_template', p_template_id,
    jsonb_build_object('rota_week_id', p_rota_week_id, 'open_shifts', created_count)
  );

  return jsonb_build_object('open_shifts_created', created_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_save_demand_template(uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_apply_demand_template(uuid, uuid, uuid) from public, anon;
grant execute on function public.rpc_save_demand_template(uuid, uuid, text, text) to authenticated;
grant execute on function public.rpc_apply_demand_template(uuid, uuid, uuid) to authenticated;

comment on function public.rpc_save_demand_template(uuid, uuid, text, text) is
  'Manager-only: derive a reusable demand pattern (weekday role/count coverage) from a rota week''s shifts.';
comment on function public.rpc_apply_demand_template(uuid, uuid, uuid) is
  'Manager-only: stamp a demand template onto a draft rota week as open shifts to fill.';

notify pgrst, 'reload schema';
