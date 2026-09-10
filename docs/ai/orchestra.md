# Orchestra — Docklist Multi-Agent Execution

Canonical reference for running Orchestra against Docklist work. The
`docklist-orchestra` skill is the operational checklist; this file is the
explanation behind it. Everything defined here is defined here **once**.

## Purpose

Orchestra is Docklist's multi-agent execution coordinator. It takes an already
approved, bounded engineering task and drives it through plan → plan review →
implementation → independent review on a disposable task branch.

**Orchestra does not decide product direction.** Docklist roadmap, scope and
product boundaries remain owner + ChatGPT decisions, made before a task is
queued. Orchestra executes; it does not choose what to build. The 50/30/20
product boundary and everything in `docs/ai/snippets/non-negotiables.md` apply
to orchestrated output exactly as they apply to hand-written work.

## Approved role policy

| Role | Agent | Model | Effort |
| --- | --- | --- | --- |
| Planner | Claude | Opus 5 | high |
| Plan reviewer | Antigravity | `gemini-3.8-flash-high` | high |
| Primary coder | Antigravity | `gemini-3.1-pro-high` | high |
| Routine / mechanical coder | Antigravity | `gemini-3.8-flash-high` | high |
| Reviewer | Codex | `gpt-5.6-sol` | high |
| Critical escalation | Codex | Astra | manual only |

Astra is **never automatic**. It requires explicit owner + ChatGPT approval for
a specific case, and no environment variable or wrapper may select it.

**No `xhigh` anywhere.** Claude accepts `low|medium|high|xhigh|max`; Docklist
uses `high`.

**Never silently substitute a model.** Models are pinned in machine-local
shims, not in this repo. Use the primary coder for anything touching scheduling
authority, data boundaries or correctness-sensitive logic; the routine coder is
for straightforward wiring, mechanical edits and simple tests.

## Fallback policy

- A fallback must be **explicit**, never silent.
- The **reason** must be recorded in the task comments and the completion report.
- Preserve **reviewer-family independence** where practical: the reviewer should
  not be the same model family as the coder.
- **Astra is never an automatic fallback.**
- **Critical Docklist work may stop rather than degrade.** If independent review
  is unavailable, stopping is the correct outcome — an unreviewed diff is worth
  less than a delayed one.

## Source / runtime architecture

Three checkouts, each with one job. Confusing them is the main failure mode.

| Path | Role | Rules |
| --- | --- | --- |
| `~/orchestra` | Pristine upstream reference | Pinned, clean, never executed against |
| `~/orchestra-docklist-engine` | Source engine | Holds `.git` and the compatibility patch. Used for patching, testing and re-pins. **Never** `ORCHESTRA_DIR` |
| `~/orchestra-runtime` | Runtime | Execution copy. **`ORCHESTRA_DIR` points here** |

Expected states:

- Pristine upstream SHA: `a0a40c6c0c73eca3b8bbd2837af9fbb71253fd9e`
- Source engine branch: `docklist/planner-coder-decoupling`
- Source engine compatibility commit: `1b1cb502b908e838a02cdc3011a9bdcc230f8e1c`

Runtime requirements:

- **No `.git` anywhere** — the runtime is not a repository, so an agent cannot
  create branches or commits in it.
- **Read-only** during normal execution.
- Execution copy only; agents need read + execute, never write.
- All task state (database, lock, logs, transcripts) is written to the **task
  work repo**, never the runtime.

Both properties matter. An agent that finds no repository may try `git init`;
read-only stops that too. This is defence in depth against accidental tooling
mutation — it is **not** a complete sandbox or security boundary for same-user
agents.

## Pre-run checks

Assert all of these before queueing or running a task.

```bash
# Runtime
[ "$ORCHESTRA_DIR" = "$HOME/orchestra-runtime" ]
[ ! -e "$ORCHESTRA_DIR/.git" ] && [ "$(find "$ORCHESTRA_DIR" -name .git | wc -l)" -eq 0 ]

# Source engine
E="$HOME/orchestra-docklist-engine"
[ "$(git -C "$E" symbolic-ref --short HEAD)" = "docklist/planner-coder-decoupling" ]
[ "$(git -C "$E" rev-parse HEAD)" = "1b1cb502b908e838a02cdc3011a9bdcc230f8e1c" ]
[ -z "$(git -C "$E" status --porcelain)" ]
git -C "$E" for-each-ref --format="%(refname) %(objectname)" > /tmp/orchestra-refs-before
```

Also assert, by inspection:

- The task work repo is **not** the canonical Docklist checkout.
- The task branch is **not** `main` or `master`.
- The work repo `AGENTS.md` contains no standalone `ALLOW_TASKS_ON_MASTER` line.
- No GitHub write credential is present in the Orchestra environment.
- No hosted Supabase credential is present.

Check the **branch** as well as the SHA. A stray branch can move `HEAD` while
the commit hash still matches, and a SHA-only assertion will not notice.

## Task creation and planning

```bash
ko-task add "<title>" --description "<markdown description>" \
  --branch orchestra/<slug> \
  --coder-agent antigravity \
  --reviewer-agent codex \
  --type commit
```

Then, **mandatory for every Docklist commit task**:

```bash
ko-task set <id> --remove-skip commit-plan
ko-task set <id> --next-step commit-plan
ko-task set <id> --status ready
```

Upstream Orchestra adds `commit-plan` to the skip list for **every** commit task
at creation, and plan review is inferred from that skip. If the skip is not
removed, Opus planning and Gemini plan review **silently never run** — the task
goes straight to implementation and two approved roles are inert.

