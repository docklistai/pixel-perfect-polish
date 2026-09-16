# DocklistAI Agent Entry Point

Every agent — Claude Code, Codex, others — reads this file first, then `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`.

## What to read before any task

1. `docs/ai/DOCKLIST_OPERATING_SYSTEM.md` — canonical operating rules (mode, workflow, declaration, non-negotiables, prompt-size principle).
2. `docs/ai/current-direction.md` — what Docklist is building now.
3. `docs/ai/DOCKLIST_PRODUCT_CONSTITUTION.md` — canonical product specification and boundary authority.
4. `docs/ai/skill-router.md` — task → skill map.
5. `docs/ai/guardrails.md` — file-size and worktree rules.
6. `docs/ai/snippets/` — declaration, completion report, prechecks, non-negotiables.

## Current mode

Product build / refinement. Help build and improve the product. Do not autonomously steer toward pilot, release, paid or production readiness — those are owner-initiated goals.

## Required first response

Post the skill declaration from `docs/ai/snippets/declaration.md` before any read or edit. Do not begin work until it is posted.

## Non-negotiables (stub — full list in snippets/non-negotiables.md)

- Staff see only published rota snapshots, never live drafts or manager/payroll data.
- Billing and payroll integrations remain disabled.
- Never `select('*')`; every query workspace-scoped.
- 50/30/20: scheduling / lightweight HR / limited manager-led AI. Scheduling is the centre.
- Current visible content and visual direction are canonical; Lovable is a tool, not product authority.
- The old SmartRota/Docklist repo is retired as a roadmap. Do not mine it.

If a non-negotiable is at risk, stop and flag immediately.

## Workflow

Defined in the operating-system doc. Summary: audit → product decision (when scope is unresolved) → implementation run → verification → authorised commit/push → external GitHub confirmation, then stop.

## Git identity

Use the configured repo-local identity. No AI attribution trailers unless explicitly required. Never rewrite history.

## Completion report

Every task ends with the block in `docs/ai/snippets/completion-report.md`.

## Platform-specific notes

- Claude Code: see `CLAUDE.md`.
- Codex: see `CODEX.md`.
