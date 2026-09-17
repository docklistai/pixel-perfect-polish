-- Phase 70: Secondary eligible roles across scheduling (WS-10)
--
-- Adds support for secondary eligible roles alongside the primary role on
-- staff_members.role_name. Primary role is always eligible; staff_eligible_roles
-- is additive.
--
-- Gates updated to use rpc_internal_staff_holds_role:
--   1. rpc_request_open_shift
--   2. rpc_select_open_shift_applicant
--   3. rpc_internal_assert_build_week_assignable (Build and Import)
--
-- Stale-request / material-change comparisons at publish remain untouched.

-- ---------------------------------------------------------------------------
-- 1. Eligible roles store
-- ---------------------------------------------------------------------------

create table if not exists public.staff_eligible_roles (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  role_name text not null,
  role_key text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint staff_eligible_roles_pkey primary key (workspace_id, staff_member_id, role_key),
  constraint staff_eligible_roles_role_name_check check (role_name <> '' and length(role_name) <= 120),
  constraint staff_eligible_roles_role_key_check check (role_key <> '' and length(role_key) <= 120)
);

create index if not exists staff_eligible_roles_staff_member_idx
  on public.staff_eligible_roles (staff_member_id);

alter table public.staff_eligible_roles enable row level security;

create policy staff_eligible_roles_self_select
on public.staff_eligible_roles for select to authenticated
using (staff_member_id = public.current_staff_member_id(workspace_id));

create policy staff_eligible_roles_manager_all
on public.staff_eligible_roles for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

grant select, insert, update, delete on public.staff_eligible_roles to authenticated;
revoke all on public.staff_eligible_roles from anon;

