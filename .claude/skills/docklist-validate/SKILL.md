---
name: docklist-validate
description: Use after any Docklist code change to choose the right validation commands and produce completion evidence. Routes among targeted and full Vitest, typecheck, lint, the quality gate, client/SSR build, local SQL and concurrency suites, Ops HTTP checks, and git diff --check. Use whenever you are about to claim work is done, or need to know which checks a change actually warrants.
risk: low
source: project
date_added: "2026-09-09"
---

# Docklist Validation

Pick the smallest set of checks that actually proves the change, run them, read
the output, then claim the result. Evidence before claims — see
`docklist-verification-before-completion`.

**These are this repo's real commands, taken from `package.json`. Do not invent
others.** If you need a command that is not here, read `package.json` first.

## Command reference

| Check | Command | Notes |
| --- | --- | --- |
| Targeted tests | `npx vitest run <path>` | Fastest loop. Prefer this. |
| Targeted watch | `npx vitest <path>` | Local iteration only, never as evidence. |
| Full tests | `npm run test` | `vitest run`, 200+ files, two projects. |
| Typecheck | `npm run typecheck` | `tsc --noEmit`. |
| Lint | `npm run lint` | `eslint .` |
| Format | `npm run format` | `prettier --write .` — only when asked. |
| Quality gate | `npm run quality` | `scripts/quality-greps.sh` — static non-negotiable gate. |
| Client build | `npm run build` | `vite build`. |
| Dev build | `npm run build:dev` | `vite build --mode development`. |
| SQL suites | `npm run test:sql` | Local Supabase container only. |
| SQL concurrency | `npm run test:sql:concurrency` | Local only; locking/atomicity. |
| Ops HTTP | `npm run test:ops:http` | Local only; PostgREST refusal SQLSTATEs. |
| Whitespace | `git diff --check` | Always before staging. |
| Everything | `npm run predeploy` | **Deployment missions only** — see below. |

`npm run predeploy` chains typecheck → lint → build → quality → test →
test:ops:http. **Do not run it as a normal product-work gate.** Docklist is in
product build / refinement mode; running the deployment chain invites
readiness framing that is not ours to declare.

## Vitest project layout

`vitest.config.ts` defines two projects — target the right one:

- **node** — `src/**/*.test.ts`, `environment: "node"`. Logic, helpers, rules,
  data shaping, guards.
- **jsdom** — `src/**/*.test.tsx`, `environment: "jsdom"`,
  `setupFiles: ["./src/test/setupDom.ts"]`. Components rendered directly —
  **never routes**.

## What to run for what

**Logic / helper / rule change** → targeted `vitest run` on the affected
`*.test.ts` + `typecheck`.

**Component or UI change** → targeted `vitest run` on the affected `*.test.tsx`
+ `typecheck` + `lint`, **plus browser verification** of the real journey
(`docklist-browser-fixtures`). A passing component test is not evidence the
workflow works.

**Cross-cutting or shared change** (types, shared helpers, providers) → full
`npm run test` + `typecheck` + `lint`.

**Anything touching Supabase, RLS, policies, or migrations** → `npm run test:sql`,
plus `npm run test:sql:concurrency` when locking or atomicity is involved, plus
`npm run quality`. See `docklist-sql-suite` and `docklist-data-boundaries`.

**Anything touching Ops refusal paths** → `npm run test:ops:http`.

**Anything touching build config, Vite, or SSR entry** → `npm run build`.

**Before staging, always** → `git diff --check`.

## Rules

- Targeted first; escalate to full suites when scope or risk warrants it, not by
  reflex.
- Run the command in this run. A previous run's output is not evidence.
- Read the actual output and exit code. "Should pass" is not a result.
- **Report every skipped check and why** in the completion report.
- Never claim a defect fixed without coverage that exercises it — see
  `docklist-testing-patterns`.
- `npm audit` is **not** a normal gate here. Dependency review is an explicit
  mission.
- The SQL, concurrency and Ops HTTP suites are **local-Docker-only**. They must
  never target hosted Supabase.

## Not this repo

Do not suggest or run Ruff, Bandit, MyPy, pytest, Jest, or any Python tooling.
There is no Python in this project.
