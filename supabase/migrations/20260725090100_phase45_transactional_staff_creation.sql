-- Phase 45: transactional staff creation, and staff writes become RPC-only.
--
-- Confirmed defect 1: Add staff (and Bulk add, which shares the
-- same helper) created a staff member with two separate client-driven writes —
-- first an unclaimed `workspace_memberships` row, then the `staff_members` row
-- that links to it — followed by a best-effort compensating DELETE when the
-- second write failed. Compensation is not a transaction: a network drop, a
-- timeout or a failure of the cleanup request itself left an orphaned
-- `invited` membership behind after the manager was told the staff member was
-- not added. That is access-state drift plus a misleading failure outcome.
--
-- Correction: one manager-authorised RPC creates both rows in a single
-- transaction. A failure at any point rolls the whole thing back, so an
-- orphaned membership is no longer merely unlikely — it is impossible. The
-- compensating delete is removed from the application entirely.
--
-- Deliberately unchanged:
--   * Invitation/access semantics. The membership is still seeded unclaimed
--     (`role = 'staff'`, `status = 'invited'`, `user_id = null`) so a manager
--     can issue a personal portal code immediately.
--   * Duplicate detection. The partial unique index
--     `staff_members_workspace_email_uidx` still raises 23505, and the FK to
--     departments still raises 23503, so the existing
--     `describeStaffWriteError` mapping keeps working untouched.
--   * `employment_status` is hardcoded 'active'. Creation is not an
--     offboarding surface; 'left' remains reachable only through
--     `rpc_offboard_staff_member` (phase 41).
--
-- Confirmed defect 2: removing `Left` from the edit form, the client schema and
-- the update server function closed the *product* route to `employment_status =
-- 'left'`, but not the database one. `staff_members` still carried a direct
-- `UPDATE` grant to `authenticated`, and the manager RLS policy allows the whole
-- row, so any manager could reach the exact inconsistent state the offboarding
-- work exists to prevent with one handcrafted PostgREST request: status `left`,
-- `end_date` null, no audit event, portal membership still active and unclaimed
-- access codes still claimable. Application-layer guards cannot close a table
-- the client is granted write access to.
--
-- Correction: the generic manager edit gets its own manager-authorised RPC
-- (`rpc_update_staff_member`), and the direct `UPDATE` grant on
-- `public.staff_members` is revoked from `authenticated`. The resulting database
-- invariant is:
--
--   * generic manager edits go through `rpc_update_staff_member`, which accepts
--     only `active`/`inactive` and refuses `left` outright;
--   * the transition to `left` is reachable only through
--     `rpc_offboard_staff_member`, which also revokes the portal membership,
--     cancels outstanding codes, records an end date and writes an audit event;
--   * a handcrafted authenticated table `UPDATE` is refused by the database
--     itself, not merely by the application in front of it.
--
-- Both RPCs are SECURITY DEFINER and owned by the migration role, so revoking
-- the caller's table privilege does not affect them; `rpc_create_staff_member`
-- and the phase 41 offboarding RPC keep working unchanged. `SELECT`, `INSERT`
-- and `DELETE` grants are deliberately untouched — this correction is scoped to
-- the update path that carried the bypass.
--
-- No table, column, index or RLS-policy change. SECURITY DEFINER with an
-- empty search_path, authority delegated to the shared
-- `rpc_internal_require_manager` guard used by every other manager RPC.

create or replace function public.rpc_create_staff_member(
  p_workspace_id uuid,
  p_display_name text,
  p_email text,
  p_role_name text,
  p_department_id uuid,
  p_contract_type text,
  p_contracted_minutes_per_week integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  new_membership_id uuid;
  new_staff_member_id uuid;
  clean_display_name text;
  clean_email text;
  clean_role_name text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  -- Defensive re-normalisation. The client already trims and lowercases, but
  -- the database is the authority for what is actually stored — and the
  -- lower(email) uniqueness index only detects duplicates if it is applied.
  clean_display_name := pg_catalog.btrim(coalesce(p_display_name, ''));
  clean_role_name := pg_catalog.btrim(coalesce(p_role_name, ''));
  clean_email := nullif(
    pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''))), '');

  if clean_display_name = '' then
    raise exception 'a staff member name is required' using errcode = '22023';
  end if;
  if clean_role_name = '' then
    raise exception 'a staff member role is required' using errcode = '22023';
  end if;

  -- Both writes below are in this function's transaction. Any failure — the
  -- duplicate-email index, the department foreign key, a check constraint, or
  -- an unexpected error — rolls back the membership as well, so no orphan can
  -- survive a failed create.
  insert into public.workspace_memberships (workspace_id, role, status, invited_at)
  values (p_workspace_id, 'staff', 'invited', pg_catalog.now())
  returning id into new_membership_id;

  insert into public.staff_members (
    workspace_id,
    membership_id,
    display_name,
    email,
    role_name,
    department_id,
    contract_type,
    contracted_minutes_per_week,
    employment_status
  )
  values (
    p_workspace_id,
    new_membership_id,
    clean_display_name,
    clean_email,
    clean_role_name,
    p_department_id,
    p_contract_type,
    p_contracted_minutes_per_week,
    'active'
  )
  returning id into new_staff_member_id;

  return pg_catalog.jsonb_build_object(
    'staff_member_id', new_staff_member_id,
    'membership_id', new_membership_id
  );
end;
$$;

revoke all on function public.rpc_create_staff_member(uuid, text, text, text, uuid, text, integer)
  from public, anon;
grant execute on function public.rpc_create_staff_member(uuid, text, text, text, uuid, text, integer)
  to authenticated;

