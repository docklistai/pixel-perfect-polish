create or replace function public.current_workspace_membership_id(target_workspace_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.id
  from public.workspace_memberships as membership
  where membership.workspace_id = target_workspace_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
  limit 1
$$;

create or replace function public.has_workspace_role(target_workspace_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships as membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  )
$$;

create or replace function public.current_staff_member_id(target_workspace_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select staff.id
  from public.staff_members as staff
  join public.workspace_memberships as membership
    on membership.workspace_id = staff.workspace_id
   and membership.id = staff.membership_id
  where staff.workspace_id = target_workspace_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and staff.employment_status = 'active'
  limit 1
$$;

revoke all on function public.current_workspace_membership_id(uuid) from public;
revoke all on function public.has_workspace_role(uuid, text[]) from public;
revoke all on function public.current_staff_member_id(uuid) from public;

grant execute on function public.current_workspace_membership_id(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function public.current_staff_member_id(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.locations enable row level security;
alter table public.departments enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.staff_members enable row level security;
alter table public.rota_weeks enable row level security;
alter table public.shifts enable row level security;
alter table public.published_rota_snapshots enable row level security;
alter table public.published_rota_shifts enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_request_events enable row level security;
alter table public.time_entries enable row level security;
alter table public.clock_events enable row level security;
alter table public.time_entry_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.audit_events enable row level security;

create policy workspaces_member_select
on public.workspaces for select to authenticated
using (public.current_workspace_membership_id(id) is not null);

create policy workspaces_manager_update
on public.workspaces for update to authenticated
using (public.has_workspace_role(id, array['owner', 'manager']))
with check (public.has_workspace_role(id, array['owner', 'manager']));

create policy locations_member_select
on public.locations for select to authenticated
using (public.current_workspace_membership_id(workspace_id) is not null);

create policy locations_manager_all
on public.locations for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy departments_member_select
on public.departments for select to authenticated
using (public.current_workspace_membership_id(workspace_id) is not null);

create policy departments_manager_all
on public.departments for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy workspace_memberships_self_select
on public.workspace_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  and status = 'active'
);

create policy workspace_memberships_manager_all
on public.workspace_memberships for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy staff_members_self_select
on public.staff_members for select to authenticated
using (id = public.current_staff_member_id(workspace_id));

create policy staff_members_manager_all
on public.staff_members for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy rota_weeks_manager_all
on public.rota_weeks for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy shifts_manager_all
on public.shifts for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy published_rota_snapshots_member_select
on public.published_rota_snapshots for select to authenticated
using (public.current_workspace_membership_id(workspace_id) is not null);

create policy published_rota_snapshots_manager_insert
on public.published_rota_snapshots for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy published_rota_shifts_staff_safe_select
on public.published_rota_shifts for select to authenticated
using (
  public.current_workspace_membership_id(workspace_id) is not null
  and (
    public.has_workspace_role(workspace_id, array['owner', 'manager'])
    or staff_member_id = public.current_staff_member_id(workspace_id)
    or staff_member_id is null
  )
);

create policy published_rota_shifts_manager_insert
on public.published_rota_shifts for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy leave_requests_staff_or_manager_select
on public.leave_requests for select to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner', 'manager'])
  or staff_member_id = public.current_staff_member_id(workspace_id)
);

create policy leave_requests_staff_insert
on public.leave_requests for insert to authenticated
with check (
  staff_member_id = public.current_staff_member_id(workspace_id)
  and status = 'pending'
  and decided_at is null
  and decided_by_membership_id is null
);

create policy leave_requests_staff_or_manager_update
on public.leave_requests for update to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner', 'manager'])
  or (
    staff_member_id = public.current_staff_member_id(workspace_id)
    and status = 'pending'
  )
)
with check (
  public.has_workspace_role(workspace_id, array['owner', 'manager'])
  or (
    staff_member_id = public.current_staff_member_id(workspace_id)
    and status in ('pending', 'cancelled')
    and decided_at is null
    and decided_by_membership_id is null
  )
);

create policy leave_request_events_manager_select
on public.leave_request_events for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy leave_request_events_manager_insert
on public.leave_request_events for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy time_entries_staff_or_manager_select
on public.time_entries for select to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner', 'manager'])
  or staff_member_id = public.current_staff_member_id(workspace_id)
);

create policy time_entries_manager_insert
on public.time_entries for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy time_entries_manager_update
on public.time_entries for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy clock_events_staff_or_manager_select
on public.clock_events for select to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner', 'manager'])
  or staff_member_id = public.current_staff_member_id(workspace_id)
);

create policy clock_events_manager_insert
on public.clock_events for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy time_entry_events_manager_select
on public.time_entry_events for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy time_entry_events_manager_insert
on public.time_entry_events for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy notifications_recipient_or_manager_select
on public.notifications for select to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner', 'manager'])
  or exists (
    select 1
    from public.notification_deliveries as delivery
    where delivery.workspace_id = notifications.workspace_id
      and delivery.notification_id = notifications.id
      and delivery.recipient_membership_id = public.current_workspace_membership_id(notifications.workspace_id)
  )
);

create policy notifications_manager_insert
on public.notifications for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy notification_deliveries_recipient_select
on public.notification_deliveries for select to authenticated
using (recipient_membership_id = public.current_workspace_membership_id(workspace_id));

