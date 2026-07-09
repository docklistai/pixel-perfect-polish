-- Phase 13: labour planning settings, staff pay rates, and staff-safe team
-- visibility on the latest published rota.
--
-- Additive only. Three concerns, one purpose each:
--   1. workspace_settings   — manager-only labour planning targets that drive
--                             the Rota labour summary and Home labour watch.
--   2. staff_pay_rates      — one hourly rate per staff member. Managers manage
--                             rates; a staff member may read only their own rate
--                             so the portal can show an honest pay estimate.
--                             This is planning data, not payroll integration.
--   3. staff_portal_team_shifts — staff-safe "who am I working with" view over
--                             the latest published snapshot only. Never drafts.

-- ---------------------------------------------------------------------------
-- 1. workspace_settings
-- ---------------------------------------------------------------------------

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  -- Team-week labour budget in minutes (e.g. 820h = 49200). Null = not set.
  weekly_budget_minutes integer
    check (weekly_budget_minutes between 0 and 1000000),
  target_labour_pct numeric(5, 2)
    check (target_labour_pct > 0 and target_labour_pct <= 100),
  forecast_weekly_sales_pence bigint
    check (forecast_weekly_sales_pence between 0 and 10000000000),
  -- Fallback blended hourly cost when a staff member has no rate recorded.
  avg_hourly_cost_pence integer
    check (avg_hourly_cost_pence between 0 and 100000),
  budget_warning_pct integer not null default 95
    check (budget_warning_pct between 50 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspace_settings_set_updated_at
before update on public.workspace_settings
for each row execute function public.set_updated_at();

create trigger workspace_settings_protect_immutable
before update on public.workspace_settings
for each row execute function public.protect_immutable_columns('workspace_id', 'created_at');

alter table public.workspace_settings enable row level security;

revoke all on table public.workspace_settings from public, anon;
grant select, insert, update on table public.workspace_settings to authenticated;

create policy workspace_settings_manager_select
on public.workspace_settings for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy workspace_settings_manager_insert
on public.workspace_settings for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

create policy workspace_settings_manager_update
on public.workspace_settings for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.workspace_settings is
  'Manager-only labour planning targets (weekly budget, labour % target, sales forecast, blended rate fallback). Staff have no read path; these figures drive manager-side planning surfaces only.';

-- ---------------------------------------------------------------------------
-- 2. staff_pay_rates
-- ---------------------------------------------------------------------------

create table public.staff_pay_rates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_member_id uuid not null,
  hourly_rate_pence integer not null
    check (hourly_rate_pence between 0 and 100000),
  set_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, staff_member_id),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, set_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (set_by_membership_id)
);

create index staff_pay_rates_workspace_staff_idx
  on public.staff_pay_rates (workspace_id, staff_member_id);

create trigger staff_pay_rates_set_updated_at
before update on public.staff_pay_rates
for each row execute function public.set_updated_at();

create trigger staff_pay_rates_protect_immutable
before update on public.staff_pay_rates
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'staff_member_id', 'created_at');

alter table public.staff_pay_rates enable row level security;

revoke all on table public.staff_pay_rates from public, anon;
grant select, insert, update, delete on table public.staff_pay_rates to authenticated;

create policy staff_pay_rates_manager_all
on public.staff_pay_rates for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

-- A staff member may read their own rate (it powers their portal pay
-- estimate). Colleague rates stay manager-only.
create policy staff_pay_rates_self_select
on public.staff_pay_rates for select to authenticated
using (staff_member_id = public.current_staff_member_id(workspace_id));

comment on table public.staff_pay_rates is
  'One current hourly rate per staff member for labour cost planning and the staff member''s own portal pay estimate. Not a payroll integration; payroll stays disabled.';

-- ---------------------------------------------------------------------------
-- 3. staff_portal_team_shifts
-- ---------------------------------------------------------------------------

-- Deliberately NOT security_invoker: colleague names on the printed rota are
-- staff-visible by design, but staff_members RLS is self-only. The view runs
-- with owner rights and gates every row on the caller being an active staff
-- member of that row''s workspace. security_barrier stops predicate leakage.
-- Exposes display name, role, and shift times only — no contact, contract,
-- pay, or manager-only fields.
create view public.staff_portal_team_shifts
with (security_barrier = true)
as
select
  shift.workspace_id,
  shift.id as published_shift_id,
  shift.staff_member_id,
  staff.display_name,
  shift.shift_date,
  shift.starts_at,
  shift.ends_at,
  shift.break_minutes,
  shift.role_name,
  shift.assignment_status,
  location.name as location_name,
  snapshot.version as snapshot_version,
  snapshot.published_at
from public.published_rota_shifts as shift
join public.published_rota_snapshots as snapshot
  on snapshot.workspace_id = shift.workspace_id
 and snapshot.id = shift.snapshot_id
join public.locations as location
  on location.workspace_id = shift.workspace_id
 and location.id = shift.location_id
left join public.staff_members as staff
  on staff.workspace_id = shift.workspace_id
 and staff.id = shift.staff_member_id
where public.current_staff_member_id(shift.workspace_id) is not null
  and not exists (
    select 1
    from public.published_rota_snapshots as later_snapshot
    where later_snapshot.workspace_id = snapshot.workspace_id
      and later_snapshot.rota_week_id = snapshot.rota_week_id
      and later_snapshot.version > snapshot.version
  );

grant select on public.staff_portal_team_shifts to authenticated;

comment on view public.staff_portal_team_shifts is
  'Staff-safe latest published snapshot shifts for the caller''s own workspace, including colleague display names and roles — the digital equivalent of the printed rota on the wall. Never exposes live drafts or private staff fields.';

notify pgrst, 'reload schema';
