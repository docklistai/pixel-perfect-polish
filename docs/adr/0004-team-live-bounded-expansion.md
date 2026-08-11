# ADR-0004: Team Live — Bounded Expansion

## Status

Accepted

Supersedes, for three narrowly-scoped Team-attached concepts only, the
corresponding non-goal lines in `docs/adr/0001`. ADR-0001 remains in force in
every other respect, including the 50/30/20 split and every other non-goal.

---

## Context

Phase 55 makes the existing Team page genuinely operational. Until Phase 54 the
whole page was sample content behind a preview banner, and the Phase 55 audit
confirmed it performed no reads and no writes at all.

The Team page as built contains six concepts. Three are unambiguously inside
ADR-0001 as written — broadcast announcements, acknowledgement tracking, and
department audiences. Three are not:

- **Training reminders** touch ADR-0001's *"learning-management system (LMS)"* non-goal.
- **Birthday reminders** touch the *"engagement platform"* non-goal.
- **Staff events** touch the *"event planner"* non-goal.

A product decision was taken to make the entire existing Team surface real
rather than remove those three sections. AGENTS.md and
`DOCKLIST_OPERATING_SYSTEM.md` both require that a forbidden-scope change is
recorded in an ADR before implementation, not merely in code comments. This ADR
is that record.

## Decision

The three concepts above become live, **bounded strictly to what the existing
Team UI already displays**. They are reminder and context records attached to
the Team surface. They are not the beginning of three new product areas.

### Training reminders — a reminder, not an LMS

Permitted: title, source, assigned audience, due date, mandatory/optional flag,
per-staff completion state, a manager note, and a manager-issued reminder.

Forbidden without a further ADR: courses, modules, lessons, content hosting,
assessments, scoring, certificates, expiry/renewal automation, learning paths,
training analytics, or any staff-facing training UI beyond the existing
notification.

### Birthday reminders — a date, not engagement

Permitted: **day and month only** on `staff_members`, plus a manager-only
acknowledgement. The birth **year is deliberately not stored**, so the record
cannot yield age, and no age-derived logic can be built on it later.

Forbidden without a further ADR: full date of birth, age, any personal-profile
expansion, staff-visible birthday surfaces, automated greetings, celebration
feeds, or exposure of birthday data outside manager-only Team context.

### Staff events — informational, not an event platform

Permitted: title and scheduled time, displayed as a read-only manager rail
exactly as the current card does.

Forbidden without a further ADR: RSVP, invitations, calendar integration,
booking, capacity, attendance tracking, event chat, or event analytics.

### Announcement comments — attached notes, not chat

The existing announcement comment thread becomes real, bounded to
manager-authored notes attached to exactly one announcement, with author and
timestamp. This narrows ADR-0001's communication model, which reads *"No
replies, threads, reactions, direct messages"* — that rule continues to govern
**staff-facing** communication without exception. Managers hold no channel,
no direct messages, no reactions, and no presence.

## Consequences

- The Team page contains no preview or sample content once Phase 55 lands.
- Team's schema stays attached to the visible Team UI. A future agent must not
  read these tables as a licence to build the systems the sections resemble.
- Everything ADR-0001 excludes that is **not** named above stays excluded:
  payroll, performance reviews, staff chat or DMs, reactions, social feed,
  recruitment/ATS, project management, org charts, workforce analytics,
  advanced RBAC, and AI employee evaluation.
- Adding one optional day/month birthday input to the existing Staff record
  editor is in scope, because Team cannot display real birthdays unless the
  datum can be entered somewhere. That input is the entire permitted change to
  Staff; it is not a profile expansion.
- ADR-0003's Team/Ops boundary is unchanged. Ops briefings remain manager-only
  and must never be surfaced as staff-facing Team content.
