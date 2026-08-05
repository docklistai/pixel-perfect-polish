# ADR-0003: Team Broadcasts and Ops Briefings

## Status

Accepted

---

## Context

DocklistAI has two deliberately different communication records. Team contains
staff-facing announcements and acknowledgement workflows. Phase 50 makes Ops
briefings persistent, which requires a clear ownership boundary so manager
operational context is never exposed as a staff broadcast.

## Decision

- **Team owns staff broadcasts.** Announcements intended for staff, staff read
  state, and staff acknowledgement remain Team responsibilities.
- **Ops owns manager operational briefings.** An Ops briefing is authored by a
  manager for selected active owner/manager recipients, retains location and
  calendar-date context, can link operational entries, and records manager read
  and acknowledgement state.
- Ops briefings are manager-only records. They do not appear in the staff
  portal, do not notify staff memberships, and do not replace Team
  announcements.
- Handovers remain a separate Ops record for shift-to-shift transfer of
  unresolved items. A briefing provides an authored operational summary; it is
  not chat and has no reply thread.

## Consequences

- Managers choose Team when information must reach staff and Ops when retaining
  manager-only operational context.
- Future work must not merge these recipient models or reuse Ops notes as staff
  content without a new architecture decision and explicit privacy review.
- This boundary adds no chat, LMS, payroll, compliance automation, or broad
  facilities-management scope.
