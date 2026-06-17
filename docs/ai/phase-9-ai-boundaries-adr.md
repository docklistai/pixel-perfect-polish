# ADR — DocklistAI AI Boundaries for MVP

## 1. Status

Accepted for Phase 9 implementation.

Supersedes nothing. Scoped to the MVP AI layer (master roadmap phase 9), ahead of
Phase 10 Testing & Quality. Sources: `docs/ai/phase-9-ai-layer-audit.md`
(audit + incorporated second opinion) and
`docs/ai/master-roadmap-signoff-before-security.md`.

## 2. Context

- The Phase 9 AI audit concluded real model integration is premature.
- The second-opinion review confirmed the audit direction but found it **too
  soft** — several surfaces were marked "relabel" when the honest action is
  "remove / fix / de-badge".
- Current AI-looking surfaces include fake assistant behaviour (free-text Q&A,
  simulated spinner/latency, fabricated history), fabricated statistics (£
  figures, percentages, fit scores, read-rates, coverage claims),
  staff-profile risk/health signals (sickness/absence shown as AI "risk
  signals"), and **capability claims not enforced by code** (e.g. rota-generate
  rule toggles the suggestion engine ignores).
- There are **no real model/network AI calls** anywhere today; every AI surface
  is deterministic-from-store or hardcoded/canned.
- The MVP needs **scheduling-led manager support**, not generic chatbot
  behaviour. This aligns with the 50/30/20 product split (`docs/adr/0001`):
  scheduling core, lightweight HR, limited AI.

## 3. Decision

DocklistAI MVP AI must be:

- **deterministic / rule-based**
- **manager-led**
- **scheduling-supportive**
- **read-only** unless the manager explicitly uses normal app actions
- **evidence-backed**
- **non-autonomous**
- **honest** about demo / rule-based behaviour

**No external model API, model key, prompt system, or AI backend is allowed in
Phase 9.**

## 4. Allowed

Allowed deterministic manager-support surfaces:

- rota issue explanations
- pre-publish review checklist
- open-shift suggestions from transparent rules
- leave/time review aids from structured records
- manager-only note templates, never auto-sent
- dashboard scheduling attention summary if evidence-backed

## 5. Forbidden

Forbidden for MVP:

- real model calls
- free-text generic chatbot
- fake spinner / thinking / history
- fabricated numbers, percentages, costs, fit scores, read-rates, coverage claims
- staff ranking / scoring / profiling
- health / sickness / absence as AI risk signals
- payroll / wage / legal advice
- BI / reporting AI
- autonomous publish / approve / decline / send
- training on workspace data
- pay / private notes as AI context
- capability claims not enforced by code

## 6. Required UX rules

Every allowed assistant-like surface must:

- show source / evidence rows or a clear rule basis
- label output as suggestion / review
- expose assumptions
- say "not enough data" where appropriate
- route the manager to normal app actions
- never silently write
- never imply real AI when deterministic / demo-only

## 7. Implementation order

Phase 9 implementation should address, in order:

1. global assistant honesty cleanup
2. staff profile AI / risk cleanup
3. settings forbidden toggle removal
4. leave impact / dashboard fabricated suggestion cleanup
5. reports / team / ops AI de-badging or deferral
6. GenerateRotaDialog unenforced rule toggle fix / removal

## 8. Consequences

- Some attractive prototype copy will be removed or de-badged.
- The product becomes less flashy but more trustworthy.
- Real AI can be reconsidered **only after Phase 10 Testing & Quality**
  establishes server-side boundaries, evals, data-shaping, rate limits, logging,
  and refusal tests.
