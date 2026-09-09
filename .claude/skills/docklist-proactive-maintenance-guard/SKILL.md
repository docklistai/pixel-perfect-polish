---
name: docklist-proactive-maintenance-guard
description: Use when working on DocklistAI tasks where the agent may notice nearby bugs, risks, broken behaviour, weak UX, accessibility issues, backend concerns, test gaps, data risks, security concerns, documentation drift, product drift, or future maintenance traps. This skill allows controlled proactive discovery across the whole codebase, but only permits fixes when they are inside the approved scope and risk level.
risk: medium
source: project
date_added: "2026-05-20"
---

# Docklist Proactive Maintenance Guard

## Purpose

This skill helps agents notice and handle nearby issues while working inside an approved DocklistAI scope.

The goal is not to improve everything.

The goal is to stop obvious defects, risks, stale behaviour, broken states, unsafe assumptions, and maintenance traps from slipping through when they are clearly visible during scoped work.

DocklistAI must stay focused:

- 50% scheduling
- 30% lightweight HR (lightweight workforce admin)
- 20% limited manager-led AI

Protect the product from bloat, scope creep, random refactors, and unnecessary complexity.

## Mode

Docklist is in **product build / refinement mode**.

- Findings are about making the product better, not about getting it shipped.
- **Pilot, release, paid and production readiness are never proactive tasks.** Do not raise "we should get this pilot-ready" as a finding, and do not attach a readiness verdict or score to a findings report. Readiness is owner-initiated only.
- Deployment preparation is not a maintenance category.

## Core Rule

**Observation may be broad. Fixing stays narrow.**

Proactive observation is allowed across the whole codebase — notice anything, anywhere.

Proactive fixing is only allowed when the issue is clearly inside the approved scope, low enough risk for the current task, and verifiable.

Two specific consequences:

- **Defects introduced by the current batch may always be corrected.** If your own change broke it, fix it in this run — that is self-correction, not scope expansion.
- **Unrelated product findings are reported, never silently absorbed.** Do not quietly fold an unrelated fix into the diff because it was small. Report it and let the owner scope it.

When in doubt, report the issue instead of fixing it.

This skill does not override the approved task scope.

## Old Repository

The old SmartRota/Docklist repo is **retired as a product roadmap**.

Do not inspect, mine, or compare against it while looking for findings. "The old repo did this better" is not a valid proactive finding. Only the owner may open that door, for an explicit historical question.

## Use This Skill When

Use this skill during:

- audits
- implementation work
- debugging
- refactoring
- frontend polish
- backend hardening
- database or Supabase review
- test repair
- CI or build cleanup
- accessibility work
- documentation updates
- code quality passes
- pre-commit review
- pre-push review

Use it whenever the agent notices something broken, misleading, fragile, unsafe, stale, inconsistent, or likely to create future problems.

## Do Not Use This Skill To Justify

Do not use this skill as permission for:

- random repo-wide cleanup
- broad refactors
- product redesigns
- backend work during frontend-only scope
- database work during UI-only scope
- new features
- new integrations
- payroll integrations
- billing changes
- AI/operator implementation
- auth changes
- dependency upgrades
- generated file changes
- touching unrelated routes or modules

## Classification Buckets

Every proactive finding must be classified before any action.

| Bucket | Meaning |
| --- | --- |
| **1. Fix Now** | Inside approved scope, close to the work, small, local, low-risk, verifiable, no new feature, no product-direction change. |
| **2. Scope Allows** | Fix only if the active task explicitly includes that domain (backend, Supabase, RLS, tests, tooling, docs). Otherwise report. |
| **3. Report, Do Not Fix** | Spans features, touches shared architecture, changes app-wide behaviour, needs product approval, or touches security/auth/billing/payroll/AI/database safety. |
| **4. Risk Log Only** | Real but not blocking — file size creeping, thin coverage, naming drift, future maintenance traps. |
| **5. Forbidden Unless Approved** | Migrations, RLS, auth, billing, payroll, AI/operator implementation, integrations, dependency upgrades, CI/CD, generated files, repo-wide formatting, broad architecture. |

Full conditions and worked examples: `references/classification-buckets.md`.

