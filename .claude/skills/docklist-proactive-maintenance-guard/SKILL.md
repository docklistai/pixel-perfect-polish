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

- 80% scheduling
- 15% lightweight HR
- 5% AI

Protect the product from bloat, scope creep, random refactors, and unnecessary complexity.

## Core Rule

Proactive observation is allowed across the whole codebase.

Proactive fixing is only allowed when the issue is clearly inside the approved scope, low enough risk for the current task, and verifiable.

When in doubt, report the issue instead of fixing it.

This skill does not override the approved task scope.

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

Every proactive finding must be classified before action.

### Bucket 1: Fix Now

The agent may fix the issue during the current task only if all conditions are true:

- The issue is inside the approved scope.
- The issue is close to the files or behaviour already being worked on.
- The fix is small and local.
- The fix is low-risk.
- The fix does not introduce a new feature.
- The fix does not change product direction.
- The fix does not require a broader architecture decision.
- The fix does not touch forbidden areas for the current task.
- The fix can be verified with targeted checks.

Examples:

- A button in the current component opens an empty drawer.
- A form touched by the task has a missing label.
- A route being edited contains a stale date.
- A local test fails because of the current change.
- A small type error appears in a directly related file.
- A related copy string conflicts with DocklistAI product direction.
- A nearby helper has a clear bug affecting the current feature.

### Bucket 2: Fix Only If Current Scope Allows It

The agent may fix the issue only if the active task explicitly includes that domain.

Examples:

- Backend API issue during an approved backend task.
- Supabase query issue during an approved Supabase task.
- RLS policy issue during an approved security or database task.
- Test suite repair during an approved testing task.
- Build configuration issue during an approved tooling task.
- Documentation drift during an approved docs task.

If the current task does not include that domain, report the issue instead.

### Bucket 3: Report, Do Not Fix Yet

The agent must report the issue but not implement it when:

- The fix spans multiple features.
- The fix touches shared architecture.
- The fix changes app-wide behaviour.
- The fix needs product approval.
- The fix affects security, auth, billing, payroll, AI, or database safety.
- The fix requires dependency upgrades.
- The fix affects generated files.
- The fix is real but outside the current scope.

Examples:

- App-wide drawer system feels weak.
- A shared API pattern is inconsistent.
- RLS policy may expose too much data.
- Billing copy conflicts with pricing direction.
- AI/operator logic needs tool permission boundaries.
- CI config is messy but not blocking the task.
- Multiple routes repeat the same fragile pattern.

### Bucket 4: Risk Log Only

The agent should log but not fix future-facing risks that are not blocking now.

Examples:

- Component is getting too large.
- Route may soon exceed size guardrails.
- Test coverage is thin but not failing.
- Demo data is becoming hard to maintain.
- Naming is inconsistent but not breaking behaviour.
- A future dark mode conflict is likely.
- A helper should eventually be extracted.

### Bucket 5: Forbidden Unless Explicitly Approved

The agent must not touch these unless the user has clearly approved that area for the current task:

- Supabase migrations
- RLS policies
- auth logic
- billing
- payroll integrations
- AI/operator implementation
- external integrations
- dependency upgrades
- CI/CD workflows
- generated files
- large shared primitives
- repo-wide formatting
- broad architecture changes

## Domain Risk Rules

### Frontend and UI

Can be fixed proactively when local, visible, and inside scope.

Look for:

- broken interactions
- empty drawers, modals, popovers, and dialogs
- bland drawers, modals, popovers, and dialogs
- misleading buttons
- fake controls
- missing disabled states
- poor focus behaviour
- accessibility issues
- layout overflow
- stale dates
- copy mismatch
- weak empty states

### Backend and API

Can be noticed anytime.

Can only be fixed if backend work is approved.

Look for:

- unsafe assumptions
- missing validation
- unclear error handling
- data leakage
- overly broad queries
- weak permission checks
- API responses that do not match frontend needs
- broken status codes
- missing failure handling

### Supabase, Database, and RLS

Can be noticed anytime.

Usually report first.

Only fix when database, Supabase, RLS, or security scope is explicitly approved.

Look for:

- workspace isolation risks
- manager-only data exposed to staff
- missing tenant filters
- unsafe update or delete policies
- migration drift
- historical data risks
- missing indexes that clearly affect approved scope
- unsafe RPC behaviour
- staff visibility risks

### Auth and Security

Can be noticed anytime.

Report first unless the task is explicitly security or auth scoped.

Look for:

- permission leaks
- unsafe redirects
- missing role checks
- sensitive data exposure
- secrets or tokens in code
- weak access boundaries
- insecure client-side assumptions
- staff access to manager-only data

### Tests and Verification

Can be fixed proactively when related to the current task.

Do not rewrite broad tests unless approved.

Look for:

- tests failing because of current changes
- missing test updates for changed behaviour
- fragile assertions in touched areas
- test data that no longer matches approved behaviour
- snapshot drift caused by current work

### Documentation

Can be fixed proactively when small and related.

Report larger documentation debt.

Look for:

- outdated instructions
- wrong command references
- missing scope notes
- incorrect product direction
- agent guidance conflicts
- old references to payroll integrations
- old references to AI-heavy product positioning

### Dependencies, Tooling, and CI

Can be noticed anytime.

Usually report first.

Only fix when the task includes tooling, build, dependency, or CI scope.

Look for:

- broken scripts
- failing build config
- unsafe dependency patterns
- deprecated commands
- duplicate tooling rules
- CI mismatch with local commands
- unnecessary dependency additions

### Generated Files

Must not be touched unless explicitly approved.

Examples:

- routeTree.gen.ts
- generated Supabase types
- generated API clients
- build artifacts
- temporary files
- Playwright traces
- Playwright screenshots
- test result artifacts

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
