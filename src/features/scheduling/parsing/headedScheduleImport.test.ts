import { describe, expect, it } from "vitest";
import { importHeadedSchedule, type HeadedImportOptions } from "./headedScheduleImport";
import { buildShiftSignature, signatureKey } from "@/features/rota/lib/scheduling/shiftSignature";

const WEEK = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];
const LOC = "loc-1";
const DEPT_KITCHEN = "dept-kitchen";
const DEPT_BAR = "dept-bar";

function options(overrides: Partial<HeadedImportOptions> = {}): HeadedImportOptions {
  return {
    dateOrder: "iso",
    weekIsoDates: WEEK,
    locationId: LOC,
    staff: [
      { id: "s1", name: "Ana Chef", active: true },
      { id: "s2", name: "Ben Carter", active: true },
      { id: "s3", name: "Ben Carter", active: true },
      { id: "s4", name: "Old Leaver", active: false },
    ],
    departments: [
      { id: DEPT_KITCHEN, name: "Kitchen", active: true },
      { id: DEPT_BAR, name: "Bar", active: true },
    ],
    defaultDepartmentId: DEPT_KITCHEN,
    ...overrides,
  };
}

const HEADER = "Date,Staff,Role,Start,End,Department,Break";
const row = (
  date = "2026-08-03",
  staff = "Ana Chef",
  role = "Chef",
  start = "09:00",
  end = "17:00",
  dept = "Kitchen",
  brk = "30",
) => [date, staff, role, start, end, dept, brk].join(",");

describe("column mapping", () => {
  it("maps aliased headers", () => {
    const result = importHeadedSchedule(
      ["Day,Name,Position,From,To", "2026-08-03,Ana Chef,Chef,09:00,17:00"].join("\n"),
      options(),
    );
    expect(result.validCount).toBe(1);
  });

  it("refuses a file missing a required column", () => {
    const result = importHeadedSchedule(
      ["Date,Staff,Role", "2026-08-03,Ana Chef,Chef"].join("\n"),
      options(),
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === "missing-required-column")).toBe(true);
    // The mapping survives the failure so the preview can show what was understood.
    expect(result.columns.map((c) => c.mappedTo)).toEqual(["date", "staff", "role"]);
  });

  it("names ignored columns rather than dropping them silently", () => {
    const result = importHeadedSchedule(
      [`${HEADER},Notes`, `${row()},some note`].join("\n"),
      options(),
    );
    expect(result.diagnostics.some((d) => d.code === "unknown-column")).toBe(true);
    expect(result.validCount).toBe(1);
  });
});

describe("dates are explicit, never guessed", () => {
  it("accepts ISO under any declared order", () => {
    expect(importHeadedSchedule([HEADER, row()].join("\n"), options()).validCount).toBe(1);
  });

  it("refuses an ambiguous numeric date when the order was declared ISO", () => {
    const result = importHeadedSchedule([HEADER, row("03/08/2026")].join("\n"), options());
    expect(result.validCount).toBe(0);
    expect(result.rows[0]!.diagnostics[0]!.code).toBe("ambiguous-date");
  });

  it("reads a numeric date once an order is declared", () => {
    const result = importHeadedSchedule(
      [HEADER, row("03/08/2026")].join("\n"),
      options({ dateOrder: "day-first" }),
    );
    expect(result.validCount).toBe(1);
    expect(result.rows[0]!.shift!.signature.workDate).toBe("2026-08-03");
  });

  it("rejects a date outside the target week", () => {
    const result = importHeadedSchedule([HEADER, row("2026-09-01")].join("\n"), options());
    expect(result.validCount).toBe(0);
    expect(result.rows[0]!.diagnostics[0]!.message).toContain("not in the week");
  });
});

