import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildTimePulse } from "./timePulse";
import { formatClockTime, isOnLocalDate } from "./timePulseFormat";
import { TIME_EXCEPTION_GRACE_MINUTES } from "./timeExceptions";
import type { TimePulseEntryInput, TimePulseShiftInput } from "./timePulseTypes";

const LONDON = "Europe/London";

/** A 10:00–18:00 London shift on 16 Aug 2026 (BST, UTC+1). */
function londonShift(overrides: Partial<TimePulseShiftInput> = {}): TimePulseShiftInput {
  return {
    sourceShiftId: "shift-1",
    staffMemberId: "staff-1",
    staffName: "Ada",
    roleName: "Bartender",
    locationId: "loc-1",
    locationName: "Harbour View",
    timezone: LONDON,
    startsAt: "2026-08-16T09:00:00.000Z",
    endsAt: "2026-08-16T17:00:00.000Z",
    ...overrides,
  };
}

function entry(overrides: Partial<TimePulseEntryInput> = {}): TimePulseEntryInput {
  return {
    id: "entry-1",
    staffMemberId: "staff-1",
    shiftId: "shift-1",
    scheduledStartAt: "2026-08-16T09:00:00.000Z",
    scheduledEndAt: "2026-08-16T17:00:00.000Z",
    clockedInAt: null,
    clockedOutAt: null,
    onOpenBreak: false,
    ...overrides,
  };
}

function build(shifts: TimePulseShiftInput[], entries: TimePulseEntryInput[], now: string) {
  return buildTimePulse({
    shifts,
    entries,
    now: new Date(now),
    fallbackTimezone: "UTC",
    staffNames: new Map([["staff-9", "Grace"]]),
  });
}

describe("time pulse — scheduled states", () => {
  it("shows the local start time before the shift begins", () => {
    const [row] = build([londonShift()], [], "2026-08-16T07:00:00.000Z");
    expect(row!.state).toBe("scheduled_upcoming");
    // 09:00Z is 10:00 in London during BST.
    expect(row!.label).toBe("Starts at 10:00");
    expect(row!.isLateClockIn).toBe(false);
  });

  it("shows 'Not clocked in' once the start has passed with no clock-in", () => {
    const [row] = build([londonShift()], [], "2026-08-16T09:30:00.000Z");
    expect(row!.state).toBe("not_clocked_in");
    expect(row!.label).toBe("Not clocked in");
  });

  it("does not call a missing clock-in late, and never says 'no-show'", () => {
    const [row] = build([londonShift()], [], "2026-08-16T12:00:00.000Z");
    expect(row!.isLateClockIn).toBe(false);
    expect(row!.label).not.toMatch(/no.?show/i);
  });
});

describe("time pulse — clock states", () => {
  it("reads an on-time clock-in as on site without a late flag", () => {
    const [row] = build(
      [londonShift()],
      [entry({ clockedInAt: "2026-08-16T09:02:00.000Z" })],
      "2026-08-16T10:00:00.000Z",
    );
    expect(row!.state).toBe("on_site");
    expect(row!.label).toBe("On site");
    expect(row!.isLateClockIn).toBe(false);
  });

  it("uses only the shared grace constant for lateness", () => {
    const graceMs = TIME_EXCEPTION_GRACE_MINUTES * 60_000;
    const start = Date.parse("2026-08-16T09:00:00.000Z");
    const atBoundary = new Date(start + graceMs).toISOString();
    const pastBoundary = new Date(start + graceMs + 60_000).toISOString();

    const [onBoundary] = build(
      [londonShift()],
      [entry({ clockedInAt: atBoundary })],
      "2026-08-16T10:00:00.000Z",
    );
    const [beyond] = build(
      [londonShift()],
      [entry({ clockedInAt: pastBoundary })],
      "2026-08-16T10:00:00.000Z",
    );

    expect(onBoundary!.isLateClockIn).toBe(false);
    expect(beyond!.isLateClockIn).toBe(true);
    expect(beyond!.exceptionCodes).toContain("late-clock-in");
    // Still a plain factual state — lateness is a flag, never the label.
    expect(beyond!.label).toBe("On site");
  });

  it("reads an open break as on break and a closed one as back on site", () => {
    const [onBreak] = build(
      [londonShift()],
      [entry({ clockedInAt: "2026-08-16T09:00:00.000Z", onOpenBreak: true })],
      "2026-08-16T13:00:00.000Z",
    );
    const [backOn] = build(
      [londonShift()],
      [entry({ clockedInAt: "2026-08-16T09:00:00.000Z", onOpenBreak: false })],
      "2026-08-16T13:00:00.000Z",
    );
    expect(onBreak!.state).toBe("on_break");
    expect(onBreak!.label).toBe("On break");
    expect(backOn!.state).toBe("on_site");
  });

  it("reads a clock-out as checked out", () => {
    const [row] = build(
      [londonShift()],
      [
        entry({
          clockedInAt: "2026-08-16T09:00:00.000Z",
          clockedOutAt: "2026-08-16T17:00:00.000Z",
        }),
      ],
      "2026-08-16T18:00:00.000Z",
    );
    expect(row!.state).toBe("checked_out");
    expect(row!.label).toBe("Checked out");
  });
});

