import { describe, expect, it } from "vitest";
import { parseInlineCellInput, parseTimeRange } from "./inlineCellParsing";
import type { ParsedInlineShift } from "./inlineCellParsing";

const ROLES = ["Bar", "Waiter", "Kitchen"];

function shiftsOf(input: string, roleOptions: string[] = ROLES): ParsedInlineShift[] {
  const result = parseInlineCellInput(input, { roleOptions });
  if (result.kind !== "shifts") {
    throw new Error(`expected shifts for "${input}", got ${result.kind}`);
  }
  return result.shifts;
}

function times(input: string, roleOptions: string[] = ROLES): string[] {
  return shiftsOf(input, roleOptions).map((shift) => `${shift.start}-${shift.end}`);
}

describe("parseTimeRange", () => {
  it("keeps end-before-start 24-hour inputs as overnight shifts", () => {
    expect(parseTimeRange("22:00-02:00")).toEqual({ start: "22:00", end: "02:00" });
  });

  it("keeps common day shorthand deterministic", () => {
    expect(parseTimeRange("7-3")).toEqual({ start: "07:00", end: "15:00" });
    expect(parseTimeRange("12-8")).toEqual({ start: "12:00", end: "20:00" });
  });

  it("supports dot times, compact HHMM, till, and overnight suffixes", () => {
    expect(parseTimeRange("7.30-3.30")).toEqual({ start: "07:30", end: "15:30" });
    expect(parseTimeRange("0730-1530")).toEqual({ start: "07:30", end: "15:30" });
    expect(parseTimeRange("7 till 3")).toEqual({ start: "07:00", end: "15:00" });
    expect(parseTimeRange("9pm-2am overnight")).toEqual({ start: "21:00", end: "02:00" });
  });

  it("rejects same-start-end and overlong ranges", () => {
    expect(parseTimeRange("9-9")).toBeNull();
    expect(parseTimeRange("18-11")).toBeNull();
  });
});

describe("split-shift time context", () => {
  it("carries afternoon context across a comma-separated split", () => {
    expect(times("9-12, 5-10")).toEqual(["09:00-12:00", "17:00-22:00"]);
  });

  it("applies the same carry to slash and plus separators", () => {
    expect(times("9-12 / 5-10")).toEqual(["09:00-12:00", "17:00-22:00"]);
    expect(times("9-12 + 5-10")).toEqual(["09:00-12:00", "17:00-22:00"]);
  });

  it("leaves explicit 24-hour split segments untouched", () => {
    expect(times("09:00-12:00 / 17:00-22:00")).toEqual(["09:00-12:00", "17:00-22:00"]);
    expect(times("0900-1200 / 0500-1000")).toEqual(["09:00-12:00", "05:00-10:00"]);
  });

  it("leaves explicit am/pm split segments untouched", () => {
    expect(times("9am-12pm, 5pm-10pm")).toEqual(["09:00-12:00", "17:00-22:00"]);
    expect(times("6am-10am, 11am-3pm")).toEqual(["06:00-10:00", "11:00-15:00"]);
  });

  it("does not carry when the later segment already starts after the earlier one", () => {
    expect(times("9-12, 13-17")).toEqual(["09:00-12:00", "13:00-17:00"]);
  });

  it("preserves an overnight second segment", () => {
    expect(times("18-22, 23:00-02:00")).toEqual(["18:00-22:00", "23:00-02:00"]);
  });

  it("carries across three segments without compounding", () => {
    expect(times("8-11, 12-2, 6-9")).toEqual(["08:00-11:00", "12:00-14:00", "18:00-21:00"]);
  });

  it("never shifts a single segment", () => {
    expect(times("5-10")).toEqual(["05:00-10:00"]);
    expect(times("22:00-02:00")).toEqual(["22:00-02:00"]);
  });
});

describe("break syntax", () => {
  it.each([
    ["9-5 break 30", 30],
    ["9-5 30m break", 30],
    ["9-5 30 min break", 30],
    ["9-5 30 mins break", 30],
    ["9-5 30 minutes break", 30],
    ["9-5 brk 45", 45],
    ["9-5 no break", 0],
  ])("reads %s as a %i-minute break", (input, expected) => {
    expect(shiftsOf(input)[0]?.breakMinutes).toBe(expected);
  });

  it("leaves the break unset when none is written", () => {
    expect(shiftsOf("9-5")[0]?.breakMinutes).toBeNull();
  });

  it("keeps break text out of the role", () => {
    expect(shiftsOf("9-5 30m break Bar")[0]).toMatchObject({
      start: "09:00",
      end: "17:00",
      role: "Bar",
      breakMinutes: 30,
    });
  });

  it("rejects an implausible break rather than guessing", () => {
    expect(parseInlineCellInput("9-5 break 900", { roleOptions: ROLES }).kind).toBe("error");
  });

  it("applies a per-segment break in a split cell", () => {
    expect(shiftsOf("9-12 waiter / 17-22 bar break 30")).toEqual([
      { start: "09:00", end: "12:00", role: "Waiter", breakMinutes: null, open: false },
      { start: "17:00", end: "22:00", role: "Bar", breakMinutes: 30, open: false },
    ]);
  });
});

