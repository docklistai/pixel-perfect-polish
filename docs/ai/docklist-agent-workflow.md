# DocklistAI Gated Agent Workflow

All agent work follows this workflow. No stage is done until the user accepts it.

---

## Stage 0 — Skill Declaration

**What:** Before any other action, identify the task type, match it to a skill route in `docs/ai/skill-router.md`, and post the declaration.
**What not:** No file reads. No edits. No analysis.
**Output:**

```
Task type:      <detected task type>
Skills apply:   <skill names>
Skills read:    <yes / no per skill>
Skills skipped: <name — reason, or "none">
```

**Gate:** Do not proceed to Stage 1 until this declaration is posted.

---

## Stage 1 — Audit Only

**What:** Read files, identify scope, list risks, identify which skills apply.
**What not:** No edits. No code generation. No file creation.
**Output:** Written audit report listing: files in scope, findings, skill routes to use, and proposed approach.
**Gate:** User must read the report and give explicit approval before Stage 3.

---

## Stage 2 — User Review

**What:** User reads the audit report and provides feedback.
**What not:** No agent work during this stage.
**Gate:** User says "proceed", "go ahead", or gives equivalent explicit instruction.

---

## Stage 3 — Implementation

**What:** Make the changes described and approved in Stage 1/2.
**Rules:**

- Follow all skills identified in the audit.
- DocklistAI non-negotiables (see `AGENTS.md`) are enforced unconditionally.
- If scope creep is discovered mid-implementation, stop and report. Do not expand scope silently.
  **Output:** Diff or list of files changed.
  **Gate:** Proceed to Stage 4 immediately after changes are made.

---

## Stage 4 — Verification

**What:** Run targeted checks to confirm the implementation is correct.
**Rules:**

- Use targeted typecheck and targeted tests. Do not run the full test suite unless necessary.
- Report the exact commands run and their output.
- Do not substitute narrative for evidence.
  **Output:** Commands run + output + pass/fail verdict.
  **Gate:** If all checks pass, proceed to Stage 6. If any checks fail, proceed to Stage 5.

---

## Stage 5 — Correction (if needed)

**What:** Fix issues found in Stage 4.
**Rules:**

- Targeted fixes only. Do not refactor unrelated code.
- Re-run the same checks from Stage 4 after each fix.
  **Output:** Correction diff + re-run results.
  **Gate:** All checks must pass before Stage 6.

---

## Stage 6 — Commit Prompt

**What:** Stage files and create a commit message.
**Rules:**

- Do not commit unless the user explicitly asks (`"commit this"`, `"commit and push"`, etc.).
- Never use `git push` unless explicitly instructed.
- Present staged files and draft message for user confirmation if not explicitly told otherwise.
  **Gate:** User confirms commit.

---

## Stage 7 — Final Sign-Off

**What:** Deliver the completion report as required in `AGENTS.md`.
**Output:**

```
Files changed:       <list>
Why each changed:    <reason>
Tests/checks run:    <what ran>
Typecheck/build:     <pass | fail | skipped>
Risks:               <any>
Skipped checks:      <what and why>
Git status:          <output of git status --short>
```

---

## Default Rules (apply to all stages)

- No full test suite runs unless necessary — targeted tests first.
- Always report skipped checks and why they were skipped.
- If a non-negotiable would be violated, stop and flag it immediately.
- Scope changes require user approval before implementation.
