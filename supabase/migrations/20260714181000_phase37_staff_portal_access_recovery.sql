-- Phase 37: manager-authorised staff portal access recovery.
--
-- Recovery never creates a staff record or membership. It rotates the Auth
-- identity attached to one existing active staff membership, preserving every
-- domain foreign key and history row that points to the staff/member identity.
-- Recovery credentials are one-time, expiring, digest-only and definer-only.

alter table public.staff_portal_access_codes
  add column revoked_at timestamptz,
  add column revoked_by_membership_id uuid,
  add column revocation_reason text,
  add constraint staff_portal_access_codes_revoker_fkey
    foreign key (workspace_id, revoked_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  add constraint staff_portal_access_codes_revocation_state_check
    check (
      (revoked_at is null and revoked_by_membership_id is null and revocation_reason is null)
      or (
        revoked_at is not null
        and revoked_by_membership_id is not null
        and pg_catalog.length(pg_catalog.btrim(revocation_reason)) between 1 and 500
      )
    );

create index staff_portal_access_codes_workspace_revoker_idx
  on public.staff_portal_access_codes (workspace_id, revoked_by_membership_id)
  where revoked_by_membership_id is not null;

create table public.staff_portal_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_member_id uuid not null,
  code_digest bytea not null unique,
  issued_by_membership_id uuid not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reason text not null check (pg_catalog.length(pg_catalog.btrim(reason)) between 1 and 500),
  previous_user_id uuid not null,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  revoked_at timestamptz,
  revoked_by_membership_id uuid,
  revocation_reason text,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, issued_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, revoked_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete restrict,
  check (expires_at > issued_at),
  check (pg_catalog.num_nonnulls(claimed_at, revoked_at, superseded_at) <= 1),
  check (
    (claimed_at is null and claimed_by_user_id is null)
    or (claimed_at is not null and claimed_by_user_id is not null)
  ),
  check (
    (revoked_at is null and revoked_by_membership_id is null and revocation_reason is null)
    or (
      revoked_at is not null
      and revoked_by_membership_id is not null
      and pg_catalog.length(pg_catalog.btrim(revocation_reason)) between 1 and 500
    )
  )
);

create unique index staff_portal_recovery_codes_one_open_per_staff_uidx
  on public.staff_portal_recovery_codes (workspace_id, staff_member_id)
  include (id, expires_at)
  where claimed_at is null and revoked_at is null and superseded_at is null;

create index staff_portal_recovery_codes_workspace_issuer_idx
  on public.staff_portal_recovery_codes (workspace_id, issued_by_membership_id, issued_at desc);

create index staff_portal_recovery_codes_workspace_previous_user_idx
  on public.staff_portal_recovery_codes (workspace_id, previous_user_id, issued_at desc);

create index staff_portal_recovery_codes_workspace_revoker_idx
  on public.staff_portal_recovery_codes (workspace_id, revoked_by_membership_id)
  where revoked_by_membership_id is not null;

create trigger staff_portal_recovery_codes_set_updated_at
before update on public.staff_portal_recovery_codes
for each row execute function public.set_updated_at();

create trigger staff_portal_recovery_codes_protect_immutable
before update on public.staff_portal_recovery_codes
for each row execute function public.protect_immutable_columns(
  'id', 'workspace_id', 'staff_member_id', 'code_digest',
  'issued_by_membership_id', 'issued_at', 'expires_at', 'reason',
  'previous_user_id', 'created_at'
);

alter table public.staff_portal_recovery_codes enable row level security;
revoke all on table public.staff_portal_recovery_codes from public, anon, authenticated;

comment on table public.staff_portal_recovery_codes is
  'Definer-only staff access recovery ledger. Stores only a high-entropy code digest plus issuer, expiry, terminal state and old/new Auth identity references. A successful claim rebinds the existing membership; it never creates a duplicate staff record.';