describe("role handling", () => {
  it("matches a permitted role case-insensitively", () => {
    expect(shiftsOf("9-5 bar")[0]?.role).toBe("Bar");
  });

  it("leaves the role unset when none is written", () => {
    expect(shiftsOf("9-5")[0]?.role).toBeNull();
  });

  it("never invents a role from unmatched trailing text", () => {
    const result = parseInlineCellInput("9-5 Sommelier", { roleOptions: ROLES });
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toContain("not one of your roles");
      expect(result.message).toContain("Bar, Waiter, Kitchen");
    }
  });

  it("does not invent a role from stray numbers either", () => {
    expect(parseInlineCellInput("9-5 30", { roleOptions: ROLES }).kind).toBe("error");
  });

  it("leaves the role unset when there are no permitted roles to check against", () => {
    expect(shiftsOf("9-5 anything", [])[0]?.role).toBeNull();
  });

  it("shares a single named role across split segments", () => {
    expect(shiftsOf("9-12, 5-10 Bar").map((shift) => shift.role)).toEqual(["Bar", "Bar"]);
  });

  it("keeps two different roles exactly as written", () => {
    expect(shiftsOf("9-12 waiter / 17-22 bar").map((shift) => shift.role)).toEqual([
      "Waiter",
      "Bar",
    ]);
  });
});

describe("open shifts and clear commands", () => {
  it("parses open shift text with time and role in either order", () => {
    expect(parseInlineCellInput("open 6pm-11pm bar", { roleOptions: ["Bar"] })).toEqual({
      kind: "shifts",
      shifts: [{ start: "18:00", end: "23:00", role: "Bar", breakMinutes: null, open: true }],
    });
    expect(parseInlineCellInput("bar 18:00-23:00 open", { roleOptions: ["Bar"] })).toEqual({
      kind: "shifts",
      shifts: [{ start: "18:00", end: "23:00", role: "Bar", breakMinutes: null, open: true }],
    });
  });

  it("parses the documented open-shift command forms", () => {
    for (const input of ["open 9-5", "9-5 open"]) {
      expect(parseInlineCellInput(input, { roleOptions: ROLES })).toEqual({
        kind: "shifts",
        shifts: [{ start: "09:00", end: "17:00", role: null, breakMinutes: null, open: true }],
      });
    }
  });

  it.each(["off", "day off", "clear", "delete"])("treats %s as a cell clear", (input) => {
    expect(parseInlineCellInput(input, { roleOptions: ROLES })).toEqual({
      kind: "clear",
      all: false,
    });
  });

  it("still supports clearing every shift in a split cell", () => {
    expect(parseInlineCellInput("delete all")).toEqual({ kind: "clear", all: true });
    expect(parseInlineCellInput("clear all")).toEqual({ kind: "clear", all: true });
  });

  it.each([
    ["holiday", "Use Leave to record or approve holiday"],
    ["annual leave", "Use Leave to record or approve holiday"],
    ["leave", "Use Leave to record or approve holiday"],
    ["unavailable", "Use staff unavailability to record this"],
    ["sick", "Sickness recording is not available in this pilot"],
    ["sickness", "Sickness recording is not available in this pilot"],
  ])("blocks %s and records nothing", (input, message) => {
    // The point of this matrix: these words must never become a shift, and must
    // never be turned into a leave, sickness or availability record.
    expect(parseInlineCellInput(input, { roleOptions: ROLES })).toEqual({
      kind: "blocked",
      message,
    });
  });

  it("fails safely on malformed and ambiguous input", () => {
    for (const input of ["nine to five", "25-30", "9-", "-5", "9-9"]) {
      expect(parseInlineCellInput(input, { roleOptions: ROLES }).kind).toBe("error");
    }
  });

  it("rejects the whole cell when any split segment is invalid", () => {
    expect(parseInlineCellInput("9-12, banana", { roleOptions: ROLES }).kind).toBe("error");
  });
});
