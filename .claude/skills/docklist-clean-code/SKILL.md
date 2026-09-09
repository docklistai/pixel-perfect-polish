---
name: docklist-clean-code
description: Use when structuring or restructuring Docklist code — naming, function and component size, extraction, removing duplication that causes real inconsistency, and deciding whether a refactor is justified at all. Absorbs the refactoring discipline. Use before splitting a file or starting any structure-only change.
risk: low
source: project
date_added: "2026-02-27"
---

# Docklist Clean Code

Structure serves the product. This skill decides **whether** to restructure and
**how far**, not how to satisfy a style ideal.

## When to refactor — and when not to

**Do not refactor because something could be cleaner.**

Refactor only when it is required to:

- safely implement approved behaviour;
- stay inside the file-size guardrails in `docs/ai/guardrails.md`;
- remove duplication that is causing **real inconsistency** (the same rule
  enforced differently in two places — see `docklist-scheduling-integrity`);
- isolate a genuinely new responsibility being introduced now.

Otherwise, leave it alone and log it as a Risk Log finding
(`docklist-proactive-maintenance-guard`).

**Visible behaviour must not change during structure-only work.** If a split
would alter what the user sees, that is a separate, owner-approved change.
Never bundle unrelated cleanup into a refactor.

## Size and extraction

Limits live in `docs/ai/guardrails.md` — run the line-count precheck before
editing. In short:

- Routes orchestrate; they do not hold large mock data, big forms, complex
  tables, or service logic.
- Extract when a JSX block passes ~80 lines, a drawer has more than one section,
  mock data passes ~40 lines, or a section appears on more than one page.
- Over hard max: extract before adding substantial logic. A targeted bug fix may
  touch the file where necessary.
- Do not refactor merely because a file is near its target — target flags review,
  not action.

## Naming

- Intention-revealing: `elapsedTimeInDays`, not `d`.
- No disinformation: don't call a `Map` a `List`.
- Functions are verbs (`publishRota`), types and components are nouns
  (`ShiftCard`, `WeekSummary`).
- Searchable over clever. Domain words from the product, not invented synonyms —
  a "shift" is a shift everywhere.

## Functions and components

- Do one thing at one level of abstraction. Don't mix scheduling rules with
  formatting.
- Few arguments; prefer a typed options object past two.
- No hidden side effects — a function named `get*` must not write.
- Prefer early return over nesting.
- Components: one responsibility, props typed against the feature's `types.ts`.

## Comments

- Rewrite unclear code rather than explaining it.
- Keep comments that carry non-obvious *why*: an invariant, a workaround, a
  product rule, a deliberate exception. Docklist's scheduling and tenancy rules
  are exactly the kind of thing worth a sentence.
- Match the surrounding file's comment density.

## Error handling

- Fail loudly at boundaries; never swallow an error to keep a screen quiet.
- Don't return `null` to mean "something went wrong" — model the failure
  (`docklist-typescript-expert`, discriminated unions).
- An action that cannot succeed should not be offered as available — an
  offered-then-refused control is a trust defect.

## Smells worth acting on here

Rigidity · fragility · duplicated rules that have already drifted · a component
that knows about three features · a route that grew a service inside it.

Cosmetic imperfection is not a smell.

## Related

- `docs/ai/guardrails.md` — the authoritative size limits.
- `docklist-software-architecture` — module boundaries and larger structure.
- `docklist-testing-patterns` — coverage expectations (note: Docklist does **not**
  require deleting working code because a test came second).