create or replace function public.rpc_internal_generate_staff_recovery_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'R' || pg_catalog.string_agg(
    pg_catalog.substr(
      '23456789ABCDEFGHJKMNPQRSTUVWXYZ',
      (pg_catalog.get_byte(source.bytes, byte_index.idx) % 31) + 1,
      1
    ),
    '' order by byte_index.idx
  )
  from (select extensions.gen_random_bytes(15) as bytes) as source,
       pg_catalog.generate_series(0, 14) as byte_index(idx);
$$;

create or replace function public.rpc_internal_auth_user_reference(p_user_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.substr(
    pg_catalog.encode(extensions.digest(coalesce(p_user_id::text, ''), 'sha256'), 'hex'),
    1,
    16
  );
$$;

revoke all on function public.rpc_internal_generate_staff_recovery_code()
  from public, anon, authenticated;
revoke all on function public.rpc_internal_auth_user_reference(uuid)
  from public, anon, authenticated;

-- Reissue the established initial-access RPC with revocation reset included.
-- Its existing safety rule remains: this path is only for an unbound staff
-- membership; claimed memberships must use the recovery RPC below.
create or replace function public.rpc_issue_staff_portal_code(
  p_workspace_id uuid,
  p_staff_member_id uuid
) returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  target_membership_id uuid;
  membership_user_id uuid;
  membership_role text;
  membership_status text;
  new_code text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  select staff.membership_id
  into target_membership_id
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = p_staff_member_id
    and staff.employment_status = 'active';

  if not found then
    raise exception 'staff member not found in this workspace' using errcode = 'P0002';
  end if;

  if target_membership_id is null then
    raise exception 'staff member has no workspace membership to bind' using errcode = '55000';
  end if;

  select membership.user_id, membership.role, membership.status
  into membership_user_id, membership_role, membership_status
  from public.workspace_memberships as membership
  where membership.workspace_id = p_workspace_id
    and membership.id = target_membership_id
  for update;

  if membership_role <> 'staff' then
    raise exception 'portal access codes can only be issued for staff memberships'
      using errcode = '55000';
  end if;

  if membership_status not in ('invited', 'active') then
    raise exception 'membership is % and cannot receive a portal access code', membership_status
      using errcode = '55000';
  end if;

  if membership_user_id is not null then
    raise exception 'this staff member is already linked to an account; use staff access recovery instead'
      using errcode = '55000';
  end if;

  update public.staff_portal_recovery_codes
  set superseded_at = pg_catalog.transaction_timestamp()
  where workspace_id = p_workspace_id
    and staff_member_id = p_staff_member_id
    and claimed_at is null
    and revoked_at is null
    and superseded_at is null;

  new_code := public.rpc_internal_generate_portal_code();

  insert into public.staff_portal_access_codes (
    workspace_id, staff_member_id, code_digest, issued_by_membership_id, expires_at
  ) values (
    p_workspace_id,
    p_staff_member_id,
    public.rpc_internal_portal_code_digest(new_code),
    caller_membership_id,
    pg_catalog.transaction_timestamp() + interval '14 days'
  )
  on conflict (workspace_id, staff_member_id) do update
  set code_digest = excluded.code_digest,
      issued_by_membership_id = excluded.issued_by_membership_id,
      issued_at = pg_catalog.transaction_timestamp(),
      expires_at = excluded.expires_at,
      claimed_at = null,
      revoked_at = null,
      revoked_by_membership_id = null,
      revocation_reason = null;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'staff_portal_code_issued',
    'staff_member',
    p_staff_member_id,
    pg_catalog.jsonb_build_object('membership_id', target_membership_id)
  );

  return pg_catalog.substr(new_code, 1, 5) || '-' || pg_catalog.substr(new_code, 6, 5);
end;
$$;

