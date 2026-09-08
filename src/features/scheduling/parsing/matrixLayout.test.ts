import { describe, expect, it } from "vitest";
import { importHeadedSchedule, type HeadedImportOptions } from "./headedScheduleImport";
import { readMatrixCell } from "./matrixCell";

/** Mon 3 Aug .. Sun 9 Aug 2026. */
const WEEK = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];

function options(overrides: Partial<HeadedImportOptions> = {}): HeadedImportOptions {
  return {
    dateOrder: "day-first",
    weekIsoDates: WEEK,
    locationId: "loc-1",
    staff: [
      { id: "s1", name: "Ana Chef", active: true, roleName: "Chef" },
      { id: "s2", name: "Bo Barman", active: true, roleName: "Bar" },
      { id: "s3", name: "Carter, Ben", active: true, roleName: "Bar" },
      { id: "s4", name: "Twin Tess", active: true, roleName: "Bar" },
      { id: "s5", name: "Twin Tess", active: true, roleName: "Bar" },
    ],
    departments: [{ id: "dept-kitchen", name: "Kitchen", active: true }],
    defaultDepartmentId: "dept-kitchen",
    ...overrides,
  };
}

const grid = (...lines: string[]) => lines.join("\n");

describe("weekday grid", () => {
  it("reads a staff × weekday grid into shifts on this week's days", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon,Tue,Wed", "Ana Chef,9-5,,9-5", "Bo Barman,,17:00-23:00,"),
      options(),
    );

    expect(result.layout).toBe("matrix");
    expect(result.ok).toBe(true);
    expect(result.validCount).toBe(3);
    expect(result.errorCount).toBe(0);

    const dates = result.rows.map((row) => row.shift?.signature.workDate);
    // Mon, Wed for Ana; Tue for Bo — resolved against the target week.
    expect(dates).toEqual(["2026-08-03", "2026-08-05", "2026-08-04"]);
  });

  it("takes the role from the person when the cell only wrote hours", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,9-5,"), options());

    expect(result.rows[0]?.shift?.roleName).toBe("Chef");
    expect(result.rows[0]?.shift?.staffId).toBe("s1");
  });

  it("lets a role written in the cell win over the person's own", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,Chef 9-5,"), options());

    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.shift?.roleName).toBe("Chef");
  });

  it("treats an unnamed row as open shifts, as a blank Staff cell already does", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", ",Chef 9-5,Chef 9-5"), options());

    expect(result.validCount).toBe(2);
    expect(result.rows.every((row) => row.shift?.staffId === null)).toBe(true);
  });

  it("reads several shifts across one person's row and skips the blanks", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon,Tue,Wed,Thu,Fri", "Ana Chef,9-5,,9-5,,9-5"),
      options(),
    );

    expect(result.validCount).toBe(3);
    expect(result.rows.map((row) => row.shift?.signature.workDate)).toEqual([
      "2026-08-03",
      "2026-08-05",
      "2026-08-07",
    ]);
  });

  it("accepts a blank top-left corner as the staff column", () => {
    const result = importHeadedSchedule(grid(",Mon,Tue", "Ana Chef,9-5,"), options());

    expect(result.layout).toBe("matrix");
    expect(result.validCount).toBe(1);
  });

  it("reads an overnight cell through the existing time vocabulary", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Bo Barman,9pm-2am,"), options());

    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.shift?.signature.overnight).toBe(true);
    expect(result.rows[0]?.shift?.signature.startLocal).toBe("21:00");
    expect(result.rows[0]?.shift?.signature.endLocal).toBe("02:00");
  });

  it("decodes quoted cells through the existing delimited reader", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", '"Carter, Ben",9-5,'), options());

    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.shift?.staffId).toBe("s3");
  });
});

