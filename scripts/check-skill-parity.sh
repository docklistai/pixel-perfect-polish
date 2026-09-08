#!/usr/bin/env bash
# Verify .claude/skills and .agents/skills are byte-identical.
# Canonical source: .claude/skills. Codex mirror: .agents/skills.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
# Normalise both paths through the same shell before comparing. On Windows
# Git Bash, `git rev-parse --show-toplevel` reports C:/path while `pwd`
# reports /c/path, so a raw string compare always fails.
REPO_ROOT_NORM="$(cd "${REPO_ROOT:-/nonexistent}" 2>/dev/null && pwd -P || true)"
if [[ -z "${REPO_ROOT_NORM}" || "$(pwd -P)" != "${REPO_ROOT_NORM}" ]]; then
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

# Local install output (e.g. `npm run setup` inside a skill directory) is not
# skill content and is never mirrored, so it must not fail parity.
DIFF_OUTPUT="$(diff -rq \
  --exclude='.temp-execution-*.js' \
  --exclude='node_modules' \
  --exclude='package-lock.json' \
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
