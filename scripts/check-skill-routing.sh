#!/usr/bin/env bash
# Static routing checks for the Docklist skill system.
# Asserts docs/ai/skill-router.md and .claude/skills stay consistent, that the
# representative missions in docs/ai/skill-routing-tests.md resolve, and that no
# retired skill name survives. Read-only: no network, no writes.
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
# Normalise both paths through the same shell before comparing. On Windows Git
# Bash, `git rev-parse --show-toplevel` reports C:/path while `pwd` reports
# /c/path, so a raw string compare always fails.
REPO_ROOT_NORM="$(cd "${REPO_ROOT:-/nonexistent}" 2>/dev/null && pwd -P || true)"
if [[ -z "${REPO_ROOT_NORM}" || "$(pwd -P)" != "${REPO_ROOT_NORM}" ]]; then
  echo "check-skill-routing: must be run from the repo root (${REPO_ROOT:-unknown})." >&2
  exit 2
fi

SKILLS_DIR=".claude/skills"
ROUTER="docs/ai/skill-router.md"
FAILURES=0

fail() { echo "  FAIL: $*" >&2; FAILURES=$((FAILURES + 1)); }
pass() { echo "  ok: $*"; }

for p in "${SKILLS_DIR}" "${ROUTER}"; do
  [[ -e "${p}" ]] || { echo "check-skill-routing: missing ${p}" >&2; exit 2; }
done

echo "1. Every skill named in the router exists"
ROUTED="$(grep -oE '`[a-z0-9-]+`' "${ROUTER}" | tr -d '`' | sort -u)"
while read -r name; do
  [[ -z "${name}" ]] && continue
  # Skip prose tokens like the bare `docklist-` prefix.
  [[ "${name}" == *- ]] && continue
  [[ -d "${SKILLS_DIR}/${name}" ]] && continue
  # Only treat it as a skill reference if it looks like one of ours or a vendor skill.
  case "${name}" in
    docklist-*|supabase|supabase-postgres-best-practices|playwright-cli)
      fail "router names '${name}' but ${SKILLS_DIR}/${name} does not exist" ;;
  esac
done <<< "${ROUTED}"
[[ ${FAILURES} -eq 0 ]] && pass "all router skill references resolve"

echo "2. Every installed skill is routed"
for d in "${SKILLS_DIR}"/*/; do
  name="$(basename "${d}")"
  grep -q "\`${name}\`" "${ROUTER}" || fail "skill '${name}' is not named in ${ROUTER}"
done

echo "3. Representative missions resolve"
check_mission() {
  local label="$1"; shift
  local missing=""
  for s in "$@"; do
    grep -q "\`${s}\`" "${ROUTER}" || missing="${missing} ${s}"
  done
  if [[ -n "${missing}" ]]; then fail "mission ${label} missing:${missing}"; else pass "mission ${label}"; fi
}
check_mission "A (RLS policy)"        supabase supabase-postgres-best-practices docklist-data-boundaries docklist-sql-suite
check_mission "B (wrong dept import)" docklist-product-reality-audit docklist-scheduling-integrity docklist-testing-patterns docklist-browser-fixtures
check_mission "C (TanStack page)"     docklist-tanstack-start docklist-frontend-dev-guidelines
check_mission "D (browser workflow)"  playwright-cli docklist-browser-fixtures
check_mission "E (commit and push)"   docklist-git-integrity
check_mission "F (Cloudflare deploy)" docklist-cloudflare-edge
check_mission "G (repeated mistake)"  docklist-retrospective

echo "4. Deployment stays a non-default section"
if grep -q "^## DEPLOYMENT — never a product-build default" "${ROUTER}"; then
  pass "deployment section marked non-default"
else
  fail "${ROUTER} must keep a DEPLOYMENT section marked as never a product-build default"
fi

echo "5. No retired skill names survive"
RETIRED="docklist-playwright docklist-supabase docklist-postgresql docklist-api-security docklist-security-audit docklist-saas-multi-tenant docklist-code-refactoring docklist-docs-architect docklist-lint-and-validate docklist-codebase-audit-pre-push"
for name in ${RETIRED}; do
  # VENDOR.md files legitimately record what was replaced.
  hits="$(grep -rl -- "${name}" "${SKILLS_DIR}" docs/ai AGENTS.md CLAUDE.md CODEX.md 2>/dev/null \
          | grep -v 'VENDOR.md' | grep -v 'skill-routing-tests.md' || true)"
  [[ -n "${hits}" ]] && fail "retired skill '${name}' still referenced in: ${hits}"
done
[[ ${FAILURES} -eq 0 ]] && pass "no retired skill names in canonical docs or skills"

echo
if [[ ${FAILURES} -eq 0 ]]; then
  echo "check-skill-routing: OK — routing matrix consistent."
  exit 0
fi
echo "check-skill-routing: FAIL — ${FAILURES} problem(s)." >&2
exit 1
