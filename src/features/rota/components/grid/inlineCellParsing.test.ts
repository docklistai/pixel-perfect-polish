import { describe, expect, it } from "vitest";
import { parseInlineCellInput, parseTimeRange } from "./inlineCellParsing";

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

describe("parseInlineCellInput", () => {
  it("parses split shifts with roles and break commands", () => {
    expect(
      parseInlineCellInput("9-12 waiter / 17-22 bar break 30", {
        roleOptions: ["Waiter", "Bar"],
      }),
    ).toEqual({
      kind: "shifts",
      shifts: [
        { start: "09:00", end: "12:00", role: "Waiter", breakMinutes: null, open: false },
        { start: "17:00", end: "22:00", role: "Bar", breakMinutes: 30, open: false },
      ],
    });
  });

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

  it("accepts non-shift clear commands without treating leave as a rota state", () => {
    expect(parseInlineCellInput("clear")).toEqual({ kind: "clear", all: false });
    expect(parseInlineCellInput("delete all")).toEqual({ kind: "clear", all: true });
    expect(parseInlineCellInput("annual leave").kind).toBe("error");
  });
});
