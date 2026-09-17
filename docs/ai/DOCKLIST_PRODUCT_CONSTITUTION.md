# Docklist V2 — Product Constitution

**Status:** Canonical product direction before the next implementation campaign
**Purpose:** Preserve the owner-level decisions made during the full Docklist audit and prevent implementation drift.
**Starting implementation baseline:** `main` at `f47e1e1c6b03f56d72fb6f9a71d1cb61475cedd5` (`fix(rota): align import leave handling`)
**Repo:** `docklistai/pixel-perfect-polish` / local `C:\Dev\Docklist`

---

## 1. Product direction

Docklist remains intentionally narrow:

- **50% scheduling** — the core product.
- **30% lightweight HR** — only what directly supports staff operations and scheduling.
- **20% manager-led AI** — contextual assistance over real Docklist facts, never autonomous management.

The product must resist drift into:

- payroll;
- full HRIS;
- multi-site complexity before real demand;
- analytics/BI dashboards;
- generic project/task management;
- chat/social collaboration;
- custom permission engines;
- LMS/training platforms;
- revenue forecasting engines;
- POS integrations as product foundations;
- generic AI agents that mutate operational truth.

### Core product rule

**The owning workflow changes state. Communication, reports, AI and summaries describe or route to that state.**

Examples:

- Leave approves leave; Rota resolves affected shifts.
- Rota publishes staff scheduling truth.
- Time records actual worked reality.
- Team communicates but does not alter scheduling.
- Home triages but does not duplicate decision workflows.
- Manager Support synthesises facts but does not approve, publish, assign or mutate.

---

# 2. Scheduling and Rota

## 2.1 Assignment terminology

Retire **Coverage** wherever it actually means assigned shifts divided by planned shifts.

Use factual language such as:

- `6 of 8 assigned · 2 open`
- `Shift assignment`
- `No shifts planned`

Do not claim business-demand adequacy.

## 2.2 Empty-week publishing

Managers can explicitly publish an empty week.

Rules:

- explicit confirmation is required;
- creates a genuine new published snapshot with zero shifts;
- replaces the prior published truth for that week;
- staff sees `No shifts this week`;
- staff whose previously published shifts disappear are notified;
- history is preserved;
- this is **not** an “unpublish” operation.

## 2.3 Publish readiness

There must be one authoritative readiness computation using the same facts and rules as the actual publish mutation.

Expected states:

- `Ready to publish`
- `Review before publishing`
- `Empty week`

Readiness may show factual rows such as:

- assignment/open work;
- leave/availability conflicts;
- overlaps;
- draft state.

Open shifts do not inherently block publishing.

A failed read-only preview must never poison publish state.

## 2.4 Working-week authority

`rota_start_weekday` is the single authority for the operational week.

It drives:

- Rota;
- Home weekly views;
- Time review periods;
- Reports;
- manager weekly reminders.

Calendar month views may remain normal calendar months.

Week-start and timezone may be edited until scheduling history exists, then remain locked as currently designed.

## 2.5 Planned, assigned and open hours

Use explicit scheduling semantics:

- **Planned hours** = assigned + open shifts.
- **Assigned hours** = assigned shifts only.
- **Open hours** = open shifts only.

Hour budgets include all planned work.

Per-person scheduled-versus-contracted context uses assigned hours only.

Example:

`186 planned · 162 assigned · 24 open`

## 2.6 Department/role budgets

Role and department budgets count all planned shifts, including open shifts.

Show planned/target plus assigned/open composition.

Do not turn these into an adequacy or staffing-quality score.

## 2.7 Published truth and history

Published rota snapshots are immutable historical operational truth.

Managers may:

- publish a newer version;
- publish an empty version;
- inspect previous versions.

Managers may not:

- edit an old snapshot;
- delete an old published version to rewrite history.

The product should be able to answer:

> What rota was actually published at the time?

## 2.8 Published view

On a published week, managers should be able to distinguish:

- current draft/unpublished changes;
- last published state;
- `View published rota`.

Published view is read-only and represents exact staff truth.

A modest publication version history is appropriate; no rollback/branching/merge system.

## 2.9 Republish diff

Before republishing, show a factual change summary:

- added shifts;
- removed shifts;
- changed shifts;
- affected staff.

The same deterministic diff should drive staff notifications.

## 2.10 Build / Copy / Import

Build, Copy and Import all follow the same trust pattern:

**Preview → conflicts → confirm → draft → manager review → Publish**

A proposal method never changes the trust boundary.

Read-only preview failure is not a mutation failure.

## 2.11 Copy Previous Week

Copy from the latest **published** snapshot of the previous week, never from unfinished draft state.

