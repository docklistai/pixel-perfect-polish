-- Phase 10: expose the workspace/business name to the staff portal.
-- Additive only: appends a trailing `workspace_name` column to the existing
-- staff-safe profile view so the portal header can show which business the
-- staff member is in. Same security model (security_barrier + security_invoker);
-- members can already read their own workspace row via workspaces_member_select,
-- so no new RLS policy or grant is required.

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
  workspace.name as workspace_name
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
