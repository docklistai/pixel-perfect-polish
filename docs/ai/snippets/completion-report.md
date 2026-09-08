# Completion Report Snippet

Every task ends with this block. Keep it compressed — lists, not prose.

## Report discipline

- Default to the compact block below. No long tables unless a blocker genuinely needs one.
- Do not restate unchanged guardrails or rules.
- Long reports require explicit user request.
- Do **not** include a production-readiness score, a pilot-readiness declaration, or a deployment recommendation unless the mission explicitly asked for one. See the *Current mode* section of `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`.

```
Behaviour changed:   <what a user can now do differently, or "none — internal">
Files changed:       <exact list>
Why each changed:    <reason>
Tests/checks run:    <what ran, with results>
Typecheck/build:     <pass | fail | skipped>
Browser evidence:    <what was observed in the running app, or "n/a — no user-visible change">
Schema/migration:    <migration files and RLS impact, or "none">
Deferred findings:   <real issues found and not fixed, or "none">
Skipped checks:      <what and why>
Git status:          <output of git status --short>
Commit:              <full SHA if committed, else "not committed">
```

## Staging rules

- Never `git add .`, `git add -A`, or `git add --all`.
- Stage the exact approved paths only.
- Unrelated dirty files, generated artefacts, and local install output stay unstaged.