Destination week is previewed and revalidated.

If no published previous week exists, say so explicitly; never silently fall back to draft.

## 2.12 Templates

Templates are reusable shift patterns, not a recurrence engine.

A template may store:

- day;
- time;
- department;
- role;
- open/assigned intent.

Applying a template creates a draft proposal and revalidates it.

Do not build indefinite recurring rotas.

## 2.13 Open-shift workflow

Published open shifts are staff opportunities, not self-assignment.

Flow:

1. Manager publishes an open shift.
2. Eligible staff may request it.
3. Request appears in Home attention, Rota context and manager notifications.
4. Manager sees factual applicant context only.
5. Manager selects an applicant.
6. Server revalidates eligibility/conflicts.
7. Selection changes the draft and is labelled `selected · republish to confirm`.
8. Republish creates staff truth and sends appropriate notifications.

Staff can withdraw a pending request.

No self-claim, auctions, staff trading or ranking applicants.

## 2.14 No applicants

An open shift with no applicants remains open.

Manager may:

- manually assign;
- edit;
- leave open;
- remove.

Support may surface `No applicants`; it never auto-selects a person.

## 2.15 Pending leave and open shifts

Approved leave is a hard block.

Pending leave also blocks requesting an overlapping open shift.

The staff member must cancel/wait for the leave request before requesting that shift.

Manager selection revalidates the same rule.

Do not automatically cancel leave.

## 2.16 Shift release

`Request release` does not remove the staff member from the shift.

Until the manager resolves the request and republishes, the staff member remains assigned.

Staff-facing copy should make this explicit.

## 2.17 No staff shift-confirmation workflow

Published means authoritative.

Do not add:

- staff confirm/decline published shift;
- unconfirmed shift chase flows;
- acceptance machinery.

Revisit only with real user evidence.

## 2.18 Rota responsive priority

Rota owns the width.

At constrained desktop/tablet widths:

- week grid receives priority;
- secondary rails collapse into contextual panels/drawers before the grid is compromised;
- horizontal scrolling is acceptable where necessary;
- do not crush day columns into unreadability.

Aim for the full week to fit comfortably on normal desktop widths.

## 2.19 Fake break rule

Remove any claim that Docklist universally applies `30 min unpaid for shifts >=6h` unless a real implemented rule exists.

Do not add a break-policy engine merely to preserve the copy.

---

# 3. Home and manager triage

## 3.1 Home purpose

Home is a scheduling cockpit, not a second Rota and not an analytics dashboard.

It should answer:

> What do I need to do about this week’s operation and rota?

## 3.2 Attention queue

Home shows unresolved manager actions only.

Examples:

- leave requests;
- open-shift requests;
- release requests;
- availability/day-off requests;
- time queries/corrections;
- current Time approvals.

Each item routes to its owning workflow and self-clears when resolved.

Do not create a generic activity feed.

Do not use arbitrary dismiss for unresolved actions.

## 3.3 Today vs This Week

Keep both only because they have distinct jobs.

**Today** may show:

- who is working;
- call-offs;
- today’s open work;
- urgent Ops/actions.

**This Week** may show:

- week-at-a-glance;
- open shifts;
- upcoming leave;
- manager decisions;
- publish state.

Do not show the same dashboard twice with different numbers.

## 3.4 Setup checklist

After foundational onboarding, Home may contain a compact optional progressive setup checklist.

Examples:

- workspace/team;
- first rota;
- leave year;
- labour targets.

It disappears permanently when complete.

## 3.5 KPI cards

Use a large summary card only when it adds decision context not already obvious immediately below.

Prefer fewer, stronger cards, especially around 1024px.

## 3.6 Home is not the action authority

Home summarises and routes.

Decisions remain in:

- Leave;
- Rota;
- Staff;
- Time;
- Ops.

---

# 4. Staff model and lightweight HR

## 4.1 Departments and roles

**Department** = organisational/scheduling grouping.
**Role** = work the person can perform.

A staff member has:

- one primary department;
- one primary role;
- one or more eligible roles.

A shift belongs to department/location context and requires a role.

Department is not an eligibility proxy.

## 4.2 Role eligibility

Build, manual assignment and open shifts should use eligible roles.

Do not add a generic Skills/competency/rating matrix.

Future training/certification only belongs here if it genuinely determines whether someone may be scheduled for a specific role/task.

## 4.3 Staff status

Three distinct states:

### Active
- schedulable;
- portal eligible;
- included in current operational audiences.

### Inactive
- retained in history;
- temporarily not schedulable;
- can return later;
- portal suspended.

### Left
- no longer current workforce;
- excluded from scheduling/audiences/normal notifications;
- history preserved;
- portal revoked.

