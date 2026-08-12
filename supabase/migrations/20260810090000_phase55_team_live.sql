-- Phase 55 — Team becomes live.
--
-- Until now /team performed no reads and no writes: every announcement,
-- acknowledgement, training reminder, birthday and staff event on the page came
-- from a frontend fixture. This migration gives the existing Team surface real,
-- workspace-scoped persistence. It adds nothing the page does not already show.
--
-- Boundaries are recorded in docs/adr/0004-team-live-bounded-expansion.md:
--   * training reminders are reminders, NOT an LMS (no courses, modules,
--     content, assessments, certificates or learning paths);
--   * birthdays store day + month only, NEVER the year, so no age exists;
--   * staff events are an informational rail, NOT an event platform;
--   * announcement comments are manager notes attached to one announcement,
--     NOT chat, channels, DMs or reactions.
--
-- Authority model follows Phase 30 and Phase 50 exactly:
--   * every write is an atomic SECURITY DEFINER RPC with an empty search_path;
--   * recipients are resolved SERVER-SIDE from workspace membership — a client
--     never supplies a recipient list for an announcement;
--   * notifications and deliveries are still written only by
--     rpc_internal_notify, which stays revoked from authenticated;
--   * acknowledgement is written by the recipient under their own authority, so
--     a manager cannot fabricate a staff acknowledgement.

-- ---------------------------------------------------------------------------
-- 1. Notification kinds used by Team.
--    'announcement' already existed since the original operational schema.
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'shift_changed', 'rota_published', 'leave_approved', 'leave_declined',
  'leave_cancelled', 'announcement', 'timesheet_reminder', 'open_shift_update',
  'shift_release_update', 'unavailability_update', 'rota_update_required',
  'ops_assigned', 'ops_priority', 'ops_entry_resolved', 'ops_handover_issued',
  'ops_briefing_issued', 'ops_checklist_exception',
  'announcement_reminder', 'team_training_reminder'
));

-- ---------------------------------------------------------------------------
-- 2. Birthday datum — day and month only.
--
--    Storing the year would create an age, which is a protected characteristic
--    and is not required by anything the Team rail displays ("9 Jun"). The pair
--    is all-or-nothing so a half-set birthday can never exist.
-- ---------------------------------------------------------------------------

alter table public.staff_members
  add column birth_day smallint,
  add column birth_month smallint;

-- The historical authenticated table grant predates birthday data. RLS still
-- decides which rows a caller may see, while this explicit column allowlist
-- prevents staff (and future authenticated clients) from selecting private or
-- newly-added columns unless they are deliberately granted here.
revoke select on table public.staff_members from authenticated;
grant select (
  id,
  workspace_id,
  membership_id,
  primary_location_id,
  department_id,
  display_name,
  email,
  phone,
  role_name,
  employment_status,
  contract_type,
  contracted_minutes_per_week,
  start_date,
  end_date,
  created_at,
  updated_at
) on public.staff_members to authenticated;

alter table public.staff_members
  add constraint staff_members_birthday_pair_check
    check ((birth_day is null) = (birth_month is null)),
  add constraint staff_members_birthday_calendar_check
    check (
      birth_day is null
      or (birth_month in (1, 3, 5, 7, 8, 10, 12) and birth_day between 1 and 31)
      or (birth_month in (4, 6, 9, 11) and birth_day between 1 and 30)
      or (birth_month = 2 and birth_day between 1 and 29)
    );

create index staff_members_workspace_birthday_idx
  on public.staff_members (workspace_id, birth_month, birth_day)
  where birth_day is not null and employment_status = 'active';

-- A birthday has no stored year. In non-leap years, 29 February is treated as
-- 28 February for reminder-window calculations only; the stored day remains 29.
create or replace function public.team_birthday_reminder_date(
  p_year integer, p_month smallint, p_day smallint
)
returns date
language sql immutable strict
set search_path = ''
as $$
  select case
    when p_month = 2 and p_day = 29
      then (pg_catalog.make_date(p_year, 3, 1) - interval '1 day')::date
    else pg_catalog.make_date(p_year, p_month, p_day)
  end;
$$;

revoke all on function public.team_birthday_reminder_date(integer, smallint, smallint)
  from public, anon, authenticated;

comment on function public.team_birthday_reminder_date(integer, smallint, smallint) is
  'Internal Team reminder date calculation. Maps 29 February to 28 February in non-leap years without changing stored birthday data.';

-- Select the one birthday occurrence represented by the fixed reminder
-- window. Keeping this calendar decision in PostgreSQL means the browser never
-- has to infer which calendar year a reminder represents.
create or replace function public.team_birthday_reminder_occurrence(
  p_reference_date date, p_month integer, p_day integer
)
returns date
language sql immutable strict
set search_path = ''
as $$
  select candidate.occurrence_date
  from (values (-1), (0), (1)) as year_offset(value)
  cross join lateral (
    select public.team_birthday_reminder_date(
      extract(year from p_reference_date)::integer + year_offset.value,
      p_month::smallint,
      p_day::smallint
    ) as occurrence_date
  ) as candidate
  where candidate.occurrence_date between p_reference_date - 7 and p_reference_date + 21
  order by candidate.occurrence_date
  limit 1;
$$;

revoke all on function public.team_birthday_reminder_occurrence(date, integer, integer)
  from public, anon, authenticated;

comment on function public.team_birthday_reminder_occurrence(date, integer, integer) is
  'Internal Team reminder occurrence. Selects the previous, current or next-year birthday date inside the fixed -7/+21 day window.';

comment on column public.staff_members.birth_day is
  'Day of birth. Paired with birth_month; the birth YEAR is deliberately never stored (ADR-0004). Manager-only — excluded from every staff-safe view.';
comment on column public.staff_members.birth_month is
  'Month of birth. Paired with birth_day; the birth YEAR is deliberately never stored (ADR-0004). Manager-only — excluded from every staff-safe view.';

-- ---------------------------------------------------------------------------
-- 3. Tables.
-- ---------------------------------------------------------------------------

-- An issued staff broadcast. Immutable once published: the Team UI exposes no
-- edit, unpin or delete control, so none exists here.
create table public.team_announcements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(btrim(body)) between 1 and 4000),
  audience_kind text not null check (audience_kind in ('all_staff', 'department', 'managers')),
  audience_department_id uuid,
  pinned boolean not null default false,
  requires_acknowledgement boolean not null default true,
  highlight_in_updates boolean not null default true,
  authored_by_membership_id uuid not null,
  published_at timestamptz not null default transaction_timestamp(),
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, audience_department_id)
    references public.departments (workspace_id, id) on delete restrict,
  foreign key (workspace_id, authored_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check ((audience_kind = 'department') = (audience_department_id is not null))
);

