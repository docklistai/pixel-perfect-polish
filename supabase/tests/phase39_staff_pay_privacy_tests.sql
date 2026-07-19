-- Phase 39 staff pay privacy verification. Runs entirely inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase39_staff_pay_privacy_tests.sql
--
-- Proves the pilot privacy rule: staff roles have NO read or write path to
-- `staff_pay_rates` or `workspace_settings` (labour planning), while managers
-- keep full labour-planning access. A failed check raises P0001 (FAIL).

begin;

-- --------------------------------------------------------------------------
-- Setup (service path): claim seeded memberships for test auth identities.
-- Workspace 1 = 10000000-…0001 (Harbour View seed).
-- --------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'a3900000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'p39.manager@harbourview.co.uk'),
  ('00000000-0000-0000-0000-000000000000', 'a3900000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'p39.olivia@harbourview.co.uk');

update public.workspace_memberships set user_id = 'a3900000-0000-4000-8000-000000000001', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000010';
update public.workspace_memberships set user_id = 'a3900000-0000-4000-8000-000000000002', status = 'active', joined_at = '2026-06-01T09:00:00Z' where id = '13000000-0000-4000-8000-000000000006';

-- Manager seeds a pay rate + labour settings so staff probes have targets.
select set_config('request.jwt.claims', '{"sub":"a3900000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  insert into public.staff_pay_rates (workspace_id, staff_member_id, hourly_rate_pence, set_by_membership_id)
  values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', 1250, '13000000-0000-4000-8000-000000000010');

  insert into public.workspace_settings (workspace_id, weekly_budget_minutes, avg_hourly_cost_pence)
  values ('10000000-0000-4000-8000-000000000001', 49200, 1400);
  raise notice 'PASS: manager seeds pay rate and labour settings';
end $$;

-- --------------------------------------------------------------------------
-- STAFF persona (Olivia, staff_member 14000000-…0005): zero pay visibility.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a3900000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  n bigint;
begin
  -- 1. No pay-rate rows at all — including the staff member's own row.
  select count(*) into n from public.staff_pay_rates;
  if n <> 0 then
    raise exception 'FAIL: staff can read % staff_pay_rates rows (expected 0)', n;
  end if;
  raise notice 'PASS: staff cannot read any pay rate (own row included)';

  -- 2. Explicit own-row probe by key returns nothing.
  select count(*) into n
  from public.staff_pay_rates
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and staff_member_id = '14000000-0000-4000-8000-000000000005';
  if n <> 0 then
    raise exception 'FAIL: staff read their own pay-rate row by key';
  end if;
  raise notice 'PASS: keyed own-rate probe returns nothing';

  -- 3. No labour planning settings.
  select count(*) into n from public.workspace_settings;
  if n <> 0 then
    raise exception 'FAIL: staff can read % workspace_settings rows (expected 0)', n;
  end if;
  raise notice 'PASS: staff cannot read labour planning settings';

  -- 4. No writes: insert / update / delete all rejected or no-ops.
  begin
    insert into public.staff_pay_rates (workspace_id, staff_member_id, hourly_rate_pence)
    values ('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000005', 9900);
    raise exception 'FAIL: staff inserted a pay rate';
  exception when sqlstate '42501' then null;
  end;

  begin
    update public.staff_pay_rates set hourly_rate_pence = 9900
    where workspace_id = '10000000-0000-4000-8000-000000000001';
    if found then
      raise exception 'FAIL: staff updated a pay rate';
    end if;
  exception when sqlstate '42501' then null;
  end;

  begin
    delete from public.staff_pay_rates
    where workspace_id = '10000000-0000-4000-8000-000000000001';
    if found then
      raise exception 'FAIL: staff deleted a pay rate';
    end if;
  exception when sqlstate '42501' then null;
  end;
  raise notice 'PASS: staff cannot write pay rates';
end $$;

-- --------------------------------------------------------------------------
-- MANAGER persona: labour planning still fully readable.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a3900000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  n bigint;
begin
  select count(*) into n from public.staff_pay_rates
  where workspace_id = '10000000-0000-4000-8000-000000000001';
  if n < 1 then
    raise exception 'FAIL: manager lost read access to pay rates';
  end if;
  raise notice 'PASS: manager labour planning access unchanged';
end $$;

rollback;
