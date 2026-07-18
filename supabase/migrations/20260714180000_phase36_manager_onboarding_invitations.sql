-- Phase 36: private-pilot manager onboarding invitations.
--
-- Workspace bootstrap remains an authenticated browser RPC, but possession of
-- an authenticated session is no longer sufficient. The caller must be a
-- permanent, email-confirmed Auth identity and must hold a matching active
-- operator-issued invitation. Invitation consumption, workspace creation and
-- the initial owner membership are one transaction.

create table public.manager_onboarding_invitations (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null
    check (
      normalized_email = pg_catalog.lower(pg_catalog.btrim(normalized_email))
      and pg_catalog.length(normalized_email) between 3 and 320
      and normalized_email like '%@%'
    ),
  invited_user_id uuid,
  expires_at timestamptz not null,
  issued_by_operator text not null
    check (pg_catalog.length(pg_catalog.btrim(issued_by_operator)) between 1 and 160),
  issue_reason text not null
    check (pg_catalog.length(pg_catalog.btrim(issue_reason)) between 1 and 500),
  revoked_at timestamptz,
  revoked_by_operator text,
  revocation_reason text,
  consumed_at timestamptz,
  consumed_by_user_id uuid,
  consumed_workspace_id uuid references public.workspaces(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (revoked_at is null and revoked_by_operator is null and revocation_reason is null)
    or (
      revoked_at is not null
      and pg_catalog.length(pg_catalog.btrim(revoked_by_operator)) between 1 and 160
      and pg_catalog.length(pg_catalog.btrim(revocation_reason)) between 1 and 500
    )
  ),
  check (
    (consumed_at is null and consumed_by_user_id is null and consumed_workspace_id is null)
    or (consumed_at is not null and consumed_by_user_id is not null and consumed_workspace_id is not null)
  ),
  check (revoked_at is null or consumed_at is null)
);

create unique index manager_onboarding_invitations_active_email_uidx
  on public.manager_onboarding_invitations (normalized_email)
  include (id, invited_user_id, expires_at)
  where consumed_at is null and revoked_at is null;

create index manager_onboarding_invitations_active_user_idx
  on public.manager_onboarding_invitations (invited_user_id, expires_at)
  include (id, normalized_email)
  where invited_user_id is not null and consumed_at is null and revoked_at is null;

create index manager_onboarding_invitations_consumed_workspace_idx
  on public.manager_onboarding_invitations (consumed_workspace_id, consumed_at desc)
  where consumed_workspace_id is not null;

create trigger manager_onboarding_invitations_set_updated_at
before update on public.manager_onboarding_invitations
for each row execute function public.set_updated_at();

create trigger manager_onboarding_invitations_protect_immutable
before update on public.manager_onboarding_invitations
for each row execute function public.protect_immutable_columns(
  'id', 'normalized_email', 'invited_user_id', 'issued_by_operator',
  'issue_reason', 'created_at'
);

alter table public.manager_onboarding_invitations enable row level security;
revoke all on table public.manager_onboarding_invitations from public, anon, authenticated;

comment on table public.manager_onboarding_invitations is
  'Private-pilot manager allowlist. Definer-only storage: normalized verified email, optional exact Auth user binding, expiry/revocation and one transactional consumption. No browser role has direct access.';

comment on column public.manager_onboarding_invitations.invited_user_id is
  'Optional exact Auth user binding. Intentionally retained as an audit UUID without an auth.users foreign key, so Auth cleanup cannot silently downgrade an explicitly bound invitation to email-only matching.';

-- Operator-only issuance. There is deliberately no browser/service-role grant:
-- run this as the database owner from an approved operator session after dual
-- checking the customer email and expiry. A replacement supersedes any still
-- open invitation for the same normalized email without deleting evidence.
create or replace function public.rpc_internal_create_manager_onboarding_invitation(
  p_email text,
  p_expires_at timestamptz,
  p_operator_reference text,
  p_reason text,
  p_invited_user_id uuid default null
) returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  v_operator text := pg_catalog.btrim(coalesce(p_operator_reference, ''));
  v_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
  v_user_email text;
  v_user_is_anonymous boolean;
  v_user_confirmed_at timestamptz;
  v_invitation_id uuid;