-- ---------------------------------------------------------------------------
-- 2. Helper: rpc_internal_staff_holds_role
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_staff_holds_role(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_role text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_key text;
  primary_role text;
begin
  if p_workspace_id is null or p_staff_member_id is null or p_role is null or p_role = '' then
    return false;
  end if;

  target_key := public.rpc_internal_normalise_role_key(p_role);
  if target_key = '' then
    return false;
  end if;

  -- Primary role is always eligible
  select role_name into primary_role
  from public.staff_members
  where workspace_id = p_workspace_id and id = p_staff_member_id;

  if primary_role is not null and public.rpc_internal_normalise_role_key(primary_role) = target_key then
    return true;
  end if;

  -- Additive secondary eligible roles
  return exists (
    select 1
    from public.staff_eligible_roles
    where workspace_id = p_workspace_id
      and staff_member_id = p_staff_member_id
      and role_key = target_key
  );
end;
$$;

revoke all on function public.rpc_internal_staff_holds_role(uuid, uuid, text)
  from public, anon, authenticated;

comment on function public.rpc_internal_staff_holds_role(uuid, uuid, text) is
  'Evaluates role eligibility for a staff member. Primary role on staff_members.role_name is always eligible; staff_eligible_roles provides additive secondary eligible roles.';

-- ---------------------------------------------------------------------------
-- 3. Manager RPC: rpc_set_staff_eligible_roles
-- ---------------------------------------------------------------------------

create or replace function public.rpc_set_staff_eligible_roles(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_roles text[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  staff_row record;
  role_item text;
  clean_role text;
  clean_key text;
  primary_key text;
  inserted_count integer := 0;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select id, role_name, employment_status
  into staff_row
  from public.staff_members
  where workspace_id = p_workspace_id and id = p_staff_member_id;

  if staff_row.id is null then
    raise exception 'staff member not found in workspace' using errcode = 'P0002';
  end if;

  primary_key := public.rpc_internal_normalise_role_key(staff_row.role_name);

  -- Replace existing secondary roles
  delete from public.staff_eligible_roles
  where workspace_id = p_workspace_id and staff_member_id = p_staff_member_id;

  if p_roles is not null then
    foreach role_item in array p_roles loop
      clean_role := pg_catalog.btrim(coalesce(role_item, ''));
      if clean_role <> '' and length(clean_role) <= 120 then
        clean_key := public.rpc_internal_normalise_role_key(clean_role);
        -- Skip primary role and avoid duplicates
        if clean_key <> '' and clean_key <> primary_key and not exists (
          select 1 from public.staff_eligible_roles
          where workspace_id = p_workspace_id
            and staff_member_id = p_staff_member_id
            and role_key = clean_key
        ) then
          insert into public.staff_eligible_roles (
            workspace_id, staff_member_id, role_name, role_key
          ) values (
            p_workspace_id, p_staff_member_id, clean_role, clean_key
          );
          inserted_count := inserted_count + 1;
        end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'staff_member_id', p_staff_member_id,
    'eligible_roles_count', inserted_count
  );
end;
$$;

revoke all on function public.rpc_set_staff_eligible_roles(uuid, uuid, text[]) from public, anon;
grant execute on function public.rpc_set_staff_eligible_roles(uuid, uuid, text[]) to authenticated;

comment on function public.rpc_set_staff_eligible_roles(uuid, uuid, text[]) is
  'Manager-only. Replaces the secondary eligible roles for a staff member. Primary role is automatically excluded from secondary storage as it is always eligible.';

-- ---------------------------------------------------------------------------
-- 4. Gate 1: rpc_request_open_shift
-- ---------------------------------------------------------------------------

create or replace function public.rpc_request_open_shift(
  p_workspace_id uuid,
  p_published_shift_id uuid
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
  shift_row record;
  shift_timezone text;
  staff_display_name text;
  existing_id uuid;
  existing_status text;
  result_id uuid;
begin
  select required.o_membership_id, required.o_staff_member_id
  into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id) as required;

  select
    shift.id,
    shift.source_shift_id,
    shift.assignment_status,
    shift.shift_date,
    shift.starts_at,
    shift.ends_at,
    shift.role_name,
    shift.location_id,
    snapshot.rota_week_id,
    snapshot.version
  into shift_row
  from public.published_rota_shifts as shift
  join public.published_rota_snapshots as snapshot
    on snapshot.workspace_id = shift.workspace_id
   and snapshot.id = shift.snapshot_id
  where shift.workspace_id = p_workspace_id
    and shift.id = p_published_shift_id;

  if shift_row.id is null then
    raise exception 'published shift not found in workspace' using errcode = 'P0002';
  end if;

  perform 1
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = shift_row.rota_week_id
  for share;

  perform 1
  from public.published_rota_shifts as shift
  where shift.workspace_id = p_workspace_id and shift.id = p_published_shift_id
  for update;

  if shift_row.assignment_status <> 'open' then
    raise exception 'this shift is not open to requests' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.published_rota_snapshots as later_snapshot
    where later_snapshot.workspace_id = p_workspace_id
      and later_snapshot.rota_week_id = shift_row.rota_week_id
      and later_snapshot.version > shift_row.version
  ) then
    raise exception 'this rota has been republished — refresh to see the current open shifts'
      using errcode = '55000';
  end if;

  select coalesce(location.timezone, workspace.timezone, 'UTC')
  into shift_timezone
  from public.locations as location
  join public.workspaces as workspace on workspace.id = location.workspace_id
  where location.workspace_id = p_workspace_id
    and location.id = shift_row.location_id;

  if shift_row.shift_date < (now() at time zone shift_timezone)::date
     or shift_row.starts_at <= clock_timestamp() then
    raise exception 'this shift has already started' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.staff_members as staff
    join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
     and membership.status = 'active'
    where staff.workspace_id = p_workspace_id
      and staff.id = own_staff_member_id
      and staff.employment_status = 'active'
      and public.rpc_internal_staff_holds_role(p_workspace_id, own_staff_member_id, shift_row.role_name)
  ) then
    raise exception 'this open shift is not eligible for your current role' using errcode = '55000';
  end if;

  select request.id, request.status
  into existing_id, existing_status
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.published_shift_id = p_published_shift_id
    and request.staff_member_id = own_staff_member_id
  for update;

  if existing_id is null then
    insert into public.open_shift_requests (
      workspace_id, published_shift_id, source_shift_id, rota_week_id, staff_member_id
    )
    values (
      p_workspace_id, p_published_shift_id, shift_row.source_shift_id,
      shift_row.rota_week_id, own_staff_member_id
    )
    returning id into result_id;
  elsif existing_status = 'pending' then
    return jsonb_build_object('request_id', existing_id, 'status', 'pending');
  elsif existing_status = 'withdrawn' then
    update public.open_shift_requests
    set status = 'pending',
        decided_by_membership_id = null,
        decided_at = null,
        decision_reason = null
    where workspace_id = p_workspace_id
      and id = existing_id;
    result_id := existing_id;
  else
    raise exception 'this request has already been decided' using errcode = '55000';
  end if;

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'open_shift_update',
    'Open shift requested',
    format(
      '%s requested the %s shift on %s.',
      staff_display_name,
      shift_row.role_name,
      to_char(shift_row.shift_date, 'DD Mon YYYY')
    ),
    'open_shift_request',
    result_id,
    array(
      select membership.id
      from public.workspace_memberships as membership
      where membership.workspace_id = p_workspace_id
        and membership.role in ('owner', 'manager')
        and membership.status = 'active'
    )
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'open_shift.requested',
    'open_shift_request',
    result_id,
    jsonb_build_object(
      'published_shift_id', p_published_shift_id,
      'source_shift_id', shift_row.source_shift_id,
      'staff_member_id', own_staff_member_id
    )
  );

  return jsonb_build_object('request_id', result_id, 'status', 'pending');
