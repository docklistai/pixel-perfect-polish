-- Phase 50 — lightweight reusable checklists and retained manual runs.
-- No scheduling engine, scoring, training, certification, or LMS behaviour.

create table public.ops_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  location_id uuid,
  department_id uuid,
  shift_type text check (shift_type is null or shift_type in (
    'opening', 'day', 'closing', 'overnight', 'other'
  )),
  daypart text check (daypart is null or daypart in (
    'morning', 'afternoon', 'evening', 'overnight'
  )),
  active boolean not null default true,
  created_by_membership_id uuid not null,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict,
  foreign key (workspace_id, department_id)
    references public.departments (workspace_id, id) on delete restrict,
  foreign key (workspace_id, created_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create table public.ops_checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  template_id uuid not null,
  position integer not null check (position between 1 and 200),
  label text not null check (length(btrim(label)) between 1 and 300),
  requires_note boolean not null default false,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, template_id, position),
  foreign key (workspace_id, template_id)
    references public.ops_checklist_templates (workspace_id, id) on delete restrict
);

create table public.ops_checklist_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  template_id uuid not null,
  location_id uuid not null,
  run_date date not null,
  assigned_staff_member_id uuid,
  status text not null default 'open' check (status in ('open', 'completed', 'reviewed')),
  started_by_membership_id uuid not null,
  started_at timestamptz not null default transaction_timestamp(),
  completed_by_membership_id uuid,
  completed_at timestamptz,
  reviewed_by_membership_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, template_id, location_id, run_date),
  foreign key (workspace_id, template_id)
    references public.ops_checklist_templates (workspace_id, id) on delete restrict,
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict,
  foreign key (workspace_id, assigned_staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, started_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, completed_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, reviewed_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check ((completed_at is null) = (completed_by_membership_id is null)),
  check ((reviewed_at is null) = (reviewed_by_membership_id is null)),
  check (status = 'open' or completed_at is not null),
  check (status <> 'reviewed' or reviewed_at is not null)
);

create table public.ops_checklist_run_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  run_id uuid not null,
  template_item_id uuid not null,
  position integer not null check (position between 1 and 200),
  label text not null check (length(btrim(label)) between 1 and 300),
  requires_note boolean not null default false,
  state text not null default 'pending' check (state in ('pending', 'done', 'exception')),
  note text check (note is null or length(btrim(note)) between 1 and 2000),
  completed_by_membership_id uuid,
  completed_at timestamptz,
  linked_ops_entry_id uuid,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, run_id, position),
  foreign key (workspace_id, run_id)
    references public.ops_checklist_runs (workspace_id, id) on delete restrict,
  foreign key (workspace_id, template_item_id)
    references public.ops_checklist_template_items (workspace_id, id) on delete restrict,
  foreign key (workspace_id, completed_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check ((completed_at is null) = (completed_by_membership_id is null)),
  check ((state = 'pending') = (completed_at is null)),
  check (state <> 'exception' or note is not null),
  check (not requires_note or state = 'pending' or note is not null)
);

alter table public.ops_checklist_run_items add constraint ops_checklist_run_items_entry_fk
  foreign key (workspace_id, linked_ops_entry_id)
    references public.ops_entries (workspace_id, id) on delete restrict;
create unique index ops_checklist_run_items_workspace_entry_uidx
  on public.ops_checklist_run_items (workspace_id, linked_ops_entry_id)
  where linked_ops_entry_id is not null;

create table public.ops_checklist_run_item_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  run_item_id uuid not null,
  actor_membership_id uuid not null,
  request_id uuid not null,
  previous_state text not null check (previous_state in ('pending', 'done', 'exception')),
  resulting_state text not null check (resulting_state in ('pending', 'done', 'exception')),
  note text check (note is null or length(btrim(note)) between 1 and 2000),
  linked_ops_entry_id uuid,
  occurred_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, actor_membership_id, request_id),
  foreign key (workspace_id, run_item_id)
    references public.ops_checklist_run_items (workspace_id, id) on delete restrict,
  foreign key (workspace_id, actor_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, linked_ops_entry_id)
    references public.ops_entries (workspace_id, id) on delete restrict
);

