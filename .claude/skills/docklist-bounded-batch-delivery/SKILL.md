---
name: docklist-bounded-batch-delivery
description: Default orchestration for substantial Docklist implementation batches. Use once product scope is approved and real work needs to land in one run — multi-file features, workflow fixes, or related sets of changes. Encodes scope-before-code, self-correction of introduced defects, full diff self-review, and complete verification without deployment or readiness framing.
risk: medium
source: project
date_added: "2026-09-08"
---

# Docklist Bounded Batch Delivery

## Purpose

This is the **default implementation orchestration skill** for substantial Docklist work.

One run delivers one bounded batch: scope it, build it, test it, fix what you broke, verify it, report it. Do not fragment a coherent batch into a dozen handoffs, and do not let a batch quietly grow into a different project.

Docklist is in **product build / refinement mode**. This skill delivers product improvements. It does not prepare releases.

## Not a deployment skill

This skill never ends in a deploy, a readiness score, or a release recommendation. If the mission genuinely concerns deployment or runtime acceptance, that is a different, explicitly-scoped mission — see the deployment-oriented section of `docs/ai/skill-router.md`.

## Phase 1 — Define the batch before writing code

Write the scope down first. State plainly:

- **In scope:** the behaviours being changed, and the files expected to change.
- **Out of scope:** what is deliberately not being touched.
- **Domains touched:** frontend / backend / database / auth / tests / docs.
- **Verification plan:** which checks will prove this batch works.

Run the line-count precheck (`docs/ai/snippets/line-count-precheck.md`) for the expected files.

If scope is genuinely unresolved, stop here and get the product decision. Do not guess and build.

## Phase 2 — Implement the whole batch

One run may do all of this:

- Implement every part of the approved batch.
- Write or update tests.
- Run targeted validation, and full validation where the change warrants it.
- Browser-test any user-visible change.
- **Fix defects introduced by this implementation**, and re-run the affected checks.

**Self-correction is expected, not escalation.** If your own change breaks a test, a type, or a screen, fix it in this run. Do not return every small self-inflicted defect to the user as a question.

**Self-correction is not scope expansion.** It covers what *this batch* broke. It does not cover pre-existing defects you happened to notice.

### Stop and ask when you hit

- a product-boundary contradiction (50/30/20, or a forbidden scope);
- an architecture contradiction that the batch cannot honestly resolve;
- a security or data-access concern;
- a change to auth, RLS, billing, payroll, migrations, dependencies, CI, or generated files that was not in the approved scope;
- a requirement that the visible design or content change, when the owner did not ask for a redesign.

Report it and stop. Do not implement around it.

### Do not

- Do unrelated cleanup, drive-by refactors, or repo-wide formatting.
- Change visible behaviour that the batch did not require.
- Mine the old SmartRota/Docklist repo.
- Add dependencies without approval.
- Deploy anything.

Classify anything else you notice with `docklist-proactive-maintenance-guard`. Unrelated findings are **reported, not silently absorbed into the diff**.

## Phase 3 — Self-review the complete diff

Read your own full diff before claiming anything. Not a summary of it — the diff.

- Every hunk is intentional and belongs to this batch.
- No debug code, stray logging, commented-out blocks, or scratch files.
- No `select('*')`; every query workspace-scoped.
- No staff exposure to drafts, manager notes, or payroll data.
- No secrets, tokens, or keys.
- File sizes still respect `docs/ai/guardrails.md`; any split preserved visible behaviour.
- `git diff --check` is clean.

## Phase 4 — Verify

Match the checks to the domains touched:

| Domain touched | Required evidence |
|---|---|
| Any code | targeted typecheck + `git diff --check` |
| Logic / helpers / rules | targeted unit tests, passing |
| User-visible change | browser verification of the actual journey |
| Backend / Supabase / RLS | SQL and security validation for the affected policies |
| Broad or cross-cutting change | full suite |

Apply `docklist-verification-before-completion`. Run the command, read the output, then make the claim. Report every skipped check and why.

## Phase 5 — Report

Use `docs/ai/snippets/completion-report.md`.

- Lead with the behaviour that changed.
- List exact files and why each changed.
- Give real evidence, including browser evidence for user-visible work.
- List real deferred findings.
- **No readiness declaration, readiness score, or deployment recommendation.**

Staging and commit happen only on explicit user authorisation, with exact paths — never `git add .` / `-A` / `--all`. After an authorised push, follow the external GitHub verification gate in `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`: report the full SHA, verify the remote, then stop.