**During audit-only tasks every finding is report-only**, including anything that
would otherwise qualify as Fix Now. "Fix Now" describes fix *eligibility* during
implementation tasks; it is never an instruction to fix during an audit.

Do not list verified-correct guidance, healthy files, or successful checks as
proactive findings — a finding must be an actual issue. If the approved scope is
clean, write: "No proactive findings in approved scope."

## Domain Risk Rules

Fix eligibility by domain, in one line each:

- **Frontend / UI** — fix proactively when local, visible and in scope.
- **Backend / API** — notice anytime; fix only when backend work is approved.
- **Supabase / DB / RLS** — notice anytime; report first unless database scope is approved.
- **Auth / Security** — notice anytime; report first unless the task is security-scoped.
- **Tests** — fix when related to the current change; no broad rewrites.
- **Documentation** — fix when small and related; report larger drift.
- **Dependencies / Tooling / CI** — notice anytime; report unless tooling scope is approved.
- **Generated files** — never touch without explicit approval (`routeTree.gen.ts`, generated Supabase types, build artefacts, browser/session output).

Per-domain checklists of what to look for: `references/domain-checklists.md`.

## Required Workflow

### 1. Restate Scope

Before acting, state:

- approved task
- approved domains
- expected files or areas
- forbidden areas
- verification plan

### 2. Scan While Working

During the task, actively look for:

- bugs
- broken behaviour
- security risks
- data access risks
- stale copy
- UX traps
- accessibility issues
- test failures
- type errors
- build risks
- documentation drift
- maintenance traps
- product direction drift

### 3. Classify Before Action

For every extra issue found, classify it as:

- Fix Now
- Fix Only If Current Scope Allows It
- Report, Do Not Fix Yet
- Risk Log Only
- Forbidden Unless Explicitly Approved

Do not list verified-correct guidance, healthy files, or successful checks as proactive findings. A proactive finding must be an actual issue, risk, inconsistency, defect, or concern. If the approved scope has no issues, write: “No proactive findings in approved scope.”

During audit-only tasks, all findings are report-only. Do not fix, stage, format, restore, or commit anything, even when a finding would normally fit the Fix Now bucket.

"Fix Now" is a classification of fix eligibility during implementation tasks only. It is not an instruction to fix during audit-only tasks. Positive confirmations belong in the Verification or Scope Protection Check sections of your report, not Proactive Findings.

### 4. Do Not Expand Scope Silently

If the issue affects more than 3 files, crosses domains, changes shared architecture, or touches high-risk areas, stop and report it.

Do not implement without approval.

### 5. Keep Diffs Clean

Only change files that belong to the approved task or approved proactive fix.

Do not stage unrelated files.

Do not commit generated files unless explicitly approved.

Do not mix unrelated frontend, backend, database, billing, payroll, AI, auth, tooling, or documentation changes in one commit.

### 6. Verify Before Completion

Do not claim completion without verification.

Use targeted checks based on the domain.

Common checks:

- git diff --check
- npx tsc --noEmit
- targeted eslint
- targeted tests
- npm run build
- browser smoke for UI changes
- migration or type checks for database work when approved
- security or RLS smoke checks when approved

## Required Output Format

When proactive findings are involved, report them with this structure:

### Proactive Findings

| Finding | Domain | Bucket | Action |
|---|---|---|---|
| Brief issue | Frontend / Backend / Database / Auth / Tests / Docs / Tooling / Security / Product | Fix Now / Scope Allows / Report / Risk Log / Forbidden | Fixed / Reported / Deferred / Ignored |

### Files Touched

List every changed file and why it changed.

### Files Not Touched

Confirm protected areas not touched, based on the task.

Examples:

- No unrelated frontend routes
- No backend files
- No Supabase files
- No auth files
- No billing files
- No payroll files
- No AI/operator files
- No generated files
- No dependency or CI changes

Only list protected areas relevant to the task.

### Verification

List exact verification commands run and results.

### Final Status

End with one of:

- Ready for review
- Needs user decision
- Blocked
- Not safe to commit yet

Do not say done unless verification passed.

These describe the state of **this task**. They are not product-readiness statements. Never end with a pilot, release, production or deployment verdict unless the mission explicitly asked for one.
