-- Phase 50 — manager-to-manager handovers and operational briefings.
-- Team remains the only staff-broadcast surface. These records and their
-- acknowledgement state are visible only to workspace owners/managers.

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'shift_changed', 'rota_published', 'leave_approved', 'leave_declined',
  'leave_cancelled', 'announcement', 'timesheet_reminder', 'open_shift_update',
  'shift_release_update', 'unavailability_update', 'rota_update_required',
  'ops_assigned', 'ops_priority', 'ops_entry_resolved', 'ops_handover_issued',
  'ops_briefing_issued', 'ops_checklist_exception'
));

create table public.ops_handovers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  location_id uuid not null,
  rota_week_id uuid,
  handover_date date not null,
  from_membership_id uuid not null,
  notes text not null check (length(btrim(notes)) between 1 and 4000),
  issued_at timestamptz not null default transaction_timestamp(),
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict,
  foreign key (workspace_id, rota_week_id)
    references public.rota_weeks (workspace_id, id) on delete set null (rota_week_id),
  foreign key (workspace_id, from_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create table public.ops_handover_recipients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  handover_id uuid not null,
  recipient_membership_id uuid not null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, handover_id, recipient_membership_id),
  foreign key (workspace_id, handover_id)
    references public.ops_handovers (workspace_id, id) on delete restrict,
  foreign key (workspace_id, recipient_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create table public.ops_handover_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  handover_id uuid not null,
  ops_entry_id uuid not null,
  carried_forward boolean not null default false,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, handover_id, ops_entry_id),
  foreign key (workspace_id, handover_id)
    references public.ops_handovers (workspace_id, id) on delete restrict,
  foreign key (workspace_id, ops_entry_id)
    references public.ops_entries (workspace_id, id) on delete restrict
);

create table public.ops_briefings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  location_id uuid not null,
  briefing_date date not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  summary text not null check (length(btrim(summary)) between 1 and 6000),
  authored_by_membership_id uuid not null,
  issued_at timestamptz not null default transaction_timestamp(),
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict,
  foreign key (workspace_id, authored_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create table public.ops_briefing_recipients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  briefing_id uuid not null,
  recipient_membership_id uuid not null,
  read_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, briefing_id, recipient_membership_id),
  foreign key (workspace_id, briefing_id)
    references public.ops_briefings (workspace_id, id) on delete restrict,
  foreign key (workspace_id, recipient_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (acknowledged_at is null or read_at is not null)
);

create table public.ops_briefing_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  briefing_id uuid not null,
  ops_entry_id uuid not null,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, briefing_id, ops_entry_id),
  foreign key (workspace_id, briefing_id)
    references public.ops_briefings (workspace_id, id) on delete restrict,
  foreign key (workspace_id, ops_entry_id)
    references public.ops_entries (workspace_id, id) on delete restrict
);

create index ops_handovers_workspace_location_date_idx
  on public.ops_handovers (workspace_id, location_id, handover_date desc, issued_at desc);
create index ops_handovers_workspace_sender_idx
  on public.ops_handovers (workspace_id, from_membership_id, issued_at desc);
create index ops_handovers_workspace_week_idx
  on public.ops_handovers (workspace_id, rota_week_id)
  where rota_week_id is not null;
create index ops_handover_recipients_workspace_recipient_idx
  on public.ops_handover_recipients
    (workspace_id, recipient_membership_id, acknowledged_at, created_at desc);
create index ops_handover_items_workspace_entry_idx
  on public.ops_handover_items (workspace_id, ops_entry_id, created_at desc);
create index ops_briefings_workspace_location_date_idx
  on public.ops_briefings (workspace_id, location_id, briefing_date desc, issued_at desc);
create index ops_briefings_workspace_author_idx
  on public.ops_briefings (workspace_id, authored_by_membership_id, issued_at desc);
create index ops_briefing_recipients_workspace_recipient_idx
  on public.ops_briefing_recipients
    (workspace_id, recipient_membership_id, acknowledged_at, created_at desc);