describe("exact resolution", () => {
  it("resolves a unique staff name", () => {
    const result = importHeadedSchedule([HEADER, row()].join("\n"), options());
    expect(result.rows[0]!.shift!.staffId).toBe("s1");
  });

  it("refuses a duplicated staff name instead of picking one", () => {
    const result = importHeadedSchedule(
      [HEADER, row("2026-08-03", "Ben Carter")].join("\n"),
      options(),
    );
    expect(result.validCount).toBe(0);
    expect(result.rows[0]!.diagnostics[0]!.code).toBe("ambiguous-reference");
  });

  it("refuses an inactive staff member", () => {
    const result = importHeadedSchedule(
      [HEADER, row("2026-08-03", "Old Leaver")].join("\n"),
      options(),
    );
    expect(result.rows[0]!.diagnostics[0]!.code).toBe("unresolved-reference");
  });

  it("treats a blank staff cell as a deliberate open shift", () => {
    const result = importHeadedSchedule([HEADER, row("2026-08-03", "")].join("\n"), options());
    expect(result.validCount).toBe(1);
    expect(result.rows[0]!.shift!.staffId).toBeNull();
  });

  it("refuses an unknown department rather than defaulting silently", () => {
    const result = importHeadedSchedule(
      [HEADER, row("2026-08-03", "Ana Chef", "Chef", "09:00", "17:00", "Spa")].join("\n"),
      options(),
    );
    expect(result.validCount).toBe(0);
    expect(result.rows[0]!.diagnostics[0]!.code).toBe("unresolved-reference");
  });
});

describe("overnight state is explicit", () => {
  it("derives overnight from the times", () => {
    const result = importHeadedSchedule(
      [HEADER, row("2026-08-03", "Ana Chef", "Chef", "22:00", "02:00")].join("\n"),
      options(),
    );
    expect(result.rows[0]!.shift!.signature.overnight).toBe(true);
  });

  it("refuses a stated overnight flag that disagrees with the times", () => {
    const result = importHeadedSchedule(
      [
        `${HEADER},Overnight`,
        `${row("2026-08-03", "Ana Chef", "Chef", "09:00", "17:00")},yes`,
      ].join("\n"),
      options(),
    );
    expect(result.validCount).toBe(0);
    expect(result.rows[0]!.diagnostics[0]!.message).toContain("does not cross midnight");
  });

  it("accepts a stated overnight flag that agrees", () => {
    const result = importHeadedSchedule(
      [
        `${HEADER},Overnight`,
        `${row("2026-08-03", "Ana Chef", "Chef", "22:00", "02:00")},yes`,
      ].join("\n"),
      options(),
    );
    expect(result.validCount).toBe(1);
  });
});

describe("quoting and no silent loss", () => {
  it("keeps a comma inside a quoted role", () => {
    const result = importHeadedSchedule(
      [HEADER, `2026-08-03,Ana Chef,"Chef, Senior",09:00,17:00,Kitchen,30`].join("\n"),
      options(),
    );
    expect(result.rows[0]!.shift!.roleName).toBe("Chef, Senior");
  });

  it("returns every non-blank source row, valid or not", () => {
    const result = importHeadedSchedule(
      [HEADER, row(), row("2026-09-01"), row("2026-08-04", "Nobody")].join("\n"),
      options(),
    );
    expect(result.rows).toHaveLength(3);
    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(2);
    for (const bad of result.rows.filter((entry) => !entry.ok)) {
      expect(bad.diagnostics.length).toBeGreaterThan(0);
    }
  });

  it("refuses malformed quoting for the whole file", () => {
    const result = importHeadedSchedule(
      [HEADER, `2026-08-03,"Ana,Chef,09:00`].join("\n"),
      options(),
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]!.code).toBe("malformed-quote");
  });
});

describe("duplicate analysis", () => {
  it("reports a duplicate within the file but still imports both", () => {
    const result = importHeadedSchedule([HEADER, row(), row()].join("\n"), options());
    expect(result.validCount).toBe(2);
    expect(result.duplicatesInFile).toBe(1);
    expect(result.rows[1]!.diagnostics[0]!.code).toBe("duplicate-in-input");
  });

  it("reports a shift that already exists in the week", () => {
    const existing = signatureKey(
      buildShiftSignature({
        workDate: "2026-08-03",
        start: "09:00",
        end: "17:00",
        role: "Chef",
        departmentId: DEPT_KITCHEN,
        locationId: LOC,
        breakMinutes: 30,
      }),
    );
    const result = importHeadedSchedule(
      [HEADER, row()].join("\n"),
      options({ existingSignatureKeys: new Set([existing]) }),
    );
    expect(result.duplicatesOfExisting).toBe(1);
    expect(result.rows[0]!.ok).toBe(true);
    expect(result.rows[0]!.diagnostics[0]!.code).toBe("duplicate-of-existing");
  });
});
