-- ===========================================================================
-- Phase 69: Workspace Staff Contact and Bulk Portal Access Codes (WS-9)
-- ---------------------------------------------------------------------------
-- 1. Workspace-level staff contact:
--    * Add staff_contact_name, staff_contact_email, staff_contact_phone columns
--      to public.workspaces.
--    * Recreate public.staff_portal_profile view to expose these workspace-level
--      staff contact fields to workspace members.
--    * Create rpc_update_workspace_staff_contact helper (manager-only).
--
-- 2. Bulk portal access code issuance:
--    * Create rpc_bulk_issue_staff_portal_access_codes returning a table of
--      staff_member_id, display_name, role_name, access_code, expires_at.
--    * Enforces manager authority, 14-day expiry, audit logging, and refusals
--      for nonexistent, inactive, or already-claimed staff members.
-- ===========================================================================

-- 1. Add contact columns to public.workspaces
alter table public.workspaces
  add column if not exists staff_contact_name text check (staff_contact_name is null or length(btrim(staff_contact_name)) <= 120),
  add column if not exists staff_contact_email text check (staff_contact_email is null or length(btrim(staff_contact_email)) <= 255),
  add column if not exists staff_contact_phone text check (staff_contact_phone is null or length(btrim(staff_contact_phone)) <= 40);

comment on column public.workspaces.staff_contact_name is 'Workspace-level staff contact name for staff portal inquiries.';
comment on column public.workspaces.staff_contact_email is 'Workspace-level staff contact email for staff portal inquiries.';
comment on column public.workspaces.staff_contact_phone is 'Workspace-level staff contact phone for staff portal inquiries.';

-- 2. Update staff_portal_profile view to append the staff contact columns
create or replace view public.staff_portal_profile
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
  location.name as location_name,
  workspace.name as workspace_name,
  coalesce(location.timezone, workspace.timezone, 'UTC') as timezone,
  workspace.staff_contact_name,
  workspace.staff_contact_email,
  workspace.staff_contact_phone
from public.staff_members as staff
left join public.departments as department
  on department.workspace_id = staff.workspace_id
 and department.id = staff.department_id
left join public.locations as location
  on location.workspace_id = staff.workspace_id
 and location.id = staff.primary_location_id
left join public.workspaces as workspace
  on workspace.id = staff.workspace_id
where staff.id = public.current_staff_member_id(staff.workspace_id);

comment on view public.staff_portal_profile is
  'A staff member''s own profile fields plus venue timezone and workspace staff contact. Never exposes colleague rows or manager-only fields.';