create policy notification_deliveries_recipient_update
on public.notification_deliveries for update to authenticated
using (recipient_membership_id = public.current_workspace_membership_id(workspace_id))
with check (recipient_membership_id = public.current_workspace_membership_id(workspace_id));

create policy notification_deliveries_manager_all
on public.notification_deliveries for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy audit_events_manager_select
on public.audit_events for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create view public.staff_portal_profile
with (security_barrier = true, security_invoker = true)
as
select
  staff.workspace_id,
  staff.id as staff_member_id,
  staff.display_name,
  staff.role_name,
  staff.email,
  staff.phone,
  staff.employment_status,
  department.id as department_id,
  department.name as department_name,
  location.id as location_id,
  location.name as location_name
from public.staff_members as staff
left join public.departments as department
  on department.workspace_id = staff.workspace_id
 and department.id = staff.department_id
left join public.locations as location
  on location.workspace_id = staff.workspace_id
 and location.id = staff.primary_location_id
where staff.id = public.current_staff_member_id(staff.workspace_id);

create view public.staff_portal_published_shifts
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
);

create view public.staff_portal_leave_requests
with (security_barrier = true, security_invoker = true)
as
select
  request.workspace_id,
  request.id as leave_request_id,
  request.staff_member_id,
  request.leave_type,
  request.start_date,
  request.end_date,
  request.reason,
  request.status,
  request.submitted_at,
  request.decided_at,
  request.decision_reason
from public.leave_requests as request
where request.staff_member_id = public.current_staff_member_id(request.workspace_id);

create view public.staff_portal_time_entries
with (security_barrier = true, security_invoker = true)
as
select
  entry.workspace_id,
  entry.id as time_entry_id,
  entry.staff_member_id,
  entry.shift_id,
  entry.work_date,
  entry.scheduled_start_at,
  entry.scheduled_end_at,
  entry.clocked_in_at,
  entry.clocked_out_at,
  entry.break_minutes,
  entry.approval_status,
  entry.approved_at
from public.time_entries as entry
where entry.staff_member_id = public.current_staff_member_id(entry.workspace_id);

create view public.staff_portal_clock_events
with (security_barrier = true, security_invoker = true)
as
select
  event.workspace_id,
  event.id as clock_event_id,
  event.time_entry_id,
  event.staff_member_id,
  event.event_type,
  event.source,
  event.occurred_at
from public.clock_events as event
where event.staff_member_id = public.current_staff_member_id(event.workspace_id);

create view public.staff_portal_notifications
with (security_barrier = true, security_invoker = true)
as
select
  notification.workspace_id,
  notification.id as notification_id,
  notification.kind,
  notification.title,
  notification.body,
  notification.related_entity_type,
  notification.related_entity_id,
  notification.created_at,
  delivery.delivered_at,
  delivery.read_at
from public.notification_deliveries as delivery
join public.notifications as notification
  on notification.workspace_id = delivery.workspace_id
 and notification.id = delivery.notification_id
where delivery.recipient_membership_id = public.current_workspace_membership_id(delivery.workspace_id);

revoke all on table
  public.workspaces,
  public.locations,
  public.departments,
  public.workspace_memberships,
  public.staff_members,
  public.rota_weeks,
  public.shifts,
  public.published_rota_snapshots,
  public.published_rota_shifts,
  public.leave_requests,
  public.leave_request_events,
  public.time_entries,
  public.clock_events,
  public.time_entry_events,
  public.notifications,
  public.notification_deliveries,
  public.audit_events
from anon, authenticated;

grant select, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.departments to authenticated;
grant select, insert, update, delete on public.workspace_memberships to authenticated;
grant select, insert, update, delete on public.staff_members to authenticated;
grant select, insert, update, delete on public.rota_weeks to authenticated;
grant select, insert, update, delete on public.shifts to authenticated;
grant select, insert on public.published_rota_snapshots to authenticated;
grant select, insert on public.published_rota_shifts to authenticated;
grant select, insert, update on public.leave_requests to authenticated;
grant select, insert on public.leave_request_events to authenticated;
grant select, insert, update on public.time_entries to authenticated;
grant select, insert on public.clock_events to authenticated;
grant select, insert on public.time_entry_events to authenticated;
grant select, insert on public.notifications to authenticated;
grant select, insert, update on public.notification_deliveries to authenticated;
grant select on public.audit_events to authenticated;

revoke all on table
  public.staff_portal_profile,
  public.staff_portal_published_shifts,
  public.staff_portal_leave_requests,
  public.staff_portal_time_entries,
  public.staff_portal_clock_events,
  public.staff_portal_notifications
from anon, authenticated;

grant select on table
  public.staff_portal_profile,
  public.staff_portal_published_shifts,
  public.staff_portal_leave_requests,
  public.staff_portal_time_entries,
  public.staff_portal_clock_events,
  public.staff_portal_notifications
to authenticated;

comment on function public.current_workspace_membership_id(uuid) is
  'RLS helper. Future auth work must link auth.users to exactly one active membership per workspace.';

comment on view public.staff_portal_published_shifts is
  'Staff-safe latest published snapshot projection. Draft shifts and other staff assignments are excluded by underlying RLS.';

comment on table public.audit_events is
  'No authenticated insert policy is intentional. Backend/security work must provide a controlled audit writer.';