Do not make `Delete` the normal next step after someone leaves.

## 4.4 Portal status

Portal access is a first-class Staff fact.

Useful states include:

- Not set up;
- Code issued;
- Active;
- Suspended;
- Reset pending, where appropriate.

Visible in Staff table/filter.

## 4.5 Portal access model

Preserve the workspace-code + personal-code onboarding model.

Managers should be able to bulk issue personal access codes and receive a clean distribution sheet/list.

Codes are shown at issuance time only.

Record issued/claimed state.

Do not introduce passwords, email invitations or SMS infrastructure merely for onboarding.

## 4.6 Contracted hours

Contracted hours are manager-side planning context only.

Manager examples:

- `22h scheduled / 24h contracted`
- `22h scheduled · Zero-hours contract`
- `Contracted hours not recorded`

Zero is not the same as missing.

Do not expose contracted hours in the staff portal.

## 4.7 Manager notes

Keep bounded manager-only Staff notes.

Rules:

- lightweight dated entries;
- author shown;
- optional pin;
- manager/owner only;
- never staff portal;
- never used for Build, eligibility, reports, scoring or AI decisions.

Structured workflows remain source of truth.

Do not expand notes into disciplinary/performance/HR case management.

## 4.8 Staff filtering

Operational filters only, such as:

- status;
- department;
- primary/eligible role;
- portal status;
- perhaps contract type.

Do not build salary/performance/age/absence-score filtering.

## 4.9 Archive versus delete

If an object has been used in history, archive it rather than deleting it.

Relevant examples:

- staff;
- departments;
- roles;
- templates.

Unused objects may be hard-deleted where safe.

Renames do not rewrite historical labels already stored in authoritative records/snapshots.

## 4.10 Birthdays

Keep lightweight manager-side birthday awareness only.

Store day + month where possible.

Do not expose age and do not automatically broadcast birthdays.

---

# 5. Leave

## 5.1 Leave Model B remains authoritative

Do not reopen the leave model.

Current principles:

- annual leave uses calendar days;
- workspace leave-year start is nullable;
- default entitlement is nullable;
- explicit staff entitlement records;
- approved annual leave uses distinct calendar dates;
- pending is separate;
- remaining may be negative.

Do not infer:

- working days;
- contracted-minute leave calculations;
- bank-holiday deductions;
- carryover;
- pro-rata;
- accrual.

## 5.2 Canonical leave types

Core vocabulary:

- Annual leave;
- Sickness;
- Compassionate leave;
- Unpaid leave;
- Other — manager-recorded only.

Do not build a configurable leave-type engine.

## 5.3 Decision context

Manager Leave decision panel should show real context where available:

- requested calendar days;
- remaining before;
- remaining if approved;
- who else is unavailable;
- affected published/draft shifts.

If configuration is missing, say so honestly.

Examples:

- `Entitlement not available`
- `Entitlement not recorded`

## 5.4 Who else is off

Relevant decision context may include:

- approved leave;
- pending leave, clearly labelled pending;
- approved one-off unavailability where operationally relevant.

Prefer relevant department/role context when possible.

Do not create a `safe/unsafe to approve` algorithm.

## 5.5 Leave never silently edits Rota

Approving leave does not mutate shifts.

After approval, surface affected shifts and provide an explicit route such as `Resolve in Rota`.

Rota owns reassignment/open/edit/delete.

## 5.6 Staff leave balance

Staff may see their own annual-leave entitlement/balance when Docklist actually has it.

Useful presentation:

- Entitlement;
- Approved;
- Pending;
- Remaining.

Pending stays distinct from approved.

If data is absent, say so honestly.

Staff may not edit entitlement.

## 5.7 Balance is context, not policy enforcement

A zero or negative projected balance does not automatically block a request.

Example:

`0 days remaining · This request would take the recorded balance to -2 days.`

Manager still decides.

## 5.8 Privacy

Leave reasons are private to the requesting staff member and relevant managers.

Do not expose colleague leave reasons in:

- Rota;
- Who’s working;
- Reports;
- generic AI summaries.

## 5.9 No leave-performance analytics

Operational aggregate explanations are allowed.

Individual absence scoring/ranking is not.

---

# 6. Time and attendance

## 6.1 State model

Time should support clear operational states such as:

- Pending;
- Exception;
- Flagged;
- Needs correction;
- Approved.

### Exception
A factual detected discrepancy.

### Flagged
A manager-created internal attention marker.

### Needs correction
Staff action is required.

## 6.2 Flag for review

Keep and make real.

Rules:

- manager-only;
- requires a short note;
- appears in Needs Attention;
- clearable;
- no automatic staff notification;
- does not mutate clock data.