create index ops_checklist_templates_workspace_active_idx
  on public.ops_checklist_templates (workspace_id, active, location_id, department_id);
create index ops_checklist_templates_workspace_creator_idx
  on public.ops_checklist_templates (workspace_id, created_by_membership_id);
create index ops_checklist_templates_workspace_location_idx
  on public.ops_checklist_templates (workspace_id, location_id)
  where location_id is not null;
create index ops_checklist_templates_workspace_department_idx
  on public.ops_checklist_templates (workspace_id, department_id)
  where department_id is not null;
create index ops_checklist_template_items_workspace_template_idx
  on public.ops_checklist_template_items (workspace_id, template_id, position);
create index ops_checklist_runs_workspace_location_date_idx
  on public.ops_checklist_runs (workspace_id, location_id, run_date desc, status);
create index ops_checklist_runs_workspace_template_idx
  on public.ops_checklist_runs (workspace_id, template_id, run_date desc);
create index ops_checklist_runs_workspace_assignee_idx
  on public.ops_checklist_runs (workspace_id, assigned_staff_member_id, status)
  where assigned_staff_member_id is not null;
create index ops_checklist_runs_workspace_starter_idx
  on public.ops_checklist_runs (workspace_id, started_by_membership_id);
create index ops_checklist_runs_workspace_completer_idx
  on public.ops_checklist_runs (workspace_id, completed_by_membership_id)
  where completed_by_membership_id is not null;
create index ops_checklist_runs_workspace_reviewer_idx
  on public.ops_checklist_runs (workspace_id, reviewed_by_membership_id)
  where reviewed_by_membership_id is not null;
create index ops_checklist_run_items_workspace_run_idx
  on public.ops_checklist_run_items (workspace_id, run_id, position);
create index ops_checklist_run_items_workspace_template_item_idx
  on public.ops_checklist_run_items (workspace_id, template_item_id);
create index ops_checklist_run_items_workspace_completer_idx
  on public.ops_checklist_run_items (workspace_id, completed_by_membership_id)
  where completed_by_membership_id is not null;
create index ops_checklist_run_item_events_workspace_item_time_idx
  on public.ops_checklist_run_item_events (workspace_id, run_item_id, occurred_at, id);
create index ops_checklist_run_item_events_workspace_entry_idx
  on public.ops_checklist_run_item_events (workspace_id, linked_ops_entry_id)
  where linked_ops_entry_id is not null;

create or replace function public.guard_ops_checklist_template_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ops checklist templates are retained' using errcode = '55000';
  end if;
  if row(new.id, new.workspace_id, new.name, new.location_id, new.department_id,
         new.shift_type, new.daypart, new.created_by_membership_id, new.created_at)
     is distinct from
     row(old.id, old.workspace_id, old.name, old.location_id, old.department_id,
         old.shift_type, old.daypart, old.created_by_membership_id, old.created_at)
  then raise exception 'ops checklist template definition is immutable; create a new version'
    using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_ops_checklist_run_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ops checklist runs are retained' using errcode = '55000';
  end if;
  if row(new.id, new.workspace_id, new.template_id, new.location_id, new.run_date,
         new.assigned_staff_member_id, new.started_by_membership_id, new.started_at, new.created_at)
     is distinct from
     row(old.id, old.workspace_id, old.template_id, old.location_id, old.run_date,
         old.assigned_staff_member_id, old.started_by_membership_id, old.started_at, old.created_at)
  then raise exception 'ops checklist run identity is immutable' using errcode = '55000';
  end if;
  if old.reviewed_at is not null and row(new.reviewed_at, new.reviewed_by_membership_id)
     is distinct from row(old.reviewed_at, old.reviewed_by_membership_id) then
    raise exception 'ops checklist review is immutable once recorded' using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_ops_checklist_run_item_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ops checklist run items are retained' using errcode = '55000';
  end if;
  if row(new.id, new.workspace_id, new.run_id, new.template_item_id, new.position,
         new.label, new.requires_note, new.created_at)
     is distinct from
     row(old.id, old.workspace_id, old.run_id, old.template_item_id, old.position,
         old.label, old.requires_note, old.created_at)
  then raise exception 'ops checklist run item identity is immutable' using errcode = '55000';
  end if;
  if old.linked_ops_entry_id is not null and
     new.linked_ops_entry_id is distinct from old.linked_ops_entry_id then
    raise exception 'linked ops exception is immutable once recorded' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger ops_checklist_templates_set_updated_at before update on public.ops_checklist_templates
