-- LOCAL ONLY.
-- DO NOT RUN AGAINST REMOTE / PRODUCTION.
-- Intended for headed browser smoke after local Supabase reset/start.
--
-- Apply locally from the repo root, with the local Supabase stack running:
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/snippets/local-headed-smoke-fixture.sql
--
-- Smoke target:
--   manager sign-in: alex@harbourview.co.uk / Docklist2026
--   rota week:       /rota?week=1
--
-- The fixture reuses the seeded Harbour View workspace, location, manager auth,
-- departments, and existing staff. It adds only one local smoke staff member
-- because the seed has no second active Barista recovery candidate.
begin;
do $$
declare
  smoke_workspace_id constant uuid := '10000000-0000-4000-8000-000000000001';
  smoke_location_id constant uuid := '11000000-0000-4000-8000-000000000001';
  foh_department_id constant uuid := '12000000-0000-4000-8000-000000000001';
  bar_department_id constant uuid := '12000000-0000-4000-8000-000000000003';
  manager_membership_id constant uuid := '13000000-0000-4000-8000-000000000011';
  sophie_staff_id constant uuid := '14000000-0000-4000-8000-000000000001';
  olivia_staff_id constant uuid := '14000000-0000-4000-8000-000000000005';
  smoke_barista_staff_id constant uuid := '54000000-0000-4000-8000-000000000001';
  smoke_rota_week_id constant uuid := '55000000-0000-4000-8000-000000000001';
  sophie_shift_id constant uuid := '56000000-0000-4000-8000-000000000001';
  olivia_conflict_shift_id constant uuid := '56000000-0000-4000-8000-000000000002';
  open_bartender_shift_id constant uuid := '56000000-0000-4000-8000-000000000003';
  sophie_leave_id constant uuid := '57000000-0000-4000-8000-000000000001';
  olivia_leave_id constant uuid := '57000000-0000-4000-8000-000000000002';
  smoke_timezone text;
  smoke_today date;
  current_week_start date;
  smoke_week_start date;
  smoke_week_id uuid;
  sophie_leave_start date;
  sophie_leave_end date;
  olivia_leave_start date;
  olivia_leave_end date;