## 6.3 Hours Queries

Hours Queries become a real structured workflow, not chat.

Staff can:

- see Time review state;
- see manager return note;
- query a specific time entry with structured issue + note.

Manager remains authoritative and may resolve/adjust with audit history.

Do not let staff directly rewrite approved time.

## 6.4 Approved-time corrections

Significant corrections preserve history.

No silent rewriting of approved records.

Current corrected outcome is visible while prior decision/history remains auditable.

## 6.5 Unscheduled attendance

Reality may differ from the rota.

Unscheduled attendance:

- can be recorded;
- is clearly marked;
- requires manager reconciliation/note before approval;
- does not retroactively create a published shift;
- remains in audit history.

Rota = plan. Time = actual.

## 6.6 Working beyond scheduled time

Do not trim, reject or label as payroll overtime automatically.

Show factual variance, for example:

- Scheduled 07:00–15:00
- Worked 07:00–16:00
- `+1h variance`

Manager reviews reality.

## 6.7 Grace period

Keep the current 5-minute grace as an opinionated product rule for now.

Use factual language, for example:

`Started 8 minutes after scheduled.`

Do not build a hidden configurable policy engine until evidence justifies it.

## 6.8 No payroll period locking

Do not add:

- payroll-closed periods;
- pay-run locks;
- reopen payroll period flows.

Approved records may be corrected with audit history.

## 6.9 Scheduled versus worked

Keep clear meanings:

- Rota: scheduled/planned facts;
- Time: per-entry scheduled-vs-actual validation;
- Reports: aggregate published scheduled vs approved worked.

Pending/unreviewed time stays separate from approved worked hours.

---

# 7. Rota adherence

> **DEFERRED — definition is authoritative; the real calculation is deferred to future scope. The existing Sample surface must remain.**

## 7.1 Purpose

Rota adherence is an aggregate operational measure of how closely the published rota was actually delivered.

It is **not** an employee performance score.

## 7.2 Baseline

Measure against the latest published rota that was authoritative before the relevant shift began.

If a manager legitimately changes and republishes before the shift, the new published version becomes the baseline.

## 7.3 Measure

Use scheduled minutes/hours, not crude shift counts.

Example:

`200 published hours due · 190 delivered as published · Rota adherence 95%`

Future shifts never count against current-week adherence.

Use `Rota adherence so far` during an incomplete week.

## 7.4 Deviations

Potential factual contributors include:

- sickness absence;
- urgent accepted absence;
- missed/no-show work;
- late start beyond grace;
- early finish;
- unfilled open shift once due;
- other approved variance.

Additional worked time does not push adherence above 100% and is shown separately.

## 7.5 Breakdown

The headline percentage should be explorable into factual causes and affected shifts.

Do not infer blame.

## 7.6 Trend

Keep a weekly trend because it shows whether the operation is becoming better at delivering the rota it publishes.

Do not use it to rank individual employees.

---

# 8. Staff portal

## 8.1 Product boundary

The staff portal is deliberately smaller than the manager product.

It may include:

- published schedule;
- This Week;
- Who’s working;
- staff requests;
- Time review/query flow;
- Leave;
- announcements/acknowledgements;
- access/onboarding;
- potentially bounded Ops participation later.

It does not include:

- Reports;
- labour budgets;
- department management;
- full Ops management;
- other staff leave data;
- analytics;
- Manager Support;
- workspace configuration;
- audit tooling.

## 8.2 Published-only scheduling

Staff read published scheduling truth only.

No draft leakage.

## 8.3 This Week

Make This Week the clearest staff scheduling surface.

Use a compact weekly representation of the person’s own published shifts.

May show:

- working day/off day;
- shift times;
- overnight indication;
- approved leave context.

Do not recreate manager Rota.

## 8.4 Who’s working

Rename staff `Team` to **Who’s working**.

It may show relevant coworkers on published shifts, names, roles and appropriate shift context.

Do not expose:

- phone numbers;
- emails;
- colleague leave reasons;
- contracted hours;
- portal status;
- manager notes;
- Time records.

## 8.5 Staff contact

One explicit workspace-level **Staff contact**:

- name;
- email;
- optional phone.

Portal uses it consistently.

Do not infer hierarchy.

Do not render dead contact buttons when data is unset.

## 8.6 Leave ownership

Staff Leave is the canonical location for:

- current/pending leave requests;
- approved/declined history;
- manager response;
- cancellation status;
- leave entitlement/balance where available.

Shifts → My requests should focus on shift-related requests such as open-shift applications and release requests.

## 8.7 Notifications

Staff notifications are sparse and event-driven.

