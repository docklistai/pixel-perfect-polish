-- Phase 20 copy-rota-day verification. Rolled-back transaction against the local
-- stack. Requires phase 19 override columns (the combined runner applies them).
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase20_copy_rota_day_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000401', 'authenticated', 'authenticated', 'p20.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000402', 'authenticated', 'authenticated', 'p20.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('61000000-0000-4000-8000-000000000401', 'p20-site', 'P20 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('62000000-0000-4000-8000-000000000401', '61000000-0000-4000-8000-000000000401', 'P20 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('63000000-0000-4000-8000-000000000401', '61000000-0000-4000-8000-000000000401', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('64000000-0000-4000-8000-000000000401', '61000000-0000-4000-8000-000000000401', 'ad000000-0000-4000-8000-000000000401', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id, display_name, role_name)
values ('65000000-0000-4000-8000-000000000401', '61000000-0000-4000-8000-000000000401', '64000000-0000-4000-8000-000000000401', '62000000-0000-4000-8000-000000000401', '63000000-0000-4000-8000-000000000401', 'P20 Chef', 'Chef');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('66000000-0000-4000-8000-000000000401', '61000000-0000-4000-8000-000000000401', '62000000-0000-4000-8000-000000000401', '2026-06-15', 'draft');

-- Monday (2026-06-15) source: 1 assigned Chef 09-17 with a colour override, and
-- 1 overnight open Bar shift 22:00 -> 02:00.
insert into public.shifts (
  workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status, colour_override
) values
  ('61000000-0000-4000-8000-000000000401','66000000-0000-4000-8000-000000000401','62000000-0000-4000-8000-000000000401','63000000-0000-4000-8000-000000000401','65000000-0000-4000-8000-000000000401',
   '2026-06-15','2026-06-15 09:00:00+01','2026-06-15 17:00:00+01',30,'Chef','scheduled','amber'),
  ('61000000-0000-4000-8000-000000000401','66000000-0000-4000-8000-000000000401','62000000-0000-4000-8000-000000000401','63000000-0000-4000-8000-000000000401',null,
   '2026-06-19','2026-06-19 22:00:00+01','2026-06-20 02:00:00+01',0,'Bar','open',null);
-- (Bar shift is Friday; the Chef shift is the Monday source we copy.)

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000401","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  result jsonb;
  created int;
  tue_local time;
  tue_colour text;
  tue_staff uuid;
begin
  -- Copy Monday (0) to Tuesday (1) and Wednesday (2); 0 in the list is ignored.
  result := public.rpc_copy_rota_day(
    '61000000-0000-4000-8000-000000000401', '66000000-0000-4000-8000-000000000401',
    0::smallint, array[0,1,2]::smallint[]);
  created := (result->>'shifts_created')::int;
  if created <> 2 then
    raise exception 'FAIL: expected 2 shifts created (Chef x Tue,Wed), got %', created;
  end if;
  raise notice 'PASS: copied Monday to Tue+Wed (self excluded), 2 shifts';

  select (starts_at at time zone 'Europe/London')::time, colour_override, staff_member_id
  into tue_local, tue_colour, tue_staff
  from public.shifts
  where rota_week_id = '66000000-0000-4000-8000-000000000401' and shift_date = '2026-06-16';
  if tue_local <> '09:00' or tue_colour is distinct from 'amber' or tue_staff is null then
    raise exception 'FAIL: Tuesday copy wrong (start %, colour %, staff %)', tue_local, tue_colour, tue_staff;
  end if;
  raise notice 'PASS: Tuesday copy keeps 09:00 local, colour override, and assignment';

  -- Only draft weeks are editable.
  update public.rota_weeks set status = 'published' where id = '66000000-0000-4000-8000-000000000401';
  begin
    perform public.rpc_copy_rota_day(
      '61000000-0000-4000-8000-000000000401', '66000000-0000-4000-8000-000000000401',
      0::smallint, array[3]::smallint[]);
    raise exception 'FAIL: copied into a non-draft week';
  exception when sqlstate '55000' then
    raise notice 'PASS: non-draft week rejected';
  end;
end $$;

-- Outsider cannot copy.
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000402","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.rpc_copy_rota_day(
      '61000000-0000-4000-8000-000000000401', '66000000-0000-4000-8000-000000000401',
      0::smallint, array[1]::smallint[]);
    raise exception 'FAIL: outsider copied a day';
  exception when sqlstate '42501' then
    raise notice 'PASS: outsider blocked';
  end;
end $$;

rollback;
