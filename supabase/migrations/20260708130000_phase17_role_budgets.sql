-- Phase 17: per-role weekly labour budgets.
--
-- Completes the labour picture: alongside the workspace weekly and daily hours
-- budgets (phase 13/16), managers can cap weekly hours per role/area — e.g.
-- "kitchen no more than 200h/week". Manager-only config, so writes go through
-- RLS-scoped server functions (no RPC layer needed), matching workspace_settings.

create table public.workspace_role_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role_name text not null check (length(btrim(role_name)) between 1 and 120),
  weekly_budget_minutes integer not null
    check (weekly_budget_minutes between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, role_name)
);

create index workspace_role_budgets_workspace_idx
  on public.workspace_role_budgets (workspace_id);

create trigger workspace_role_budgets_set_updated_at
before update on public.workspace_role_budgets
for each row execute function public.set_updated_at();

create trigger workspace_role_budgets_protect_immutable
before update on public.workspace_role_budgets
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'created_at');

alter table public.workspace_role_budgets enable row level security;

revoke all on table public.workspace_role_budgets from public, anon;
grant select, insert, update, delete on table public.workspace_role_budgets to authenticated;

create policy workspace_role_budgets_manager_all
on public.workspace_role_budgets for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.workspace_role_budgets is
  'Manager-only per-role weekly hours budgets. Staff have no read path; these drive the Rota per-role budget warnings only.';

notify pgrst, 'reload schema';
