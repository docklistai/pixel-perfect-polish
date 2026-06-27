-- Batch 2A trust fixes:
-- - staff-safe published-rota metadata for empty portal states
-- - authenticated leave requests cannot start in the past

create or replace view public.staff_portal_published_rota_weeks
with (security_barrier = true, security_invoker = true)
as
select
  snapshot.workspace_id,
  rota_week.week_start,
  snapshot.version as snapshot_version,
  snapshot.published_at
from public.published_rota_snapshots as snapshot
join public.rota_weeks as rota_week
  on rota_week.workspace_id = snapshot.workspace_id
 and rota_week.id = snapshot.rota_week_id
where not exists (
  select 1
  from public.published_rota_snapshots as later_snapshot
  where later_snapshot.workspace_id = snapshot.workspace_id
    and later_snapshot.rota_week_id = snapshot.rota_week_id
    and later_snapshot.version > snapshot.version
    and public.published_snapshot_has_shifts(later_snapshot.workspace_id, later_snapshot.id)
);

grant select on public.staff_portal_published_rota_weeks to authenticated;

comment on view public.staff_portal_published_rota_weeks is
  'Staff-safe published rota metadata only. Lets the portal distinguish no published rota from a published rota with no assigned shifts for the signed-in staff member.';

create or replace function public.guard_leave_request_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := (select auth.uid());
begin
  if acting_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.start_date < current_date then
    raise exception 'leave requests cannot start in the past' using errcode = '22023';
  end if;

  if tg_op = 'INSERT'
     and (new.submitted_at is distinct from transaction_timestamp()
          or new.created_at is distinct from transaction_timestamp()) then
    raise exception 'leave requests must be submitted with the current transaction time'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
     and new.decided_by_membership_id is distinct from old.decided_by_membership_id
     and new.decided_by_membership_id is not null
     and new.decided_by_membership_id
         <> public.current_workspace_membership_id(new.workspace_id) then
    raise exception 'decided_by_membership_id must be the active membership of the deciding caller'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
