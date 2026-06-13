-- Phase 6 credential-hardness check (blocker 6): staff-code expiry is enforced
-- at claim time. The workspace-code storage lockdown (staff cannot read, manager
-- cannot update directly) is covered in phase6_portal_access_tests.sql.
--
-- Runs in one rolled-back transaction against the local stack:
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase6_portal_storage_tests.sql

begin;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', 'ba000000-0000-4000-8000-000000000020', 'authenticated', 'authenticated', null);

-- Plaintext codes cross the persona switch through this temp table.
create temporary table phase6_expiry_codes (label text primary key, code text not null) on commit drop;
grant select, insert on table phase6_expiry_codes to public;

-- Manager Alex issues a workspace code and a staff code for Priya (unbound).
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  ws_code text;
  priya_code text;
begin
  ws_code := public.rpc_issue_workspace_portal_code('10000000-0000-4000-8000-000000000001');
  priya_code := public.rpc_issue_staff_portal_code('10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000003');
  insert into phase6_expiry_codes (label, code) values ('ws', ws_code), ('priya', priya_code);
end $$;

-- Force the staff code into the past on the service path. Managers have no
-- direct write path to this table, so this models time passing, not a manager
-- action.
reset role;
update public.staff_portal_access_codes
set expires_at = transaction_timestamp() - interval '1 minute'
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and staff_member_id = '14000000-0000-4000-8000-000000000003';
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"ba000000-0000-4000-8000-000000000020","role":"authenticated"}', true);

do $$
declare
  ws_code text;
  priya_code text;
  bound_user uuid;
begin
  select code into ws_code from phase6_expiry_codes where label = 'ws';
  select code into priya_code from phase6_expiry_codes where label = 'priya';

  begin
    perform public.rpc_claim_staff_portal_access(ws_code, priya_code);
    raise exception 'FAIL: an expired staff code was accepted';
  exception when sqlstate '55000' then
    raise notice 'PASS: expired staff code is rejected at claim time';
  end;

  select user_id into bound_user
  from public.workspace_memberships
  where id = '13000000-0000-4000-8000-000000000004';
  if bound_user is not null then
    raise exception 'FAIL: expired claim still bound an identity (user %)', bound_user;
  end if;
  raise notice 'PASS: expired claim leaves the membership unbound';
end $$;

do $$ begin raise notice 'ALL PHASE 6 STORAGE/EXPIRY CHECKS PASSED'; end $$;

rollback;
