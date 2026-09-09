---
name: docklist-scheduling-integrity
description: Use when changing or reviewing anything in Docklist's scheduling core — the rota grid, Build the Week, Import, Copy, Open shifts, publish, drafts, availability, days off, leave interaction, or the staff portal view of a rota. An integrity checklist for keeping one scheduling fact identical across every entry point. Use before claiming a scheduling change is correct.
risk: high
source: project
date_added: "2026-09-09"
---

# Docklist Scheduling Integrity

Scheduling is the product centre (50% of Docklist). Most damaging defects here
are not crashes — they are **plausible-looking wrong schedules**.

This is a **checklist, not a mandate to redesign the planner.** If honouring it
would require re-architecting scheduling, stop and report instead.

## The core rule: one fact, every entry point

A scheduling fact must mean the same thing regardless of how it was created or
viewed. The entry points that must agree:

**manual edit · Build the Week · Import · Copy · Open shifts · publish · staff portal**

Before claiming a scheduling change correct, ask: *if this shift had arrived via
each of the other entry points, would the result be identical?* A rule enforced
in the drag handler but not in Import is **not enforced**.

**Cross-entry-point authority parity is mandatory.** Department, role and
location authority must be explicit and shared — one resolver, not a copy per
call site.

## Draft vs published

- Managers work on **live drafts**. Staff see **published snapshots only**.
- Publishing is a deliberate boundary crossing, not an autosave.
- Editing after publish must have defined, visible semantics — never silently
  change what staff already saw.
- A staff-visible read path that can reach draft data is **blocker-class**.

## Time semantics

- Local wall-clock date/time is the product's language; storage is not.
- **DST-safe**: a shift keeps its intended wall-clock time across transitions.
  Never assume a day is 24 hours or a week 168.
- **Overnight shifts** cross midnight and still belong to their owning shift-day.
- **Cross-week** boundaries must not duplicate or drop a shift.
- Week identity must be unambiguous — the week a shift belongs to cannot depend
  on the viewer's timezone.

`docs/adr/0002` records clocking timezone authority. Respect it.

## Demand and coverage

- An **Open shift is real demand**, not a placeholder and not zero work. It must
  count as demand everywhere demand is displayed or totalled.
- **Build must not silently invent demand.** Generated shifts trace to a real
  source — a template, a prior week, or explicit manager input. If Build cannot
  find a source it says so; it does not fabricate a plausible week.
- Coverage figures must reconcile with the shifts actually shown. A total the
  user cannot derive from the grid is a defect.

## People facts

- Manager-recorded **availability and days off** are respected consistently by
  every entry point, including Build and Import.
- **Approved vs pending leave** semantics stay exactly as the feature defines
  them — do not reinterpret pending as approved (or the reverse) to make a
  calculation simpler.
- Eligibility (role, department, contract) is resolved the same way everywhere.

## Trust defects

Rank these above cosmetic issues:

- **Offered then refused** — a visible, enabled action that fails because a
  different entry point disagrees. This teaches managers the product is
  unreliable.
- **Correct-looking wrong data** — right shape, wrong week/department/person, or
  stale after an edit. Blocker-class, because the user has no cue to distrust it.
- **Silent divergence** — two screens showing different truths for one fact.

## AI and determinism

- Generated scheduling stays **manager-controlled and deterministic** unless
  product direction explicitly changes (20% limited manager-led AI).
- No autonomous scheduling authority, no predictive worker scoring — see
  `docs/ai/snippets/non-negotiables.md`.

## How to verify

1. Observe the real journey in the browser first — `docklist-product-reality-audit`
   and `docklist-browser-fixtures`.
2. Add automated coverage for the rule at the shared layer, not per call site —
   `docklist-testing-patterns`.
3. If authority is enforced in the database, prove it there too —
   `docklist-sql-suite`.
