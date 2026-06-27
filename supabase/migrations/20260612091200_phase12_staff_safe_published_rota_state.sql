-- Keep the portal's published-rota existence signal staff-safe. The phase 11
-- view joined rota_weeks for week_start, but rota_weeks is manager-only under
-- RLS, so staff saw an empty state even after a published rota existed.

drop view if exists public.staff_portal_published_rota_weeks;

create or replace view public.staff_portal_published_rota_weeks
with (security_barrier = true, security_invoker = true)
as
select
  snapshot.workspace_id,
  snapshot.version as snapshot_version,
  snapshot.published_at
from public.published_rota_snapshots as snapshot
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
  'Staff-safe published rota metadata only. Lets the portal distinguish no published rota from a published rota with no assigned shifts for the signed-in staff member without reading live drafts or manager-only rota weeks.';

notify pgrst, 'reload schema';
