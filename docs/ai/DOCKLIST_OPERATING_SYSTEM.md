# DocklistAI Operating System

The single source of truth for how every agent (Claude Code, Codex, others) works in this repo. Prompts should carry **mission-specific context only** — universal rules live here and in the linked files.

## What every agent reads first

1. This file.
2. `docs/ai/current-direction.md` — what Docklist is building right now.
3. `docs/ai/skill-router.md` — task → skill map.
4. `docs/ai/guardrails.md` — file-size and worktree rules.
5. `docs/ai/snippets/` — declaration, completion report, prechecks, non-negotiables.
6. `docs/ai/FRONTEND_GUARDRAILS.md`

`AGENTS.md`, `CLAUDE.md`, and `CODEX.md` are thin entry points; their job is to send the agent here.

## Current mode: PRODUCT BUILD / REFINEMENT

Docklist is being **built and refined**. Agents help make the product better.

Agents must not autonomously frame work as:

- pilot readiness;
- release readiness;
- paid readiness;
- production closure;
- deployment preparation.

Those become goals **only when the owner explicitly asks for them**.

- Technical correctness is not product completeness.
- Passing tests is necessary evidence, not authority to declare the product finished.
- The owner decides when Docklist is ready to discuss pilot or release.
- Do not end a report with a readiness verdict, readiness score, or deployment recommendation unless the mission asked for one.

`docs/ai/phase-*.md` and `docs/ai/private-beta-*.md` are **historical records** of past deployment and beta work. They are reference material on request, not a description of the current mission. Do not treat them as a backlog.

## Prompt-size principle

User prompts should describe the *mission*, not restate the rules. Boilerplate (skill declaration, workflow, completion format, non-negotiables, line-count rules) is carried by this doc. A safe minimum prompt is:

```text
Task: <one-line mission>.
Route: <task type from skill-router.md>.
Stage: <audit | implementation | verification | commit>.
Files: <list or "TBD by audit">.
Follow DOCKLIST_OPERATING_SYSTEM.md.
```

## Tech stack

- DocklistAI uses TanStack Start, TanStack Query, TanStack Router, Vite, Cloudflare/Wrangler, Supabase, and Lovable TanStack config.
- Agents must not introduce Next.js/App Router patterns.
- Agents must not replace Supabase with Cloudflare D1/KV/R2.
- Agents must not edit deployment/runtime config unless the task explicitly requires it.

## Product boundaries

- **50% scheduling / 30% lightweight HR / 20% limited manager-led AI.** Scheduling is the product centre.
- Full forbidden-scope list in `docs/ai/snippets/non-negotiables.md`. See also `docs/adr/0001`.
- Scope expansion into forbidden areas requires an ADR and product-boundary update first. A user prompt alone is not enough.

## Frontend authority

- The current Docklist visible content and visual direction are **canonical**. Preserve them.
- Redesign happens only when the owner explicitly asks for it.
- Lovable is a design/build/deployment **tool**, not product authority.
- Do not remove UI content the owner likes without explicit approval.
- Structure work and file splitting must preserve visible behaviour.

## The old SmartRota / Docklist repository

**Retired as a product roadmap.**

- Do not inspect, harvest, mine, or compare against it during normal product work.
- Inspect it only when the owner explicitly asks a historical or legacy-specific question.
- Backlog items already extracted from it are now ordinary Docklist backlog items; treat them as such and do not return to the source.

## Non-negotiables

See `docs/ai/snippets/non-negotiables.md`. Violations stop the task. Summary: staff see only published snapshots; billing/payroll integrations remain disabled; no `select('*')`; every query workspace-scoped.

## Workflow

Six stages. Audit and product decision stay separate from implementation **while product scope is unresolved**. Once scope is approved, implementation runs as one bounded batch.

**A. Audit / understand** — read-only. Identify scope, risks, skills. Classify nearby findings with `docklist-proactive-maintenance-guard`. When the question is whether a workflow is good, usable or complete, observe the running app first (`docklist-product-reality-audit`).

**B. Product decision** — only when product scope is unresolved. Present the decision, wait for the owner. Skip this stage when the mission already defines the scope.

