# DocklistAI Skill Router

Match every task to one or more skill routes before doing any work. Read the listed skill files, then follow their instructions.

---

## Proactive maintenance / Scoped auditing

**When:** noticing nearby issues, risks, or broken behaviour during any task; implementation review; pre-commit or pre-push review
**Skills:**

- `.claude/skills/docklist-proactive-maintenance-guard/SKILL.md`
  **Required output:** Proactive Findings table (Brief issue, Domain, Bucket, Action)
  **Required checks:** findings classified into buckets (Fix Now / Scope Allows / Report / Risk Log / Forbidden) before action; fix only if small, local, low-risk, and inside approved scope

---

## Agent guidance or workflow changes

**When:** editing AGENTS.md, CLAUDE.md, or changing how agents operate
**Skills:**

- `.claude/skills/docklist-agent-discipline/SKILL.md`
- `.claude/skills/docklist-context-driven-development/SKILL.md`
- `.agents/skills/docklist-agent-discipline/SKILL.md`
  **Required output:** updated file + completion report
  **Required checks:** file loads cleanly; no instructions exceed 100 lines

---

## Any completion claim

**When:** any assertion that work is done, tests pass, or the feature is working
**Skills:**

- `.claude/skills/docklist-verification-before-completion/SKILL.md`
- `.claude/skills/docklist-testing-patterns/SKILL.md`
- `.claude/skills/docklist-lint-and-validate/SKILL.md`
  **Required output:** evidence list (commands run + output), not narrative
  **Required checks:** targeted typecheck + targeted test run; lint pass; skipped checks reported

---

## Frontend page or component work

**When:** building, editing, or reviewing React components, pages, or styles
**Also check:** `docs/skills/frontend-anti-slop/FRONTEND_SKILL_GUARDRAILS.md` for frontend/UI/UX/visual/accessibility/design-system work
**Skills:**

- `.claude/skills/docklist-frontend-dev-guidelines/SKILL.md`
- `.claude/skills/docklist-react-ui-patterns/SKILL.md`
- `.claude/skills/docklist-tailwind-design-system/SKILL.md`
- `.claude/skills/docklist-baseline-ui/SKILL.md`
- `.claude/skills/docklist-ui-visual-validator/SKILL.md`
- `.claude/skills/docklist-fixing-accessibility/SKILL.md`
  **Also add** `.claude/skills/docklist-react-component-performance/SKILL.md` when render complexity, repeated components, heavy JSX, or interaction state is involved.
  **Required output:** component diff + accessibility check + design token audit
  **Required checks:** no hardcoded colors/sizes; keyboard nav; aria labels present

---

## Lovable frontend review

**When:** reviewing AI-generated Lovable output before merging
**Skills:**

- `.claude/skills/docklist-frontend-dev-guidelines/SKILL.md`
- `.claude/skills/docklist-baseline-ui/SKILL.md`
- `.claude/skills/docklist-fixing-accessibility/SKILL.md`
- `.claude/skills/docklist-code-review-checklist/SKILL.md`
- `.claude/skills/docklist-vibe-code-auditor/SKILL.md`
  **Required output:** violation list with file/line + severity
  **Required checks:** layout anti-patterns; animation durations; typography scale; a11y

---

## React refactor or cleanup

**When:** restructuring existing React code without adding features
**Skills:**

- `.claude/skills/docklist-react-ui-patterns/SKILL.md`
- `.claude/skills/docklist-code-refactoring/SKILL.md`
- `.claude/skills/docklist-clean-code/SKILL.md`
- `.claude/skills/docklist-react-component-performance/SKILL.md`
- `.claude/skills/docklist-testing-patterns/SKILL.md`
  **Required output:** before/after diff + test results
  **Required checks:** no behaviour change; types still pass; targeted test run

---

## Supabase / RLS / schema work

**When:** writing migrations, policies, edge functions, or database queries
**Skills:**

- `.claude/skills/docklist-security-audit/SKILL.md`
- `.claude/skills/docklist-database-design/SKILL.md`
- `.claude/skills/docklist-postgresql/SKILL.md`
- `.claude/skills/docklist-saas-multi-tenant/SKILL.md`
- `.claude/skills/docklist-supabase/SKILL.md`
  **Required output:** policy diff + workspace-scope proof + RLS coverage table
  **Required checks:** no `select('*')`; every query workspace-scoped; RLS enabled on new tables