end;
$$;

revoke all on function public.rpc_request_open_shift(uuid, uuid) from public, anon;
grant execute on function public.rpc_request_open_shift(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Gate 2 & 3: rpc_select_open_shift_applicant
-- ---------------------------------------------------------------------------

create or replace function public.rpc_select_open_shift_applicant(
  p_workspace_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  request_row record;
  week_status text;
  latest_version integer;
  requested_shift record;
  draft_shift record;
  staff_row record;
  scheduled_week_minutes bigint;
  week_start_date date;
  shift_timezone text;
  shift_end_date date;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select request.id, request.status, request.staff_member_id,
         request.published_shift_id, request.source_shift_id, request.rota_week_id
  into request_row
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id;

  if request_row.id is null then
    raise exception 'open-shift request not found in workspace' using errcode = 'P0002';
  end if;

  -- Week first, then request: publish and every manager decision use the same lock order
  select week.status, week.week_start into week_status, week_start_date
  from public.rota_weeks as week
  where week.workspace_id = p_workspace_id
    and week.id = request_row.rota_week_id
  for update;

  if week_status is null then
    raise exception 'rota week not found in workspace' using errcode = 'P0002';
  end if;
  if week_status = 'archived' then
    raise exception 'archived rota weeks cannot be changed' using errcode = '55000';
  end if;

  select request.id, request.status, request.staff_member_id,
         request.published_shift_id, request.source_shift_id, request.rota_week_id
  into request_row
  from public.open_shift_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if request_row.status <> 'pending' then
    raise exception 'only pending requests can be selected' using errcode = '55000';
  end if;

  -- Stale guard: the request must point at the latest published version.
  select max(snapshot.version) into latest_version
  from public.published_rota_snapshots as snapshot
  where snapshot.workspace_id = p_workspace_id
    and snapshot.rota_week_id = request_row.rota_week_id;

  select snapshot.version, shift.shift_date, shift.starts_at, shift.ends_at,
         shift.break_minutes, shift.role_name, shift.location_id,
         shift.department_id, shift.assignment_status
  into requested_shift
  from public.published_rota_shifts as shift
  join public.published_rota_snapshots as snapshot
    on snapshot.workspace_id = shift.workspace_id
   and snapshot.id = shift.snapshot_id
  where shift.workspace_id = p_workspace_id
    and shift.id = request_row.published_shift_id;

  if requested_shift.version is distinct from latest_version then
    raise exception 'the published rota changed after this request — republish first, then review the refreshed requests'
      using errcode = '55000';
  end if;

  -- The draft shift is the assignment target; lock it against double-booking.
  select shift.id, shift.shift_date, shift.starts_at, shift.ends_at,
         shift.break_minutes, shift.role_name, shift.department_id,
         shift.location_id, shift.staff_member_id, shift.assignment_status
  into draft_shift
  from public.shifts as shift
  where shift.workspace_id = p_workspace_id
    and shift.id = request_row.source_shift_id
  for update;

  if draft_shift.id is null then
    raise exception 'the draft shift behind this open shift no longer exists' using errcode = 'P0002';
  end if;
  if draft_shift.assignment_status <> 'open' then
    raise exception 'the draft shift is already assigned — republish, then review the refreshed requests'
      using errcode = '55000';
  end if;
  if requested_shift.assignment_status <> 'open'
     or draft_shift.shift_date is distinct from requested_shift.shift_date
     or draft_shift.starts_at is distinct from requested_shift.starts_at
     or draft_shift.ends_at is distinct from requested_shift.ends_at
     or draft_shift.break_minutes is distinct from requested_shift.break_minutes
     or draft_shift.role_name is distinct from requested_shift.role_name
     or draft_shift.location_id is distinct from requested_shift.location_id
     or draft_shift.department_id is distinct from requested_shift.department_id then
    raise exception 'the draft shift changed after this request; republish before selecting an applicant'
      using errcode = '55000';
  end if;
  if draft_shift.starts_at <= clock_timestamp() then
    raise exception 'this shift has already started' using errcode = '55000';
  end if;

  select coalesce(location.timezone, workspace.timezone, 'UTC')
  into shift_timezone
  from public.locations as location
  join public.workspaces as workspace on workspace.id = location.workspace_id
  where location.workspace_id = p_workspace_id and location.id = draft_shift.location_id;
  shift_end_date := ((draft_shift.ends_at - interval '1 second') at time zone shift_timezone)::date;

  perform public.rpc_internal_lock_staff_eligibility(
    p_workspace_id,
    array[request_row.staff_member_id]
  );

  select staff.id, staff.employment_status, staff.role_name, staff.department_id,
         membership.status as membership_status
  into staff_row
  from public.staff_members as staff
  left join public.workspace_memberships as membership
    on membership.workspace_id = staff.workspace_id
   and membership.id = staff.membership_id
  where staff.workspace_id = p_workspace_id
    and staff.id = request_row.staff_member_id;

  if staff_row.id is null
     or staff_row.employment_status <> 'active'
     or staff_row.membership_status <> 'active' then
    raise exception 'the applicant is no longer an active staff member' using errcode = '55000';
  end if;

  -- Gate 2/3: Role eligibility using rpc_internal_staff_holds_role
  if not public.rpc_internal_staff_holds_role(p_workspace_id, request_row.staff_member_id, draft_shift.role_name) then
    raise exception 'the applicant''s role does not match this % shift', draft_shift.role_name
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.leave_requests as leave
    where leave.workspace_id = p_workspace_id
      and leave.staff_member_id = request_row.staff_member_id
      and leave.status = 'approved'
      and leave.start_date <= shift_end_date
      and leave.end_date >= draft_shift.shift_date
  ) then
    raise exception 'the applicant has approved leave on that day' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.staff_recurring_day_off_requests as day_off
    where day_off.workspace_id = p_workspace_id
      and day_off.staff_member_id = request_row.staff_member_id
      and day_off.status = 'approved'
      and day_off.weekday in (
        extract(isodow from draft_shift.shift_date)::smallint - 1,
        extract(isodow from shift_end_date)::smallint - 1
      )
  ) then
    raise exception 'the applicant has an approved recurring day off on that weekday' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.staff_one_off_unavailability_requests as unavailability
    where unavailability.workspace_id = p_workspace_id
      and unavailability.staff_member_id = request_row.staff_member_id
      and unavailability.status = 'approved'
      and unavailability.date in (draft_shift.shift_date, shift_end_date)
  ) then
    raise exception 'the applicant is unavailable on that date' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.shifts as other_shift
    where other_shift.workspace_id = p_workspace_id
      and other_shift.staff_member_id = request_row.staff_member_id
      and other_shift.id <> draft_shift.id
      and other_shift.starts_at < draft_shift.ends_at
      and other_shift.ends_at > draft_shift.starts_at
  ) then
    raise exception 'the applicant already has an overlapping shift' using errcode = '55000';
  end if;

  select coalesce(sum(
    greatest(
      0,
      floor(extract(epoch from (week_shift.ends_at - week_shift.starts_at)) / 60)::bigint
        - week_shift.break_minutes
    )
  ), 0)
  into scheduled_week_minutes
  from public.shifts as week_shift
  where week_shift.workspace_id = p_workspace_id
    and week_shift.shift_date between week_start_date and week_start_date + 6
    and week_shift.staff_member_id = request_row.staff_member_id;

  if scheduled_week_minutes
     + greatest(
         0,
         floor(extract(epoch from (draft_shift.ends_at - draft_shift.starts_at)) / 60)::bigint
           - draft_shift.break_minutes
       ) > 48 * 60 then
    raise exception 'selecting this applicant would exceed 48 scheduled hours this week' using errcode = '55000';
  end if;

  update public.open_shift_requests
  set status = 'pending',
      decided_by_membership_id = null,
      decided_at = null,
      decision_reason = null
  where workspace_id = p_workspace_id
    and source_shift_id = request_row.source_shift_id
    and status = 'selected'
    and id <> request_row.id;

  update public.shifts
  set staff_member_id = request_row.staff_member_id,
      assignment_status = 'scheduled'
  where workspace_id = p_workspace_id
    and id = draft_shift.id;

  update public.rota_weeks
  set status = 'draft'
  where workspace_id = p_workspace_id
    and id = request_row.rota_week_id
    and status <> 'draft';

  update public.open_shift_requests
  set status = 'selected',
      decided_by_membership_id = caller_membership_id,
      decided_at = transaction_timestamp(),
      decision_reason = null
  where workspace_id = p_workspace_id
    and id = request_row.id;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'open_shift.selected',
    'open_shift_request',
    request_row.id,
    jsonb_build_object(
      'staff_member_id', request_row.staff_member_id,
      'source_shift_id', request_row.source_shift_id,
      'rota_week_id', request_row.rota_week_id
    )
  );

  return jsonb_build_object(
    'request_id', request_row.id,
    'status', 'selected',
    'shift_id', draft_shift.id,
    'staff_member_id', request_row.staff_member_id
  );