**C. Implementation run** — one run may: implement the entire approved batch; write tests; run targeted and, where needed, full validation; browser-test; fix defects **introduced by that implementation**; and re-run affected validation. Do not hand every small self-introduced defect back to the user. See `docklist-bounded-batch-delivery`.

**D. Verification** — may combine in one pass: complete diff review; security/scope review; exact staging; staged blob/fingerprint verification. Evidence, not narrative. Report skipped checks.

**E. Commit / push** — requires explicit user authorisation. One authorised run may combine: local commit; fetch-first remote check; ordinary fast-forward push; remote verification.

**F. External GitHub confirmation** — see below.

Every task opens with the skill declaration (`docs/ai/snippets/declaration.md`) and closes with the completion report (`docs/ai/snippets/completion-report.md`).

## External GitHub verification gate

After every commit intended for `main`:

1. Report the **full commit SHA**.
2. Verify local `HEAD`, `origin/main`, and the live remote (`git ls-remote`) normally.
3. **STOP after the report.**
4. Do not begin the next implementation batch until external GitHub verification has been acknowledged.

External verification is performed **outside the coding agent**. An agent must never claim that it supplies independent verification of its own push.

## Execution rules

- Implementation requires approved scope. Stop and report if scope creeps.
- No commit or push without an explicit instruction.
- No completion claim without evidence.
- Targeted tests/typecheck first; full suites when the change warrants them.
- Always report skipped checks.
- If a non-negotiable would be violated, stop and flag immediately.
- **Staging:** never `git add .`, `git add -A`, or `git add --all`. Stage only the explicit paths approved for this task. Unrelated dirty files (other features, screenshots, generated artefacts, local install output) must remain unstaged.
- **Never** force-push, and never merge or rebase to recover from unexpected remote movement. If `origin/main` moved, STOP and report.
- **Never** deploy to production without explicit approval.

## Git identity and attribution

- Use the configured repo-local Git identity. Do not invent or change it.
- Do not add AI attribution trailers (`Co-Authored-By`, "Generated with…") unless repository policy or the user explicitly requires it.
- Preserve the existing clean commit convention.
- Never rewrite existing Git history.

## Proactive maintenance limits

Use `docklist-proactive-maintenance-guard` to classify any nearby issue into: Fix Now / Scope Allows / Report / Risk Log / Forbidden. Observation may be broad; fixing stays inside approved scope. Do not silently expand scope. Frontend-only scope must not touch Supabase/RLS, auth, billing, payroll, AI/operator logic, integrations, dependencies, CI, or generated files without explicit approval.

## Skill discovery by platform

- **Claude Code** — skills in `.claude/skills/`. This is the canonical source of truth.
- **Codex** — skills in `.agents/skills/`, which is a mirror of `.claude/skills/`. If a skill referenced by `skill-router.md` is missing there, fall back to the canonical copy in `.claude/skills/`.
- After editing any skill, run `scripts/check-skill-parity.sh` and `scripts/check-skill-routing.sh`. Run `scripts/sync-skills.sh` only when intentionally mirroring `.claude/skills/` into `.agents/skills/`.
- Never hand-maintain different Claude and Codex versions of the same skill.

## Vendored upstream skills

Skills without the `docklist-` prefix are vendored from official upstream
repositories: `supabase` and `supabase-postgres-best-practices`
(supabase/agent-skills, MIT) and `playwright-cli` (`@playwright/cli`, Apache-2.0).

- Each carries a `VENDOR.md` recording upstream repository, pinned commit or
  version, sync date, licence, and local modifications (normally **none**).
- **Do not edit vendored files.** Docklist-specific rules live in the overlay
  skills beside them — `docklist-data-boundaries`, `docklist-sql-suite`,
  `docklist-browser-fixtures`.
- **Do not auto-update them.** No `npx skills update` and no re-running a vendor
  installer during normal product work; re-syncing is an explicit, owner-approved
  maintenance task that re-pins the version and updates `VENDOR.md`.
- Vendor text may describe optional external tooling (MCP servers, global
  installs). Docklist's approved path always wins: **no MCP server is configured**,
  Supabase work uses the CLI against the local Docker stack, and `@playwright/cli`
  is repo-local only.

## Required artifacts per task

- Skill declaration (first response).
- Audit report (Stage A) or verification evidence (Stage D).
- Completion report (final response).
- Line-count and worktree prechecks when applicable.
