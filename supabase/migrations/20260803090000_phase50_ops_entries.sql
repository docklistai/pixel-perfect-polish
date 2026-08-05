-- Phase 50 — operational entries, immutable history, and idempotent writes.
-- Ops remains manager-only. Authenticated clients receive SELECT grants only;
-- every write is an atomic SECURITY DEFINER RPC with an empty search_path.

create table public.ops_rpc_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  actor_membership_id uuid not null,
  request_id uuid not null,
  action text not null check (length(btrim(action)) between 1 and 120),
  response jsonb,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, actor_membership_id, request_id),
  foreign key (workspace_id, actor_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (response is null or jsonb_typeof(response) = 'object')
);

create table public.ops_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entry_type text not null check (
    entry_type in ('task', 'incident', 'maintenance', 'service_request', 'note')
  ),
  parent_entry_id uuid,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text check (
    description is null or length(btrim(description)) between 1 and 4000
  ),
  location_id uuid not null,
  area_label text check (area_label is null or length(btrim(area_label)) between 1 and 120),
  department_id uuid,
  rota_week_id uuid,
  shift_id uuid,
  subject_staff_member_id uuid,
  leave_request_id uuid,
  assigned_staff_member_id uuid,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'archived')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  occurred_at timestamptz,
  immediate_action text check (
    immediate_action is null or length(btrim(immediate_action)) between 1 and 2000
  ),
  logged_at timestamptz not null default transaction_timestamp(),
  due_at timestamptz,
  pinned_at timestamptz,
  created_by_membership_id uuid not null,
  resolved_by_membership_id uuid,
  resolved_at timestamptz,
  resolution_note text check (
    resolution_note is null or length(btrim(resolution_note)) between 1 and 2000
  ),
  archived_by_membership_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, parent_entry_id)
    references public.ops_entries (workspace_id, id) on delete restrict,
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict,
  foreign key (workspace_id, department_id)
    references public.departments (workspace_id, id) on delete restrict,
  foreign key (workspace_id, rota_week_id)
    references public.rota_weeks (workspace_id, id) on delete set null (rota_week_id),
  foreign key (workspace_id, shift_id)
    references public.shifts (workspace_id, id) on delete set null (shift_id),
  foreign key (workspace_id, subject_staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, leave_request_id)
    references public.leave_requests (workspace_id, id) on delete restrict,
  foreign key (workspace_id, assigned_staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, created_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, resolved_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, archived_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (entry_type = 'incident' or (
    severity is null and occurred_at is null and immediate_action is null
  )),
  check (entry_type <> 'incident' or (severity is not null and occurred_at is not null)),
  check ((resolved_at is null) = (resolved_by_membership_id is null)),
  check (status <> 'resolved' or resolved_at is not null),
  check (status not in ('open', 'in_progress') or resolved_at is null),
  check ((status = 'archived') = (archived_at is not null)),
  check ((status = 'archived') = (archived_by_membership_id is not null)),
  check (shift_id is null or rota_week_id is not null),
  check (parent_entry_id is null or entry_type = 'task')
);

create table public.ops_entry_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ops_entry_id uuid not null,
  actor_membership_id uuid not null,
  request_id uuid not null,
  event_type text not null check (event_type in (
    'created', 'updated', 'assigned', 'status_changed', 'note_added',
    'resolved', 'reopened', 'archived', 'pinned', 'unpinned'
  )),
  resulting_status text not null
    check (resulting_status in ('open', 'in_progress', 'resolved', 'archived')),
  note text check (note is null or length(btrim(note)) between 1 and 2000),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, actor_membership_id, request_id),
  foreign key (workspace_id, ops_entry_id)
    references public.ops_entries (workspace_id, id) on delete restrict,
  foreign key (workspace_id, actor_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (event_type <> 'note_added' or note is not null)
);

create index ops_rpc_requests_workspace_actor_idx
  on public.ops_rpc_requests (workspace_id, actor_membership_id, created_at desc);
create index ops_rpc_requests_completed_retention_idx
  on public.ops_rpc_requests (created_at)
  where response is not null;
create index ops_entries_workspace_location_logged_idx
  on public.ops_entries (workspace_id, location_id, logged_at desc)
  where status <> 'archived';
create index ops_entries_workspace_department_idx
  on public.ops_entries (workspace_id, department_id)
  where department_id is not null;
create index ops_entries_workspace_type_status_idx
  on public.ops_entries (workspace_id, entry_type, status, logged_at desc);
create index ops_entries_workspace_due_idx
  on public.ops_entries (workspace_id, due_at)
  where status in ('open', 'in_progress') and due_at is not null;
create index ops_entries_workspace_assignee_idx
  on public.ops_entries (workspace_id, assigned_staff_member_id, status)
  where assigned_staff_member_id is not null;
