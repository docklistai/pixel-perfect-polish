create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  staff_member_id uuid not null,
  leave_type text not null check (leave_type in ('annual_leave', 'personal', 'sick', 'unpaid', 'other')),
  start_date date not null,
  end_date date not null,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'cancelled')),
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_membership_id uuid,
  decision_reason text check (decision_reason is null or length(btrim(decision_reason)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, decided_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (end_date >= start_date),
  check (
    (
      status in ('pending', 'cancelled')
      and decided_at is null
      and decided_by_membership_id is null
      and decision_reason is null
    )
    or (status in ('approved', 'declined') and decided_at is not null and decided_by_membership_id is not null)
  )
);

create index leave_requests_workspace_status_dates_idx
  on public.leave_requests (workspace_id, status, start_date, end_date);

create index leave_requests_workspace_staff_dates_idx
  on public.leave_requests (workspace_id, staff_member_id, start_date desc);

create index leave_requests_workspace_decider_idx
  on public.leave_requests (workspace_id, decided_by_membership_id)
  where decided_by_membership_id is not null;

create table public.leave_request_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  leave_request_id uuid not null,
  actor_membership_id uuid not null,
  event_type text not null
    check (event_type in ('submitted', 'approved', 'declined', 'cancelled', 'reopened')),
  resulting_status text not null
    check (resulting_status in ('pending', 'approved', 'declined', 'cancelled')),
  reason text check (reason is null or length(btrim(reason)) between 1 and 2000),
  occurred_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, leave_request_id)
    references public.leave_requests (workspace_id, id) on delete restrict,
  foreign key (workspace_id, actor_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create index leave_request_events_workspace_request_time_idx
  on public.leave_request_events (workspace_id, leave_request_id, occurred_at);

create index leave_request_events_workspace_actor_time_idx
  on public.leave_request_events (workspace_id, actor_membership_id, occurred_at desc);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  staff_member_id uuid not null,
  shift_id uuid,
  work_date date not null,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  clocked_in_at timestamptz,
  clocked_out_at timestamptz,
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, shift_id)
    references public.shifts (workspace_id, id) on delete set null (shift_id),
  foreign key (workspace_id, approved_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (scheduled_end_at is null or scheduled_start_at is null or scheduled_end_at > scheduled_start_at),
  check (clocked_out_at is null or clocked_in_at is null or clocked_out_at > clocked_in_at),
  check (
    (approval_status = 'approved' and approved_at is not null and approved_by_membership_id is not null)
    or (
      approval_status in ('pending', 'rejected')
      and approved_at is null
      and approved_by_membership_id is null
    )
  )
);

create index time_entries_workspace_staff_date_idx
  on public.time_entries (workspace_id, staff_member_id, work_date desc);

create index time_entries_workspace_approval_date_idx
  on public.time_entries (workspace_id, approval_status, work_date desc);

create index time_entries_workspace_approver_idx
  on public.time_entries (workspace_id, approved_by_membership_id)
  where approved_by_membership_id is not null;

create index time_entries_workspace_shift_idx
  on public.time_entries (workspace_id, shift_id)
  where shift_id is not null;

create table public.clock_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  time_entry_id uuid not null,
  staff_member_id uuid not null,
  actor_membership_id uuid,
  event_type text not null check (event_type in ('clock_in', 'clock_out', 'break_start', 'break_end')),
  source text not null check (source in ('staff', 'manager', 'system')),
  occurred_at timestamptz not null,
  unique (workspace_id, id),
  foreign key (workspace_id, time_entry_id)
    references public.time_entries (workspace_id, id) on delete restrict,
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, actor_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create index clock_events_workspace_staff_time_idx
  on public.clock_events (workspace_id, staff_member_id, occurred_at desc);

create index clock_events_workspace_entry_time_idx
  on public.clock_events (workspace_id, time_entry_id, occurred_at);

