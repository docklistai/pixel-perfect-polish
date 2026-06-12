-- Phase 4 hardening: closes the database audit findings on membership privilege
-- escalation, snapshot atomicity, canonical immutability, actor integrity,
-- relational consistency, and foreign-key indexing.
--
-- Guard convention: a null auth.uid() marks the trusted service/seed path
-- (supabase seed, future backend jobs). Authenticated client requests always
-- carry a uid — every RLS policy resolves membership through auth.uid(), so an
-- authenticated session with a null uid cannot pass RLS to reach these guards.

-- ---------------------------------------------------------------------------
-- 1. Generic immutable-column guard
--    Canonical identity and timestamp columns must never change after insert.
-- ---------------------------------------------------------------------------

create or replace function public.protect_immutable_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  column_name text;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
begin
  foreach column_name in array tg_argv loop
    if new_row -> column_name is distinct from old_row -> column_name then
      raise exception 'column % on % is immutable', column_name, tg_table_name
        using errcode = '55000';
    end if;
  end loop;
  return new;
end;
$$;

create trigger workspaces_protect_immutable
before update on public.workspaces
for each row execute function public.protect_immutable_columns('id', 'created_at');

create trigger locations_protect_immutable
before update on public.locations
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

create trigger departments_protect_immutable
before update on public.departments
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

create trigger workspace_memberships_protect_immutable
before update on public.workspace_memberships
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

create trigger staff_members_protect_immutable
before update on public.staff_members
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

create trigger rota_weeks_protect_immutable
before update on public.rota_weeks
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

create trigger shifts_protect_immutable
before update on public.shifts
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

create trigger leave_requests_protect_immutable
before update on public.leave_requests
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'staff_member_id', 'submitted_at', 'created_at'
);

create trigger time_entries_protect_immutable
before update on public.time_entries
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'staff_member_id', 'created_at'
);

-- ---------------------------------------------------------------------------
-- 2. Workspace membership guard
--    Managers cannot grant the owner role, alter or remove owner memberships,
--    and no SQL path may strip the last viable owner from a workspace.
-- ---------------------------------------------------------------------------

create or replace function public.guard_workspace_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
  target_workspace_id uuid;
  remaining_viable_owners integer;
