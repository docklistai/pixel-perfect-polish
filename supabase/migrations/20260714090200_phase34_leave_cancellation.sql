-- Phase 34: honest leave withdrawal and cancellation.
--
-- The schema anticipated cancellation from day one (status 'cancelled', event
-- type 'cancelled') but no RPC could ever reach it. This closes the loop:
--   * rpc_cancel_leave_request — staff withdraw their OWN PENDING request.
--     Status becomes 'cancelled' with no decision fields (the phase 3 CHECK
--     shape for staff withdrawal); the immutable event carries who and when.
--   * rpc_decide_leave_request — recreated with a 'cancelled' decision:
--     manager/owner cancels an APPROVED request with a REQUIRED reason,
--     recording decided_by/decided_at/decision_reason on the row. No more
--     reopen→decline workaround. Reopen now also restores a manager-cancelled
--     request (never a staff-withdrawn one — that was the staff member's call).
--   * When an approval or cancellation overlaps a currently published week,
--     managers get a 'rota_update_required' notification pointing at the week.
--     Publication is never automatic — the draft/publish flow stays the only
--     way staff-visible rotas change.
--
-- State machine after this phase:
--   pending ──staff cancel──▶ cancelled           (no decision fields)
--   pending ──manager approve/decline──▶ approved | declined
--   approved ──manager cancel (reason required)──▶ cancelled (decision fields set)
--   approved | declined | cancelled-by-manager ──manager reopen──▶ pending
--
-- Concurrency: both writers follow the phase-31 protocol — request row locked
-- FOR UPDATE, then the staff_members row — so a cancellation and a publication
-- that reads leave facts serialise per person.

-- ---------------------------------------------------------------------------
-- 1. leave_requests decision CHECK — allow manager-cancelled rows to carry
--    their decision evidence. The original constraint was unnamed; find it by
--    shape instead of guessing the auto-generated name.
-- ---------------------------------------------------------------------------

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint as con
  where con.conrelid = 'public.leave_requests'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%decided_at is null%';

  if constraint_name is null then
    raise exception 'leave_requests decision CHECK constraint not found';
  end if;

  execute format('alter table public.leave_requests drop constraint %I', constraint_name);
end $$;

alter table public.leave_requests add constraint leave_requests_decision_state_check check (
  (
    status = 'pending'
    and decided_at is null
    and decided_by_membership_id is null
    and decision_reason is null
  )
  or (status in ('approved', 'declined') and decided_at is not null and decided_by_membership_id is not null)
  or (
    status = 'cancelled'
    and (
      -- Staff withdrawal of a pending request: no decision was ever made.
      (decided_at is null and decided_by_membership_id is null and decision_reason is null)
      -- Manager cancellation of an approved request: reason is mandatory.
      or (decided_at is not null and decided_by_membership_id is not null and decision_reason is not null)
    )
  )
);

-- Leave lifecycle transitions are RPC-authoritative from this phase. Keep the
-- existing staff INSERT path for a new pending request, but remove direct row
-- updates and direct event fabrication: both bypassed locks, notifications,
-- immutable event evidence, operational issues, and audit writes.
revoke update on table public.leave_requests from authenticated;
drop policy if exists leave_requests_staff_or_manager_update
  on public.leave_requests;

revoke insert on table public.leave_request_events from authenticated;
drop policy if exists leave_request_events_manager_insert
  on public.leave_request_events;

-- ---------------------------------------------------------------------------
-- 2. Notification kinds — leave cancellation + the operational rota pointer.
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'shift_changed',
    'rota_published',
    'leave_approved',
    'leave_declined',
    'leave_cancelled',
    'announcement',
    'timesheet_reminder',
    'open_shift_update',
    'shift_release_update',
    'unavailability_update',
    'rota_update_required'
  )
);

-- ---------------------------------------------------------------------------
-- 3. Persistent rota operational issues. Notifications are delivery evidence,
--    not lifecycle state; this row remains open until an explicit newer
--    publication resolves the draft/published inconsistency.
-- ---------------------------------------------------------------------------