create or replace function public.rpc_issue_staff_portal_recovery_code(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_reason text
) returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  target_membership_id uuid;
  target_employment_status text;
  membership_user_id uuid;
  membership_role text;
  membership_status text;
  normalized_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
  new_code text;
  recovery_code_id uuid;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if pg_catalog.length(normalized_reason) not between 1 and 500 then
    raise exception 'a recovery reason of at most 500 characters is required'
      using errcode = '22023';
  end if;

  select staff.membership_id, staff.employment_status
  into target_membership_id, target_employment_status
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = p_staff_member_id
  for update;

  if not found or target_employment_status <> 'active' or target_membership_id is null then
    raise exception 'active staff member not found in this workspace' using errcode = 'P0002';
  end if;

  select membership.user_id, membership.role, membership.status
  into membership_user_id, membership_role, membership_status
  from public.workspace_memberships as membership
  where membership.workspace_id = p_workspace_id
    and membership.id = target_membership_id
  for update;

  if not found or membership_role <> 'staff' or membership_status <> 'active' then
    raise exception 'active staff membership required for access recovery'
      using errcode = '55000';
  end if;

  if membership_user_id is null then
    raise exception 'staff access has not been claimed; issue an initial access code instead'
      using errcode = '55000';
  end if;

  update public.staff_portal_recovery_codes
  set superseded_at = pg_catalog.transaction_timestamp()
  where workspace_id = p_workspace_id
    and staff_member_id = p_staff_member_id
    and claimed_at is null
    and revoked_at is null
    and superseded_at is null;

  update public.staff_portal_access_codes
  set revoked_at = pg_catalog.transaction_timestamp(),
      revoked_by_membership_id = caller_membership_id,
      revocation_reason = 'Superseded by staff access recovery'
  where workspace_id = p_workspace_id
    and staff_member_id = p_staff_member_id
    and revoked_at is null;

  new_code := public.rpc_internal_generate_staff_recovery_code();

  insert into public.staff_portal_recovery_codes (
    workspace_id,
    staff_member_id,
    code_digest,
    issued_by_membership_id,
    expires_at,
    reason,
    previous_user_id
  ) values (
    p_workspace_id,
    p_staff_member_id,
    public.rpc_internal_portal_code_digest(new_code),
    caller_membership_id,
    pg_catalog.transaction_timestamp() + interval '24 hours',
    normalized_reason,
    membership_user_id
  )
  returning id into recovery_code_id;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'staff_portal_access_recovery_issued',
    'staff_member',
    p_staff_member_id,
    pg_catalog.jsonb_build_object(
      'membership_id', target_membership_id,
      'recovery_code_id', recovery_code_id,
      'previous_user_reference', public.rpc_internal_auth_user_reference(membership_user_id),
      'expires_in_hours', 24
    )
  );

  return pg_catalog.substr(new_code, 1, 4) || '-'
      || pg_catalog.substr(new_code, 5, 4) || '-'
      || pg_catalog.substr(new_code, 9, 4) || '-'
      || pg_catalog.substr(new_code, 13, 4);
end;
$$;

create or replace function public.rpc_revoke_staff_portal_recovery_code(
  p_workspace_id uuid,
  p_staff_member_id uuid,
  p_reason text
) returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  normalized_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
  revoked_count integer;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if pg_catalog.length(normalized_reason) not between 1 and 500 then
    raise exception 'a revocation reason of at most 500 characters is required'
      using errcode = '22023';
  end if;

  perform 1
  from public.staff_members as staff
  where staff.workspace_id = p_workspace_id
    and staff.id = p_staff_member_id;
  if not found then
    raise exception 'staff member not found in this workspace' using errcode = 'P0002';
  end if;

  update public.staff_portal_recovery_codes
  set revoked_at = pg_catalog.transaction_timestamp(),
      revoked_by_membership_id = caller_membership_id,
      revocation_reason = normalized_reason
  where workspace_id = p_workspace_id
    and staff_member_id = p_staff_member_id
    and claimed_at is null
    and revoked_at is null
    and superseded_at is null;

  get diagnostics revoked_count = row_count;

  if revoked_count > 0 then
    perform public.rpc_internal_write_audit(
      p_workspace_id,
      caller_membership_id,
      'staff_portal_access_recovery_revoked',
      'staff_member',
      p_staff_member_id,
      pg_catalog.jsonb_build_object('revoked_count', revoked_count)
    );
  end if;

  return revoked_count;
