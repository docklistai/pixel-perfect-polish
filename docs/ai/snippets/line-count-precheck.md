# Line-Count Pre-Edit Check

Run before editing any file. Limits live in `docs/ai/guardrails.md`.

1. List every file likely to be touched.
2. Record current line count (`wc -l`) for each.
3. Estimate post-change count; flag if any will cross the hard max.
4. If a file is already over its hard max:
   - Do not add new logic.
   - Propose extraction first.
   - Apply only a targeted bug fix with explicit user approval.
5. Report the largest changed file and its line count in the completion report.
