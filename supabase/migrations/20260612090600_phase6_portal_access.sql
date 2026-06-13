-- Phase 6 staff portal access codes: workspace code + personal staff code,
-- stored as SHA-256 digests only, claimed by a real Supabase-authenticated
-- identity (anonymous auth) so auth.uid(), RLS, staff-safe views, and the
-- Phase 5 RPCs all work unchanged.
--
-- Product decision (phase6-auth-audit.md addendum): this is a portal access
-- credential, not an invitation system. No email/SMS. Codes are random,
-- workspace-scoped, hashed at rest, and regenerable by managers.
--
-- A portal code is only ever a bearer credential for an *unclaimed* staff
-- membership (user_id null). Once a membership is bound to an auth identity the
-- issuer refuses to reissue a code for it, so a claimed/pre-bound identity can
-- never be silently unlinked or hijacked back into a bearer-code claim target.
-- This is stricter than (and supersedes) the original "reissue revokes the
-- previous claim" behaviour and respects the Phase 4 rule that a membership's
-- auth identity may be unlinked but never rewritten.
--
-- Verifier material lives only in dedicated, definer-only tables
-- (workspace_portal_access_codes, staff_portal_access_codes): RLS on, no
-- authenticated/anon grants, reachable solely through the RPCs below. It is
-- deliberately kept off public.workspaces, which members can SELECT and
-- managers can UPDATE directly.
--
-- Error code conventions follow Phase 5:
--   42501  not authenticated / wrong role / unrecognised codes (one message
--          for workspace-vs-staff code mismatches to prevent enumeration)
--   P0002  target row not found inside the caller's workspace
--   55000  valid request, invalid state (already claimed, expired, pre-bound)
--   22023  invalid parameter value

-- ---------------------------------------------------------------------------
-- 1. Storage
-- ---------------------------------------------------------------------------

-- Workspace (venue) portal code. One row per workspace, digest only, globally
-- unique so a claim can resolve the workspace from the code alone. Kept off
-- public.workspaces precisely because that table is member-readable and
-- manager-updatable; here there is no direct authenticated read or write path.
create table public.workspace_portal_access_codes (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  code_digest bytea not null,
  issued_by_membership_id uuid,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code_digest),
  foreign key (workspace_id, issued_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (issued_by_membership_id)
);

create index workspace_portal_access_codes_issued_by_idx
  on public.workspace_portal_access_codes (workspace_id, issued_by_membership_id);

create trigger workspace_portal_access_codes_set_updated_at
before update on public.workspace_portal_access_codes
for each row execute function public.set_updated_at();

create trigger workspace_portal_access_codes_protect_immutable
before update on public.workspace_portal_access_codes
for each row execute function public.protect_immutable_columns('workspace_id', 'created_at');

alter table public.workspace_portal_access_codes enable row level security;

revoke all on table public.workspace_portal_access_codes from public, anon, authenticated;

comment on table public.workspace_portal_access_codes is
  'One workspace portal code per workspace, SHA-256 digest only. No direct authenticated read/update path; managed exclusively by the portal-code RPCs so managers cannot overwrite the digest outside the audited issue path.';

create table public.staff_portal_access_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_member_id uuid not null,
  code_digest bytea not null,
  issued_by_membership_id uuid,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, staff_member_id),
  unique (workspace_id, code_digest),
  foreign key (workspace_id, staff_member_id)
    references public.staff_members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, issued_by_membership_id)
    references public.workspace_memberships (workspace_id, id) on delete set null (issued_by_membership_id)
);

create index staff_portal_access_codes_workspace_issued_by_idx
  on public.staff_portal_access_codes (workspace_id, issued_by_membership_id);

create trigger staff_portal_access_codes_set_updated_at
before update on public.staff_portal_access_codes
for each row execute function public.set_updated_at();

create trigger staff_portal_access_codes_protect_immutable
before update on public.staff_portal_access_codes
for each row execute function public.protect_immutable_columns('id', 'workspace_id', 'staff_member_id', 'created_at');

-- Digests never leave the database: RLS on, zero authenticated grants, and all
-- reads/writes go through the definer RPCs below.
alter table public.staff_portal_access_codes enable row level security;

revoke all on table public.staff_portal_access_codes from public, anon, authenticated;

comment on table public.staff_portal_access_codes is
  'One active portal access code per staff member, SHA-256 digest only, with an optional expiry. No direct authenticated access; managed exclusively by the portal-code RPCs.';

-- ---------------------------------------------------------------------------
-- 2. Internal helpers (no authenticated execute grant)
-- ---------------------------------------------------------------------------

-- Strips separators and uppercases so "hvk2-9rwt" and "HVK2 9RWT" match the
-- stored digest of "HVK29RWT".
create or replace function public.rpc_internal_normalize_portal_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

