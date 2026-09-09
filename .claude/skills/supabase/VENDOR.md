# Vendor provenance — `supabase`

| Field | Value |
| --- | --- |
| Upstream repository | https://github.com/supabase/agent-skills |
| Upstream path | `skills/supabase/` |
| Pinned commit | `8331f910845103c08d51f6ca1d86ebb7d1f745e3` |
| Upstream commit date | 2026-08-12 |
| Skill version | 0.1.2 (upstream `metadata.version`) |
| Sync date | 2026-09-09 |
| Licence | MIT — see `LICENSE` |
| Local modifications | **NONE.** Files are byte-identical to upstream. |

## Rules

- **Do not edit the vendored files.** Docklist-specific rules live in
  `docklist-data-boundaries` and `docklist-sql-suite`, never in vendor text.
- **Do not auto-update.** No `npx skills update` during normal product work.
  Re-syncing this skill is an explicit, owner-approved maintenance task that
  re-pins the commit and updates this file.
- Verify against upstream with:
  `curl -sfL https://raw.githubusercontent.com/supabase/agent-skills/8331f910845103c08d51f6ca1d86ebb7d1f745e3/skills/supabase/SKILL.md | diff - SKILL.md`

## Docklist execution path (overrides vendor defaults)

The upstream skill describes the Supabase **MCP server** as one option. That is
**not** Docklist's path.

- **No MCP server is configured**, and none may be added without an explicit
  owner-approved task. There is no `.mcp.json` in this repo.
- Docklist uses the **Supabase CLI against the local Docker stack**:
  `supabase/config.toml`, `supabase/migrations/`, `supabase/tests/*.sql`,
  and `scripts/sql-tests.sh`.
- **Never mutate hosted Supabase** during implementation or testing.
- Rube / Composio or any other third-party database broker is forbidden.

See `docklist-sql-suite` for the local workflow and `docklist-data-boundaries`
for the tenancy invariants this project enforces on top of upstream guidance.
