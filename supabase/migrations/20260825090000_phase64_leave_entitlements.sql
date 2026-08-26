-- Phase 64 — Leave entitlement.
--
-- Docklist records the leave entitlement a MANAGER STATES. It does not, and
-- must not, calculate statutory or contractual entitlement. Everything here is
-- storage for a manager-supplied number plus the arithmetic needed to show what
-- has been booked against it.
--
-- Deliberately absent, and not to be added later without a product decision:
--   * statutory / legal entitlement calculation
--   * pro-rata for joiners and leavers
--   * accrual
--   * automatic carry-over (a manager who carries days forward records the
--     resulting total; the number itself is the authoritative fact)
--   * bank / public holiday policy, jurisdiction rules
--   * half days, hours-based leave
--   * payroll, holiday pay, sick pay
--
-- Counting unit is the CALENDAR DAY. `leave_requests` stores whole-date ranges
-- and Docklist holds no per-person working pattern, so a "day" here is a
-- calendar date inside a request. `workspaces.open_weekdays_mask` is when the
-- business trades, not when a person works, and is deliberately NOT consulted.
-- Every user-facing surface states the unit.
--
-- Two concerns, one purpose each:
--   1. workspace_settings   — the workspace's stated leave-year start and
--                             default entitlement. Both NULLABLE with NO
--                             DEFAULT: an existing workspace must stay honestly
--                             unconfigured rather than silently acquire a
--                             UK-statutory-looking figure.
--   2. staff_leave_entitlements — one recorded entitlement per staff member per
--                             leave year, so a later year can never rewrite an
--                             earlier one.
--
-- Nothing in this migration touches scheduling: no rota, shift, publish,
-- Build-the-Week or leave-request schema or function is modified.

-- ---------------------------------------------------------------------------
-- 1. Workspace leave policy
--
--    Folded into the existing manager-only workspace_settings rather than a
--    second policy table, so there is exactly one workspace policy row and the
--    existing RLS, updated_at trigger and immutable-column protections apply
--    unchanged. The table grant is table-level, so new columns are covered
--    without a grant change.
-- ---------------------------------------------------------------------------

alter table public.workspace_settings
  add column leave_year_start_month smallint
    check (leave_year_start_month is null or leave_year_start_month between 1 and 12),
  add column default_annual_leave_days integer
    check (default_annual_leave_days is null or default_annual_leave_days between 0 and 366);

comment on column public.workspace_settings.leave_year_start_month is
  'Month (1-12) the workspace leave year begins on; the year always starts on the 1st. Null = not configured, which keeps every balance surface in its honest "not tracked yet" state. Changing this does not rewrite existing staff_leave_entitlements rows, which stay self-describing through their own leave_year_start.';

comment on column public.workspace_settings.default_annual_leave_days is
  'The workspace''s stated default annual leave in CALENDAR days. Null = not configured. This is a stated policy and a pre-fill for recording an individual entitlement — it is never a read-time fallback, so a staff member with no staff_leave_entitlements row reads as "not recorded", never as this number.';

-- ---------------------------------------------------------------------------
-- 2. staff_leave_entitlements
--
--    Keyed on the RESOLVED FIRST DAY of the leave year rather than an integer
--    year. An integer year becomes ambiguous the moment a workspace changes its
--    leave-year start month — "2026" would mean two different windows before
--    and after the change — whereas a stored start date makes every historical
--    row self-describing and immune to later policy edits.
--
--    Alice 2026-04-01 = 28 and Alice 2027-04-01 = 30 are two independent rows.
--    Writing the 2027 row cannot mutate the 2026 row.
-- ---------------------------------------------------------------------------

create table public.staff_leave_entitlements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_member_id uuid not null,
  leave_year_start date not null,
  entitlement_days integer not null
    check (entitlement_days between 0 and 366),
  set_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, staff_member_id, leave_year_start),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, set_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (set_by_membership_id)
);