end;
$$;

-- Recovery claims use a separate RPC from first-time access. This keeps the
-- established staff claim state machine compatible while making the identity
-- rewrite explicit and independently testable.
create or replace function public.rpc_claim_staff_portal_recovery(
  p_workspace_code text,
  p_recovery_code text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window constant interval := interval '15 minutes';
  v_max_failures constant integer := 10;
  v_lockout constant interval := interval '15 minutes';

  caller_user_id uuid := auth.uid();
  caller_is_anonymous boolean;
  target_workspace_id uuid;
  recovery_code_id uuid;
  target_staff_member_id uuid;
  target_membership_id uuid;
  previous_user_id uuid;
  membership_user_id uuid;
  membership_role text;
  membership_status text;
  staff_employment_status text;
  code_expires_at timestamptz;
  code_claimed_at timestamptz;
  code_revoked_at timestamptz;
  code_superseded_at timestamptz;
  v_failed_count integer;
  v_window_started_at timestamptz;
  v_locked_until timestamptz;
  v_reason text;
  v_unbound integer;
  v_rebound integer;
begin
  if caller_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select auth_user.is_anonymous
  into caller_is_anonymous
  from auth.users as auth_user
  where auth_user.id = caller_user_id;

  if not found or not caller_is_anonymous then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'anonymous_required');
  end if;

  if pg_catalog.length(public.rpc_internal_normalize_portal_code(p_workspace_code)) = 0
     or pg_catalog.length(public.rpc_internal_normalize_portal_code(p_recovery_code)) = 0 then
    raise exception 'workspace code and recovery code are required' using errcode = '22023';
  end if;

  select workspace.id
  into target_workspace_id
  from public.workspace_portal_access_codes as workspace_code
  join public.workspaces as workspace on workspace.id = workspace_code.workspace_id
  where workspace_code.code_digest = public.rpc_internal_portal_code_digest(p_workspace_code)
    and workspace.status = 'active';

  if target_workspace_id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select attempts.failed_count, attempts.window_started_at, attempts.locked_until
  into v_failed_count, v_window_started_at, v_locked_until
  from public.portal_claim_attempts as attempts
  where attempts.workspace_id = target_workspace_id
  for update;

  if found then
    if v_locked_until is not null and v_locked_until > pg_catalog.transaction_timestamp() then
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'locked');
    end if;

    if (v_locked_until is not null and v_locked_until <= pg_catalog.transaction_timestamp())
       or v_window_started_at <= pg_catalog.transaction_timestamp() - v_window then
      update public.portal_claim_attempts
      set failed_count = 0,
          window_started_at = pg_catalog.transaction_timestamp(),
          locked_until = null
      where workspace_id = target_workspace_id;
    end if;
  end if;

  select recovery.id,
         recovery.staff_member_id,
         recovery.previous_user_id,
         recovery.expires_at,
         recovery.claimed_at,
         recovery.revoked_at,
         recovery.superseded_at,
         staff.membership_id,
         staff.employment_status,
         membership.user_id,
         membership.role,
         membership.status
  into recovery_code_id,
       target_staff_member_id,
       previous_user_id,
       code_expires_at,
       code_claimed_at,
       code_revoked_at,
       code_superseded_at,
       target_membership_id,
       staff_employment_status,
       membership_user_id,
       membership_role,
       membership_status
  from public.staff_portal_recovery_codes as recovery
  join public.staff_members as staff
    on staff.workspace_id = recovery.workspace_id
   and staff.id = recovery.staff_member_id
  join public.workspace_memberships as membership
    on membership.workspace_id = staff.workspace_id
   and membership.id = staff.membership_id
  where recovery.workspace_id = target_workspace_id
    and recovery.code_digest = public.rpc_internal_portal_code_digest(p_recovery_code)
  for update of recovery, membership;

  if recovery_code_id is null then
    v_reason := 'invalid';
  elsif code_claimed_at is not null then
    v_reason := 'used';
  elsif code_revoked_at is not null then
    v_reason := 'revoked';
  elsif code_superseded_at is not null then
    v_reason := 'superseded';
  elsif code_expires_at <= pg_catalog.transaction_timestamp() then
    v_reason := 'expired';
  elsif staff_employment_status <> 'active'
        or membership_role <> 'staff'
        or membership_status <> 'active' then
    v_reason := 'inactive';
  elsif caller_user_id = previous_user_id then
    v_reason := 'same_identity';
  elsif membership_user_id is distinct from previous_user_id then
    v_reason := 'superseded';
  elsif exists (
    select 1
    from public.workspace_memberships as existing
    where existing.workspace_id = target_workspace_id
      and existing.user_id = caller_user_id
      and existing.id <> target_membership_id
  ) then
    v_reason := 'already_member';
  else
    v_reason := null;
  end if;

  if v_reason is not null then
    insert into public.portal_claim_attempts (workspace_id, failed_count, window_started_at)
    values (target_workspace_id, 1, pg_catalog.transaction_timestamp())
    on conflict (workspace_id) do update
      set failed_count = public.portal_claim_attempts.failed_count + 1
    returning failed_count into v_failed_count;

    if v_failed_count >= v_max_failures then
      update public.portal_claim_attempts
      set locked_until = pg_catalog.transaction_timestamp() + v_lockout
      where workspace_id = target_workspace_id;
    end if;

    return pg_catalog.jsonb_build_object('ok', false, 'reason', v_reason);
  end if;

  -- Phase 4 intentionally forbids a direct non-null -> non-null identity
  -- rewrite. Under the locked recovery row, perform its two sanctioned state
  -- transitions (unlink, then bind) in this one transaction. A failure in the
  -- second step rolls the first back, so no unbound intermediate state commits.
  update public.workspace_memberships
  set user_id = null,
      status = 'invited',
      joined_at = null
  where workspace_id = target_workspace_id
    and id = target_membership_id
    and user_id = previous_user_id
    and role = 'staff'
    and status = 'active';

  get diagnostics v_unbound = row_count;

  update public.workspace_memberships
  set user_id = caller_user_id,
      status = 'active',
      joined_at = pg_catalog.transaction_timestamp()
  where workspace_id = target_workspace_id
    and id = target_membership_id
    and user_id is null
    and role = 'staff'
    and status = 'invited';

  get diagnostics v_rebound = row_count;

  if v_unbound <> 1 or v_rebound <> 1 then
    raise exception 'staff access changed during recovery; request a new code'
      using errcode = '55000';
  end if;

  update public.staff_portal_recovery_codes
  set claimed_at = pg_catalog.transaction_timestamp(),
      claimed_by_user_id = caller_user_id
  where workspace_id = target_workspace_id
    and id = recovery_code_id
    and claimed_at is null
    and revoked_at is null
    and superseded_at is null;

  update public.staff_portal_access_codes
  set revoked_at = coalesce(revoked_at, pg_catalog.transaction_timestamp()),
      revoked_by_membership_id = coalesce(revoked_by_membership_id, target_membership_id),
      revocation_reason = coalesce(revocation_reason, 'Superseded by completed staff access recovery')
  where workspace_id = target_workspace_id
    and staff_member_id = target_staff_member_id;

  delete from public.portal_claim_attempts where workspace_id = target_workspace_id;

  perform public.rpc_internal_write_audit(
    target_workspace_id,
    target_membership_id,
    'staff_portal_access_recovered',
    'workspace_membership',
    target_membership_id,
    pg_catalog.jsonb_build_object(
      'staff_member_id', target_staff_member_id,
      'recovery_code_id', recovery_code_id,
      'previous_user_reference', public.rpc_internal_auth_user_reference(previous_user_id)
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'workspace_id', target_workspace_id,
    'membership_id', target_membership_id,
    'staff_member_id', target_staff_member_id,
    'role', 'staff',
    'recovered', true
  );
end;
$$;

-- First-time claims now reject code rows explicitly revoked by recovery. The
-- rest of the established Phase 7 state machine and throttle remain unchanged.
create or replace function public.rpc_claim_staff_portal_access(
  p_workspace_code text,
  p_staff_code text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window constant interval := interval '15 minutes';
  v_max_failures constant integer := 10;
  v_lockout constant interval := interval '15 minutes';
  caller_user_id uuid := auth.uid();
  target_workspace_id uuid;
  code_id uuid;
  target_staff_member_id uuid;
  target_membership_id uuid;
  membership_user_id uuid;
  membership_status text;
  code_expires_at timestamptz;
  code_revoked_at timestamptz;
  v_failed_count integer;
  v_window_started_at timestamptz;
  v_locked_until timestamptz;
  v_reason text;
begin
  if caller_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if pg_catalog.length(public.rpc_internal_normalize_portal_code(p_workspace_code)) = 0
     or pg_catalog.length(public.rpc_internal_normalize_portal_code(p_staff_code)) = 0 then
    raise exception 'workspace code and access code are required' using errcode = '22023';
  end if;

  select workspace.id
  into target_workspace_id
  from public.workspace_portal_access_codes as workspace_code
  join public.workspaces as workspace on workspace.id = workspace_code.workspace_id
  where workspace_code.code_digest = public.rpc_internal_portal_code_digest(p_workspace_code)
    and workspace.status = 'active';

  if target_workspace_id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select attempts.failed_count, attempts.window_started_at, attempts.locked_until
  into v_failed_count, v_window_started_at, v_locked_until
  from public.portal_claim_attempts as attempts
  where attempts.workspace_id = target_workspace_id
  for update;

  if found then
    if v_locked_until is not null and v_locked_until > pg_catalog.transaction_timestamp() then
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'locked');
    end if;
    if (v_locked_until is not null and v_locked_until <= pg_catalog.transaction_timestamp())
       or v_window_started_at <= pg_catalog.transaction_timestamp() - v_window then
      update public.portal_claim_attempts
      set failed_count = 0,
          window_started_at = pg_catalog.transaction_timestamp(),
          locked_until = null
      where workspace_id = target_workspace_id;
    end if;
  end if;

  select code.id, code.staff_member_id, code.expires_at, code.revoked_at,
         staff.membership_id, membership.user_id, membership.status
  into code_id, target_staff_member_id, code_expires_at, code_revoked_at,
       target_membership_id, membership_user_id, membership_status
  from public.staff_portal_access_codes as code
  join public.staff_members as staff
    on staff.workspace_id = code.workspace_id and staff.id = code.staff_member_id
  join public.workspace_memberships as membership
    on membership.workspace_id = code.workspace_id and membership.id = staff.membership_id
  where code.workspace_id = target_workspace_id
    and code.code_digest = public.rpc_internal_portal_code_digest(p_staff_code)
    and staff.employment_status = 'active'
    and membership.role = 'staff'
    and membership.status in ('invited', 'active')
  for update of code, membership;

  if code_id is null then
    v_reason := 'invalid';
  elsif code_revoked_at is not null then
    v_reason := 'revoked';
  elsif code_expires_at is not null and code_expires_at <= pg_catalog.transaction_timestamp() then
    v_reason := 'expired';
  elsif membership_user_id is not null and membership_user_id <> caller_user_id then
    v_reason := 'claimed';
  elsif membership_user_id is null and exists (
    select 1 from public.workspace_memberships as existing
    where existing.workspace_id = target_workspace_id and existing.user_id = caller_user_id
  ) then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'already_member');
  else
    v_reason := null;
  end if;

  if v_reason is not null then
    insert into public.portal_claim_attempts (workspace_id, failed_count, window_started_at)
    values (target_workspace_id, 1, pg_catalog.transaction_timestamp())
    on conflict (workspace_id) do update
      set failed_count = public.portal_claim_attempts.failed_count + 1
    returning failed_count into v_failed_count;

    if v_failed_count >= v_max_failures then
      update public.portal_claim_attempts
      set locked_until = pg_catalog.transaction_timestamp() + v_lockout
      where workspace_id = target_workspace_id;
    end if;

    return pg_catalog.jsonb_build_object('ok', false, 'reason', v_reason);
  end if;

  if membership_user_id is null or membership_status <> 'active' then
    update public.workspace_memberships
    set user_id = caller_user_id,
        status = 'active',
        joined_at = pg_catalog.transaction_timestamp()
    where workspace_id = target_workspace_id and id = target_membership_id;
  end if;

  update public.staff_portal_access_codes
  set claimed_at = coalesce(claimed_at, pg_catalog.transaction_timestamp())
  where workspace_id = target_workspace_id and id = code_id;

  delete from public.portal_claim_attempts where workspace_id = target_workspace_id;

  perform public.rpc_internal_write_audit(
    target_workspace_id,
    target_membership_id,
    'staff_portal_access_claimed',
    'workspace_membership',
    target_membership_id,
    pg_catalog.jsonb_build_object('staff_member_id', target_staff_member_id)
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'workspace_id', target_workspace_id,
    'membership_id', target_membership_id,
    'staff_member_id', target_staff_member_id,
    'role', 'staff'
  );
