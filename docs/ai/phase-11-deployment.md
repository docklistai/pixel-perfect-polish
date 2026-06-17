# Phase 11 — Deployment & Infrastructure

Deployment-readiness reference for the DocklistAI MVP. Written during Phase 11
(implementation following the Phase 11 audit). Scope is documentation + safe
tooling only: **no product, schema, or remote-DB changes were made.** Remote
verification commands run during this phase were read-only and are reported in
the "Supabase remote verification" section.

HEAD at authoring: `c98e006` (Phase 10 quality gates).

## Hosting target

- **Cloudflare Workers (SSR)** via `@cloudflare/vite-plugin` (v1.36.x) + TanStack
  Start, bundled through `@lovable.dev/vite-tanstack-config`.
- SSR entry: `src/server.ts` — a thin wrapper around
  `@tanstack/react-start/server-entry` that normalizes catastrophic SSR errors
  into a branded 500 page. `vite.config.ts` redirects the Start server entry to
  it; `wrangler.jsonc` sets `main: src/server.ts`.
- Worker runtime config (`wrangler.jsonc`): `compatibility_date 2025-09-24`,
  `compatibility_flags: ["nodejs_compat"]`.

## Package manager

**npm is canonical** for development, the quality gates, and `predeploy`.
`package-lock.json` is the source-of-truth lockfile (added in Phase 10 alongside
Vitest). Always use `npm ci` / `npm install`.

`bun.lock` is **retained, not active.** It predates the npm lockfile and may be
consumed by the Lovable platform build. Removing it is **not verified safe** and
is therefore deferred until the Lovable build pipeline's package manager is
confirmed. Do not run `bun install` for local work — it would diverge from
`package-lock.json`. (Follow-up: once Lovable's pipeline is confirmed to use npm,
delete `bun.lock` in a dedicated change.)

## Build & deploy commands

### Build

```bash
npm run build        # vite build → dist/client (static) + dist/server/server.js (worker)
```

### Pre-deploy gate

```bash
npm run predeploy    # typecheck && lint && build && quality && test
```

`predeploy` chains every **non-Docker** gate. It does **not** include
`npm run test:sql`, which needs a running local Supabase container (Docker) and
is a local DB-change verification gate, not a deploy gate. Run `test:sql`
separately whenever migrations or DB logic change:

```bash
supabase start && npm run test:sql
```

### Deploy — owned by the Lovable pipeline
**Deployment is performed by the Lovable build/publish pipeline, not by a raw
`wrangler deploy` from this checkout.** The Lovable-context build enables the
Cloudflare deploy plugin, which generates `dist/server/wrangler.json`;
`.wrangler/deploy/config.json` (gitignored) then redirects `wrangler deploy` to
that generated config.

A plain local `npm run build` logs `No Lovable context detected — skipping nitro
deploy plugin` and does **not** emit `dist/server/wrangler.json`, so a manual
`npx wrangler deploy` fails with:

```text
There is a deploy configuration at ".wrangler/deploy/config.json".
But the redirected configuration path it points to, "dist/server/wrangler.json", does not exist.
```

Do not add a repo `deploy` script until a manual deploy path is verified to
produce the generated worker config. Until then, publish via Lovable. See
"Known limitations".

## Environment variables

Only two app env vars, both **public / browser-safe**:

| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |

Read in one place: `src/lib/supabase/env.ts` (returns `null` when unset so the
shell falls back to a safe signed-out state). `VITE_`-prefixed vars are bundled
into the client by Vite — this is expected for these two values only.

### Where they must be set

- **Local:** `.env.local` (gitignored). Copy from `.env.example`.
- **Preview & production:** set in the **Cloudflare project** environment for the
  Worker (and/or the Lovable project settings that feed the build). Preview and
  production must point at the correct Supabase project for each environment —
  **do not let a preview deploy write to the production Supabase project.**

### Never expose service-role keys

- **Never** add `SUPABASE_SERVICE_ROLE_KEY` (or any `SUPABASE_SERVICE*` secret)
  to `.env*`, to any `VITE_`-prefixed var, or to client-reachable source.
- The `quality` gate enforces this (`no service_role / SUPABASE_SERVICE key`).
- All privileged DB work goes through `SECURITY DEFINER` RPCs or per-request
  server-fn handlers using the anon key + the caller's session cookie — never a
  service-role key in the app.

## Supabase remote verification

Linked project: `gdprvrvcwjpibmnjvtyd` (DocklistAI, West Europe / London).

### Verified during Phase 11 (read-only)

- **Migrations in sync.** `supabase migration list --linked` shows local and
  remote both at `20260612090000 … 20260612090700` — i.e. the Phase 7 portal
  claim throttle (`20260612090700`) **is applied remotely.** No migration apply
  is needed before deploy.
