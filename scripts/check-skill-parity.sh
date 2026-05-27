#!/usr/bin/env bash
# Verify .claude/skills and .agents/skills are byte-identical.
# Canonical source: .claude/skills. Codex mirror: .agents/skills.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" || "$(pwd)" != "${REPO_ROOT}" ]]; then
  echo "check-skill-parity: must be run from the repo root (${REPO_ROOT:-unknown})." >&2
  exit 2
fi

CLAUDE_DIR=".claude/skills"
AGENTS_DIR=".agents/skills"

for d in "${CLAUDE_DIR}" "${AGENTS_DIR}"; do
  if [[ ! -d "${d}" ]]; then
    echo "check-skill-parity: missing directory ${d}" >&2
    exit 2
  fi
done

DIFF_OUTPUT="$(diff -rq \
  --exclude='.temp-execution-*.js' \
  "${CLAUDE_DIR}" "${AGENTS_DIR}" 2>&1 || true)"

if [[ -z "${DIFF_OUTPUT}" ]]; then
  echo "check-skill-parity: OK — ${CLAUDE_DIR} and ${AGENTS_DIR} are in sync."
  exit 0
fi

echo "check-skill-parity: FAIL — skill trees diverge:" >&2
echo "${DIFF_OUTPUT}" >&2
echo >&2
echo "Run scripts/sync-skills.sh to mirror ${CLAUDE_DIR} into ${AGENTS_DIR}." >&2
exit 1
