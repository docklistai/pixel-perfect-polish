-- Phase 18: workspace opening days.
--
-- A hospitality business is often closed on set weekdays (e.g. shut Mondays).
-- Capturing this at setup lets the Rota flag shifts accidentally scheduled on a
-- closed day. Stored as a 7-bit mask on the workspaces row (bit i = open on
-- weekday i, 0 = Monday .. 6 = Sunday). Null = not configured (treated as open
-- every day). Editable under the existing workspaces_manager_update RLS.

alter table public.workspaces
  add column open_weekdays_mask integer
    check (open_weekdays_mask is null or open_weekdays_mask between 0 and 127);

comment on column public.workspaces.open_weekdays_mask is
  'Optional 7-bit open-days mask (bit 0 = Monday .. bit 6 = Sunday). Null = open every day. Drives Rota closed-day warnings.';

notify pgrst, 'reload schema';
