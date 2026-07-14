#!/usr/bin/env bash
#
# Phase 31 concurrency suite runner.
#
# Runs every supabase/tests/concurrency/*.sql suite against the LOCAL Supabase
# Postgres container as supabase_admin. These suites open a real second
# database session via dblink, which requires a superuser caller on the local
# stack (loopback connections are trusted, and dblink refuses passwordless
# connects for non-superusers). Each suite wraps its body in `begin; …
# rollback;` and never commits from either session, so the seeded database is
# left untouched.
#
# LOCAL ONLY. This script never targets a remote/hosted database — it execs
# into the local container via docker. Requires the local stack running
# (`supabase start`).
#
# Usage:
#   bash scripts/concurrency-tests.sh            # run all concurrency suites
#   bash scripts/concurrency-tests.sh phase31    # filter by filename fragment
#
# Exit codes: 0 all passed · 1 a suite failed · 2 environment not available.
set -uo pipefail

PROJECT_ID="pixel-perfect-polish"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_${PROJECT_ID}}"
TESTS_DIR="supabase/tests/concurrency"
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
  echo "── $base (supabase_admin, two-session)"
  if docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q <"$sql" >/tmp/concurrency-test-out 2>&1; then
    echo "   PASS"
  else
    echo "   FAIL"
    sed 's/^/   | /' /tmp/concurrency-test-out
    fail=1
  fi
  ran=$((ran + 1))
done

echo
if [[ "$ran" -eq 0 ]]; then
  echo "No concurrency suites matched filter '${FILTER}'."
  exit 2
fi
if [[ "$fail" -ne 0 ]]; then
  echo "concurrency-tests: $ran suite(s) ran, FAILURES above."
  exit 1
fi
echo "concurrency-tests: all $ran suite(s) passed."
