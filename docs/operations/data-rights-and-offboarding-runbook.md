# Data Rights, Correction and Offboarding Runbook

Manual private-beta process for access/export, correction, suspension, offboarding and
erasure/anonymisation. It does not create a self-service feature or authorise ad-hoc production SQL.

## Owners and decisions required

- Request owner: `[OWNER TO CONFIRM]`
- Backup reviewer: `[SECOND PERSON TO CONFIRM]`
- Privacy/legal owner and response deadline: `[LEGAL REVIEW REQUIRED]`
- Approved encrypted export location and expiry: `[OWNER TO CONFIRM]`
- Retention basis by record category: `[LEGAL REVIEW REQUIRED]`
- Production database/Auth operators: `[NAMED OPERATORS]`

No request is complete until the evidence log contains both request-owner and reviewer sign-off.

## Request record

Create a restricted case with:

```text
case_id | received_at_utc | request_type | requester | authority_evidence
workspace_id | staff_member_id_if_any | date_range | data_categories
legal_decision | operator | reviewer | backup_id | export_location_and_expiry
action | verification | customer_confirmation | completed_at_utc
```

Never put passwords, access codes, reset links, JWTs, cookies or Supabase keys in the case.

## Identity and authority

1. A workspace-wide request must come from an active owner through the address/contact route already
   recorded for that account, then receive a second confirmation.
2. A staff request must be verified through the employing business unless the privacy/legal owner
   approves another identity route.
3. Record the exact workspace UUID; never operate from a name or slug alone.
4. Resolve conflicts between a requester and the business through the privacy/legal owner. Support
   must not decide legal entitlement.

## Local read-only rehearsal

Run against the local Supabase stack first. Use a disposable workspace fixture, `psql` with
`ON_ERROR_STOP=1`, and a read-only repeatable-read transaction.

```sql
\set workspace_id '00000000-0000-0000-0000-000000000000'

begin transaction isolation level repeatable read, read only;

select id, slug, name, timezone, status, created_at, updated_at
from public.workspaces
where id = :'workspace_id'::uuid;

select id, user_id, role, status, invited_at, joined_at, created_at, updated_at
from public.workspace_memberships
where workspace_id = :'workspace_id'::uuid
order by created_at, id;

select id, membership_id, display_name, email, phone, role_name, employment_status,
       contract_type, contracted_minutes_per_week, start_date, end_date, created_at, updated_at
from public.staff_members
where workspace_id = :'workspace_id'::uuid
order by created_at, id;

rollback;
```

Inventory every current workspace-scoped table without maintaining a stale hard-coded list:

```sql
\set workspace_id '00000000-0000-0000-0000-000000000000'

select format(
  'select %L as table_name, count(id)::bigint as row_count from public.%I where workspace_id = %L::uuid;',
  table_name,
  table_name,
  :'workspace_id'
)
from information_schema.columns
where table_schema = 'public'
  and column_name = 'workspace_id'
order by table_name
\gexec
```

This query produces counts only. It does not prove the export is complete; compare its table list and
counts with the export manifest and the migrations at the deployment commit.

## Access and export

1. Confirm scope: workspace or individual, date range and requested categories.
2. Capture a repeatable-read snapshot and manifest containing table/category, row count and export
   time. Export explicit columns only and keep every query constrained by the confirmed workspace ID.
3. Include account/membership, staff, rota/published rota, availability/requests, leave, time/clock,
   notifications and audit/event data where legally appropriate.
4. Exclude password hashes, access-code digests, JWTs, internal secrets and another person's private
   data unless the legal decision explicitly requires it.
5. Save the package only to the approved encrypted location, share it through the approved channel,
   record expiry, and delete the support copy at expiry.
6. Reconcile each exported category against the read-only inventory counts before release.

The product's normal approved-hours export is suitable only for reviewed timesheet rows; it is not a
full workspace or data-subject export.

## Correction

1. Identify the source record, erroneous value, requested value and downstream records affected.
2. Prefer the existing manager UI for mutable staff/workspace/draft records.
3. Never rewrite immutable published snapshots, clock/time/leave event history or audit events.
4. Where history must be clarified, use the approved compensating workflow or record the correction
   in the restricted case until a reviewed product mechanism exists.
5. Compare before/after explicit fields and confirm staff/manager visibility with the requester.

Any correction requiring direct production SQL stops for a peer-reviewed operator script, backup
evidence and rollback plan. This document is not that script.

## Suspension

Use suspension for containment or an offboarding hold, not as proof of deletion.

1. Confirm workspace UUID, authority, reason and planned duration with the request owner and reviewer.
2. Capture current workspace/membership statuses and active sessions.
3. Use only the reviewed operator mechanism to suspend the workspace and relevant memberships.
4. Revoke affected sessions/codes through the approved Auth/access process.
5. Verify manager and staff access fail while unrelated workspaces continue to work.
6. Record how access can be restored and the date for retention/offboarding review.

## Offboarding

1. Suspend access and stop new operational writes.
2. Complete the authorised export and obtain customer confirmation.
3. Resolve unpaid commercial matters manually; billing automation is inactive.
4. Ask the privacy/legal owner to choose retention, anonymisation or erasure by category.
5. Revoke access codes/sessions and remove operator access no longer required.
6. Confirm the workspace is absent from active customer/support lists.
7. Retain only the minimum case evidence approved by the privacy/legal owner.

## Erasure or anonymisation

Direct workspace deletion is not currently a safe operator action: immutable event/audit triggers and
restrictive relationships protect historical records. Do not claim erasure has occurred merely
because access is suspended or a manager account is removed.

For each request:

1. Produce the workspace/table inventory and identify personal-data fields, free-text fields and Auth
   identities.
2. Obtain the documented legal retention decision for each category.
3. Design a one-purpose, peer-reviewed corrective migration/operator script for the exact tenant.
   It must preserve cross-tenant boundaries, immutable-history policy and required audit evidence.
4. Rehearse it against a disposable local copy; capture before/after counts and application smoke.
5. Take the required production backup/export and confirm restore evidence.
6. Execute only in an approved change window with the exact workspace UUID and two-person review.
7. Verify no active memberships, portal codes or sessions remain; search retained rows for the fields
   named in the erasure map; verify unrelated tenant counts are unchanged.
8. Have the privacy/legal owner approve any retained or pseudonymised records and the final response.

If steps 1–6 are unavailable, keep the workspace suspended, preserve the request and report the
request as blocked; do not improvise deletion.

## Completion evidence

- authority and scope verified;
- export manifest/count reconciliation recorded;
- backup/restore reference recorded before destructive work;
- operator and reviewer named;
- old sessions/access codes verified unusable;
- unrelated workspace control checks unchanged;
- customer and privacy/legal owner informed;
- temporary export deleted on schedule.

Self-service export/deletion, automatic retention jobs and a customer support platform are non-goals
for the supervised private beta.