-- One row per resolved recipient. The unique constraint is what guarantees the
-- product rule "one staff member appears once" in the manager ack roster.
create table public.team_announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  announcement_id uuid not null,
  recipient_membership_id uuid not null,
  staff_member_id uuid,
  delivered_at timestamptz not null default transaction_timestamp(),
  read_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, announcement_id, recipient_membership_id),
  foreign key (workspace_id, announcement_id)
    references public.team_announcements (workspace_id, id) on delete restrict,
  foreign key (workspace_id, recipient_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete set null (staff_member_id),
  check (acknowledged_at is null or read_at is not null)
);

-- Manager notes attached to exactly one announcement. Not chat: no channel, no
-- recipient, no reaction, no direct message, no thread nesting (ADR-0004).
create table public.team_announcement_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  announcement_id uuid not null,
  author_membership_id uuid not null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, announcement_id)
    references public.team_announcements (workspace_id, id) on delete restrict,
  foreign key (workspace_id, author_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

-- A dated reminder with an assigned audience. NOT a course or a training record
-- system: there is no content, no assessment and no certificate (ADR-0004).
create table public.team_training_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  source text not null check (source in ('manager_reminder', 'staff_records')),
  audience_kind text not null check (audience_kind in ('all_staff', 'department', 'managers')),
  audience_department_id uuid,
  due_at timestamptz not null,
  mandatory boolean not null default false,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  note text check (note is null or length(btrim(note)) between 1 and 2000),
  created_by_membership_id uuid not null,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, audience_department_id)
    references public.departments (workspace_id, id) on delete restrict,
  foreign key (workspace_id, created_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check ((audience_kind = 'department') = (audience_department_id is not null))
);

-- Per-staff completion of a reminder, recorded by a manager. This is a tick,
-- not a grade, score, certificate or expiry record (ADR-0004).
create table public.team_training_reminder_completions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  reminder_id uuid not null,
  staff_member_id uuid not null,
  completed_at timestamptz not null default transaction_timestamp(),
  recorded_by_membership_id uuid not null,
  unique (workspace_id, id),
  unique (workspace_id, reminder_id, staff_member_id),
  foreign key (workspace_id, reminder_id)
    references public.team_training_reminders (workspace_id, id) on delete restrict,
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, recorded_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

-- Informational manager rail. No RSVP, invitation, capacity, booking, calendar
-- integration or attendance (ADR-0004).
create table public.team_staff_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  occurs_at timestamptz not null,
  created_by_membership_id uuid not null,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, created_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

-- A manager privately noting that they have dealt with a birthday. Never shared
-- with the staff member; one row per staff member per calendar year.
create table public.team_birthday_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  staff_member_id uuid not null,
  birthday_year smallint not null check (birthday_year between 2000 and 2200),
  acknowledged_by_membership_id uuid not null,
  acknowledged_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, staff_member_id, birthday_year),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  foreign key (workspace_id, acknowledged_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

-- ---------------------------------------------------------------------------
-- 4. Indexes.
-- ---------------------------------------------------------------------------

create index team_announcements_workspace_published_idx
  on public.team_announcements (workspace_id, pinned desc, published_at desc);
create index team_announcements_workspace_author_idx
  on public.team_announcements (workspace_id, authored_by_membership_id, published_at desc);
create index team_announcements_workspace_department_idx
  on public.team_announcements (workspace_id, audience_department_id)
  where audience_department_id is not null;
create index team_announcement_recipients_workspace_recipient_idx
  on public.team_announcement_recipients
    (workspace_id, recipient_membership_id, read_at, created_at desc);
create index team_announcement_recipients_workspace_announcement_idx
  on public.team_announcement_recipients (workspace_id, announcement_id, acknowledged_at);
create index team_announcement_comments_workspace_announcement_idx
  on public.team_announcement_comments (workspace_id, announcement_id, created_at);
create index team_training_reminders_workspace_due_idx
  on public.team_training_reminders (workspace_id, due_at)
  where status = 'open';
create index team_training_reminders_workspace_department_idx
  on public.team_training_reminders (workspace_id, audience_department_id)
  where audience_department_id is not null;
create index team_training_reminder_completions_workspace_reminder_idx
  on public.team_training_reminder_completions (workspace_id, reminder_id, completed_at);
create index team_staff_events_workspace_occurs_idx
  on public.team_staff_events (workspace_id, occurs_at);
create index team_birthday_acknowledgements_workspace_staff_idx
  on public.team_birthday_acknowledgements (workspace_id, staff_member_id, birthday_year);

-- Covering indexes for the remaining foreign keys. The phase 4 adversarial gate
-- requires every FK to be index-covered so a referenced-side delete or update
-- never degrades into a sequential scan.
create index team_announcement_recipients_workspace_staff_idx
  on public.team_announcement_recipients (workspace_id, staff_member_id)
  where staff_member_id is not null;
create index team_announcement_comments_workspace_author_idx
  on public.team_announcement_comments (workspace_id, author_membership_id);
create index team_birthday_acknowledgements_workspace_actor_idx
  on public.team_birthday_acknowledgements (workspace_id, acknowledged_by_membership_id);
create index team_training_reminders_workspace_author_idx
  on public.team_training_reminders (workspace_id, created_by_membership_id);
create index team_training_reminder_completions_workspace_staff_idx
  on public.team_training_reminder_completions (workspace_id, staff_member_id);
create index team_training_reminder_completions_workspace_actor_idx
  on public.team_training_reminder_completions (workspace_id, recorded_by_membership_id);
create index team_staff_events_workspace_author_idx
  on public.team_staff_events (workspace_id, created_by_membership_id);

-- ---------------------------------------------------------------------------
-- 5. Immutability guards.
--
--    Recipient identity and elapsed read/acknowledge state are write-once: once
--    a staff member has acknowledged, nobody — manager, RPC or SQL caller — can
--    rewrite or withdraw that fact.
-- ---------------------------------------------------------------------------

create or replace function public.guard_team_announcement_recipient_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'team announcement recipients are retained' using errcode = '55000';
  end if;
  if row(new.id, new.workspace_id, new.announcement_id, new.recipient_membership_id,
         new.staff_member_id, new.delivered_at, new.created_at)
     is distinct from
     row(old.id, old.workspace_id, old.announcement_id, old.recipient_membership_id,
         old.staff_member_id, old.delivered_at, old.created_at)
     or (old.read_at is not null and new.read_at is distinct from old.read_at)
     or (old.acknowledged_at is not null and new.acknowledged_at is distinct from old.acknowledged_at)
  then
    raise exception 'team announcement recipient identity and read state are immutable'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_team_training_completion_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'training completions are retained' using errcode = '55000';
end;
$$;

create trigger team_announcements_reject_changes
before update or delete on public.team_announcements
for each row execute function public.reject_immutable_row_change();

create trigger team_announcement_recipients_guard_change
before update or delete on public.team_announcement_recipients
for each row execute function public.guard_team_announcement_recipient_change();

create trigger team_announcement_comments_reject_changes
before update or delete on public.team_announcement_comments
for each row execute function public.reject_immutable_row_change();

create trigger team_training_reminders_set_updated_at
before update on public.team_training_reminders
for each row execute function public.set_updated_at();

create trigger team_training_reminders_protect_immutable
before update on public.team_training_reminders
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'source', 'created_by_membership_id', 'created_at'
);

