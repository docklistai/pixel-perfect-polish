# DocklistAI Skill Router

Task → skill map, grouped by how often it applies. Workflow, declaration, completion-report, and guardrails are defined once in `docs/ai/DOCKLIST_OPERATING_SYSTEM.md` and the snippets — do not restate them here.

Skill paths shown are `.claude/skills/...`. Codex agents resolve the same skill names under `.agents/skills/`; if missing there, fall back to `.claude/skills/` (see `CODEX.md`).

---

## CORE — apply on most tasks

- `docklist-agent-discipline` — agent docs, instruction files, commit hygiene.
- `docklist-proactive-maintenance-guard` — classify every nearby finding before acting on it.
- `docklist-bounded-batch-delivery` — **default orchestration for substantial implementation batches.**
- `docklist-testing-patterns` — test structure, factories, regression coverage.
- `docklist-verification-before-completion` — required before any completion claim.
- `docklist-lint-and-validate` — choosing the right targeted checks.

---

## PRODUCT REALITY — is the workflow actually good?

**When:** judging whether a workflow is usable, coherent, trustworthy or complete; auditing a feature the owner has used and disliked; first-run and empty-state review.

- `docklist-product-reality-audit` — **start here.** Observe the running app before reading source.
- `docklist-playwright` — scripted browser automation and repeatable journeys.
- `docklist-ui-visual-validator` — visual and design-system verification.
- `docklist-fixing-accessibility` — when the journey involves forms, dialogs, or keyboard/screen-reader use.

---

## FRONTEND

**Also check:** `docs/ai/FRONTEND_GUARDRAILS.md`

- `docklist-tanstack-start` — routing and framework conventions.
- `docklist-tanstack-query` — server state, caching, mutations, stale UI.
- `docklist-frontend-dev-guidelines` — component and page construction.
- `docklist-baseline-ui` — typography, spacing, motion, component baseline.
- `docklist-tailwind-design-system` — tokens, variants, responsive patterns.
- `docklist-clean-code` — route/component extraction and file-size discipline.

---

## BACKEND / DATABASE

- `docklist-supabase` — queries, schema, storage, edge functions.
- `docklist-postgresql` — schema design, indexing, constraints.
- `docklist-saas-multi-tenant` — workspace scoping and RLS isolation.
- `docklist-api-security` — auth, validation, rate limiting, API surface.
- `docklist-cloudflare-edge` — edge runtime constraints.

---

## HIGH-RISK REVIEW

**When:** the change touches auth, RLS, staff/manager data boundaries, or is about to be pushed.

- `docklist-differential-review` — security-focused review of a diff.
- `docklist-security-audit` — deeper security workflow.
- `docklist-codebase-audit-pre-push` — line-by-line pre-push sweep. Heavy; use when the mission calls for it.

---

## ARCHITECTURE

**When:** proposing structural changes, choosing patterns, recording product-scope decisions.

- `docklist-software-architecture`
- `docklist-architecture-decision-records`

Outcome: ADR document in `docs/adr/` + decision summary. Reference the relevant non-negotiable.

---

## OPTIONAL SPECIALISTS

Pull in only when the task is clearly theirs.

- `docklist-typescript-expert` — typed data models, service contracts, route data shapes.
- `docklist-code-refactoring` — structured refactors.
- `docklist-vibe-code-auditor` — auditing rapidly generated or AI-produced code.
- `docklist-docs-architect` — long-form technical documentation.
- `docklist-pwa-installability` — installability and staff mobile access.

---

## DEPLOYMENT-ORIENTED — not a normal product-build default

Use **only** when deployment or runtime acceptance is explicitly part of the mission. Never route here to "finish" ordinary product work.

- `docklist-codebase-audit-pre-push` (production-readiness mode)

`docs/ai/phase-11-deployment.md` and `docs/ai/private-beta-*.md` are historical records, not a live checklist.

---

## Notes on specific task shapes

**Mock data / feature data pattern** — `docklist-typescript-expert` + `docklist-clean-code`. Rules in `guardrails.md`: no inline JSX mocks, typed against feature `types.ts`, co-located under the feature.

**Lovable-generated frontend review** — `docklist-vibe-code-auditor` + `docklist-differential-review` + the FRONTEND group. Lovable output is reviewed like any other generated code; Lovable is not product authority.

**Agent guidance or workflow changes** — `docklist-agent-discipline`. No instruction file should exceed 600 lines (doc hard max in `guardrails.md`).

**Audit-only investigations** — `docklist-agent-discipline` + `docklist-proactive-maintenance-guard`. All findings are report-only.