for each row execute function public.set_updated_at();
create trigger ops_checklist_templates_guard_change
before update or delete on public.ops_checklist_templates
for each row execute function public.guard_ops_checklist_template_change();
create trigger ops_checklist_template_items_reject_changes
before update or delete on public.ops_checklist_template_items
for each row execute function public.reject_immutable_row_change();
create trigger ops_checklist_runs_set_updated_at before update on public.ops_checklist_runs
for each row execute function public.set_updated_at();
create trigger ops_checklist_runs_guard_change before update or delete on public.ops_checklist_runs
for each row execute function public.guard_ops_checklist_run_change();
create trigger ops_checklist_run_items_set_updated_at before update on public.ops_checklist_run_items
for each row execute function public.set_updated_at();
create trigger ops_checklist_run_items_guard_change
before update or delete on public.ops_checklist_run_items
for each row execute function public.guard_ops_checklist_run_item_change();
create trigger ops_checklist_run_item_events_reject_changes
before update or delete on public.ops_checklist_run_item_events
for each row execute function public.reject_immutable_row_change();

alter table public.ops_checklist_templates enable row level security;
alter table public.ops_checklist_template_items enable row level security;
alter table public.ops_checklist_runs enable row level security;
alter table public.ops_checklist_run_items enable row level security;
alter table public.ops_checklist_run_item_events enable row level security;
revoke all on table public.ops_checklist_templates, public.ops_checklist_template_items,
  public.ops_checklist_runs, public.ops_checklist_run_items,
  public.ops_checklist_run_item_events from public, anon, authenticated;
grant select on table public.ops_checklist_templates, public.ops_checklist_template_items,
  public.ops_checklist_runs, public.ops_checklist_run_items,
  public.ops_checklist_run_item_events to authenticated;
