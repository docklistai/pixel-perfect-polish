-- Phase 41: transactional staff offboarding + publish assignee preflight.
--
-- 1. rpc_offboard_staff_member — one atomic, manager-only operation for the
--    existing lightweight offboarding workflow:
--      * marks the staff record left (end date recorded, history retained),
--      * revokes the staff member's portal membership so all RLS access ends,
--      * revokes unclaimed portal access codes and pending recovery codes,
--      * reports every future draft and future published assignment that now
--        needs a manager's action.
--    Nothing is deleted: shifts, time entries, leave history, and audit
--    trails survive untouched. This is not an HR offboarding suite.
--
-- 2. Publication preflight: publishing a week is rejected while any draft
--    shift is assigned to a staff member who is not employment-active or
--    whose portal membership is suspended/revoked, and the error lists the
--    affected shifts. Trigger name sorts before the phase 29 open-shift
--    preflight trigger, so this guard runs first and takes the phase 31
--    staff locks in ascending staff_member_id order.

-- ---------------------------------------------------------------------------
-- 1. rpc_offboard_staff_member
-- ---------------------------------------------------------------------------

create or replace function public.rpc_offboard_staff_member(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  trimmed_reason text;
  staff_row record;
  membership_role text;
  membership_status text;
  already_offboarded boolean := false;
  revoked_membership boolean := false;
  revoked_access_codes integer := 0;
  revoked_recovery_codes integer := 0;
  workspace_today date;
  future_draft jsonb;
  future_published jsonb;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  trimmed_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if trimmed_reason is null then
    raise exception 'an offboarding reason is required' using errcode = '22023';
  end if;
  if length(trimmed_reason) > 500 then
    raise exception 'reason must be at most 500 characters' using errcode = '22023';
  end if;

  -- Phase 31 protocol: the staff row is the per-person eligibility authority
  -- and is locked before the facts below are read or written.
  select staff.id, staff.membership_id, staff.employment_status, staff.display_name
  into staff_row
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = p_staff_member_id
  for update;

  if staff_row.id is null then
    raise exception 'staff member not found in workspace' using errcode = 'P0002';
  end if;

  workspace_today := (now() at time zone (
    select coalesce(ws.timezone, 'UTC') from public.workspaces as ws where ws.id = p_workspace_id
  ))::date;

  if staff_row.employment_status = 'left' then
    already_offboarded := true;
  else
    update public.staff_members
    set employment_status = 'left',
        end_date = coalesce(end_date, workspace_today)
    where workspace_id = p_workspace_id
      and id = p_staff_member_id;
  end if;

  -- Revoke the portal membership (staff role only — a manager's own
  -- membership can never be revoked through staff offboarding).
  if staff_row.membership_id is not null then
    select membership.role, membership.status into membership_role, membership_status
    from public.workspace_memberships as membership
    where membership.workspace_id = p_workspace_id
      and membership.id = staff_row.membership_id
    for update;

    if membership_role = 'staff' and membership_status is distinct from 'revoked' then
      update public.workspace_memberships
      set status = 'revoked'
      where workspace_id = p_workspace_id
        and id = staff_row.membership_id;
      revoked_membership := true;
    end if;
  end if;

  -- Unclaimed portal access codes can no longer be claimed.
  update public.staff_portal_access_codes
  set revoked_at = now(),
      revoked_by_membership_id = caller_membership_id
  where workspace_id = p_workspace_id
    and staff_member_id = p_staff_member_id
    and claimed_at is null
    and revoked_at is null;
  get diagnostics revoked_access_codes = row_count;

  -- Pending recovery codes are revoked with the offboarding reason.
  update public.staff_portal_recovery_codes
  set revoked_at = now(),
      revoked_by_membership_id = caller_membership_id,
      revocation_reason = trimmed_reason
  where workspace_id = p_workspace_id
    and staff_member_id = p_staff_member_id
    and claimed_at is null
    and revoked_at is null
    and superseded_at is null;
  get diagnostics revoked_recovery_codes = row_count;

  -- Future draft assignments that need reassignment or removal.
  select coalesce(jsonb_agg(jsonb_build_object(
    'shift_id', shift.id,
    'rota_week_id', shift.rota_week_id,
    'shift_date', shift.shift_date,
    'starts_at', shift.starts_at,
    'ends_at', shift.ends_at,
    'role_name', shift.role_name
  ) order by shift.shift_date, shift.starts_at), '[]'::jsonb)
  into future_draft
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.staff_member_id = p_staff_member_id
    and shift.shift_date >= workspace_today;

  -- Future published assignments (latest snapshot per week) that staff can
  -- still see on their published rota until the week is republished.
  select coalesce(jsonb_agg(jsonb_build_object(
    'published_shift_id', pub.id,
    'rota_week_id', snapshot.rota_week_id,
    'shift_date', pub.shift_date,
    'starts_at', pub.starts_at,
    'ends_at', pub.ends_at,
    'role_name', pub.role_name
  ) order by pub.shift_date, pub.starts_at), '[]'::jsonb)
  into future_published
  from public.published_rota_shifts as pub
  join public.published_rota_snapshots as snapshot
    on snapshot.workspace_id = pub.workspace_id
   and snapshot.id = pub.snapshot_id
  where pub.workspace_id = p_workspace_id
    and pub.staff_member_id = p_staff_member_id
    and pub.shift_date >= workspace_today
    and not exists (
      select 1
      from public.published_rota_snapshots as later_snapshot
      where later_snapshot.workspace_id = snapshot.workspace_id
        and later_snapshot.rota_week_id = snapshot.rota_week_id
        and later_snapshot.version > snapshot.version
    );

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'staff.offboarded',
    'staff_member', p_staff_member_id,
    jsonb_build_object(
      'reason', trimmed_reason,
      'already_offboarded', already_offboarded,
      'membership_revoked', revoked_membership,
      'access_codes_revoked', revoked_access_codes,
      'recovery_codes_revoked', revoked_recovery_codes,
      'future_draft_assignments', jsonb_array_length(future_draft),
      'future_published_assignments', jsonb_array_length(future_published)
    )
  );

  return jsonb_build_object(
    'staff_member_id', p_staff_member_id,
    'already_offboarded', already_offboarded,
    'membership_revoked', revoked_membership,
    'access_codes_revoked', revoked_access_codes,
    'recovery_codes_revoked', revoked_recovery_codes,
    'future_draft_assignments', future_draft,
    'future_published_assignments', future_published
  );
