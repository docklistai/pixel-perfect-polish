# Production Deployment Preparation

Evidence gate for the first DocklistAI production publish. This document does not authorise a deploy,
Supabase link, migration apply, environment change or customer account.

## Current audited state — 2026-07-14

- Source branch/commit audited: `main` at `8cc81cd23d895d5b5a63a926c52c8c9dc134a7ce`.
- Lovable project: `fc821881-5f55-4948-8357-044805330730`; audited as unpublished.
- No production URL or custom domain was evidenced.
- The private preview `/auth` probe reached Lovable's auth bridge, not application HTML, so it did
  not prove application CSP, cookies or authenticated cache behaviour.
- Deployment is intended to be Lovable-owned and Cloudflare-hosted. A GitHub-push trigger and
  reproducible standalone Wrangler deploy remain unevidenced.
- Historical Supabase identity in `docs/ai/phase-11-deployment.md` must be re-verified read-only; do
  not rely on historical migration-sync statements.

## Named owners required

- Release owner: `[OWNER TO CONFIRM]`
- Lovable/Cloudflare operator and backup: `[OWNER / BACKUP]`
- Supabase operator and backup: `[OWNER / BACKUP]`
- Incident/support owner and privacy/legal owner: `[OWNERS]`
- Go/no-go approvers: `[PRODUCT] [SECURITY] [DATABASE] [SUPPORT]`

## 1. Freeze and source evidence

```powershell
git branch --show-current
git rev-parse HEAD
git fetch origin
git rev-parse origin/main
git status --short
npm ci --dry-run
npm run predeploy
```

Record outputs. Stop if HEAD differs from the approved release commit, upstream differs unexpectedly,
or the worktree contains anything outside the approved release manifest. Never stage local settings,
Playwright artefacts, screenshots or unrelated changes.

Confirm Lovable builds from that exact repository/branch and determine whether push, merge or a
manual Publish action triggers preview/production. Save the build/deployment log and version ID.

## 2. Environments and domains

Create a written environment matrix before publishing:

```text
environment | app URL | Lovable project/version | Cloudflare Worker | Supabase project/ref
VITE_SUPABASE_URL | anon-key fingerprint | VITE_MANAGER_SIGNUP_ENABLED | release owner
```

Required app variables:

- `VITE_SUPABASE_URL` — public project URL for that environment.
- `VITE_SUPABASE_ANON_KEY` — public publishable key for that same project.
- `VITE_MANAGER_SIGNUP_ENABLED=false` — UI posture for invite-only private beta.

Never add a service-role key or other secret to a `VITE_` variable. A preview must not write to the
production Supabase project unless the release owner explicitly accepts and documents that risk.

Record the production domain, DNS owner, TLS result and whether the canonical host redirects safely.

## 3. Supabase read-only gate

Do not link or apply from an unapproved checkout. With the exact project already linked by the named
operator, capture:

```bash
supabase projects list
supabase migration list --linked
supabase db lint --linked
```

Compare every local/remote migration version in order. Review unapplied migrations for dependencies,
locks, destructive statements, security-definer privileges, RLS, indexes, views and grants. Run local
SQL and concurrency suites against a disposable stack before any remote apply.

The repository-side sequence currently appends these migrations after phase 35:

1. `20260714180000_phase36_manager_onboarding_invitations.sql`
2. `20260714181000_phase37_staff_portal_access_recovery.sql`
3. `20260714182000_phase38_department_scoped_time_exports.sql`

This list does not establish the remote gap. Recalculate that gap from the live, read-only migration
ledger immediately before release; do not describe it as an exact count until that evidence exists.

Manager onboarding invitations remain a database-owner operator action. The following calls are
prepare-only examples for an approved operator session; do not run them remotely during preparation:

```sql
select public.rpc_internal_create_manager_onboarding_invitation(
  p_email,
  p_expires_at,
  p_operator_reference,
  p_reason,
  p_invited_user_id := null
);

select public.rpc_internal_revoke_manager_onboarding_invitation(
  p_invitation_id,
  p_operator_reference,
  p_reason
);
```

Both RPCs are `security definer` with an empty `search_path` and no execute grant to `public`, `anon`
or `authenticated`. Before use, peer-review the parameters, retain the operator reference and reason,
then verify the resulting invitation or revocation with a workspace-scoped read-only query.

Dashboard evidence required:

- general/email manager signup disabled; anonymous sign-in enabled only because staff claim requires
  it; CAPTCHA/rate limits and anonymous cleanup configured;
- exact Site URL and allowed `/auth/reset` redirects for production/preview;
- production email sender/template delivery tested;
- backups/PITR entitlement, current backup timestamp, RPO/RTO decision and successful restore drill;
- Auth, PostgREST and Postgres logs accessible to named incident operators.

## 4. Application and edge gate

After an approved preview publish:

```bash
curl -i https://PREVIEW_HOST/health
curl -i https://PREVIEW_HOST/auth
curl -i https://PREVIEW_HOST/privacy
```

`/health` is an unauthenticated edge-liveness check only. It proves the Worker can answer; it does not
prove Supabase, Auth, email or business workflows are ready.

Verify:

- `X-Request-Id`, `X-Content-Type-Options`, referrer and permissions policies;
- HSTS on HTTPS;
- CSP is `Content-Security-Policy-Report-Only`, including a reported `frame-ancestors` policy;
  review Lovable preview browser violations before later enforcement or adding `X-Frame-Options`;
- dynamic HTML/JSON, redirects with cookies and error responses are `private, no-store`;
- Auth cookies are `Secure` in production and no authenticated response is cached/shared;
- static hashed assets retain their intended caching;
- branded errors show a customer-safe `err-...` reference and logs contain the matching redacted
  record without secrets or personal payloads.

## 5. Operational gate

- Configure an external GET check for `/health` and a separate authenticated manual smoke; alert the
  named incident owner and backup.
- Confirm access to Lovable deploy logs, Cloudflare Worker logs and Supabase logs.
- Run one controlled error in preview and find its `referenceId`.
- Rehearse `incident-and-support-runbook.md` and `data-rights-and-offboarding-runbook.md` locally.
- Confirm the monitored support mailbox, support hours/response target and manual incident/pilot log.
- Record backup restore evidence and the exact application rollback path.

## 6. Publish and rollback

Publish only after all approvers sign the evidence record. Record start/end time, version, operator,
environment changes, migration versions and smoke result.

Application rollback must be demonstrated before launch: republish the previous known-good Lovable /
Cloudflare version and prove `/health`, auth and a core manager read path. Database changes are
forward-only: use a reviewed corrective migration or restore decision, never reset production.
Environment rollback is separate from code rollback and must restore the recorded prior values.

Stop wider rollout on any cross-tenant concern, failed restore evidence, migration mismatch, missing
log access, cached authenticated response, broken manager/staff boundary, unreliable password reset,
or inability to identify/redeploy the prior application version.

## Sign-off record

```text
release_commit | origin_commit | Lovable_version | production_url | Cloudflare_version
Supabase_project_ref | remote_migrations | env_fingerprints | Auth_settings_evidence
predeploy_result | SQL_result | preview_smoke | header_cache_cookie_evidence
backup_id | restore_drill | rollback_version_and_result | log_error_reference
support_owner | incident_owner | approvers | go_no_go | published_at_utc
```

Open public signup, active billing, automated subscriptions/refunds, enterprise monitoring, external
notification delivery and unsupervised customer onboarding are explicit non-goals for this release.
