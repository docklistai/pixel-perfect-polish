# Docklist — Frontend Handoff

This document is the freeze-pass handoff for the Docklist desktop manager
frontend prototype. It describes what exists, how it is structured, and what
must still be wired up in production. No backend, auth, or data layer is
included in this prototype.

---

## 1. Product overview

- **Product name:** Docklist
- **Purpose of this prototype:** A clickable, frontend-only desktop manager UI
  used to validate the visual direction, information architecture, and
  interaction patterns before production wiring.
- **What this frontend covers:** The desktop manager experience — Home,
  Rota, Staff, Time & Attendance, Leave, Team, Operations, Reports, and
  Settings — plus a developer-only UI Kit reference page.
- **What is intentionally not covered:**
  - The mobile staff portal (separate workstream, untouched here).
  - Authentication, sessions, multi-tenant workspaces.
  - Real database, Supabase, RLS, or any persistence.
  - Billing, payroll integrations, third-party APIs.
  - AI features and real data fetching.
  - Production-grade error handling, analytics, and observability.

---

## 2. Routes

All routes live under `src/routes/` (TanStack Start file-based routing).
The shared chrome (Sidebar + Topbar + content area) is provided by `AppShell`
in `src/components/dl.tsx`.

### `/` — Home
- **Purpose:** Today-at-a-glance dashboard for managers.
- **Key UI sections:** Greeting `PageHeader`, KPI row of `MetricCard`s,
  alerts list (`AlertCard`), quick actions grid (`QuickActionCard`).
- **Reusable components:** `PageHeader`, `MetricCard`, `DashboardCard`,
  `AlertCard`, `QuickActionCard`, `DrawerShell`.
- **Mock-only interactions:** Clicking an alert opens an alert detail
  drawer; quick actions open a mock action drawer.
- **Later backend wiring:** KPI values, alert feed, and quick action
  outcomes (shift creation, broadcast, etc.).

### `/rota` — Rota
- **Purpose:** Weekly rota planning and conflict review.
- **Key UI sections:** Header with week selector and `ActionButton`s,
  metric strip, schedule grid card, conflicts panel.
- **Reusable components:** `PageHeader`, `MetricCard`, `DashboardCard`,
  `StatusBadge`, `DrawerShell`, `ConfirmDialog`.
- **Mock-only interactions:** "Add shift" drawer, conflict detail drawer,
  "Publish Rota" confirm dialog (does not publish anything).
- **Later backend wiring:** Schedule CRUD, conflict detection, publish
  workflow, notifications to staff.

### `/staff` — Staff
- **Purpose:** Staff directory and profile entry point.
- **Key UI sections:** Filters (`SearchField`, `FilterButton`), staff
  `DataTable`, staff profile drawer.
- **Reusable components:** `PageHeader`, `SearchField`, `FilterButton`,
  `DataTable`, `StatusBadge`, `DrawerShell`, `DetailRow`.
- **Mock-only interactions:** Row click opens staff profile drawer; "Add
  team member" opens a mock form drawer.
- **Later backend wiring:** Staff list, profile fetch/update, invite
  flow, role assignment.

### `/time` — Time & Attendance
- **Purpose:** Review timesheets and attendance exceptions.
- **Key UI sections:** Metrics row, timesheet `DataTable`, exception list.
- **Reusable components:** `PageHeader`, `MetricCard`, `DataTable`,
  `StatusBadge`, `DrawerShell`, `ConfirmDialog`.
- **Mock-only interactions:** Timesheet review drawer; CSV export confirm
  dialog (no file is generated).
- **Later backend wiring:** Clock events ingest, timesheet aggregation,
  approval workflow, real CSV export.

### `/leave` — Leave
- **Purpose:** Leave requests queue and coverage risk overview.
- **Key UI sections:** Pending requests table, coverage risk cards.
- **Reusable components:** `PageHeader`, `DataTable`, `DashboardCard`,
  `StatusBadge`, `DrawerShell`.
- **Mock-only interactions:** Request review drawer, coverage risk drawer.
- **Later backend wiring:** Leave request CRUD, approval, balances,
  coverage calculations.

### `/team` — Team
- **Purpose:** Internal communications and announcements.
- **Key UI sections:** Announcements feed, team roster card.
- **Reusable components:** `PageHeader`, `DashboardCard`, `DrawerShell`.
- **Mock-only interactions:** Compose announcement drawer; announcement
  detail drawer.
- **Later backend wiring:** Announcement CRUD, delivery, read receipts.

### `/ops` — Operations
- **Purpose:** Incidents, tasks, and shift handovers log.
- **Key UI sections:** Tabbed lists (incidents/tasks/handovers), unified
  log drawer.
