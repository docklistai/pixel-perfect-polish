# Phase 3 + Phase 8 Completion Audit

## Current Baseline

- Phase 7 data foundation: `a53fcb9`
- Rota live read foundation: `2e27a10`
- Live rota persistence + publish: `e9b916e`
- Local DB reset back to seeded Harbour View baseline
- Worktree clean before this doc

## Master Roadmap Status

- Phase 3 Business Logic active / near completion
- Phase 8 Staff Portal active / near completion
- Security not formally started yet

## Phase 3 Status

| Area | Status | Notes |
|---|---|---|
| Live rota read/write/publish | Complete | Core live rota path is in place. |
| Live rota location handling | Complete, needs more runtime coverage | Location and timezone handling exist; multi-location runtime deserves more smoke. |
| Template/copy/generate/suggestions | Deferred | Convenience automation stays draft/demo-only for now. |
| Leave decisions | Complete, browser smoke still useful | Manager decisions are live-backed; runtime smoke would still add confidence. |
| Manager-created leave | Remaining / defer decision | Live manager-create is not yet wired. |
| Time approvals/rejections/export | Mostly complete | Approval and export are live-backed; rejection flow is less exposed in UI. |
| Time adjust | Partial | RPC exists, but live UI wiring is not finished. |
| Time flagging | Blocked by schema/RPC | No live path yet. |
| Manager notifications/dashboard/topbar | Partial/demo-looking | These surfaces still mix in demo/static state. |
| Demo fallback | Mostly safe | Harbour View fallback remains intentional and should stay. |

## Phase 8 Status

| Area | Status | Notes |
|---|---|---|
| Portal access-code | Complete | Claim flow is in place. |
| Published shifts | Complete | Staff-safe published snapshot reads are wired. |
| Staff leave submit | Complete | Live submission exists. |
| Portal notifications/mark-read | Mostly complete | Reads and mark-read exist, with fallback behavior still present. |
| Portal clock | Remaining | Live clock in/out/break still needs wiring. |
| Portal time entries/history | Remaining | Staff-safe views exist, but the UI does not fully consume them yet. |
| Portal home | Partial | Mixed live and demo/static content. |
| Staff-safe boundaries | Complete for wired paths | Manager/staff route boundaries are enforced. |

## Required Before Moving to Security

1. Portal live clock in/out/break via `rpc_staff_clock_event`
2. Portal time entries/history via staff-safe views
3. Manager time adjustment via `rpc_adjust_time_entry`
4. Honest dashboard/topbar/manager notification live/demo handling
5. Targeted runtime/browser smoke after implementation

## Safe Deferrals

- Live templates
- Copy previous week
- Generate/suggestions
- Manager-created leave
- Time flagging
- Broader HR/payroll/BI/LMS/autonomous AI

## Schema/RPC Blockers

- Manager-created leave needs an RPC if kept
- Time flagging needs schema/RPC if kept
- Template/copy/generate needs an atomic replace RPC/migration if kept live
- Manager notification center may need a safe read/update path if made live

## Frontend/Server-Function-Only Work

- Portal clock
- Portal time history
- Manager time adjustment
- Dashboard/topbar honesty changes where derived from existing live reads

## Recommended Implementation Pass

1. Portal clock/time first
2. Manager time adjustment second
3. Dashboard/topbar honesty third
4. No bloat

## Explicit Boundaries

- Scheduling/staff-ops only
- No UI redesign
- No broad refactor
- No service-role key
- No browser writes for sensitive actions
- No remote DB changes
- Keep Harbour View/demo fallback
