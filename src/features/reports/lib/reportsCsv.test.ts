import { describe, expect, it } from "vitest";
import { buildCoverageCsv } from "./reportsCsv";

describe("Published schedule coverage CSV", () => {
  it("uses the approved fixed columns and current filtered rows", () => {
    const csv = buildCoverageCsv([
      {
        date: "2026-08-10",
        location: "Harbour View",
        department: "Kitchen",
        assignedShifts: 3,
        openShifts: 1,
        scheduledMinutes: 1320,
        openMinutes: 450,
      },
    ]);
    expect(csv).toBe(
      "Date,Location,Department,Assigned shifts,Open shifts,Net scheduled hours,Open hours\r\n" +
        "2026-08-10,Harbour View,Kitchen,3,1,22.00,7.50",
    );
  });

  it("escapes commas, quotes, newlines, and spreadsheet formulas", () => {
    const csv = buildCoverageCsv([
      {
        date: "2026-08-10",
        location: '=HYPERLINK("https://example.test")',
        department: "Kitchen, prep\nteam",
        assignedShifts: 1,
        openShifts: 0,
        scheduledMinutes: 450,
        openMinutes: 0,
      },
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"');
    expect(csv).toContain('"Kitchen, prep\nteam"');
  });

  it("returns a header-only CSV for an honest empty filtered export", () => {
    expect(buildCoverageCsv([]).split("\r\n")).toHaveLength(1);
  });
});