end;
$$;

revoke all on function public.rpc_select_open_shift_applicant(uuid, uuid) from public, anon;
grant execute on function public.rpc_select_open_shift_applicant(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Gate 4: rpc_internal_assert_build_week_assignable
-- ---------------------------------------------------------------------------

create or replace function public.rpc_internal_assert_build_week_assignable(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_role_key text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_exclude_shift_id uuid,
  p_source_kind text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  staff_row record;
  touched_dates date[];
  allows_pending_leave boolean := p_source_kind is not distinct from 'headed-import';
begin
  select staff.id, staff.employment_status, staff.role_name
  into staff_row
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id and staff.id = p_staff_member_id;

  if staff_row.id is null or staff_row.employment_status <> 'active' then
    raise exception 'Someone in this proposal is no longer active. Build it again.'
      using errcode = '55000';
  end if;

  -- Gate 4: Role eligibility check using rpc_internal_staff_holds_role
  if not public.rpc_internal_staff_holds_role(p_workspace_id, p_staff_member_id, p_role_key) then
    raise exception 'Someone in this proposal does not hold the role for their shift.'
      using errcode = '55000';
  end if;

  touched_dates := array(
    select day::date
    from generate_series(
      (p_starts_at at time zone p_timezone)::date,
      ((p_ends_at - interval '1 second') at time zone p_timezone)::date,
      interval '1 day'
    ) as day
  );

  if exists (
    select 1 from public.leave_requests as lr
    where lr.workspace_id = p_workspace_id
      and lr.staff_member_id = p_staff_member_id
      and lr.status = 'approved'
      and exists (select 1 from unnest(touched_dates) as d
                  where d between lr.start_date and lr.end_date)
  ) then
    raise exception 'Someone in this proposal now has leave on that day. Build it again.'
      using errcode = '55000';
  end if;

  if not allows_pending_leave and exists (
    select 1 from public.leave_requests as lr
    where lr.workspace_id = p_workspace_id
      and lr.staff_member_id = p_staff_member_id
      and lr.status = 'pending'
      and exists (select 1 from unnest(touched_dates) as d
                  where d between lr.start_date and lr.end_date)
  ) then
    raise exception 'Someone in this proposal now has leave on that day. Build it again.'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.staff_one_off_unavailability_requests as u
    where u.workspace_id = p_workspace_id
      and u.staff_member_id = p_staff_member_id
      and u.status = 'approved'
      and u.date = any(touched_dates)
  ) then
    raise exception 'Someone in this proposal is now marked unavailable. Build it again.'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.staff_recurring_day_off_requests as d
    where d.workspace_id = p_workspace_id
      and d.staff_member_id = p_staff_member_id
      and d.status = 'approved'
      and exists (select 1 from unnest(touched_dates) as td
                  where d.weekday = extract(isodow from td)::smallint - 1)
  ) then
    raise exception 'Someone in this proposal has a regular day off then. Build it again.'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.shifts as other
    where other.workspace_id = p_workspace_id
      and other.staff_member_id = p_staff_member_id
      and (p_exclude_shift_id is null or other.id <> p_exclude_shift_id)
      and other.starts_at < p_ends_at
      and p_starts_at < other.ends_at
  ) then
    raise exception 'Someone in this proposal would be working two shifts at once. Build it again.'
      using errcode = '55000';
  end if;
end;
$$;

revoke all on function public.rpc_internal_assert_build_week_assignable(
  uuid, uuid, text, timestamptz, timestamptz, text, uuid, text)
  from public, anon, authenticated;