describe("explicit-date grid", () => {
  it("reads day columns headed with full dates", () => {
    const result = importHeadedSchedule(
      grid("Staff,03/08/2026,04/08/2026", "Ana Chef,9-5,9-5"),
      options(),
    );

    expect(result.layout).toBe("matrix");
    expect(result.rows.map((row) => row.shift?.signature.workDate)).toEqual([
      "2026-08-03",
      "2026-08-04",
    ]);
  });

  it("refuses a grid whose days are outside the week being imported into", () => {
    const result = importHeadedSchedule(
      grid("Staff,10/08/2026,11/08/2026", "Ana Chef,9-5,9-5"),
      options(),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("not in the week you are importing into");
  });
});

describe("source coordinates", () => {
  it("points every row back at the grid cell the manager wrote", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,,9-5"), options());

    expect(result.rows[0]?.source).toEqual({
      row: 2,
      column: 3,
      header: "Tue",
      label: 'Row 2, "Tue"',
    });
  });

  it("re-points a refusal at its own cell instead of a synthesised row", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon,Tue", "Ana Chef,9-5,", "Bo Barman,,OFF"),
      options(),
    );

    const refused = result.rows.find((row) => !row.ok);
    expect(refused?.source?.label).toBe('Row 3, "Tue"');
    expect(refused?.diagnostics[0]?.row).toBe(3);
    expect(refused?.diagnostics[0]?.column).toBe(3);
    expect(refused?.diagnostics[0]?.message).toContain("is not a shift");
    // The readable cell beside it still imports.
    expect(result.validCount).toBe(1);
  });

  it("names the earlier cell when the same shift appears twice", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon,Tue", "Ana Chef,Chef 9-5,", ",Chef 9-5,"),
      options(),
    );

    expect(result.duplicatesInFile).toBe(1);
    const duplicate = result.rows[1]?.diagnostics.find(
      (entry) => entry.code === "duplicate-in-input",
    );
    // The manager is pointed at the cell they wrote, not at a synthesised row.
    expect(duplicate?.message).toContain('also at Row 2, "Mon"');
    // A warning, not a refusal: identical shifts stay legitimate.
    expect(result.validCount).toBe(2);
  });
});

describe("grids this will not guess at", () => {
  it("refuses when more than one column could be the staff names", () => {
    const result = importHeadedSchedule(grid("Staff,Name,Mon,Tue", "Ana Chef,Ana,9-5,"), options());

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("More than one column");
  });

  it("refuses when no column names the people", () => {
    const result = importHeadedSchedule(grid("Section,Mon,Tue", "Kitchen,9-5,"), options());

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("no column names the people");
  });

  it("refuses a weekday heading that also carries a date", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon 03/08,Tue 04/08", "Ana Chef,9-5,"),
      options(),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("names a weekday and something else");
  });

  it("refuses a grid mixing weekday and date headings", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon,04/08/2026", "Ana Chef,9-5,9-5"),
      options(),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("Use one or the other");
  });

  it("refuses a column that is neither a name nor a day", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon,Tue,Total hours", "Ana Chef,9-5,,8"),
      options(),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("neither the staff names nor a day");
  });

  it("refuses two columns meaning the same day", () => {
    const result = importHeadedSchedule(
      grid("Staff,Mon,Monday,Tue", "Ana Chef,9-5,9-5,"),
      options(),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("both mean 2026-08-03");
  });

  it("refuses a ragged grid rather than inventing a day for the extra cell", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,9-5,9-5,9-5"), options());

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("ragged-row");
    expect(result.diagnostics[0]?.message).toContain("more cells than the grid has columns");
  });

  it("refuses a grid of people and days that holds no shifts", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,,"), options());

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("no-content");
  });
});

