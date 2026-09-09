---
name: docklist-product-reality-audit
description: Use when judging whether a Docklist workflow is actually good, usable, coherent, trustworthy or complete — feature audits, first-run and empty-state review, manager or staff journey review, or any question of the form "is this working properly?". Observe the running app first, then trace to source. Not for pure code review.
risk: low
source: project
date_added: "2026-09-08"
---

# Docklist Product Reality Audit

## Purpose

Answer product questions with product evidence.

When the question is *"is this workflow good?"* — not *"is this code correct?"* — the running app is the primary source of truth. Source and tests are supporting evidence, never a substitute for using the product.

Docklist is in **product build / refinement mode**. This skill finds what makes the product worse to use. It does not assess release readiness.

## Order of Investigation

Follow this order. Do not skip to source.

### 1. Observe the running app first

Open the app and use it. Do not begin by reading `src/`.

- Use the official `playwright-cli` skill for browser commands, with
  `docklist-browser-fixtures` for Docklist URLs, personas and viewports.
- Use direct browser interaction for exploratory review.
- Capture what you actually saw: screens, states, copy, what happened after each click.

### 2. Use realistic scenarios

Audit as a real person with a real job, not as a test harness.

Manager scenarios:
- Build next week from a genuinely empty state.
- Import or carry over from last week.
- Someone calls in sick; cover the shift.
- An open shift gets applications; review and award one.
- Publish, then change something after publishing.
- Onboard a new staff member end to end.
- Record availability or a day off.

Staff scenarios:
- First-ever access, on a phone, with an access code.
- Check the published rota for this week.
- Apply for an open shift.
- Request time off.
- Contact the manager.

### 3. Identify the user-visible problem

State the defect as a person would experience it, before any technical framing.

> "The Build button says the week is ready, but the week still shows last week's shifts."

Not:

> "`buildWeek()` does not reset `draftState`."

### 4. Only then trace to root cause

Now read the source. Find the actual cause. Do not guess, and do not report a symptom as if it were a cause.

### 5. Report

Lead with product impact. Supporting technical detail follows.

## Rules

**Never declare a workflow READY because tests pass.** Passing tests mean the code does what it was written to do. They say nothing about whether that behaviour is the right product. Do not offer a readiness verdict at all — see the *Current mode* section of `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`.

**Actions offered then refused are high-priority trust defects.** A visible, enabled control that errors, silently no-ops, or says "not available" teaches the user the product is unreliable. Treat these as serious, not cosmetic.

**Correct-looking wrong data is blocker-class.** Data that renders cleanly but is wrong — wrong week, wrong department, wrong staff member, stale after an edit — is the worst class of defect in a scheduling product, because the user has no signal to distrust it. Rank it above crashes.

**Empty states and first-run journeys matter.** A workflow that only works once demo data exists is not finished. Audit the genuinely fresh state: new workspace, new week, no staff, no shifts, first login.

**Browser interaction burden matters.** Count the clicks, the scrolls, the drawers, the re-navigations. A correct workflow that takes fourteen steps is a real product problem.

**Manager and staff mobile journeys matter.** Staff are on phones. Managers often are too. A journey that only works at desktop width is incomplete.

**Distinguish defect from polish.** Say which you are reporting:
- *Product defect* — the workflow is broken, misleading, untrustworthy, or blocked.
- *Polish* — it works and is trustworthy, but could be smoother or better presented.

Do not inflate polish into a defect to make a report look substantial.

**Severity labels only on request.** Use P0/P1/P2/P3 only when the user explicitly asks for severity ranking. Otherwise describe impact in plain words.

**No readiness framing.** No pilot readiness, release readiness, production readiness, deployment recommendation, or readiness score — unless the mission explicitly asks.

## Scope

This is an **audit** skill. Findings are report-only by default.

- Do not fix during an audit unless the user has approved implementation scope.
- Classify anything outside the audit's subject with `docklist-proactive-maintenance-guard`.
- Do not mine the old SmartRota/Docklist repo for comparison.

When implementation follows an approved audit, hand off to `docklist-bounded-batch-delivery`.

## Output Format

```
### What I did
<the journeys actually performed, and how — browser, Playwright, viewport>

### What a user experiences
<user-visible problems, most damaging first, in plain language>

### Root causes
<per problem: file/function and the actual cause>

### Defect vs polish
<explicit split>

### Works correctly
<journeys verified good — brief, so the report is honest about what is fine>

### Not audited
<what was out of scope or not reachable>
```
