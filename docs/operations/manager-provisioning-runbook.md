# Manager Provisioning Runbook

How a pilot manager gets a Docklist workspace. Every step uses authority that already
exists — no new SQL function, no self-serve manager signup, no change to the invite-only posture.

Rehearsed against a local Supabase stack during Phase 66. Every refusal message quoted below was
produced by running the call, not read off the source.

## Why this is a manual procedure

Manager signup is closed in two independent places, and both must stay closed:

- **UI** — `VITE_MANAGER_SIGNUP_ENABLED=false` hides the sign-up form.
- **Database** — `rpc_bootstrap_workspace` refuses unless the caller holds a matching active row in
  `manager_onboarding_invitations`.

The UI flag is a posture. The database is the boundary. A person who signs up without an invitation
gets an Auth identity with no workspace, no membership and no readable data; they land on
`/no-access`.

`rpc_internal_create_manager_onboarding_invitation` and
`rpc_internal_revoke_manager_onboarding_invitation` are `security definer` with an empty
`search_path` and **no execute grant to `public`, `anon` or `authenticated`**:

```
rpc_internal_create_manager_onboarding_invitation | postgres=X/postgres
rpc_internal_revoke_manager_onboarding_invitation | postgres=X/postgres
```

They are database-owner procedures. Run them from an approved operator SQL session only.

## Before you start

- The exact manager email, confirmed with the customer by a second channel. It is stored normalised
  (lower-cased, trimmed) — `PilotManager@Example.test` is stored as `pilotmanager@example.test`.
- An operator reference and a reason. Both are mandatory and both are retained as evidence.
- An expiry inside the next 90 days.
- Production origin confirmed, and the Supabase Auth **Site URL** and reset redirect allowlist
  pointing at it — otherwise the manager's confirmation and password-reset links go nowhere.

## 1. Issue the invitation

```sql
select public.rpc_internal_create_manager_onboarding_invitation(
  p_email            => 'manager@venue.example',
  p_expires_at       => now() + interval '14 days',
  p_operator_reference => '<operator-name-or-ticket>',
  p_reason           => 'Supervised free pilot — <venue name>',
  p_invited_user_id  => null
);
```

Returns the new invitation id. Record it.

`p_invited_user_id` binds the invitation to one exact Auth user. Leave it `null` when the manager has
no account yet — which is the normal case. Only pass a user id for someone who has already signed up,
and only when that identity is permanent (not anonymous), email-confirmed, and carries the same
email; anything else is refused.

Issuing a second invitation for the same email **supersedes** the first rather than duplicating it:
the open one is revoked with reason `Superseded by replacement invitation`, and the evidence is kept.

## 2. Verify what you issued, read-only

```sql
select id,
       normalized_email,
       expires_at,
       expires_at > now() as active,
       issued_by_operator,
       issue_reason,
       consumed_at is null as unconsumed,
       revoked_at is null  as not_revoked
from public.manager_onboarding_invitations
where normalized_email = 'manager@venue.example'
order by created_at desc
limit 5;
```

Confirm the email is exactly right before telling the customer to sign up. A typo means the manager
signs up successfully and is then refused at bootstrap, which is a confusing failure to explain.

## 3. The manager signs up

Send them the production URL. They choose **Manager**, then create an account with the invited email.

Manager signup is hidden while `VITE_MANAGER_SIGNUP_ENABLED=false`. For the supervised pilot, either
set that variable to `true` in the production build environment for the onboarding window, or have
the manager use the password-reset flow against a pre-created identity. **The database invitation
remains the security boundary either way** — the flag only decides whether the form is visible.

## 4. The manager confirms their email

Supabase sends a confirmation email (`mailer_autoconfirm` is off). Bootstrap refuses an unconfirmed
identity, so this step is not optional:

> `workspace setup requires a permanent manager identity with a confirmed email`

If the email does not arrive: check the Supabase Auth logs, the sender configuration, and that the
Site URL is the production origin rather than `localhost`.

## 5. The manager creates their workspace

After confirming, they land on `/no-access` with the **Create your workspace** form
(`BootstrapWorkspaceForm`). Submitting calls `rpc_bootstrap_workspace`, which in one transaction:

