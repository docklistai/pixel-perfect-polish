@AGENTS.md

## Claude Code — Additional Rules

Skills live in `.claude/skills/`. Before any task, declare the skill route as required by the Skill Declaration rule in `AGENTS.md`. Do not begin work until the declaration is posted.

**Frontend work:** read `docklist-frontend-dev-guidelines`, `docklist-react-ui-patterns`, `docklist-tailwind-design-system`, `docklist-baseline-ui`, `docklist-fixing-accessibility`.

**Supabase / RLS / schema:** read `docklist-security-audit`, `docklist-database-design`, `docklist-postgresql`, `docklist-saas-multi-tenant`.

**Testing or completion claims:** read `docklist-verification-before-completion`, `docklist-testing-patterns`.

**Reviews:** read `docklist-code-review-checklist`, `docklist-differential-review`, `docklist-codebase-audit-pre-push`.

## Workflow

- Never jump from planning to implementation without user approval.
- Never commit unless asked.
- If skill triggering seems unreliable, explicitly invoke the skill by reading its `SKILL.md`.
- Use `/memory` to verify this file is loaded if needed.
