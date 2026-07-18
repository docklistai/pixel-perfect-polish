-- Phase 36 private-pilot invitation and bootstrap authorization checks.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at, is_anonymous, created_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'invited.manager@example.test', now(), false, now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'uninvited.manager@example.test', now(), false, now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'anonymous.manager@example.test', now(), true, now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'expired.manager@example.test', now(), false, now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'revoked.manager@example.test', now(), false, now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', null, null, true, now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'unverified.manager@example.test', null, false, now());

create temporary table phase36_ids (label text primary key, id uuid not null) on commit drop;
grant select, insert on table phase36_ids to authenticated;

insert into phase36_ids
select 'invited', public.rpc_internal_create_manager_onboarding_invitation(
  '  INVITED.MANAGER@EXAMPLE.TEST  ', now() + interval '7 days',
  'phase36-test', 'Approved private pilot manager',
  'e1000000-0000-4000-8000-000000000001'
);

insert into phase36_ids
select 'anonymous', public.rpc_internal_create_manager_onboarding_invitation(
  'anonymous.manager@example.test', now() + interval '7 days',
  'phase36-test', 'Anonymous rejection probe', null
);

insert into phase36_ids
select 'revoked', public.rpc_internal_create_manager_onboarding_invitation(
  'revoked.manager@example.test', now() + interval '7 days',
  'phase36-test', 'Revocation probe', null
);

select public.rpc_internal_create_manager_onboarding_invitation(
  'unverified.manager@example.test', now() + interval '7 days',
  'phase36-test', 'Verified-email rejection probe', null
);
select public.rpc_internal_create_manager_onboarding_invitation(
  'alex@harbourview.co.uk', now() + interval '7 days',
  'phase36-test', 'Existing-manager cross-tenant probe',
  'ab000000-0000-4000-8000-000000000001'
);

select public.rpc_internal_revoke_manager_onboarding_invitation(
  (select id from phase36_ids where label = 'revoked'),
  'phase36-test',
  'Pilot access withdrawn'
);

insert into public.manager_onboarding_invitations (
  normalized_email, expires_at, issued_by_operator, issue_reason, created_at
) values (
  'expired.manager@example.test',
  now() - interval '1 day',
  'phase36-test',
  'Expired state probe',
  now() - interval '2 days'
);

-- Browser roles cannot inspect or manipulate allowlist state, nor invoke the
-- operator-only provisioning helpers directly.
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
begin
  begin
    perform 1 from public.manager_onboarding_invitations limit 1;
    raise exception 'FAIL: authenticated identity read manager invitations';
  exception when insufficient_privilege then
    raise notice 'PASS: manager invitation storage is definer-only';
  end;

  begin
    perform public.rpc_internal_create_manager_onboarding_invitation(
      'attacker@example.test', now() + interval '7 days', 'attacker', 'self invite', null
    );
    raise exception 'FAIL: authenticated identity created its own invitation';
  exception when insufficient_privilege then
    raise notice 'PASS: operator invitation helper has no browser grant';
  end;

  begin
    perform public.rpc_bootstrap_workspace('Uninvited Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: permanent uninvited identity bootstrapped a workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: permanent uninvited identity is rejected';
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
do $$ begin
  begin
    perform public.rpc_bootstrap_workspace('Unverified Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: unverified invited identity bootstrapped a workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: invited identity still requires a verified email';
  end;
end $$;

-- An authenticated anonymous identity stays eligible for staff claim, but can
-- never cross into manager provisioning even if an email invitation exists.
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.rpc_bootstrap_workspace('Anonymous Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: anonymous authenticated identity bootstrapped a workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: anonymous authenticated identity is rejected';
  end;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.rpc_bootstrap_workspace('Expired Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: expired invitation bootstrapped a workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: expired invitation is rejected';
  end;
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000005","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.rpc_bootstrap_workspace('Revoked Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: revoked invitation bootstrapped a workspace';
  exception when sqlstate '42501' then
    raise notice 'PASS: revoked invitation is rejected';
  end;
end $$;

-- Valid invitation is locked, consumed and audited in the workspace-creation
-- transaction. Replaying the same identity cannot create a second workspace.
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  result jsonb;
  created_workspace_id uuid;
  invitation_id uuid;
  workspace_count integer;
begin
  select id into invitation_id from phase36_ids where label = 'invited';
  result := public.rpc_bootstrap_workspace(
    'Invitation Bistro', null, 'Europe/London', 'Main location', 'Front of house'
  );
  created_workspace_id := (result ->> 'workspace_id')::uuid;

  if created_workspace_id is null then
    raise exception 'FAIL: valid invitation did not create a workspace: %', result;
  end if;

  reset role;
  perform 1
  from public.manager_onboarding_invitations as invitation
  where invitation.id = invitation_id
    and invitation.consumed_by_user_id = 'e1000000-0000-4000-8000-000000000001'
    and invitation.consumed_workspace_id = created_workspace_id
    and invitation.consumed_at is not null;
  if not found then raise exception 'FAIL: invitation was not consumed'; end if;

  perform 1
  from public.audit_events as audit
  where audit.workspace_id = created_workspace_id
    and audit.action = 'workspace.bootstrap_authorized'
    and audit.subject_id = invitation_id;
  if not found then raise exception 'FAIL: invitation consumption was not audited'; end if;

  set local role authenticated;
  begin
    perform public.rpc_bootstrap_workspace('Replay Workspace', null, 'Europe/London', null, null);
    raise exception 'FAIL: consumed invitation was replayed';
  exception when sqlstate '55000' then
    null;
  end;

  reset role;
  select count(*) into workspace_count
  from public.workspace_memberships
  where user_id = 'e1000000-0000-4000-8000-000000000001'
    and role = 'owner'
    and status = 'active';
  if workspace_count <> 1 then
    raise exception 'FAIL: invitation replay created % owner memberships', workspace_count;
  end if;

  raise notice 'PASS: valid invitation succeeds once and replay fails';
end $$;

-- Existing manager authorization and anonymous staff claim remain intact.
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000006","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare result jsonb;
begin
  result := public.rpc_claim_staff_portal_access('HARBOUR-VIEW', 'OLIVIA-2026');
  if (result ->> 'ok')::boolean is not true
     or (result ->> 'staff_member_id')::uuid <> '14000000-0000-4000-8000-000000000005' then
    raise exception 'FAIL: staff anonymous claim regressed: %', result;
  end if;
  raise notice 'PASS: anonymous staff portal claim remains functional';
end $$;

select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare code text;
begin
  begin
    perform public.rpc_bootstrap_workspace('Second Tenant', null, 'Europe/London', null, null);
    raise exception 'FAIL: existing manager used an invitation to create another tenant';
  exception when sqlstate '55000' then
    null;
  end;

  code := public.rpc_issue_workspace_portal_code('10000000-0000-4000-8000-000000000001');
  if code !~ '^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{5}-[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{5}$' then
    raise exception 'FAIL: existing manager RPC returned malformed code: %', code;
  end if;
  raise notice 'PASS: existing manager access remains intact without cross-tenant bootstrap';
end $$;

rollback;
