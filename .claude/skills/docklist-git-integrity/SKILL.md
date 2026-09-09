---
name: docklist-git-integrity
description: Use for Docklist staging, commit, push and remote-integrity work — establishing repo truth, building an exact staging manifest, reading the staged diff, committing with the repo identity, fetch-first fast-forward push, and the external GitHub verification handoff. Use whenever a change is about to be staged, committed or pushed.
risk: high
source: project
date_added: "2026-09-09"
---

# Docklist Git Integrity

Chain of custody from working tree to verified remote. **This is not a product
readiness or pre-release skill** — it makes no judgement about whether the
product is ready for anything.

## 1. Repo truth before staging

Establish and report, before touching the index:

```bash
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main | cut -f1
git rev-list --left-right --count origin/main...HEAD
git status --short
git config --local user.name && git config --local user.email
```

Confirm the branch, that HEAD matches the expected baseline, ahead/behind, the
canonical origin, and the repo-local identity. If any disagrees with the
mission's stated baseline, **stop and report** before proceeding.

## 2. Exact manifest

List every path to be staged, and every path deliberately excluded.

- **Never** `git add .`, `git add -A`, or `git add --all`.
- Stage explicit paths only: `git add -- <path> <path> …`
- Unrelated dirty files, generated artefacts, local install output, screenshots
  and ephemeral state stay unstaged.
- Protected/unrelated files are named in the report so their exclusion is
  deliberate, not accidental.

## 3. Verify the staged set

```bash
git diff --cached --name-status   # exactly the manifest, nothing more
git status --short | grep -v '^[MA]'   # what remains unstaged — expected only
git diff --cached --check          # whitespace
```

**Read the complete staged diff.** Every hunk must be intentional and in scope.
Check for debug code, stray logging, secrets, and files from another concern.

Where warranted — large or mixed changes, or anything security-relevant —
verify staged blob identity against the worktree:

```bash
git diff --cached --name-only | while read p; do
  [ "$(git rev-parse ":$p")" = "$(git hash-object "$p")" ] || echo "MISMATCH $p"
done
```

### Line endings

This checkout can hold CRLF while committed blobs are LF. A whole-file diff
where you changed three lines means line-ending churn, not content. Confirm with
`git diff --ignore-all-space --stat`, normalise the touched files to LF, and
keep the commit to real content.

## 4. Commit

- Use the **configured repo-local identity**. Do not invent or change it.
- **No AI attribution trailers** (`Co-Authored-By`, "Generated with…") unless
  repository policy or the user explicitly requires them.
- Conventional subject matching the existing history (`feat(scope):`,
  `chore(ai):`); body explains *why* and states what was deliberately excluded.
- One commit per bounded batch. **No `--amend`.** Never rewrite existing history.

## 5. Fetch-first push

```bash
git fetch origin main
git rev-parse origin/main     # must still equal the pre-commit baseline
git rev-list --left-right --count origin/main...HEAD   # expect 0<TAB>1
```

If `origin/main` moved: **STOP and report.**

- No merge. No rebase. No force. No `--force-with-lease`.
- Recovering from unexpected remote movement is the owner's decision.

Otherwise push ordinarily:

```bash
git push origin main
```

## 6. Verify the remote

```bash
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main | cut -f1
```

All three must be identical, ahead/behind `0 0`.

## 7. External verification handoff

Report the **full commit SHA** and the exact manifest, then **STOP**.

External GitHub verification happens **outside this agent**. Never claim the
agent independently verified its own push, and do not begin the next
implementation batch until that verification is acknowledged.

## Never

- `git add .` / `-A` / `--all`
- force push, `--force-with-lease`, or history rewriting
- merge or rebase to recover unexpected remote movement
- committing generated artefacts, browser binaries, or local install output
- staging on the user's behalf without explicit authorisation to commit
