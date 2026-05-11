# Frontend Skill Guardrails

Frontend agents working in DocklistAI must use this anti-slop stack for any UI, UX, visual polish, accessibility, staff portal, dashboards, forms, tabs, drawers, empty states, loading states, or design-system work:

- `baseline-ui`
- `frontend-design`
- `ui-visual-validator`
- `react-ui-patterns`
- `fixing-accessibility`
- `tailwind-design-system`
- `copy-editing`

## Required rules

- Preserve the current DocklistAI visual direction.
- No generic AI SaaS UI.
- No random gradients.
- No unnecessary glassmorphism.
- No inconsistent spacing.
- No vague empty states.
- No new UI system unless explicitly requested.
- No feature bloat.
- Scheduling remains the core product.
- Staff portal work must stay mobile-first, accessible, and staff-safe.

## Working expectation

Before changing frontend code, read the relevant skills in `docs/skills/frontend-anti-slop/` and keep the implementation aligned with the current product language rather than inventing a new one.