create index ops_entries_workspace_parent_idx
  on public.ops_entries (workspace_id, parent_entry_id)
  where parent_entry_id is not null;
create index ops_entries_workspace_shift_idx
  on public.ops_entries (workspace_id, shift_id) where shift_id is not null;
create index ops_entries_workspace_week_idx
  on public.ops_entries (workspace_id, rota_week_id) where rota_week_id is not null;
create index ops_entries_workspace_subject_staff_idx
  on public.ops_entries (workspace_id, subject_staff_member_id)
  where subject_staff_member_id is not null;
create index ops_entries_workspace_leave_idx
  on public.ops_entries (workspace_id, leave_request_id) where leave_request_id is not null;
create index ops_entries_workspace_creator_idx
  on public.ops_entries (workspace_id, created_by_membership_id, logged_at desc);
create index ops_entries_workspace_resolver_idx
  on public.ops_entries (workspace_id, resolved_by_membership_id)
  where resolved_by_membership_id is not null;
create index ops_entries_workspace_archiver_idx
  on public.ops_entries (workspace_id, archived_by_membership_id)
  where archived_by_membership_id is not null;
create index ops_entry_events_workspace_entry_time_idx
  on public.ops_entry_events (workspace_id, ops_entry_id, occurred_at);

create or replace function public.guard_ops_rpc_request_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('app.ops_receipt_cleanup', true) = 'on'
       and old.response is not null
       and old.created_at < transaction_timestamp() - interval '90 days' then
      return old;
    end if;
    raise exception 'ops rpc request receipts are immutable' using errcode = '55000';
  end if;
  if row(new.id, new.workspace_id, new.actor_membership_id, new.request_id,
         new.action, new.created_at)
     is distinct from
     row(old.id, old.workspace_id, old.actor_membership_id, old.request_id,
         old.action, old.created_at)
     or old.response is not null
     or new.response is null then
    raise exception 'ops rpc request receipt identity and completed response are immutable'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_ops_entry_parent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.parent_entry_id is not null then
    if new.parent_entry_id = new.id then
      raise exception 'an ops entry cannot follow itself' using errcode = '55000';
    end if;
    if exists (
      select 1 from public.ops_entries as parent
      where parent.workspace_id = new.workspace_id
        and parent.id = new.parent_entry_id
        and parent.parent_entry_id is not null
    ) or exists (
      select 1 from public.ops_entries as child
      where child.workspace_id = new.workspace_id
        and child.parent_entry_id = new.id
    ) then
      raise exception 'ops follow-ups may not be nested' using errcode = '55000';
    end if;
  end if;
  return new;
end;
$$;

create trigger ops_rpc_requests_guard_change
before update or delete on public.ops_rpc_requests
for each row execute function public.guard_ops_rpc_request_change();
create trigger ops_entries_set_updated_at
before update on public.ops_entries
for each row execute function public.set_updated_at();
create trigger ops_entries_protect_immutable
before update on public.ops_entries
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'entry_type', 'created_by_membership_id',
  'created_at', 'logged_at', 'occurred_at'
);
create trigger ops_entries_guard_parent
before insert or update of parent_entry_id on public.ops_entries
for each row execute function public.guard_ops_entry_parent();
create trigger ops_entry_events_reject_changes
before update or delete on public.ops_entry_events
for each row execute function public.reject_immutable_row_change();

alter table public.ops_rpc_requests enable row level security;
alter table public.ops_entries enable row level security;
alter table public.ops_entry_events enable row level security;
revoke all on table public.ops_rpc_requests from public, anon, authenticated;
revoke all on table public.ops_entries from public, anon, authenticated;
revoke all on table public.ops_entry_events from public, anon, authenticated;
grant select on table public.ops_entries, public.ops_entry_events to authenticated;
create policy ops_entries_manager_select on public.ops_entries
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_entry_events_manager_select on public.ops_entry_events
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create or replace function public.rpc_ops_claim_request(
  p_workspace_id uuid, p_actor_membership_id uuid, p_request_id uuid, p_action text,
  out o_is_new boolean, out o_response jsonb
)
language plpgsql volatile security definer set search_path = '' as $$
declare claimed_id uuid; existing_action text;
begin
  if p_request_id is null then
    raise exception 'request_id is required' using errcode = '22023';
  end if;
  perform set_config('app.ops_receipt_cleanup', 'on', true);
  delete from public.ops_rpc_requests as receipt
  where receipt.id in (
    select expired.id from public.ops_rpc_requests as expired
    where expired.response is not null
      and expired.created_at < transaction_timestamp() - interval '90 days'
    order by expired.created_at
    limit 1000
  );
  perform set_config('app.ops_receipt_cleanup', 'off', true);
  insert into public.ops_rpc_requests (
    workspace_id, actor_membership_id, request_id, action
  ) values (p_workspace_id, p_actor_membership_id, p_request_id, p_action)
  on conflict (workspace_id, actor_membership_id, request_id) do nothing
  returning id into claimed_id;
  if claimed_id is not null then
    o_is_new := true; o_response := null; return;
  end if;
  select request.action, request.response into existing_action, o_response
  from public.ops_rpc_requests as request
  where request.workspace_id = p_workspace_id
    and request.actor_membership_id = p_actor_membership_id
    and request.request_id = p_request_id;
  if existing_action is distinct from p_action then
    raise exception 'request_id was already used for another action' using errcode = '55000';
  end if;
  if o_response is null then
    raise exception 'request is still being completed' using errcode = '55000';
  end if;
  o_is_new := false;
