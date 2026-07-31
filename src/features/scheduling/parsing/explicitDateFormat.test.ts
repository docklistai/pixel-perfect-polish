import { describe, expect, it } from "vitest";
import { isDateSetAmbiguous, readDate } from "./explicitDateFormat";

describe("ISO dates are always safe", () => {
  it("reads yyyy-mm-dd under any declared order", () => {
    for (const order of ["iso", "day-first", "month-first"] as const) {
      expect(readDate("2026-04-03", order)).toEqual({ ok: true, isoDate: "2026-04-03" });
    }
  });

  it("rejects an ISO-shaped value that is not a real date", () => {
    const result = readDate("2026-02-30", "iso");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("out-of-range");
  });
});

describe("numeric dates require a declared order", () => {
  it("reads day-first when told to", () => {
    expect(readDate("03/04/2026", "day-first")).toEqual({ ok: true, isoDate: "2026-04-03" });
  });

  it("reads month-first when told to", () => {
    expect(readDate("03/04/2026", "month-first")).toEqual({ ok: true, isoDate: "2026-03-04" });
  });

  it("refuses to guess when the caller declared ISO", () => {
    // The whole point: 03/04/2026 is 3 April to one manager and 4 March to
    // another, and guessing puts a week on the wrong days.
    const result = readDate("03/04/2026", "iso");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("ambiguous");
  });

  it("accepts hyphen and dot separators", () => {
    expect(readDate("03-04-2026", "day-first")).toEqual({ ok: true, isoDate: "2026-04-03" });
    expect(readDate("03.04.2026", "day-first")).toEqual({ ok: true, isoDate: "2026-04-03" });
  });

  it("expands a two-digit year into this century", () => {
    expect(readDate("03/04/26", "day-first")).toEqual({ ok: true, isoDate: "2026-04-03" });
  });

  it("rejects a value that is not a real date under the declared order", () => {
    const result = readDate("30/04/2026", "month-first");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("out-of-range");
  });

  it("rejects text that is not a date at all", () => {
    const result = readDate("next tuesday", "day-first");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("unreadable");
  });

  it("rejects a blank value", () => {
    expect(readDate("   ", "day-first").ok).toBe(false);
  });
});

describe("isDateSetAmbiguous", () => {
  it("is ambiguous when every numeric date could be read either way", () => {
    expect(isDateSetAmbiguous(["03/04/2026", "05/06/2026"])).toBe(true);
  });

  it("is unambiguous once any component exceeds 12", () => {
    expect(isDateSetAmbiguous(["03/04/2026", "27/04/2026"])).toBe(false);
  });

  it("is not ambiguous when there are no numeric dates to disagree about", () => {
    expect(isDateSetAmbiguous(["2026-04-03", "2026-04-27"])).toBe(false);
    expect(isDateSetAmbiguous([])).toBe(false);
  });
});
