-- Phase 26 timezone-authority verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase26_timezone_authority_tests.sql
--
-- Covers: staff_portal_profile exposing the venue timezone (primary location
-- first, workspace fallback), and rpc_apply_demand_template stamping shift
-- instants in the rota week's LOCATION timezone — including an overnight slot
-- crossing midnight — instead of the workspace default.

begin;

-- --------------------------------------------------------------------------
-- Setup (postgres context). Workspace 1 = Harbour View (Europe/London).
-- Alex (user ab…0001, manager membership 13…0011) is already active in seed.
-- Olivia = staff 14…0005 via membership 13…0006; bind her to a fresh user.
-- One extra location in a very different timezone.
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000261', 'authenticated', 'authenticated', 'p26.olivia@harbourview.co.uk');

update public.workspace_memberships
set user_id = 'ad000000-0000-4000-8000-000000000261', status = 'active', joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000006';

insert into public.locations (id, workspace_id, name, timezone)
values ('32000000-0000-4000-8000-000000000261', '10000000-0000-4000-8000-000000000001', 'P26 New York Bar', 'America/New_York');

-- --------------------------------------------------------------------------
-- A. staff_portal_profile timezone: primary location wins, workspace falls back.
-- --------------------------------------------------------------------------
update public.staff_members
set primary_location_id = '32000000-0000-4000-8000-000000000261'
where id = '14000000-0000-4000-8000-000000000005';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000261","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  profile_timezone text;
begin
  select timezone into profile_timezone
  from public.staff_portal_profile
  where staff_member_id = '14000000-0000-4000-8000-000000000005';

  if profile_timezone is distinct from 'America/New_York' then
    raise exception 'FAIL: profile timezone % (expected the primary location America/New_York)', profile_timezone;
  end if;
  raise notice 'PASS: staff_portal_profile exposes the primary-location timezone';
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

update public.staff_members
set primary_location_id = null
where id = '14000000-0000-4000-8000-000000000005';

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000261","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  profile_timezone text;
begin
  select timezone into profile_timezone
  from public.staff_portal_profile
  where staff_member_id = '14000000-0000-4000-8000-000000000005';

  if profile_timezone is distinct from 'Europe/London' then
    raise exception 'FAIL: profile fallback timezone % (expected workspace Europe/London)', profile_timezone;
  end if;
  raise notice 'PASS: staff_portal_profile falls back to the workspace timezone';
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- --------------------------------------------------------------------------
-- B. rpc_apply_demand_template stamps instants in the LOCATION timezone.
--    Draft week on the New York location, Monday 2026-08-03. Two slots:
--    09:00–17:00 and an overnight 22:00–02:00.
-- --------------------------------------------------------------------------
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('37000000-0000-4000-8000-000000000261', '10000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000261', '2026-08-03', 'draft');

insert into public.rota_demand_templates (id, workspace_id, name)
values ('37000000-0000-4000-8000-000000000262', '10000000-0000-4000-8000-000000000001', 'P26 NY pattern');

insert into public.rota_demand_template_slots
  (workspace_id, template_id, weekday, role_name, department_id, start_time, end_time, break_minutes, quantity)
values
  ('10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000262', 0, 'Bartender', '12000000-0000-4000-8000-000000000003', '09:00', '17:00', 30, 1),
  ('10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000262', 0, 'Bartender', '12000000-0000-4000-8000-000000000003', '22:00', '02:00', 0, 1);

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
begin
  result := public.rpc_apply_demand_template(
    '10000000-0000-4000-8000-000000000001',
    '37000000-0000-4000-8000-000000000261',
    '37000000-0000-4000-8000-000000000262');
  if (result ->> 'open_shifts_created')::int <> 2 then
    raise exception 'FAIL: template created % open shifts (expected 2)', result ->> 'open_shifts_created';
  end if;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  day_shift record;
  night_shift record;
