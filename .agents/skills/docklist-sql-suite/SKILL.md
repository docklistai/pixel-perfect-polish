---
name: docklist-sql-suite
description: Use when changing Supabase migrations, RLS policies, database functions or RPCs in Docklist, or when writing and running the local SQL, tenancy, adversarial and concurrency test suites. Covers this repo's local-Docker Supabase workflow, suite conventions and reporting. Use whenever a change needs database-level proof rather than application tests.
risk: high
source: project
date_added: "2026-09-09"
---

# Docklist SQL Suite

How database work is proved in this repo. General Postgres technique lives in
`supabase-postgres-best-practices`; tenancy invariants live in
`docklist-data-boundaries`. This file is the **workflow**.

## Local only — non-negotiable

All suites run against the **local Supabase Docker stack**, never a hosted
project.

- `scripts/sql-tests.sh` and `scripts/concurrency-tests.sh` exec into the local
  container. They refuse to target a remote database by design.
- `scripts/ops-http-tests.sh` is pinned to `http://127.0.0.1:54321`.
- **Never** run a linked/hosted `supabase db reset`, and never seed or mutate a
  hosted project to make a test pass.
- Requires the local stack running (`supabase start`).

## Commands

| Purpose | Command |
| --- | --- |
| All SQL suites | `npm run test:sql` |
| One suite family | `bash scripts/sql-tests.sh <substring>` |
| Concurrency suites | `npm run test:sql:concurrency` |
| Ops refusal over HTTP | `npm run test:ops:http` |

## Layout

- `supabase/migrations/` — ordered migrations (currently 63).
- `supabase/tests/*.sql` — suites, named by the phase/feature they prove.
- `supabase/tests/concurrency/*.sql` — second-session suites via `dblink`,
  run as `supabase_admin`.
- `supabase/tests/fixtures/` — shared fixture SQL.
- `supabase/seed.sql`, `supabase/config.toml`.

## Suite conventions

Follow the existing files — they are the pattern:

- Wrap the body in `begin;` and **never commit**; the session-end rollback leaves
  the seeded database untouched.
- Assert with `raise exception 'FAIL: …'` so a failure is unambiguous.
- Name the suite after the behaviour it proves, not the ticket.
- Keep one concern per suite; split rather than growing a suite past readability.

## What a database change must prove

Match the proof to the change:

- **New or altered policy** → workspace isolation, role/persona reachability,
  and at least one adversarial case (the caller who must *not* see or write it).
- **New table or view exposed to clients** → RLS present and effective; explicit
  column exposure; staff/manager boundary respected.
- **New RPC / database function** → authority checks, refusal path, and the
  SQLSTATE it raises.
- **Constraint or invariant** → the violating case is rejected, not silently
  coerced.
- **Locking, atomicity, publish/claim races** → a concurrency suite. If two
  sessions can interleave on this data, a single-session test is not proof.
- **Anything Ops-refusal related** → `npm run test:ops:http`, which proves
  PostgREST preserves refusal SQLSTATEs and never returns `40001`.

## Migration discipline

- One purpose per migration; include RLS where relevant.
- Never rewrite or reorder an applied migration — add a new one.
- Reset locally when test correctness genuinely requires a pristine database,
  and say so in the report.
- Migrations are **out of scope** unless the mission explicitly authorises
  schema work.

## Reporting

State in the completion report:

- migrations added (names) and the resulting local ledger count;
- suites added or changed;
- suite counts run and their results;
- whether concurrency and Ops HTTP suites ran, or why they were skipped.