-- The team-balance read scans one workspace's rows for one leave year.
create index staff_leave_entitlements_workspace_year_idx
  on public.staff_leave_entitlements (workspace_id, leave_year_start);

-- Covering index for the set_by_membership_id foreign key. Every FK in this
-- schema carries one (asserted by supabase/tests/phase4_adversarial.sql);
-- without it, deleting a membership has to sequentially scan this table.
-- Partial, matching leave_requests_workspace_decider_idx: the predicate is
-- exactly the FK column being non-null, which any FK probe implies.
create index staff_leave_entitlements_workspace_set_by_idx
  on public.staff_leave_entitlements (workspace_id, set_by_membership_id)
  where set_by_membership_id is not null;

create trigger staff_leave_entitlements_set_updated_at
before update on public.staff_leave_entitlements
for each row execute function public.set_updated_at();

-- leave_year_start joins the immutable set alongside the usual identity
-- columns. Without it an update could silently move a recorded entitlement from
-- one leave year to another, which is exactly the historical rewrite this
-- table's shape exists to prevent. The upsert path conflicts on
-- (workspace_id, staff_member_id, leave_year_start) and only ever changes
-- entitlement_days, so nothing legitimate needs to move it.
create trigger staff_leave_entitlements_protect_immutable
before update on public.staff_leave_entitlements
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'staff_member_id', 'leave_year_start', 'created_at');

alter table public.staff_leave_entitlements enable row level security;

revoke all on table public.staff_leave_entitlements from public, anon;
grant select, insert, update, delete on table public.staff_leave_entitlements to authenticated;

create policy staff_leave_entitlements_manager_all
on public.staff_leave_entitlements for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

-- A staff member may read their OWN recorded entitlement, which powers the
-- balance card in their portal. Colleague entitlements stay manager-only, and
-- staff get no insert, update or delete policy at all: the manager is the sole
-- author of this number.
create policy staff_leave_entitlements_self_select
on public.staff_leave_entitlements for select to authenticated
using (staff_member_id = public.current_staff_member_id(workspace_id));

comment on table public.staff_leave_entitlements is
  'One manager-recorded annual leave entitlement per staff member per leave year, in CALENDAR days. Keyed on the resolved first day of the leave year so a later year never rewrites an earlier one. This is a stated figure, not a statutory calculation: Docklist stores what the manager entered and never derives entitlement from contract, working pattern or jurisdiction.';

comment on column public.staff_leave_entitlements.leave_year_start is
  'First day of the leave year this entitlement applies to, already resolved from the workspace leave-year start month at the time it was recorded. Immutable, so historical rows stay self-describing if the workspace policy later changes.';

comment on column public.staff_leave_entitlements.entitlement_days is
  'Manager-stated annual leave for this leave year, counted in CALENDAR days. Not pro-rated, not accrued, not carried over automatically.';

-- ---------------------------------------------------------------------------
-- 3. staff_portal_leave_entitlements — the caller's own entitlement rows only
--
--    Matches staff_portal_leave_requests (security_invoker) so the portal reads
--    both through the same browser-client pattern under the same authority. The
--    row itself carries leave_year_start, so the portal resolves its own year
--    window without any read path into manager-only workspace_settings.
-- ---------------------------------------------------------------------------

create view public.staff_portal_leave_entitlements
with (security_barrier = true, security_invoker = true)
as
select
  entitlement.workspace_id,
  entitlement.id as entitlement_id,
  entitlement.staff_member_id,
  entitlement.leave_year_start,
  entitlement.entitlement_days,
  entitlement.updated_at
from public.staff_leave_entitlements as entitlement
where entitlement.staff_member_id = public.current_staff_member_id(entitlement.workspace_id);

grant select on public.staff_portal_leave_entitlements to authenticated;

comment on view public.staff_portal_leave_entitlements is
  'A staff member''s own recorded leave entitlement per leave year. Never exposes colleague entitlements, the workspace default, or any other workspace policy.';

notify pgrst, 'reload schema';
