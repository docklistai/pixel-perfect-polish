# DocklistAI Skill Router

Task → skill map. Workflow, declaration, completion-report, and guardrails are defined once in `docs/ai/DOCKLIST_OPERATING_SYSTEM.md` and the snippets — do not restate them here.

Skill paths shown are `.claude/skills/...`. Codex agents resolve the same skill names under `.agents/skills/`; if missing there, fall back to `.claude/skills/` (see `CODEX.md`).

---

## Audit-only (no edits expected)

**When:** read-only investigations, doc audits, repo surveys
**Skills:**

- `docklist-agent-discipline`
- `docklist-proactive-maintenance-guard` (classify findings before recommending action)

---

## Proactive maintenance / Scoped auditing during other work

**When:** noticing nearby issues, risks, or broken behaviour during any task
**Skills:**

- `docklist-proactive-maintenance-guard`

Classify every finding into Fix Now / Scope Allows / Report / Risk Log / Forbidden before action. Fix only if small, local, low-risk, and inside approved scope.

---

## Agent guidance or workflow changes

**When:** editing AGENTS.md, CLAUDE.md, CODEX.md, the operating-system doc, snippets, or this router
**Skills:**

- `docklist-agent-discipline`

No instruction file should exceed 600 lines (doc hard max in `guardrails.md`).

---

## Any completion claim

**Skills:**

- `docklist-verification-before-completion`
- `docklist-testing-patterns`
- `docklist-lint-and-validate`

---

## Frontend page or component work

**Also check:** `docs/ai/FRONTEND_GUARDRAILS.md`
**Skills:**

- `docklist-tanstack-start`
- `docklist-frontend-dev-guidelines`
- `docklist-tailwind-design-system`
- `docklist-baseline-ui`
- `docklist-ui-visual-validator`
- `docklist-fixing-accessibility`

---

## Query / cache / mutation state

**When:** managing server state, local state overrides, API fetching
**Skills:**

- `docklist-tanstack-query`

---

## Lovable frontend review

**Skills:**

- `docklist-frontend-dev-guidelines`
- `docklist-baseline-ui`
- `docklist-fixing-accessibility`
- `docklist-differential-review`
- `docklist-vibe-code-auditor`

---

## React refactor or cleanup

**Skills:**

- `docklist-tanstack-start`
- `docklist-tanstack-query`
- `docklist-code-refactoring`
- `docklist-clean-code`
- `docklist-testing-patterns`

---

## Mock data / feature data pattern

**When:** adding or restructuring `src/features/<feature>/data/` mock arrays, types, or fixtures
**Skills:**

- `docklist-typescript-expert`
- `docklist-clean-code`

Rules in `guardrails.md` (mock data section): no inline JSX mocks, typed against feature `types.ts`, co-located under the feature.

---

## Supabase / RLS / schema work

**Skills:**

- `docklist-security-audit`
- `docklist-postgresql`
- `docklist-saas-multi-tenant`
- `docklist-supabase`

---

## Edge function / API / Cloudflare work

**Skills:**

- `docklist-cloudflare-edge`
- `docklist-security-audit`
- `docklist-api-security`
- `docklist-testing-patterns`

---

## Installability / PWA / Staff mobile access

**Skills:**

- `docklist-pwa-installability`

---

## Review / pre-commit

**Skills:**

- `docklist-codebase-audit-pre-push`
- `docklist-differential-review`
- `docklist-verification-before-completion`

---

## TypeScript / data model work

**Skills:**

- `docklist-typescript-expert`
- `docklist-lint-and-validate`

---

## Architecture decisions / ADR / product-boundary changes

**When:** proposing structural changes, choosing patterns, recording product-scope decisions (50/30/20, staff portal access, migration strategy, excluded scope)
**Skills:**

- `docklist-software-architecture`
- `docklist-architecture-decision-records`

Outcome: ADR document in `docs/adr/` + decision summary. Reference the relevant non-negotiable.

---

## Documentation

**Skills:**

- `docklist-docs-architect`

---

## Repo architecture + file-size guardrails

**Skills:**

- `docklist-software-architecture`
- `docklist-clean-code`

Compare against `docs/ai/guardrails.md`.