begin
  if tg_op = 'DELETE' then
    target_workspace_id := old.workspace_id;
  else
    target_workspace_id := new.workspace_id;
  end if;

  -- Workspace teardown: cascaded membership rows are removed after the parent
  -- workspace row is already gone; owner accounting no longer applies.
  if tg_op in ('UPDATE', 'DELETE')
     and not exists (
       select 1 from public.workspaces as workspace
       where workspace.id = old.workspace_id
     ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- A claimed membership can be unlinked (user deletion sets user_id null) but
  -- never rewritten to a different auth identity.
  if tg_op = 'UPDATE'
     and old.user_id is not null
     and new.user_id is not null
     and new.user_id <> old.user_id then
    raise exception 'membership user identity cannot be rewritten' using errcode = '55000';
  end if;

  if acting_user_id is not null
     and not public.has_workspace_role(target_workspace_id, array['owner']) then
    if tg_op = 'INSERT' and new.role = 'owner' then
      raise exception 'only owners can grant the owner role' using errcode = '42501';
    elsif tg_op = 'UPDATE' and (new.role = 'owner' or old.role = 'owner') then
      raise exception 'only owners can grant or change owner memberships' using errcode = '42501';
    elsif tg_op = 'DELETE' and old.role = 'owner' then
      raise exception 'only owners can remove owner memberships' using errcode = '42501';
    end if;
  end if;

  -- Last-owner protection applies to every SQL path, owners included; an
  -- ownerless workspace is unrecoverable. Remaining owner rows are locked to
  -- prevent two concurrent demotions from passing each other's count.
  if tg_op in ('UPDATE', 'DELETE')
     and old.role = 'owner'
     and old.status in ('invited', 'active')
     and (
       tg_op = 'DELETE'
       or new.role <> 'owner'
       or new.status not in ('invited', 'active')
     ) then
    select count(*)
    into remaining_viable_owners
    from (
      select 1
      from public.workspace_memberships as membership
      where membership.workspace_id = old.workspace_id
        and membership.id <> old.id
        and membership.role = 'owner'
        and membership.status in ('invited', 'active')
      for update
    ) as locked_owners;

    if remaining_viable_owners = 0 then
      raise exception 'a workspace must always retain at least one owner' using errcode = '55000';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger workspace_memberships_guard_change
before insert or update or delete on public.workspace_memberships
for each row execute function public.guard_workspace_membership_change();

-- ---------------------------------------------------------------------------
-- 3. Snapshot publication chain
--    Publication is atomic and honest: sequential versions, a published rota
--    week, caller-attributed publisher, transaction-time timestamps, shifts
--    inside the week boundaries, and never an empty snapshot.
-- ---------------------------------------------------------------------------

alter table public.published_rota_snapshots
  alter column published_at set default transaction_timestamp();

create or replace function public.guard_published_rota_snapshot_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
  publication_week_status text;
  expected_next_version integer;
begin
  select rota_week.status
  into publication_week_status
  from public.rota_weeks as rota_week
  where rota_week.workspace_id = new.workspace_id
    and rota_week.id = new.rota_week_id;

  if publication_week_status is null then
    raise exception 'snapshot must reference a rota week in the same workspace'
      using errcode = '23503';
  end if;

  if publication_week_status <> 'published' then
    raise exception 'snapshots can only be created for a published rota week'
      using errcode = '55000';
  end if;

  select coalesce(max(snapshot.version), 0) + 1
  into expected_next_version
  from public.published_rota_snapshots as snapshot
  where snapshot.workspace_id = new.workspace_id
    and snapshot.rota_week_id = new.rota_week_id;

  if new.version <> expected_next_version then
    raise exception 'snapshot versions must increase sequentially (expected %)', expected_next_version
      using errcode = '55000';
  end if;

  if acting_user_id is not null then
    if new.published_by_membership_id
       is distinct from public.current_workspace_membership_id(new.workspace_id) then
      raise exception 'published_by_membership_id must be the active membership of the publishing caller'
        using errcode = '42501';
    end if;

    if new.created_at is distinct from transaction_timestamp()
       or new.published_at is distinct from transaction_timestamp() then
      raise exception 'snapshot timestamps must be the publication transaction time'
        using errcode = '55000';
    end if;
  end if;

  return new;
end;
$$;

create trigger published_rota_snapshots_guard_insert
before insert on public.published_rota_snapshots
for each row execute function public.guard_published_rota_snapshot_insert();

-- Extends the Phase 4 foundation guard: same-transaction insertion now applies
-- to authenticated callers only (the seed/service path writes deterministic
-- historical timestamps), and every published shift must sit inside its rota
-- week's location and date boundaries.
create or replace function public.guard_published_rota_shift_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
  snapshot_created_at timestamptz;
  publication_week_location_id uuid;
  publication_week_start date;
begin
  select snapshot.created_at, rota_week.location_id, rota_week.week_start
  into snapshot_created_at, publication_week_location_id, publication_week_start
  from public.published_rota_snapshots as snapshot
  join public.rota_weeks as rota_week
    on rota_week.workspace_id = snapshot.workspace_id
   and rota_week.id = snapshot.rota_week_id
  where snapshot.workspace_id = new.workspace_id
    and snapshot.id = new.snapshot_id;

  if snapshot_created_at is null then
    raise exception 'published shift must reference a snapshot in the same workspace'
      using errcode = '23503';
  end if;

  if acting_user_id is not null
     and snapshot_created_at is distinct from transaction_timestamp() then
    raise exception 'published rota shifts must be inserted in the snapshot creation transaction'
      using errcode = '55000';
  end if;

  if new.location_id <> publication_week_location_id then
    raise exception 'published shift location must match the rota week location'
      using errcode = '55000';
  end if;

  if new.shift_date < publication_week_start
     or new.shift_date > publication_week_start + 6 then
    raise exception 'published shift date must fall inside the rota week'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_snapshot_has_shifts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.published_rota_shifts as shift
    where shift.workspace_id = new.workspace_id
      and shift.snapshot_id = new.id
  ) then
    raise exception 'a published rota snapshot must contain at least one shift'
      using errcode = '55000';
  end if;
  return null;
end;
$$;

create constraint trigger published_rota_snapshots_require_shifts
after insert on public.published_rota_snapshots
deferrable initially deferred
for each row execute function public.enforce_snapshot_has_shifts();

-- Staff latest-snapshot defence in depth: supersession only counts snapshots
-- that actually contain shifts. The check runs as a definer function so the
-- emptiness test is global, not filtered by the viewer's row access.
create or replace function public.published_snapshot_has_shifts(
  target_workspace_id uuid,
  target_snapshot_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.published_rota_shifts as shift
    where shift.workspace_id = target_workspace_id
      and shift.snapshot_id = target_snapshot_id
  )
$$;

revoke all on function public.published_snapshot_has_shifts(uuid, uuid) from public;
grant execute on function public.published_snapshot_has_shifts(uuid, uuid) to authenticated;

create or replace view public.staff_portal_published_shifts
with (security_barrier = true, security_invoker = true)
as
select
  shift.workspace_id,
  shift.id as published_shift_id,
  shift.source_shift_id,
  shift.staff_member_id,
  shift.shift_date,
  shift.starts_at,
  shift.ends_at,
  shift.break_minutes,
  shift.role_name,
  shift.assignment_status,
  snapshot.version as snapshot_version,
  snapshot.published_at,
  location.id as location_id,
  location.name as location_name,
  department.id as department_id,
  department.name as department_name
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot
  on snapshot.workspace_id = shift.workspace_id
 and snapshot.id = shift.snapshot_id
