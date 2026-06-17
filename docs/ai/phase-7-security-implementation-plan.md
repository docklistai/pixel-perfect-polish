# Phase 7 Security — Implementation Plan

The chosen, smallest-safe plan to close the portal-claim brute-force /
anonymous-user abuse risk. Companion to `docs/ai/phase-7-security-audit.md`
(findings) and `docs/ai/master-roadmap-signoff-before-security.md` (scope). This
document is implementation context; actual code follows the gated workflow in
`docs/ai/DOCKLIST_OPERATING_SYSTEM.md` and requires explicit approval to begin.

## 1. Core decision

- **Direct PostgREST callers can invoke `rpc_claim_staff_portal_access` as
  anonymous authenticated users.** The RPC is `grant execute … to authenticated`,
  and an anonymous Supabase user *is* `authenticated`, so a holder of the public
  anon key can `signInAnonymously()` once and call the RPC directly, bypassing
  `claimPortalAccessFn`.
- **Frontend / server-function throttling is insufficient** — it only guards the
  wrapper, not the direct RPC path.
- **Throttling must live inside the claim RPC** so it applies on every path.
- **The RPC must use a non-raising result contract for credential/state failures.**
  The current function `raise`s on failure, which rolls back any attempt-counter
  write in the same transaction; Supabase has no usable autonomous transaction, and
  splitting into two RPC calls only protects the wrapper path. Returning normally on
  credential/state failures lets the ledger write commit, making failed-attempt
  accounting durable and bypass-proof.
- **Throttle key = `workspace_id`, after the workspace code matches.** The caller's
  `auth.uid()` is a fresh anon user per attempt (rotatable for free) and client IP
  is not available in the RPC. Per-workspace keying matches the real threat:
  workspace codes are low-secrecy, so staff-code guessing is the online risk.

## 2. Recommended implementation

- **Add `portal_claim_attempts` as a definer-only table** — one row per workspace:
  `failed_count`, `window_started_at`, `locked_until`, `updated_at`. RLS enabled;
  all grants revoked from `public`, `anon`, `authenticated`; reachable only from the
  definer RPC. `set_updated_at` trigger.
- **Add a per-workspace failed-attempt window and lockout** — e.g. 10 failures per
  15-minute window sets `locked_until = now() + 15 min`; the window resets after it
  elapses. Constants live in the function and are tunable.
- **Rewrite `rpc_claim_staff_portal_access` to return `jsonb { ok, reason }`** for
  normal failures. Order: require auth → validate input → resolve workspace code.
  - Invalid workspace code → `{ ok:false, reason:'invalid' }`, **ledger untouched**
    (no workspace key; covered by entropy + GoTrue IP limits + anon cleanup).
  - Valid workspace, locked → `{ ok:false, reason:'locked' }` (enumeration-safe: the
    caller already knows the workspace code is valid, so no new info leaks).
  - Valid workspace, staff-code mismatch / expired / already-claimed →
    **increment the windowed ledger**, return `{ ok:false, reason:… }`.
  - Success → bind identity and **clear the workspace ledger row**, return
    `{ ok:true, … }`.
- **Keep `raise` only for null `auth.uid()` and malformed input (22023).** These are
  not brute-force vectors and must not poison the ledger.
- **Clear the ledger on successful claim** so legitimate onboarding is never
  penalised by earlier noise.
- **Add an internal cleanup function for stale unlinked anonymous users** —
  definer, no grants: deletes `auth.users` where `is_anonymous = true`,
  `created_at < now() - interval '1 hour'`, and the user is **not** linked to any
  `workspace_memberships.user_id` (claimed staff are never touched). Scheduled via
  pg_cron where enabled (dashboard); Edge Function + admin API as the fallback. The
  migration must not hard-fail where pg_cron is absent.
- **Keep `public`/`anon` revoked and `authenticated` execute only.** The RPC must
  stay callable by anon portal users; the throttle is bypass-proof because it lives
  inside the function, not because of grant changes.

## 3. App changes

- **Update `src/features/auth/api/portalClaim.ts`** to interpret the
  `{ ok, reason }` jsonb result instead of relying on thrown RPC `error.code` for
  normal claim failures. Keep the anon sign-in + sign-out-on-failure logic; keep
  catching genuine transport/SQL errors for the generic message.
