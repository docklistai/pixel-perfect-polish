# DocklistAI — Private-Beta Smoke Checklist

> Gate E. Manual runtime verification of the invite-only private-beta core loop,
> run against a real provisioned tenant (see
> [first-tenant provisioning](./private-beta-first-tenant-provisioning.md)).
> Extends the Phase 10 checklist with the **issue-code → claim** loop and the
> live identity / demo-containment honesty checks introduced for the beta.
>
> The automated layer (`npm run typecheck`, `npm run lint`, `npm run build`,
> `npm run quality`, `npm run test`, `bash scripts/sql-tests.sh`) covers static and
> DB-logic safety. This list covers runtime behaviour those cannot.
>
> A row passes only when behaviour matches **and** live/demo labelling is honest —
> no fake success toast, no demo data shown as live.

## Manager auth & live identity

- [ ] Manager signs in at `/auth` and lands on the dashboard (no public sign-up
      offered; `MANAGER_SIGNUP_ENABLED` stays off).
- [ ] Topbar workspace pill shows the **real workspace name**, not "Harbour View Hotel".
- [ ] Sidebar footer shows the real workspace name + monogram (not "HV / Main Workspace").
- [ ] Workspace menus show only the current workspace + a "switching comes later"
      note — no fake "The Anchor Inn" / "Riverside Brasserie" venues.
- [ ] Dashboard greeting reads "Good morning" with the **real workspace name** in
      the subtitle — no fabricated "Alex".
- [ ] User pill shows the signed-in manager's **email + role label**, not "Alex
      Thompson / General Manager".

## Staff list (source of truth)

- [ ] `/staff` shows the **live, workspace-scoped roster** (not the demo seed) for a
      provisioned manager.
- [ ] An empty live roster renders as an honest empty list, never the demo team.

## Access-code issuance (Gate A — keystone)

- [ ] **Staff → Access codes** opens the issuance dialog (the old fake "Add team
      member / Send invite" form is gone).
- [ ] **Issue workspace code** returns a real code shown once, with copy-to-clipboard.
- [ ] **Issue personal code** for a seeded, unclaimed staff member returns a real
      code shown once, with copy.
- [ ] Re-issuing replaces the previous code (no duplicate/stacked codes).
- [ ] Issuing for an **already-claimed** member is refused with an honest message
      (no code returned).
- [ ] Issuing for a member with **no membership to bind** is refused honestly.
- [ ] No fake success toast; codes are never generated or validated in the browser.

## Staff claim & portal (Gate A loop close)

- [ ] `/portal/access` with the issued **workspace code + personal code** succeeds
      and binds the session.
- [ ] Invalid codes show an honest error; no partial access.
- [ ] Repeated wrong attempts are throttled.
- [ ] Claimed staff see their **real identity** and only **published** shifts (no
      live draft, no manager-only data).

## Rota publish → portal

- [ ] Manager publishes a rota week; published snapshot reaches the claimed staff
      member's portal for that week.
- [ ] Deferred/unavailable rota actions are labelled honestly ("not available in
      live mode yet"), never faked.

## Leave & time

- [ ] Staff submits a leave request; manager sees and decides it (live RPCs).
- [ ] Staff clocks in/out; manager reviews/adjusts/approves time (live RPCs).

## Demo containment (Gate C)

- [ ] Sidebar marks **Team, Ops, Reports, Settings** with a "Demo" tag.
- [ ] Dashboard **Labour watch** figures carry a "Demo" tag (not shown as a live feed).
- [ ] Clicking a demo surface never presents fabricated data as live workspace data.

## Honesty guardrails (must all hold)

- [ ] No self-serve onboarding / public sign-up anywhere in the beta surface.
- [ ] No billing or payroll UI is reachable or implied as active.
- [ ] No real/autonomous AI: Manager support is bounded chips only; no fabricated
      stats, risk, or fit scores.
- [ ] No public `support@docklist.app` anywhere; beta contact is
      `docklistai@gmail.com` (landing CTA, footer Contact, topbar help).
