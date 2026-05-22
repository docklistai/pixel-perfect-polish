# ADR-0001: DocklistAI 50/30/20 Product Boundaries

## Status

Accepted

---

## Context

DocklistAI is scheduling-first workforce management for hospitality teams. As the
product surface grew, several pages drifted toward features outside their purpose
(BI-style reporting, social-feed behaviour, generic AI). An audit confirmed the app
is now aligned with an agreed product direction, but that direction lived only in
commit messages and code comments.

This ADR makes the direction durable. Any agent doing frontend or product work must
read it before starting, and check changes against it before finishing.

---

## Decision

DocklistAI is built and maintained as a **scheduling-first** product with a fixed
weighting of effort and scope: **50% scheduling, 30% lightweight workforce admin,
20% AI-assisted manager support**. Every page has a single defined purpose. Features
that do not serve that purpose are not added, even if technically easy.

---

## Product split

### 50% — Scheduling

The core of the product. Rota is the anchor: planning shifts, coverage, conflicts,
working-time checks, and publishing. Most product depth belongs here.

### 30% — Workforce admin / HR

Lightweight and operational only. Staff records, leave, time/attendance, and team
announcements. It supports scheduling — it is not a full HR system.

### 20% — AI-assisted manager support

Review-first assistance that helps a manager see what to check. It surfaces and
explains; it never decides or acts.

---

## Page boundaries

Each page does one job. It does not absorb the job of another page.

- **Rota** — the scheduling anchor. Plan, cover, check, and publish shifts.
- **Staff** — operational staff records: roles, status, availability, documents,
  admin readiness. Factual operational data only. Admin-readiness indicators are
  allowed; judgement, morale, performance, disciplinary, or sentiment scoring is not.
- **Leave** — request, review, and cover leave so shifts stay covered.
- **Time** — review and approve worked hours; produce payroll-ready exports.
- **Reports** — review labour and coverage, then act elsewhere. See section below.
- **Team** — manager-to-team broadcast announcements with acknowledgement tracking.
- **Ops** — operational handover: incidents, tasks, and follow-ups.
- **Dashboard** — mirrors summaries and links out. It does not author comms or own
  metrics; it reflects what other pages own.
- **Notifications** — aggregate updates from other pages. They may aggregate,
  deduplicate, and track read state, but they do not author content or own
  business rules.
- **Staff Portal** — staff-safe receipt only: published rota and allowed
  staff-facing content. Never manager notes, payroll, internal review notes, or
  private staff fields.
- **Settings** — workspace settings, policies, and preferences.

---

## Explicit non-goals

DocklistAI is **not**, and will not become:

- A business-intelligence, finance-analytics, or forecasting tool.
- An HR analytics or performance-management system.
- A social feed, Slack clone, chat app, or engagement platform.
- A learning-management system (LMS) or event planner.
- An AI chatbot or autonomous decision-maker.
- A payroll system.

If a request points toward any of the above, stop and raise it — do not build it.

---

## AI rules

- AI is **review-first manager support**. It highlights what to check and explains
  why, in plain English.
- AI **never** makes autonomous decisions, mutates data, or publishes anything.
- No AI chatbot. No dedicated AI route or page.
- AI surfaces are deterministic where possible and route the manager into existing
  review flows. They do not invent a parallel workflow.

---

## Communication model

- Manager-to-team communication is **broadcast announcements with acknowledgement
  tracking** only.
- No replies, threads, reactions, direct messages, or presence/engagement metrics.
- Team announcements are authored on the Team page. Other pages may link to or
  summarise them, but do not author comms of their own.

---

## Reports boundary

- Reports is **labour and coverage review** — a place to review, filter, and export,
  not a place to mutate rota, time, or leave data.
- Allowed: labour vs. target, coverage, absence and time-approval review points.
- Not allowed: BI dashboards, finance analytics, HR analytics, forecasting, or
  AI-generated insights.
- Reports points the manager back to Rota, Time, or Leave to take action.

---

## Payroll / billing boundary

- Billing remains **disabled** until the product is ready.
- Payroll **integrations** remain **disabled**.
- Payroll-ready **exports** are allowed — exporting approved hours in a usable
  format is in scope; connecting to a payroll provider is not.

---

## Data honesty rules

- Do not fake connectedness by wiring unrelated mock datasets together to look
  integrated.
- Mock data must represent one honest slice of state, not a staged illusion.
- Do not present invented metrics as real. Demo/mock values must be clearly mock in
  intent (in code and, where shown, in copy).
- Every workspace query must be workspace-scoped. Never use `select('*')`.

---

## Future work must check

Before frontend or product work, confirm the change:

1. Serves the defined purpose of exactly one page.
2. Stays inside the 50/30/20 split.
3. Does not match any explicit non-goal.
4. Keeps AI review-first and non-autonomous.
5. Keeps communication to broadcast + acknowledgement only.
6. Keeps Reports to labour/coverage review.
7. Respects the payroll/billing boundary.
8. Does not leak manager-only data into the Staff Portal.
9. Does not fake connectedness between mock datasets.

If any check fails, stop and raise it before building.

---

## Consequences

- The product stays focused and easy to explain: scheduling-first workforce
  management for hospitality.
- Some reasonable-sounding feature requests will be declined or deferred because
  they fall outside the split. This is intended.
- Scope creep becomes visible: any drift can be named against a specific boundary
  in this ADR.
- This ADR is the reference point. If the product direction genuinely changes, do
  not silently violate it — supersede this ADR with a new one.