- **Add a locked / rate-limited message** (e.g. "Too many attempts — please wait and
  try again"). Adjust `ClaimPortalAccessResult` / `describeClaimError` in
  `src/features/auth/types.ts` as needed for the new reasons.
- **Preserve the current portal access UX.** Any change in
  `src/routes/portal_.access.tsx` is limited to small security copy.
- **No redesign.**

## 4. Tests

Add `supabase/tests/phase7_portal_claim_throttle_tests.sql` covering:

- **Ledger persistence** — a failed staff-code attempt durably increments the
  counter (commits, not rolled back).
- **Lockout** — after the threshold, the next valid-workspace attempt returns
  `{ ok:false, reason:'locked' }`.
- **Direct RPC throttling** — calling the RPC directly (no wrapper) increments and
  locks identically.
- **Success clears the ledger** — a subsequent legitimate claim works.
- **Window expiry** — the counter resets after the cooldown.
- **Invalid workspace behaviour** — an invalid workspace code does not create or lock
  a ledger row.
- **Non-raising failures** — credential/state failures return a row and do not abort
  the transaction.
- **Enumeration safety** — workspace-vs-staff mismatch remains indistinguishable.
- **Anon cleanup safety** — the sweep deletes a stale unlinked anonymous user but
  never a claimed/linked user or a recent one.

## 5. Production verification gate

Record read-only SQL checks to confirm the remote DB carries no seeded demo
credentials. **Do not execute remote checks in this task.** Run later in the
Supabase SQL editor; expected result on a clean prod DB is zero rows for 1 and 2.

```sql
-- 1. Seeded demo admin identity must NOT exist on prod
select id, email, is_anonymous
from auth.users
where email = 'alex@harbourview.co.uk'
   or id = 'ab000000-0000-4000-8000-000000000001';

-- 2. Fixed seed portal-code digests must NOT exist (same normalization as claim path)
select workspace_id
from public.workspace_portal_access_codes
where code_digest = public.rpc_internal_portal_code_digest('HARBOUR-VIEW');

select id, workspace_id, staff_member_id
from public.staff_portal_access_codes
where code_digest = public.rpc_internal_portal_code_digest('OLIVIA-2026');

-- 2b. Fallback if the helper is not callable in the editor session
select workspace_id
from public.workspace_portal_access_codes
where code_digest = extensions.digest('HARBOURVIEW', 'sha256');

-- 3. Informational only: seeded workspace slug
select id, slug, name from public.workspaces where slug = 'harbour-view';
```

Checks cover the seeded **Alex admin** (`alex@harbourview.co.uk`), the
**Docklist2026** identity (by email/id — the password value itself is not queryable),
and the fixed **HARBOUR-VIEW** / **OLIVIA-2026** portal codes. Any hit ⇒ stop and
remediate before claiming Phase 7 done.

## 6. Deferred

- **CAPTCHA / Turnstile** — the DB-side per-workspace lockout + ~49.5-bit staff codes
  + anon cleanup + GoTrue IP limits already close the brute-force risk. CAPTCHA adds
  a third-party dependency and friction on a staff access screen and is partly
  dashboard config. Tripwire: add it if monitoring shows abuse (esp. the unkeyed
  invalid-workspace path or anon-user creation rate).
- **Base-table grant tightening (audit L1)** — grants are role-undifferentiated
  (`authenticated` covers managers and staff) and manager server-fn reads depend on
  base-table SELECT; splitting needs separate DB roles or per-column policies and
  risks destabilising shipped flows. The audit confirmed no forbidden columns are
  exposed, so this is cosmetic. Move to a dedicated later pass with its own tests.
- **Edge / gateway rate limiter** — kept only as optional platform-layer
  defense-in-depth (GoTrue IP limits) for the unkeyed path; making it the primary
  control would require revoking the `authenticated` grant and routing claims through
  a service-role edge function — a heavier architecture and a new service-role
  surface, rejected for the smallest safe pass.
- **Broader product features.**

## 7. Boundaries

- Security only.
- No UI redesign (small security copy only, if required).
- No feature work.
- No payroll / BI / LMS / full HR / autonomous AI.
- No remote DB changes unless explicitly approved later.
- Preserve the Harbour View / demo fallback.
