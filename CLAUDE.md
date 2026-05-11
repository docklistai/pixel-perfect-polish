@AGENTS.md

## Shared Skill Selection

- Before each task, inspect the available repo skills.
- Select only the skills relevant to the task.
- Do not apply unrelated skills just because they exist.
- `docs/skills/frontend-anti-slop/FRONTEND_SKILL_GUARDRAILS.md` is mandatory only for frontend/UI/UX/visual/accessibility/design-system work.

## Claude Code — Additional Rules

Skills live in `.claude/skills/`. Before any task, declare the skill route as required by the Skill Declaration rule in `AGENTS.md`. Do not begin work until the declaration is posted.

**All implementation work:** before editing, read `docs/ai/repo-architecture-guardrails.md`. Check line counts for all files likely to be touched. Declare whether any touched file is at or over the hard max. If over, propose extraction before adding code.

**Frontend work:** read `docklist-frontend-dev-guidelines`, `docklist-react-ui-patterns`, `docklist-tailwind-design-system`, `docklist-baseline-ui`, `docklist-fixing-accessibility`. Before frontend work, also read `docs/ai/frontend-architecture-guardrails.md` and declare whether the change risks exceeding file-size limits.
Also read `docs/skills/frontend-anti-slop/FRONTEND_SKILL_GUARDRAILS.md` before UI or visual-polish work.

**Branch / sync / worktree tasks:** use `docklist-using-git-worktrees`. Confirm branch, worktree status, and which files must not be staged before acting.

**Lovable / AI-generated code review:** use `docklist-vibe-code-auditor` in addition to the standard frontend review skills.

**Large refactor or batch implementation:** use `docklist-orchestrate-batch-refactor`, `docklist-architecture-patterns`, `docklist-planning-with-files`, `docklist-filesystem-context`.

**Supabase / RLS / schema:** read `docklist-security-audit`, `docklist-database-design`, `docklist-postgresql`, `docklist-saas-multi-tenant`.

**Testing or completion claims:** read `docklist-verification-before-completion`, `docklist-testing-patterns`.

**Reviews:** read `docklist-code-review-checklist`, `docklist-differential-review`, `docklist-codebase-audit-pre-push`.

## Workflow

- Never jump from planning to implementation without user approval.
- Never commit unless asked.
- If skill triggering seems unreliable, explicitly invoke the skill by reading its `SKILL.md`.
- Use `/memory` to verify this file is loaded if needed.