begin
  if pg_catalog.length(v_email) not between 3 and 320 or v_email not like '%@%' then
    raise exception 'a normalized manager email is required' using errcode = '22023';
  end if;

  if p_expires_at is null
     or p_expires_at <= pg_catalog.transaction_timestamp()
     or p_expires_at > pg_catalog.transaction_timestamp() + interval '90 days' then
    raise exception 'invitation expiry must be within the next 90 days' using errcode = '22023';
  end if;

  if pg_catalog.length(v_operator) not between 1 and 160
     or pg_catalog.length(v_reason) not between 1 and 500 then
    raise exception 'operator reference and reason are required' using errcode = '22023';
  end if;

  if p_invited_user_id is not null then
    select pg_catalog.lower(pg_catalog.btrim(coalesce(auth_user.email, ''))),
           auth_user.is_anonymous,
           auth_user.email_confirmed_at
    into v_user_email, v_user_is_anonymous, v_user_confirmed_at
    from auth.users as auth_user
    where auth_user.id = p_invited_user_id;

    if not found
       or v_user_is_anonymous
       or v_user_confirmed_at is null
       or v_user_email <> v_email then
      raise exception 'explicit invited user must be a permanent confirmed identity with the same email'
        using errcode = '22023';
    end if;
  end if;

  update public.manager_onboarding_invitations
  set revoked_at = pg_catalog.transaction_timestamp(),
      revoked_by_operator = v_operator,
      revocation_reason = 'Superseded by replacement invitation'
  where normalized_email = v_email
    and consumed_at is null
    and revoked_at is null;

  insert into public.manager_onboarding_invitations (
    normalized_email,
    invited_user_id,
    expires_at,
    issued_by_operator,
    issue_reason
  ) values (
    v_email,
    p_invited_user_id,
    p_expires_at,
    v_operator,
    v_reason
  )
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

create or replace function public.rpc_internal_revoke_manager_onboarding_invitation(
  p_invitation_id uuid,
  p_operator_reference text,
  p_reason text
) returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_operator text := pg_catalog.btrim(coalesce(p_operator_reference, ''));
  v_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
  v_updated integer;
