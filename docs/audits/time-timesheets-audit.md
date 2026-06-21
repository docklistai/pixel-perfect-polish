# Time / Timesheets Audit

## A. Executive verdict

BLOCKER FOUND

The Time area is not ready for sign-off because live state is mixed with demo state, the active period is hardcoded, and several manager actions can approve incomplete or ambiguous records without enough safeguards.

## B. Evidence inspected

- `src/routes/time.tsx`
- `src/features/time/**`
- `src/features/time/components/**`
- `src/features/time/hooks/**`
- `src/features/time/api/**`
- `src/features/rota/**` where Time depends on published rota or shifts
- `src/features/staff/**` where staff identity or status affects Time
- `src/features/portal/**` where staff time or clock events feed manager Time
- command palette and home quick actions that link to Time
- relevant tests covering Time behavior

## C. Current Time purpose

The page currently acts as a mixed manager workspace for:

- rota attendance review
- timesheet approval
- time clock review
- approved-hours export

It is not a clean single-purpose workflow. The UI mixes operational review, approval, and export with demo-only analytics and reminder copy.

## D. Core manager journey findings

- A manager can see rows, scheduled times, and actual in/out values for live entries.
- A manager can approve records individually or in batches.
- A manager can adjust some entries through the edit dialog.
- The UI does not reliably surface what is pending versus approved when live data is incomplete.
- Missing clock-outs are not handled as a first-class manager exception in the live list.
- The current flow makes it too easy to approve records that are not obviously complete.

## E. Scheduling / Rota connection findings

- Time does pick up schedule fields from the live data.
- It does not clearly expose the published rota snapshot, shift identity, or rota version.
- Open shifts, leave, and non-working day handling are not clearly represented in the manager view.
- Inactive or left staff are not surfaced honestly in the Time view.
- The page does not overclaim payroll-grade accuracy, but the hardcoded period and demo/live blending weaken trust.

## F. Staff / source honesty findings

- Live loading and error states can fall back to demo rows instead of a clear empty or blocked state.
- Some status indicators and summary values are hardcoded.
- Some reminder and resolution actions are toast-only and do not create persistent state.
- The live table can show rows that look reviewable even when the underlying exception data is missing.
- Adjustment behavior is real, but the surrounding copy and state handling are not fully honest yet.

Classification:

- Blocker: live/demo fallback in manager workflow
- Blocker: hardcoded active period and weak live period scoping
- Should fix: hardcoded summary stats and demo-only reminder copy in live mode
- Deferred polish: visual cleanup around some secondary controls

## G. Approval workflow findings

- Individual approval exists.
- Batch approval exists.
- Reject or return-to-correction is not exposed as a clear manager action.
- Adjustment flow exists, but the approval consequences are not clearly signaled.
- Approved records are not presented as strongly locked from further review.
- Approval can proceed without enough visible completeness checks.
- Live actions appear real, but the workflow needs stronger guardrails before sign-off.

## H. Export workflow findings

- Export exists and appears to be a real server-side action.
- Export scope is appropriate for lightweight admin, not payroll integration.
- The export preview and the actual exported aggregate can diverge because the preview is based on displayed rows and the export is server-aggregated.
- There is no strong warning for incomplete records or excluded entries.
- Export does not overpromise a full payroll system, which is correct.

## I. Empty / sparse / live state findings

- No staff state is not clearly modeled.
- No published rota state is not clearly modeled.
- No clock events state is not clearly modeled.
- Missing clock-out is not promoted as a distinct exception state.
- Partial-week and sparse-data states are not clearly explained.
- Live loading and live error states need to stop borrowing demo content.
- Empty approved-hours states need more explicit manager guidance.

## J. Mobile / source-level findings

- The table is horizontally scrollable and usable at small widths.
- Batch actions and export controls remain reachable, though dense.
- The adjustment dialog is tighter than ideal on 390px widths.
- This is not a mobile redesign blocker by itself.
- The workflow issues above are higher priority than layout polish.

## K. Tests and validation results

Checks run:

- `git status --short`
- `git status -sb`
- `npx tsc --noEmit`
- `npx eslint . --quiet`
- `npx vitest run`
- `npm run build`

Results:

- `git status --short`: clean before this markdown file was added
- `git status -sb`: `## main...origin/main`
- `npx tsc --noEmit`: pass
- `npx eslint . --quiet`: pass
- `npx vitest run`: pass, 127 tests across 22 files
- `npm run build`: pass

Browser validation:

- blocked because Playwright is not available in this environment
- no browser-based smoke checks were run
- no tooling was installed

## L. Prioritized recommendations

P0: must fix before Time sign-off

- Remove live/demo blending from manager workflow states.
- Replace the hardcoded period with real workspace-period scoping and show the date context in the table.
- Prevent unsafe approvals on incomplete or ambiguous records.
- Remove frozen demo-time dependencies from live staff portal rota and clock behavior.

P1: should fix in the Time batch

- Add a real reject/return path or explicitly remove that expectation from the UI.
- Make approval consequences clearer, including any lock or review state.
- Align export preview with exported server results or label the difference clearly.
- Add honest states for no rota, no staff, no events, and incomplete records.

P2: defer

- Secondary visual polish on dense controls.
- Broader layout tuning for mobile if workflow fixes reveal a real usability problem.

Do not build now:

- payroll integrations
- finance reporting
- BI / analytics dashboards
- employee monitoring features
- broad HR-suite scope

## M. Recommended next action

implement one focused Time cleanup slice

## Notes

- Audit-only report.
- No source files were modified.
- No commit, stage, pull, push, or rebase was performed.
