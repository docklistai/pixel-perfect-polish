create or replace function public.reject_immutable_row_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows are immutable', tg_table_name
    using errcode = '55000';
end;
$$;

create table public.rota_weeks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  location_id uuid not null,
  week_start date not null check (extract(isodow from week_start) = 1),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, location_id, week_start),
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict
);

create index rota_weeks_workspace_week_idx
  on public.rota_weeks (workspace_id, week_start desc);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  rota_week_id uuid not null,
  location_id uuid not null,
  department_id uuid not null,
  staff_member_id uuid,
  shift_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  role_name text not null check (length(btrim(role_name)) between 1 and 120),
  assignment_status text not null default 'scheduled'
    check (assignment_status in ('scheduled', 'open')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, rota_week_id)
    references public.rota_weeks (workspace_id, id) on delete cascade,
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict,
  foreign key (workspace_id, department_id)
    references public.departments (workspace_id, id) on delete restrict,
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  check (ends_at > starts_at),
  check (
    (assignment_status = 'open' and staff_member_id is null)
    or (assignment_status = 'scheduled' and staff_member_id is not null)
  )
);

create index shifts_workspace_week_date_idx
  on public.shifts (workspace_id, rota_week_id, shift_date, starts_at);

create index shifts_workspace_staff_date_idx
  on public.shifts (workspace_id, staff_member_id, shift_date, starts_at)
  where staff_member_id is not null;

create index shifts_workspace_open_date_idx
  on public.shifts (workspace_id, shift_date, starts_at)
  where assignment_status = 'open';

create index shifts_workspace_department_date_idx
  on public.shifts (workspace_id, department_id, shift_date);

create index shifts_workspace_location_date_idx
  on public.shifts (workspace_id, location_id, shift_date);

create table public.published_rota_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  rota_week_id uuid not null,
  version integer not null check (version > 0),
  published_at timestamptz not null,
  published_by_membership_id uuid not null,
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, rota_week_id, version),
  foreign key (workspace_id, rota_week_id)
    references public.rota_weeks (workspace_id, id) on delete restrict,
  foreign key (workspace_id, published_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict
);

create index published_rota_snapshots_workspace_week_latest_idx
  on public.published_rota_snapshots (workspace_id, rota_week_id, version desc);

create index published_rota_snapshots_workspace_publisher_idx
  on public.published_rota_snapshots (workspace_id, published_by_membership_id);

create table public.published_rota_shifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  snapshot_id uuid not null,
  source_shift_id uuid not null,
  location_id uuid not null,
  department_id uuid not null,
  staff_member_id uuid,
  shift_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  role_name text not null check (length(btrim(role_name)) between 1 and 120),
  assignment_status text not null check (assignment_status in ('scheduled', 'open')),
  created_at timestamptz not null default transaction_timestamp(),
  unique (workspace_id, id),
  unique (workspace_id, snapshot_id, source_shift_id),
  foreign key (workspace_id, snapshot_id)
    references public.published_rota_snapshots (workspace_id, id) on delete restrict,
  foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete restrict,
  foreign key (workspace_id, department_id)
    references public.departments (workspace_id, id) on delete restrict,
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete restrict,
  check (ends_at > starts_at),
  check (
    (assignment_status = 'open' and staff_member_id is null)
    or (assignment_status = 'scheduled' and staff_member_id is not null)
  )
);

create index published_rota_shifts_workspace_snapshot_date_idx
  on public.published_rota_shifts (workspace_id, snapshot_id, shift_date, starts_at);

create index published_rota_shifts_workspace_staff_date_idx
  on public.published_rota_shifts (workspace_id, staff_member_id, shift_date, starts_at)
  where staff_member_id is not null;

create index published_rota_shifts_workspace_location_date_idx
  on public.published_rota_shifts (workspace_id, location_id, shift_date);

create index published_rota_shifts_workspace_department_date_idx
  on public.published_rota_shifts (workspace_id, department_id, shift_date);

create or replace function public.guard_published_rota_shift_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_created_at timestamptz;
begin
  select snapshot.created_at
  into snapshot_created_at
  from public.published_rota_snapshots as snapshot
  where snapshot.workspace_id = new.workspace_id
    and snapshot.id = new.snapshot_id;

  if snapshot_created_at is distinct from transaction_timestamp() then
    raise exception 'published rota shifts must be inserted in the snapshot creation transaction'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger rota_weeks_set_updated_at
before update on public.rota_weeks
for each row execute function public.set_updated_at();

create trigger shifts_set_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

create trigger published_rota_snapshots_reject_changes
before update or delete on public.published_rota_snapshots
for each row execute function public.reject_immutable_row_change();

create trigger published_rota_shifts_guard_insert
before insert on public.published_rota_shifts
for each row execute function public.guard_published_rota_shift_insert();

create trigger published_rota_shifts_reject_changes
before update or delete on public.published_rota_shifts
for each row execute function public.reject_immutable_row_change();

comment on table public.shifts is
  'Manager-owned live draft shifts. Staff access is intentionally limited to immutable published snapshots.';

comment on table public.published_rota_snapshots is
  'Versioned immutable publication header. Backend publication must insert the header and its shifts in one transaction.';

comment on column public.published_rota_shifts.source_shift_id is
  'Historical source identifier retained without a foreign key so later draft deletion cannot damage the snapshot.';
