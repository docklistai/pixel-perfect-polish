# Phase 10 — Manual Smoke Checklist

Manual runtime verification for the DocklistAI MVP flows. The automated layer
(`npm run typecheck`, `npm run lint`, `npm run build`, `npm run quality`,
`npm run test`, `bash scripts/sql-tests.sh`) covers static, deterministic, and
DB-logic safety. This checklist covers the integration/runtime behaviour that the
automated layer deliberately does not (no Playwright/E2E in MVP scope).

Run against the local stack. Each flow is checked in **live** and **demo
fallback** mode where both exist. A check passes only when behaviour matches and
the live/demo labelling is honest.

How to read a row: do the action, confirm the expected result, confirm no fake
success toast and no demo-data-shown-as-live.

## Auth & access

- [ ] Manager sign-in lands on the dashboard for a claimed workspace member.
- [ ] Unauthenticated visit to a manager route redirects to `/auth` (no flash of data).
- [ ] A signed-in user with no workspace lands on `/no-access` (no tenant data shown).
- [ ] Staff (portal) identity cannot reach manager routes (`/rota`, `/staff`, `/settings`).

## Staff portal — claim & shifts

- [ ] `/portal/access` claim with a valid workspace + staff code succeeds and binds the session.
- [ ] Invalid code shows an honest error; no partial access is granted.
- [ ] Repeated wrong attempts are throttled (no unbounded retry).
- [ ] Claimed staff see only **published** shifts (no live draft, no manager-only data).
- [ ] Published-shift list matches the manager's last published rota for the week.

## Staff portal — clock & history

- [ ] Clock in → status reflects on shift; clock out → records hours.
- [ ] Break start/end adjusts worked time correctly.
- [ ] Time history shows the staff member's own entries only.
- [ ] In demo fallback, clock/history is clearly demo and does not claim live writes.

## Rota — read / write / publish / suggestions

- [ ] Live workspace rota reads back the saved week.
- [ ] Editing/adding/removing a draft shift persists (where live editing is enabled).
- [ ] Deferred live actions (templates / copy week / generate) show "Not available
      in live mode yet" — no fake success.
- [ ] Publish writes a versioned snapshot and notifies active staff.
- [ ] Open-shift suggestions assign role-matched staff, never double-book a day,
      show a transparent reason, and stay draft-only (no auto-publish).
- [ ] On live-read failure, Harbour View demo data shows as a labelled read-only fallback.

## Leave — submit / approve / decline / reopen

- [ ] Staff leave submission creates a request visible to the manager.
- [ ] Manager approve / decline records the decision and attribution.
- [ ] Reopen returns the request to a pending state.
- [ ] Leave impact text is derived from live coverage (no fabricated named cover).

## Time — approve / reject / reopen / adjust / export

- [ ] Approve a timesheet row → status + approver attribution recorded.
- [ ] Reject / reopen transitions behave and are reversible where intended.
- [ ] Manager adjust dialog writes corrected wall-clock times (DST-correct) and break.
- [ ] Approved-hours export produces the expected payroll-ready rows (no `*` columns).
- [ ] Time flagging is honestly gated ("Not available in live mode yet").

## Notifications

- [ ] Portal notifications list reads live and mark-read clears the unread state.
- [ ] Manager topbar unread count is honest (matches real unread, no fabricated badge).

## Dashboard / topbar honesty

- [ ] Dashboard KPI/attention surfaces reflect live store data or are labelled demo.
- [ ] No surface presents demo/static numbers as live live-derived intelligence.

## AI honesty / no fake model behaviour

- [ ] Manager support drawer offers bounded, live-data chips — no free-text Q&A.
- [ ] No fake spinner / "reviewing your data" / fabricated history.
- [ ] No fabricated stats (£, %, fit scores, read-rates, coverage claims) presented as fact.
- [ ] No AI risk/health/sickness signals or staff ranking in any AI surface.
- [ ] Pre-publish review / rota issues show evidence rows and route into real screens.

## Harbour View demo fallback

- [ ] With live reads unavailable, the Harbour View world stays fully playable.
- [ ] Demo mode never offers writes that silently no-op as success.

## Mobile smoke

- [ ] Rota grid is usable / contained on a narrow viewport (no horizontal overflow break).
- [ ] Staff portal tabs and drawers are contained and tappable on mobile.
- [ ] Settings tabs / long pages scroll without overflow breakage.