Notify for:

- published rota availability/change where relevant;
- leave decision;
- open-shift result;
- release result;
- Time returned for correction;
- announcement requiring acknowledgement.

Do not notify for every clean approval or duplicate normal announcements.

Notifications route to authoritative features and are not permanent history.

## 8.8 Help, Settings and Documents

- **Help** stays and uses real Staff contact.
- **Settings** recedes until genuine staff preferences exist.
- **Documents** is a legitimate future lightweight-HR capability, but not current implementation priority.

## 8.9 Manager mobile versus staff mobile

The staff portal is genuinely mobile-first.

The manager app remains desktop/tablet-first while retaining safe, useful mobile access for bounded actions.

Do not distort the manager scheduling UX to force full mobile parity.

---

# 9. Team and communications

## 9.1 Product boundary

Team is a one-way tracked broadcast system, not chat/social software.

No:

- replies;
- channels;
- DMs;
- reactions;
- employee-created groups.

## 9.2 Targeting

Keep announcement targeting aligned to real organisational structures.

Primary targets:

- All staff;
- Department(s);
- Managers only.

Specific-person communication, if supported later, remains exceptional and announcement-like.

Do not create arbitrary saved groups/channels by default.

## 9.3 Acknowledgement

Manager chooses whether an announcement requires acknowledgement.

Normal informational announcements do not need acknowledgement.

Use required acknowledgement for genuinely important operational/policy/safety communication.

## 9.4 Pinning

Pinning is deliberate prominence.

Manager controls unpinning.

A future stale-pin reminder is acceptable; AI should not decide what is stale.

## 9.5 Communication never changes operational state

An announcement about closure does not close the rota.

An event notice does not create a shift.

Communication describes; owning workflows change state.

## 9.6 Staff events and training reminders

These are legitimate lightweight intended features.

Keep creation bounded:

- title;
- date/time;
- audience;
- short note.

Do not expand into event planning, attendance systems, course records or LMS functionality.

---

# 10. Ops

## 10.1 Core purpose

Ops is the manager operational log / handover center.

Its job is:

> What happened, what remains unresolved, and what does the next manager need to know?

## 10.2 Handover

Handover may use:

- unresolved incidents;
- maintenance;
- tasks;
- notes;
- relevant published rota context.

Draft should be deterministic from live Ops facts and then reviewed/issued by a manager.

Do not rely on an automatic AI narrative as authority.

## 10.3 Checklists

Bounded reusable operational checklists are legitimate.

Examples:

- opening;
- closing;
- cellar;
- fire doors;
- kitchen.

A checklist may have dated runs/completion.

Do not turn this into:

- recurring project scheduling;
- SLA tracking;
- productivity scoring;
- compliance-management software.

## 10.4 Priority and severity

- **Priority** = operational urgency and may apply broadly.
- **Severity** = incident seriousness only.

Do not show Severity on ordinary Task, Maintenance, Service Request or Note types.

## 10.5 Follow-ups

An Ops item may create a bounded follow-up.

Do not create nested task trees, dependencies or milestones.

## 10.6 OPEN DECISION — staff participation

> **OPEN — DO NOT IMPLEMENT.**

This remains intentionally unresolved.

Do not improvise during implementation.

Questions still to decide:

- Can staff see/complete Ops items assigned to them?
- Can staff raise incidents/maintenance/service requests?
- Can staff participate in checklists?
- What bounded blend preserves manager control without becoming generic task management?

**Implementation agents must stop and flag any work that depends on this decision.**

---

# 11. Reports

## 11.1 Product boundary

Reports provides fixed operational reports, not a BI/report-builder product.

No:

- saved custom dashboards;
- arbitrary formulas;
- custom KPI builders;
- report-design interfaces.

## 11.2 Scheduled versus worked

Add a bounded aggregate comparison:

- published scheduled hours;
- approved worked hours;
- pending/unreviewed time separately.

No efficiency/productivity score.

## 11.3 Per-person hours

Manager-only factual per-person scheduled and approved-worked hours are allowed.

No utilisation/performance/ranking layer.

## 11.4 Rota adherence

Rota adherence/trend belongs as an operational reporting metric under the definition in Section 7.

## 11.5 Exports

Exports reflect Docklist operational facts, not payroll interpretation.

Good export domains:

- published rota;
- approved worked hours;
- leave records;
- bounded Staff directory data.

Do not build provider-specific payroll exports, tax logic, wage calculations or pay-run preparation.

## 11.6 Approved-hours export authority

Time owns the canonical approved-hours export.

Reports should link to that authority rather than maintaining a second competing export implementation.

## 11.7 Staff directory export

May include straightforward operational facts such as:

