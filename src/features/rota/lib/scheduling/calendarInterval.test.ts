import { describe, expect, it } from "vitest";
import {
  datesTouchedByInterval,
  dayNumberFromIso,
  intervalConflict,
  intervalDurationMinutes,
  intervalsOverlap,
  isOvernightLocal,
  isoDateFromDayNumber,
  parseLocalTimeToMinutes,
  toAbsoluteInterval,
} from "./calendarInterval";

const MON = "2026-07-27";
const TUE = "2026-07-28";
const WED = "2026-07-29";

function interval(workDate: string, start: string, end: string) {
  const placed = toAbsoluteInterval({ workDate, start, end });
  if (!placed) throw new Error(`test fixture is unreadable: ${start}-${end}`);
  return placed;
}

describe("parseLocalTimeToMinutes", () => {
  it("reads zero-padded and single-digit hours", () => {
    expect(parseLocalTimeToMinutes("09:30")).toBe(570);
    expect(parseLocalTimeToMinutes("9:30")).toBe(570);
    expect(parseLocalTimeToMinutes("00:00")).toBe(0);
    expect(parseLocalTimeToMinutes("23:59")).toBe(1439);
  });

  it("rejects anything out of range or malformed", () => {
    for (const value of ["24:00", "12:60", "-1:00", "9", "9:5", "", "abc", "09:30:00"]) {
      expect(parseLocalTimeToMinutes(value)).toBeNull();
    }
  });
});

describe("date numbering", () => {
  it("round-trips an ISO date", () => {
    for (const date of [MON, TUE, "2026-01-01", "2026-12-31", "2028-02-29"]) {
      const day = dayNumberFromIso(date);
      expect(day).not.toBeNull();
      expect(isoDateFromDayNumber(day!)).toBe(date);
    }
  });

  it("gives consecutive dates consecutive numbers across a month boundary", () => {
    expect(dayNumberFromIso("2026-08-01")! - dayNumberFromIso("2026-07-31")!).toBe(1);
  });

  it("rejects a malformed date", () => {
    expect(dayNumberFromIso("27-07-2026")).toBeNull();
    expect(dayNumberFromIso("2026-7-27")).toBeNull();
  });
});

describe("overnight state is explicit", () => {
  it("treats an end at or before the start as the next day", () => {
    expect(isOvernightLocal("22:00", "02:00")).toBe(true);
    expect(isOvernightLocal("22:00", "22:00")).toBe(true);
    expect(isOvernightLocal("16:00", "00:00")).toBe(true);
    expect(isOvernightLocal("09:00", "17:00")).toBe(false);
  });

  it("carries the flag on the placed interval", () => {
    expect(interval(MON, "22:00", "02:00").overnight).toBe(true);
    expect(interval(MON, "09:00", "17:00").overnight).toBe(false);
  });

  it("measures an overnight duration across the boundary", () => {
    expect(intervalDurationMinutes(interval(MON, "22:00", "02:00"))).toBe(240);
    expect(intervalDurationMinutes(interval(MON, "09:00", "17:00"))).toBe(480);
    expect(intervalDurationMinutes(interval(MON, "16:00", "00:00"))).toBe(480);
  });
});

describe("cross-midnight conflicts", () => {
  it("finds the clash a same-day comparison cannot see", () => {
    // The defect this engine exists to fix: Monday 22:00-02:00 and Tuesday
    // 00:00-08:00 are two hours of the same person on two different day indexes.
    expect(intervalsOverlap(interval(MON, "22:00", "02:00"), interval(TUE, "00:00", "08:00"))).toBe(
      true,
    );
  });

  it("leaves a genuinely separate next-day shift alone", () => {
    expect(intervalsOverlap(interval(MON, "22:00", "02:00"), interval(TUE, "08:00", "16:00"))).toBe(
      false,
    );
  });

  it("does not invent a clash two days apart", () => {
    expect(intervalsOverlap(interval(MON, "22:00", "02:00"), interval(WED, "00:00", "08:00"))).toBe(
      false,
    );
  });

  it("treats a clean handover as no clash", () => {
    expect(intervalsOverlap(interval(MON, "09:00", "17:00"), interval(MON, "17:00", "23:00"))).toBe(
      false,
    );
    expect(intervalsOverlap(interval(MON, "22:00", "02:00"), interval(TUE, "02:00", "08:00"))).toBe(
      false,
    );
  });

  it("finds an ordinary same-day overlap in both argument orders", () => {
    const early = interval(MON, "09:00", "17:00");
    const late = interval(MON, "16:00", "23:00");
    expect(intervalsOverlap(early, late)).toBe(true);
    expect(intervalsOverlap(late, early)).toBe(true);
  });
});

describe("intervalConflict — one unreadable-time policy", () => {
  it("reports an overlap as an overlap", () => {
    expect(
      intervalConflict(
        { workDate: MON, start: "22:00", end: "02:00" },
        { workDate: TUE, start: "00:00", end: "08:00" },
      ),
    ).toBe("overlap");
  });

  it("reports no conflict when the intervals are clear", () => {
    expect(
      intervalConflict(
        { workDate: MON, start: "09:00", end: "12:00" },
        { workDate: MON, start: "13:00", end: "17:00" },
      ),
    ).toBeNull();
  });

  it("reports an unreadable time as a conflict, whichever side it is on", () => {
    const good = { workDate: MON, start: "09:00", end: "17:00" };
    const bad = { workDate: MON, start: "nine", end: "17:00" };
    expect(intervalConflict(bad, good)).toBe("unreadable");
    expect(intervalConflict(good, bad)).toBe("unreadable");
  });

  it("reports an unreadable date as a conflict", () => {
    expect(
      intervalConflict(
        { workDate: "not-a-date", start: "09:00", end: "17:00" },
        { workDate: MON, start: "09:00", end: "17:00" },
      ),
    ).toBe("unreadable");
  });
});

describe("datesTouchedByInterval", () => {
  it("returns one date for a day shift", () => {
    expect(datesTouchedByInterval({ workDate: MON, start: "09:00", end: "17:00" })).toEqual([MON]);
  });

  it("returns both dates for an overnight shift", () => {
    expect(datesTouchedByInterval({ workDate: MON, start: "22:00", end: "02:00" })).toEqual([
      MON,
      TUE,
    ]);
  });

  it("stops at the start date when the shift ends exactly at midnight", () => {
    // 16:00-00:00 is worked entirely on Monday; Tuesday must not be treated as a
    // day the person was scheduled, or a Tuesday day-off would clash wrongly.
    expect(datesTouchedByInterval({ workDate: MON, start: "16:00", end: "00:00" })).toEqual([MON]);
  });

  it("returns nothing when the times cannot be read", () => {
    expect(datesTouchedByInterval({ workDate: MON, start: "??", end: "17:00" })).toEqual([]);
  });
});