create index ops_briefing_items_workspace_entry_idx
  on public.ops_briefing_items (workspace_id, ops_entry_id, created_at desc);

create or replace function public.guard_ops_handover_recipient_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ops handover recipients are retained' using errcode = '55000';
  end if;
  if row(new.id, new.workspace_id, new.handover_id, new.recipient_membership_id, new.created_at)
     is distinct from
     row(old.id, old.workspace_id, old.handover_id, old.recipient_membership_id, old.created_at)
     or (old.acknowledged_at is not null and new.acknowledged_at is distinct from old.acknowledged_at)
  then raise exception 'ops handover recipient identity and acknowledgement are immutable'
    using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_ops_briefing_recipient_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ops briefing recipients are retained' using errcode = '55000';
  end if;
  if row(new.id, new.workspace_id, new.briefing_id, new.recipient_membership_id, new.created_at)
     is distinct from
     row(old.id, old.workspace_id, old.briefing_id, old.recipient_membership_id, old.created_at)
     or (old.read_at is not null and new.read_at is distinct from old.read_at)
     or (old.acknowledged_at is not null and new.acknowledged_at is distinct from old.acknowledged_at)
  then raise exception 'ops briefing recipient identity and read state are immutable'
    using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger ops_handovers_reject_changes before update or delete on public.ops_handovers
for each row execute function public.reject_immutable_row_change();
create trigger ops_handover_recipients_guard_change
before update or delete on public.ops_handover_recipients
for each row execute function public.guard_ops_handover_recipient_change();
create trigger ops_handover_items_reject_changes before update or delete on public.ops_handover_items
for each row execute function public.reject_immutable_row_change();
create trigger ops_briefings_reject_changes before update or delete on public.ops_briefings
for each row execute function public.reject_immutable_row_change();
create trigger ops_briefing_recipients_guard_change
before update or delete on public.ops_briefing_recipients
for each row execute function public.guard_ops_briefing_recipient_change();
create trigger ops_briefing_items_reject_changes before update or delete on public.ops_briefing_items
for each row execute function public.reject_immutable_row_change();

alter table public.ops_handovers enable row level security;
alter table public.ops_handover_recipients enable row level security;
alter table public.ops_handover_items enable row level security;
alter table public.ops_briefings enable row level security;
alter table public.ops_briefing_recipients enable row level security;
alter table public.ops_briefing_items enable row level security;
revoke all on table public.ops_handovers, public.ops_handover_recipients,
  public.ops_handover_items, public.ops_briefings, public.ops_briefing_recipients,
  public.ops_briefing_items from public, anon, authenticated;
grant select on table public.ops_handovers, public.ops_handover_recipients,
  public.ops_handover_items, public.ops_briefings, public.ops_briefing_recipients,
  public.ops_briefing_items to authenticated;