---

## Edge function / API work

**When:** writing or modifying Supabase edge functions, API routes, or server actions
**Skills:**

- `.claude/skills/docklist-security-audit/SKILL.md`
- `.claude/skills/docklist-api-security/SKILL.md`
- `.claude/skills/docklist-testing-patterns/SKILL.md`
  **Required output:** auth/input-validation audit + test coverage summary
  **Required checks:** all inputs validated; auth checked before data access; secrets not logged

---

## Review / pre-commit

**When:** before staging any commit, or when asked to review changes
**Skills:**

- `.claude/skills/docklist-codebase-audit-pre-push/SKILL.md`
- `.claude/skills/docklist-code-review-checklist/SKILL.md`
- `.claude/skills/docklist-differential-review/SKILL.md`
- `.claude/skills/docklist-verification-before-completion/SKILL.md`
  **Required output:** diff summary + finding list + pass/fail verdict
  **Required checks:** typecheck; targeted tests; no secrets or debug code committed

---

## TypeScript / data model work

**When:** writing or refactoring TypeScript types, interfaces, generics, or data models
**Skills:**

- `.claude/skills/docklist-typescript-expert/SKILL.md`
- `.claude/skills/docklist-lint-and-validate/SKILL.md`
  **Required output:** type diff + typecheck output
  **Required checks:** strict mode passes; no `any` introduced without justification

---

## Architecture decisions

**When:** proposing significant structural changes, choosing patterns, or evaluating trade-offs
**Skills:**

- `.claude/skills/docklist-software-architecture/SKILL.md`
- `.claude/skills/docklist-architecture-decision-records/SKILL.md`
  **Required output:** ADR document or updated ADR + decision summary
  **Required checks:** alternatives considered; consequences documented; stakeholder impact noted

---

## Documentation

**When:** writing or restructuring docs, READMEs, or architecture notes
**Skills:**

- `.claude/skills/docklist-docs-architect/SKILL.md`
- `.claude/skills/docklist-context-driven-development/SKILL.md`
  **Required output:** doc diff or new file + link audit
  **Required checks:** internal links valid; no procedures duplicated in code files

---

## Worktree / branch / sync work

**When:** creating worktrees, switching branches, syncing with remote, checking repo state, or integrating Lovable/GitHub changes locally
**Skills:**

- `.claude/skills/docklist-using-git-worktrees/SKILL.md`
  **Required output:** current branch + worktree status + sync plan
  **Required checks:** confirm branch; confirm expected changes are present; list files that must not be staged

---

## Large implementation / decomposition / batch refactor

**When:** planning or executing a large multi-file refactor, decomposing a complex feature, or coordinating work across many files
**Skills:**

- `.claude/skills/docklist-orchestrate-batch-refactor/SKILL.md`
- `.claude/skills/docklist-architecture-patterns/SKILL.md`
- `.claude/skills/docklist-clean-code/SKILL.md`
  **Required output:** work packet list + line-count check per target file + extraction plan for any file near or over hard max
  **Required checks:** line counts before and after; no file left over hard max; types still pass

---

## Planning that persists across turns or agents

**When:** implementing multi-step work, handing off to another agent, or planning that must survive context resets
**Skills:**

- `.claude/skills/docklist-planning-with-files/SKILL.md`
- `.claude/skills/docklist-filesystem-context/SKILL.md`
  **Required output:** task plan file written to `.claude/plans/` or `docs/ai/`
  **Required checks:** plan file exists and is readable; progress checkpoints updated

---

## Repo architecture + file-size guardrails

**When:** evaluating whether a file is too large, planning extractions, or auditing repo structure
**Skills:**

- `.claude/skills/docklist-architecture-patterns/SKILL.md`
- `.claude/skills/docklist-filesystem-context/SKILL.md`
- `.claude/skills/docklist-orchestrate-batch-refactor/SKILL.md`
  **Required output:** line-count table + files over hard max + extraction plan
  **Required checks:** compare against `docs/ai/repo-architecture-guardrails.md`; no logic added to over-limit file without extraction approval
