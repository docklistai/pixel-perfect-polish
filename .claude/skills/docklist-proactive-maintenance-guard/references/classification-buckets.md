# Classification Buckets — full criteria and examples

Loaded from `docklist-proactive-maintenance-guard`. The five buckets are
summarised in SKILL.md; this file carries the full conditions and examples.

## Classification Buckets

Every proactive finding must be classified before action.

### Bucket 1: Fix Now

The agent may fix the issue during the current task only if all conditions are true:

- The issue is inside the approved scope.
- The issue is close to the files or behaviour already being worked on.
- The fix is small and local.
- The fix is low-risk.
- The fix does not introduce a new feature.
- The fix does not change product direction.
- The fix does not require a broader architecture decision.
- The fix does not touch forbidden areas for the current task.
- The fix can be verified with targeted checks.

Examples:

- A button in the current component opens an empty drawer.
- A form touched by the task has a missing label.
- A route being edited contains a stale date.
- A local test fails because of the current change.
- A small type error appears in a directly related file.
- A related copy string conflicts with DocklistAI product direction.
- A nearby helper has a clear bug affecting the current feature.

### Bucket 2: Fix Only If Current Scope Allows It

The agent may fix the issue only if the active task explicitly includes that domain.

Examples:

- Backend API issue during an approved backend task.
- Supabase query issue during an approved Supabase task.
- RLS policy issue during an approved security or database task.
- Test suite repair during an approved testing task.
- Build configuration issue during an approved tooling task.
- Documentation drift during an approved docs task.

If the current task does not include that domain, report the issue instead.

### Bucket 3: Report, Do Not Fix Yet

The agent must report the issue but not implement it when:

- The fix spans multiple features.
- The fix touches shared architecture.
- The fix changes app-wide behaviour.
- The fix needs product approval.
- The fix affects security, auth, billing, payroll, AI, or database safety.
- The fix requires dependency upgrades.
- The fix affects generated files.
- The fix is real but outside the current scope.

Examples:

- App-wide drawer system feels weak.
- A shared API pattern is inconsistent.
- RLS policy may expose too much data.
- Billing copy conflicts with pricing direction.
- AI/operator logic needs tool permission boundaries.
- CI config is messy but not blocking the task.
- Multiple routes repeat the same fragile pattern.

### Bucket 4: Risk Log Only

The agent should log but not fix future-facing risks that are not blocking now.

Examples:

- Component is getting too large.
- Route may soon exceed size guardrails.
- Test coverage is thin but not failing.
- Demo data is becoming hard to maintain.
- Naming is inconsistent but not breaking behaviour.
- A future dark mode conflict is likely.
- A helper should eventually be extracted.

### Bucket 5: Forbidden Unless Explicitly Approved

The agent must not touch these unless the user has clearly approved that area for the current task:

- Supabase migrations
- RLS policies
- auth logic
- billing
- payroll integrations
- AI/operator implementation
- external integrations
- dependency upgrades
- CI/CD workflows
- generated files
- large shared primitives
- repo-wide formatting
- broad architecture changes
