create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  timezone text not null default 'Europe/London' check (length(btrim(timezone)) > 0),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  timezone text not null check (length(btrim(timezone)) > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended', 'revoked')),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (joined_at is null or user_id is not null),
  check (status <> 'active' or (user_id is not null and joined_at is not null))
);

create unique index workspace_memberships_workspace_user_uidx
  on public.workspace_memberships (workspace_id, user_id)
  where user_id is not null;

create index workspace_memberships_workspace_role_idx
  on public.workspace_memberships (workspace_id, role, status);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  membership_id uuid,
  primary_location_id uuid,
  department_id uuid,
  display_name text not null check (length(btrim(display_name)) between 1 and 160),
  email text check (email is null or email = lower(email)),
  phone text,
  role_name text not null check (length(btrim(role_name)) between 1 and 120),
  employment_status text not null default 'active'
    check (employment_status in ('active', 'inactive', 'left')),
  contract_type text check (contract_type in ('full_time', 'part_time', 'casual', 'fixed_term')),
  contracted_minutes_per_week integer check (contracted_minutes_per_week between 0 and 10080),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, membership_id),
  foreign key (workspace_id, membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (membership_id),
  foreign key (workspace_id, primary_location_id)
    references public.locations (workspace_id, id) on delete set null (primary_location_id),
  foreign key (workspace_id, department_id)
    references public.departments (workspace_id, id) on delete set null (department_id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index staff_members_workspace_department_idx
  on public.staff_members (workspace_id, department_id, employment_status);

create index staff_members_workspace_location_idx
  on public.staff_members (workspace_id, primary_location_id, employment_status);

create index staff_members_workspace_name_idx
  on public.staff_members (workspace_id, display_name);

create unique index staff_members_workspace_email_uidx
  on public.staff_members (workspace_id, lower(email))
  where email is not null;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger workspace_memberships_set_updated_at
before update on public.workspace_memberships
for each row execute function public.set_updated_at();

create trigger staff_members_set_updated_at
before update on public.staff_members
for each row execute function public.set_updated_at();

comment on column public.workspace_memberships.user_id is
  'Linked to auth.users only after a real user claims an invitation; Phase 4 seeds no auth identities.';

comment on table public.staff_members is
  'Canonical lightweight staff identity and scheduling attributes. Manager notes, performance fields, and derived metrics are intentionally excluded.';