begin
  if p_invitation_id is null
     or pg_catalog.length(v_operator) not between 1 and 160
     or pg_catalog.length(v_reason) not between 1 and 500 then
    raise exception 'invitation, operator reference and reason are required'
      using errcode = '22023';
  end if;

  update public.manager_onboarding_invitations
  set revoked_at = pg_catalog.transaction_timestamp(),
      revoked_by_operator = v_operator,
      revocation_reason = v_reason
  where id = p_invitation_id
    and consumed_at is null
    and revoked_at is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.rpc_internal_create_manager_onboarding_invitation(
  text, timestamptz, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.rpc_internal_revoke_manager_onboarding_invitation(
  uuid, text, text
) from public, anon, authenticated;

comment on function public.rpc_internal_create_manager_onboarding_invitation(
  text, timestamptz, text, text, uuid
) is
  'Database-owner operator procedure for the private pilot. Creates one expiring normalized-email invitation, optionally bound to an exact confirmed permanent Auth user. Plain customer sessions have no execute grant.';

comment on function public.rpc_internal_revoke_manager_onboarding_invitation(
  uuid, text, text
) is
  'Database-owner operator procedure. Revokes one unconsumed manager invitation while retaining issuer, reason and revocation evidence.';

-- Preserve the Phase 9 signature and result shape so the existing setup UI is
-- compatible. Authorization is now invitation-backed and server-enforced.
create or replace function public.rpc_bootstrap_workspace(
  p_workspace_name text,
  p_slug text default null,
  p_timezone text default 'Europe/London',
  p_location_name text default 'Main location',
  p_department_name text default 'Front of house'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_email text;
  v_caller_is_anonymous boolean;
  v_caller_confirmed_at timestamptz;
  v_invitation_id uuid;
  v_invitation_bound_user_id uuid;
  v_workspace_name text := pg_catalog.btrim(coalesce(p_workspace_name, ''));
  v_slug_input text := pg_catalog.btrim(coalesce(p_slug, ''));
  v_slug_base text;
  v_slug text;
  v_slug_was_provided boolean := false;
  v_timezone text := coalesce(nullif(pg_catalog.btrim(coalesce(p_timezone, '')), ''), 'Europe/London');
  v_location_name text := coalesce(nullif(pg_catalog.btrim(coalesce(p_location_name, '')), ''), 'Main location');
  v_department_name text := coalesce(nullif(pg_catalog.btrim(coalesce(p_department_name, '')), ''), 'Front of house');
  v_workspace_id uuid;
  v_membership_id uuid;
  v_location_id uuid;
  v_department_id uuid;
  v_claims text;
  v_claim_sub text;
  v_consumed integer;
begin
  if v_caller is null then
    raise exception 'workspace bootstrap requires an authenticated user'
      using errcode = '42501';
  end if;

  select pg_catalog.lower(pg_catalog.btrim(coalesce(auth_user.email, ''))),
         auth_user.is_anonymous,
         auth_user.email_confirmed_at
  into v_caller_email, v_caller_is_anonymous, v_caller_confirmed_at
  from auth.users as auth_user
  where auth_user.id = v_caller
  for share;

  if not found or v_caller_is_anonymous or v_caller_confirmed_at is null
     or v_caller_email = '' then
    raise exception 'workspace setup requires a permanent manager identity with a confirmed email'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workspace_memberships as membership
    where membership.user_id = v_caller
      and membership.status = 'active'
  ) then
    raise exception 'caller already has an active workspace membership'
      using errcode = '55000';
  end if;

  select invitation.id, invitation.invited_user_id
  into v_invitation_id, v_invitation_bound_user_id
  from public.manager_onboarding_invitations as invitation
  where invitation.normalized_email = v_caller_email
    and invitation.consumed_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > pg_catalog.transaction_timestamp()
    and (invitation.invited_user_id is null or invitation.invited_user_id = v_caller)
  order by invitation.created_at desc, invitation.id
  limit 1
  for update;

  if v_invitation_id is null then
    raise exception 'an active private-pilot manager invitation is required'
      using errcode = '42501';
  end if;

  if v_workspace_name = '' or pg_catalog.length(v_workspace_name) > 120 then
    raise exception 'workspace name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if v_location_name = '' or pg_catalog.length(v_location_name) > 120 then
    raise exception 'location name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if v_department_name = '' or pg_catalog.length(v_department_name) > 120 then
    raise exception 'department name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if v_timezone = '' or pg_catalog.length(v_timezone) > 80 or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = v_timezone
  ) then
    raise exception 'timezone is not valid'
      using errcode = '22023';
  end if;

  if v_slug_input <> '' then
    v_slug_was_provided := true;
    if v_slug_input <> pg_catalog.lower(v_slug_input)
       or pg_catalog.length(v_slug_input) > 80
       or v_slug_input !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'workspace slug must be lower-case letters, numbers, and hyphens'
        using errcode = '22023';
    end if;
    v_slug := v_slug_input;
  else
    v_slug_base := pg_catalog.regexp_replace(pg_catalog.lower(v_workspace_name), '[^a-z0-9]+', '-', 'g');
    v_slug_base := pg_catalog.regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');
    if v_slug_base = '' then v_slug_base := 'workspace'; end if;
    v_slug_base := pg_catalog.substr(v_slug_base, 1, 72);
    v_slug_base := pg_catalog.regexp_replace(v_slug_base, '-+$', '', 'g');
    if v_slug_base = '' then v_slug_base := 'workspace'; end if;
    v_slug := v_slug_base;
  end if;

  if v_slug_was_provided and exists (select 1 from public.workspaces where slug = v_slug) then
    raise exception 'workspace slug already exists' using errcode = '23505';
  end if;

  while exists (select 1 from public.workspaces where slug = v_slug) loop
    v_slug := v_slug_base || '-' || pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end loop;

  insert into public.workspaces (slug, name, timezone, status)
  values (v_slug, v_workspace_name, v_timezone, 'active')
  returning id into v_workspace_id;

  -- The existing membership guard only treats a null request identity as the
  -- trusted provisioning path. Clear it only around this one initial-owner
  -- insert, restoring it on success and error.
  v_claims := pg_catalog.current_setting('request.jwt.claims', true);
  v_claim_sub := pg_catalog.current_setting('request.jwt.claim.sub', true);
  begin
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    perform pg_catalog.set_config('request.jwt.claim.sub', '', true);

    insert into public.workspace_memberships (
      workspace_id, user_id, role, status, invited_at, joined_at
    ) values (
      v_workspace_id, v_caller, 'owner', 'active',
      pg_catalog.transaction_timestamp(), pg_catalog.transaction_timestamp()
    )
    returning id into v_membership_id;

    perform pg_catalog.set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    perform pg_catalog.set_config('request.jwt.claim.sub', coalesce(v_claim_sub, ''), true);
  exception when others then
    perform pg_catalog.set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    perform pg_catalog.set_config('request.jwt.claim.sub', coalesce(v_claim_sub, ''), true);
    raise;
  end;

  insert into public.locations (workspace_id, name, timezone, status)
  values (v_workspace_id, v_location_name, v_timezone, 'active')
  returning id into v_location_id;

  insert into public.departments (workspace_id, name, status)
  values (v_workspace_id, v_department_name, 'active')
  returning id into v_department_id;

  insert into public.departments (workspace_id, name, status)
  select v_workspace_id, seed.name, 'active'
  from (values ('Front of house'), ('Kitchen'), ('Bar'), ('Management')) as seed(name)
  where pg_catalog.lower(seed.name) <> pg_catalog.lower(v_department_name)
  on conflict (workspace_id, name) do nothing;

  update public.manager_onboarding_invitations
  set consumed_at = pg_catalog.transaction_timestamp(),
      consumed_by_user_id = v_caller,
      consumed_workspace_id = v_workspace_id
  where id = v_invitation_id
    and consumed_at is null
    and revoked_at is null
    and expires_at > pg_catalog.transaction_timestamp();

  get diagnostics v_consumed = row_count;
  if v_consumed <> 1 then
    raise exception 'manager invitation is no longer available' using errcode = '55000';
  end if;

  perform public.rpc_internal_write_audit(
    v_workspace_id,
    v_membership_id,
    'workspace.bootstrap_authorized',
    'manager_onboarding_invitation',
    v_invitation_id,
    pg_catalog.jsonb_build_object(
      'invitation_id', v_invitation_id,
      'explicit_user_binding', v_invitation_bound_user_id is not null
    )
  );

  return pg_catalog.jsonb_build_object(
    'workspace_id', v_workspace_id,
    'workspace', pg_catalog.jsonb_build_object(
      'id', v_workspace_id,
      'name', v_workspace_name,
      'slug', v_slug,
      'timezone', v_timezone
    ),
    'membership', pg_catalog.jsonb_build_object(
      'id', v_membership_id,
      'role', 'owner',
      'status', 'active'
    ),
    'location', pg_catalog.jsonb_build_object(
      'id', v_location_id,
      'name', v_location_name,
      'timezone', v_timezone
    ),
    'department', pg_catalog.jsonb_build_object(
      'id', v_department_id,
      'name', v_department_name
    )
  );
end;
$$;

revoke all on function public.rpc_bootstrap_workspace(text, text, text, text, text)
  from public, anon;
grant execute on function public.rpc_bootstrap_workspace(text, text, text, text, text)
  to authenticated;

comment on function public.rpc_bootstrap_workspace(text, text, text, text, text) is
  'Private-pilot bootstrap. A confirmed permanent Auth identity consumes one matching, active operator-issued manager invitation transactionally while creating its first owner workspace, starter location and departments. Anonymous and uninvited identities are rejected.';