create trigger team_training_reminder_completions_guard_change
before update or delete on public.team_training_reminder_completions
for each row execute function public.guard_team_training_completion_change();

create trigger team_staff_events_reject_changes
before update or delete on public.team_staff_events
for each row execute function public.reject_immutable_row_change();

create trigger team_birthday_acknowledgements_reject_changes
before update or delete on public.team_birthday_acknowledgements
for each row execute function public.reject_immutable_row_change();

-- ---------------------------------------------------------------------------
-- 6. RLS, grants and policies.
--
--    Managers read everything in their own workspace. Staff read NOTHING here
--    directly — their entire view of an announcement is the staff-safe view in
--    section 7, which exposes only their own recipient row.
-- ---------------------------------------------------------------------------

alter table public.team_announcements enable row level security;
alter table public.team_announcement_recipients enable row level security;
alter table public.team_announcement_comments enable row level security;
alter table public.team_training_reminders enable row level security;
alter table public.team_training_reminder_completions enable row level security;
alter table public.team_staff_events enable row level security;
alter table public.team_birthday_acknowledgements enable row level security;

revoke all on table
  public.team_announcements,
  public.team_announcement_recipients,
  public.team_announcement_comments,
  public.team_training_reminders,
  public.team_training_reminder_completions,
  public.team_staff_events,
  public.team_birthday_acknowledgements
from public, anon, authenticated;

grant select on table
  public.team_announcements,
  public.team_announcement_recipients,
  public.team_announcement_comments,
  public.team_training_reminders,
  public.team_training_reminder_completions,
  public.team_staff_events,
  public.team_birthday_acknowledgements
to authenticated;

create policy team_announcements_manager_select on public.team_announcements
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

-- A recipient may read their own delivery row; a manager reads the whole
-- roster. No staff member can ever see another staff member's read state.
create policy team_announcement_recipients_own_select on public.team_announcement_recipients
  for select to authenticated
  using (recipient_membership_id = public.current_workspace_membership_id(workspace_id));

create policy team_announcement_recipients_manager_select on public.team_announcement_recipients
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy team_announcement_comments_manager_select on public.team_announcement_comments
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy team_training_reminders_manager_select on public.team_training_reminders
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy team_training_reminder_completions_manager_select
  on public.team_training_reminder_completions
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy team_staff_events_manager_select on public.team_staff_events
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy team_birthday_acknowledgements_manager_select
  on public.team_birthday_acknowledgements
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

-- ---------------------------------------------------------------------------
-- 7. Staff-safe announcement view.
--
--    Deliberately narrow owner-rights barrier view, matching established staff
--    portal views that join manager-only base tables. The caller is gated to
--    their own active membership for every row; staff need no base-table grant.
--    It carries no roster, other recipient, author, comment or birthday field.
-- ---------------------------------------------------------------------------

create view public.staff_team_announcements
with (security_barrier = true)
as
select
  announcement.workspace_id,
  announcement.id as announcement_id,
  announcement.title,
  announcement.body,
  announcement.pinned,
  announcement.requires_acknowledgement,
  -- The manager's own "highlight in staff updates" choice for THIS recipient's
  -- announcement. Carries no other member's data; it exists so the option has a
  -- truthful effect in the portal instead of being stored and never shown.
  announcement.highlight_in_updates,
  announcement.published_at,
  recipient.delivered_at,
  recipient.read_at,
  recipient.acknowledged_at
from public.team_announcement_recipients as recipient
join public.team_announcements as announcement
  on announcement.workspace_id = recipient.workspace_id
 and announcement.id = recipient.announcement_id
where recipient.recipient_membership_id
      = public.current_workspace_membership_id(recipient.workspace_id);

revoke all on table public.staff_team_announcements from public, anon, authenticated;
grant select on table public.staff_team_announcements to authenticated;

comment on view public.staff_team_announcements is
  'Staff-safe projection of a recipient''s own announcements and their own read/acknowledge state. Never exposes the roster, other recipients, manager comments or birthday data.';

-- ---------------------------------------------------------------------------
-- 8. Recipient resolution.
--
--    The single place an audience becomes a concrete recipient set. A client
--    never supplies recipient ids for a broadcast, so a forged fan-out — to
--    another workspace, to an inactive member, or to someone outside the chosen
--    department — is not expressible through the API surface.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_team_audience(
  p_workspace_id uuid,
  p_audience_kind text,
  p_department_id uuid
)
returns table (membership_id uuid, staff_member_id uuid)
language sql
stable
set search_path = ''
as $$
  select membership.id, staff.id
  from public.workspace_memberships as membership
  left join public.staff_members as staff
    on staff.workspace_id = membership.workspace_id
   and staff.membership_id = membership.id
   and staff.employment_status = 'active'
  where membership.workspace_id = p_workspace_id
    -- 'invited' is included deliberately: a staff member who has been added to
    -- the roster but has not yet claimed portal access is still part of "All
    -- Staff". Their delivery row waits for them. 'suspended' and 'revoked' are
    -- excluded, so an offboarded person never receives a broadcast.
    and membership.status in ('active', 'invited')
    and (
      (p_audience_kind = 'managers' and membership.role in ('owner', 'manager'))
      or (
        p_audience_kind in ('all_staff', 'department')
        and membership.role = 'staff'
        and staff.id is not null
        and (p_audience_kind = 'all_staff' or staff.department_id = p_department_id)
      )
    );
