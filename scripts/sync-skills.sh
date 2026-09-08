#!/usr/bin/env bash
# Mirror the canonical .claude/skills tree into .agents/skills (Codex copy).
# This is destructive for .agents/skills: files removed from .claude/skills
# are deleted from .agents/skills. Source and target are hard-coded.
set -euo pipefail

if [[ $# -gt 0 ]]; then
  echo "sync-skills: this script does not accept arguments." >&2
  echo "Source (.claude/skills) and target (.agents/skills) are fixed." >&2
  exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
# Normalise both paths through the same shell before comparing. On Windows
# Git Bash, `git rev-parse --show-toplevel` reports C:/path while `pwd`
# reports /c/path, so a raw string compare always fails.
REPO_ROOT_NORM="$(cd "${REPO_ROOT:-/nonexistent}" 2>/dev/null && pwd -P || true)"
if [[ -z "${REPO_ROOT_NORM}" || "$(pwd -P)" != "${REPO_ROOT_NORM}" ]]; then
  echo "sync-skills: must be run from the repo root (${REPO_ROOT:-unknown})." >&2
  exit 2
fi

SRC=".claude/skills/"
DST=".agents/skills/"

if [[ ! -d "${SRC}" ]]; then
  echo "sync-skills: missing source directory ${SRC}" >&2
  exit 2
fi
mkdir -p "${DST}"

cat <<EOF
sync-skills: about to mirror skills.
  Source: ${SRC}
  Target: ${DST}  (will be overwritten; extraneous files removed)
  Excluded: .temp-execution-*.js, node_modules/, package-lock.json
EOF

# Local install output is not skill content; never mirror it into the Codex copy.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude='.temp-execution-*.js' \
    --exclude='node_modules' \
    --exclude='package-lock.json' \
    "${SRC}" "${DST}"
else
  echo "sync-skills: rsync not found; using cp+find fallback." >&2
  find "${DST}" -mindepth 1 -delete
  cp -a "${SRC}." "${DST}"
  find "${DST}" -type f -name '.temp-execution-*.js' -delete
  find "${DST}" -type f -name 'package-lock.json' -delete
  find "${DST}" -type d -name 'node_modules' -prune -exec rm -rf {} +
fi

echo "sync-skills: done. Run scripts/check-skill-parity.sh to verify."
