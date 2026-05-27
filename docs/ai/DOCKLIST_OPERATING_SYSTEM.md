# DocklistAI Operating System

The single source of truth for how every agent (Claude Code, Codex, others) works in this repo. Prompts should carry **mission-specific context only** — universal rules live here and in the linked files.

## What every agent reads first

1. This file.
2. `docs/ai/skill-router.md` — task → skill map.
3. `docs/ai/guardrails.md` — file-size and worktree rules.
4. `docs/ai/snippets/` — declaration, completion report, prechecks, non-negotiables.

`AGENTS.md`, `CLAUDE.md`, and `CODEX.md` are thin entry points; their job is to send the agent here.

## Prompt-size principle

User prompts should describe the *mission*, not restate the rules. Boilerplate (skill declaration, workflow, completion format, non-negotiables, line-count rules) is carried by this doc. A safe minimum prompt is:

```text
Task: <one-line mission>.
Route: <task type from skill-router.md>.
Stage: <audit | implementation | verification | commit>.
Files: <list or "TBD by audit">.
Follow DOCKLIST_OPERATING_SYSTEM.md.
```

## Product boundaries

- Scheduling is the core product. HR is lightweight. AI is limited and supporting.
- 50/30/20 split (scheduling / HR / AI). See `docs/adr/0001`.
- No generic AI SaaS UI. No feature bloat. No backend/product-scope drift. No broad refactors unless clearly necessary.
- Lovable owns frontend design direction unless told otherwise.
- Scope expansion into forbidden areas requires an ADR and product-boundary update first. A user prompt alone is not enough.

## Non-negotiables

See `docs/ai/snippets/non-negotiables.md`. Violations stop the task. Summary: staff see only snapshots; billing/payroll integrations remain disabled; no `select('*')`; every query workspace-scoped.

## Gated workflow

Work advances through stages. Never skip a gate without explicit user approval.

1. **Skill declaration** — first response, before any read or edit. Format in `docs/ai/snippets/declaration.md`.
2. **Audit** — read-only. Identify scope, risks, skills. Use `docklist-proactive-maintenance-guard` to classify nearby findings.
3. **User review** — wait for explicit approval.
4. **Implementation** — only after approval. Apply skills selected in the declaration. Run the line-count precheck (`docs/ai/snippets/line-count-precheck.md`) before each edit. Stop and report if scope creeps.
5. **Verification** — targeted typecheck + targeted tests. Evidence, not narrative. Report skipped checks.
6. **Correction** — targeted fixes only. Re-run the same checks.
7. **Commit prompt** — stage only when the user explicitly asks. Never `git push` unless instructed.
8. **Final sign-off** — deliver the completion report (`docs/ai/snippets/completion-report.md`).

## Execution rules

- Audit → implementation requires explicit user approval.
- No commit without an explicit commit instruction.
- No completion claim without evidence.
- Targeted tests/typecheck first; full suites only when necessary.
- Always report skipped checks.
- If a non-negotiable would be violated, stop and flag immediately.
- **Staging:** never use `git add -A` or `git add .`. Stage only the explicit paths approved for this task. Unrelated dirty files (other features, screenshots, generated artefacts) must remain unstaged.

## Proactive maintenance limits

Use `docklist-proactive-maintenance-guard` to classify any nearby issue into: Fix Now / Scope Allows / Report / Risk Log / Forbidden. Do not silently expand scope. Frontend-only scope must not touch Supabase/RLS, auth, billing, payroll, AI/operator logic, integrations, dependencies, CI, or generated files without explicit approval.

## Skill discovery by platform

- **Claude Code** — skills in `.claude/skills/`. This is the canonical source of truth.
- **Codex** — skills in `.agents/skills/`, which is a mirror of `.claude/skills/`. If a skill referenced by `skill-router.md` is missing there, fall back to the canonical copy in `.claude/skills/`.
- After editing any skill, run `scripts/check-skill-parity.sh`. Run `scripts/sync-skills.sh` only when intentionally mirroring `.claude/skills/` into `.agents/skills/`.

## Required artifacts per task

- Skill declaration (first response).
- Audit report (Stage 2) or verification evidence (Stage 5).
- Completion report (Stage 8).
- Line-count and worktree prechecks when applicable.