join public.locations as location
  on location.workspace_id = shift.workspace_id
 and location.id = shift.location_id
join public.departments as department
  on department.workspace_id = shift.workspace_id
 and department.id = shift.department_id
where not exists (
  select 1
  from public.published_rota_snapshots as later_snapshot
  where later_snapshot.workspace_id = snapshot.workspace_id
    and later_snapshot.rota_week_id = snapshot.rota_week_id
    and later_snapshot.version > snapshot.version
    and public.published_snapshot_has_shifts(later_snapshot.workspace_id, later_snapshot.id)
);

-- ---------------------------------------------------------------------------
-- 4. Actor integrity
--    Caller-attributed columns must reference the calling user's own active
--    membership; managers cannot write history as somebody else.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_actor_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_column text := tg_argv[0];
  claimed_actor_id uuid;
  caller_membership_id uuid;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  claimed_actor_id := (to_jsonb(new) ->> actor_column)::uuid;
  caller_membership_id := public.current_workspace_membership_id(new.workspace_id);

  if claimed_actor_id is null
     or caller_membership_id is null
     or claimed_actor_id <> caller_membership_id then
    raise exception '% must be the active membership of the calling user', actor_column
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger leave_request_events_enforce_actor
before insert on public.leave_request_events
for each row execute function public.enforce_actor_membership('actor_membership_id');

create trigger time_entry_events_enforce_actor
before insert on public.time_entry_events
for each row execute function public.enforce_actor_membership('actor_membership_id');

create trigger notifications_enforce_creator
before insert on public.notifications
for each row execute function public.enforce_actor_membership('created_by_membership_id');

-- ---------------------------------------------------------------------------
-- 5. Clock events
--    Event staff must match the time entry's staff; authenticated writers are
--    caller-attributed and source-honest ('system' is service-only).
-- ---------------------------------------------------------------------------

create or replace function public.guard_clock_event_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
  entry_staff_member_id uuid;
  caller_membership_id uuid;
begin
  select entry.staff_member_id
  into entry_staff_member_id
  from public.time_entries as entry
  where entry.workspace_id = new.workspace_id
    and entry.id = new.time_entry_id;

  if entry_staff_member_id is null then
    raise exception 'clock event must reference a time entry in the same workspace'
      using errcode = '23503';
  end if;

  if new.staff_member_id <> entry_staff_member_id then
    raise exception 'clock event staff member must match the time entry staff member'
      using errcode = '55000';
  end if;

  if acting_user_id is not null then
    caller_membership_id := public.current_workspace_membership_id(new.workspace_id);

    if new.actor_membership_id is null
       or new.actor_membership_id <> caller_membership_id then
      raise exception 'actor_membership_id must be the active membership of the calling user'
        using errcode = '42501';
    end if;

    if public.has_workspace_role(new.workspace_id, array['owner', 'manager']) then
      if new.source <> 'manager' then
        raise exception 'manager-recorded clock events must use source manager'
          using errcode = '55000';
      end if;
    elsif new.source <> 'staff' then
      raise exception 'staff-recorded clock events must use source staff'
        using errcode = '55000';
    end if;
  end if;

  return new;
end;
$$;

create trigger clock_events_guard_insert
before insert on public.clock_events
for each row execute function public.guard_clock_event_insert();

-- ---------------------------------------------------------------------------
-- 6. Leave requests and time entries
--    Submission timestamps are transaction-honest, deciders and approvers are
--    caller-attributed, and a linked shift must belong to the same staff
--    member. Shift assignment is frozen while time entries reference it, so
--    the write-time staff check stays true for the row's lifetime.
-- ---------------------------------------------------------------------------

create or replace function public.guard_leave_request_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
begin
  if acting_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT'
     and (new.submitted_at is distinct from transaction_timestamp()
          or new.created_at is distinct from transaction_timestamp()) then
    raise exception 'leave requests must be submitted with the current transaction time'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
     and new.decided_by_membership_id is distinct from old.decided_by_membership_id
     and new.decided_by_membership_id is not null
     and new.decided_by_membership_id
         <> public.current_workspace_membership_id(new.workspace_id) then
    raise exception 'decided_by_membership_id must be the active membership of the deciding caller'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger leave_requests_guard_write
before insert or update on public.leave_requests
for each row execute function public.guard_leave_request_write();

create or replace function public.guard_time_entry_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
  linked_shift_staff_member_id uuid;
