-- Phase 21: per-workspace role colours.
--
-- The rota grid colours shifts by role, but the default palette groups roles by
-- department (all FOH roles share one colour). Hospitality managers want true
-- role-based colours they choose themselves (e.g. Waiter = teal, Host = blue).
-- This stores one colour preset per role; the rota prefers it over the built-in
-- department mapping, and a per-shift override still wins over both.
--
-- colour_preset is one of the design-system chip presets. Manager-only config,
-- so writes go through RLS-scoped server functions (no RPC layer needed).

create table public.workspace_role_colours (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role_name text not null check (length(btrim(role_name)) between 1 and 120),
  colour_preset text not null
    check (colour_preset in ('blue', 'amber', 'purple', 'green', 'rose', 'teal', 'slate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, role_name)
);

create index workspace_role_colours_workspace_idx
  on public.workspace_role_colours (workspace_id);

create trigger workspace_role_colours_set_updated_at
before update on public.workspace_role_colours
for each row execute function public.set_updated_at();

create trigger workspace_role_colours_protect_immutable
before update on public.workspace_role_colours
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

alter table public.workspace_role_colours enable row level security;

revoke all on table public.workspace_role_colours from public, anon;
grant select, insert, update, delete on table public.workspace_role_colours to authenticated;

create policy workspace_role_colours_manager_all
on public.workspace_role_colours for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.workspace_role_colours is
  'Manager-only per-role colour presets for the rota grid. Staff have no read path; drives manager-side rota colouring only.';

notify pgrst, 'reload schema';