$$;

comment on function public.rpc_internal_team_audience(uuid, text, uuid) is
  'Resolves a Team audience to active workspace memberships. The only sanctioned recipient resolver for Team broadcasts; clients never supply recipient ids.';

-- ---------------------------------------------------------------------------
-- 9. Write RPCs.
-- ---------------------------------------------------------------------------

-- The manager Staff editor needs the day/month values without restoring broad
-- birthday-column authority on staff_members. Workspace authority is resolved
-- from the caller's JWT before any row is returned.
create or replace function public.rpc_team_read_staff_birthdays(p_workspace_id uuid)
returns table (
  staff_member_id uuid,
  birth_day smallint,
  birth_month smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.rpc_internal_require_manager(p_workspace_id);

  return query
  select staff.id, staff.birth_day, staff.birth_month
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
  order by staff.id;
end;
$$;

create or replace function public.rpc_team_create_announcement(
  p_workspace_id uuid, p_request_id uuid, p_title text, p_body text,
  p_audience_kind text, p_audience_department_id uuid, p_pinned boolean,
  p_requires_acknowledgement boolean, p_highlight_in_updates boolean
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; announcement_id uuid;
  recipient_count integer; recipient_ids uuid[];
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.announcement.create');
  if not request_is_new then return result; end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null or length(btrim(p_title)) > 200 then
    raise exception 'announcement subject is required and must be at most 200 characters'
      using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_body, '')), '') is null or length(btrim(p_body)) > 4000 then
    raise exception 'announcement body is required and must be at most 4000 characters'
      using errcode = '22023';
  end if;
  if p_audience_kind is null or p_audience_kind not in ('all_staff', 'department', 'managers') then
    raise exception 'announcement audience is required' using errcode = '22023';
  end if;
  if (p_audience_kind = 'department') <> (p_audience_department_id is not null) then
    raise exception 'a department audience requires exactly one department' using errcode = '22023';
  end if;
  if p_audience_department_id is not null and not exists (
    select 1 from public.departments as department
    where department.workspace_id = p_workspace_id and department.id = p_audience_department_id
  ) then
    raise exception 'announcement department does not belong to this workspace' using errcode = '55000';
  end if;

  select array_agg(audience.membership_id), count(*)
  into recipient_ids, recipient_count
  from public.rpc_internal_team_audience(
    p_workspace_id, p_audience_kind, p_audience_department_id
  ) as audience;

  if coalesce(recipient_count, 0) = 0 then
    raise exception 'this audience currently has no active recipients' using errcode = '55000';
  end if;

  insert into public.team_announcements (
    workspace_id, title, body, audience_kind, audience_department_id, pinned,
    requires_acknowledgement, highlight_in_updates, authored_by_membership_id
  ) values (
    p_workspace_id, btrim(p_title), btrim(p_body), p_audience_kind, p_audience_department_id,
    coalesce(p_pinned, false), coalesce(p_requires_acknowledgement, true),
    coalesce(p_highlight_in_updates, true), actor_id
  ) returning id into announcement_id;

  insert into public.team_announcement_recipients (
    workspace_id, announcement_id, recipient_membership_id, staff_member_id
  )
  select p_workspace_id, announcement_id, audience.membership_id, audience.staff_member_id
  from public.rpc_internal_team_audience(
    p_workspace_id, p_audience_kind, p_audience_department_id
  ) as audience;

  perform public.rpc_internal_notify(
    p_workspace_id, actor_id, 'announcement', btrim(p_title),
    left(btrim(p_body), 2000), 'team_announcement', announcement_id, recipient_ids
  );
  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'team.announcement_published', 'team_announcement', announcement_id,
    jsonb_build_object(
      'audience_kind', p_audience_kind,
      'department_id', p_audience_department_id,
      'recipient_count', recipient_count,
      'requires_acknowledgement', coalesce(p_requires_acknowledgement, true)
    )
  );

  result := jsonb_build_object(
    'announcement_id', announcement_id, 'recipient_count', recipient_count
  );
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

