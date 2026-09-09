# Domain Risk Rules — what to look for, per domain

Loaded from `docklist-proactive-maintenance-guard` when scanning a specific
domain. SKILL.md carries the fix-eligibility rule; this file carries the
per-domain checklists.

## Domain Risk Rules

### Frontend and UI

Can be fixed proactively when local, visible, and inside scope.

Look for:

- broken interactions
- empty drawers, modals, popovers, and dialogs
- bland drawers, modals, popovers, and dialogs
- misleading buttons
- fake controls
- missing disabled states
- poor focus behaviour
- accessibility issues
- layout overflow
- stale dates
- copy mismatch
- weak empty states

### Backend and API

Can be noticed anytime.

Can only be fixed if backend work is approved.

Look for:

- unsafe assumptions
- missing validation
- unclear error handling
- data leakage
- overly broad queries
- weak permission checks
- API responses that do not match frontend needs
- broken status codes
- missing failure handling

### Supabase, Database, and RLS

Can be noticed anytime.

Usually report first.

Only fix when database, Supabase, RLS, or security scope is explicitly approved.

Look for:

- workspace isolation risks
- manager-only data exposed to staff
- missing tenant filters
- unsafe update or delete policies
- migration drift
- historical data risks
- missing indexes that clearly affect approved scope
- unsafe RPC behaviour
- staff visibility risks

### Auth and Security

Can be noticed anytime.

Report first unless the task is explicitly security or auth scoped.

Look for:

- permission leaks
- unsafe redirects
- missing role checks
- sensitive data exposure
- secrets or tokens in code
- weak access boundaries
- insecure client-side assumptions
- staff access to manager-only data

### Tests and Verification

Can be fixed proactively when related to the current task.

Do not rewrite broad tests unless approved.

Look for:

- tests failing because of current changes
- missing test updates for changed behaviour
- fragile assertions in touched areas
- test data that no longer matches approved behaviour
- snapshot drift caused by current work

### Documentation

Can be fixed proactively when small and related.

Report larger documentation debt.

Look for:

- outdated instructions
- wrong command references
- missing scope notes
- incorrect product direction
- agent guidance conflicts
- old references to payroll integrations
- old references to AI-heavy product positioning
- stale product-split figures (the split is 50/30/20)
- guidance that treats pilot, release or deployment as the default goal
- guidance that treats Lovable as product authority rather than a tool

### Dependencies, Tooling, and CI

Can be noticed anytime.

Usually report first.

Only fix when the task includes tooling, build, dependency, or CI scope.

Look for:

- broken scripts
- failing build config
- unsafe dependency patterns
- deprecated commands
- duplicate tooling rules
- CI mismatch with local commands
- unnecessary dependency additions

### Generated Files

Must not be touched unless explicitly approved.

Examples:

- routeTree.gen.ts
- generated Supabase types
- generated API clients
- build artifacts
- temporary files
- Playwright traces
- Playwright screenshots
- test result artifacts
