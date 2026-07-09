-- Phase 19: persist per-shift role/colour overrides on live rotas.
--
-- Hospitality staff often work a different role (and want a different colour
-- band) shift to shift. The grid already offers per-shift colour and role-label
-- overrides, but they were draft/demo-only. These two nullable columns let the
-- live rota persist them. They are manager grid-planning aids: the published
-- snapshot still shows the real role_name, so staff are never shown a manager's
-- private colour coding.

alter table public.shifts
  add column colour_override text
    check (colour_override is null or length(colour_override) <= 30),
  add column dept_override text
    check (dept_override is null or length(btrim(dept_override)) between 1 and 120);

comment on column public.shifts.colour_override is
  'Optional manager colour-preset override for the rota grid chip. Null = role default.';
comment on column public.shifts.dept_override is
  'Optional manager role/area label override shown on the rota grid. Null = role_name.';

notify pgrst, 'reload schema';
