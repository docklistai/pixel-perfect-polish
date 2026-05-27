# DocklistAI Prompt Templates

All templates assume the agent has loaded `AGENTS.md` and `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`. Templates name only the **mission**; declaration, workflow, completion report, guardrails, and non-negotiables come from the OS doc and snippets.

Generic shape:

```text
Task: <mission>.
Route: <task type from skill-router.md>.
Stage: <audit | implementation | verification | correction | commit>.
Files: <list or "TBD by audit">.
Follow DOCKLIST_OPERATING_SYSTEM.md.
```

---

## Repo audit

```text
Task: Full repo audit.
Route: audit-only + review / pre-commit.
Stage: audit.
Files: entire repo excluding node_modules and .git.
Extra checks: 10 largest files; flag any over hard max in guardrails.md.
```

## Department audit

```text
Task: Audit the <DEPARTMENT> area.
Route: audit-only (+ matching domain route from skill-router.md).
Stage: audit.
Files: <list>.
Extra checks: line counts vs guardrails.md.
```

## Frontend review

```text
Task: Review frontend changes in <files/PR>.
Route: frontend page or component work + lovable frontend review.
Stage: audit.
Extra checks: animation durations, typography scale, hardcoded colors/sizes, aria, keyboard nav, layout anti-patterns; line counts per file.
```

## Implementation pass

```text
Task: Implement <description>.
Route: <from skill-router.md>.
Stage: implementation (pre-approved).
Files: <list>.
```

## Correction pass

```text
Task: Fix issues from prior verification: <list>.
Route: any completion claim.
Stage: correction.
Files: <list>. Targeted only — no unrelated refactor.
```

## Verification pass

```text
Task: Verify the current implementation.
Route: any completion claim.
Stage: verification.
Checks: targeted typecheck on changed files + targeted tests for affected features.
```

## Supabase / RLS review

```text
Task: Review <migration/policy/query>.
Route: supabase / RLS / schema work.
Stage: audit.
Extra checks: select('*'), workspace scope, RLS on new tables, staff-visible vs manager-visible fields.
```

## Pre-commit review

```text
Task: Review all staged changes before commit.
Route: review / pre-commit.
Stage: audit + verification.
Extra checks: secrets, debug code, typecheck on changed files, targeted tests, non-negotiables, line counts.
```

## Commit prompt

```text
Task: Commit the staged changes.
Stage: commit.
Files to stage: <list>.
Do not push unless I say so.
```

## Worktree / branch sync

```text
Task: <describe sync/branch action>.
Route: worktree / branch / sync work.
Stage: audit then implementation.
Pre-action: run snippets/worktree-precheck.md.
```

## Large refactor / batch implementation

```text
Task: <describe refactor>.
Route: large implementation / decomposition / batch refactor + planning that persists across turns.
Stage: audit then staged implementation.
Plan file: .claude/plans/<task>.md.
```

## Context transfer

```text
Task: Transfer context from <old session/branch/PR>.
Route: planning that persists across turns / context transfer.
Stage: audit.
Output: context summary in completion-report format.
```
