-- Phase 23 clear-rota-day verification. Rolled-back transaction against the
-- local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase23_clear_rota_day_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000601', 'authenticated', 'authenticated', 'p23.mgr@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000602', 'authenticated', 'authenticated', 'p23.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone)
values ('81000000-0000-4000-8000-000000000601', 'p23-site', 'P23 Site', 'Europe/London');
insert into public.locations (id, workspace_id, name, timezone)
values ('82000000-0000-4000-8000-000000000601', '81000000-0000-4000-8000-000000000601', 'P23 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('83000000-0000-4000-8000-000000000601', '81000000-0000-4000-8000-000000000601', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('84000000-0000-4000-8000-000000000601', '81000000-0000-4000-8000-000000000601', 'ad000000-0000-4000-8000-000000000601', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('86000000-0000-4000-8000-000000000601', '81000000-0000-4000-8000-000000000601', '82000000-0000-4000-8000-000000000601', '2026-06-15', 'draft');

-- Two shifts on Monday (2026-06-15), one on Tuesday.
insert into public.shifts (
  workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status
) values
  ('81000000-0000-4000-8000-000000000601','86000000-0000-4000-8000-000000000601','82000000-0000-4000-8000-000000000601','83000000-0000-4000-8000-000000000601',null,'2026-06-15','2026-06-15 09:00:00+01','2026-06-15 17:00:00+01',0,'Chef','open'),
  ('81000000-0000-4000-8000-000000000601','86000000-0000-4000-8000-000000000601','82000000-0000-4000-8000-000000000601','83000000-0000-4000-8000-000000000601',null,'2026-06-15','2026-06-15 17:00:00+01','2026-06-15 23:00:00+01',0,'Chef','open'),
  ('81000000-0000-4000-8000-000000000601','86000000-0000-4000-8000-000000000601','82000000-0000-4000-8000-000000000601','83000000-0000-4000-8000-000000000601',null,'2026-06-16','2026-06-16 09:00:00+01','2026-06-16 17:00:00+01',0,'Chef','open');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000601","role":"authenticated"}', true);
set local role authenticated;

do $$
declare result jsonb; removed int; remaining bigint;
begin
  result := public.rpc_clear_rota_day(
    '81000000-0000-4000-8000-000000000601', '86000000-0000-4000-8000-000000000601', 0::smallint);
  removed := (result->>'shifts_removed')::int;
  if removed <> 2 then raise exception 'FAIL: expected 2 removed, got %', removed; end if;

  select count(*) into remaining from public.shifts
  where rota_week_id = '86000000-0000-4000-8000-000000000601';
  if remaining <> 1 then raise exception 'FAIL: Tuesday shift should survive (% remain)', remaining; end if;
  raise notice 'PASS: cleared Monday only, Tuesday untouched';

  update public.rota_weeks set status = 'published' where id = '86000000-0000-4000-8000-000000000601';
  begin
    perform public.rpc_clear_rota_day(
      '81000000-0000-4000-8000-000000000601', '86000000-0000-4000-8000-000000000601', 1::smallint);
    raise exception 'FAIL: cleared a non-draft week';
  exception when sqlstate '55000' then
    raise notice 'PASS: non-draft week rejected';
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000602","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.rpc_clear_rota_day(
      '81000000-0000-4000-8000-000000000601', '86000000-0000-4000-8000-000000000601', 0::smallint);
    raise exception 'FAIL: outsider cleared a day';
  exception when sqlstate '42501' then
    raise notice 'PASS: outsider blocked';
  end;
end $$;

rollback;
