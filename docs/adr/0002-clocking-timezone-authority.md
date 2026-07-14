# ADR-0002: Clocking Timezone Authority, Scheduled Linkage, and Location Limitation

## Status

Accepted

---

## Context

DocklistAI records staff clock events as exact UTC instants (`timestamptz`).
Phase 25 fixed `work_date` derivation and phase 26 removed every hardcoded
`Europe/London` assumption from the portal and manager time views. That work
raised two questions that need a durable answer: **which timezone is
authoritative for a clock event**, and **what the system does — and does not —
know about where a clocking physically happened**.

---

## Decision

### Timezone authority (verified in code and SQL)

One fallback chain, applied everywhere a clock instant is interpreted as a
calendar day or wall-clock time:

1. **The staff member's primary location timezone** (`staff_members.primary_location_id → locations.timezone`).
2. **The workspace timezone** (`workspaces.timezone`) when the staff member has
   no primary location or the location has no timezone.
3. **UTC** as the last resort.

Enforced by:

- `rpc_staff_clock_event` (phase 25): stamps `time_entries.work_date` from this
  chain at clock-in.
- `staff_portal_profile.timezone` (phase 26): the portal renders every clock
  and notification time with this chain; nothing client-side hardcodes a zone.
- Manager time views (`fetchWorkspaceTimeFn`, adjustment and manual-entry
  paths): render and interpret wall-clock times per entry with the same chain.

**Published shift rows are different**: each carries its own venue timezone
(`location.timezone` of the shift's location, workspace fallback), because a
staff member can be assigned away from their primary venue. Shift display uses
the shift's venue; clocking uses the staff member's primary venue.

### Conservative scheduled-shift linkage

At staff clock-in, phase 35 attempts to link the new time entry to one assigned
shift from the latest immutable published snapshot for each relevant rota week.
The matcher evaluates current and previous local dates in each candidate
venue's timezone, accepts only the four-hour window either side of scheduled
start and before scheduled end, requires the source draft shift to still exist,
and excludes a shift already linked to that staff member. It links only when
exactly one candidate remains.

Zero candidates, overlapping/split-shift ambiguity, or a candidate changing
while the staff lock is acquired produces an **unscheduled** entry. A missed
link is safer than claiming the wrong shift. A successful match stores
`shift_id`, `scheduled_start_at`, and `scheduled_end_at`; the published snapshot
remains the scheduling authority and is not changed by clocking.

The manager Time list compares scheduled and actual instants with one fixed
five-minute grace. Late clock-in, early clock-out, late finish, missing
clock-out, incomplete break, and unscheduled attendance are derived review
facts, not persisted states. Full event evidence loads only when the review
drawer opens; a bounded event-type summary flags incomplete break pairing in
the exception-first list.

### Limitation: no physical clocking location is captured

Clock events record **who, what, and when — never where**. There is no
geolocation, no geofencing, and no device/location capture. Scheduled linkage
identifies the published venue whose timezone should format scheduled-versus-
actual review; it is **not** evidence that the person physically clocked there.
An unmatched entry continues to use the staff-primary/workspace fallback for
`work_date` and display.

The UI must never claim a physical clocking location was captured. Current
copy complies ("Shift times use each location's timezone"); any future copy
implying "clocked in at <venue>" requires a real location-capture feature and
a new ADR first — building one now is explicitly out of scope (product
boundaries, ADR-0001).

---

## Consequences

- Timesheets are trustworthy about instants and durations. A matched entry uses
  the published venue's shift date and timezone; an unmatched entry retains the
  staff-primary/workspace calendar fallback.
- Split shifts or overlapping candidates can remain unscheduled by design and
  must be reviewed as attendance, not presented as a data failure.
- Any geolocation/clock-location feature is forbidden scope without a new ADR.