1. checks the caller is permanent, confirmed and has an email;
2. checks they hold no active membership already;
3. consumes their invitation;
4. creates the workspace, its first location and its first department;
5. creates their `owner` membership.

All five, or none.

## 6. Verify the result, read-only

```sql
select w.id            as workspace_id,
       w.name,
       w.slug,
       m.role,
       m.status,
       l.name          as location_name,
       l.timezone,
       d.name          as department_name
from public.workspace_memberships m
join public.workspaces   w on w.id = m.workspace_id
join public.locations    l on l.workspace_id = w.id
join public.departments  d on d.workspace_id = w.id
where m.user_id = (
  select id from auth.users where lower(email) = 'manager@venue.example'
);
```

Expect exactly one `owner` membership with status `active`, one location and one department.

Then confirm the invitation was consumed:

```sql
select consumed_at, consumed_by_user_id, consumed_workspace_id
from public.manager_onboarding_invitations
where normalized_email = 'manager@venue.example'
order by created_at desc limit 1;
```

## 7. Revoke, when something goes wrong

Only an **unconsumed** invitation can be revoked. Once a workspace exists, revoking is not the
remedy — offboarding is (see `data-rights-and-offboarding-runbook.md`).

```sql
select public.rpc_internal_revoke_manager_onboarding_invitation(
  p_invitation_id      => '<invitation-uuid>',
  p_operator_reference => '<operator-name-or-ticket>',
  p_reason             => 'Wrong email supplied by customer'
);
```

Returns `true` when one row was revoked, `false` when there was nothing open to revoke — a `false` is
information, not an error. Issuer, reason and revocation evidence are all retained; nothing is
deleted.

## Refusals and what they mean

Every message below was produced by running the call against a local stack.

| Message                                                                            | Meaning                                                                          | Action                                                 |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `a normalized manager email is required`                                           | `p_email` is empty, has no `@`, or is outside 3–320 characters                   | Re-check the address with the customer                 |
| `invitation expiry must be within the next 90 days`                                | `p_expires_at` is null, in the past, or more than 90 days out                    | Choose an expiry inside the window                     |
| `operator reference and reason are required`                                       | One of them is blank or over its length limit                                    | Supply both; they are the audit trail                  |
| `explicit invited user must be a permanent confirmed identity with the same email` | `p_invited_user_id` is anonymous, unconfirmed, missing, or has a different email | Pass `null` and match on email instead                 |
| `workspace bootstrap requires an authenticated user`                               | Bootstrap was called with no session                                             | The manager must sign in first                         |
| `workspace setup requires a permanent manager identity with a confirmed email`     | Anonymous session, or email not yet confirmed                                    | Confirm the email; do not use the staff portal session |
| `caller already has an active workspace membership`                                | This person already belongs to a workspace                                       | Nothing to do — they already have access               |
| `an active private-pilot manager invitation is required`                           | No open invitation matches their email                                           | Re-check step 1; the stored email is lower-cased       |
| `workspace name must be between 1 and 120 characters`                              | Bootstrap form input                                                             | Manager retries with a valid name                      |
| `timezone is not valid`                                                            | Not a recognised zone name                                                       | Use a real IANA zone, e.g. `Europe/London`             |

## Staff are provisioned separately

Staff never use this flow and never need an email address. The manager adds them under **Staff**, then
issues portal access codes (`AccessCodesDialog`). Staff sign in at `/portal/access` with the workspace
code plus their own code, which binds an anonymous identity to their membership. Anonymous sign-in
must stay enabled in Supabase Auth for that to work.

## Rehearsal

Rehearse against a local stack, never against production, and always inside a transaction you roll
back:

```bash
docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres <<'SQL'
begin;
select public.rpc_internal_create_manager_onboarding_invitation(
  'rehearsal@example.test', now() + interval '14 days', 'rehearsal', 'Runbook rehearsal'
) as invitation_id \gset
select normalized_email, expires_at > now() as active, consumed_at is null as unconsumed
from public.manager_onboarding_invitations where id = :'invitation_id';
select public.rpc_internal_revoke_manager_onboarding_invitation(
  :'invitation_id', 'rehearsal', 'Rehearsal only'
) as revoked;
rollback;
SQL
```

Do not create a real hosted invitation as a smoke test. There is no disposable fixture for it, and a
consumed invitation cannot be un-consumed.
