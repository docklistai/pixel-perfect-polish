---
name: docklist-data-boundaries
description: Use when writing or reviewing any Docklist data access — Supabase queries, RLS policies, views, RPCs, server functions, staff portal reads, or manager writes. Encodes Docklist's tenancy and access invariants that no generic Postgres or Supabase guidance can know. Load alongside the official supabase and supabase-postgres-best-practices skills, which cover the general technique.
risk: high
source: project
date_added: "2026-09-09"
---

# Docklist Data Boundaries

Thin project overlay. **General Postgres and Supabase technique lives upstream** —
use `supabase-postgres-best-practices` for indexing, RLS performance, locking and
schema rules, and `supabase` for auth, sessions, migrations and client usage.

This file carries only the invariants specific to Docklist. Violating one is a
**blocker**, not a code-style opinion.

## The invariants

**Tenancy**

1. Every manager/workspace query is **workspace-scoped**. No query may rely on
   the caller "probably" being in the right workspace.
2. **Cross-workspace read or write is blocker-class.** If a query could return
   or modify another workspace's row, stop and report — do not patch around it.
3. RLS is **mandatory** on every exposed table and view. A new exposed relation
   without a policy is incomplete work.
4. Use `security_invoker` views where the view should respect the caller's RLS
   rather than the definer's.

**Selection**

5. **Never `select('*')`.** Always name explicit columns. This is enforced
   statically by `npm run quality`.
6. Select only fields the caller is permitted to see — narrowing at render time
   is not access control.

**Staff vs manager**

7. Staff see **published rota snapshots**, never live manager drafts.
8. Staff never see manager notes, payroll settings, internal review notes,
   performance data, or private staff fields.
9. A portal user sees **their own permitted data only**.

**Write authority**

10. Manager writes are **server-authoritative** wherever the current
    architecture requires it. Do not move an authority decision into the browser.
11. **No `service_role` key in browser-reachable code, ever.** Also enforced by
    `npm run quality`.

**Verification**

12. Schema or RLS changes require **explicit tenancy tests** — workspace
    isolation, role/persona, and adversarial cases. See `docklist-sql-suite`.
13. **Do not mutate hosted Supabase** during normal implementation or testing.
    Local Docker only.

## Review questions

Ask these of any data-access diff:

- Which workspace does this row belong to, and where is that enforced?
- Could a staff user reach this? Should they?
- Is this draft data or published data?
- Are the selected columns explicit and minimal?
- If RLS were the only defence, would this still be safe?
- Does a test prove the isolation, or only the happy path?

## Boundaries

- This is not a general security course. For adversarial review of a specific
  diff use `docklist-differential-review`.
- Do not add auth, billing, payroll, or integration surface here — those are
  forbidden scope (`docs/ai/snippets/non-negotiables.md`).
- No MCP server, no third-party database broker (Rube/Composio or otherwise),
  no hosted SQL console as a working path.
