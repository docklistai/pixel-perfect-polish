-- Phase 72: Enforce role eligibility on manual shift assignment (R3)
--
-- Restores server-side enforcement on manual shift assignment and update:
-- whenever a shift has a scheduled staff member assigned and a role,
-- they must hold the role (as primary role on staff_members.role_name or
-- additive secondary eligible role in staff_eligible_roles) via
-- rpc_internal_staff_holds_role.
--
-- Ineligible manual assignment is refused with errcode 55000.
-- Open shifts (staff_member_id is null) remain unaffected.

create or replace function public.guard_shift_role_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.staff_member_id is not null and new.assignment_status = 'scheduled' then
    if not exists (
      select 1 from public.staff_members
      where id = new.staff_member_id and workspace_id = new.workspace_id
    ) then
      return new;
    end if;

    if not public.rpc_internal_staff_holds_role(new.workspace_id, new.staff_member_id, new.role_name) then
      raise exception 'staff member is not eligible for role %', new.role_name using errcode = '55000';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_shift_role_eligibility() from public, anon;
grant execute on function public.guard_shift_role_eligibility() to authenticated;

comment on function public.guard_shift_role_eligibility() is
  'Enforces server-side role eligibility on manual shift assignments and updates.';

drop trigger if exists shifts_guard_role_eligibility on public.shifts;
create trigger shifts_guard_role_eligibility
  before insert or update on public.shifts
  for each row
  execute function public.guard_shift_role_eligibility();