begin
  if new.shift_id is not null then
    select shift.staff_member_id
    into linked_shift_staff_member_id
    from public.shifts as shift
    where shift.workspace_id = new.workspace_id
      and shift.id = new.shift_id;

    if linked_shift_staff_member_id is null
       or linked_shift_staff_member_id <> new.staff_member_id then
      raise exception 'time entry shift must be assigned to the same staff member'
        using errcode = '55000';
    end if;
  end if;

  if acting_user_id is not null
     and new.approved_by_membership_id is not null
     and (tg_op = 'INSERT'
          or new.approved_by_membership_id is distinct from old.approved_by_membership_id)
     and new.approved_by_membership_id
         <> public.current_workspace_membership_id(new.workspace_id) then
    raise exception 'approved_by_membership_id must be the active membership of the approving caller'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger time_entries_guard_write
before insert or update on public.time_entries
for each row execute function public.guard_time_entry_write();

-- ---------------------------------------------------------------------------
-- 7. Shifts inside rota week boundaries
-- ---------------------------------------------------------------------------

create or replace function public.guard_shift_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rota_week_location_id uuid;
  rota_week_start date;
begin
  select rota_week.location_id, rota_week.week_start
  into rota_week_location_id, rota_week_start
  from public.rota_weeks as rota_week
  where rota_week.workspace_id = new.workspace_id
    and rota_week.id = new.rota_week_id;

  if rota_week_location_id is null then
    raise exception 'shift must reference a rota week in the same workspace'
      using errcode = '23503';
  end if;

  if new.location_id <> rota_week_location_id then
    raise exception 'shift location must match the rota week location'
      using errcode = '55000';
  end if;

  if new.shift_date < rota_week_start or new.shift_date > rota_week_start + 6 then
    raise exception 'shift date must fall inside the rota week'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
     and new.staff_member_id is distinct from old.staff_member_id
     and exists (
       select 1
       from public.time_entries as entry
       where entry.workspace_id = old.workspace_id
         and entry.shift_id = old.id
     ) then
    raise exception 'shift assignment cannot change while time entries reference the shift'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger shifts_guard_write
before insert or update on public.shifts
for each row execute function public.guard_shift_write();

create or replace function public.guard_rota_week_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.week_start is distinct from old.week_start
      or new.location_id is distinct from old.location_id)
     and (
       exists (
         select 1
         from public.shifts as shift
         where shift.workspace_id = old.workspace_id
           and shift.rota_week_id = old.id
       )
       or exists (
         select 1
         from public.published_rota_snapshots as snapshot
         where snapshot.workspace_id = old.workspace_id
           and snapshot.rota_week_id = old.id
       )
     ) then
    raise exception 'rota week boundaries cannot change once shifts or snapshots exist'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger rota_weeks_guard_update
before update on public.rota_weeks
for each row execute function public.guard_rota_week_update();

-- ---------------------------------------------------------------------------
-- 8. Notification deliveries
--    delivered_at is a canonical fact: writable once, never rewritten. The
--    authenticated update surface narrows to delivery state columns only.
-- ---------------------------------------------------------------------------

create or replace function public.protect_notification_delivery_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.id,
    new.workspace_id,
    new.notification_id,
    new.recipient_membership_id,
    new.created_at
  ) is distinct from row(
    old.id,
    old.workspace_id,
    old.notification_id,
    old.recipient_membership_id,
    old.created_at
  ) then
    raise exception 'notification delivery identity is immutable'
      using errcode = '55000';
  end if;

  if old.delivered_at is not null
     and new.delivered_at is distinct from old.delivered_at then
    raise exception 'delivered_at is immutable once set'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke update on table public.notification_deliveries from authenticated;
grant update (delivered_at, read_at) on public.notification_deliveries to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Foreign-key index coverage
--    workspace_memberships.user_id -> auth.users had no leading-column index;
--    auth.users deletions scan it for the on delete set null action.
-- ---------------------------------------------------------------------------

create index workspace_memberships_user_idx
  on public.workspace_memberships (user_id)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- 10. Invariant documentation
-- ---------------------------------------------------------------------------

comment on function public.guard_workspace_membership_change() is
  'Owner-role changes are owner-only; the last viable owner (role owner, status invited/active) can never be demoted, revoked, or deleted; claimed user identities cannot be rewritten.';

comment on function public.guard_published_rota_snapshot_insert() is
  'Publication honesty: sequential versions per rota week, published week status, caller-attributed publisher, and transaction-time timestamps for authenticated publishes.';

comment on function public.enforce_snapshot_has_shifts() is
  'Deferred commit-time check: a snapshot without published shifts aborts its publication transaction, so an empty version can never become the staff-visible latest.';

comment on function public.enforce_actor_membership() is
  'Generic actor guard: the column named in trigger arguments must be the calling user''s own active membership for authenticated writes; the service path is exempt.';

comment on column public.notification_deliveries.delivered_at is
  'Canonical delivery fact. Set once (null -> value); any rewrite is rejected by trigger.';