describe("time pulse — overnight and timezone", () => {
  it("keeps an overnight shift on site after midnight", () => {
    const overnight = londonShift({
      startsAt: "2026-08-15T21:00:00.000Z",
      endsAt: "2026-08-16T05:00:00.000Z",
    });
    const [row] = build(
      [overnight],
      [
        entry({
          scheduledStartAt: overnight.startsAt,
          scheduledEndAt: overnight.endsAt,
          clockedInAt: "2026-08-15T21:00:00.000Z",
        }),
      ],
      "2026-08-16T01:00:00.000Z",
    );
    expect(row!.state).toBe("on_site");
    expect(row!.exceptionCodes).not.toContain("missing-clock-out");
  });

  it("labels each row in its own location's timezone", () => {
    const london = londonShift();
    const kiritimati = londonShift({
      sourceShiftId: "shift-2",
      staffMemberId: "staff-2",
      staffName: "Bo",
      locationId: "loc-2",
      locationName: "Island Bar",
      timezone: "Pacific/Kiritimati",
    });
    const rows = build([london, kiritimati], [], "2026-08-16T07:00:00.000Z");
    const byName = new Map(rows.map((row) => [row.staffName, row]));
    // Same instant, different local clock: UTC+1 vs UTC+14.
    expect(byName.get("Ada")!.label).toBe("Starts at 10:00");
    expect(byName.get("Bo")!.label).toBe("Starts at 23:00");
  });

  it("keeps rows from multiple locations together with their own context", () => {
    const rows = build(
      [
        londonShift(),
        londonShift({
          sourceShiftId: "shift-2",
          staffMemberId: "staff-2",
          staffName: "Bo",
          locationId: "loc-2",
          locationName: "Island Bar",
        }),
      ],
      [],
      "2026-08-16T07:00:00.000Z",
    );
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.locationId))).toEqual(new Set(["loc-1", "loc-2"]));
  });

  it("compares instants when deciding local date membership", () => {
    // 22:00 UTC is still the 16th in London (UTC+1) but already the 17th in
    // Kiritimati (UTC+14) — the same instant, two different local dates.
    expect(isOnLocalDate("2026-08-16T22:00:00.000Z", "2026-08-17", "Pacific/Kiritimati")).toBe(
      true,
    );
    expect(isOnLocalDate("2026-08-16T22:00:00.000Z", "2026-08-17", LONDON)).toBe(false);
    expect(isOnLocalDate("2026-08-16T22:00:00.000Z", "2026-08-16", LONDON)).toBe(true);
    expect(formatClockTime("2026-08-16T09:00:00.000Z", LONDON)).toBe("10:00");
  });
});

