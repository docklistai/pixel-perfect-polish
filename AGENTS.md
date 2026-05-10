# DocklistAI Agent Rulebook

Read this file before any task. Consult `docs/ai/skill-router.md` before choosing an approach.

## Gated Workflow

Work advances in stages. Never skip a gate without explicit user approval.

1. **Audit** — read only, no edits. Identify scope, risks, and which skills apply.
2. **User review** — present findings. Wait for approval before proceeding.
3. **Implementation** — only after explicit prompt. Follow skill constraints.
4. **Verification** — run targeted checks. Report evidence, not assumptions.
5. **Correction** — fix issues found in verification. Targeted, not sweeping.
6. **Commit prompt** — stage and commit only when the user explicitly asks.
7. **Final sign-off** — deliver the required completion report. See below.

## Skill Declaration (required before any work)

Before any audit, implementation, review, verification, or commit task, identify the skill route and declare it as the first response. Do not proceed with edits or analysis until declared.

```
Task type:      <detected task type>
Skills apply:   <skill names from docs/ai/skill-router.md>
Skills read:    <yes / no per skill>
Skills skipped: <name — reason, or "none">
```

- Codex agents: skills in `.agents/skills/`.
- Claude Code agents: skills in `.claude/skills/`.
- Match task type to route using `docs/ai/skill-router.md`.

## DocklistAI Non-Negotiables

**Access control:**

- Staff must only see published/committed rota data (snapshots). Never live drafts.
- Managers and owners manage live draft data.
- Staff must never see: manager notes, payroll settings, internal review notes, performance data, private staff fields.

**Billing / integrations:**

- Billing remains disabled until the product is ready.
- Payroll integrations remain disabled.
- Payroll-ready exports are allowed.

**Database:**

- Never use `select('*')`. Always use explicit field selects.
- Every workspace query must be workspace-scoped.
- Do not blindly port complexity from the old repo.

**Architecture:**

- Lovable owns the new frontend design direction unless told otherwise.
- Prefer clean V2 rebuilds over copying old bloat.

## Repo-wide architecture limits

Before any implementation, read `docs/ai/repo-architecture-guardrails.md`.

1. Identify all files likely to be touched.
2. Check current line counts.
3. If any file is already over the hard max, stop and propose extraction — do not add more logic to it.
4. Prefer extraction before growth across all file types (routes, components, hooks, services, edge functions).

Before any worktree-sensitive task (branch switch, sync, Lovable merge), report: current branch, whether this is a worktree, `git status --short`, and which files must not be staged.

## Frontend architecture limits

Before frontend work, also apply `docs/ai/frontend-architecture-guardrails.md`.

Route/page files have a hard max of 350 lines unless explicitly approved. If a change would exceed the hard max, stop and propose extraction before continuing.

Do not create bloated route files, duplicated UI primitives, or route-specific design system patterns.

## Execution Rules

- Do not move from audit to implementation without user approval.
- Do not commit without an explicit commit instruction.
- Do not claim completion without evidence.
- Use targeted tests and typecheck first. Do not run full test suites unless necessary.
- Always report skipped checks.

## Required Completion Report

Every task must end with:

```
Files changed:       <list>
Why each changed:    <reason>
Tests/checks run:    <what ran>
Typecheck/build:     <pass | fail | skipped>
Risks:               <any>
Skipped checks:      <what and why>
Git status:          <output of git status --short>
```