create table public.rota_operational_issues (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rota_week_id uuid not null,
  leave_request_id uuid not null,
  source_snapshot_id uuid not null,
  trigger_status text not null check (trigger_status in ('approved', 'cancelled')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  opened_by_membership_id uuid not null,
  opened_at timestamptz not null default transaction_timestamp(),
  resolved_by_membership_id uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  foreign key (workspace_id, rota_week_id)
    references public.rota_weeks (workspace_id, id) on delete restrict,
  foreign key (workspace_id, leave_request_id)
    references public.leave_requests (workspace_id, id) on delete restrict,
  foreign key (workspace_id, source_snapshot_id)
    references public.published_rota_snapshots (workspace_id, id) on delete restrict,
  foreign key (workspace_id, opened_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, resolved_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (
    (status = 'open' and resolved_by_membership_id is null and resolved_at is null)
    or (status = 'resolved' and resolved_by_membership_id is not null and resolved_at is not null)
  )
);

create unique index rota_operational_issues_one_open_idx
  on public.rota_operational_issues (workspace_id, rota_week_id, leave_request_id)
  where status = 'open';

create index rota_operational_issues_workspace_status_week_idx
  on public.rota_operational_issues (workspace_id, status, rota_week_id, opened_at desc);

create index rota_operational_issues_workspace_leave_idx
  on public.rota_operational_issues (workspace_id, leave_request_id, opened_at desc);

create index rota_operational_issues_workspace_source_snapshot_idx
  on public.rota_operational_issues (workspace_id, source_snapshot_id);

create index rota_operational_issues_workspace_opened_by_idx
  on public.rota_operational_issues (workspace_id, opened_by_membership_id);

create index rota_operational_issues_workspace_resolved_by_idx
  on public.rota_operational_issues (workspace_id, resolved_by_membership_id)
  where resolved_by_membership_id is not null;

create trigger rota_operational_issues_set_updated_at
before update on public.rota_operational_issues
for each row execute function public.set_updated_at();

create trigger rota_operational_issues_protect_immutable
before update on public.rota_operational_issues
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'rota_week_id', 'leave_request_id',
  'source_snapshot_id', 'trigger_status',
  'opened_by_membership_id', 'opened_at', 'created_at'
);

alter table public.rota_operational_issues enable row level security;

revoke all on table public.rota_operational_issues from public, anon;
grant select on table public.rota_operational_issues to authenticated;

create policy rota_operational_issues_manager_select
on public.rota_operational_issues for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.rota_operational_issues is
  'Manager-visible operational state created when an approved/cancelled leave decision makes an already-published week require explicit review and republish. Resolved only by a later publication trigger.';

-- The constraint trigger is deferred so the immutable snapshot header and all
-- of its shifts exist before approved-leave consistency is evaluated. It runs
-- in the same transaction as publication, making issue resolution and audit
-- atomic with the new snapshot.
create or replace function public.resolve_rota_operational_issues_after_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  issue_row record;
begin
  for issue_row in
    select issue.id, issue.trigger_status, issue.leave_request_id,
           leave.status as leave_status, leave.staff_member_id,
           leave.start_date, leave.end_date
    from public.rota_operational_issues as issue
    join public.leave_requests as leave
      on leave.workspace_id = issue.workspace_id
     and leave.id = issue.leave_request_id
    join public.published_rota_snapshots as source_snapshot
      on source_snapshot.workspace_id = issue.workspace_id
     and source_snapshot.id = issue.source_snapshot_id
    where issue.workspace_id = new.workspace_id
      and issue.rota_week_id = new.rota_week_id
      and issue.status = 'open'
      and new.version > source_snapshot.version
    order by issue.id
    for update of issue
  loop
    if issue_row.trigger_status = 'cancelled'
       or issue_row.leave_status <> 'approved'
       or not exists (
         select 1
         from public.published_rota_shifts as shift
         join public.locations as location
           on location.workspace_id = shift.workspace_id
          and location.id = shift.location_id
         join public.workspaces as workspace
           on workspace.id = shift.workspace_id
         where shift.workspace_id = new.workspace_id
           and shift.snapshot_id = new.id
           and shift.staff_member_id = issue_row.staff_member_id
           and issue_row.start_date <= (
             (shift.ends_at - interval '1 second') at time zone
               coalesce(location.timezone, workspace.timezone, 'UTC')
           )::date
           and issue_row.end_date >= shift.shift_date
       ) then
      update public.rota_operational_issues
      set status = 'resolved',
          resolved_by_membership_id = new.published_by_membership_id,
          resolved_at = transaction_timestamp()
      where workspace_id = new.workspace_id
        and id = issue_row.id;

      perform public.rpc_internal_write_audit(
        new.workspace_id,
        new.published_by_membership_id,
        'rota_operational_issue.resolved',
        'rota_operational_issue',
        issue_row.id,
        jsonb_build_object(
          'leave_request_id', issue_row.leave_request_id,
          'published_snapshot_id', new.id,
          'trigger_status', issue_row.trigger_status
        )
      );
    end if;
  end loop;

  return null;
end;
$$;

create constraint trigger resolve_rota_operational_issues_after_publish
after insert on public.published_rota_snapshots
deferrable initially deferred
for each row execute function public.resolve_rota_operational_issues_after_publish();

revoke all on function public.resolve_rota_operational_issues_after_publish()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. rpc_cancel_leave_request — staff withdraw their own pending request.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_cancel_leave_request(
  p_workspace_id uuid,
  p_leave_request_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  own_staff_member_id uuid;
  request_row record;
  staff_display_name text;
begin
  select required.o_membership_id, required.o_staff_member_id
  into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id) as required;

  select request.status, request.start_date, request.end_date, request.leave_type
  into request_row
  from public.leave_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_leave_request_id
    and request.staff_member_id = own_staff_member_id
  for update;

  if request_row.status is null then
    raise exception 'leave request not found for this staff member' using errcode = 'P0002';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'only pending leave requests can be withdrawn — ask your manager to change a decided one'
      using errcode = '55000';
  end if;

  -- Eligibility lock protocol: request row first, then the staff row, matching
  -- every other leave/day-off writer, so publication preflight never reads
  -- leave facts that are changing concurrently.
  perform 1
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id
  for update;

  update public.leave_requests
  set status = 'cancelled'
  where workspace_id = p_workspace_id
    and id = p_leave_request_id;

  insert into public.leave_request_events (
    workspace_id, leave_request_id, actor_membership_id, event_type,
    resulting_status, reason
  )
  values (
    p_workspace_id, p_leave_request_id, caller_membership_id,
    'cancelled', 'cancelled', null
  );

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'leave_cancelled',
    'Leave request withdrawn',
    format(
      '%s withdrew their leave request for %s to %s.',
      staff_display_name,
      to_char(request_row.start_date, 'DD Mon YYYY'),
      to_char(request_row.end_date, 'DD Mon YYYY')
    ),
    'leave_request',
    p_leave_request_id,
    array(
      select membership.id
      from public.workspace_memberships as membership
      where membership.workspace_id = p_workspace_id
        and membership.role in ('owner', 'manager')
        and membership.status = 'active'
        and membership.id <> caller_membership_id
    )
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'leave.cancelled',
    'leave_request',
    p_leave_request_id,
    jsonb_build_object(
      'staff_member_id', own_staff_member_id,
      'resulting_status', 'cancelled',
      'cancelled_by', 'staff'
    )
  );

  return jsonb_build_object('leave_request_id', p_leave_request_id, 'status', 'cancelled');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. rpc_decide_leave_request — recreated from phase 31 with the 'cancelled'