begin
  select starts_at, ends_at, shift_date into day_shift
  from public.shifts
  where rota_week_id = '37000000-0000-4000-8000-000000000261'
    and starts_at = (date '2026-08-03' + time '09:00') at time zone 'America/New_York';

  if day_shift.starts_at is null then
    raise exception 'FAIL: 09:00 slot did not land at 09:00 America/New_York (workspace-timezone stamping is back)';
  end if;
  if day_shift.ends_at <> (date '2026-08-03' + time '17:00') at time zone 'America/New_York' then
    raise exception 'FAIL: 17:00 slot end landed at % (expected 17:00 New York)', day_shift.ends_at;
  end if;
  -- The same wall time in London would be 4–5 hours earlier as an instant.
  if day_shift.starts_at = (date '2026-08-03' + time '09:00') at time zone 'Europe/London' then
    raise exception 'FAIL: 09:00 slot matches the London instant — location timezone was ignored';
  end if;
  raise notice 'PASS: demand template stamps day slots in the location timezone';

  select starts_at, ends_at, shift_date into night_shift
  from public.shifts
  where rota_week_id = '37000000-0000-4000-8000-000000000261'
    and starts_at = (date '2026-08-03' + time '22:00') at time zone 'America/New_York';

  if night_shift.starts_at is null then
    raise exception 'FAIL: overnight slot did not land at 22:00 America/New_York';
  end if;
  if night_shift.ends_at <> (date '2026-08-04' + time '02:00') at time zone 'America/New_York' then
    raise exception 'FAIL: overnight slot ended at % (expected 02:00 next day, New York)', night_shift.ends_at;
  end if;
  if night_shift.shift_date <> date '2026-08-03' then
    raise exception 'FAIL: overnight slot shift_date % (expected 2026-08-03)', night_shift.shift_date;
  end if;
  raise notice 'PASS: overnight template slot crosses midnight in the location timezone';
end $$;

-- --------------------------------------------------------------------------
-- C. Saving and reapplying a location-local week is a lossless round trip.
-- --------------------------------------------------------------------------
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values
  ('37000000-0000-4000-8000-000000000263', '10000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000261', '2026-08-10', 'draft'),
  ('37000000-0000-4000-8000-000000000264', '10000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000261', '2026-08-17', 'draft');

insert into public.shifts (
  workspace_id, rota_week_id, location_id, department_id, shift_date,
  starts_at, ends_at, break_minutes, role_name, assignment_status
)
values
  ('10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000263', '32000000-0000-4000-8000-000000000261', '12000000-0000-4000-8000-000000000003', '2026-08-10',
   (date '2026-08-10' + time '09:00') at time zone 'America/New_York',
   (date '2026-08-10' + time '17:00') at time zone 'America/New_York', 30, 'Bartender', 'open'),
  ('10000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000263', '32000000-0000-4000-8000-000000000261', '12000000-0000-4000-8000-000000000003', '2026-08-10',
   (date '2026-08-10' + time '22:00') at time zone 'America/New_York',
   (date '2026-08-11' + time '02:00') at time zone 'America/New_York', 0, 'Bartender', 'open');

select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  saved jsonb;
  saved_template_id uuid;
  applied jsonb;
begin
  saved := public.rpc_save_demand_template(
    '10000000-0000-4000-8000-000000000001',
    '37000000-0000-4000-8000-000000000263',
    'P26 NY round trip', null);
  saved_template_id := (saved ->> 'template_id')::uuid;

  if not exists (
    select 1 from public.rota_demand_template_slots
    where template_id = saved_template_id and start_time = '09:00' and end_time = '17:00'
  ) or not exists (
    select 1 from public.rota_demand_template_slots
    where template_id = saved_template_id and start_time = '22:00' and end_time = '02:00'
  ) then
    raise exception 'FAIL: saving a New York week did not preserve its local wall times';
  end if;

  applied := public.rpc_apply_demand_template(
    '10000000-0000-4000-8000-000000000001',
    '37000000-0000-4000-8000-000000000264',
    saved_template_id);
  if (applied ->> 'open_shifts_created')::int <> 2 then
    raise exception 'FAIL: round-trip template applied % shifts (expected 2)', applied ->> 'open_shifts_created';
  end if;
  perform public.rpc_publish_rota_week(
    '10000000-0000-4000-8000-000000000001',
    '37000000-0000-4000-8000-000000000264');
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000261","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  row_count integer;
begin
  select count(*) into row_count
  from public.staff_portal_team_shifts
  where shift_date in ('2026-08-17', '2026-08-18')
    and location_timezone = 'America/New_York';
  if row_count <> 2 then
    raise exception 'FAIL: staff-safe published rows exposed % New York timezones (expected 2)', row_count;
  end if;
  raise notice 'PASS: published portal rows carry the shift location timezone, not the profile fallback';
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
begin
  if not exists (
    select 1 from public.shifts
    where rota_week_id = '37000000-0000-4000-8000-000000000264'
      and starts_at = (date '2026-08-17' + time '09:00') at time zone 'America/New_York'
      and ends_at = (date '2026-08-17' + time '17:00') at time zone 'America/New_York'
  ) or not exists (
    select 1 from public.shifts
    where rota_week_id = '37000000-0000-4000-8000-000000000264'
      and starts_at = (date '2026-08-17' + time '22:00') at time zone 'America/New_York'
      and ends_at = (date '2026-08-18' + time '02:00') at time zone 'America/New_York'
  ) then
    raise exception 'FAIL: save/apply round trip drifted from New York wall times';
  end if;
  raise notice 'PASS: demand-template save/apply round trip preserves location-local day and overnight times';
end $$;

rollback;