-- Read and acknowledge run under the RECIPIENT's own membership. A manager
-- calling these can only ever move their own row.
create or replace function public.rpc_team_mark_announcement_read(
  p_workspace_id uuid, p_request_id uuid, p_announcement_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; prior_time timestamptz;
begin
  actor_id := public.rpc_internal_require_membership(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.announcement.read');
  if not request_is_new then return result; end if;

  select read_at into prior_time from public.team_announcement_recipients
  where workspace_id = p_workspace_id and announcement_id = p_announcement_id
    and recipient_membership_id = actor_id for update;
  if not found then
    raise exception 'caller is not a recipient of this announcement' using errcode = '42501';
  end if;
  if prior_time is null then
    update public.team_announcement_recipients set read_at = transaction_timestamp()
    where workspace_id = p_workspace_id and announcement_id = p_announcement_id
      and recipient_membership_id = actor_id;
  end if;

  result := jsonb_build_object('announcement_id', p_announcement_id, 'changed', prior_time is null);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_acknowledge_announcement(
  p_workspace_id uuid, p_request_id uuid, p_announcement_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb; prior_time timestamptz;
  ack_required boolean;
begin
  actor_id := public.rpc_internal_require_membership(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.announcement.ack');
  if not request_is_new then return result; end if;

  select requires_acknowledgement into ack_required from public.team_announcements
  where workspace_id = p_workspace_id and id = p_announcement_id;
  if ack_required is null then
    raise exception 'announcement not found' using errcode = '55000';
  end if;
  if not ack_required then
    raise exception 'this announcement does not ask for an acknowledgement' using errcode = '55000';
  end if;

  select acknowledged_at into prior_time from public.team_announcement_recipients
  where workspace_id = p_workspace_id and announcement_id = p_announcement_id
    and recipient_membership_id = actor_id for update;
  if not found then
    raise exception 'caller is not a recipient of this announcement' using errcode = '42501';
  end if;
  if prior_time is null then
    update public.team_announcement_recipients
    set read_at = coalesce(read_at, transaction_timestamp()),
        acknowledged_at = transaction_timestamp()
    where workspace_id = p_workspace_id and announcement_id = p_announcement_id
      and recipient_membership_id = actor_id;
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'team.announcement_acknowledged',
      'team_announcement', p_announcement_id, '{}'::jsonb
    );
  end if;

  result := jsonb_build_object('announcement_id', p_announcement_id, 'changed', prior_time is null);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_add_announcement_comment(
  p_workspace_id uuid, p_request_id uuid, p_announcement_id uuid, p_body text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; comment_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.announcement.comment');
  if not request_is_new then return result; end if;

  if nullif(btrim(coalesce(p_body, '')), '') is null or length(btrim(p_body)) > 2000 then
    raise exception 'a note is required and must be at most 2000 characters' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.team_announcements as announcement
    where announcement.workspace_id = p_workspace_id and announcement.id = p_announcement_id
  ) then
    raise exception 'announcement not found' using errcode = '55000';
  end if;

  insert into public.team_announcement_comments (
    workspace_id, announcement_id, author_membership_id, body
  ) values (p_workspace_id, p_announcement_id, actor_id, btrim(p_body))
  returning id into comment_id;

  result := jsonb_build_object('comment_id', comment_id, 'announcement_id', p_announcement_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

-- "Remind" targets only recipients who have not read yet. It never invents a
-- read state and never reaches anyone outside the original recipient set.
create or replace function public.rpc_team_remind_announcement_non_readers(
  p_workspace_id uuid, p_request_id uuid, p_announcement_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb;
  announcement_title text; pending_ids uuid[]; pending_count integer;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.announcement.remind');
  if not request_is_new then return result; end if;

  select title into announcement_title from public.team_announcements
  where workspace_id = p_workspace_id and id = p_announcement_id;
  if announcement_title is null then
    raise exception 'announcement not found' using errcode = '55000';
  end if;

  select array_agg(recipient.recipient_membership_id), count(*)
  into pending_ids, pending_count
  from public.team_announcement_recipients as recipient
  where recipient.workspace_id = p_workspace_id
    and recipient.announcement_id = p_announcement_id
    and recipient.read_at is null;

  if coalesce(pending_count, 0) > 0 then
    perform public.rpc_internal_notify(
      p_workspace_id, actor_id, 'announcement_reminder', 'Reminder: ' || announcement_title,
      'Please read and confirm this announcement.', 'team_announcement', p_announcement_id,
      pending_ids
    );
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'team.announcement_reminded', 'team_announcement', p_announcement_id,
      jsonb_build_object('reminded_count', pending_count)
    );
  end if;

  result := jsonb_build_object(
    'announcement_id', p_announcement_id, 'reminded_count', coalesce(pending_count, 0)
  );
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_create_training_reminder(
  p_workspace_id uuid, p_request_id uuid, p_title text, p_source text,
  p_audience_kind text, p_audience_department_id uuid, p_due_at timestamptz,
  p_mandatory boolean
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; reminder_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.training.create');
  if not request_is_new then return result; end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null or length(btrim(p_title)) > 200 then
    raise exception 'reminder title is required and must be at most 200 characters'
      using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('manager_reminder', 'staff_records') then
    raise exception 'reminder source is required' using errcode = '22023';
  end if;
  if p_audience_kind is null or p_audience_kind not in ('all_staff', 'department', 'managers') then
    raise exception 'reminder audience is required' using errcode = '22023';
  end if;
  if (p_audience_kind = 'department') <> (p_audience_department_id is not null) then
    raise exception 'a department audience requires exactly one department' using errcode = '22023';
  end if;
  if p_due_at is null then
    raise exception 'a due date is required' using errcode = '22023';
  end if;
  if p_audience_department_id is not null and not exists (
    select 1 from public.departments as department
    where department.workspace_id = p_workspace_id and department.id = p_audience_department_id
  ) then
    raise exception 'reminder department does not belong to this workspace' using errcode = '55000';
  end if;

  insert into public.team_training_reminders (
    workspace_id, title, source, audience_kind, audience_department_id, due_at,
    mandatory, created_by_membership_id
  ) values (
    p_workspace_id, btrim(p_title), p_source, p_audience_kind, p_audience_department_id,
    p_due_at, coalesce(p_mandatory, false), actor_id
  ) returning id into reminder_id;

  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'team.training_reminder_created', 'team_training_reminder',
    reminder_id, jsonb_build_object('audience_kind', p_audience_kind, 'mandatory', coalesce(p_mandatory, false))
  );

  result := jsonb_build_object('reminder_id', reminder_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_record_training_completion(
  p_workspace_id uuid, p_request_id uuid, p_reminder_id uuid, p_staff_member_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb;
  audience_kind_value text; department_value uuid; assigned_count integer; done_count integer;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.training.complete');
  if not request_is_new then return result; end if;

  select audience_kind, audience_department_id into audience_kind_value, department_value
  from public.team_training_reminders
  where workspace_id = p_workspace_id and id = p_reminder_id and status = 'open'
  for update;
  if not found then
    raise exception 'open training reminder not found' using errcode = '55000';
  end if;

  -- Completion may only be recorded for someone the reminder was assigned to.
  if not exists (
    select 1 from public.rpc_internal_team_audience(
      p_workspace_id, audience_kind_value, department_value
    ) as audience
    where audience.staff_member_id = p_staff_member_id
  ) then
    raise exception 'staff member is not assigned to this reminder' using errcode = '55000';
  end if;

  insert into public.team_training_reminder_completions (
    workspace_id, reminder_id, staff_member_id, recorded_by_membership_id
  ) values (p_workspace_id, p_reminder_id, p_staff_member_id, actor_id)
  on conflict (workspace_id, reminder_id, staff_member_id) do nothing;

  select count(*) into assigned_count
  from public.rpc_internal_team_audience(
    p_workspace_id, audience_kind_value, department_value
  ) as audience
  where audience.staff_member_id is not null;

  select count(*) into done_count
  from public.team_training_reminder_completions as completion
  where completion.workspace_id = p_workspace_id and completion.reminder_id = p_reminder_id;

  if done_count >= assigned_count then
    update public.team_training_reminders set status = 'completed'
    where workspace_id = p_workspace_id and id = p_reminder_id;
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'team.training_completion_recorded', 'team_training_reminder',
    p_reminder_id, jsonb_build_object('staff_member_id', p_staff_member_id,
                                      'completed_count', done_count,
                                      'assigned_count', assigned_count)
  );

  result := jsonb_build_object(
    'reminder_id', p_reminder_id, 'completed_count', done_count, 'assigned_count', assigned_count
  );
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_send_training_reminder(
  p_workspace_id uuid, p_request_id uuid, p_reminder_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor_id uuid; request_is_new boolean; result jsonb;
  reminder_title text; audience_kind_value text; department_value uuid;
  recipient_ids uuid[]; recipient_count integer;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.training.remind');
  if not request_is_new then return result; end if;

  select title, audience_kind, audience_department_id
  into reminder_title, audience_kind_value, department_value
  from public.team_training_reminders
  where workspace_id = p_workspace_id and id = p_reminder_id;
  if reminder_title is null then
    raise exception 'training reminder not found' using errcode = '55000';
  end if;

  select array_agg(audience.membership_id), count(*) into recipient_ids, recipient_count
  from public.rpc_internal_team_audience(
    p_workspace_id, audience_kind_value, department_value
  ) as audience;

  if coalesce(recipient_count, 0) > 0 then
    perform public.rpc_internal_notify(
      p_workspace_id, actor_id, 'team_training_reminder', reminder_title,
      'A training reminder is due.', 'team_training_reminder', p_reminder_id, recipient_ids
    );
    perform public.rpc_internal_write_audit(
      p_workspace_id, actor_id, 'team.training_reminder_sent', 'team_training_reminder',
      p_reminder_id, jsonb_build_object('recipient_count', recipient_count)
    );
  end if;

  result := jsonb_build_object(
    'reminder_id', p_reminder_id, 'reminded_count', coalesce(recipient_count, 0)
  );
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_set_training_note(
  p_workspace_id uuid, p_request_id uuid, p_reminder_id uuid, p_note text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.training.note');
  if not request_is_new then return result; end if;

  if nullif(btrim(coalesce(p_note, '')), '') is null or length(btrim(p_note)) > 2000 then
    raise exception 'a note is required and must be at most 2000 characters' using errcode = '22023';
  end if;

  update public.team_training_reminders set note = btrim(p_note)
  where workspace_id = p_workspace_id and id = p_reminder_id;
  if not found then
    raise exception 'training reminder not found' using errcode = '55000';
  end if;

  result := jsonb_build_object('reminder_id', p_reminder_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_create_staff_event(
  p_workspace_id uuid, p_request_id uuid, p_title text, p_occurs_at timestamptz
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; event_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.event.create');
  if not request_is_new then return result; end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null or length(btrim(p_title)) > 200 then
    raise exception 'event title is required and must be at most 200 characters'
      using errcode = '22023';
  end if;
  if p_occurs_at is null then
    raise exception 'an event time is required' using errcode = '22023';
  end if;

  insert into public.team_staff_events (workspace_id, title, occurs_at, created_by_membership_id)
  values (p_workspace_id, btrim(p_title), p_occurs_at, actor_id)
  returning id into event_id;

  result := jsonb_build_object('event_id', event_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_set_staff_birthday(
  p_workspace_id uuid, p_request_id uuid, p_staff_member_id uuid,
  p_birth_day smallint, p_birth_month smallint
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.birthday.set');
  if not request_is_new then return result; end if;

  if (p_birth_day is null) <> (p_birth_month is null) then
    raise exception 'a birthday needs both a day and a month' using errcode = '22023';
  end if;

  update public.staff_members set birth_day = p_birth_day, birth_month = p_birth_month
  where workspace_id = p_workspace_id and id = p_staff_member_id;
  if not found then
    raise exception 'staff member not found' using errcode = '55000';
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'team.birthday_set', 'staff_member', p_staff_member_id,
    jsonb_build_object('cleared', p_birth_day is null)
  );

  result := jsonb_build_object('staff_member_id', p_staff_member_id);
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

create or replace function public.rpc_team_acknowledge_birthday(
  p_workspace_id uuid, p_request_id uuid, p_staff_member_id uuid, p_birthday_year smallint
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid; request_is_new boolean; result jsonb; inserted_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  select o_is_new, o_response into request_is_new, result
  from public.rpc_ops_claim_request(p_workspace_id, actor_id, p_request_id, 'team.birthday.ack');
  if not request_is_new then return result; end if;

  if not exists (
    select 1 from public.staff_members as staff
    where staff.workspace_id = p_workspace_id and staff.id = p_staff_member_id
      and staff.birth_day is not null
  ) then
    raise exception 'staff member has no recorded birthday' using errcode = '55000';
  end if;

  insert into public.team_birthday_acknowledgements (
    workspace_id, staff_member_id, birthday_year, acknowledged_by_membership_id
  ) values (p_workspace_id, p_staff_member_id, p_birthday_year, actor_id)
  on conflict (workspace_id, staff_member_id, birthday_year) do nothing
  returning id into inserted_id;

  result := jsonb_build_object(
    'staff_member_id', p_staff_member_id, 'changed', inserted_id is not null
  );
  perform public.rpc_ops_finish_request(p_workspace_id, actor_id, p_request_id, result);
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Export — the acknowledgement roster for one announcement.
--     Scoped to the drawer that offers it; not a reporting subsystem.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_team_export_announcement_roster(
  p_workspace_id uuid, p_announcement_id uuid
)
returns table (
  display_name text,
  role_name text,
  department_name text,
  delivered_at timestamptz,
  read_at timestamptz,
  acknowledged_at timestamptz,
  status text
)
language plpgsql volatile security definer set search_path = '' as $$
declare actor_id uuid;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  if not exists (
    select 1 from public.team_announcements as announcement
    where announcement.workspace_id = p_workspace_id and announcement.id = p_announcement_id
  ) then
    raise exception 'announcement not found' using errcode = '55000';
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id, actor_id, 'team.announcement_roster_exported', 'team_announcement',
    p_announcement_id, '{}'::jsonb
  );

  return query
  select
    public.rpc_internal_csv_safe(staff.display_name),
    public.rpc_internal_csv_safe(staff.role_name),
    public.rpc_internal_csv_safe(department.name),
    recipient.delivered_at,
    recipient.read_at,
    recipient.acknowledged_at,
    case
      when recipient.acknowledged_at is not null then 'acknowledged'
      when recipient.read_at is not null then 'read'
      else 'unread'
    end
  from public.team_announcement_recipients as recipient
  left join public.staff_members as staff
    on staff.workspace_id = recipient.workspace_id
   and staff.id = recipient.staff_member_id
  left join public.departments as department
    on department.workspace_id = staff.workspace_id
   and department.id = staff.department_id
  where recipient.workspace_id = p_workspace_id
    and recipient.announcement_id = p_announcement_id
  order by 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Read model.
--
--     Every nested collection is coalesced to '[]' so the route can never
--     receive a null array (the Phase 50 Ops read-model lesson).
-- ---------------------------------------------------------------------------

create or replace function public.rpc_team_read_page(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor_id uuid; today_local date; result jsonb;
begin
  actor_id := public.rpc_internal_require_manager(p_workspace_id);
  today_local := (transaction_timestamp() at time zone coalesce(
    (select location.timezone from public.locations as location
     where location.workspace_id = p_workspace_id and location.status = 'active'
     order by location.created_at limit 1), 'UTC'))::date;

  select jsonb_build_object(
    'announcements', coalesce((
      select jsonb_agg(item order by item->>'publishedAt' desc)
      from (
        select jsonb_build_object(
          'id', announcement.id,
          'title', announcement.title,
          'body', announcement.body,
          'pinned', announcement.pinned,
          'audienceKind', announcement.audience_kind,
          'audienceDepartmentId', announcement.audience_department_id,
          'audienceLabel', case
            when announcement.audience_kind = 'all_staff' then 'All Staff'
            when announcement.audience_kind = 'managers' then 'Managers'
            else coalesce(department.name, 'Department')
          end,
          'requiresAcknowledgement', announcement.requires_acknowledgement,
          'highlightInUpdates', announcement.highlight_in_updates,
          'publishedAt', announcement.published_at,
          'authorName', author_staff.display_name,
          'recipientCount', (
            select count(*) from public.team_announcement_recipients as recipient
            where recipient.workspace_id = announcement.workspace_id
              and recipient.announcement_id = announcement.id
          ),
          'readCount', (
            select count(*) from public.team_announcement_recipients as recipient
            where recipient.workspace_id = announcement.workspace_id
              and recipient.announcement_id = announcement.id and recipient.read_at is not null
          ),
          'acknowledgedCount', (
            select count(*) from public.team_announcement_recipients as recipient
            where recipient.workspace_id = announcement.workspace_id
              and recipient.announcement_id = announcement.id
              and recipient.acknowledged_at is not null
          ),
          'viewerAcknowledged', exists (
            select 1 from public.team_announcement_recipients as recipient
            where recipient.workspace_id = announcement.workspace_id
              and recipient.announcement_id = announcement.id
              and recipient.recipient_membership_id = actor_id
              and recipient.acknowledged_at is not null
          ),
          'viewerIsRecipient', exists (
            select 1 from public.team_announcement_recipients as recipient
            where recipient.workspace_id = announcement.workspace_id
              and recipient.announcement_id = announcement.id
              and recipient.recipient_membership_id = actor_id
          ),
          'recipients', coalesce((
            select jsonb_agg(jsonb_build_object(
              'membershipId', recipient.recipient_membership_id,
              'staffMemberId', recipient.staff_member_id,
              'name', coalesce(recipient_staff.display_name, 'Team member'),
              'roleName', recipient_staff.role_name,
              'status', case
                when recipient.acknowledged_at is not null then 'acknowledged'
                when recipient.read_at is not null then 'read'
                else 'unread'
              end
            ) order by coalesce(recipient_staff.display_name, 'Team member'))
            from public.team_announcement_recipients as recipient
            left join public.staff_members as recipient_staff
              on recipient_staff.workspace_id = recipient.workspace_id
             and recipient_staff.id = recipient.staff_member_id
            where recipient.workspace_id = announcement.workspace_id
              and recipient.announcement_id = announcement.id
          ), '[]'::jsonb),
          'comments', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', comment.id,
              'body', comment.body,
              'createdAt', comment.created_at,
              'authorName', coalesce(comment_staff.display_name, 'Manager')
            ) order by comment.created_at)
            from public.team_announcement_comments as comment
            left join public.staff_members as comment_staff
              on comment_staff.workspace_id = comment.workspace_id
             and comment_staff.membership_id = comment.author_membership_id
            where comment.workspace_id = announcement.workspace_id
              and comment.announcement_id = announcement.id
          ), '[]'::jsonb)
        ) as item
        from public.team_announcements as announcement
        left join public.departments as department
          on department.workspace_id = announcement.workspace_id
         and department.id = announcement.audience_department_id
        left join public.staff_members as author_staff
          on author_staff.workspace_id = announcement.workspace_id
         and author_staff.membership_id = announcement.authored_by_membership_id
        where announcement.workspace_id = p_workspace_id
        order by announcement.pinned desc, announcement.published_at desc
        limit 100
      ) as announcements
    ), '[]'::jsonb),
    'trainingReminders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reminder.id,
        'title', reminder.title,
        'source', reminder.source,
        'audienceKind', reminder.audience_kind,
        'audienceLabel', case
          when reminder.audience_kind = 'all_staff' then 'All Staff'
          when reminder.audience_kind = 'managers' then 'Managers'
          else coalesce(reminder_department.name, 'Department')
        end,
        'dueAt', reminder.due_at,
        'mandatory', reminder.mandatory,
        'status', reminder.status,
        'note', reminder.note,
        'assignedCount', (
          select count(*) from public.rpc_internal_team_audience(
            p_workspace_id, reminder.audience_kind, reminder.audience_department_id
          ) as audience where audience.staff_member_id is not null
        ),
        'completedCount', (
          select count(*) from public.team_training_reminder_completions as completion
          where completion.workspace_id = reminder.workspace_id
            and completion.reminder_id = reminder.id
        ),
        'assignees', coalesce((
          select jsonb_agg(jsonb_build_object(
            'staffMemberId', audience.staff_member_id,
            'name', assignee.display_name,
            'completed', exists (
              select 1 from public.team_training_reminder_completions as completion
              where completion.workspace_id = reminder.workspace_id
                and completion.reminder_id = reminder.id
                and completion.staff_member_id = audience.staff_member_id
            )
          ) order by assignee.display_name)
          from public.rpc_internal_team_audience(
            p_workspace_id, reminder.audience_kind, reminder.audience_department_id
          ) as audience
          join public.staff_members as assignee
            on assignee.workspace_id = p_workspace_id and assignee.id = audience.staff_member_id
        ), '[]'::jsonb)
      ) order by reminder.due_at)
      from public.team_training_reminders as reminder
      left join public.departments as reminder_department
        on reminder_department.workspace_id = reminder.workspace_id
       and reminder_department.id = reminder.audience_department_id
      where reminder.workspace_id = p_workspace_id and reminder.status <> 'cancelled'
    ), '[]'::jsonb),
    'birthdays', coalesce((
      select jsonb_agg(jsonb_build_object(
        'staffMemberId', staff.id,
        'name', staff.display_name,
        'birthDay', staff.birth_day,
        'birthMonth', staff.birth_month,
        'occurrenceDate', birthday_occurrence.occurrence_date,
        'occurrenceYear', extract(year from birthday_occurrence.occurrence_date)::smallint,
        'acknowledged', exists (
          select 1 from public.team_birthday_acknowledgements as ack
          where ack.workspace_id = staff.workspace_id and ack.staff_member_id = staff.id
            and ack.birthday_year =
              extract(year from birthday_occurrence.occurrence_date)::smallint
        )
      ) order by birthday_occurrence.occurrence_date, staff.display_name, staff.id)
      from public.staff_members as staff
      cross join lateral (
        select public.team_birthday_reminder_occurrence(
          today_local, staff.birth_month, staff.birth_day
        ) as occurrence_date
      ) as birthday_occurrence
      where staff.workspace_id = p_workspace_id and staff.employment_status = 'active'
        and staff.birth_day is not null
        and birthday_occurrence.occurrence_date is not null
    ), '[]'::jsonb),
    'staffEvents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id, 'title', event.title, 'occursAt', event.occurs_at
      ) order by event.occurs_at)
      from public.team_staff_events as event
      where event.workspace_id = p_workspace_id
        and event.occurs_at >= transaction_timestamp() - interval '1 day'
    ), '[]'::jsonb),
    'audiences', coalesce((
      select jsonb_agg(item order by item->>'sort', item->>'label')
      from (
        select jsonb_build_object(
          'kind', 'all_staff', 'departmentId', null, 'label', 'All Staff',
          'memberCount', (
            select count(*) from public.rpc_internal_team_audience(p_workspace_id, 'all_staff', null)
          ), 'sort', '0'
        ) as item
        union all
        select jsonb_build_object(
          'kind', 'department', 'departmentId', department.id, 'label', department.name,
          'memberCount', (
            select count(*) from public.rpc_internal_team_audience(
              p_workspace_id, 'department', department.id
            )
          ), 'sort', '1'
        )
        from public.departments as department
        where department.workspace_id = p_workspace_id
        union all
        select jsonb_build_object(
          'kind', 'managers', 'departmentId', null, 'label', 'Managers only',
          'memberCount', (
            select count(*) from public.rpc_internal_team_audience(p_workspace_id, 'managers', null)
          ), 'sort', '2'
        )
      ) as audiences
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Function authority.
--
--     rpc_internal_notify stays revoked from every client role: Team publishes
--     through its own definer RPC, never by reaching the fan-out directly.
-- ---------------------------------------------------------------------------

revoke all on function public.guard_team_announcement_recipient_change() from public, anon, authenticated;
revoke all on function public.guard_team_training_completion_change() from public, anon, authenticated;
revoke all on function public.rpc_internal_team_audience(uuid, text, uuid) from public, anon, authenticated;

revoke all on function public.rpc_team_read_staff_birthdays(uuid) from public, anon;
revoke all on function public.rpc_team_create_announcement(uuid, uuid, text, text, text, uuid, boolean, boolean, boolean) from public, anon;
revoke all on function public.rpc_team_mark_announcement_read(uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_team_acknowledge_announcement(uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_team_add_announcement_comment(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.rpc_team_remind_announcement_non_readers(uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_team_create_training_reminder(uuid, uuid, text, text, text, uuid, timestamptz, boolean) from public, anon;
revoke all on function public.rpc_team_record_training_completion(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_team_send_training_reminder(uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_team_set_training_note(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.rpc_team_create_staff_event(uuid, uuid, text, timestamptz) from public, anon;
revoke all on function public.rpc_team_set_staff_birthday(uuid, uuid, uuid, smallint, smallint) from public, anon;
revoke all on function public.rpc_team_acknowledge_birthday(uuid, uuid, uuid, smallint) from public, anon;
revoke all on function public.rpc_team_export_announcement_roster(uuid, uuid) from public, anon;
revoke all on function public.rpc_team_read_page(uuid) from public, anon;

grant execute on function public.rpc_team_read_staff_birthdays(uuid) to authenticated;
grant execute on function public.rpc_team_create_announcement(uuid, uuid, text, text, text, uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.rpc_team_mark_announcement_read(uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_team_acknowledge_announcement(uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_team_add_announcement_comment(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.rpc_team_remind_announcement_non_readers(uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_team_create_training_reminder(uuid, uuid, text, text, text, uuid, timestamptz, boolean) to authenticated;
grant execute on function public.rpc_team_record_training_completion(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_team_send_training_reminder(uuid, uuid, uuid) to authenticated;
grant execute on function public.rpc_team_set_training_note(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.rpc_team_create_staff_event(uuid, uuid, text, timestamptz) to authenticated;
grant execute on function public.rpc_team_set_staff_birthday(uuid, uuid, uuid, smallint, smallint) to authenticated;
grant execute on function public.rpc_team_acknowledge_birthday(uuid, uuid, uuid, smallint) to authenticated;
grant execute on function public.rpc_team_export_announcement_roster(uuid, uuid) to authenticated;
grant execute on function public.rpc_team_read_page(uuid) to authenticated;

comment on table public.team_announcements is
  'Issued manager-to-staff broadcasts. Immutable once published; recipients are resolved server-side by rpc_internal_team_audience, never supplied by a client.';
comment on table public.team_announcement_recipients is
  'Per-recipient delivery, read and acknowledgement state. One row per member per announcement; read/acknowledge are write-once and only the recipient may set them.';
comment on table public.team_announcement_comments is
  'Manager notes attached to one announcement. Not chat: no channels, recipients, reactions or direct messages (ADR-0004).';
comment on table public.team_training_reminders is
  'Dated manager reminders with an assigned audience. Not an LMS: no courses, content, assessments or certificates (ADR-0004).';
comment on table public.team_staff_events is
  'Informational manager rail of upcoming staff events. No RSVP, booking, calendar integration or attendance (ADR-0004).';
comment on table public.team_birthday_acknowledgements is
  'Manager-only record that a birthday was dealt with. Never shared with the staff member.';

comment on function public.rpc_team_read_staff_birthdays(uuid) is
  'Manager-only day/month birthday projection for one authorised workspace. Returns no general private staff data.';

notify pgrst, 'reload schema';