-- 10 characters from a 31-symbol unambiguous alphabet (~49.5 bits), up from the
-- original 8 (~39.6 bits). The modulo over gen_random_bytes carries a negligible
-- bias that is acceptable for a manager-regenerable access credential.
create or replace function public.rpc_internal_generate_portal_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', (get_byte(source.bytes, byte_index.idx) % 31) + 1, 1),
    '' order by byte_index.idx
  )
  from (select extensions.gen_random_bytes(10) as bytes) as source,
       generate_series(0, 9) as byte_index(idx);
$$;

create or replace function public.rpc_internal_portal_code_digest(p_code text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select extensions.digest(public.rpc_internal_normalize_portal_code(p_code), 'sha256');
$$;

-- ---------------------------------------------------------------------------
-- 3. rpc_issue_workspace_portal_code — manager-only, plaintext returned once
-- ---------------------------------------------------------------------------

create or replace function public.rpc_issue_workspace_portal_code(p_workspace_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  new_code text;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  new_code := public.rpc_internal_generate_portal_code();

  insert into public.workspace_portal_access_codes (
    workspace_id, code_digest, issued_by_membership_id
  )
  values (
    p_workspace_id,
    public.rpc_internal_portal_code_digest(new_code),
    caller_membership_id
  )
  on conflict (workspace_id) do update
  set code_digest = excluded.code_digest,
      issued_by_membership_id = excluded.issued_by_membership_id,
      issued_at = transaction_timestamp();

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'workspace_portal_code_issued',
    'workspace',
    p_workspace_id,
    '{}'::jsonb
  );

  return substr(new_code, 1, 5) || '-' || substr(new_code, 6, 5);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. rpc_issue_staff_portal_code — manager-only; refuses claimed memberships
-- ---------------------------------------------------------------------------

create or replace function public.rpc_issue_staff_portal_code(
  p_workspace_id uuid,
  p_staff_member_id uuid
)
returns text
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

  -- A portal code is a bearer credential, so it may only be issued for a
  -- membership that is not yet linked to an auth identity. Reissuing for a
  -- claimed or pre-bound membership is refused outright: we never null or
  -- overwrite a non-null user_id (that would orphan or hand off the existing
  -- identity). A claimed member already signs in directly and needs no code.
  if membership_user_id is not null then
    raise exception 'this staff member is already linked to an account; a portal code cannot be issued for a claimed membership'
      using errcode = '55000';
  end if;

  new_code := public.rpc_internal_generate_portal_code();

  insert into public.staff_portal_access_codes (
    workspace_id, staff_member_id, code_digest, issued_by_membership_id, expires_at
  )
  values (
    p_workspace_id,
    p_staff_member_id,
    public.rpc_internal_portal_code_digest(new_code),
    caller_membership_id,
    transaction_timestamp() + interval '14 days'
  )
  on conflict (workspace_id, staff_member_id) do update
  set code_digest = excluded.code_digest,
      issued_by_membership_id = excluded.issued_by_membership_id,
      issued_at = transaction_timestamp(),
      expires_at = excluded.expires_at,
      claimed_at = null;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'staff_portal_code_issued',
    'staff_member',
    p_staff_member_id,
    jsonb_build_object('membership_id', target_membership_id)
  );

  return substr(new_code, 1, 5) || '-' || substr(new_code, 6, 5);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. rpc_claim_staff_portal_access — binds the calling auth identity
-- ---------------------------------------------------------------------------