begin
  select location.timezone
  into smoke_timezone
  from public.locations as location
  where location.workspace_id = smoke_workspace_id
    and location.id = smoke_location_id
    and location.status = 'active';

  if smoke_timezone is null then
    raise exception 'Local headed smoke fixture requires the seeded Harbour View location.';
  end if;

  if not exists (
    select 1
    from public.workspace_memberships as membership
    where membership.workspace_id = smoke_workspace_id
      and membership.id = manager_membership_id
      and membership.role in ('owner', 'manager')
      and membership.status = 'active'
  ) then
    raise exception 'Local headed smoke fixture requires the seeded local manager membership.';
  end if;

  smoke_today := timezone(smoke_timezone, now())::date;
  current_week_start := smoke_today - (extract(isodow from smoke_today)::integer - 1);
  smoke_week_start := current_week_start + 7;
  sophie_leave_start := smoke_week_start + 1;
  sophie_leave_end := smoke_week_start + 2;
  olivia_leave_start := smoke_week_start + 2;
  olivia_leave_end := smoke_week_start + 4;

  -- Reset fixture-owned shifts before moving/reusing the deterministic fixture week.
  delete from public.shifts as shift
  where shift.workspace_id = smoke_workspace_id
    and shift.id in (sophie_shift_id, olivia_conflict_shift_id, open_bartender_shift_id);

  select rota_week.id
  into smoke_week_id
  from public.rota_weeks as rota_week
  where rota_week.workspace_id = smoke_workspace_id
    and rota_week.location_id = smoke_location_id
    and rota_week.week_start = smoke_week_start;

  if smoke_week_id is null then
    if exists (
      select 1
      from public.rota_weeks as fixture_week
      where fixture_week.workspace_id = smoke_workspace_id
        and fixture_week.id = smoke_rota_week_id
    ) then
      update public.rota_weeks
      set location_id = smoke_location_id,
          week_start = smoke_week_start,
          status = 'draft'
      where workspace_id = smoke_workspace_id
        and id = smoke_rota_week_id
      returning id into smoke_week_id;
    else
      insert into public.rota_weeks (
        id, workspace_id, location_id, week_start, status, created_at, updated_at
      )
      values (
        smoke_rota_week_id,
        smoke_workspace_id,
        smoke_location_id,
        smoke_week_start,
        'draft',
        now(),
        now()
      )
      returning id into smoke_week_id;
    end if;
  end if;

  insert into public.staff_members (
    id, workspace_id, membership_id, primary_location_id, department_id, display_name,
    email, phone, role_name, employment_status, contract_type,
    contracted_minutes_per_week, start_date, end_date, created_at, updated_at
  )
  values (
    smoke_barista_staff_id,
    smoke_workspace_id,
    null,
    smoke_location_id,
    foh_department_id,
    'Maya Ellis',
    'maya.ellis.smoke@harbourview.co.uk',
    null,
    'Barista',
    'active',
    'part_time',
    1440,
    '2025-02-03',
    null,
    now(),
    now()
  )
  on conflict (id) do update
  set membership_id = null,
      primary_location_id = excluded.primary_location_id,
      department_id = excluded.department_id,
      display_name = excluded.display_name,
      email = excluded.email,
      phone = excluded.phone,
      role_name = excluded.role_name,
      employment_status = excluded.employment_status,
      contract_type = excluded.contract_type,
      contracted_minutes_per_week = excluded.contracted_minutes_per_week,
      start_date = excluded.start_date,
      end_date = null;

  insert into public.leave_requests (
    id, workspace_id, staff_member_id, leave_type, start_date, end_date, reason,
    status, submitted_at, decided_at, decided_by_membership_id, decision_reason,
    created_at, updated_at
  )
  values
    (
      sophie_leave_id,
      smoke_workspace_id,
      sophie_staff_id,
      'annual_leave',
      sophie_leave_start,
      sophie_leave_end,
      'Local smoke fixture: pending leave overlapping assigned rota shifts.',
      'pending',
      now(),
      null,
      null,
      null,
      now(),
      now()
    ),
    (
      olivia_leave_id,
      smoke_workspace_id,
      olivia_staff_id,
      'annual_leave',
      olivia_leave_start,
      olivia_leave_end,
      'Local smoke fixture: approved leave for rota conflict recovery.',
      'approved',
      now(),
      now(),
      manager_membership_id,
      'Local smoke fixture: approved to expose rota recovery.',
      now(),
      now()
    )
  on conflict (id) do update
  set leave_type = excluded.leave_type,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      reason = excluded.reason,
      status = excluded.status,
      decided_at = excluded.decided_at,
      decided_by_membership_id = excluded.decided_by_membership_id,
      decision_reason = excluded.decision_reason;

  insert into public.shifts (
    id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
    shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status,
    created_at, updated_at
  )
  values
    (
      sophie_shift_id,
      smoke_workspace_id,
      smoke_week_id,
      smoke_location_id,
      foh_department_id,
      sophie_staff_id,
      sophie_leave_start,
      (sophie_leave_start + time '09:00') at time zone smoke_timezone,
      (sophie_leave_start + time '17:00') at time zone smoke_timezone,
      30,
      'FOH Supervisor',
      'scheduled',
      now(),
      now()
    ),
    (
      olivia_conflict_shift_id,
      smoke_workspace_id,
      smoke_week_id,
      smoke_location_id,
      foh_department_id,
      olivia_staff_id,
      olivia_leave_start,
      (olivia_leave_start + time '07:00') at time zone smoke_timezone,
      (olivia_leave_start + time '15:00') at time zone smoke_timezone,
      30,
      'Barista',
      'scheduled',
      now(),
      now()
    ),
    (
      open_bartender_shift_id,
      smoke_workspace_id,
      smoke_week_id,
      smoke_location_id,
      bar_department_id,
      null,
      smoke_week_start + 3,
      (smoke_week_start + 3 + time '16:00') at time zone smoke_timezone,
      (smoke_week_start + 4 + time '00:00') at time zone smoke_timezone,
      30,
      'Bartender',
      'open',
      now(),
      now()
    )
  on conflict (id) do update
  set rota_week_id = excluded.rota_week_id,
      location_id = excluded.location_id,
      department_id = excluded.department_id,
      staff_member_id = excluded.staff_member_id,
      shift_date = excluded.shift_date,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      break_minutes = excluded.break_minutes,
      role_name = excluded.role_name,
      assignment_status = excluded.assignment_status;
end $$;
commit;
