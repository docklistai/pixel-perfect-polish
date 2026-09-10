---
name: docklist-orchestra
description: Use when running an approved, bounded Docklist engineering task through the Orchestra multi-agent lifecycle — planner, plan reviewer, coder and independent reviewer on a disposable task branch. Routes to the canonical procedures in docs/ai/orchestra.md and carries the mandatory planning-enable sequence. Use before queueing any Orchestra task; not for deciding product scope.
risk: high
source: project
date_added: "2026-09-09"
---

# Docklist Orchestra

Thin operational adapter. **Before using Orchestra, read and follow
`docs/ai/orchestra.md`.**

That document is the canonical source for:

- role and model policy;
- fallback policy;
- runtime / source architecture;
- pre-run integrity checks;
- post-run integrity checks;
- containment;
- source to runtime refresh;
- patch provenance and re-pin procedure.

Those sections are **not** reproduced here. If this skill and
`docs/ai/orchestra.md` ever disagree, the document wins.

## When to invoke

Use for an **approved, bounded** Docklist engineering task: a single coherent
change with clear acceptance criteria and a defined test expectation, that
benefits from the plan → plan review → implementation → independent review
lifecycle.

**Product scope and product direction stay outside Orchestra.** Roadmap,
boundaries and what to build are owner + ChatGPT decisions made before a task is
queued. Orchestra executes approved work; it does not choose it.

Do not use it for exploratory audits, product reality checks, or anything whose
scope is still unresolved.

## Never

- Never run against the canonical `C:\Dev\Docklist` checkout.
- Never run task work on `main` or `master`.
- Never use `ALLOW_TASKS_ON_MASTER`.
- Never push from Orchestra.
- Never edit the Orchestra database manually.
- Never invoke Astra automatically.
- Never use `xhigh`.
- Never run `ko-sync-skills`.

## Pre-run

Complete the canonical pre-run integrity checks in `docs/ai/orchestra.md` before
starting the task. **Abort on failure.**

## Task setup

After `ko-task add`, these are **mandatory for every Docklist commit task**:

```bash
ko-task set <id> --remove-skip commit-plan
ko-task set <id> --next-step commit-plan
ko-task set <id> --status ready
```

Docklist commit tasks must explicitly enable `commit-plan`, or the planner and
plan reviewer will not run.

## Lifecycle and models

Use the approved lifecycle and model assignments defined in
`docs/ai/orchestra.md`. Do not override or silently substitute them.

## Fallback

Apply the fallback policy in `docs/ai/orchestra.md`. Any fallback must be
explicit and recorded. **Astra is never an automatic fallback.**

## Post-run

Complete the canonical post-run integrity checks in `docs/ai/orchestra.md`
before accepting task output.

## Landing

- Orchestra output stays on the disposable task branch.
- Review the diff externally.
- Hand canonical landing to `docklist-git-integrity`.
