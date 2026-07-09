-- Phase 14: recurring (standing) day-off requests.
--
-- A hospitality staff member often has a fixed weekday they cannot work
-- ("I can't do Sundays"). This is availability, not one-off leave: it recurs
-- every week until withdrawn. Managers approve or decline each weekday request
-- and see approved days when planning the rota.
--
-- Additive only. One table, one staff-safe view, three RPCs:
--   * staff_recurring_day_off_requests — one row per (staff member, weekday).
--   * staff_portal_recurring_days_off  — the caller's OWN requests only.
--   * rpc_request_recurring_day_off / rpc_withdraw_recurring_day_off (staff)
--     and rpc_decide_recurring_day_off (manager) — every write re-derives the
--     caller server-side, matching the phase 5 RPC security model.
--
-- weekday is 0..6 with 0 = Monday .. 6 = Sunday, matching the Monday-first rota.

-- ---------------------------------------------------------------------------
-- 1. staff_recurring_day_off_requests
-- ---------------------------------------------------------------------------

create table public.staff_recurring_day_off_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_member_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  note text check (note is null or length(note) <= 500),
  decided_by_membership_id uuid,
  decided_at timestamptz,
  decision_note text check (decision_note is null or length(decision_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, staff_member_id, weekday),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, decided_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (decided_by_membership_id)
);

create index staff_recurring_day_off_workspace_staff_idx
  on public.staff_recurring_day_off_requests (workspace_id, staff_member_id);

create trigger staff_recurring_day_off_set_updated_at
before update on public.staff_recurring_day_off_requests
for each row execute function public.set_updated_at();

create trigger staff_recurring_day_off_protect_immutable
before update on public.staff_recurring_day_off_requests
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'staff_member_id', 'created_at');

alter table public.staff_recurring_day_off_requests enable row level security;

revoke all on table public.staff_recurring_day_off_requests from public, anon;
-- Managers read the whole workspace list; staff never touch the base table
-- directly. Every write flows through the SECURITY DEFINER RPCs below, so no
-- insert/update/delete policy or grant is exposed to authenticated callers.
grant select on table public.staff_recurring_day_off_requests to authenticated;

create policy staff_recurring_day_off_manager_select
on public.staff_recurring_day_off_requests for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.staff_recurring_day_off_requests is
  'Standing weekday day-off requests (availability, not one-off leave). Managers approve or decline; staff read only their own rows through the staff_portal_recurring_days_off view. All writes go through phase 14 RPCs.';

-- ---------------------------------------------------------------------------
-- 2. staff_portal_recurring_days_off — the caller's own requests only
-- ---------------------------------------------------------------------------

-- Not security_invoker: like the other staff_portal_* views it runs with owner
-- rights and gates every row on the caller being the staff member who owns it,
-- so staff need no base-table grant. security_barrier stops predicate leakage.
create view public.staff_portal_recurring_days_off
with (security_barrier = true)
as
select
  request.workspace_id,
  request.id as request_id,
  request.staff_member_id,
  request.weekday,
  request.status,
  request.note,
  request.decision_note,
  request.decided_at,
  request.created_at,
  request.updated_at
from public.staff_recurring_day_off_requests as request
where request.staff_member_id = public.current_staff_member_id(request.workspace_id);

grant select on public.staff_portal_recurring_days_off to authenticated;

comment on view public.staff_portal_recurring_days_off is
  'A staff member''s own standing day-off requests and their status. Never exposes colleague requests or manager-only fields.';

-- ---------------------------------------------------------------------------
-- 3. weekday_label helper (0 = Monday .. 6 = Sunday), used by the RPCs below
-- ---------------------------------------------------------------------------

create or replace function public.weekday_label(p_weekday smallint)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])[p_weekday + 1];
$$;

-- ---------------------------------------------------------------------------
-- 4. rpc_request_recurring_day_off — staff upsert to pending
-- ---------------------------------------------------------------------------

create or replace function public.rpc_request_recurring_day_off(
  p_workspace_id uuid,
  p_weekday smallint,
  p_note text default null
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
  trimmed_note text;
  staff_display_name text;
  new_request_id uuid;
begin
  select * into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id);

  if p_weekday is null or p_weekday < 0 or p_weekday > 6 then
    raise exception 'weekday must be between 0 (Monday) and 6 (Sunday)'
      using errcode = '22023';
  end if;

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is not null and length(trimmed_note) > 500 then
    raise exception 'note must be at most 500 characters' using errcode = '22023';
  end if;

  -- Re-requesting a weekday (or changing the note) resets the row to pending
  -- and clears any prior decision, so managers always review the current ask.
  insert into public.staff_recurring_day_off_requests (
    workspace_id, staff_member_id, weekday, status, note,
    decided_by_membership_id, decided_at, decision_note, created_at
  )
  values (
    p_workspace_id, own_staff_member_id, p_weekday, 'pending', trimmed_note,
    null, null, null, transaction_timestamp()
  )
  on conflict (workspace_id, staff_member_id, weekday) do update
  set status = 'pending',
      note = excluded.note,
      decided_by_membership_id = null,
      decided_at = null,
      decision_note = null
  returning id into new_request_id;

  select staff.display_name
  into staff_display_name
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = own_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'announcement',
    'New regular day-off request',
    format(
      '%s asked to have %s off every week.',
      staff_display_name,
      public.weekday_label(p_weekday)
    ),
    'recurring_day_off',
    new_request_id,
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
    'recurring_day_off.requested',
    'recurring_day_off',
    new_request_id,
    jsonb_build_object('staff_member_id', own_staff_member_id, 'weekday', p_weekday)
  );

  return jsonb_build_object('request_id', new_request_id, 'status', 'pending');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. rpc_withdraw_recurring_day_off — staff removes their own request
