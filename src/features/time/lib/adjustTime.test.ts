import { describe, it, expect } from "vitest";
import {
  parseClockField,
  parseBreakMinutes,
  breakValueToOption,
  workspaceWallTimeToIso,
} from "./adjustTime";

describe("parseClockField", () => {
  it("parses valid HH:MM and H:MM", () => {
    expect(parseClockField("08:00")).toEqual({ hours: 8, minutes: 0 });
    expect(parseClockField("8:30")).toEqual({ hours: 8, minutes: 30 });
    expect(parseClockField(" 23:59 ")).toEqual({ hours: 23, minutes: 59 });
  });

  it("returns null for blank, em-dash, or invalid values", () => {
    expect(parseClockField("")).toBeNull();
    expect(parseClockField("—")).toBeNull();
    expect(parseClockField("24:00")).toBeNull();
    expect(parseClockField("12:60")).toBeNull();
    expect(parseClockField("abc")).toBeNull();
  });
});

describe("parseBreakMinutes", () => {
  it("parses H:MM option values", () => {
    expect(parseBreakMinutes("0:00")).toBe(0);
    expect(parseBreakMinutes("0:30")).toBe(30);
    expect(parseBreakMinutes("1:00")).toBe(60);
  });

  it("parses the live '<n>m' format", () => {
    expect(parseBreakMinutes("30m")).toBe(30);
    expect(parseBreakMinutes("45 m")).toBe(45);
  });

  it("rejects out-of-range and unparseable values", () => {
    expect(parseBreakMinutes("25:00")).toBeNull(); // 1500 > 1440
    expect(parseBreakMinutes("bad")).toBeNull();
  });
});

describe("breakValueToOption", () => {
  it("snaps to the closest dialog option", () => {
    expect(breakValueToOption("30m")).toBe("0:30");
    expect(breakValueToOption("1:00")).toBe("1:00");
    expect(breakValueToOption("12m")).toBe("0:15"); // 12 closer to 15 than to 0
    expect(breakValueToOption("50m")).toBe("0:45"); // 50 closer to 45 than to 60
  });

  it("defaults to 0:30 when the input cannot be read", () => {
    expect(breakValueToOption("nonsense")).toBe("0:30");
  });
});

describe("workspaceWallTimeToIso (Europe/London)", () => {
  it("treats winter wall time as GMT (UTC+0)", () => {
    expect(workspaceWallTimeToIso("2026-01-15", 8, 0)).toBe("2026-01-15T08:00:00.000Z");
  });

  it("treats summer wall time as BST (UTC+1)", () => {
    expect(workspaceWallTimeToIso("2026-07-15", 8, 0)).toBe("2026-07-15T07:00:00.000Z");
  });
});
