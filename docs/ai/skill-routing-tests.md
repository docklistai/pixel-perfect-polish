# Skill Routing Tests

A small static matrix proving `docs/ai/skill-router.md` routes representative
missions to the right skills — and, just as importantly, **not** to the wrong
ones.

This is a documentation-level check, not an agent-evaluation platform. Run it
with `bash scripts/check-skill-routing.sh` after changing the router or the skill
set.

## Expected routing

| # | Mission | Must route to | Must NOT route to |
| --- | --- | --- | --- |
| A | "Fix an RLS policy" | `supabase`, `supabase-postgres-best-practices`, `docklist-data-boundaries`, `docklist-sql-suite` | deployment, readiness |
| B | "The Rota shows the wrong department after import" | `docklist-product-reality-audit`, `docklist-scheduling-integrity`, `docklist-testing-patterns`, `docklist-browser-fixtures` | deployment, readiness |
| C | "Build this TanStack page" | `docklist-tanstack-start`, `docklist-frontend-dev-guidelines` | Supabase skills (unless data access is genuinely required) |
| D | "Run a browser workflow" | `playwright-cli`, `docklist-browser-fixtures` | Playwright MCP, global install |
| E | "Commit and push this verified batch" | `docklist-git-integrity` | deployment, readiness, pre-release audit |
| F | "Deploy Docklist to Cloudflare" | `docklist-cloudflare-edge` + explicit deployment specialists | normal product-build core |
| G | "Review why the agent keeps making the same mistake" | `docklist-retrospective` | readiness scoring, transcript export |

## Invariants

Normal product tasks must **never** route to:

- deployment or release tooling;
- pilot / production readiness framing;
- broad security pentest workflows;
- the retired SmartRota/Docklist repository.

Deployment-oriented skills live in their own router section and activate only
when the owner scopes a deployment, production-acceptance, release, hosted
migration or launch-readiness mission.

## How the check works

`scripts/check-skill-routing.sh` asserts that:

1. every skill named in the router exists in `.claude/skills/`;
2. every skill in `.claude/skills/` is named in the router;
3. each mission's required skills appear in the router;
4. the router keeps deployment skills in a section marked as non-default;
5. no retired skill name (`docklist-playwright`, `docklist-supabase`,
   `docklist-postgresql`, `docklist-api-security`, `docklist-security-audit`,
   `docklist-saas-multi-tenant`, `docklist-code-refactoring`,
   `docklist-docs-architect`, `docklist-lint-and-validate`) survives anywhere in
   the canonical docs or skills.