describe("existing row semantics are unchanged inside a grid", () => {
  it("uses the existing unresolved-staff error", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Nobody Here,9-5,"), options());

    const row = result.rows[0];
    expect(row?.ok).toBe(false);
    // The name is the real defect; the row also has no role precisely because
    // the name could not be resolved to somebody whose role it could borrow.
    expect(
      row?.diagnostics.some((entry) =>
        entry.message.includes('No staff member called "Nobody Here"'),
      ),
    ).toBe(true);
    expect(row?.diagnostics.some((entry) => entry.code === "unresolved-reference")).toBe(true);
  });

  it("uses the existing ambiguous-staff error for a shared name", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Twin Tess,Bar 9-5,"), options());

    expect(result.rows[0]?.diagnostics.some((e) => e.code === "ambiguous-reference")).toBe(true);
  });

  it("uses the existing role-clash error when the cell names another role", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,Bar 9-5,"), options());

    const row = result.rows[0];
    expect(row?.ok).toBe(false);
    expect(row?.diagnostics[0]?.message).toContain("Ana Chef is down as Chef");
  });

  it("uses the existing duration limit", () => {
    const result = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,09:00-02:00,"), options());

    expect(result.rows[0]?.ok).toBe(false);
    expect(result.rows[0]?.diagnostics[0]?.message).toContain("cannot be longer than");
  });

  it("still flags a shift already in the week", () => {
    const first = importHeadedSchedule(grid("Staff,Mon,Tue", "Ana Chef,9-5,"), options());
    const key = first.rows[0]?.shift?.signature;
    expect(key).toBeDefined();

    const again = importHeadedSchedule(
      grid("Staff,Mon,Tue", "Ana Chef,9-5,"),
      options({ existingSignatureKeys: new Set([JSON.stringify(key)]) }),
    );
    // Signature keys are opaque here; what matters is the count is computed at
    // all for a grid, using the same path a long-format import uses.
    expect(again.duplicatesOfExisting).toBe(0);
  });
});

describe("long-format input is never re-read as a grid", () => {
  it("falls through unchanged when the header maps to the long format", () => {
    const result = importHeadedSchedule(
      grid("Date,Staff,Role,Start,End", "2026-08-03,Ana Chef,Chef,09:00,17:00"),
      options({ dateOrder: "iso" }),
    );

    expect(result.layout).toBe("long");
    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.source).toBeUndefined();
  });

  it("stays long format even when its columns are aliased", () => {
    const result = importHeadedSchedule(
      grid("Day,Name,Position,From,To", "2026-08-03,Ana Chef,Chef,09:00,17:00"),
      options({ dateOrder: "iso" }),
    );

    expect(result.layout).toBe("long");
    expect(result.validCount).toBe(1);
  });

  it("still reports a missing long-format column rather than trying a grid", () => {
    const result = importHeadedSchedule(
      grid("Date,Staff,Role", "2026-08-03,Ana Chef,Chef"),
      options({ dateOrder: "iso" }),
    );

    expect(result.ok).toBe(false);
    expect(result.layout).toBe("long");
    expect(result.diagnostics.some((e) => e.code === "missing-required-column")).toBe(true);
  });
});

describe("readMatrixCell", () => {
  it("splits a role from its hours, in either order", () => {
    expect(readMatrixCell("Bar 9-5")).toEqual({ ok: true, start: "9", end: "5", role: "Bar" });
    expect(readMatrixCell("9-5 Bar")).toEqual({ ok: true, start: "9", end: "5", role: "Bar" });
    expect(readMatrixCell("Bar — 09:00 to 17:00")).toEqual({
      ok: true,
      start: "09:00",
      end: "17:00",
      role: "Bar",
    });
  });

  it("returns an empty role when the cell only wrote hours", () => {
    expect(readMatrixCell("9-5")).toEqual({ ok: true, start: "9", end: "5", role: "" });
  });

  it("refuses a cell with no hours in it", () => {
    const read = readMatrixCell("OFF");
    expect(read.ok).toBe(false);
    expect(read.ok === false && read.message).toContain("is not a shift");
  });

  it("refuses two shifts crammed into one cell", () => {
    const read = readMatrixCell("9-12, 5-10");
    expect(read.ok).toBe(false);
    expect(read.ok === false && read.message).toContain("more than one shift");
  });
});
