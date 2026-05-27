# Codex — Platform Deltas

Read `AGENTS.md` first, then `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`. Codex does not resolve `@`-includes, so follow file paths explicitly.

## Required reading at session start

- `AGENTS.md`
- `docs/ai/DOCKLIST_OPERATING_SYSTEM.md`
- `docs/ai/skill-router.md`
- `docs/ai/guardrails.md`
- `docs/ai/snippets/declaration.md`
- `docs/ai/snippets/completion-report.md`
- `docs/ai/snippets/non-negotiables.md`

## Skill discovery

- Codex skills live in `.agents/skills/`, which is mirrored from the canonical `.claude/skills/`.
- If a skill named in `skill-router.md` is missing from `.agents/skills/`, fall back to the canonical copy in `.claude/skills/`. Both directories share the same skill names; `.claude/skills/` is the source of truth when they diverge.
- If a skill is missing or stale, run `scripts/check-skill-parity.sh` and then `scripts/sync-skills.sh`. Do not hand-edit `.agents/skills/`.

## Final report

Use the format in `docs/ai/snippets/completion-report.md`. Also list skills inspected, skills selected, skills intentionally skipped (with reason).