create policy ops_checklist_templates_manager_select on public.ops_checklist_templates
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_checklist_template_items_manager_select on public.ops_checklist_template_items
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_checklist_runs_manager_select on public.ops_checklist_runs
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_checklist_run_items_manager_select on public.ops_checklist_run_items
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_checklist_run_item_events_manager_select on public.ops_checklist_run_item_events
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create or replace function public.rpc_ops_create_checklist_template(
  p_workspace_id uuid, p_request_id uuid, p_name text, p_location_id uuid,
  p_department_id uuid, p_shift_type text, p_daypart text,
  p_item_labels text[], p_item_requires_note boolean[]
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; template_id uuid; item_count integer;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.checklist.template.create');
  if not request_is_new then return result; end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null or length(btrim(p_name)) > 160 then
    raise exception 'template name is required and must be at most 160 characters' using errcode = '22023';
  end if;
  item_count := cardinality(coalesce(p_item_labels, array[]::text[]));
  if item_count < 1 or item_count > 100 then
    raise exception 'a checklist template requires between 1 and 100 items' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_item_requires_note, array[]::boolean[])) <> item_count then
    raise exception 'item note requirements must match item labels' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_item_labels) as label
             where nullif(btrim(coalesce(label, '')), '') is null or length(btrim(label)) > 300) then
    raise exception 'checklist item labels are required and must be at most 300 characters'
      using errcode = '22023';
  end if;
  insert into public.ops_checklist_templates (
    workspace_id, name, location_id, department_id, shift_type, daypart,
    created_by_membership_id
  ) values (
    p_workspace_id, btrim(p_name), p_location_id, p_department_id,
    p_shift_type, p_daypart, actor_id
  ) returning id into template_id;
  insert into public.ops_checklist_template_items (
    workspace_id, template_id, position, label, requires_note
  ) select p_workspace_id, template_id, ordinal::integer, btrim(label),
           p_item_requires_note[ordinal]
    from unnest(p_item_labels) with ordinality as item(label, ordinal);
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'ops.checklist_template_created',
    'ops_checklist_template', template_id, jsonb_build_object('item_count', item_count)
  );
  result := jsonb_build_object('template_id', template_id, 'item_count', item_count);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_set_checklist_template_active(
  p_workspace_id uuid, p_request_id uuid, p_template_id uuid, p_active boolean
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; prior_active boolean;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.checklist.template.active');
  if not request_is_new then return result; end if;
  if p_active is null then raise exception 'active state is required' using errcode = '22023'; end if;
  select active into prior_active from public.ops_checklist_templates
  where workspace_id = p_workspace_id and id = p_template_id for update;
  if not found then raise exception 'checklist template not found' using errcode = 'P0002'; end if;
  if prior_active is distinct from p_active then
    update public.ops_checklist_templates set active = p_active
    where workspace_id = p_workspace_id and id = p_template_id;
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id,
      case when p_active then 'ops.checklist_template_activated'
           else 'ops.checklist_template_deactivated' end,
      'ops_checklist_template', p_template_id, '{}'::jsonb
    );
  end if;
  result := jsonb_build_object('template_id', p_template_id, 'active', p_active,
                               'changed', prior_active is distinct from p_active);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_start_checklist_run(
  p_workspace_id uuid, p_request_id uuid, p_template_id uuid,
  p_location_id uuid, p_run_date date, p_assigned_staff_member_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; target_run_id uuid;
  template_location uuid; template_active boolean; timezone_name text; staff_status text;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  perform 1 from public.workspace_memberships as actor
  where actor.workspace_id = p_workspace_id and actor.id = actor_id
    and actor.status = 'active' and actor.role in ('owner', 'manager')
  for update;
  if not found then
    raise exception 'active owner or manager role required' using errcode = '42501';
  end if;
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.checklist.run.start');
  if not request_is_new then return result; end if;
  select template.location_id, template.active into template_location, template_active
  from public.ops_checklist_templates as template
  where template.workspace_id = p_workspace_id and template.id = p_template_id for update;
  if not found then raise exception 'checklist template not found' using errcode = 'P0002'; end if;
  if not template_active then raise exception 'inactive checklist templates cannot start runs' using errcode = '55000'; end if;
  if template_location is not null and template_location <> p_location_id then
    raise exception 'checklist run location must match its template' using errcode = '55000';
  end if;
  select timezone into timezone_name from public.locations where workspace_id = p_workspace_id
    and id = p_location_id and status = 'active' for update;
  if timezone_name is null then raise exception 'active checklist location is required' using errcode = '22023'; end if;
  if p_run_date is distinct from (transaction_timestamp() at time zone timezone_name)::date then
    raise exception 'manual checklist runs must start for today at the location' using errcode = '55000';
  end if;
  if p_assigned_staff_member_id is not null then
    select employment_status into staff_status from public.staff_members
    where workspace_id = p_workspace_id and id = p_assigned_staff_member_id for update;
    if not found then raise exception 'checklist assignee not found' using errcode = 'P0002'; end if;
    if staff_status <> 'active' then raise exception 'checklist assignee must be active' using errcode = '55000'; end if;
  end if;
  insert into public.ops_checklist_runs (
    workspace_id, template_id, location_id, run_date,
    assigned_staff_member_id, started_by_membership_id
  ) values (
    p_workspace_id, p_template_id, p_location_id, p_run_date,
    p_assigned_staff_member_id, actor_id
  ) on conflict (workspace_id, template_id, location_id, run_date) do nothing
  returning id into target_run_id;
  if target_run_id is null then
    select id into target_run_id from public.ops_checklist_runs
    where workspace_id = p_workspace_id and template_id = p_template_id
      and location_id = p_location_id and run_date = p_run_date;
  else
    insert into public.ops_checklist_run_items (
      workspace_id, run_id, template_item_id, position, label, requires_note
    ) select p_workspace_id, target_run_id, item.id, item.position, item.label, item.requires_note
      from public.ops_checklist_template_items as item
      where item.workspace_id = p_workspace_id and item.template_id = p_template_id
      order by item.position;
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'ops.checklist_run_started', 'ops_checklist_run', target_run_id,
      jsonb_build_object('template_id', p_template_id, 'run_date', p_run_date)
    );
  end if;
  result := jsonb_build_object('run_id', target_run_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_set_checklist_run_item(
  p_workspace_id uuid, p_request_id uuid, p_run_item_id uuid,
  p_state text, p_note text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; target_run_id uuid; target_location_id uuid;
  run_status text; old_state text; old_note text; item_label text; requires_note boolean;
  linked_entry_id uuid; assigned_staff_id uuid; all_finished boolean; created_exception boolean := false;
  normalized_note text;
  recipient_ids uuid[];
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.checklist.item.set');
  if not request_is_new then return result; end if;
  if p_state not in ('pending', 'done', 'exception') then
    raise exception 'checklist item state must be pending, done, or exception' using errcode = '22023';
  end if;
  select item.run_id, item.state, item.note, item.label, item.requires_note, item.linked_ops_entry_id,
         run.status, run.location_id, run.assigned_staff_member_id
  into target_run_id, old_state, old_note, item_label, requires_note, linked_entry_id,
       run_status, target_location_id, assigned_staff_id
  from public.ops_checklist_run_items as item
  join public.ops_checklist_runs as run
    on run.workspace_id = item.workspace_id and run.id = item.run_id
  where item.workspace_id = p_workspace_id and item.id = p_run_item_id
  for update of item, run;
  if not found then raise exception 'checklist run item not found' using errcode = 'P0002'; end if;
  if run_status = 'reviewed' then raise exception 'reviewed checklist runs are immutable' using errcode = '55000'; end if;
  if (p_state = 'exception' or (requires_note and p_state <> 'pending'))
     and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'this checklist state requires a note' using errcode = '22023';
  end if;
  normalized_note := case when p_state = 'pending' then null
                          else nullif(btrim(coalesce(p_note, '')), '') end;
  if old_state = p_state and old_note is not distinct from normalized_note then
    result := jsonb_build_object('run_id', target_run_id, 'run_item_id', p_run_item_id,
      'state', old_state, 'changed', false, 'linked_ops_entry_id', linked_entry_id);
    perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
    return result;
  end if;
  update public.ops_checklist_run_items set state = p_state,
    note = normalized_note,
    completed_by_membership_id = case when p_state = 'pending' then null else actor_id end,
    completed_at = case when p_state = 'pending' then null else transaction_timestamp() end
  where workspace_id = p_workspace_id and id = p_run_item_id;
  if p_state = 'exception' and linked_entry_id is null then
    insert into public.ops_entries (
      workspace_id, entry_type, title, description, location_id,
      assigned_staff_member_id, priority, created_by_membership_id
    ) values (
      p_workspace_id, 'task', 'Checklist exception — ' || item_label,
      nullif(btrim(coalesce(p_note, '')), ''), target_location_id,
      assigned_staff_id, 'high', actor_id
    ) returning id into linked_entry_id;
    update public.ops_checklist_run_items set linked_ops_entry_id = linked_entry_id
    where workspace_id = p_workspace_id and id = p_run_item_id;
    insert into public.ops_entry_events (
      workspace_id, ops_entry_id, actor_membership_id, request_id,
      event_type, resulting_status, details
    ) values (
      p_workspace_id, linked_entry_id, actor_id, p_request_id, 'created', 'open',
      jsonb_build_object('source_checklist_run_item_id', p_run_item_id)
    );
    created_exception := true;
    select coalesce(array_agg(id order by id), array[]::uuid[]) into recipient_ids
    from public.workspace_memberships where workspace_id = p_workspace_id
      and status = 'active' and role in ('owner', 'manager') and id <> actor_id;
    if cardinality(recipient_ids) > 0 then
      perform public.rpc_internal_notify(
        p_workspace_id, actor_id, 'ops_checklist_exception', 'Checklist exception',
        item_label, 'ops_entry', linked_entry_id, recipient_ids
      );
    end if;
  end if;
  select not exists (
    select 1 from public.ops_checklist_run_items
    where ops_checklist_run_items.workspace_id = p_workspace_id
      and ops_checklist_run_items.run_id = target_run_id
      and state = 'pending'
  ) into all_finished;
  update public.ops_checklist_runs set
    status = case when all_finished then 'completed' else 'open' end,
    completed_by_membership_id = case when all_finished then actor_id else null end,
    completed_at = case when all_finished then transaction_timestamp() else null end
  where workspace_id = p_workspace_id and id = target_run_id;
  insert into public.ops_checklist_run_item_events (
    workspace_id, run_item_id, actor_membership_id, request_id,
    previous_state, resulting_state, note, linked_ops_entry_id
  ) values (
    p_workspace_id, p_run_item_id, actor_id, p_request_id,
    old_state, p_state,
    normalized_note,
    linked_entry_id
  );
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id,
    case when created_exception then 'ops.checklist_exception_recorded'
         else 'ops.checklist_item_updated' end,
    'ops_checklist_run', target_run_id,
    jsonb_build_object('run_item_id', p_run_item_id, 'state', p_state,
                       'run_completed', all_finished, 'linked_ops_entry_id', linked_entry_id)
  );
  result := jsonb_build_object('run_id', target_run_id, 'run_item_id', p_run_item_id,
    'state', p_state, 'changed', true, 'run_completed', all_finished,
    'linked_ops_entry_id', linked_entry_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_review_checklist_run(
  p_workspace_id uuid, p_request_id uuid, p_run_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; row_status text; prior_review timestamptz;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.checklist.run.review');
  if not request_is_new then return result; end if;
  select status, reviewed_at into row_status, prior_review from public.ops_checklist_runs
  where workspace_id = p_workspace_id and id = p_run_id for update;
  if not found then raise exception 'checklist run not found' using errcode = 'P0002'; end if;
  if row_status = 'open' then raise exception 'complete every checklist item before review' using errcode = '55000'; end if;
  if prior_review is null then
    update public.ops_checklist_runs set status = 'reviewed',
      reviewed_by_membership_id = actor_id, reviewed_at = transaction_timestamp()
    where workspace_id = p_workspace_id and id = p_run_id;
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'ops.checklist_run_reviewed',
      'ops_checklist_run', p_run_id, '{}'::jsonb
    );
  end if;
  result := jsonb_build_object('run_id', p_run_id, 'status', 'reviewed',
                               'changed', prior_review is null);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

revoke all on function public.guard_ops_checklist_template_change() from public, anon, authenticated;
revoke all on function public.guard_ops_checklist_run_change() from public, anon, authenticated;
revoke all on function public.guard_ops_checklist_run_item_change() from public, anon, authenticated;
revoke all on function public.rpc_ops_create_checklist_template(uuid, uuid, text, uuid, uuid, text, text, text[], boolean[]) from public, anon;
revoke all on function public.rpc_ops_set_checklist_template_active(uuid, uuid, uuid, boolean) from public, anon;
revoke all on function public.rpc_ops_start_checklist_run(uuid, uuid, uuid, uuid, date, uuid) from public, anon;
revoke all on function public.rpc_ops_set_checklist_run_item(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_ops_review_checklist_run(uuid, uuid, uuid) from public, anon;
grant execute on function public.rpc_ops_create_checklist_template(uuid, uuid, text, uuid, uuid, text, text, text[], boolean[]) to authenticated;
grant execute on function public.rpc_ops_set_checklist_template_active(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.rpc_ops_start_checklist_run(uuid, uuid, uuid, uuid, date, uuid) to authenticated;
grant execute on function public.rpc_ops_set_checklist_run_item(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.rpc_ops_review_checklist_run(uuid, uuid, uuid) to authenticated;

comment on table public.ops_checklist_templates is
  'Reusable lightweight operational checklist definitions. Definition changes create a new template; active is the only mutable field.';
comment on table public.ops_checklist_runs is
  'Retained manual checklist executions with completion and explicit manager review.';
comment on table public.ops_checklist_run_item_events is
  'Append-only checklist item transition history, including atomic exception-task linkage.';

notify pgrst, 'reload schema';