create policy ops_handovers_manager_select on public.ops_handovers for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_handover_recipients_manager_select on public.ops_handover_recipients
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_handover_items_manager_select on public.ops_handover_items
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_briefings_manager_select on public.ops_briefings for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_briefing_recipients_manager_select on public.ops_briefing_recipients
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));
create policy ops_briefing_items_manager_select on public.ops_briefing_items
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create or replace function public.rpc_ops_create_handover(
  p_workspace_id uuid, p_request_id uuid, p_location_id uuid,
  p_handover_date date, p_rota_week_id uuid, p_notes text,
  p_recipient_membership_ids uuid[], p_entry_ids uuid[]
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; handover_id uuid;
  timezone_name text; expected_count integer; actual_count integer;
  recipient_count integer; item_count integer;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.handover.create');
  if not request_is_new then return result; end if;
  select location.timezone into timezone_name from public.locations as location
  where location.workspace_id = p_workspace_id and location.id = p_location_id
    and location.status = 'active';
  if timezone_name is null then raise exception 'active handover location is required' using errcode = '22023'; end if;
  if p_handover_date is distinct from (transaction_timestamp() at time zone timezone_name)::date then
    raise exception 'handover_date must be today at the location' using errcode = '55000';
  end if;
  if nullif(btrim(coalesce(p_notes, '')), '') is null or length(btrim(p_notes)) > 4000 then
    raise exception 'handover notes are required and must be at most 4000 characters'
      using errcode = '22023';
  end if;
  select count(distinct recipient_id) into expected_count
  from unnest(coalesce(p_recipient_membership_ids, array[]::uuid[])) as recipient_id;
  if expected_count = 0 then raise exception 'select at least one handover recipient' using errcode = '22023'; end if;
  perform 1 from public.workspace_memberships as membership
  where membership.workspace_id = p_workspace_id
    and membership.id = any(p_recipient_membership_ids)
  order by membership.id for update;
  select count(*) into actual_count from public.workspace_memberships as membership
  where membership.workspace_id = p_workspace_id and membership.status = 'active'
    and membership.role in ('owner', 'manager') and membership.id <> actor_id
    and membership.id = any(p_recipient_membership_ids);
  if actual_count <> expected_count then
    raise exception 'handover recipients must be other active managers in the workspace'
      using errcode = '55000';
  end if;
  recipient_count := actual_count;
  if p_rota_week_id is not null and not exists (
    select 1 from public.rota_weeks as week where week.workspace_id = p_workspace_id
      and week.id = p_rota_week_id and week.location_id = p_location_id
      and p_handover_date between week.week_start and week.week_start + 6
  ) then raise exception 'handover rota week does not match location and date' using errcode = '55000'; end if;
  select count(distinct entry_id) into expected_count
  from unnest(coalesce(p_entry_ids, array[]::uuid[])) as entry_id;
  perform 1 from public.ops_entries as entry
  where entry.workspace_id = p_workspace_id
    and entry.id = any(coalesce(p_entry_ids, array[]::uuid[]))
  order by entry.id for update;
  select count(*) into actual_count from public.ops_entries as entry
  where entry.workspace_id = p_workspace_id and entry.location_id = p_location_id
    and entry.status in ('open', 'in_progress') and entry.id = any(coalesce(p_entry_ids, array[]::uuid[]));
  if actual_count <> expected_count then
    raise exception 'handover items must be unresolved entries at the handover location'
      using errcode = '55000';
  end if;
  item_count := actual_count;
  insert into public.ops_handovers (
    workspace_id, location_id, rota_week_id, handover_date, from_membership_id, notes
  ) values (
    p_workspace_id, p_location_id, p_rota_week_id, p_handover_date, actor_id, btrim(p_notes)
  ) returning id into handover_id;
  insert into public.ops_handover_recipients (
    workspace_id, handover_id, recipient_membership_id
  ) select p_workspace_id, handover_id, recipient_id
    from (select distinct unnest(p_recipient_membership_ids) as recipient_id) as recipients;
  insert into public.ops_handover_items (
    workspace_id, handover_id, ops_entry_id, carried_forward
  ) select p_workspace_id, handover_id, entry_id,
      exists (
        select 1 from public.ops_handover_items as old_item
        join public.ops_handovers as old_handover
          on old_handover.workspace_id = old_item.workspace_id
         and old_handover.id = old_item.handover_id
        where old_item.workspace_id = p_workspace_id and old_item.ops_entry_id = entry_id
          and old_handover.location_id = p_location_id
      )
    from (select distinct unnest(coalesce(p_entry_ids, array[]::uuid[])) as entry_id) as items;
  perform public.rpc_internal_notify(
    p_workspace_id, actor_id, 'ops_handover_issued', 'Operational handover issued',
    left(btrim(p_notes), 300), 'ops_handover', handover_id,
    p_recipient_membership_ids
  );
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'ops.handover_issued', 'ops_handover', handover_id,
    jsonb_build_object('location_id', p_location_id, 'recipient_count', recipient_count,
                       'item_count', item_count)
  );
  result := jsonb_build_object('handover_id', handover_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_acknowledge_handover(
  p_workspace_id uuid, p_request_id uuid, p_handover_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; prior_time timestamptz;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.handover.ack');
  if not request_is_new then return result; end if;
  select acknowledged_at into prior_time from public.ops_handover_recipients
  where workspace_id = p_workspace_id and handover_id = p_handover_id
    and recipient_membership_id = actor_id for update;
  if not found then raise exception 'caller is not a handover recipient' using errcode = '42501'; end if;
  if prior_time is null then
    update public.ops_handover_recipients set acknowledged_at = transaction_timestamp()
    where workspace_id = p_workspace_id and handover_id = p_handover_id
      and recipient_membership_id = actor_id;
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'ops.handover_acknowledged', 'ops_handover', p_handover_id,
      '{}'::jsonb
    );
  end if;
  result := jsonb_build_object('handover_id', p_handover_id, 'changed', prior_time is null);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_create_briefing(
  p_workspace_id uuid, p_request_id uuid, p_location_id uuid,
  p_briefing_date date, p_title text, p_summary text,
  p_recipient_membership_ids uuid[], p_entry_ids uuid[]
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; briefing_id uuid;
  timezone_name text; expected_count integer; actual_count integer;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.briefing.create');
  if not request_is_new then return result; end if;
  select timezone into timezone_name from public.locations where workspace_id = p_workspace_id
    and id = p_location_id and status = 'active';
  if timezone_name is null then raise exception 'active briefing location is required' using errcode = '22023'; end if;
  if p_briefing_date is distinct from (transaction_timestamp() at time zone timezone_name)::date then
    raise exception 'briefing_date must be today at the location' using errcode = '55000';
  end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null or length(btrim(p_title)) > 200 then
    raise exception 'briefing title is required and must be at most 200 characters' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_summary, '')), '') is null or length(btrim(p_summary)) > 6000 then
    raise exception 'briefing summary is required and must be at most 6000 characters' using errcode = '22023';
  end if;
  select count(distinct recipient_id) into expected_count
  from unnest(coalesce(p_recipient_membership_ids, array[]::uuid[])) as recipient_id;
  perform 1 from public.workspace_memberships as membership
  where membership.workspace_id = p_workspace_id
    and membership.id = any(coalesce(p_recipient_membership_ids, array[]::uuid[]))
  order by membership.id for update;
  select count(*) into actual_count from public.workspace_memberships as membership
  where membership.workspace_id = p_workspace_id and membership.status = 'active'
    and membership.role in ('owner', 'manager') and membership.id <> actor_id
    and membership.id = any(coalesce(p_recipient_membership_ids, array[]::uuid[]));
  if expected_count = 0 or actual_count <> expected_count then
    raise exception 'briefings require at least one other active manager recipient'
      using errcode = '55000';
  end if;
  select count(distinct entry_id) into expected_count
  from unnest(coalesce(p_entry_ids, array[]::uuid[])) as entry_id;
  perform 1 from public.ops_entries as entry
  where entry.workspace_id = p_workspace_id
    and entry.id = any(coalesce(p_entry_ids, array[]::uuid[]))
  order by entry.id for key share;
  select count(*) into actual_count from public.ops_entries as entry
  where entry.workspace_id = p_workspace_id and entry.location_id = p_location_id
    and entry.status <> 'archived' and entry.id = any(coalesce(p_entry_ids, array[]::uuid[]));
  if actual_count <> expected_count then
    raise exception 'briefing items must be retained entries at the briefing location'
      using errcode = '55000';
  end if;
  insert into public.ops_briefings (
    workspace_id, location_id, briefing_date, title, summary, authored_by_membership_id
  ) values (
    p_workspace_id, p_location_id, p_briefing_date, btrim(p_title), btrim(p_summary), actor_id
  ) returning id into briefing_id;
  insert into public.ops_briefing_recipients (
    workspace_id, briefing_id, recipient_membership_id
  ) select p_workspace_id, briefing_id, recipient_id
    from (select distinct unnest(p_recipient_membership_ids) as recipient_id) as recipients;
  insert into public.ops_briefing_items (workspace_id, briefing_id, ops_entry_id)
  select p_workspace_id, briefing_id, entry_id
  from (select distinct unnest(coalesce(p_entry_ids, array[]::uuid[])) as entry_id) as items;
  perform public.rpc_internal_notify(
    p_workspace_id, actor_id, 'ops_briefing_issued', 'Operational briefing issued',
    btrim(p_title), 'ops_briefing', briefing_id, p_recipient_membership_ids
  );
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'ops.briefing_issued', 'ops_briefing', briefing_id,
    jsonb_build_object('location_id', p_location_id, 'recipient_count',
                       cardinality(p_recipient_membership_ids), 'item_count', expected_count)
  );
  result := jsonb_build_object('briefing_id', briefing_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_mark_briefing_read(
  p_workspace_id uuid, p_request_id uuid, p_briefing_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; prior_time timestamptz;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.briefing.read');
  if not request_is_new then return result; end if;
  select read_at into prior_time from public.ops_briefing_recipients
  where workspace_id = p_workspace_id and briefing_id = p_briefing_id
    and recipient_membership_id = actor_id for update;
  if not found then raise exception 'caller is not a briefing recipient' using errcode = '42501'; end if;
  if prior_time is null then
    update public.ops_briefing_recipients set read_at = transaction_timestamp()
    where workspace_id = p_workspace_id and briefing_id = p_briefing_id
      and recipient_membership_id = actor_id;
  end if;
  result := jsonb_build_object('briefing_id', p_briefing_id, 'changed', prior_time is null);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_ops_acknowledge_briefing(
  p_workspace_id uuid, p_request_id uuid, p_briefing_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; prior_time timestamptz;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'ops.briefing.ack');
  if not request_is_new then return result; end if;
  select acknowledged_at into prior_time from public.ops_briefing_recipients
  where workspace_id = p_workspace_id and briefing_id = p_briefing_id
    and recipient_membership_id = actor_id for update;
  if not found then raise exception 'caller is not a briefing recipient' using errcode = '42501'; end if;
  if prior_time is null then
    update public.ops_briefing_recipients
    set read_at = coalesce(read_at, transaction_timestamp()),
        acknowledged_at = transaction_timestamp()
    where workspace_id = p_workspace_id and briefing_id = p_briefing_id
      and recipient_membership_id = actor_id;
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'ops.briefing_acknowledged', 'ops_briefing', p_briefing_id,
      '{}'::jsonb
    );
  end if;
  result := jsonb_build_object('briefing_id', p_briefing_id, 'changed', prior_time is null);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

revoke all on function public.guard_ops_handover_recipient_change() from public, anon, authenticated;
revoke all on function public.guard_ops_briefing_recipient_change() from public, anon, authenticated;
revoke all on function public.rpc_ops_create_handover(uuid, uuid, uuid, date, uuid, text, uuid[], uuid[]) from public, anon;
revoke all on function public.rpc_ops_acknowledge_handover(uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_ops_create_briefing(uuid, uuid, uuid, date, text, text, uuid[], uuid[]) from public, anon;
revoke all on function public.rpc_ops_mark_briefing_read(uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_ops_acknowledge_briefing(uuid, uuid, uuid) from public, anon;
grant execute on function public.rpc_ops_create_handover(uuid, uuid, uuid, date, uuid, text, uuid[], uuid[]) to authenticated;
grant execute on function public.rpc_ops_acknowledge_handover(uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_ops_create_briefing(uuid, uuid, uuid, date, text, text, uuid[], uuid[]) to authenticated;
grant execute on function public.rpc_ops_mark_briefing_read(uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_ops_acknowledge_briefing(uuid, uuid, uuid) to authenticated;

comment on table public.ops_briefings is
  'Authored manager-to-manager operational summaries. They are not Team announcements and are never staff-visible.';
comment on table public.ops_handovers is
  'Immutable issued manager handovers with explicit recipient acknowledgement and retained item snapshots.';

notify pgrst, 'reload schema';
