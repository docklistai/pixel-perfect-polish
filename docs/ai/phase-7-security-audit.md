# Phase 7 Security — Audit Handoff

Implementation context only. This document records the read-only Phase 7 Security
audit and tells the implementation pass what must be fixed and what is already
safe. It does not authorise code, schema, or remote-DB changes — those follow the
gated workflow in `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`.

## 1. Baseline

- HEAD before audit: `8cec590` (`docs: record roadmap signoff before security`).
- Phase 3 + Phase 8 closure commit: `d470c3c`.
- Worktree was clean before and after the audit.
- Remote Supabase DB untouched since Phase 6 (7 migrations synced; no drift).
- Phases 1–6 + 8 signed off for current MVP scope; Phase 2 carries no deferrals.
- Audit was static review only. The SQL suites in `supabase/tests/` were assessed
  by inspection, not executed (no live DB in scope for a read-only audit).

## 2. Security posture summary

Overall posture is strong and coherent; weaknesses are concentrated exactly where
the roadmap predicted (portal claim / anonymous identity).

- No service-role key anywhere in app or source. Only the public
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` reach the client.
- No `select('*')` in `src`.
- No browser-side sensitive writes. Every rota/leave/time/portal mutation runs in
  a `createServerFn` handler on a per-request, session-cookie-bound server client,
  or a `SECURITY DEFINER` RPC.
- RLS enabled on all 17 tenant tables; every policy resolves identity through
  `auth.uid()` and is workspace-scoped.
- Browser staff-portal reads hit `staff_portal_*` views only
  (`security_invoker = true, security_barrier = true`), never base tables.
- All `SECURITY DEFINER` functions set `search_path = ''` and fully schema-qualify
  (`public.`, `extensions.`, `auth.uid()`).
- `rpc_internal_*` helpers carry zero execute grants and are reachable only from
  inside the definer RPCs. Public RPCs are granted to `authenticated` only and
  revoked from `public`/`anon`.

## 3. High-risk finding (top Phase 7 priority)

**H1 — Portal claim path has no rate limiting or lockout.**

- `rpc_claim_staff_portal_access` is `grant execute ... to authenticated`. An
  anonymous Supabase user *is* `authenticated`, so any holder of the public anon
  key can `signInAnonymously()` once and then call the RPC directly via PostgREST,
  bypassing `claimPortalAccessFn` entirely and retrying guesses with no DB-side
  throttle, counter, or lockout (acknowledged in the Phase 6 migration's section 7).
- Per-guess cost is high: a guess needs a valid workspace code (~49.5 bits) and a
  valid staff code (~49.5 bits). But workspace codes are low-secrecy in practice
  (shared per venue, posted on a wall), so the effective online barrier reduces to
  the ~49.5-bit staff code, and online guessing is unbounded by request rate.
- A durable counter inside the current `raise`-on-failure RPC would roll back with
  the failing transaction, so the fix needs an edge/gateway rate limiter or a
  non-raising attempt ledger.
- Partial incidental mitigation: GoTrue IP-rate-limits `signInAnonymously`, so the
  front-door flow is throttled — but that is a side effect, not a designed control
  on the claim path, and a retained anon session can call the RPC repeatedly
  without re-authenticating.

This is the highest-priority Phase 7 implementation item.

## 4. Medium findings

- **M1 — Anonymous-user buildup from failed claims.** `claimPortalAccessFn` creates
  an anon `auth.users` row on every attempt with no existing session; `signOut()`
  on failure clears the session but leaves the user row permanently. Scripted
  failures (or direct RPC hammering per H1) pollute `auth.users` unboundedly. No
  cleanup job, captcha, or attempt ledger today.
- **M2 — Production seed verification gate.** `supabase/seed.sql` inserts a
  fixed-UUID manager (`alex@harbourview.co.uk`) with a repo-committed bcrypt
  password (`Docklist2026`) plus deterministic portal codes
  (`HARBOUR-VIEW` / `OLIVIA-2026`). It is commented local-only and `db push`
  applies migrations not seed, so it should not be on the remote — but this is a
  verification gate, not a confirmed-clean state. Before Phase 7 close, confirm the
  production DB contains no seeded auth user, no `crypt('Docklist2026')` identity,
  and none of the fixed seed portal-code digests. Seeded local credentials must
  remain strictly local-only.

## 5. Low findings / observations

- **L1 — Staff-safe views are not the only path to own data.** `authenticated`
  holds base-table `SELECT` on `staff_members`, `time_entries`, `clock_events`,
  `leave_requests`; staff RLS restricts them to *own rows*, but the base tables
  expose a few columns the views omit (e.g. `time_entries.approved_by_membership_id`,
  `leave_requests.decided_by_membership_id`, `scheduled_*`). None are forbidden
  fields (manager notes / payroll / performance / private staff fields do not exist
  in the schema), so no non-negotiable is violated — the "views are the boundary"
  guarantee is just weaker than the comments imply.
- **L2 — Lost anon session can lock a claimed staff member out.** After claim, a
  lost anon session blocks re-claim ("already claimed"), and managers cannot
  reissue for a claimed membership. Usability/product, not security — but it may
  later pressure a weakening of the reissue guard; track it.
- **L3 — Open manager signup.** `AuthForm` allows `supabase.auth.signUp`; a
  self-signed-up user lands in `no-workspace` with no tenant access (no
  workspace-creation RPC wired), so no data exposure — but it is another unbounded
  `auth.users` growth vector.
- **L4 — Demo credentials are dev-only.** Rendered only under
  `import.meta.env.DEV` and stripped from prod builds; should remain clearly
  non-production (ties to M2).

## 6. Confirmed-safe areas

- **Server/client boundary** — service-role key absent; per-request cookie-bound
  server client; browser uses anon key for view reads and `auth` calls only.
- **Workspace-scoped RLS** — cross-workspace and cross-role access blocked; live
  read workspace authority comes from the session, never a client-supplied id.
- **Staff-safe views** — `security_invoker` + `security_barrier`, own-record
  `WHERE`, safe columns only.
- **RPC guard functions and grants** — `require_membership/manager/staff` re-derive
  role from `auth.uid()`; internal helpers ungranted; public RPCs `authenticated`-only.
- **Rota direct-write path** — `shifts` / `rota_weeks` writes are protected by
  `*_manager_all` RLS plus Phase-4 trigger guards and double workspace scoping; a
  staff JWT cannot pass the `with check`. No vulnerability.
- **No unauthenticated access** — all grants revoked from `anon`; policies are
  `to authenticated`.
- **Secrets/config** — only `.env.example` (placeholders) is tracked; `.env.local`
  is git-ignored and untracked.

## 7. Phase 7 implementation inputs (recommended sequence)

1. **Production seed verification gate.** Confirm no seeded demo admin/password and
   no fixed portal-code digests exist on the remote DB before any hardening claims.
2. **Decide the claim-throttling control surface.** Edge/gateway rate limiter vs.
   non-raising in-DB attempt ledger vs. captcha — the choice spans DB + edge config,
   so decide before writing code.
3. **Add portal claim throttling / lockout (H1).** IP/workspace-scoped rate limit
   and backoff/lockout per workspace code on the claim path.
4. **Add anonymous-user hygiene strategy (M1).** Scheduled sweep of unclaimed
   anonymous users; consider validating the workspace code before anon sign-in so a
   wholly-invalid attempt never creates a user.
5. **Consider CAPTCHA / Turnstile** for `/portal/access` and the open manager signup
   (H1/M1/L3).
6. **Optionally tighten grants (L1)** so staff rely strictly on views, only if it
   does not disrupt manager server-fn reads.

## 8. Explicit implementation boundaries

- Security only.
- No new product features.
- No payroll, BI, LMS, full HR, or autonomous AI.
- No UI redesign.
- No broad refactor.
- No remote DB changes unless explicitly approved later.
- Preserve the Harbour View / demo fallback.
