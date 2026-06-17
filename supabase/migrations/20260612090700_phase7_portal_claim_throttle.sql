-- Phase 7 security: portal-claim brute-force protection + anonymous-user hygiene.
--
-- Closes audit finding H1 (no rate limit / lockout on the portal claim path) and
-- M1 (anonymous auth.users build-up from failed claims). See
-- docs/ai/phase-7-security-audit.md and docs/ai/phase-7-security-implementation-plan.md.
--
-- Core change: rpc_claim_staff_portal_access stops `raise`-ing on normal
-- credential/state failures and instead returns jsonb { ok, reason }. The old
-- contract rolled the whole transaction back on every bad guess, so a durable
-- failed-attempt counter written in the same call was rolled back too. Returning
-- normally lets the attempt ledger commit, making per-workspace throttling
-- bypass-proof on every path (including a direct PostgREST call by a retained
-- anonymous session). `raise` is kept only for null auth.uid() (42501) and
-- malformed input (22023) — neither is a brute-force vector and neither must
-- poison the ledger.
--
-- Throttle key is workspace_id (after the workspace code matches): the caller's
-- auth.uid() is a fresh anon user per attempt (rotatable for free) and the client
-- IP is not visible in the RPC. Workspace codes are low-secrecy, so staff-code
-- guessing within a known workspace is the real online risk.

-- ---------------------------------------------------------------------------
-- 1. portal_claim_attempts — definer-only per-workspace failed-attempt ledger
-- ---------------------------------------------------------------------------

