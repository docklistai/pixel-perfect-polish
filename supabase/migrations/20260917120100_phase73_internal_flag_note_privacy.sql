-- Phase 73 — Keep manager internal review notes private (R6).
--
-- In public.time_entries, staff must not be able to read manager internal review notes
-- (flag_note, flagged_at, flagged_by_membership_id), but staff can still read return_note.
--
-- Implementation:
-- 1. Split public.time_entries SELECT policy into manager and staff policies.
--    - time_entries_manager_select: managers/owners can select all rows and columns.
--    - time_entries_staff_select: staff can only select rows where internal review notes
--      are null (flag_note is null and flagged_by_membership_id is null).
-- 2. Redefine public.staff_portal_time_entries with security_barrier = true (without
--    security_invoker = true) so staff can view all their time entries and return_notes
--    in the portal while internal review notes remain manager-internal and excluded from the view.

drop policy if exists time_entries_staff_or_manager_select on public.time_entries;
drop policy if exists time_entries_manager_select on public.time_entries;
drop policy if exists time_entries_staff_select on public.time_entries;

create policy time_entries_manager_select
on public.time_entries for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy time_entries_staff_select
on public.time_entries for select to authenticated
using (
  staff_member_id = public.current_staff_member_id(workspace_id)
  and flag_note is null
  and flagged_by_membership_id is null
);

drop view if exists public.staff_portal_time_entries cascade;

create view public.staff_portal_time_entries
with (security_barrier = true)
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
  entry.approved_at,
  entry.return_note
from public.time_entries as entry
where entry.staff_member_id = public.current_staff_member_id(entry.workspace_id);

grant select on public.staff_portal_time_entries to authenticated;

comment on view public.staff_portal_time_entries is
  'Staff portal view of personal time entries. Exposes return_note for returned entries, but omits manager-only internal review notes (flag_note, flagged_by_membership_id).';

notify pgrst, 'reload schema';