- **Reusable components:** `PageHeader`, `DashboardCard`, `StatusBadge`,
  `DrawerShell`, `FormSection`, `FormRow`.
- **Mock-only interactions:** Log incident / Add task / Add handover all
  open the same mock drawer.
- **Later backend wiring:** Operations records storage, assignment,
  status transitions.

### `/reports` — Reports
- **Purpose:** Operational reporting and insights.
- **Key UI sections:** Filter bar, metrics, report cards, insights.
- **Reusable components:** `PageHeader`, `MetricCard`, `DashboardCard`,
  `FilterButton`, `DrawerShell`, `ConfirmDialog`.
- **Mock-only interactions:** Filter drawer, insight drawer, export
  confirm dialog.
- **Later backend wiring:** Report queries, scheduled exports, insight
  generation.

### `/settings` — Settings
- **Purpose:** Workspace settings (display only).
- **Key UI sections:** Sectioned forms via `FormSection` / `FormRow`,
  dirty-state `FeedbackBanner`.
- **Reusable components:** `PageHeader`, `FormSection`, `FormRow`,
  `FeedbackBanner`, `ActionButton`.
- **Mock-only interactions:** "Save (mock)" toggles a success banner;
  "Discard" resets the dirty flag. Nothing persists.
- **Later backend wiring:** Settings read/update, validation, audit log,
  permission checks.

### `/ui-kit` — UI Kit (developer-only)
- **Purpose:** Living style guide for every primitive in `dl.tsx`.
- **Key UI sections:** Display, inputs/tables, feedback/states, layouts,
  interactions (drawers/dialogs/confirms).
- **Reusable components:** All of `dl.tsx`.
- **Mock-only interactions:** All examples are inert demos.
- **Later backend wiring:** None — remove from production navigation or
  gate behind a developer flag.

---

## 3. Design system (`src/components/dl.tsx`)

All primitives are exported from a single file so the entire desktop UI uses
one consistent visual language. Styling uses Tailwind v4 + semantic tokens
defined in `src/styles.css` (no raw color classes).

### Layout
- **AppShell** — Top-level chrome (Sidebar + Topbar + content). Used by
  `__root.tsx`. Provides max-width content and consistent gutters.
- **Sidebar** — Fixed left navigation. Defines the canonical nav order.
  Active route uses semantic `--accent` background. **Do not change nav
  items in this pass.**
- **Topbar** — Page-level top bar (search, notifications avatar). Icon
  triggers carry `aria-label`s.

### Page structure
- **PageHeader** — Title, optional eyebrow/subtitle, right-aligned actions
  slot. Used at the top of every route.
- **SectionHeader** — Smaller heading used inside cards / sub-sections.

### Display
- **MetricCard** — Compact KPI card (label, value, optional delta).
  Delta tones: `up` / `down` / `neutral`.
- **DashboardCard** — Generic content card with header + body slots.
- **QuickActionCard** — Icon + label tile used on Home.
- **AlertCard** — Inline alert with tone, title, description, optional CTA.
- **StatusBadge** — Pill badge with semantic tones (success, warning,
  danger, info, neutral). Used in tables and drawers.

### Inputs
- **ActionButton** — Primary/secondary/ghost button. Always carries text.
- **IconButton** — Icon-only button. **Requires `aria-label`** (verified
  across the app).
- **FilterButton** — Compound button used in filter bars.
- **SearchField** — Input with leading icon, used in toolbars.

### Data
- **DataTable** — Typed table with `columns`, `rows`, `rowKey`, optional
  `onRowClick`. Sticky header, zebra hover, focus ring.

### Feedback & states
- **FeedbackBanner** — Inline banner with tone (`success`, `info`,
  `warning`, `danger`). Used for save confirmations, dirty state, etc.
- **EmptyState** — Title, description, optional action.
- **LoadingState** — Spinner + label, neutral background.
- **ErrorState** — Title, message, optional retry.
- **StatePanel** — Generic wrapper for empty/loading/error in a card.
- **PermissionState** — "You don't have access" placeholder.

### Interactions
- **RightPanel** — Static right-side slot used by some pages.
- **DrawerShell** — Standardized drawer (header, scrollable body, sticky
  footer). Wraps shadcn `Sheet`.
- **DialogShell** — Centered modal equivalent of DrawerShell. Wraps
  shadcn `Dialog`.
- **ConfirmDialog** — Pre-composed confirm with `brand` or `danger` tone.

### Forms
- **FormSection** — Titled group of form rows.
- **FormRow** — Label + control + optional helper text.
- **DetailRow** — Read-only label/value pair (used in profile drawers).

