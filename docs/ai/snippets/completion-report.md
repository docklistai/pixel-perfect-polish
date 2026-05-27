# Completion Report Snippet

Every task ends with this block. Keep it compressed — lists, not prose.

## Report discipline

- Default to the compact block below. No long tables unless a blocker genuinely needs one.
- Do not restate unchanged guardrails or rules.
- Report only changed files, checks, blockers, git status, and commit/push status.
- Long reports require explicit user request.

```
Files changed:       <list>
Why each changed:    <reason>
Tests/checks run:    <what ran>
Typecheck/build:     <pass | fail | skipped>
Risks:               <any>
Skipped checks:      <what and why>
Git status:          <output of git status --short>
```
