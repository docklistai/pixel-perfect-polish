#!/usr/bin/env bash
#
# Phase 10 local SQL suite runner.
#
# Runs every supabase/tests/*.sql suite against the LOCAL Supabase Postgres
# container. Each suite wraps its body in `begin;` and asserts with
# `raise exception 'FAIL: ...'`; there is no commit, so the session-end rollback
# leaves the seeded database untouched.
#
# LOCAL ONLY. This script never targets a remote/hosted database — it execs into
# the local container via docker. Requires the local stack running (`supabase start`).
#
# Usage:
#   bash scripts/sql-tests.sh            # run all suites
#   bash scripts/sql-tests.sh phase5     # run suites whose filename contains "phase5"
#
# Override the container name if your project id differs:
#   SUPABASE_DB_CONTAINER=supabase_db_xyz bash scripts/sql-tests.sh
#
# Exit codes: 0 all passed · 1 a suite failed · 2 environment not available (skip).
set -uo pipefail

PROJECT_ID="pixel-perfect-polish"            # supabase/config.toml project_id
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_${PROJECT_ID}}"
TESTS_DIR="supabase/tests"
FILTER="${1:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "SKIP: docker not available — cannot reach the local Supabase container." >&2
  exit 2
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "SKIP: container '$DB_CONTAINER' is not running." >&2
  echo "      Start the local stack with 'supabase start', or set SUPABASE_DB_CONTAINER." >&2
  exit 2
fi

shopt -s nullglob
fail=0
ran=0
for sql in "$TESTS_DIR"/*.sql; do
  base="$(basename "$sql")"
  if [[ -n "$FILTER" && "$base" != *"$FILTER"* ]]; then
    continue
  fi
  echo "── $base"
  if docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <"$sql" >/tmp/sql-test-out 2>&1; then
    echo "   PASS"
  else
    echo "   FAIL"
    sed 's/^/   | /' /tmp/sql-test-out
    fail=1
  fi
  ran=$((ran + 1))
done

echo
if [[ "$ran" -eq 0 ]]; then
  echo "No SQL suites matched filter '${FILTER}'."
  exit 2
fi
if [[ "$fail" -ne 0 ]]; then
  echo "sql-tests: $ran suite(s) ran, FAILURES above."
  exit 1
fi
echo "sql-tests: all $ran suite(s) passed."
