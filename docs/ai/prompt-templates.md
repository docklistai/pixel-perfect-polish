# DocklistAI Prompt Templates

Paste these into Claude Code or Codex to start the correct workflow for each task type.

---

## Repo Audit

```
Skill Declaration (post this before any work):
  Task type:      Repo audit
  Skills apply:   docklist-agent-discipline, docklist-codebase-audit-pre-push, docklist-security-audit, docklist-verification-before-completion
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Run a full repo audit. Follow the gated workflow in docs/ai/docklist-agent-workflow.md — Stage 1 only.
Read docs/ai/skill-router.md and apply: docklist-agent-discipline, docklist-codebase-audit-pre-push, docklist-security-audit, docklist-verification-before-completion.
No edits during this stage.
Files in scope: entire repo excluding node_modules and .git.
Checks to run: file structure, dependency versions, RLS coverage, select('*') usage, hardcoded secrets.
Output: audit report with findings, risks, and proposed next steps. Wait for my approval.
```

---

## Department Audit

```
Skill Declaration (post this before any work):
  Task type:      Department audit
  Skills apply:   [match to docs/ai/skill-router.md for this area]
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Audit the [DEPARTMENT] area of the codebase. Follow Stage 1 of docs/ai/docklist-agent-workflow.md.
Read docs/ai/skill-router.md and apply relevant skills for this area.
No edits.
Files in scope: [list files or folders].
Report: findings per file, risks, skill routes recommended for any fixes.
Wait for approval before any implementation.
```

---

## Frontend Review

```
Skill Declaration (post this before any work):
  Task type:      Frontend review
  Skills apply:   docklist-frontend-dev-guidelines, docklist-baseline-ui, docklist-fixing-accessibility, docklist-code-review-checklist
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Review the frontend changes in [files/PR/commit]. Follow Stage 1 of docs/ai/docklist-agent-workflow.md — audit only.
Skills: docklist-frontend-dev-guidelines, docklist-baseline-ui, docklist-fixing-accessibility, docklist-code-review-checklist.
Apply docs/ai/frontend-architecture-guardrails.md.
No edits.
Checks:
- animation durations, typography scale, hardcoded colors/sizes, aria labels, keyboard navigation, layout anti-patterns
- line count per file against guardrails table (target / hard max)
- hard max exceeded? → flag as BLOCKER, recommend extraction targets
- extraction needed? → list what to extract and where (components, data, hooks, drawers)
Output: violation list with file, line, severity, fix recommendation, and line-count verdict per file.
```

---

## Implementation Pass

```
Skill Declaration (post this before any work):
  Task type:      Implementation
  Skills apply:   [list from docs/ai/skill-router.md for this task type]
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Implement [DESCRIPTION]. Follow Stage 3 of docs/ai/docklist-agent-workflow.md.
This is pre-approved — proceed directly to implementation.
Skills: [list from skill-router.md for this task type].
Edits allowed: yes.
Files in scope: [list].
Constraints: follow all DocklistAI non-negotiables in AGENTS.md.
After implementation, run Stage 4 verification (targeted typecheck + targeted tests). Report results.
```

---

## Correction Pass

```
Skill Declaration (post this before any work):
  Task type:      Correction
  Skills apply:   docklist-verification-before-completion, docklist-testing-patterns
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Fix the issues identified in the previous verification. Follow Stage 5 of docs/ai/docklist-agent-workflow.md.
Issues to fix: [list issues].
Edits allowed: yes, targeted only — do not refactor unrelated code.
After each fix, re-run the same checks from Stage 4 and report output.
```

---

## Verification Pass

```
Skill Declaration (post this before any work):
  Task type:      Verification
  Skills apply:   docklist-verification-before-completion, docklist-testing-patterns
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Verify the current implementation is correct. Follow Stage 4 of docs/ai/docklist-agent-workflow.md.
Skills: docklist-verification-before-completion, docklist-testing-patterns.
No edits during this stage.
Checks to run: targeted typecheck on changed files, targeted tests for affected features.
Output: exact commands run + output + pass/fail verdict. No narrative substitutes for evidence.
Report skipped checks and why.
```

---

## Supabase / RLS Review

```
Skill Declaration (post this before any work):
  Task type:      Supabase / RLS review
  Skills apply:   docklist-security-audit, docklist-database-design, docklist-postgresql, docklist-saas-multi-tenant
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Review [migration file / policy / query]. Follow Stage 1 of docs/ai/docklist-agent-workflow.md — audit only.
Skills: docklist-security-audit, docklist-database-design, docklist-postgresql, docklist-saas-multi-tenant.
No edits.
Checks: select('*') usage, workspace-scoping on every query, RLS enabled on new tables, staff-visible vs manager-visible field exposure.
Output: policy diff analysis, RLS coverage table, risk rating per finding.
Wait for approval before any fixes.
```

---

## Pre-Commit Review

```
Skill Declaration (post this before any work):
  Task type:      Pre-commit review
  Skills apply:   docklist-codebase-audit-pre-push, docklist-code-review-checklist, docklist-differential-review, docklist-verification-before-completion
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

Review all staged changes before committing. Follow Stage 1 + partial Stage 4 of docs/ai/docklist-agent-workflow.md.
Skills: docklist-codebase-audit-pre-push, docklist-code-review-checklist, docklist-differential-review, docklist-verification-before-completion.
No edits.
Checks: secrets scan, debug code, typecheck on changed files, targeted tests, DocklistAI non-negotiables.
Output: diff summary + finding list + pass/fail verdict. Report skipped checks.
```

---

## Commit Prompt

```
Skill Declaration (post this before any work):
  Task type:      Commit
  Skills apply:   docklist-verification-before-completion
  Skills read:    [confirm]
  Skills skipped: [none / name — reason]

The verification passed. Please commit the staged changes.
Stage: [list files to stage].
Commit message should describe the what and why in one line + optional body.
Do not push unless I say so.
```

---

## Transfer Blueprint

```
Skill Declaration (post this before any work):
  Task type:      Context transfer
  Skills apply:   docklist-context-driven-development, docklist-agent-discipline
  Skills read:    [confirm each]
  Skills skipped: [none / name — reason]

I need to transfer context from [old session / branch / PR] to this session.
Read docs/ai/skill-router.md to identify which skill routes were in use.
Summarise: what was implemented, what was verified, what is incomplete, what risks remain.
Do not start new implementation work until I confirm the context is correct.
Output: context summary in the completion report format from AGENTS.md.
```
