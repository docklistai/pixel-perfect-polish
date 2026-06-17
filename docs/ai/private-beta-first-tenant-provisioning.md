# DocklistAI — First-Tenant Provisioning Checklist (Private Beta)

> Gate D. Operational runbook for standing up the **first invite-only beta
> workspace** in the remote Supabase project. This is a manual, one-tenant-at-a-time
> process — there is **no self-serve onboarding, no admin tooling, and no
> provisioning script** in scope. Everything below is done by hand against the
> existing schema; **no migrations, no schema/RLS changes**.

## Prerequisites

- Remote Supabase project is live and all migrations are applied and in sync
  (through `20260612090700`).
- You have Supabase dashboard / SQL editor access (owner-level) for the project.
- The app is deployed (or running locally against the remote project) with
  `MANAGER_SIGNUP_ENABLED = false` — managers are seeded by us, never self-signup.

## What you are creating

A single workspace with one owner/manager who can sign in, plus a seeded staff
roster the manager can issue portal codes against. The end state is the live core
loop: **manager sign-in → real workspace identity → issue codes → staff claim →
leave/time → manager review.**

## Steps

1. **Create the workspace** — insert one `public.workspaces` row.
   - `name` (real venue name — this is what the topbar/sidebar/greeting now show),
     `slug` (lowercase, hyphenated), `timezone` (default `Europe/London`),
     `status = 'active'`.
   - Record the returned `workspace_id`.

2. **Create the manager auth user** — in Supabase Auth, create one user with the
   manager's real email and a temporary password (or invite). Record the `user_id`.
   - There is no password-reset UI yet; communicate credentials directly.

3. **Create the manager membership** — insert one `public.workspace_memberships`
   row: `workspace_id`, `user_id`, `role = 'owner'` (or `'manager'`),
   `status = 'active'`, `joined_at = now()`.
   - The single active membership is what `authState` / `activeManagerWorkspace`
     resolve to — no workspace-selection prompt for a one-workspace manager.

4. **Seed departments (optional but recommended)** — insert `public.departments`
   rows (`workspace_id`, `name`) so staff rows can reference real departments and
   the Staff table shows real department names instead of "Unassigned".

5. **Seed the staff roster** — insert `public.staff_members` rows for the real
   team. For each: `workspace_id`, `display_name`, `role_name`,
   `employment_status = 'active'`, optional `email`, `department_id`,
   `contract_type`, `contracted_minutes_per_week`.
   - **Each staff member who needs portal access must also have a `staff` membership
     row to bind to.** Insert a `public.workspace_memberships` row
     (`role = 'staff'`, `status = 'invited'`, `user_id = NULL`) and set the
     `staff_members.membership_id` to that membership's id.
   - The personal-code RPC refuses any staff member with no membership
     (`55000 … no workspace membership to bind`) or one already linked to a user.

6. **Issue the workspace code** — sign in to the app as the manager →
   **Staff → Access codes → Issue workspace code**. Copy the plaintext (shown once).
   - This calls `rpc_issue_workspace_portal_code(workspace_id)`; the workspace id is
     resolved server-side from the session, never trusted from the browser.

7. **Issue each personal staff code** — same dialog → **Personal staff code** →
   select the staff member → **Issue personal code**. Copy each (shown once).
   - This calls `rpc_issue_staff_portal_code(workspace_id, staff_member_id)`.
   - Re-issuing replaces the previous code. A claimed member cannot be re-issued.

8. **Distribute codes** — give each staff member the **workspace code + their own
   personal code** over a trusted channel.

9. **Staff claim** — each staff member opens **`/portal/access`**, enters the
   workspace code + their personal code. On success an identity is bound (anonymous
   session upgraded server-side) and they land in the portal seeing only published
   shifts.

## Verification

Run the [private-beta smoke checklist](./private-beta-smoke-checklist.md)
end-to-end against this tenant before inviting the pilot.

## Out of scope (do not do for the beta)

- No billing, payroll, or public sign-up.
- No client-side staff creation (seeding is manual SQL only; the browser holds an
  RLS insert grant but must not be used as the creation path).
- No bulk-invite tooling, email sending, or onboarding wizard.
- No migrations, RLS, or RPC changes — provisioning uses the existing schema only.