create or replace function public.rpc_claim_staff_portal_access(
  p_workspace_code text,
  p_staff_code text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  target_workspace_id uuid;
  code_id uuid;
  target_staff_member_id uuid;
  target_membership_id uuid;
  membership_user_id uuid;
  membership_status text;
  code_expires_at timestamptz;
begin
  if caller_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if length(public.rpc_internal_normalize_portal_code(p_workspace_code)) = 0
     or length(public.rpc_internal_normalize_portal_code(p_staff_code)) = 0 then
    raise exception 'workspace code and access code are required' using errcode = '22023';
  end if;

  select workspace.id
  into target_workspace_id
  from public.workspace_portal_access_codes as workspace_code
  join public.workspaces as workspace
    on workspace.id = workspace_code.workspace_id
  where workspace_code.code_digest = public.rpc_internal_portal_code_digest(p_workspace_code)
    and workspace.status = 'active';

  -- Same message and code for an unknown workspace code and an unknown staff
  -- code so callers cannot enumerate which half was wrong.
  if target_workspace_id is null then
    raise exception 'workspace or access code not recognised' using errcode = '42501';
  end if;

  select code.id, code.staff_member_id, code.expires_at,
         staff.membership_id, membership.user_id, membership.status
  into code_id, target_staff_member_id, code_expires_at,
       target_membership_id, membership_user_id, membership_status
  from public.staff_portal_access_codes as code
  join public.staff_members as staff
    on staff.workspace_id = code.workspace_id
   and staff.id = code.staff_member_id
  join public.workspace_memberships as membership
    on membership.workspace_id = code.workspace_id
   and membership.id = staff.membership_id
  where code.workspace_id = target_workspace_id
    and code.code_digest = public.rpc_internal_portal_code_digest(p_staff_code)
    and staff.employment_status = 'active'
    and membership.role = 'staff'
    and membership.status in ('invited', 'active')
  for update of code, membership;

  if code_id is null then
    raise exception 'workspace or access code not recognised' using errcode = '42501';
  end if;

  -- A held-but-expired code reveals nothing new to its holder, so it gets a
  -- specific, actionable message rather than the generic enumeration-safe one.
  if code_expires_at is not null and code_expires_at <= transaction_timestamp() then
    raise exception 'this access code has expired; ask your manager for a new code'
      using errcode = '55000';
  end if;

  if membership_user_id is not null and membership_user_id <> caller_user_id then
    raise exception 'this access code has already been claimed; ask your manager for a new code'
      using errcode = '55000';
  end if;

  if membership_user_id is null then
    if exists (
      select 1
      from public.workspace_memberships as existing
      where existing.workspace_id = target_workspace_id
        and existing.user_id = caller_user_id
    ) then
      raise exception 'this signed-in identity already holds a membership in this workspace'
        using errcode = '55000';
    end if;
  end if;

  if membership_user_id is null or membership_status <> 'active' then
    update public.workspace_memberships
    set user_id = caller_user_id,
        status = 'active',
        joined_at = transaction_timestamp()
    where workspace_id = target_workspace_id
      and id = target_membership_id;
  end if;

  update public.staff_portal_access_codes
  set claimed_at = coalesce(claimed_at, transaction_timestamp())
  where workspace_id = target_workspace_id
    and id = code_id;

  perform public.rpc_internal_write_audit(
    target_workspace_id,
    target_membership_id,
    'staff_portal_access_claimed',
    'workspace_membership',
    target_membership_id,
    jsonb_build_object('staff_member_id', target_staff_member_id)
  );

  return jsonb_build_object(
    'workspace_id', target_workspace_id,
    'membership_id', target_membership_id,
    'staff_member_id', target_staff_member_id,
    'role', 'staff'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------

revoke all on function public.rpc_internal_normalize_portal_code(text) from public, anon, authenticated;
revoke all on function public.rpc_internal_generate_portal_code() from public, anon, authenticated;
revoke all on function public.rpc_internal_portal_code_digest(text) from public, anon, authenticated;

revoke all on function public.rpc_issue_workspace_portal_code(uuid) from public, anon;
revoke all on function public.rpc_issue_staff_portal_code(uuid, uuid) from public, anon;
revoke all on function public.rpc_claim_staff_portal_access(text, text) from public, anon;

grant execute on function public.rpc_issue_workspace_portal_code(uuid) to authenticated;
grant execute on function public.rpc_issue_staff_portal_code(uuid, uuid) to authenticated;
grant execute on function public.rpc_claim_staff_portal_access(text, text) to authenticated;

comment on function public.rpc_claim_staff_portal_access(text, text) is
  'Staff portal claim: validates workspace + staff code digests and binds the calling auth identity to the staff membership. Anonymous-auth callers are expected; codes are never validated client-side.';

-- ---------------------------------------------------------------------------
-- 7. Credential hardness — implemented controls and accepted residual risk
-- ---------------------------------------------------------------------------
-- Implemented this phase:
--   * Codes are 10 chars over a 31-symbol alphabet (~49.5 bits), random and
--     digest-only at rest, workspace-scoped, and reachable only via the RPCs.
--   * Staff codes carry a 14-day expiry enforced at claim time.
--   * Reissue cannot retarget a claimed/pre-bound membership.
--
-- Accepted residual risk — no DB-level failed-attempt lockout yet:
--   rpc_claim_staff_portal_access participates in the caller's (PostgREST)
--   transaction and signals every bad-credential case with `raise`, which
--   rolls the whole call back. A failed-attempt counter incremented inside the
--   same function would therefore be rolled back too, so durable counting needs
--   either a non-raising error contract or an autonomous-transaction / external
--   rate limiter. That redesign is out of scope for this fix. Brute-force cost
--   is currently bounded only by code entropy (~49.5 bits per code, and the
--   attacker must also hold a valid workspace code), which is acceptable for a
--   manager-regenerable access credential. Tracked for a later phase: add an
--   edge/gateway rate limit on the claim path or a non-raising attempt ledger.