**Never edit the Orchestra database directly** to enable planning. Use the
supported CLI above.

## Expected lifecycle

```
commit-plan               Claude Opus 5 High
  -> commit-plan-review   Antigravity Gemini 3.8 Flash High
  -> commit-make          Antigravity Gemini 3.1 Pro High
  -> commit-review        Codex GPT-5.6 Sol High
       reject  -> commit-make    same Antigravity Gemini 3.1 Pro High
               -> commit-review  Sol re-review
       approve -> finalisation on the task branch
```

Upstream `handle_commit_plan` overwrote `coder_agent` with `DEFAULT_PLANNER`,
which made the planner the sticky coder — implementation *and* review
corrections both routed to Opus. The tracked compatibility patch preserves an
explicitly assigned `coder_agent` through planning, which is what keeps
Antigravity as the coder across the whole lifecycle including correction rounds.

## Post-run checks

```bash
[ "$(git -C "$E" symbolic-ref --short HEAD)" = "docklist/planner-coder-decoupling" ]
[ "$(git -C "$E" rev-parse HEAD)" = "1b1cb502b908e838a02cdc3011a9bdcc230f8e1c" ]
[ -z "$(git -C "$E" status --porcelain)" ]
git -C "$E" for-each-ref --format="%(refname) %(objectname)" | diff - /tmp/orchestra-refs-before
[ "$(find "$ORCHESTRA_DIR" -name .git | wc -l)" -eq 0 ]
```

Plus: only the **task repo** refs may have changed, and there must be no push,
no merge, no rebase and no force push anywhere.

## Canonical landing

```
Orchestra disposable task branch
  -> external Docklist diff review
  -> exact staging into canonical Docklist
  -> commit via docklist-git-integrity
  -> push from the canonical Windows environment only
  -> ChatGPT independently verifies GitHub
```

**Orchestra never pushes Docklist.** It has no push code path, the Orchestra
environment holds no GitHub credentials, and task fixtures have no remote.

Landing mechanics — repo truth, exact staging manifest, staged diff review,
commit identity, fetch-first fast-forward push, external verification handoff —
are owned by `docklist-git-integrity` and are **not** restated here.

## Source to runtime refresh

Run after any change to the source engine. Defined here only.

```bash
E="$HOME/orchestra-docklist-engine"
R="$HOME/orchestra-runtime"

[ "$(git -C "$E" symbolic-ref --short HEAD)" = "docklist/planner-coder-decoupling" ] || exit 1
[ "$(git -C "$E" rev-parse HEAD)" = "1b1cb502b908e838a02cdc3011a9bdcc230f8e1c" ]     || exit 1
[ -z "$(git -C "$E" status --porcelain)" ]                                           || exit 1

chmod -R u+w "$R" 2>/dev/null || true

rsync -a --delete \
  --exclude ".git" \
  --exclude ".pytest_cache" \
  --exclude ".kanban-orchestra" \
  --exclude "kanban-orchestra.db*" \
  --exclude "kanban-orchestra.lock" \
  "$E/" "$R/"

chmod -R a-w "$R"

[ ! -e "$R/.git" ] && [ "$(find "$R" -name .git | wc -l)" -eq 0 ] || exit 1
[ -z "$(git -C "$E" status --porcelain)" ]                        || exit 1
```

The non-`.git` excludes are not cosmetic: running the Orchestra test suite in
the source engine leaves `kanban-orchestra.db`, `.kanban-orchestra/` and
`.pytest_cache/` behind, and a naive sync would carry them into the runtime.

## Patch provenance

| Field | Value |
| --- | --- |
| Repository | https://github.com/confusionstudios/orchestra |
| Upstream pinned SHA | `a0a40c6c0c73eca3b8bbd2837af9fbb71253fd9e` |
| Licence | MIT |
| Compatibility commit | `1b1cb502b908e838a02cdc3011a9bdcc230f8e1c` |
| Reason | Preserve explicitly assigned `coder_agent` through commit planning |
| Delta | `orchestrator.py` +8/-1; `test_kanban.py` +167 |
| Validation | 661 Orchestra tests passed; full Gate 3 lifecycle passed |
| Patch artifact | `docs/ai/orchestra-0001-preserve-explicit-coder-agent.patch` |
| Not vendored | The Orchestra engine is machine-local; only the patch and these docs are tracked |

## Re-pin procedure

1. Fetch and pin the new upstream SHA in `~/orchestra`.
2. Create a clean engine checkout at that SHA on branch
   `docklist/planner-coder-decoupling`.
3. `git apply --check docs/ai/orchestra-0001-preserve-explicit-coder-agent.patch`.
4. If clean, apply it. If it conflicts, upstream has changed
   `handle_commit_plan` — re-derive the change by hand and re-audit it.
5. Focused planner/coder regression: `TestPlannerCoderDecoupling`, expect 5 passed.
6. Full Orchestra suite: `bin/ko-test`, expect the prior baseline plus 5.
7. Lightweight role-resolution proof using stubs — no paid model calls.
8. Refresh the git-free runtime (above).
9. Re-run the expensive multi-model Gate 3 lifecycle **only** if compatibility
   semantics or role-marker behaviour changed.

**Known coupling.** Antigravity model routing (3.8 Flash for plan review vs 3.1
Pro for implementation) depends on the `- role: coder` marker that Orchestra
emits into the prompt from `prompt_builder.py`. A re-pin must verify that marker
still exists and behaves as expected; if it moves, the coder silently downgrades
to the routine model rather than failing loudly.