- staff record ID;
- name;
- status;
- department;
- primary role;
- contract type;
- contracted weekly hours where recorded.

Do not dump:

- manager notes;
- secrets/access codes;
- internal audit fields;
- sensitive free-text reasons.

## 11.8 Privacy export

Operational exports and data-subject/privacy exports are separate concerns.

Do not expose a fake `Export all my data` control until a complete and safe privacy workflow exists.

## 11.9 Export periods

Exports use exactly the same date/week/timezone semantics shown by the source page.

No hidden Monday–Sunday assumptions.

## 11.10 Draft versus published export

Schedule exports default to published truth.

If draft export exists, label it explicitly as **Draft rota export**.

## 11.11 No scheduled-report engine

Do not add automatic emailed/scheduled reports now.

Use operational reminders instead where appropriate.

---

# 12. Settings and onboarding

## 12.1 Visible Settings stay small and real

Do not unhide Settings sections simply because they have designs.

A section is visible when its controls genuinely persist and have a real product job.

Natural areas:

- Your preferences;
- Workspace;
- Scheduling;
- Time & Leave;
- Notifications later;
- Labs.

## 12.2 Hidden sections

Keep hidden until real:

- custom roles & permissions;
- broad Time & attendance configuration;
- Notifications configuration until persistence exists;
- Data & privacy until real controls exist;
- Plan & limits until real;
- multi-location concepts.

Manager Support likely does not need a separate Settings page.

## 12.3 Deep links

Settings sections must be addressable.

`Settings → Leave` should open Leave settings, not General/theme.

Meaningful navigational state should be reflected in URLs where appropriate.

## 12.4 Foundational first-run setup

Mandatory onboarding only covers foundations:

1. Workspace basics:
   - business name;
   - location;
   - timezone;
   - rota week start.
2. Opening days/hours, with hours optional.

Do not force leave year, labour targets, role colours, notifications, public holidays, AI, portal access or Reports into mandatory onboarding.

## 12.5 Time format

Use 24-hour time consistently across Docklist.

Do not add a time-format setting now.

## 12.6 Public holidays

Public holidays are planning/context data only.

Use a region-driven workspace calendar where appropriate, e.g. UK → Scotland.

They may appear in Leave/Rota/calendar context.

They do **not**:

- deduct entitlement;
- create accrual logic;
- imply venue closure;
- reopen Leave Model B.

Venue closure is a separate scheduling concept.

---

# 13. Notifications

## 13.1 Principle

Notify because:

- someone needs to act; or
- an authoritative state affecting them changed.

## 13.2 Manager notifications

Examples:

- open-shift request;
- release request;
- leave request;
- availability/day-off request;
- Hours Query/correction request.

## 13.3 Staff notifications

Examples:

- relevant rota publish/change;
- open-shift result;
- release result;
- leave decision;
- Time returned for correction;
- required announcement acknowledgement.

Do not notify staff for every clean Time approval.

## 13.4 No generic activity feed

Notifications are ephemeral action/navigation aids.

Authoritative history remains in the owning workflow.

Do not create a giant notification archive.

## 13.5 Manager reminders

Optional reminders such as `Next week is still draft` are separate from action notifications and may be added later where useful.

---

# 14. Navigation, discoverability and responsive UX

## 14.1 Stable primary navigation

Keep the current manager top-level structure unless a feature’s product job materially changes:

- Home
- Rota
- Staff
- Time
- Leave
- Team
- Ops
- Reports
- Settings

Do not reorganise navigation merely for novelty.

## 14.2 No global search yet

Prefer strong local search/filtering in owning features.

Do not build `Search Docklist` until real usage demonstrates cross-object discovery pain.

## 14.3 URL state

Meaningful navigational state should live in the URL where it improves bookmarks/back/deep links.

Examples:

- Rota week;
- Settings section;
- relevant Time period;
- meaningful destination context.

Transient UI state may remain local.

## 14.4 Context-preserving deep links

Cross-feature links should carry the context that caused the click.

Examples:

- Leave → affected Rota week;
- Home Time alert → relevant Time period;
- Home open-shift request → relevant shift/week;
- settings links → correct section.

## 14.5 No command palette

Do not add a global command palette, slash commands or IDE-like power-user layer.

## 14.6 Filters

Use real operational dimensions such as:

- person;
- department;
- role;
- date/week;
- status;
- request type.

Do not expose filters merely because a database column exists.

## 14.7 Responsive tables

At narrow widths preserve decision-critical columns intentionally.

Lower-priority metadata may move into row detail/drawers.

Do not rely on accidental clipping.

## 14.8 Drawers

Standard pattern:

- page = scan/compare/triage;
- drawer = inspect one thing or perform a bounded action.

Do not turn drawers into miniature multi-tab applications.

---

# 15. Manager Support / AI

## 15.1 AI boundary

Normal deterministic product facts come first.

AI is appropriate only where combining real Docklist facts materially helps the manager.

## 15.2 Allowed behaviour

Manager Support may:

- summarise relevant live facts;
- explain why something needs attention;
- draft an Ops handover from selected records;
- provide contextual support with source facts visible/clickable.

## 15.3 Prohibited authority

Manager Support does not:

- publish;
- approve leave;
- assign staff;
- change Time records;
- mutate leave;
- create employee scores;
- present predictions as facts.

No generic chatbot bolted onto every page.

---

# 16. Samples and preview features

## 16.1 Sample means intended product capability

A **Sample** feature is an intended Docklist capability whose current data/functionality is illustrative and must not be mistaken for live operational truth.

Sample does **not** mean `candidate for deletion`.

## 16.2 Treatment

Use one consistent Sample badge.

The label should remain visible when drilling into sample content.

When the feature becomes real, remove the Sample label completely.

Avoid sample data that can be mistaken for authoritative live facts.

## 16.3 Known intended samples

Examples that should be preserved and evaluated as product features:

- Rota adherence / Attendance this week;
- Hours Queries;
- Public Holidays;
- other intentionally previewed Team concepts such as staff events/training reminders where applicable.

---

# 17. Data integrity and audit

## 17.1 Active queue versus history

Home contains active unresolved work.

Owning features contain historical records.

No universal Activity Log page for now.

## 17.2 Contextual audit history

Relevant workflows should show useful audit timelines where needed.

Do not build a broad global audit-log product unless future requirements justify it.

## 17.3 Reasons required selectively

Require a reason for high-risk or opaque actions such as:

- return Time for correction;
- access reset;
- cancel approved leave;
- serious conflict override/acknowledgement;
- historical correction;
- declines where the person otherwise receives an opaque rejection.

Do not require reasons for every ordinary approval/publish/selection.

## 17.4 Decline transparency

Personal staff request declined → show a short reason.

Open-shift applicant not selected → neutral `Shift filled` is sufficient; no comparative explanation.

## 17.5 Configuration never rewrites history

Changing status, archive state, leave settings, opening hours or labour settings never silently rewrites:

- published rota;
- approved Time;
- historical Leave;
- audit history.

Configuration affects current/future behaviour and may surface conflicts rather than auto-fixing old facts.

---

# 18. Single-location and permissions

## 18.1 Single-location first

For now, one workspace represents one venue/location.

Do not build:

- location switchers;
- cross-site staff;
- location-specific permissions;
- head-office multi-site reporting.

## 18.2 Area

Area is physical operational context such as:

- Bar;
- Kitchen;
- Cellar.

It is not:

- org hierarchy;
- permissions;
- schedules;
- budgets;
- training membership.

## 18.3 Permissions

Keep fixed:

- Owner;
- Manager;
- Staff.

Allow only explicit sensitive exceptions where necessary.

Do not build a custom permission matrix or department-admin hierarchy.

---

# 19. Offline behaviour

Keep offline support conservative.

Do not cache live operational data for offline use as if it were current.

Offline may provide:

- app shell;
- offline page;
- clear `Reconnect for latest rota` messaging.

Do not build offline-first operational mutation/synchronisation without a deliberate future freshness/version model.

---

# 20. Deferred but legitimate lightweight-HR capabilities

## 20.1 Documents

Documents is a legitimate future bounded Staff capability, not a current implementation priority.

Potential scope:

- contract copy;
- simple policy acknowledgement;
- ID/right-to-work reference;
- certificate;
- handbook.

Potential controls:

- upload;
- title/type;
- optional expiry;
- choose whether staff can see it;
- simple history.

Staff sees only explicitly shared own documents.

Do not turn this into SharePoint, e-sign, LMS, compliance matrix or onboarding-pack builder.

## 20.2 Training/certification

Only implement training/certification data when it materially determines scheduling eligibility.

No:

- LMS;
- course catalogue;
- generic training progress;
- competency scoring.

---

# 21. Explicitly deferred / rejected directions

Do not implement these during the upcoming campaign unless separately approved:

- payroll;
- provider-specific payroll integrations;
- custom analytics dashboards;
- generic report builder;
- multi-location architecture;
- full HRIS;
- custom role/permission matrix;
- chat/DMs/social feed;
- employee performance/reliability/absence scoring;
- staff shift confirmation;
- staff shift trading;
- recurring rota engine;
- arbitrary custom announcement groups/channels;
- global search;
- global command palette;
- offline-first operational data;
- generic skills/competency matrix;
- LMS/training platform;
- scheduled-report delivery;
- payroll period locking;
- automatic AI operational mutations.