--    decision, reopen of manager-cancelled requests, and the operational
--    'rota_update_required' fan-out when the decision overlaps a currently
--    published week. Lock protocol unchanged: request row, then staff row.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_decide_leave_request(
  p_workspace_id uuid,
  p_leave_request_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  current_status text;
  current_decided_at timestamptz;
  request_staff_member_id uuid;
  request_start_date date;
  request_end_date date;
  staff_membership_id uuid;
  staff_display_name text;
  trimmed_reason text;
  decision_event_type text;
  week_row record;
  issue_id uuid;
  superseded_issue_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_status is null or p_status not in ('approved', 'declined', 'pending', 'cancelled') then
    raise exception 'status must be approved, declined, cancelled, or pending (reopen)'
      using errcode = '22023';
  end if;

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if trimmed_reason is not null and length(trimmed_reason) > 2000 then
    raise exception 'reason must be at most 2000 characters' using errcode = '22023';
  end if;

  if p_status = 'cancelled' and trimmed_reason is null then
    raise exception 'a reason is required to cancel approved leave' using errcode = '22023';
  end if;

  select request.status, request.decided_at, request.staff_member_id,
         request.start_date, request.end_date
  into current_status, current_decided_at, request_staff_member_id,
       request_start_date, request_end_date
  from public.leave_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_leave_request_id
  for update;

  if current_status is null then
    raise exception 'leave request not found in workspace' using errcode = 'P0002';
  end if;

  -- Eligibility lock protocol: the staff row is the per-person authority.
  -- Publication preflight and applicant selection hold it while reading leave
  -- facts; taking the same lock here means a leave decision and a publication
  -- that depends on it can only run one after the other.
  perform 1
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_staff_member_id
  for update;

  if p_status in ('approved', 'declined') then
    if current_status <> 'pending' then
      raise exception 'only pending leave requests can be approved or declined'
        using errcode = '55000';
    end if;

    decision_event_type := p_status;

    update public.leave_requests
    set status = p_status,
        decided_at = transaction_timestamp(),
        decided_by_membership_id = caller_membership_id,
        decision_reason = trimmed_reason
    where workspace_id = p_workspace_id
      and id = p_leave_request_id;
  elsif p_status = 'cancelled' then
    if current_status <> 'approved' then
      raise exception 'only approved leave can be cancelled' using errcode = '55000';
    end if;

    decision_event_type := 'cancelled';

    update public.leave_requests
    set status = 'cancelled',
        decided_at = transaction_timestamp(),
        decided_by_membership_id = caller_membership_id,
        decision_reason = trimmed_reason
    where workspace_id = p_workspace_id
      and id = p_leave_request_id;
  else
    -- Reopen. A staff-withdrawn request (cancelled with no decision evidence)
    -- was the staff member's own call and is never resurrected by a manager.
    if current_status not in ('approved', 'declined')
       and not (current_status = 'cancelled' and current_decided_at is not null) then
      raise exception 'only decided leave requests can be reopened'
        using errcode = '55000';
    end if;

    decision_event_type := 'reopened';

    update public.leave_requests
    set status = 'pending',
        decided_at = null,
        decided_by_membership_id = null,
        decision_reason = null
    where workspace_id = p_workspace_id
      and id = p_leave_request_id;
  end if;

  insert into public.leave_request_events (
    workspace_id, leave_request_id, actor_membership_id, event_type,
    resulting_status, reason
  )
  values (
    p_workspace_id, p_leave_request_id, caller_membership_id,
    decision_event_type, p_status, trimmed_reason
  );

  select staff.membership_id, staff.display_name
  into staff_membership_id, staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    case decision_event_type
      when 'approved' then 'leave_approved'
      when 'declined' then 'leave_declined'
      when 'cancelled' then 'leave_cancelled'
      else 'announcement'
    end,
    case decision_event_type
      when 'approved' then 'Leave approved'
      when 'declined' then 'Leave declined'
      when 'cancelled' then 'Leave cancelled'
      else 'Leave request reopened'
    end,
    format(
      'Your leave request for %s to %s is %s.%s',
      to_char(request_start_date, 'DD Mon YYYY'),
      to_char(request_end_date, 'DD Mon YYYY'),
      case decision_event_type
        when 'reopened' then 'back under review'
        else decision_event_type
      end,
      case
        when decision_event_type = 'cancelled'
          then ' Manager reason: ' || left(trimmed_reason, 1200)
        else ''
      end
    ),
    'leave_request',
    p_leave_request_id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  -- Reopening removes the scheduling constraint immediately. Any outstanding
  -- issue for the former approved/cancelled decision is therefore superseded;
  -- keep the row as history, close it atomically, and audit every affected
  -- week (a leave request may span several published weeks).
  if decision_event_type = 'reopened' then
    for superseded_issue_id in
      update public.rota_operational_issues
      set status = 'resolved',
          resolved_by_membership_id = caller_membership_id,
          resolved_at = transaction_timestamp()
      where workspace_id = p_workspace_id
        and leave_request_id = p_leave_request_id
        and status = 'open'
      returning id
    loop
      perform public.rpc_internal_write_audit(
        p_workspace_id,
        caller_membership_id,
        'rota_operational_issue.superseded',
        'rota_operational_issue',
        superseded_issue_id,
        jsonb_build_object(
          'leave_request_id', p_leave_request_id,
          'reason', 'leave_reopened'
        )
      );
    end loop;
  end if;

  -- Approving or cancelling leave over an already-published week leaves the
  -- published rota describing a plan the manager knows is wrong. Never
  -- republish automatically — point every manager at the affected week(s).
  if decision_event_type in ('approved', 'cancelled') then
    for week_row in
      select week.id, week.week_start, latest_snapshot.id as latest_snapshot_id
      from public.rota_weeks as week
      join lateral (
        select snapshot.id
        from public.published_rota_snapshots as snapshot
        where snapshot.workspace_id = p_workspace_id
          and snapshot.rota_week_id = week.id
        order by snapshot.version desc
        limit 1
      ) as latest_snapshot on true
      where week.workspace_id = p_workspace_id
        and week.week_start <= request_end_date
        and week.week_start + 6 >= request_start_date
        and exists (
          select 1
          from public.published_rota_snapshots as snapshot
          where snapshot.workspace_id = p_workspace_id
            and snapshot.rota_week_id = week.id
        )
        and (
          -- A cancellation reopens planning for the whole overlapped week; an
          -- approval matters only where they are on the published rota.
          decision_event_type = 'cancelled'
          or exists (
            select 1
            from public.published_rota_shifts as shift
            join public.published_rota_snapshots as snapshot
              on snapshot.workspace_id = shift.workspace_id
             and snapshot.id = shift.snapshot_id
            join public.locations as location
              on location.workspace_id = shift.workspace_id
             and location.id = shift.location_id
            join public.workspaces as workspace
              on workspace.id = shift.workspace_id
            where shift.workspace_id = p_workspace_id
              and snapshot.rota_week_id = week.id
              and snapshot.version = (
                select max(later.version)
                from public.published_rota_snapshots as later
                where later.workspace_id = p_workspace_id
                  and later.rota_week_id = week.id
              )
              and shift.staff_member_id = request_staff_member_id
              and request_start_date <= (
                (shift.ends_at - interval '1 second') at time zone
                  coalesce(location.timezone, workspace.timezone, 'UTC')
              )::date
              and request_end_date >= shift.shift_date
          )
        )
      order by week.week_start
    loop
      -- A later leave decision supersedes an earlier open issue for the same
      -- request/week, but does not erase its evidence. Close it and open one
      -- row tied to the currently published snapshot and current decision.
      superseded_issue_id := null;
      update public.rota_operational_issues
      set status = 'resolved',
          resolved_by_membership_id = caller_membership_id,
          resolved_at = transaction_timestamp()
      where workspace_id = p_workspace_id
        and rota_week_id = week_row.id
        and leave_request_id = p_leave_request_id
        and status = 'open'
      returning id into superseded_issue_id;

      if superseded_issue_id is not null then
        perform public.rpc_internal_write_audit(
          p_workspace_id,
          caller_membership_id,
          'rota_operational_issue.superseded',
          'rota_operational_issue',
          superseded_issue_id,
          jsonb_build_object('leave_request_id', p_leave_request_id)
        );
      end if;

      insert into public.rota_operational_issues (
        workspace_id, rota_week_id, leave_request_id, source_snapshot_id,
        trigger_status, opened_by_membership_id
      )
      values (
        p_workspace_id, week_row.id, p_leave_request_id,
        week_row.latest_snapshot_id, decision_event_type,
        caller_membership_id
      )
      returning id into issue_id;

      perform public.rpc_internal_write_audit(
        p_workspace_id,
        caller_membership_id,
        'rota_operational_issue.opened',
        'rota_operational_issue',
        issue_id,
        jsonb_build_object(
          'rota_week_id', week_row.id,
          'leave_request_id', p_leave_request_id,
          'source_snapshot_id', week_row.latest_snapshot_id,
          'trigger_status', decision_event_type
        )
      );

      perform public.rpc_internal_notify(
        p_workspace_id,
        caller_membership_id,
        'rota_update_required',
        'Rota update required',
        format(
          '%s''s leave (%s to %s) was %s and overlaps the published rota for %s to %s. Review the week and republish.',
          coalesce(staff_display_name, 'A team member'),
          to_char(request_start_date, 'DD Mon YYYY'),
          to_char(request_end_date, 'DD Mon YYYY'),
          decision_event_type,
          to_char(week_row.week_start, 'DD Mon'),
          to_char(week_row.week_start + 6, 'DD Mon YYYY')
        ),
        'rota_week',
        week_row.id,
        array(
          select membership.id
          from public.workspace_memberships as membership
          where membership.workspace_id = p_workspace_id
            and membership.role in ('owner', 'manager')
            and membership.status = 'active'
        )
      );
    end loop;
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'leave.' || decision_event_type,
    'leave_request',
    p_leave_request_id,
    jsonb_build_object(
      'staff_member_id', request_staff_member_id,
      'resulting_status', p_status,
      'reason', trimmed_reason
    )
  );

  return jsonb_build_object(
    'leave_request_id', p_leave_request_id,
    'status', p_status
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_cancel_leave_request(uuid, uuid) from public, anon;
grant execute on function public.rpc_cancel_leave_request(uuid, uuid) to authenticated;

revoke all on function public.rpc_decide_leave_request(uuid, uuid, text, text) from public, anon;
grant execute on function public.rpc_decide_leave_request(uuid, uuid, text, text) to authenticated;

comment on function public.rpc_cancel_leave_request(uuid, uuid) is
  'Staff-only: withdraw the caller''s own PENDING leave request (status cancelled, no decision fields). Writes the immutable event, notifies managers, and audits. Locks request row then staff row.';
comment on function public.rpc_decide_leave_request(uuid, uuid, text, text) is
  'Manager-only: approve/decline pending leave, cancel APPROVED leave with a required reason, or reopen a decided request (never a staff withdrawal). Notifies the staff member, raises rota_update_required for overlapping published weeks, and audits.';

notify pgrst, 'reload schema';
