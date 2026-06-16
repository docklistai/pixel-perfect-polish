# Master Roadmap Sign-Off Before Phase 7 Security

Repo-local record of the master roadmap sign-off audit completed before Phase 7
Security begins. Audit was read-only; this document records its outcome.

## Current HEAD

`d470c3c` — `feat: close business logic and staff portal gaps`

## Master roadmap

1. Frontend
2. Architecture
3. Business Logic
4. Database & Data Model
5. Backend
6. Authentication & Permissions
7. Security
8. Staff Portal
9. AI Layer
10. Testing & Quality
11. Infrastructure & Deployment

## Repo status

- `main` synced with `origin/main` at `d470c3c`.
- Worktree clean before this doc.
- No schema changes, no package changes, no env changes.
- Remote Supabase DB untouched (last synced + verified at Phase 6; 7 migrations on
  disk, no drift since).

## Sign-off verdicts

| Phase | Verdict |
|---|---|
| 2 Architecture | SIGNED OFF |
| 1 Frontend | SIGNED OFF WITH DEFERRALS |
| 3 Business Logic | SIGNED OFF WITH DEFERRALS |
| 4 Database & Data Model | SIGNED OFF WITH DEFERRALS |
| 5 Backend | SIGNED OFF WITH DEFERRALS |
| 6 Authentication & Permissions | SIGNED OFF WITH DEFERRALS |
| 8 Staff Portal | SIGNED OFF WITH DEFERRALS |

**Not signed off: none.**

### Audit evidence (summary)

- `select('*')` → none. `service_role` / `SUPABASE_SERVICE` → none.
- No browser-side sensitive writes: every rota/portal/leave/time mutation runs
  inside a `createServerFn` handler on a per-request session-cookie-bound server
  client, or a `SECURITY DEFINER` RPC. Portal browser client reads only, against
  `staff_portal_*` views.
- RLS enabled on all 17 tables; 6 staff-safe views use
  `security_invoker = true, security_barrier = true`.
- Consistent `source: "live" | "demo"` tagging across feature hooks; Harbour View
  demo fallback intact; deferred actions surface "Not available in live mode yet".
- Phase 2 is the only phase with no outstanding deferrals.

## Acceptable deferrals

- Live rota templates / copy previous week / generate suggestions
- Manager-created leave
- Time flagging
- Manager notification live path
- Atomic rota replace
- UI polish / oversize-file extraction
- Time rejection UI exposure

All sit outside the security trust boundary and are honestly gated in the UI.

## Phase 7 Security inputs

1. Portal-code rate limiting / brute-force protection
   (`rpc_claim_staff_portal_access` currently has no throttle/lockout).
2. Anonymous identity abuse from failed claims
   (each failed claim creates an anon Supabase user before sign-out).
3. Rota direct-write RLS pen-test
   (draft writes trust `*_manager_all` RLS + Phase-4 trigger guards, not an RPC).
4. Staff-safe view leakage tests
   (confirm `security_invoker` views cannot expose manager-only columns under a
   staff JWT).
5. SECURITY DEFINER RPC review
   (audit the full RPC surface and its internal `require_manager/_staff` guards).

## Decision

- Phases 1, 2, 3, 4, 5, 6, and 8 are signed off for current MVP scope.
- Phase 7 Security is cleared to begin.
- No new feature work should start before the Phase 7 Security audit.
