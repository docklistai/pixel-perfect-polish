-- Phase 16: daily labour budget.
--
-- Adds a per-day hours budget alongside the existing weekly budget so managers
-- can catch a single overstaffed day (a quiet Tuesday scheduled like a Saturday)
-- while building the rota. Additive, manager-only — the column lives on the
-- existing manager-scoped workspace_settings table and inherits its RLS.

alter table public.workspace_settings
  add column daily_budget_minutes integer
    check (daily_budget_minutes is null or daily_budget_minutes between 0 and 200000);

comment on column public.workspace_settings.daily_budget_minutes is
  'Optional per-day labour budget in minutes (e.g. 40h = 2400). Null = not set. Drives the Rota daily-budget warnings.';

notify pgrst, 'reload schema';
