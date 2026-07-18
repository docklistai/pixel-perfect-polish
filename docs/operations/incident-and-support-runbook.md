# Private-Beta Incident and Support Runbook

Minimum process for 3–10 supervised DocklistAI customers. This is not a promise of 24/7 support,
an SLA, or a public status service.

## Owners to confirm before the first customer

- Incident owner: `[OWNER NAME / MOBILE / TIME ZONE]`
- Backup incident owner: `[BACKUP NAME / MOBILE / TIME ZONE]`
- Support mailbox owner: `[OWNER]`; current address comes from `src/config/commercial.ts`
- Privacy/legal escalation: `[LEGAL OR PRIVACY OWNER]`
- Supabase operator: `[NAMED OPERATOR]`
- Lovable/Cloudflare operator: `[NAMED OPERATOR]`
- Support hours and acknowledgement target: `[OWNER TO CONFIRM]`

One person may hold several roles, but every role needs a named backup before paid pilot.

## Intake

1. Receive requests through the monitored support mailbox or the pilot's agreed direct channel.
2. Open one row in the manual incident/support log. A shared restricted document is sufficient.
3. Record the customer, workspace ID, reporter, time, affected workflow and customer-visible impact.
4. Ask for the page, local time, browser/device and any visible `err-...` reference.
5. Never request passwords, access codes, session cookies, reset links, database keys or screenshots
   containing staff pay/contact data.

Minimum log fields:

```text
case_id | opened_at_utc | customer | workspace_id | severity | owner | backup
reporter | affected_flow | customer_impact | error_reference | deployment_version
containment | customer_updates | resolution | data_correction | closed_at_utc | follow_up
```

## Severity and response

- **P0:** suspected cross-tenant exposure, authentication bypass, destructive data loss or active
  compromise. Stop onboarding and publishing immediately; notify incident, backup and privacy/legal
  owners. Preserve evidence. Do not experiment in production.
- **P1:** production unavailable, publish/clock/time/leave workflows broadly unusable, or repeated
  errors preventing a pilot customer from operating. Assign one owner and start a customer update
  cadence of `[OWNER TO CONFIRM]`.
- **P2:** one customer or workflow is degraded with a safe workaround. Record, acknowledge and agree
  the next update.
- **P3:** question, copy issue or low-impact defect. Handle in normal pilot support review.

## Triage evidence

Use the smallest data set needed:

- Search app logs for the exact `referenceId`. App error records contain operation, error type,
  safe error code, HTTP method and pathname; they intentionally omit messages, query strings,
  headers, payloads, user IDs and workspace data.
- Check the Lovable deployment result and Cloudflare Worker errors for the affected time.
- Check Supabase Auth, PostgREST and Postgres logs for the same time and RPC name.
- Check the active deployment commit/configuration and whether the issue is production-only.
- Confirm whether an in-app notification row exists and whether `read_at` is set. DocklistAI does
  not currently have an external email/push notification delivery system.

Do not paste raw production logs into public chat or an unrestricted pilot document. Redact emails,
phones, names, access codes, JWTs, cookies, request bodies and SQL parameters.

## Containment

Choose the least destructive reversible action:

1. Pause new customer onboarding and deployments.
2. Tell the affected customer to stop the unsafe workflow if continuing could compound data.
3. Roll back the application through the verified Lovable/Cloudflare version path when the fault is
   deployment-only.
4. Suspend a workspace or identity only through the reviewed operator process in
   `data-rights-and-offboarding-runbook.md`.
5. For suspected data exposure, preserve logs and notify the privacy/legal owner before changing or
   deleting evidence.

Never reset a remote database, run an ad-hoc destructive statement, expose a service-role key,
delete Auth users first, or use another customer's workspace to reproduce a problem.

## Customer communication

- State the observed impact, workaround, owner and next update time.
- Do not speculate about cause, promise a deadline, claim no data impact before verification, or
  include another customer's information.
- For recovery or correction, describe exactly which record and period will change and obtain the
  authorised manager's confirmation.
- Record every outbound update in the incident row.

## Recovery and correction routing

- Manager password reset: use the documented Supabase recovery flow and approved redirect URL.
- Staff access recovery: use the reviewed staff recovery procedure; verify the old session loses
  access. Never overwrite a linked identity by hand.
- Data correction/export/offboarding: follow `data-rights-and-offboarding-runbook.md`.
- Database corruption or migration fault: stop and require backup/restore and database-owner review.

## Closure

Close only when the customer confirms recovery or the owner has reproduced the expected state.
Record:

- timeline and root cause;
- affected workspaces and data categories;
- exact corrective action and verification evidence;
- whether notification, legal/privacy or customer follow-up is required;
- prevention owner and due date.

Review open P0–P2 cases and failed RPC/Auth log searches weekly during the pilot. A ticket platform,
SIEM, enterprise APM and public status page are explicit non-goals for the first 3–10 customers.
