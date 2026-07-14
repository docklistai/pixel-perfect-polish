# ADR-0002: Clocking Timezone Authority and Location Limitation

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

### Limitation: no physical clocking location is captured

Clock events record **who, what, and when — never where**. There is no
geolocation, no geofencing, no device/location capture, and no linkage from a
time entry to the shift or venue the person actually stood at when clocking.
A staff member working a shift at a non-primary venue in a different timezone
still gets their **primary** location's timezone for `work_date`.

The UI must never claim a physical clocking location was captured. Current
copy complies ("Shift times use each location's timezone"); any future copy
implying "clocked in at <venue>" requires a real location-capture feature and
a new ADR first — building one now is explicitly out of scope (product
boundaries, ADR-0001).

---

## Consequences

- Timesheets are trustworthy about instants and durations; the calendar day a
  shift's pay lands on follows the staff member's primary venue.
- Cross-venue clock-ins near midnight can land `work_date` on the primary
  venue's calendar day rather than the physical venue's. Accepted until a
  shift↔time-entry location linkage exists.
- Any geolocation/clock-location feature is forbidden scope without a new ADR.
