# Worktree / Branch Pre-Action Check

Before any branch switch, sync, Lovable merge, or commit, report:

- Current branch (`git branch --show-current`).
- Whether this checkout is a worktree (not the main clone).
- `git status --short`.
- Whether expected upstream changes are present locally.
- Files that must not be staged (unrelated dirty state, screenshots, generated files). Never `git add -A` or `git add .` — stage explicit approved paths only.

Use `docklist-using-git-worktrees` for any worktree-sensitive task.