end;
$$;

revoke all on function public.rpc_offboard_staff_member(uuid, uuid, text) from public, anon;
grant execute on function public.rpc_offboard_staff_member(uuid, uuid, text) to authenticated;

comment on function public.rpc_offboard_staff_member(uuid, uuid, text) is
  'Manager-only, atomic lightweight offboarding: marks the staff record left, revokes the staff portal membership and outstanding codes, retains all historical records, and returns every future draft/published assignment that needs manager action.';

-- ---------------------------------------------------------------------------
-- 2. Publish preflight: no inactive or unauthorised assignees.
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_validate_assignee_activity(
  p_workspace_id uuid,
  p_rota_week_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  blocked record;
  blocked_count integer := 0;
  detail_lines text := '';
begin
  -- Phase 31 protocol: lock every assigned staff row in ascending
  -- staff_member_id order before reading the facts that decide publishability.
  for blocked in
    select distinct shift.staff_member_id
    from public.shifts as shift
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = p_rota_week_id
      and shift.staff_member_id is not null
    order by shift.staff_member_id
  loop
    perform 1
    from public.staff_members as staff
    where staff.workspace_id = p_workspace_id
      and staff.id = blocked.staff_member_id
    for update;
  end loop;

  for blocked in
    select
      coalesce(staff.display_name, 'Unknown staff member') as display_name,
      shift.shift_date,
      shift.role_name,
      case
        when staff.id is null then 'no staff record'
        when staff.employment_status <> 'active'
          then 'employment ' || staff.employment_status
        else 'membership ' || membership.status
      end as block_reason
    from public.shifts as shift
    left join public.staff_members as staff
      on staff.workspace_id = shift.workspace_id
     and staff.id = shift.staff_member_id
    left join public.workspace_memberships as membership
      on membership.workspace_id = shift.workspace_id
     and membership.id = staff.membership_id
    where shift.workspace_id = p_workspace_id
      and shift.rota_week_id = p_rota_week_id
      and shift.staff_member_id is not null
      and (
        staff.id is null
        or staff.employment_status <> 'active'
        or (membership.id is not null and membership.status in ('suspended', 'revoked'))
      )
    order by shift.shift_date, shift.starts_at
  loop
    blocked_count := blocked_count + 1;
    -- The message must stay within the app's 300-character customer-safe
    -- passthrough, so list the first few and count the rest.
    if blocked_count <= 3 then
      detail_lines := detail_lines
        || case when detail_lines = '' then '' else '; ' end
        || blocked.display_name || ' ' || blocked.shift_date
        || ' ' || blocked.role_name || ' (' || blocked.block_reason || ')';
    end if;
  end loop;

  if blocked_count > 0 then
    if blocked_count > 3 then
      detail_lines := detail_lines || '; +' || (blocked_count - 3) || ' more';
    end if;
    raise exception
      'Cannot publish: % shift(s) assigned to inactive or unauthorised staff — %. Reassign or unassign them first.',
      blocked_count, detail_lines
      using errcode = '55000';
  end if;
end;
$$;

create or replace function public.guard_assignee_activity_publish_preflight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rpc_internal_validate_assignee_activity(new.workspace_id, new.rota_week_id);
  return new;
end;
$$;

-- Name sorts before published_rota_snapshots_open_shift_preflight so this
-- guard (and its ascending staff locks) runs first.
drop trigger if exists published_rota_snapshots_assignee_activity_preflight
  on public.published_rota_snapshots;
create trigger published_rota_snapshots_assignee_activity_preflight
before insert on public.published_rota_snapshots
for each row execute function public.guard_assignee_activity_publish_preflight();

revoke all on function public.rpc_internal_validate_assignee_activity(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.guard_assignee_activity_publish_preflight()
  from public, anon, authenticated;

comment on function public.rpc_internal_validate_assignee_activity(uuid, uuid) is
  'Internal publication preflight: every assigned draft shift must belong to an employment-active staff member whose portal membership (if any) is not suspended or revoked. Raises 55000 listing the affected shifts.';

notify pgrst, 'reload schema';