end;
$$;

revoke all on function public.rpc_issue_staff_portal_code(uuid, uuid) from public, anon;
revoke all on function public.rpc_issue_staff_portal_recovery_code(uuid, uuid, text) from public, anon;
revoke all on function public.rpc_revoke_staff_portal_recovery_code(uuid, uuid, text) from public, anon;
revoke all on function public.rpc_claim_staff_portal_recovery(text, text) from public, anon;
revoke all on function public.rpc_claim_staff_portal_access(text, text) from public, anon;

grant execute on function public.rpc_issue_staff_portal_code(uuid, uuid) to authenticated;
grant execute on function public.rpc_issue_staff_portal_recovery_code(uuid, uuid, text) to authenticated;
grant execute on function public.rpc_revoke_staff_portal_recovery_code(uuid, uuid, text) to authenticated;
grant execute on function public.rpc_claim_staff_portal_recovery(text, text) to authenticated;
grant execute on function public.rpc_claim_staff_portal_access(text, text) to authenticated;

comment on function public.rpc_issue_staff_portal_recovery_code(uuid, uuid, text) is
  'Manager/owner only. Supersedes any open recovery material, revokes initial access material, and returns one 24-hour digest-backed recovery code for an existing active claimed staff membership. The old device remains bound until the code is claimed.';

comment on function public.rpc_revoke_staff_portal_recovery_code(uuid, uuid, text) is
  'Manager/owner only. Revokes currently open recovery material for one workspace-owned staff member and records an audit event. Returns the number of codes revoked.';

comment on function public.rpc_claim_staff_portal_recovery(text, text) is
  'Anonymous authenticated staff only. Atomically consumes one active recovery code and compare-and-swaps the existing staff membership from its previous Auth identity to the caller. Returns safe jsonb state reasons; preserves the staff record and all domain history.';

comment on function public.rpc_claim_staff_portal_access(text, text) is
  'First-time staff portal claim with the Phase 7 per-workspace throttle. Binds an unclaimed staff membership to the caller, but rejects any initial access material explicitly revoked by a manager-issued recovery.';
