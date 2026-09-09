---
name: docklist-retrospective
description: Use only when the owner explicitly asks for a retrospective, or when the same agent or process mistake has clearly recurred across several Docklist tasks. Turns repeated friction into a small set of proposals — a regression test, a skill change, a guardrail, a router change, or a backlog finding. Not loaded routinely and never run automatically.
risk: low
source: project
date_added: "2026-09-09"
---

# Docklist Retrospective

Converts **repeated** friction into durable improvement, without bureaucracy.

## When to use

Only when one of these is true:

- the owner explicitly asks for a retrospective;
- the same agent or process mistake has happened **repeatedly**;
- several recent tasks reveal a recurring workflow or tooling weakness.

## When not to use

- Never automatically, never on a timer, never at the end of every task.
- Never for a **one-off** mistake. A single slip is noise; encoding it as
  permanent policy makes the system worse.
- Never as a way to reopen a settled product decision.

## Method

1. **Name the recurring friction.** State the pattern and cite at least two
   concrete occurrences. If you cannot cite two, stop — it is not recurring.
2. **Find the real cause.** Distinguish: missing knowledge · wrong routing ·
   missing guardrail · genuine product defect · unclear instruction · nothing
   fixable.
3. **Route each finding to exactly one home:**

| Home | Use when |
| --- | --- |
| **Regression test** | A product defect recurred. Coverage prevents its return. |
| **Skill change** | The agent had the right skill but it lacked or misstated the guidance. |
| **Guardrail** | A rule needs to hold across all tasks (`docs/ai/`). |
| **Router change** | The right skill exists but was not being reached. |
| **Backlog finding** | Real, but product work the owner must scope. |
| **Nothing** | One-off, or the cost of a rule exceeds the friction. Say so plainly. |

4. **Propose, do not apply.** Output a short list — at most **five** proposals,
   each with the exact target file and the change in a sentence or two.

## Hard rules

- **Never silently rewrite agent rules, skills, memory, or routing.** Proposals
  require owner approval before any implementation batch picks them up.
- **No transcript hoarding.** Do not save, export, or send session transcripts
  anywhere. Work from what is in front of you.
- **No readiness scoring.** No pilot, release, production or deployment verdicts —
  Docklist is in product build / refinement mode.
- **No metrics theatre.** No counts of mistakes, no grades, no trend charts.
- Keep it short. A retrospective that takes longer than the work it improves has
  failed.

## Output

```
### Recurring friction
<pattern, with at least two concrete occurrences>

### Cause
<the actual cause, not the symptom>

### Proposals (max 5)
| # | Home | Target file | Change |
|---|------|-------------|--------|

### Explicitly not worth fixing
<friction observed but not worth a permanent rule, and why>
```
