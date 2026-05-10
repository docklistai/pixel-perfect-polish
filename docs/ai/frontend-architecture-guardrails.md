# DocklistAI Frontend Architecture Guardrails

## Purpose

Route files should orchestrate screens, not contain everything. The goal is to prevent bloated pages, duplicated UI patterns, inconsistent mock data, and hard-to-maintain frontend code. When route files grow beyond their limits, they become impossible to review, difficult to test, and prone to silent regressions.

---

## File size limits

| File type | Target | Hard max | Required action if exceeded |
|---|---:|---:|---|
| Route/page files | 250 lines | 350 lines | Extract sections, mock data, hooks, drawers, or tables |
| UI components | 150 lines | 250 lines | Split into subcomponents |
| Forms and drawers | 180 lines | 280 lines | Extract form sections, field config, validation, or footer actions |
| Hooks | 120 lines | 180 lines | Split responsibilities |
| Services | 200 lines | 300 lines | Split by domain action |
| Tests | 250 lines | 450 lines | Split by behavior |
| Design system files | Exception | Review required | Do not add route-specific logic |
| Migrations | Exception | Review required | One purpose per migration, include RLS where relevant |

---

## Route file rules

Routes **should**:
- import page sections
- orchestrate layout
- hold only small local demo state
- connect drawers and dialogs
- pass data into components

Routes **should not**:
- contain large mock datasets
- contain several complex tables
- contain large forms inline
- define many nested components
- duplicate design system primitives
- contain backend or service logic

---

## Component extraction rules

Extract when:
- a JSX block exceeds roughly 80 lines
- a drawer or form has more than one section
- table rows contain complex rendering
- mock data exceeds roughly 40 lines
- the route has more than 3 major sections
- a section appears on more than one page

Recommended structure when useful:

```text
src/routes/rota.tsx
src/features/rota/components/
src/features/rota/data/mockRotaData.ts
src/features/rota/types.ts
src/features/rota/hooks/
```

---

## Mock data rules

- Move mock data to `src/features/<feature>/data/` before the file exceeds 40 lines
- Never define mock arrays inline inside a JSX return block
- Type all mock data against the feature's `types.ts`
- Mock data files must be co-located with the feature, not scattered in `src/`

---

## Drawer and dialog rules

- Drawers are components, not inline JSX blocks in a route
- Each drawer lives in `src/features/<feature>/components/`
- A drawer with more than one form section must be split into sub-sections
- Footer actions (save/cancel/delete) are extracted when the drawer exceeds the hard max

---

## Enforcement

Before merging a PR that touches a route or component file:
1. Check line count against the table above
2. If at or above Target, flag for extraction in the PR description
3. If at or above Hard max, extraction is required — do not merge without it
4. For Lovable-generated output: apply the Lovable frontend review route in `skill-router.md` before merging
