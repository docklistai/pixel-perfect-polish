# ADR-0005: Product Constitution as Tracked Authority

## Status

Accepted

Extends and clarifies `docs/adr/0001` with the authoritative product decisions established in `docs/ai/DOCKLIST_PRODUCT_CONSTITUTION.md`.

---

## Context

Following a comprehensive product audit across scheduling, lightweight HR, and manager-led AI, the owner established the definitive Docklist V2 Product Constitution (`docs/ai/DOCKLIST_PRODUCT_CONSTITUTION.md`) to eliminate ambiguity and prevent scope creep.

To preserve these architectural and product decisions across all agent and contributor sessions, the constitution is promoted into tracked source under `docs/ai/`.

## Decision

1. **Tracked Authority**: `docs/ai/DOCKLIST_PRODUCT_CONSTITUTION.md` is the canonical product specification and boundary authority for Docklist V2. It sits alongside `docs/ai/DOCKLIST_OPERATING_SYSTEM.md` and `docs/ai/current-direction.md`.
2. **Locked Product Decisions**:
   - **Command Palette**: Frozen in its existing navigation and quick-actions role. It is not to be removed, nor expanded into global object search or an arbitrary command framework.
   - **Leave Terminology & Storage**: `personal` remains the database storage key; canonical UI label is **Compassionate leave**. No leave-type database migration or backfill for this relabelling.
   - **Ops Staff Participation**: Remains explicitly **OPEN — DO NOT IMPLEMENT**. Staff assignment dropdown and backend notification boundaries remain preserved in their current state until an owner decision is taken.
   - **Rota Adherence**: Authoritative definition is documented in §7, but calculation is explicitly **DEFERRED**; the existing Sample surface is preserved.
3. **Execution Gate Consolidation (CL-7)**:
   - For the V2 implementation campaign (WS-0 through WS-14), the per-batch external GitHub verification pauses defined in `docs/ai/DOCKLIST_OPERATING_SYSTEM.md` are consolidated into a single external verification milestone at the end of the campaign, by explicit owner instruction.
   - All internal quality gates (Vitest, Typecheck, Lint, Quality greps, Build, SQL suite, Concurrency, Ops HTTP) continue to run and remain strictly green before each scoped commit.