-- 3. Manager helper to update workspace staff contact
create or replace function public.rpc_update_workspace_staff_contact(
  p_workspace_id uuid,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  update public.workspaces
  set staff_contact_name = nullif(btrim(p_contact_name), ''),
      staff_contact_email = nullif(btrim(p_contact_email), ''),
      staff_contact_phone = nullif(btrim(p_contact_phone), ''),
      updated_at = pg_catalog.transaction_timestamp()
  where id = p_workspace_id;
end;
$$;

comment on function public.rpc_update_workspace_staff_contact(uuid, text, text, text) is
  'Updates the workspace-level staff contact info displayed in the staff portal. Manager-only.';

revoke all on function public.rpc_update_workspace_staff_contact(uuid, text, text, text) from public, anon;
grant execute on function public.rpc_update_workspace_staff_contact(uuid, text, text, text) to authenticated;

-- 4. Bulk issuance RPC
create or replace function public.rpc_bulk_issue_staff_portal_access_codes(
  p_workspace_id uuid,
  p_staff_member_ids uuid[] default null
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  access_code text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  caller_membership_id uuid;
  r record;
  new_code text;
  code_expires_at timestamptz;
  target_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  -- Explicit ID list validation and refusal checks
  if p_staff_member_ids is not null and array_length(p_staff_member_ids, 1) > 0 then
    foreach target_id in array p_staff_member_ids loop
      if not exists (
        select 1 from public.staff_members
        where staff_members.workspace_id = p_workspace_id and staff_members.id = target_id
      ) then
        raise exception 'staff member not found in this workspace' using errcode = 'P0002';
      end if;

      if exists (
        select 1 from public.staff_members
        where staff_members.workspace_id = p_workspace_id and staff_members.id = target_id and staff_members.employment_status <> 'active'
      ) then
        raise exception 'one or more staff members are not active' using errcode = '55000';
      end if;

      if exists (
        select 1 from public.staff_members as staff
        join public.workspace_memberships as membership
          on membership.workspace_id = staff.workspace_id and membership.id = staff.membership_id
        where staff.workspace_id = p_workspace_id
          and staff.id = target_id
          and membership.user_id is not null
      ) then
        raise exception 'this staff member is already linked to an account; use staff access recovery instead'
          using errcode = '55000';
      end if;
    end loop;
  end if;

  -- Iterate eligible staff members
  for r in
    select
      staff.id as staff_id,
      staff.display_name as staff_name,
      staff.role_name as staff_role,
      staff.membership_id
    from public.staff_members as staff
    inner join public.workspace_memberships as membership
      on membership.workspace_id = staff.workspace_id
     and membership.id = staff.membership_id
    where staff.workspace_id = p_workspace_id
      and staff.employment_status = 'active'
      and membership.role = 'staff'
      and membership.status in ('invited', 'active')
      and membership.user_id is null
      and (p_staff_member_ids is null or staff.id = any(p_staff_member_ids))
    order by staff.display_name asc
    for update of membership
  loop
    -- Supersede any outstanding recovery codes
    update public.staff_portal_recovery_codes
    set superseded_at = pg_catalog.transaction_timestamp()
    where staff_portal_recovery_codes.workspace_id = p_workspace_id
      and staff_portal_recovery_codes.staff_member_id = r.staff_id
      and staff_portal_recovery_codes.claimed_at is null
      and staff_portal_recovery_codes.revoked_at is null
      and staff_portal_recovery_codes.superseded_at is null;

    new_code := public.rpc_internal_generate_portal_code();
    code_expires_at := pg_catalog.transaction_timestamp() + interval '14 days';

    insert into public.staff_portal_access_codes (
      workspace_id, staff_member_id, code_digest, issued_by_membership_id, expires_at
    ) values (
      p_workspace_id,
      r.staff_id,
      public.rpc_internal_portal_code_digest(new_code),
      caller_membership_id,
      code_expires_at
    )
    on conflict (workspace_id, staff_member_id) do update
    set code_digest = excluded.code_digest,
        issued_by_membership_id = excluded.issued_by_membership_id,
        issued_at = pg_catalog.transaction_timestamp(),
        expires_at = excluded.expires_at,
        claimed_at = null,
        revoked_at = null,
        revoked_by_membership_id = null,
        revocation_reason = null;

    perform public.rpc_internal_write_audit(
      p_workspace_id,
      caller_membership_id,
      'staff_portal_code_issued',
      'staff_member',
      r.staff_id,
      pg_catalog.jsonb_build_object('membership_id', r.membership_id, 'bulk', true)
    );

    staff_member_id := r.staff_id;
    display_name := r.staff_name;
    role_name := r.staff_role;
    access_code := new_code;
    expires_at := code_expires_at;
    return next;
  end loop;

  return;
end;
$$;

comment on function public.rpc_bulk_issue_staff_portal_access_codes(uuid, uuid[]) is
  'Issues 14-day single-use portal access codes in bulk for active unclaimed staff members. Manager-only.';

revoke all on function public.rpc_bulk_issue_staff_portal_access_codes(uuid, uuid[]) from public, anon;
grant execute on function public.rpc_bulk_issue_staff_portal_access_codes(uuid, uuid[]) to authenticated;
