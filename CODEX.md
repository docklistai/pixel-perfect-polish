# DocklistAI Codex Instructions

- `AGENTS.md` is the shared source of truth.
- Read `AGENTS.md` before every task.
- Inspect the available repo skills, then select only the skills relevant to the current task.
- Do not apply unrelated skills just because they exist.

## Task-to-skill rules

- Frontend/UI/UX/visual/accessibility/design-system work: use the relevant frontend, design, accessibility, and validation skills. `docs/skills/frontend-anti-slop/FRONTEND_SKILL_GUARDRAILS.md` is mandatory only for these tasks.
- Backend/data/security/RLS/Supabase work: use the relevant backend, database, security, and multi-tenant skills.
- Testing/QA work: use the relevant testing, verification, and bug-investigation skills.
- Documentation/copy/product messaging: use the relevant writing, copy, product, and clarity skills.
- Agent workflow/refactor work: use the relevant code-organisation, repo hygiene, and workflow skills.

## Product Direction

- Keep the product centered on scheduling, with lightweight HR and limited AI.
- Avoid generic AI SaaS UI.
- Avoid feature bloat.
- Avoid backend or product-scope drift.
- Avoid broad refactors unless clearly necessary.

## Final Report

Include:
- skills inspected
- skills selected
- skills intentionally skipped, if obvious
- why the selected skills were relevant