comment on function public.rpc_create_staff_member(uuid, text, text, text, uuid, text, integer) is
  'Manager/owner only. Atomically creates an unclaimed staff membership and its linked staff_members record, returning both identifiers. Replaces the previous two-request create plus best-effort compensation, so a failed create can never leave an orphaned invited membership. Duplicate-email (23505) and department (23503) failures are unchanged.';

-- ---------------------------------------------------------------------------
-- Generic manager edit. The only supported route for editing the lightweight
-- scheduling identity fields, and the reason the direct UPDATE grant below can
-- be revoked. It deliberately cannot reach `left`, and it cannot change the
-- status of somebody already offboarded.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_update_staff_member(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_display_name text,
  p_email text,
  p_phone text,
  p_role_name text,
  p_department_id uuid,
  p_contract_type text,
  p_contracted_minutes_per_week integer,
  -- This parameter alone is preserve-on-null: NULL means "leave the stored
  -- employment status exactly as it is". That is how the dialog edits somebody
  -- who has already been offboarded — without it, an edit that merely corrects a
  -- phone number would silently reactivate them.
  --
  -- No other parameter behaves this way. The rest are full-form replacement: the
  -- caller sends the complete edit form and every listed column is rewritten from
  -- it. An explicit null for a nullable field is therefore a deliberate clear —
  -- p_phone, p_department_id and p_contracted_minutes_per_week all blank the
  -- stored value when null is passed.
  p_employment_status text default null
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
  clean_display_name text;
  clean_role_name text;
  clean_email text;
  clean_phone text;
  updated_staff_member_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  -- Refuse the offboarding status before anything else, so the refusal is
  -- attributable rather than being coerced into some other state. 55000 is the
  -- codebase's business-refusal code and its message reaches the manager.
  if p_employment_status = 'left' then
    raise exception
      'Marking someone as left is only possible through Offboard, which also revokes their portal access.'
      using errcode = '55000';
  end if;
  if p_employment_status is not null
     and p_employment_status not in ('active', 'inactive') then
    raise exception 'unsupported employment status' using errcode = '22023';
  end if;

  -- Defensive re-normalisation. The client already trims and lowercases, but the
  -- database is the authority for what is stored, and the lower(email)
  -- uniqueness index only detects duplicates if it is applied.
  clean_display_name := pg_catalog.btrim(coalesce(p_display_name, ''));
  clean_role_name := pg_catalog.btrim(coalesce(p_role_name, ''));
  clean_email := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''))), '');
  clean_phone := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');

  if clean_display_name = '' then
    raise exception 'a staff member name is required' using errcode = '22023';
  end if;
  if clean_role_name = '' then
    raise exception 'a staff member role is required' using errcode = '22023';
  end if;

  -- Phase 31 protocol: the staff row is the per-person authority and is locked
  -- before its status is read and rewritten. Without this a concurrent
  -- rpc_offboard_staff_member could commit `left` between the read below and
  -- the update, and this edit would silently reinstate them.
  select staff.id, staff.employment_status
  into staff_row
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = p_staff_member_id
  for update;

  if staff_row.id is null then
    raise exception 'staff member not found in workspace' using errcode = 'P0002';
  end if;

  -- Reinstating an offboarded person is a deliberate act with its own access
  -- consequences, not a side effect of correcting their phone number.
  if staff_row.employment_status = 'left' and p_employment_status is not null then
    raise exception
      'This person has been offboarded. Their status cannot be changed from the edit form.'
      using errcode = '55000';
  end if;

  -- Workspace ownership of the department, ahead of the composite foreign key,
  -- so a cross-workspace id is a clear refusal rather than a constraint error.
  if p_department_id is not null and not exists (
    select 1
    from public.departments as department
    where department.workspace_id = p_workspace_id
      and department.id = p_department_id
  ) then
    raise exception
      'That department is no longer available. Pick another, or leave it unassigned.'
      using errcode = '55000';
  end if;

  update public.staff_members
  set display_name = clean_display_name,
      email = clean_email,
      phone = clean_phone,
      role_name = clean_role_name,
      department_id = p_department_id,
      contract_type = p_contract_type,
      contracted_minutes_per_week = p_contracted_minutes_per_week,
      employment_status = coalesce(p_employment_status, employment_status)
  where workspace_id = p_workspace_id
    and id = p_staff_member_id
  returning id into updated_staff_member_id;

  return pg_catalog.jsonb_build_object('staff_member_id', updated_staff_member_id);
end;
$$;

revoke all on function public.rpc_update_staff_member(
  uuid, uuid, text, text, text, text, uuid, text, integer, text
) from public, anon;
grant execute on function public.rpc_update_staff_member(
  uuid, uuid, text, text, text, text, uuid, text, integer, text
) to authenticated;

comment on function public.rpc_update_staff_member(
  uuid, uuid, text, text, text, text, uuid, text, integer, text
) is
  'Manager/owner only. The single supported route for a generic staff edit. Accepts active/inactive, refuses left outright (55000) so offboarding stays exclusive to rpc_offboard_staff_member, and refuses any status change to an already-offboarded member. A null status preserves the stored one. Locks the staff row before reading and rewriting its status.';

-- ---------------------------------------------------------------------------
-- Close the bypass. With both writes now behind SECURITY DEFINER RPCs, the
-- caller no longer needs — and must not have — direct UPDATE on the table.
-- Owner-side privileges and both RPCs are unaffected.
-- ---------------------------------------------------------------------------
revoke update on public.staff_members from authenticated;

comment on table public.staff_members is
  'Manager-owned staff identity. Direct UPDATE is revoked from authenticated: generic edits go through rpc_update_staff_member and the transition to employment_status = left goes through rpc_offboard_staff_member, so portal access, access codes, end date and audit evidence can never drift apart from the recorded status.';

notify pgrst, 'reload schema';