-- One row per workspace. Written only from inside the claim RPC (security
-- definer); RLS on and every grant revoked, so no authenticated/anon caller can
-- read, reset, or pre-seed the counter to evade or weaponise the lockout.
create table public.portal_claim_attempts (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  failed_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger portal_claim_attempts_set_updated_at
before update on public.portal_claim_attempts
for each row execute function public.set_updated_at();

create trigger portal_claim_attempts_protect_immutable
before update on public.portal_claim_attempts
for each row execute function public.protect_immutable_columns('workspace_id', 'created_at');

alter table public.portal_claim_attempts enable row level security;

revoke all on table public.portal_claim_attempts from public, anon, authenticated;

comment on table public.portal_claim_attempts is
  'Per-workspace failed portal-claim ledger for brute-force lockout. Definer-only: RLS on, no authenticated/anon grants, written exclusively by rpc_claim_staff_portal_access.';

-- ---------------------------------------------------------------------------
-- 2. rpc_claim_staff_portal_access — non-raising contract + per-workspace lockout
-- ---------------------------------------------------------------------------
--
-- Result contract:
--   { ok:true, workspace_id, membership_id, staff_member_id, role:'staff' }
--   { ok:false, reason:'invalid' }       workspace or staff code not recognised
--   { ok:false, reason:'expired' }       held staff code past its expiry
--   { ok:false, reason:'claimed' }       staff code already bound to another identity
--   { ok:false, reason:'already_member' }caller already holds a membership here
--   { ok:false, reason:'locked' }        workspace temporarily locked (too many fails)
-- raise 42501  null auth.uid()
-- raise 22023  empty workspace/staff code

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
  -- Lockout policy (tunable): 10 failures inside a rolling 15-minute window
  -- lock the workspace claim path for 15 minutes.
  v_window constant interval := interval '15 minutes';
  v_max_failures constant integer := 10;
  v_lockout constant interval := interval '15 minutes';

  caller_user_id uuid := (select auth.uid());
  target_workspace_id uuid;
  code_id uuid;
  target_staff_member_id uuid;
  target_membership_id uuid;
  membership_user_id uuid;
  membership_status text;
  code_expires_at timestamptz;

  v_failed_count integer;
  v_window_started_at timestamptz;
  v_locked_until timestamptz;
  v_reason text;
begin
  -- Not a brute-force vector: a missing identity or malformed input must not
  -- touch the ledger. Keep these as hard errors.
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

  -- Invalid workspace code: no ledger key exists, so nothing is recorded or
  -- locked. This unkeyed path is covered by code entropy, GoTrue IP limits and
  -- the anonymous-user sweep below. Enumeration-safe: same 'invalid' reason as a
  -- staff-code mismatch.
  if target_workspace_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  -- Lockout gate (per workspace). Lock the row so concurrent attempts serialise.
  -- Lazily reset an elapsed window or an expired lock before evaluating.
  select attempts.failed_count, attempts.window_started_at, attempts.locked_until
  into v_failed_count, v_window_started_at, v_locked_until
  from public.portal_claim_attempts as attempts
  where attempts.workspace_id = target_workspace_id
  for update;

  if found then
    if v_locked_until is not null and v_locked_until > transaction_timestamp() then
      -- Enumeration-safe: the caller already knows the workspace code is valid,
      -- so 'locked' leaks no new information.
      return jsonb_build_object('ok', false, 'reason', 'locked');
    end if;

    if (v_locked_until is not null and v_locked_until <= transaction_timestamp())
       or v_window_started_at <= transaction_timestamp() - v_window then
      update public.portal_claim_attempts
      set failed_count = 0,
          window_started_at = transaction_timestamp(),
          locked_until = null
      where workspace_id = target_workspace_id;
    end if;
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

  -- Classify the outcome. Brute-force-relevant failures (mismatch / expired /
  -- already-claimed-by-another) set v_reason and are charged to the ledger.
  if code_id is null then
    v_reason := 'invalid';
  elsif code_expires_at is not null and code_expires_at <= transaction_timestamp() then
    v_reason := 'expired';
  elsif membership_user_id is not null and membership_user_id <> caller_user_id then
    v_reason := 'claimed';
  elsif membership_user_id is null
        and exists (
          select 1
          from public.workspace_memberships as existing
          where existing.workspace_id = target_workspace_id
            and existing.user_id = caller_user_id
        ) then
    -- Caller proved knowledge of both valid codes but already holds a membership
    -- here. Not a guess: return without charging the ledger.
    return jsonb_build_object('ok', false, 'reason', 'already_member');
  else
    v_reason := null;
  end if;

  if v_reason is not null then
    insert into public.portal_claim_attempts (workspace_id, failed_count, window_started_at)
    values (target_workspace_id, 1, transaction_timestamp())
    on conflict (workspace_id) do update
      set failed_count = public.portal_claim_attempts.failed_count + 1
    returning failed_count into v_failed_count;

    if v_failed_count >= v_max_failures then
      update public.portal_claim_attempts
      set locked_until = transaction_timestamp() + v_lockout
      where workspace_id = target_workspace_id;
    end if;

    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;

  -- Success: bind the identity (idempotent for the same caller) ...
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

  -- ... and clear the ledger so earlier noise never penalises a legitimate
  -- onboarding that ultimately succeeds.
  delete from public.portal_claim_attempts
  where workspace_id = target_workspace_id;

  perform public.rpc_internal_write_audit(
    target_workspace_id,
    target_membership_id,
    'staff_portal_access_claimed',
    'workspace_membership',
    target_membership_id,
    jsonb_build_object('staff_member_id', target_staff_member_id)
  );

  return jsonb_build_object(
    'ok', true,
    'workspace_id', target_workspace_id,
    'membership_id', target_membership_id,
    'staff_member_id', target_staff_member_id,
    'role', 'staff'
  );
end;
$$;

-- Grants are unchanged by create-or-replace, but re-assert them so this
-- migration is self-describing: anon/public revoked, authenticated execute only.
-- The throttle is bypass-proof because it lives inside the function, not because
-- of grant changes — anonymous portal users must still be able to call it.
revoke all on function public.rpc_claim_staff_portal_access(text, text) from public, anon;
grant execute on function public.rpc_claim_staff_portal_access(text, text) to authenticated;

comment on function public.rpc_claim_staff_portal_access(text, text) is
  'Staff portal claim: validates workspace + staff code digests and binds the calling auth identity to the staff membership. Returns jsonb { ok, reason }; raises only for null auth.uid() (42501) and empty codes (22023). Enforces a per-workspace failed-attempt window + lockout via the definer-only portal_claim_attempts ledger.';

-- ---------------------------------------------------------------------------
-- 3. Anonymous-user hygiene (audit M1)
-- ---------------------------------------------------------------------------
--
-- Each failed claim that creates a fresh anonymous session leaves an
-- auth.users row behind even after sign-out. This definer-only sweep deletes
-- stale anonymous users that were never linked to a workspace membership.
--
-- Safety: workspace_memberships.user_id is `on delete set null`, so deleting a
-- *linked* user would silently unlink a claimed staff member. The NOT EXISTS
-- guard guarantees only never-linked anonymous users (older than one hour) are
-- removed; claimed/linked identities and recent in-flight attempts are untouched.
create or replace function public.rpc_internal_cleanup_stale_anonymous_users()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  with removed as (
    delete from auth.users as u
    where u.is_anonymous = true
      and u.created_at < transaction_timestamp() - interval '1 hour'
      and not exists (
        select 1
        from public.workspace_memberships as membership
        where membership.user_id = u.id
      )
    returning u.id
  )
  select count(*) into deleted_count from removed;

  return deleted_count;
end;
$$;

revoke all on function public.rpc_internal_cleanup_stale_anonymous_users() from public, anon, authenticated;

comment on function public.rpc_internal_cleanup_stale_anonymous_users() is
  'Definer-only sweep: deletes anonymous auth.users older than 1 hour that were never linked to a workspace membership. Never touches claimed/linked identities. No execute grant; invoke via scheduled job or admin context only.';

-- Scheduling is intentionally NOT applied in this migration: pg_cron is not
-- guaranteed on every environment and a hard cron.schedule() call would fail the
-- local `supabase db reset`. Enable it manually where pg_cron is available, e.g.
-- in the Supabase dashboard SQL editor (optional, hourly):
--
--   select cron.schedule(
--     'cleanup-stale-anonymous-users',
--     '0 * * * *',
--     $cron$ select public.rpc_internal_cleanup_stale_anonymous_users(); $cron$
--   );
--
-- Fallback where pg_cron is absent: call the function from a scheduled Edge
-- Function using the service-role key. No app/runtime code in this repo invokes
-- it; it is an operator-run maintenance task.