-- ---------------------------------------------------------------------------

create or replace function public.rpc_withdraw_recurring_day_off(
  p_workspace_id uuid,
  p_weekday smallint
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
  removed_id uuid;
begin
  select * into caller_membership_id, own_staff_member_id
  from public.rpc_internal_require_staff(p_workspace_id);

  delete from public.staff_recurring_day_off_requests
  where workspace_id = p_workspace_id
    and staff_member_id = own_staff_member_id
    and weekday = p_weekday
  returning id into removed_id;

  if removed_id is null then
    raise exception 'no recurring day-off request for that weekday' using errcode = 'P0002';
  end if;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'recurring_day_off.withdrawn',
    'recurring_day_off',
    removed_id,
    jsonb_build_object('staff_member_id', own_staff_member_id, 'weekday', p_weekday)
  );

  return jsonb_build_object('request_id', removed_id, 'status', 'withdrawn');
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. rpc_decide_recurring_day_off — manager approve / decline + notify staff
-- ---------------------------------------------------------------------------

create or replace function public.rpc_decide_recurring_day_off(
  p_workspace_id uuid,
  p_request_id uuid,
  p_status text,
  p_note text default null
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
  request_staff_member_id uuid;
  request_weekday smallint;
  staff_membership_id uuid;
  trimmed_note text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_status is null or p_status not in ('approved', 'declined', 'pending') then
    raise exception 'status must be approved, declined, or pending (reopen)'
      using errcode = '22023';
  end if;

  trimmed_note := nullif(btrim(coalesce(p_note, '')), '');
  if trimmed_note is not null and length(trimmed_note) > 500 then
    raise exception 'note must be at most 500 characters' using errcode = '22023';
  end if;

  select request.status, request.staff_member_id, request.weekday
  into current_status, request_staff_member_id, request_weekday
  from public.staff_recurring_day_off_requests as request
  where request.workspace_id = p_workspace_id
    and request.id = p_request_id
  for update;

  if current_status is null then
    raise exception 'recurring day-off request not found in workspace' using errcode = 'P0002';
  end if;

  if p_status in ('approved', 'declined') then
    if current_status <> 'pending' then
      raise exception 'only pending requests can be approved or declined'
        using errcode = '55000';
    end if;
    update public.staff_recurring_day_off_requests
    set status = p_status,
        decided_at = transaction_timestamp(),
        decided_by_membership_id = caller_membership_id,
        decision_note = trimmed_note
    where workspace_id = p_workspace_id and id = p_request_id;
  else
    if current_status not in ('approved', 'declined') then
      raise exception 'only decided requests can be reopened' using errcode = '55000';
    end if;
    update public.staff_recurring_day_off_requests
    set status = 'pending',
        decided_at = null,
        decided_by_membership_id = null,
        decision_note = null
    where workspace_id = p_workspace_id and id = p_request_id;
  end if;

  select staff.membership_id
  into staff_membership_id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = request_staff_member_id;

  perform public.rpc_internal_notify(
    p_workspace_id,
    caller_membership_id,
    'announcement',
    case p_status
      when 'approved' then 'Regular day off approved'
      when 'declined' then 'Regular day off declined'
      else 'Regular day off reopened'
    end,
    format(
      'Your request to have %s off every week is %s.',
      public.weekday_label(request_weekday),
      case p_status
        when 'pending' then 'back under review'
        else p_status
      end
    ),
    'recurring_day_off',
    p_request_id,
    case
      when staff_membership_id is null then array[]::uuid[]
      else array[staff_membership_id]
    end
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'recurring_day_off.' || p_status,
    'recurring_day_off',
    p_request_id,
    jsonb_build_object('staff_member_id', request_staff_member_id, 'weekday', request_weekday)
  );

  return jsonb_build_object('request_id', p_request_id, 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_request_recurring_day_off(uuid, smallint, text) from public, anon;
revoke all on function public.rpc_withdraw_recurring_day_off(uuid, smallint) from public, anon;
revoke all on function public.rpc_decide_recurring_day_off(uuid, uuid, text, text) from public, anon;

grant execute on function public.rpc_request_recurring_day_off(uuid, smallint, text) to authenticated;
grant execute on function public.rpc_withdraw_recurring_day_off(uuid, smallint) to authenticated;
grant execute on function public.rpc_decide_recurring_day_off(uuid, uuid, text, text) to authenticated;

comment on function public.rpc_request_recurring_day_off(uuid, smallint, text) is
  'Staff-only: upsert the caller''s standing day-off request for one weekday to pending, resetting any prior decision. Re-derives the caller server-side.';
comment on function public.rpc_decide_recurring_day_off(uuid, uuid, text, text) is
  'Manager-only: approve, decline, or reopen a recurring day-off request, notify the staff member, and audit the decision.';

notify pgrst, 'reload schema';
