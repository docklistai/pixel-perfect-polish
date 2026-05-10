# DocklistAI Repo-Wide Architecture Guardrails

Applies to all file types across the repo. Frontend-specific rules also live in `docs/ai/frontend-architecture-guardrails.md`.

---

## Universal pre-edit rule

Before any implementation, the agent must:

1. Identify all files likely to be touched.
2. Check current line counts for each.
3. Estimate whether the requested change will push any file over the hard max.
4. Choose extraction over inline growth when a file is at or near the hard max.

If a file is already over the hard max:

- Do not add more logic to it.
- Propose extraction first.
- Only apply a targeted bug fix if explicitly approved and no safer option exists.

---

## File size limits

| File type               |    Target |        Hard max | Required action if exceeded                                     |
| ----------------------- | --------: | --------------: | --------------------------------------------------------------- |
| Route/page files        | 250 lines |       350 lines | Extract sections, mock data, hooks, drawers, or tables          |
| UI components           | 150 lines |       250 lines | Split into subcomponents                                        |
| Forms, drawers, dialogs | 180 lines |       280 lines | Extract sections, field config, validation, or footer actions   |
| Hooks                   | 120 lines |       180 lines | Split responsibilities                                          |
| Services                | 200 lines |       300 lines | Split by domain action                                          |
| Utilities/helpers       | 120 lines |       200 lines | Split by purpose                                                |
| Types/schema files      | 150 lines |       250 lines | Split by domain or model                                        |
| Edge functions          | 220 lines |       350 lines | Extract shared helpers, validation, auth, and response builders |
| Tests                   | 250 lines |       450 lines | Split by behaviour or scenario                                  |
| Docs                    | 300 lines |       600 lines | Split into focused docs if too broad                            |
| SQL migrations          | Exception | Review required | One purpose per migration; include RLS where relevant           |
| Design system files     | Exception | Review required | Do not add route-specific or feature-specific logic             |

---

## Worktree safety rules

Before any implementation or commit that may be worktree-sensitive, report:

- Current branch name.
- Whether this checkout is a worktree (not the main clone).
- `git status --short` summary.
- Whether expected Lovable/GitHub changes are present in the local working tree.
- Files that must not be staged.

Use `docklist-using-git-worktrees` for any branch, sync, or worktree task.

---

## Enforcement

Before merging a PR that touches any file:

1. Check line count against the table above.
2. If at or above Target, flag for extraction in the PR description.
3. If at or above Hard max, extraction is required — do not merge without it.
4. For Lovable-generated output: apply `docklist-vibe-code-auditor` before merging.
