# Vendor provenance — `supabase-postgres-best-practices`

| Field | Value |
| --- | --- |
| Upstream repository | https://github.com/supabase/agent-skills |
| Upstream path | `skills/supabase-postgres-best-practices/` |
| Pinned commit | `8331f910845103c08d51f6ca1d86ebb7d1f745e3` |
| Upstream commit date | 2026-08-12 |
| Sync date | 2026-09-09 |
| Licence | MIT — see `LICENSE` |
| Local modifications | **NONE.** Files are byte-identical to upstream. |

## Contents

`SKILL.md` plus `references/` — 30 Postgres rules across query performance,
connection management, security/RLS, schema design, concurrency, data access,
monitoring and advanced features. Each rule is a one-level-deep reference file,
so only the rules in play are ever loaded.

**Pure guidance. No MCP server, no credentials, no network access, no scripts.**

## Rules

- **Do not edit the vendored files.** Docklist invariants live in
  `docklist-data-boundaries`; the local test workflow lives in
  `docklist-sql-suite`.
- **Do not auto-update.** Re-syncing is an explicit, owner-approved maintenance
  task that re-pins the commit and updates this file.
- This skill replaced the retired community `docklist-postgresql` skill and
  absorbs the database half of the retired `docklist-api-security`.