### Accessibility conventions
- Every `IconButton` has an `aria-label`.
- Drawers/dialogs use shadcn primitives, so focus trapping and ESC are
  handled.
- Color is never the only signal — badges and banners also carry text.

---

## 4. Visual rules

- **Colour direction:** Neutral surfaces with a single brand accent.
  Defined as semantic tokens in `src/styles.css` using `oklch`. Do not use
  raw Tailwind colour classes in components.
- **Typography:** System UI font stack. One H1 per page (`PageHeader`).
  Section titles use `SectionHeader`. Body text at default size; muted
  text via `text-muted-foreground`.
- **Spacing:** 4px base. Card padding `p-6`, list gaps `gap-4`, page
  gutters via `AppShell`.
- **Cards:** Rounded `rounded-xl`, subtle border, no heavy shadows.
- **Buttons:** Primary = brand accent; secondary = outlined; ghost = text
  only. Icon-only buttons must have `aria-label`.
- **Badges/status:** Semantic tones only (success / warning / danger /
  info / neutral). No arbitrary colours.
- **Tables:** Sticky header, zebra hover, single-row focus ring, click
  target = entire row when `onRowClick` is set.
- **Drawers/dialogs:** Always have header + body + footer. Footer
  actions: secondary (left/cancel), primary (right). Drawers slide from
  the right.
- **Forms:** `FormSection` groups, `FormRow` with label above control on
  narrow widths, side-by-side on wide.
- **Alerts/feedback:** Use `FeedbackBanner` for inline state and
  `AlertCard` for dashboard-style alerts.
- **States:** Hover = subtle background shift; focus = visible ring;
  active = slightly darker background; disabled = reduced opacity +
  `cursor-not-allowed`.

---

## 5. Mock-only areas

Everything below is hard-coded in route files. None of it persists.

- Mock staff data (directory + profiles)
- Mock rota data (shifts, conflicts, publish state)
- Mock time & attendance data (timesheets, exceptions)
- Mock leave data (requests, balances, coverage risks)
- Mock team announcements
- Mock operations records (incidents, tasks, handovers)
- Mock reports (metrics, insights)
- Mock settings save / discard
- Mock CSV / report export actions
- Mock "Publish Rota" action
- Mock notifications and badges

Primary mock-only buttons are explicitly labelled (e.g. "Save (mock)",
"Export (mock)") to prevent confusion at handoff.

---

## 6. Production wiring notes

The following must be implemented in the production repo — they are out of
scope for this prototype:

- **Authentication & sessions** (login, logout, session refresh)
- **Workspaces / multi-tenant scoping**
- **Staff records** (CRUD, invites, roles)
- **Rota data** (schedule storage, conflict detection)
- **Publish rota flow** (versioning, notifications)
- **Time clock** (clock-in/out events, geofencing if applicable)
- **Timesheets** (aggregation, approvals)
- **Leave requests** (CRUD, balances, approvals)
- **Announcements** (delivery, read receipts)
- **Operations logs** (storage, assignment, status transitions)
- **Reports** (queries, scheduled exports)
- **Settings** (read/update, audit)
- **Permissions** (role checks at route + action level)
- **Exports** (real file generation and download)

---

## 7. Transfer guidance

When moving this UI into the production Docklist repo:

- **Preserve the visual system.** Copy `src/components/dl.tsx` and the
  semantic tokens in `src/styles.css` first; everything else depends on
  them.
- **Transfer UI in controlled sections.** Move one route at a time and
  swap mock data for real queries as you go.
- **Do not overwrite production backend services.** This repo has none —
  the production repo's services are the source of truth.
- **Do not overwrite Supabase / RLS logic.** No DB or policies were
  authored here.
- **Do not treat mock buttons as production logic.** Re-implement
  handlers against real APIs; never copy mock handlers wholesale.
- **Wire real data gradually.** Replace hard-coded arrays with loaders
  / queries page-by-page; keep `LoadingState` and `ErrorState` in place.
- **Keep existing tests and architecture from the production repo.** Do
  not import this repo's routing or build config blindly — adapt the
  components, not the scaffolding.

---

## 8. Known limitations

- Frontend-only prototype.
- No real persistence (all data is in-memory mock).
- No auth gate — every route is publicly reachable in this prototype.
- `/ui-kit` is developer-only but reachable by URL; not linked from the
  sidebar.
- Mobile staff portal is intentionally untouched.
- Pre-existing `react-refresh/only-export-components` lint warnings in
  shadcn `src/components/ui/*` files are untouched.
- Not production-ready on its own.

---

## 9. Final verification

See the verification section at the end of the handoff turn for the
latest `lint`, `build`, and `tsc` results.
