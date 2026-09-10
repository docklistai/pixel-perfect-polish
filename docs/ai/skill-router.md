# DocklistAI Skill Router

Task → skill map. A small default core plus on-demand specialists. Workflow,
declaration, completion-report and guardrails are defined once in
`docs/ai/DOCKLIST_OPERATING_SYSTEM.md` and the snippets — not restated here.

Skill paths are `.claude/skills/...` (canonical). Codex resolves the same names
under `.agents/skills/`; if missing there, fall back to `.claude/skills/`.

Skills without the `docklist-` prefix are **vendored official upstream skills**.
Each has a `VENDOR.md` recording the upstream repo, pinned commit, licence and
Docklist's execution path. Do not edit vendored files; Docklist rules live in the
overlay skills beside them.

---

## CORE DOCKLIST — most tasks

- `docklist-agent-discipline` — agent docs, instruction files, commit hygiene.
- `docklist-proactive-maintenance-guard` — classify every nearby finding before acting.
- `docklist-bounded-batch-delivery` — **default orchestration for substantial implementation batches.**
- `docklist-validate` — which checks a change actually warrants (real repo commands).
- `docklist-verification-before-completion` — required before any completion claim.

---

## PRODUCT REALITY

**When:** judging whether a workflow is usable, coherent, trustworthy or complete.

- `docklist-product-reality-audit` — **start here.** Observe the running app before reading source.
- `docklist-scheduling-integrity` — the scheduling invariants: draft/published boundary, cross-entry-point authority parity, DST and overnight semantics, real demand.

---

## FRONTEND

**Also check:** `docs/ai/FRONTEND_GUARDRAILS.md`

- `docklist-frontend-dev-guidelines` — component and page construction.
- `docklist-baseline-ui` — typography, spacing, motion, component baseline.
- `docklist-tailwind-design-system` — Tailwind v4 CSS-first tokens and theming.
- `docklist-fixing-accessibility` — ARIA, keyboard, focus, contrast.
- `docklist-ui-visual-validator` — visual and design-system verification.

---

## TANSTACK

- `docklist-tanstack-start` — routes, loaders, server functions, SSR entry.
- `docklist-tanstack-query` — server state, query keys, mutations, stale UI.

---

## DATABASE / SECURITY

- `supabase` *(vendored official)* — auth, sessions, RLS, migrations, client usage.
- `supabase-postgres-best-practices` *(vendored official)* — indexing, RLS performance, locking, schema rules.
- `docklist-data-boundaries` — Docklist tenancy and access invariants.
- `docklist-sql-suite` — the local SQL, tenancy, adversarial and concurrency workflow.

Docklist's Supabase path is the **CLI against the local Docker stack**. No MCP
server is configured, and hosted Supabase is never mutated during normal work.

---

## TESTING

- `docklist-testing-patterns` — Vitest 4, jsdom + `@testing-library/react`, factories, regression discipline.

> Automated tests prove implementation correctness. Browser workflows prove
> product behaviour. Neither substitutes for the other.

---

## BROWSER

- `playwright-cli` *(vendored official)* — browser commands and sessions.
- `docklist-browser-fixtures` — Docklist URLs, personas, viewports, required checks.

Repo-local `@playwright/cli` only (`npx --no-install playwright-cli …`). Never
install globally; no Playwright MCP.

---

## ARCHITECTURE

- `docklist-software-architecture` — module boundaries and structure.
- `docklist-architecture-decision-records` — ADRs in `docs/adr/`.
- `docklist-typescript-expert` — data models, contracts, prop and route types.
- `docklist-clean-code` — naming, size, extraction, and whether to refactor at all.

---

## HIGH-RISK REVIEW

- `docklist-differential-review` — adversarial review of a specific diff.
- `docklist-vibe-code-auditor` — rapidly generated or AI-produced code.

---

## GIT

- `docklist-git-integrity` — repo truth, exact manifest, staged diff review, commit identity, fetch-first fast-forward push, external verification handoff.

Used for staging, commit, push and remote-integrity missions **only**. It is not
a readiness or pre-release gate.

---

## OPTIONAL SPECIALISTS

- `docklist-orchestra` — running an approved bounded task through the Orchestra
  multi-agent lifecycle. Architecture, provenance and refresh live in
  `docs/ai/orchestra.md`. Orchestra executes approved work only; it never
  decides product scope and never pushes Docklist.
- `docklist-pwa-installability` — installability and staff mobile access.
- `docklist-retrospective` — owner-invoked only, for *repeated* friction.

---

## DEPLOYMENT — never a product-build default

Use **only** when deployment or runtime acceptance is explicitly part of the
mission. Never route here to "finish" ordinary product work.

- `docklist-cloudflare-edge` — edge-runtime constraints and deployment config.
- Official `cloudflare/skills` — **not installed**; an on-demand upstream specialist for an explicitly scoped Cloudflare mission.

`docs/ai/phase-11-deployment.md` and `docs/ai/private-beta-*.md` are historical
records, not a live checklist.

---

## Notes on specific task shapes

**Mock data / feature data** — `docklist-typescript-expert` + `docklist-clean-code`.
Rules in `guardrails.md`: no inline JSX mocks, typed against feature `types.ts`,
co-located under the feature.

**Lovable-generated frontend review** — `docklist-vibe-code-auditor` +
`docklist-differential-review` + the FRONTEND group. Lovable output is reviewed
like any other generated code; Lovable is not product authority.

**Agent guidance or workflow changes** — `docklist-agent-discipline`.

**Audit-only investigations** — `docklist-agent-discipline` +
`docklist-proactive-maintenance-guard`. All findings are report-only.

Routing expectations are exercised in `docs/ai/skill-routing-tests.md`.