create index clock_events_workspace_actor_time_idx
  on public.clock_events (workspace_id, actor_membership_id, occurred_at desc)
  where actor_membership_id is not null;

create table public.time_entry_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  time_entry_id uuid not null,
  actor_membership_id uuid not null,
  event_type text not null
    check (event_type in ('created', 'adjusted', 'submitted', 'approved', 'rejected', 'reopened')),
  resulting_approval_status text not null
    check (resulting_approval_status in ('pending', 'approved', 'rejected')),
  reason text check (reason is null or length(btrim(reason)) between 1 and 2000),
  occurred_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, time_entry_id)
    references public.time_entries (workspace_id, id) on delete restrict,
  foreign key (workspace_id, actor_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create index time_entry_events_workspace_entry_time_idx
  on public.time_entry_events (workspace_id, time_entry_id, occurred_at);

create index time_entry_events_workspace_actor_time_idx
  on public.time_entry_events (workspace_id, actor_membership_id, occurred_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  created_by_membership_id uuid,
  kind text not null check (
    kind in (
      'shift_changed',
      'rota_published',
      'leave_approved',
      'leave_declined',
      'announcement',
      'timesheet_reminder'
    )
  ),
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(btrim(body)) between 1 and 2000),
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, created_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (
    (related_entity_type is null and related_entity_id is null)
    or (related_entity_type is not null and related_entity_id is not null)
  ),
  check (expires_at is null or expires_at > created_at)
);

create index notifications_workspace_created_idx
  on public.notifications (workspace_id, created_at desc);

create index notifications_workspace_creator_idx
  on public.notifications (workspace_id, created_by_membership_id)
  where created_by_membership_id is not null;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  notification_id uuid not null,
  recipient_membership_id uuid not null,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, notification_id, recipient_membership_id),
  foreign key (workspace_id, notification_id)
    references public.notifications (workspace_id, id) on delete restrict,
  foreign key (workspace_id, recipient_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (read_at is null or (delivered_at is not null and read_at >= delivered_at))
);

create index notification_deliveries_workspace_recipient_idx
  on public.notification_deliveries (workspace_id, recipient_membership_id, read_at, created_at desc);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_membership_id uuid,
  action text not null check (length(btrim(action)) between 1 and 120),
  subject_type text not null check (length(btrim(subject_type)) between 1 and 120),
  subject_id uuid not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  unique (workspace_id, id),
  foreign key (workspace_id, actor_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create index audit_events_workspace_subject_time_idx
  on public.audit_events (workspace_id, subject_type, subject_id, occurred_at desc);

create index audit_events_workspace_time_idx
  on public.audit_events (workspace_id, occurred_at desc);

create index audit_events_workspace_actor_time_idx
  on public.audit_events (workspace_id, actor_membership_id, occurred_at desc)
  where actor_membership_id is not null;

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

  return new;
end;
$$;

create trigger leave_requests_set_updated_at
before update on public.leave_requests
for each row execute function public.set_updated_at();

create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

create trigger notification_deliveries_protect_identity
before update on public.notification_deliveries
for each row execute function public.protect_notification_delivery_identity();

create trigger leave_request_events_reject_changes
before update or delete on public.leave_request_events
for each row execute function public.reject_immutable_row_change();

create trigger clock_events_reject_changes
before update or delete on public.clock_events
for each row execute function public.reject_immutable_row_change();

create trigger time_entry_events_reject_changes
before update or delete on public.time_entry_events
for each row execute function public.reject_immutable_row_change();

create trigger audit_events_reject_changes
before update or delete on public.audit_events
for each row execute function public.reject_immutable_row_change();

comment on table public.leave_request_events is
  'Immutable leave decision history. Staff-safe portal reads use the leave request projection, not this manager/audit event stream.';

comment on table public.time_entry_events is
  'Immutable time approval and adjustment history. Backend validation must create events alongside state changes.';

comment on table public.audit_events is
  'Immutable canonical audit records. Backend/security work must validate and write narrowly scoped details.';