---

# 22. Known current defects / implementation facts that do not need new product decisions

These should be treated as implementation work rather than reopened strategy questions:

1. Copy Previous Week read-only preview failure currently contaminates mutation failure state and blocks Publish for the session.
2. Publish Readiness can say Ready on an empty week while the actual publish gate refuses.
3. Assignment/`Coverage` semantics are contradictory across Rota/Ops/headers.
4. Published week currently cannot be replaced by an explicit empty published snapshot.
5. Time `Needs Attention` is structurally blind because live mapper hardcodes `flagged: false` while UI exposes flagging.
6. Timesheet attention counts currently use inconsistent scopes across Home/sidebar/Time/Reports.
7. Open-shift applications lack a proper manager action path/notification.
8. Operational week semantics are inconsistent in Time/review reminders versus Rota/Reports.
9. Settings deep links do not address the intended section.
10. Rota legend promises a fake break rule that is not implemented.
11. Some declared URL/search state is not actually maintained.
12. Leave decision panel can retain an invisible request when switching tabs.
13. Staff contact is promoted while the live contact values/buttons can be empty/dead.
14. Staff portal Time review/query visibility is incomplete/inconsistent with the intended workflow.
15. Staff Leave information is fragmented across portal surfaces.
16. Manager/staff leave-type vocabulary diverges.
17. Some Team preview concepts lack creation paths.
18. Reports heatmap/trend unpublished-week treatment is inconsistent.
19. Ops `100%` empty-state assignment/coverage semantics are wrong.
20. Responsive manager rails/tables can steal too much space from decision-critical content.

---

# 23. Implementation campaign rules

The next campaign may be executed autonomously, but product authority remains this document.

## 23.1 Required workflow

1. **Independent audit first** — no implementation.
2. Classify each relevant constitution item as:
   - already correct;
   - bug/inconsistency;
   - current implementation work;
   - UX refinement;
   - future product direction only;
   - explicitly deferred;
   - intentionally open.
3. Build a dependency-aware execution plan.
4. Only then execute approved current work.
5. Each workstream is internally gated:
   - implement;
   - targeted verification/tests;
   - broader quality checks;
   - commit;
   - continue only if green.
6. Final independent heavy verification against:
   - this constitution;
   - starting SHA;
   - all campaign commits;
   - live browser behaviour;
   - backend/RLS/security authorities;
   - responsive behaviour.

## 23.2 Stop conditions

Implementation must stop rather than improvise if it encounters:

- a contradiction with this constitution;
- any work depending on the open Ops staff-participation decision;
- a need for broad architectural refactoring not justified by approved scope;
- a schema/migration expansion not necessary for an approved product decision;
- a deferred feature being required to complete current work;
- unexpected hosted Supabase changes;
- failing tests/quality checks that cannot be explained and resolved safely;
- a need to invent new product behaviour.

## 23.3 Do not erase good existing UI/content

Preserve the current visual/product direction unless a specific constitution item requires change.

For structural work, split/refactor cleanly without changing visible behaviour unless visible behaviour is intentionally in scope.

---

# 24. Likely execution families — subject to independent audit

This ordering is a hypothesis, not authority. The independent audit should confirm or improve it.

### A. Product truth / scheduling semantics
- assignment terminology;
- one publish-readiness authority;
- empty publish;
- working-week authority;
- planned/assigned/open semantics;
- Copy preview failure isolation;
- contradictory empty-state percentages;
- published view/history where already architecturally supported.

### B. Manager action flow
- Home attention queue;
- open-shift manager request flow;
- manager-recorded availability/day-off;
- Time attention/flagging;
- action counts and notifications.

### C. Staff loop completion
- Staff contact;
- This Week;
- Leave consolidation/balance;
- Time review/query loop;
- portal status/onboarding polish;
- release/open-shift result states.

### D. Navigation/config honesty
- Settings deep links;
- URL state;
- context-preserving cross-feature links;
- fake break copy;
- wrong settings pointers;
- consistent time format.

### E. Page refinement
- Home composition;
- Rota width behaviour;
- Staff polish;
- Time polish;
- Leave stale-selection safety fix;
- Team preview creation paths where already intended;
- Reports bounded improvements;
- responsive tables/drawers.

---

# 25. Final authority

When implementation notes, old prototypes, stale comments or agent suggestions conflict with this constitution:

**This constitution wins unless the owner explicitly changes the decision.**

The sole major product question intentionally left unresolved is **bounded staff participation in Ops**.
