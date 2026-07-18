-- Phase 37 staff recovery/rebind state-machine and adversarial checks.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, is_anonymous, created_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e2000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', null, true, now()),
  ('00000000-0000-0000-0000-000000000000', 'e2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, now()),
  ('00000000-0000-0000-0000-000000000000', 'e2000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, now()),
  ('00000000-0000-0000-0000-000000000000', 'e2000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'permanent.recovery@example.test', false, now());

create temporary table phase37_codes (label text primary key, code text not null) on commit drop;
grant select, insert, update on table phase37_codes to authenticated;

-- Preserve a concrete history row to prove rebind keeps the same staff key.
insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date,
  clocked_in_at, clocked_out_at, break_minutes, approval_status
) values (
  'e2100000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000001',
  '2099-01-01', '2099-01-01T09:00:00Z', '2099-01-01T17:00:00Z', 30, 'pending'
);

-- Cross-workspace credential pairing must not resolve.
insert into public.workspaces (id, slug, name, timezone)
values ('e2200000-0000-4000-8000-000000000001', 'phase37-other', 'Phase37 Other', 'Europe/London');
insert into public.workspace_portal_access_codes (workspace_id, code_digest)
values (
  'e2200000-0000-4000-8000-000000000001',
  public.rpc_internal_portal_code_digest('OTHER-WS')
);

-- Issue ordinary access material while the membership is still unbound, then
-- bind the old device as the pre-recovery state.
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare code text;
begin
  code := public.rpc_issue_staff_portal_code(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001'
  );
  insert into phase37_codes values ('initial', code);
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);

update public.workspace_memberships
set user_id = 'e2000000-0000-4000-8000-000000000001',
    status = 'active',
    joined_at = now()
where id = '13000000-0000-4000-8000-000000000002';

-- A real expired credential is retained as evidence and rejected by state,
-- rather than being indistinguishable from an unknown code.
insert into public.staff_portal_recovery_codes (
  workspace_id, staff_member_id, code_digest, issued_by_membership_id,
  issued_at, expires_at, reason, previous_user_id
) values (
  '10000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000001',
  public.rpc_internal_portal_code_digest('R222-2222-2222-2222'),
  '13000000-0000-4000-8000-000000000011',
  now() - interval '2 days',
  now() - interval '1 day',
  'Expired recovery probe',
  'e2000000-0000-4000-8000-000000000001'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare result jsonb;
begin
  result := public.rpc_claim_staff_portal_recovery('HARBOUR-VIEW', 'R222-2222-2222-2222');
  if result ->> 'reason' <> 'expired' then
    raise exception 'FAIL: expired recovery returned %', result;
  end if;
  raise notice 'PASS: expired recovery code is rejected';
end $$;

-- Issue twice: the first fresh credential becomes superseded. Initial access
-- material is explicitly revoked at the same boundary.
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare first_code text; second_code text;
begin
  first_code := public.rpc_issue_staff_portal_recovery_code(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    'Old device replaced'
  );
  second_code := public.rpc_issue_staff_portal_recovery_code(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    'Replacement recovery code'
  );

  if first_code !~ '^R[2-9A-HJ-NP-Z]{3}(-[2-9A-HJ-NP-Z]{4}){3}$'
     or second_code !~ '^R[2-9A-HJ-NP-Z]{3}(-[2-9A-HJ-NP-Z]{4}){3}$' then
    raise exception 'FAIL: recovery code format invalid: %, %', first_code, second_code;
  end if;

  insert into phase37_codes values ('superseded', first_code), ('revoked', second_code);
end $$;

reset role;

do $$
begin
  perform 1
  from public.staff_portal_access_codes
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and staff_member_id = '14000000-0000-4000-8000-000000000001'
    and revoked_at is not null
    and revoked_by_membership_id = '13000000-0000-4000-8000-000000000011';
  if not found then raise exception 'FAIL: initial access material was not revoked'; end if;
  raise notice 'PASS: recovery issuance revokes initial and supersedes old recovery material';
end $$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$
declare result jsonb; code text;
begin
  select phase37_codes.code into code from phase37_codes where label = 'superseded';
  result := public.rpc_claim_staff_portal_recovery('HARBOUR-VIEW', code);
  if result ->> 'reason' <> 'superseded' then
    raise exception 'FAIL: superseded recovery returned %', result;
  end if;
end $$;

-- Explicit manager revocation is durable and auditable.
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare revoked_count integer;
begin
  revoked_count := public.rpc_revoke_staff_portal_recovery_code(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    'Request withdrawn'
  );
  if revoked_count <> 1 then raise exception 'FAIL: revoked % codes', revoked_count; end if;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$
declare result jsonb; code text;
begin
  select phase37_codes.code into code from phase37_codes where label = 'revoked';
  result := public.rpc_claim_staff_portal_recovery('HARBOUR-VIEW', code);
  if result ->> 'reason' <> 'revoked' then
    raise exception 'FAIL: revoked recovery returned %', result;
  end if;
  raise notice 'PASS: superseded and revoked recovery codes fail';
end $$;

-- Create the final recovery credential. A staff member cannot issue it for
-- themselves; only the manager/owner RPC path can.
select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.rpc_issue_staff_portal_recovery_code(
      '10000000-0000-4000-8000-000000000001',
      '14000000-0000-4000-8000-000000000001',
      'Self-service attempt'
    );
    raise exception 'FAIL: staff issued their own recovery code';
  exception when sqlstate '42501' then null;
  end;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare code text;
begin
  code := public.rpc_issue_staff_portal_recovery_code(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    'New phone'
  );
  insert into phase37_codes values ('claimed', code);
end $$;

-- The old device cannot consume its own reset credential. Recovery requires a
-- genuinely new anonymous Auth identity.
select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare result jsonb; code text;
begin
  select phase37_codes.code into code from phase37_codes where label = 'claimed';
  result := public.rpc_claim_staff_portal_recovery('HARBOUR-VIEW', code);
  if result ->> 'reason' <> 'same_identity' then
    raise exception 'FAIL: old identity recovery returned %', result;
  end if;
end $$;

-- Permanent identities cannot consume staff recovery material.
select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

do $$
declare result jsonb; code text;
begin
  select phase37_codes.code into code from phase37_codes where label = 'claimed';
  result := public.rpc_claim_staff_portal_recovery('HARBOUR-VIEW', code);
  if result ->> 'reason' <> 'anonymous_required' then
    raise exception 'FAIL: permanent identity recovery returned %', result;
  end if;
end $$;

-- Second-device claim rebinds the existing membership and staff record.
select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$
declare result jsonb; code text;
begin
  select phase37_codes.code into code from phase37_codes where label = 'claimed';
  result := public.rpc_claim_staff_portal_recovery('HARBOUR-VIEW', code);
  if (result ->> 'ok')::boolean is not true
     or (result ->> 'recovered')::boolean is not true
     or (result ->> 'staff_member_id')::uuid <> '14000000-0000-4000-8000-000000000001' then
    raise exception 'FAIL: recovery claim returned %', result;
  end if;
end $$;

reset role;

do $$
declare staff_count integer; history_count integer;
begin
  select count(*) into staff_count
  from public.staff_members
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and id = '14000000-0000-4000-8000-000000000001'
    and membership_id = '13000000-0000-4000-8000-000000000002';
  if staff_count <> 1 then raise exception 'FAIL: recovery duplicated/replaced staff row'; end if;

  perform 1 from public.workspace_memberships
  where id = '13000000-0000-4000-8000-000000000002'
    and user_id = 'e2000000-0000-4000-8000-000000000002';
  if not found then raise exception 'FAIL: membership not rebound to new identity'; end if;

  select count(*) into history_count from public.time_entries
  where staff_member_id = '14000000-0000-4000-8000-000000000001';
  if history_count < 1 then raise exception 'FAIL: time history was not preserved'; end if;
  select count(*) into history_count from public.leave_requests
  where staff_member_id = '14000000-0000-4000-8000-000000000001';
  if history_count < 1 then raise exception 'FAIL: leave history was not preserved'; end if;

  perform 1 from public.audit_events
  where action = 'staff_portal_access_recovered'
    and subject_id = '13000000-0000-4000-8000-000000000002'
    and details ->> 'previous_user_reference' is not null
    and details::text not like '%e2000000-0000-4000-8000-000000000001%';
  if not found then raise exception 'FAIL: safe recovery audit evidence missing'; end if;
  raise notice 'PASS: recovery preserves staff and domain history with safe audit evidence';
end $$;

-- Old session loses membership-backed views; new session sees the same profile.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.staff_portal_profile;
  if visible_count <> 0 then raise exception 'FAIL: old identity retained portal access'; end if;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$
declare result jsonb; code text; visible_count integer;
begin
  select count(*) into visible_count from public.staff_portal_profile
  where staff_member_id = '14000000-0000-4000-8000-000000000001';
  if visible_count <> 1 then raise exception 'FAIL: new identity cannot see staff profile'; end if;

  select phase37_codes.code into code from phase37_codes where label = 'claimed';
  result := public.rpc_claim_staff_portal_recovery('HARBOUR-VIEW', code);
  if result ->> 'reason' <> 'used' then raise exception 'FAIL: replay returned %', result; end if;

  result := public.rpc_claim_staff_portal_recovery('OTHER-WS', code);
  if result ->> 'reason' <> 'invalid' then raise exception 'FAIL: cross-workspace claim returned %', result; end if;
  raise notice 'PASS: old session, replay and cross-workspace recovery are rejected';
end $$;

-- If an operator has deliberately unlinked a membership, returning to the
-- initial-code path supersedes any recovery material tied to the former user.
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  perform public.rpc_issue_staff_portal_recovery_code(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    'Initial reissue supersession probe'
  );
end $$;

reset role;
select set_config('request.jwt.claims', '', true);
update public.workspace_memberships
set user_id = null, status = 'invited', joined_at = null
where id = '13000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  perform public.rpc_issue_staff_portal_code(
    '10000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001'
  );
end $$;

reset role;
do $$ begin
  perform 1 from public.staff_portal_recovery_codes
  where reason = 'Initial reissue supersession probe' and superseded_at is not null;
  if not found then raise exception 'FAIL: initial reissue left recovery material open'; end if;
  raise notice 'PASS: initial access reissue supersedes former recovery material';
end $$;

-- Inactive staff cannot receive new recovery material.
reset role;
select set_config('request.jwt.claims', '', true);
update public.staff_members
set employment_status = 'inactive'
where id = '14000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.rpc_issue_staff_portal_recovery_code(
      '10000000-0000-4000-8000-000000000001',
      '14000000-0000-4000-8000-000000000001',
      'Inactive staff probe'
    );
    raise exception 'FAIL: inactive staff received recovery material';
  exception when sqlstate 'P0002' then null;
  end;

  begin
    perform 1 from public.staff_portal_recovery_codes limit 1;
    raise exception 'FAIL: manager read recovery digests directly';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: inactive staff and direct credential access are rejected';
end $$;

rollback;
