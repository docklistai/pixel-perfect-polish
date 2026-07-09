-- Phase 24: configurable rota start day.
--
-- Rota weeks were hardcoded to start on Monday (a CHECK on rota_weeks.week_start).
-- Some venues run a Sunday- or Wednesday-start week. This adds a per-workspace
-- rota_start_weekday (0 = Monday .. 6 = Sunday, default Monday so nothing changes
-- for existing workspaces) and relaxes the CHECK. Correctness of week_start now
-- rests with the application (weekStartForOffset), and the setting may only be
-- changed before any rota weeks exist, so a workspace's weeks never mix start
-- days — see updateRotaStartDayFn's guard.

alter table public.workspaces
  add column rota_start_weekday smallint not null default 0
    check (rota_start_weekday between 0 and 6);

comment on column public.workspaces.rota_start_weekday is
  'First weekday of the rota week: 0 = Monday .. 6 = Sunday. Default Monday. Only changeable before any rota weeks exist.';

-- The week no longer has to start on a Monday; the app sets week_start to the
-- workspace''s configured start day.
alter table public.rota_weeks drop constraint rota_weeks_week_start_check;

notify pgrst, 'reload schema';