- **RPC / RLS objects present (by transitivity).** The Phase 3–7 RLS policies,
  staff-safe views, and `SECURITY DEFINER` RPCs are defined in migrations
  `…090300`, `…090500`, `…090600`, `…090700`, all confirmed applied. Applied
  migrations mean those objects exist on remote.

### Must be verified manually before relying on the portal in prod

- **Anonymous sign-ins enabled.** The staff portal access-code claim
  (`rpc_claim_staff_portal_access`) binds an anonymous-auth identity, so the
  remote project must have anonymous sign-ins **on**. This is an Auth project
  setting, **not** captured in migration state, so it cannot be confirmed from
  `migration list`. Verify one of:
  - Dashboard → Authentication → Sign In / Providers → **Anonymous sign-ins** = enabled.
  - Management API (needs a personal access token):
    ```bash
    curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      https://api.supabase.com/v1/projects/gdprvrvcwjpibmnjvtyd/config/auth \
      | grep -i external_anonymous_users_enabled
    ```
  `supabase/config.toml` sets `enable_anonymous_sign_ins = true` for the **local**
  stack only; it does not change the remote.

### Re-running migration verification

```bash
supabase migration list --linked     # read-only; compares local vs remote
```

Do **not** run `supabase db reset`, `supabase db push`, or apply migrations as
part of deploy unless a new migration is intentionally being shipped and
separately reviewed.

## Rollback notes

- **App / Worker:** roll back by re-publishing the previous good commit through
  the Lovable pipeline (or `wrangler rollback` / redeploying the prior version
  once a verified manual deploy path exists). The Worker is stateless — rolling
  back the deploy is sufficient; no app-side data migration is involved.
- **Database:** migrations are forward-only and already applied through
  `…090700`. There is **no destructive down-migration** in this phase and none
  should be run. A bad schema change would require a new corrective migration,
  reviewed separately — never an ad-hoc remote edit or reset.
- **Env vars:** rolling back code does not roll back env/secret changes; re-set
  them in the Cloudflare/Lovable environment if they were changed.

## Post-deploy smoke checklist

After a deploy, run the relevant subset of
[`phase-10-smoke-checklist.md`](./phase-10-smoke-checklist.md) **against the
deployed URL** (live mode). Minimum subset:

- **Auth / no-access** — manager sign-in lands on dashboard; unauthenticated
  manager-route visit redirects to `/auth` (no data flash); user with no
  workspace lands on `/no-access`; staff identity cannot reach `/rota`,
  `/staff`, `/settings`.
- **Staff portal claim** — valid workspace + staff code claims and binds the
  session; invalid code shows an honest error with no partial access; repeated
  wrong attempts are throttled.
- **Portal shifts / clock** — claimed staff see only **published** shifts (no
  draft, no manager-only data); clock in/out and break adjust worked time;
  history shows own entries only.
- **Rota publish** — publish writes a versioned snapshot and notifies active
  staff; deferred live actions show "Not available in live mode yet" (no fake
  success).
- **Leave / time flows** — leave submit → manager approve/decline records
  attribution; timesheet approve/adjust writes correct DST wall-clock + break;
  approved-hours export produces payroll-ready rows (no `*` columns).
- **Dashboard / topbar honesty** — KPI/attention surfaces reflect live store
  data or are labelled demo; topbar unread count is honest.
- **AI honesty** — Manager support drawer offers bounded live-data chips only
  (no free-text Q&A, no fake spinner, no fabricated stats, no risk/health/fit
  scoring).
- **Demo fallback** — with live reads unavailable, Harbour View stays playable
  and never offers writes that silently no-op as success.
- **Mobile sanity** — rota grid, portal tabs/drawers, and settings pages contain
  without horizontal overflow on a narrow viewport.

A row passes only when behaviour matches **and** live/demo labelling is honest.

## Known limitations & deferrals

- **Manual deploy path unverified.** Deployment currently relies on the Lovable
  pipeline to generate `dist/server/wrangler.json`. A standalone
  `wrangler deploy` from a plain `npm run build` does not work yet. Wiring a
  verified manual deploy (force-enabling the deploy plugin or generating the
  worker config) is deferred and must be tested before any non-Lovable deploy.
- **`bun.lock` retained.** Kept until Lovable's pipeline package manager is
  confirmed; delete in a dedicated change once npm is confirmed there.
- **Anonymous-identity cleanup.** Each portal claim creates an anonymous
  Supabase user; no cleanup job exists yet. Operational follow-up (post-MVP).
- **No CI.** Gates are run manually / via `npm run predeploy` by intent for the
  MVP. CI is a recommended later addition, not part of this phase.
- **No E2E / Playwright** in MVP scope — runtime coverage is the manual smoke
  checklist above.
- **Real AI is out of scope.** All AI surfaces are deterministic (Phase 9 ADR).
  Real model integration requires server-side boundaries, rate limits, evals,
  logging, and refusal tests first, with model keys held **server-side only**
  (never `VITE_`).