describe("time pulse — only today's scheduled work appears", () => {
  /** Yesterday's shift, still inside the read's ±2-day entry window. */
  const priorDayEntry = entry({
    id: "entry-yesterday",
    shiftId: "shift-yesterday",
    scheduledStartAt: "2026-08-15T09:00:00.000Z",
    scheduledEndAt: "2026-08-15T17:00:00.000Z",
    clockedInAt: "2026-08-15T09:00:00.000Z",
    clockedOutAt: "2026-08-15T17:02:00.000Z",
  });

  it("drops a prior-day shift-linked entry entirely rather than showing it today", () => {
    const rows = build([londonShift()], [priorDayEntry], "2026-08-16T12:00:00.000Z");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).toBe("shift:shift-1");
  });

  it("never relabels a prior-day scheduled shift as unscheduled attendance", () => {
    const rows = build([londonShift()], [priorDayEntry], "2026-08-16T12:00:00.000Z");
    expect(rows.some((row) => row.isUnscheduled)).toBe(false);
    expect(rows.some((row) => row.staffName === "Ada" && row.state === "checked_out")).toBe(false);
  });

  it("ignores an entry whose shift a republish removed from the board", () => {
    // The shift existed when the clock-in happened; the latest snapshot no
    // longer contains it, so it is not part of today's resolved shift set.
    const droppedShiftEntry = entry({
      id: "entry-dropped",
      shiftId: "shift-withdrawn",
      clockedInAt: "2026-08-16T09:00:00.000Z",
    });
    const rows = build([londonShift()], [droppedShiftEntry], "2026-08-16T12:00:00.000Z");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.isUnscheduled).toBe(false);
  });

  it("renders one row only when a shift has several clock sessions", () => {
    const closed = entry({
      id: "closed",
      clockedInAt: "2026-08-16T09:00:00.000Z",
      clockedOutAt: "2026-08-16T11:00:00.000Z",
    });
    const open = entry({ id: "open", clockedInAt: "2026-08-16T11:05:00.000Z" });
    const rows = build([londonShift()], [closed, open], "2026-08-16T12:00:00.000Z");

    expect(rows).toHaveLength(1);
    // The open session is the shift's current truth.
    expect(rows[0]!.state).toBe("on_site");
    expect(rows[0]!.isUnscheduled).toBe(false);
  });

  it("uses the latest clock-in when every session for a shift is closed", () => {
    const early = entry({
      id: "early",
      clockedInAt: "2026-08-16T09:00:00.000Z",
      clockedOutAt: "2026-08-16T11:00:00.000Z",
    });
    const later = entry({
      id: "later",
      clockedInAt: "2026-08-16T12:00:00.000Z",
      clockedOutAt: "2026-08-16T15:00:00.000Z",
    });
    const rows = build([londonShift()], [early, later], "2026-08-16T16:00:00.000Z");

    expect(rows).toHaveLength(1);
    expect(rows[0]!.state).toBe("checked_out");
    expect(rows[0]!.clockedInAt).toBe("2026-08-16T12:00:00.000Z");
  });
});

describe("time pulse — unscheduled attendance", () => {
  it("surfaces attendance with no published shift as unscheduled", () => {
    const rows = build(
      [],
      [
        entry({
          id: "entry-9",
          staffMemberId: "staff-9",
          shiftId: null,
          scheduledStartAt: null,
          scheduledEndAt: null,
          clockedInAt: "2026-08-16T09:00:00.000Z",
        }),
      ],
      "2026-08-16T10:00:00.000Z",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.isUnscheduled).toBe(true);
    expect(rows[0]!.staffName).toBe("Grace");
    expect(rows[0]!.state).toBe("on_site");
    expect(rows[0]!.exceptionCodes).toContain("unscheduled-attendance");
  });

  it("does not duplicate a person who has a matching published shift", () => {
    const rows = build(
      [londonShift()],
      [entry({ clockedInAt: "2026-08-16T09:00:00.000Z" })],
      "2026-08-16T10:00:00.000Z",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.isUnscheduled).toBe(false);
  });
});

describe("time pulse — no persisted judgement", () => {
  it("derives read-only rows with no scoring vocabulary in the source", () => {
    const source = readFileSync("src/features/time/lib/timePulse.ts", "utf8");
    const surface = `${source}\n${readFileSync("src/features/time/api/timePulseRead.ts", "utf8")}`;
    expect(surface).not.toMatch(
      /punctuality_score|performance_score|energy_level|absence_probability|reliability|ai_insights|no.?show/i,
    );
    // Read-only: the server function must never write.
    expect(surface).not.toMatch(/\.(insert|upsert|update|delete)\(/);
  });

  it("returns plain data and mutates none of its inputs", () => {
    const shifts = [londonShift()];
    const entries = [entry({ clockedInAt: "2026-08-16T09:00:00.000Z" })];
    const snapshot = JSON.stringify({ shifts, entries });
    build(shifts, entries, "2026-08-16T10:00:00.000Z");
    expect(JSON.stringify({ shifts, entries })).toBe(snapshot);
  });
});
