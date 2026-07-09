-- Phase 22: workspace opening hours (default trading times).
--
-- Alongside the opening DAYS mask (phase 18), capture the default open/close
-- time. The rota flags shifts that clearly fall outside trading hours on an open
-- day — a fast sanity check while building. Kept lean: a single default window
-- (most small hospitality trades the same hours daily); null = not configured.
-- Editable under the existing workspaces_manager_update RLS.

alter table public.workspaces
  add column default_open_time time,
  add column default_close_time time;

comment on column public.workspaces.default_open_time is
  'Optional default opening time (local). Null = not configured. With default_close_time drives Rota out-of-hours warnings.';
comment on column public.workspaces.default_close_time is
  'Optional default closing time (local). Null = not configured.';

notify pgrst, 'reload schema';
