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
if [[ -z "${REPO_ROOT}" || "$(pwd)" != "${REPO_ROOT}" ]]; then
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
  Excluded: .temp-execution-*.js
EOF

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude='.temp-execution-*.js' \
    "${SRC}" "${DST}"
else
  echo "sync-skills: rsync not found; using cp+find fallback." >&2
  find "${DST}" -mindepth 1 -delete
  cp -a "${SRC}." "${DST}"
  find "${DST}" -type f -name '.temp-execution-*.js' -delete
fi

echo "sync-skills: done. Run scripts/check-skill-parity.sh to verify."
