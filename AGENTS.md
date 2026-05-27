# DocklistAI Agent Entry Point

Every agent — Claude Code, Codex, others — reads this file first, then `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`.

## What to read before any task

1. `docs/ai/DOCKLIST_OPERATING_SYSTEM.md` — canonical operating rules (workflow, declaration, non-negotiables, prompt-size principle).
2. `docs/ai/skill-router.md` — task → skill map.
3. `docs/ai/guardrails.md` — file-size and worktree rules.
4. `docs/ai/snippets/` — declaration, completion report, prechecks, non-negotiables.

## Required first response

Post the skill declaration from `docs/ai/snippets/declaration.md` before any read or edit. Do not begin work until it is posted.

## Non-negotiables (stub — full list in snippets/non-negotiables.md)

- Staff see only published rota snapshots, never live drafts or manager/payroll data.
- Billing and payroll integrations remain disabled.
- Never `select('*')`; every query workspace-scoped.
- Lovable owns frontend direction; no scope creep across departments.

If a non-negotiable is at risk, stop and flag immediately.

## Workflow gates

Defined in the operating-system doc. Summary: declaration → audit → user review → implementation → verification → correction → commit → sign-off. Never skip a gate without explicit approval.

## Completion report

Every task ends with the block in `docs/ai/snippets/completion-report.md`.

## Platform-specific notes

- Claude Code: see `CLAUDE.md`.
- Codex: see `CODEX.md`.