end;
$$;

create or replace function public.rpc_ops_finish_request(
  p_workspace_id uuid, p_actor_membership_id uuid, p_request_id uuid, p_response jsonb
)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.ops_rpc_requests set response = p_response
  where workspace_id = p_workspace_id
    and actor_membership_id = p_actor_membership_id
    and request_id = p_request_id and response is null;
  if not found then
    raise exception 'ops request receipt could not be completed' using errcode = '55000';
  end if;
end;
$$;

create or replace function public.rpc_ops_create_entry(
  p_workspace_id uuid, p_request_id uuid, p_entry_type text, p_title text,
  p_description text, p_location_id uuid, p_area_label text, p_department_id uuid,
  p_rota_week_id uuid, p_shift_id uuid, p_subject_staff_member_id uuid,
  p_leave_request_id uuid, p_assigned_staff_member_id uuid, p_due_at timestamptz,
  p_priority text, p_severity text, p_occurred_at timestamptz,
  p_immediate_action text, p_parent_entry_id uuid, p_create_follow_up boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; entry_id uuid; follow_up_id uuid;
  effective_location_id uuid := p_location_id;
  effective_department_id uuid := p_department_id;
  effective_week_id uuid := p_rota_week_id;
  effective_subject_id uuid := p_subject_staff_member_id;
  row_status text; assignee_membership_id uuid; recipient_ids uuid[];
  linked_location_id uuid; linked_subject_id uuid;
  event_request_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entry.create');
  if not request_is_new then return result; end if;
  if p_entry_type is null or p_entry_type not in
     ('task', 'incident', 'maintenance', 'service_request', 'note') then
    raise exception 'invalid ops entry type' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null or length(btrim(p_title)) > 200 then
    raise exception 'title is required and must be at most 200 characters' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_area_label, ''))) > 120 then
    raise exception 'area must be at most 120 characters' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_immediate_action, ''))) > 2000 then
    raise exception 'immediate action must be at most 2000 characters' using errcode = '22023';
  end if;
  if p_priority is null or p_priority not in ('low', 'normal', 'high', 'critical') then
    raise exception 'invalid ops priority' using errcode = '22023';
  end if;
  if p_create_follow_up is null then
    raise exception 'create_follow_up is required' using errcode = '22023';
  end if;
  if p_parent_entry_id is not null and p_create_follow_up then
    raise exception 'a follow-up cannot create another follow-up' using errcode = '55000';
  end if;
  if p_entry_type = 'incident' and
     (p_severity is null or p_severity not in ('low', 'medium', 'high', 'critical') or
      p_occurred_at is null) then
    raise exception 'incidents require severity and occurred_at' using errcode = '22023';
  end if;
  if p_entry_type <> 'incident' and
     (p_severity is not null or p_occurred_at is not null or p_immediate_action is not null) then
    raise exception 'incident fields are only valid for incidents' using errcode = '22023';
  end if;
  if p_shift_id is not null then
    select shift.location_id, shift.department_id, shift.rota_week_id, shift.staff_member_id
    into effective_location_id, effective_department_id, effective_week_id, effective_subject_id
    from public.shifts as shift
    where shift.workspace_id = p_workspace_id and shift.id = p_shift_id;
    if not found then raise exception 'shift not found in workspace' using errcode = 'P0002'; end if;
    if p_location_id is not null and p_location_id <> effective_location_id then
      raise exception 'entry location must match the linked shift' using errcode = '55000';
    end if;
  end if;
  if p_parent_entry_id is not null then
    select parent.location_id,
           coalesce(effective_department_id, parent.department_id),
           coalesce(effective_week_id, parent.rota_week_id),
           coalesce(effective_subject_id, parent.subject_staff_member_id)
    into effective_location_id, effective_department_id, effective_week_id, effective_subject_id
    from public.ops_entries as parent
    where parent.workspace_id = p_workspace_id and parent.id = p_parent_entry_id
      and parent.status <> 'archived';
    if found then
      perform 1 from public.ops_entries as locked_parent
      where locked_parent.workspace_id = p_workspace_id
        and locked_parent.id = p_parent_entry_id
      for update;
    end if;
    if not found then raise exception 'parent entry not found or archived' using errcode = 'P0002'; end if;
  end if;
  if p_leave_request_id is not null then
    select leave_request.staff_member_id into linked_subject_id
    from public.leave_requests as leave_request
    where leave_request.workspace_id = p_workspace_id and leave_request.id = p_leave_request_id;
    if not found then raise exception 'leave request not found in workspace' using errcode = 'P0002'; end if;
    if effective_subject_id is not null and effective_subject_id <> linked_subject_id then
      raise exception 'entry staff member must match the linked leave request' using errcode = '55000';
    end if;
    effective_subject_id := linked_subject_id;
  end if;
  if effective_location_id is null or not exists (
    select 1 from public.locations where workspace_id = p_workspace_id
      and id = effective_location_id and status = 'active'
  ) then raise exception 'active location is required' using errcode = '22023'; end if;
  if effective_week_id is not null then
    select rota_week.location_id into linked_location_id
    from public.rota_weeks as rota_week
    where rota_week.workspace_id = p_workspace_id and rota_week.id = effective_week_id;
    if not found then raise exception 'rota week not found in workspace' using errcode = 'P0002'; end if;
    if linked_location_id <> effective_location_id then
      raise exception 'entry location must match the linked rota week' using errcode = '55000';
    end if;
  end if;
  if p_assigned_staff_member_id is not null then
    select staff.employment_status, staff.membership_id
    into row_status, assignee_membership_id
    from public.staff_members as staff
    where staff.workspace_id = p_workspace_id and staff.id = p_assigned_staff_member_id
    for key share;
    if row_status is null then raise exception 'assignee not found in workspace' using errcode = 'P0002'; end if;
    if row_status <> 'active' then raise exception 'assignee must be active' using errcode = '55000'; end if;
  end if;
  insert into public.ops_entries (
    workspace_id, entry_type, parent_entry_id, title, description, location_id,
    area_label, department_id, rota_week_id, shift_id, subject_staff_member_id,
    leave_request_id, assigned_staff_member_id, due_at, priority, severity,
    occurred_at, immediate_action, created_by_membership_id
  ) values (
    p_workspace_id, p_entry_type, p_parent_entry_id, btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''), effective_location_id,
    nullif(btrim(coalesce(p_area_label, '')), ''), effective_department_id,
    effective_week_id, p_shift_id, effective_subject_id, p_leave_request_id,
    p_assigned_staff_member_id, p_due_at, p_priority, p_severity, p_occurred_at,
    nullif(btrim(coalesce(p_immediate_action, '')), ''), actor_id
  ) returning id, status into entry_id, row_status;
  insert into public.ops_entry_events (
    workspace_id, ops_entry_id, actor_membership_id, request_id,
    event_type, resulting_status, details
  ) values (
    p_workspace_id, entry_id, actor_id, p_request_id, 'created', row_status,
    jsonb_build_object('entry_type', p_entry_type, 'priority', p_priority)
  );
  if p_create_follow_up then
    insert into public.ops_entries (
      workspace_id, entry_type, parent_entry_id, title, description, location_id,
      area_label, department_id, rota_week_id, shift_id, subject_staff_member_id,
      leave_request_id, assigned_staff_member_id, priority, created_by_membership_id
    ) values (
      p_workspace_id, 'task', entry_id, left('Follow up: ' || btrim(p_title), 200),
      'Follow-up created with the source operational entry.', effective_location_id,
      nullif(btrim(coalesce(p_area_label, '')), ''), effective_department_id,
      effective_week_id, p_shift_id, effective_subject_id, p_leave_request_id,
      p_assigned_staff_member_id,
      case when p_priority = 'critical' then 'high' else p_priority end, actor_id
    ) returning id into follow_up_id;
    event_request_id := gen_random_uuid();
    insert into public.ops_entry_events (
      workspace_id, ops_entry_id, actor_membership_id, request_id,
      event_type, resulting_status, details
    ) values (
      p_workspace_id, follow_up_id, actor_id, event_request_id, 'created', 'open',
      jsonb_build_object('entry_type', 'task', 'parent_entry_id', entry_id)
    );
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'ops.entry_created', 'ops_entry', follow_up_id,
      jsonb_build_object('entry_type', 'task', 'location_id', effective_location_id,
                         'parent_entry_id', entry_id)
    );
  end if;
  if assignee_membership_id is not null and assignee_membership_id <> actor_id and exists (
    select 1 from public.workspace_memberships as membership
    where membership.workspace_id = p_workspace_id and membership.id = assignee_membership_id
      and membership.status = 'active' and membership.role in ('owner', 'manager')
  ) then
    perform public.rpc_internal_notify(
      p_workspace_id, actor_id, 'ops_assigned', 'Ops item assigned', btrim(p_title),
      'ops_entry', entry_id, array[assignee_membership_id]
    );
  end if;
  if p_priority in ('high', 'critical') then
    select coalesce(array_agg(membership.id order by membership.id), array[]::uuid[])
    into recipient_ids from public.workspace_memberships as membership
    where membership.workspace_id = p_workspace_id and membership.status = 'active'
      and membership.role in ('owner', 'manager') and membership.id <> actor_id
      and membership.id is distinct from assignee_membership_id;
    if cardinality(recipient_ids) > 0 then
      perform public.rpc_internal_notify(
        p_workspace_id, actor_id, 'ops_priority', 'Priority Ops item logged', btrim(p_title),
        'ops_entry', entry_id, recipient_ids
      );
    end if;
  end if;
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'ops.entry_created', 'ops_entry', entry_id,
    jsonb_build_object('entry_type', p_entry_type, 'location_id', effective_location_id)
  );
  result := jsonb_build_object('entry_id', entry_id, 'status', row_status,
                               'follow_up_entry_id', follow_up_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_update_entry(
  p_workspace_id uuid, p_request_id uuid, p_entry_id uuid, p_title text,
  p_description text, p_area_label text, p_department_id uuid, p_rota_week_id uuid,
  p_shift_id uuid, p_subject_staff_member_id uuid, p_leave_request_id uuid,
  p_assigned_staff_member_id uuid, p_due_at timestamptz, p_priority text, p_severity text,
  p_immediate_action text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; row_type text; row_status text;
  row_location_id uuid; effective_department_id uuid := p_department_id;
  effective_week_id uuid := p_rota_week_id; effective_subject_id uuid := p_subject_staff_member_id;
  linked_location_id uuid; linked_subject_id uuid;
  old_priority text; old_assignee uuid; assignee_status text; assignee_membership uuid;
  priority_recipients uuid[];
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entry.update');
  if not request_is_new then return result; end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null or length(btrim(p_title)) > 200 then
    raise exception 'title is required and must be at most 200 characters' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_area_label, ''))) > 120 then
    raise exception 'area must be at most 120 characters' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_immediate_action, ''))) > 2000 then
    raise exception 'immediate action must be at most 2000 characters' using errcode = '22023';
  end if;
  if p_priority not in ('low', 'normal', 'high', 'critical') then
    raise exception 'invalid ops priority' using errcode = '22023';
  end if;
  select entry_type, status, location_id, priority, assigned_staff_member_id
  into row_type, row_status, row_location_id, old_priority, old_assignee
  from public.ops_entries
  where workspace_id = p_workspace_id and id = p_entry_id for update;
  if not found then raise exception 'ops entry not found' using errcode = 'P0002'; end if;
  if row_status in ('resolved', 'archived') then
    raise exception 'reopen the entry before editing it' using errcode = '55000';
  end if;
  if row_type = 'incident' and
     (p_severity is null or p_severity not in ('low', 'medium', 'high', 'critical')) then
    raise exception 'incidents require severity' using errcode = '22023';
  end if;
  if row_type <> 'incident' and (p_severity is not null or p_immediate_action is not null) then
    raise exception 'incident fields are only valid for incidents' using errcode = '22023';
  end if;
  if p_shift_id is not null then
    select shift.location_id, shift.department_id, shift.rota_week_id, shift.staff_member_id
    into linked_location_id, effective_department_id, effective_week_id, effective_subject_id
    from public.shifts as shift
    where shift.workspace_id = p_workspace_id and shift.id = p_shift_id;
    if not found then raise exception 'shift not found in workspace' using errcode = 'P0002'; end if;
    if linked_location_id <> row_location_id then
      raise exception 'entry location must match the linked shift' using errcode = '55000';
    end if;
  end if;
  if p_leave_request_id is not null then
    select leave_request.staff_member_id into linked_subject_id
    from public.leave_requests as leave_request
    where leave_request.workspace_id = p_workspace_id and leave_request.id = p_leave_request_id;
    if not found then raise exception 'leave request not found in workspace' using errcode = 'P0002'; end if;
    if effective_subject_id is not null and effective_subject_id <> linked_subject_id then
      raise exception 'entry staff member must match the linked leave request' using errcode = '55000';
    end if;
    effective_subject_id := linked_subject_id;
  end if;
  if effective_week_id is not null then
    select rota_week.location_id into linked_location_id
    from public.rota_weeks as rota_week
    where rota_week.workspace_id = p_workspace_id and rota_week.id = effective_week_id;
    if not found then raise exception 'rota week not found in workspace' using errcode = 'P0002'; end if;
    if linked_location_id <> row_location_id then
      raise exception 'entry location must match the linked rota week' using errcode = '55000';
    end if;
  end if;
  if p_assigned_staff_member_id is not null then
    select staff.employment_status, staff.membership_id
    into assignee_status, assignee_membership
    from public.staff_members as staff
    where staff.workspace_id = p_workspace_id and staff.id = p_assigned_staff_member_id
    for update;
    if not found then raise exception 'assignee not found in workspace' using errcode = 'P0002'; end if;
    if assignee_status <> 'active' then raise exception 'assignee must be active' using errcode = '55000'; end if;
  end if;
  update public.ops_entries set
    title = btrim(p_title), description = nullif(btrim(coalesce(p_description, '')), ''),
    area_label = nullif(btrim(coalesce(p_area_label, '')), ''), department_id = effective_department_id,
    rota_week_id = effective_week_id, shift_id = p_shift_id,
    subject_staff_member_id = effective_subject_id, leave_request_id = p_leave_request_id,
    assigned_staff_member_id = p_assigned_staff_member_id,
    due_at = p_due_at, priority = p_priority, severity = p_severity,
    immediate_action = nullif(btrim(coalesce(p_immediate_action, '')), '')
  where workspace_id = p_workspace_id and id = p_entry_id;
  insert into public.ops_entry_events (
    workspace_id, ops_entry_id, actor_membership_id, request_id,
    event_type, resulting_status, details
  ) values (
    p_workspace_id, p_entry_id, actor_id, p_request_id, 'updated', row_status,
    jsonb_build_object('previous_priority', old_priority, 'priority', p_priority,
      'previous_staff_member_id', old_assignee,
      'staff_member_id', p_assigned_staff_member_id)
  );
  if old_assignee is distinct from p_assigned_staff_member_id
     and assignee_membership is not null and assignee_membership <> actor_id
     and exists (
       select 1 from public.workspace_memberships as membership
       where membership.workspace_id = p_workspace_id
         and membership.id = assignee_membership
         and membership.status = 'active' and membership.role in ('owner', 'manager')
     ) then
    perform public.rpc_internal_notify(
      p_workspace_id, actor_id, 'ops_assigned', 'Ops item assigned', btrim(p_title),
      'ops_entry', p_entry_id, array[assignee_membership]
    );
  end if;
  if p_priority in ('high', 'critical') and old_priority is distinct from p_priority then
    select coalesce(array_agg(membership.id order by membership.id), array[]::uuid[])
    into priority_recipients
    from public.workspace_memberships as membership
    where membership.workspace_id = p_workspace_id and membership.status = 'active'
      and membership.role in ('owner', 'manager') and membership.id <> actor_id
      and membership.id is distinct from assignee_membership;
    if cardinality(priority_recipients) > 0 then
      perform public.rpc_internal_notify(
        p_workspace_id, actor_id, 'ops_priority', 'Ops item priority changed', btrim(p_title),
        'ops_entry', p_entry_id, priority_recipients
      );
    end if;
  end if;
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'ops.entry_updated', 'ops_entry', p_entry_id,
    jsonb_build_object('previous_priority', old_priority, 'priority', p_priority,
      'previous_staff_member_id', old_assignee, 'staff_member_id', p_assigned_staff_member_id)
  );
  result := jsonb_build_object('entry_id', p_entry_id, 'status', row_status);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_set_entry_status(
  p_workspace_id uuid, p_request_id uuid, p_entry_id uuid,
  p_status text, p_resolution_note text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; old_status text;
  event_name text; action_name text; creator_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entry.status');
  if not request_is_new then return result; end if;
  if p_status not in ('open', 'in_progress', 'resolved') then
    raise exception 'status must be open, in_progress, or resolved' using errcode = '22023';
  end if;
  select status, created_by_membership_id into old_status, creator_id
  from public.ops_entries where workspace_id = p_workspace_id and id = p_entry_id for update;
  if not found then raise exception 'ops entry not found' using errcode = 'P0002'; end if;
  if old_status = 'archived' then raise exception 'archived entries cannot change status' using errcode = '55000'; end if;
  if old_status = p_status then
    result := jsonb_build_object('entry_id', p_entry_id, 'status', old_status, 'changed', false);
    perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
    return result;
  end if;
  if old_status = 'resolved' and p_status <> 'open' then
    raise exception 'resolved entries must be reopened before another transition' using errcode = '55000';
  end if;
  event_name := case when p_status = 'resolved' then 'resolved'
                     when old_status = 'resolved' then 'reopened'
                     else 'status_changed' end;
  action_name := case when p_status = 'resolved' then 'ops.entry_resolved'
                      when old_status = 'resolved' then 'ops.entry_reopened'
                      else 'ops.entry_status_changed' end;
  update public.ops_entries set status = p_status,
    resolved_at = case when p_status = 'resolved' then transaction_timestamp() else null end,
    resolved_by_membership_id = case when p_status = 'resolved' then actor_id else null end,
    resolution_note = case when p_status = 'resolved'
      then nullif(btrim(coalesce(p_resolution_note, '')), '') else null end
  where workspace_id = p_workspace_id and id = p_entry_id;
  insert into public.ops_entry_events (
    workspace_id, ops_entry_id, actor_membership_id, request_id,
    event_type, resulting_status, note, details
  ) values (
    p_workspace_id, p_entry_id, actor_id, p_request_id, event_name, p_status,
    case when p_status = 'resolved' then nullif(btrim(coalesce(p_resolution_note, '')), '') end,
    jsonb_build_object('previous_status', old_status)
  );
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, action_name, 'ops_entry', p_entry_id,
    jsonb_build_object('previous_status', old_status, 'status', p_status)
  );
  if p_status = 'resolved' and creator_id <> actor_id then
    perform public.rpc_internal_notify(
      p_workspace_id, actor_id, 'ops_entry_resolved', 'Ops item resolved',
      (select title from public.ops_entries where workspace_id = p_workspace_id and id = p_entry_id),
      'ops_entry', p_entry_id, array[creator_id]
    );
  end if;
  result := jsonb_build_object('entry_id', p_entry_id, 'status', p_status, 'changed', true);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_assign_entry(
  p_workspace_id uuid, p_request_id uuid, p_entry_id uuid, p_staff_member_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; row_status text;
  old_assignee uuid; assignee_status text; assignee_membership uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entry.assign');
  if not request_is_new then return result; end if;
  select status, assigned_staff_member_id into row_status, old_assignee
  from public.ops_entries where workspace_id = p_workspace_id and id = p_entry_id for update;
  if not found then raise exception 'ops entry not found' using errcode = 'P0002'; end if;
  if row_status not in ('open', 'in_progress') then
    raise exception 'only unresolved entries can be assigned' using errcode = '55000';
  end if;
  if p_staff_member_id is not null then
    select employment_status, membership_id into assignee_status, assignee_membership
    from public.staff_members where workspace_id = p_workspace_id and id = p_staff_member_id
    for key share;
    if not found then raise exception 'assignee not found in workspace' using errcode = 'P0002'; end if;
    if assignee_status <> 'active' then raise exception 'assignee must be active' using errcode = '55000'; end if;
  end if;
  if old_assignee is not distinct from p_staff_member_id then
    result := jsonb_build_object('entry_id', p_entry_id, 'changed', false);
    perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
    return result;
  end if;
  update public.ops_entries set assigned_staff_member_id = p_staff_member_id
  where workspace_id = p_workspace_id and id = p_entry_id;
  insert into public.ops_entry_events (
    workspace_id, ops_entry_id, actor_membership_id, request_id,
    event_type, resulting_status, details
  ) values (
    p_workspace_id, p_entry_id, actor_id, p_request_id, 'assigned', row_status,
    jsonb_build_object('previous_staff_member_id', old_assignee,
                       'staff_member_id', p_staff_member_id)
  );
  if assignee_membership is not null and assignee_membership <> actor_id and exists (
    select 1 from public.workspace_memberships where workspace_id = p_workspace_id
      and id = assignee_membership and status = 'active' and role in ('owner', 'manager')
  ) then
    perform public.rpc_internal_notify(
      p_workspace_id, actor_id, 'ops_assigned', 'Ops item assigned',
      (select title from public.ops_entries where workspace_id = p_workspace_id and id = p_entry_id),
      'ops_entry', p_entry_id, array[assignee_membership]
    );
  end if;
  result := jsonb_build_object('entry_id', p_entry_id, 'changed', true);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_pin_entry(
  p_workspace_id uuid, p_request_id uuid, p_entry_id uuid, p_pinned boolean
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; row_status text; was_pinned boolean;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entry.pin');
  if not request_is_new then return result; end if;
  if p_pinned is null then raise exception 'pinned state is required' using errcode = '22023'; end if;
  select status, pinned_at is not null into row_status, was_pinned
  from public.ops_entries where workspace_id = p_workspace_id and id = p_entry_id for update;
  if not found then raise exception 'ops entry not found' using errcode = 'P0002'; end if;
  if row_status not in ('open', 'in_progress') then
    raise exception 'only unresolved entries can be pinned' using errcode = '55000';
  end if;
  if was_pinned is distinct from p_pinned then
    update public.ops_entries set pinned_at = case when p_pinned then transaction_timestamp() end
    where workspace_id = p_workspace_id and id = p_entry_id;
    insert into public.ops_entry_events (
      workspace_id, ops_entry_id, actor_membership_id, request_id,
      event_type, resulting_status
    ) values (
      p_workspace_id, p_entry_id, actor_id, p_request_id,
      case when p_pinned then 'pinned' else 'unpinned' end, row_status
    );
  end if;
  result := jsonb_build_object('entry_id', p_entry_id, 'pinned', p_pinned,
                               'changed', was_pinned is distinct from p_pinned);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_archive_entry(
  p_workspace_id uuid, p_request_id uuid, p_entry_id uuid, p_reason text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; old_status text;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entry.archive');
  if not request_is_new then return result; end if;
  select status into old_status from public.ops_entries
  where workspace_id = p_workspace_id and id = p_entry_id for update;
  if not found then raise exception 'ops entry not found' using errcode = 'P0002'; end if;
  if old_status = 'archived' then
    result := jsonb_build_object('entry_id', p_entry_id, 'status', 'archived', 'changed', false);
    perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
    return result;
  end if;
  update public.ops_entries set status = 'archived', archived_at = transaction_timestamp(),
    archived_by_membership_id = actor_id
  where workspace_id = p_workspace_id and id = p_entry_id;
  insert into public.ops_entry_events (
    workspace_id, ops_entry_id, actor_membership_id, request_id,
    event_type, resulting_status, note, details
  ) values (
    p_workspace_id, p_entry_id, actor_id, p_request_id, 'archived', 'archived',
    nullif(btrim(coalesce(p_reason, '')), ''), jsonb_build_object('previous_status', old_status)
  );
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'ops.entry_archived', 'ops_entry', p_entry_id,
    jsonb_build_object('previous_status', old_status)
  );
  result := jsonb_build_object('entry_id', p_entry_id, 'status', 'archived', 'changed', true);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_add_entry_note(
  p_workspace_id uuid, p_request_id uuid, p_entry_id uuid, p_note text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; row_status text; event_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.entry.note');
  if not request_is_new then return result; end if;
  if nullif(btrim(coalesce(p_note, '')), '') is null or length(btrim(p_note)) > 2000 then
    raise exception 'note is required and must be at most 2000 characters' using errcode = '22023';
  end if;
  select status into row_status from public.ops_entries
  where workspace_id = p_workspace_id and id = p_entry_id for key share;
  if not found then raise exception 'ops entry not found' using errcode = 'P0002'; end if;
  if row_status = 'archived' then raise exception 'archived entries cannot receive notes' using errcode = '55000'; end if;
  insert into public.ops_entry_events (
    workspace_id, ops_entry_id, actor_membership_id, request_id,
    event_type, resulting_status, note
  ) values (
    p_workspace_id, p_entry_id, actor_id, p_request_id,
    'note_added', row_status, btrim(p_note)
  ) returning id into event_id;
  result := jsonb_build_object('entry_id', p_entry_id, 'event_id', event_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

revoke all on function public.rpc_ops_claim_request(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.rpc_ops_finish_request(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.guard_ops_rpc_request_change() from public, anon, authenticated;
revoke all on function public.guard_ops_entry_parent() from public, anon, authenticated;
revoke all on function public.rpc_ops_create_entry(uuid, uuid, text, text, text, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text, text, timestamptz, text, uuid, boolean) from public, anon;
revoke all on function public.rpc_ops_update_entry(uuid, uuid, uuid, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text, text, text) from public, anon;
revoke all on function public.rpc_ops_set_entry_status(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_ops_assign_entry(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_ops_pin_entry(uuid, uuid, uuid, boolean) from public, anon;
revoke all on function public.rpc_ops_archive_entry(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.rpc_ops_add_entry_note(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.rpc_ops_create_entry(uuid, uuid, text, text, text, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text, text, timestamptz, text, uuid, boolean) to authenticated;
grant execute on function public.rpc_ops_update_entry(uuid, uuid, uuid, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text, text, text) to authenticated;
grant execute on function public.rpc_ops_set_entry_status(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.rpc_ops_assign_entry(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_ops_pin_entry(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.rpc_ops_archive_entry(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.rpc_ops_add_entry_note(uuid, uuid, uuid, text) to authenticated;

comment on table public.ops_entries is
  'Manager operational log. Entries are workspace/location scoped; delete is archive; staff have no read policy.';
comment on table public.ops_entry_events is
  'Append-only lifecycle and manager-note history for an Ops entry.';
comment on table public.ops_rpc_requests is
  'Internal idempotency receipts. A request UUID is scoped to workspace, actor, and action; no client table grants.';

notify pgrst, 'reload schema';
