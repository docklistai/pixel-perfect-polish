# DocklistAI Skill Router

Match every task to one or more skill routes before doing any work. Read the listed skill files, then follow their instructions.

---

## Agent guidance or workflow changes

**When:** editing AGENTS.md, CLAUDE.md, or changing how agents operate
**Skills:**
- `.claude/skills/docklist-agent-discipline/SKILL.md`
- `.claude/skills/docklist-context-driven-development/SKILL.md`
- `.agents/skills/docklist-agent-discipline/SKILL.md`
**Required output:** updated file + completion report
**Required checks:** file loads cleanly; no instructions exceed 100 lines

---

## Any completion claim

**When:** any assertion that work is done, tests pass, or the feature is working
**Skills:**
- `.claude/skills/docklist-verification-before-completion/SKILL.md`
- `.claude/skills/docklist-testing-patterns/SKILL.md`
**Required output:** evidence list (commands run + output), not narrative
**Required checks:** targeted typecheck + targeted test run; skipped checks reported

---

## Frontend page or component work

**When:** building, editing, or reviewing React components, pages, or styles
**Skills:**
- `.claude/skills/docklist-frontend-dev-guidelines/SKILL.md`
- `.claude/skills/docklist-react-ui-patterns/SKILL.md`
- `.claude/skills/docklist-tailwind-design-system/SKILL.md`
- `.claude/skills/docklist-baseline-ui/SKILL.md`
- `.claude/skills/docklist-fixing-accessibility/SKILL.md`
**Required output:** component diff + accessibility check + design token audit
**Required checks:** no hardcoded colors/sizes; keyboard nav; aria labels present

---

## Lovable frontend review

**When:** reviewing AI-generated Lovable output before merging
**Skills:**
- `.claude/skills/docklist-frontend-dev-guidelines/SKILL.md`
- `.claude/skills/docklist-baseline-ui/SKILL.md`
- `.claude/skills/docklist-fixing-accessibility/SKILL.md`
- `.claude/skills/docklist-code-review-checklist/SKILL.md`
**Required output:** violation list with file/line + severity
**Required checks:** layout anti-patterns; animation durations; typography scale; a11y

---

## React refactor or cleanup

**When:** restructuring existing React code without adding features
**Skills:**
- `.claude/skills/docklist-react-ui-patterns/SKILL.md`
- `.claude/skills/docklist-code-refactoring/SKILL.md`
- `.claude/skills/docklist-testing-patterns/SKILL.md`
**Required output:** before/after diff + test results
**Required checks:** no behaviour change; types still pass; targeted test run

---

## Supabase / RLS / schema work

**When:** writing migrations, policies, edge functions, or database queries
**Skills:**
- `.claude/skills/docklist-security-audit/SKILL.md`
- `.claude/skills/docklist-database-design/SKILL.md`
- `.claude/skills/docklist-postgresql/SKILL.md`
- `.claude/skills/docklist-saas-multi-tenant/SKILL.md`
**Required output:** policy diff + workspace-scope proof + RLS coverage table
**Required checks:** no `select('*')`; every query workspace-scoped; RLS enabled on new tables

---

## Edge function / API work

**When:** writing or modifying Supabase edge functions, API routes, or server actions
**Skills:**
- `.claude/skills/docklist-security-audit/SKILL.md`
- `.claude/skills/docklist-api-security/SKILL.md`
- `.claude/skills/docklist-testing-patterns/SKILL.md`
**Required output:** auth/input-validation audit + test coverage summary
**Required checks:** all inputs validated; auth checked before data access; secrets not logged

---

## Review / pre-commit

**When:** before staging any commit, or when asked to review changes
**Skills:**
- `.claude/skills/docklist-codebase-audit-pre-push/SKILL.md`
- `.claude/skills/docklist-code-review-checklist/SKILL.md`
- `.claude/skills/docklist-differential-review/SKILL.md`
- `.claude/skills/docklist-verification-before-completion/SKILL.md`
**Required output:** diff summary + finding list + pass/fail verdict
**Required checks:** typecheck; targeted tests; no secrets or debug code committed

---

## Documentation

**When:** writing or restructuring docs, READMEs, or architecture notes
**Skills:**
- `.claude/skills/docklist-docs-architect/SKILL.md`
- `.claude/skills/docklist-context-driven-development/SKILL.md`
**Required output:** doc diff or new file + link audit
**Required checks:** internal links valid; no procedures duplicated in code files
