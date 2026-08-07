import { describe, expect, it } from "vitest";
import { importHeadedSchedule, type HeadedImportOptions } from "./headedScheduleImport";
import { parseInlineCellInput } from "@/features/rota/components/grid/inlineCellParsing";
import { MAX_PROPOSAL_OPERATIONS } from "@/features/rota/lib/scheduling/buildWeekProposal";

/**
 * Phase 51: the import and the rota cell read a written time the same way, a
 * paste is honest about how much of it can be applied, and leftover time text is
 * refused rather than filed as a role.
 *
 * The parity tests here are deliberately written as *comparisons* between the
 * two surfaces rather than as two independent expectations. Two passing suites
 * that each assert their own answer is exactly how the two parsers drifted apart
 * in the first place.
 */

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
      { id: "s2", name: "Bea Bar", active: true, roleName: "Bar" },
    ],
    departments: [{ id: "dept-kitchen", name: "Kitchen", active: true }],
    defaultDepartmentId: "dept-kitchen",
    ...overrides,
  };
}

const HEADER = "Date,Staff,Role,Start,End";

/** One imported row, as start/end text. Staff is left blank: an open shift. */
function importedTimes(start: string, end: string) {
  const result = importHeadedSchedule(
    [HEADER, `2026-08-03,,Chef,${start},${end}`].join("\n"),
    options(),
  );
  return result.rows[0]!;
}

/** The same start/end typed into a rota cell. */
function inlineTimes(start: string, end: string) {
  const result = parseInlineCellInput(`${start}-${end} Chef`, { roleOptions: ["Chef"] });
  if (result.kind !== "shifts") throw new Error(`inline editor refused "${start}-${end}"`);
  return result.shifts[0]!;
}

describe("one time vocabulary across both surfaces", () => {
  it.each([
    ["09:00", "17:00"],
    ["9:00", "17:00"],
    ["9am", "5pm"],
    ["9 am", "5 pm"],
    ["9:30pm", "11:30pm"],
    ["1530", "2300"],
    ["9pm", "2am"],
  ])('reads "%s" to "%s" identically in the import and the rota cell', (start, end) => {
    const imported = importedTimes(start, end);
    const inline = inlineTimes(start, end);

    expect(imported.ok).toBe(true);
    expect(imported.shift!.signature.startLocal).toBe(inline.start);
    expect(imported.shift!.signature.endLocal).toBe(inline.end);
  });

  it("carries overnight across midnight for an am/pm pair", () => {
    const imported = importedTimes("9pm", "2am");
    expect(imported.shift!.signature.startLocal).toBe("21:00");
    expect(imported.shift!.signature.endLocal).toBe("02:00");
    expect(imported.shift!.signature.overnight).toBe(true);
    expect(inlineTimes("9pm", "2am")).toMatchObject({ start: "21:00", end: "02:00" });
  });

  it("agrees that an explicit overnight column matching am/pm times is fine", () => {
    const result = importHeadedSchedule(
      ["Date,Role,Start,End,Overnight", "2026-08-03,Chef,9pm,2am,yes"].join("\n"),
      options(),
    );
    expect(result.validCount).toBe(1);
  });
});

describe("ambiguous bare-hour ranges", () => {
  it.each(["5-10", "3-11", "6-11"])('reads "%s" as morning and says so', (range) => {
    const [start, end] = range.split("-") as [string, string];

    const imported = importedTimes(start, end);
    expect(imported.ok).toBe(true);
    const warning = imported.diagnostics.find((entry) => entry.code === "ambiguous-time");
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain(
      `Interpreted as ${imported.shift!.signature.startLocal}–${imported.shift!.signature.endLocal}`,
    );

    // The inline editor keeps the same reading and the same read-back, and the
    // cell still saves — the warning is presentation, never a block.
    const inline = inlineTimes(start, end);
    expect(inline.start).toBe(imported.shift!.signature.startLocal);
    expect(inline.timeWarning).toBe(warning!.message);
  });

  it("states the resolved times exactly", () => {
    expect(inlineTimes("5", "10").timeWarning).toBe(
      "Interpreted as 05:00–10:00. Write am or pm to change it.",
    );
  });

  it.each([
    ["9am", "5pm"],
    ["09:00", "17:00"],
    ["9:00", "17:00"],
    ["0900", "1700"],
    ["9pm", "2am"],
    ["5am", "10am"],
  ])('says nothing about explicit "%s"–"%s"', (start, end) => {
    expect(importedTimes(start, end).diagnostics).toEqual([]);
    expect(inlineTimes(start, end).timeWarning).toBeNull();
  });

  it("says nothing about a bare range that already runs into the afternoon", () => {
    expect(importedTimes("9", "5").diagnostics).toEqual([]);
    expect(inlineTimes("9", "5").timeWarning).toBeNull();
    // A day shift reaching midday is a morning on any reading.
    expect(inlineTimes("9", "12").timeWarning).toBeNull();
  });

  it("does not warn about the second half of a split cell it already resolved", () => {
    const result = parseInlineCellInput("9-12, 5-10 Bar", { roleOptions: ["Bar"] });
    if (result.kind !== "shifts") throw new Error("expected shifts");
    expect(result.shifts.map((shift) => shift.timeWarning)).toEqual([null, null]);
  });
});

describe("a zero-length range is not a shift on either surface", () => {
  it.each([
    ["9", "9"],
    ["09:00", "09:00"],
    ["9am", "9am"],
  ])('refuses "%s"–"%s" rather than making it 24 hours long', (start, end) => {
    const imported = importedTimes(start, end);
    expect(imported.ok).toBe(false);
    expect(imported.diagnostics[0]!.message).toMatch(/starts and ends at .* so it has no length/);

    // The inline editor has always refused this, via its shift-duration rule.
    expect(parseInlineCellInput(`${start}-${end} Chef`, { roleOptions: ["Chef"] }).kind).toBe(
      "error",
    );
  });
});

describe("leftover time text is never a role", () => {
  it.each(["9-5 9-5", "9-5 17", "9-5 5pm", "9-5 9-"])('refuses "%s"', (input) => {
    const result = parseInlineCellInput(input, { roleOptions: ["Bar"] });
    expect(result.kind).toBe("error");
  });

  it("still accepts a genuine free-text role beside a range", () => {
    const result = parseInlineCellInput("9-5 Sommelier", { roleOptions: ["Bar"] });
    expect(result.kind).toBe("shifts");
  });
});

describe("dates", () => {
  it("reads a numeric date day first by default, as a UK rota does", () => {
    const result = importHeadedSchedule(
      [HEADER, "03/08/2026,,Chef,09:00,17:00"].join("\n"),
      options(),
    );
    expect(result.rows[0]!.shift!.signature.workDate).toBe("2026-08-03");
  });

  it("keeps an explicit ISO date whatever order is declared", () => {
    for (const dateOrder of ["day-first", "month-first", "iso"] as const) {
      const result = importHeadedSchedule(
        [HEADER, "2026-08-05,,Chef,09:00,17:00"].join("\n"),
        options({ dateOrder }),
      );
      expect(result.rows[0]!.shift!.signature.workDate).toBe("2026-08-05");
    }
  });
});

describe("one spelling per role", () => {
  it("collapses mixed case in a paste to the first spelling seen", () => {
    const result = importHeadedSchedule(
      [
        HEADER,
        "2026-08-03,,Chef,09:00,17:00",
        "2026-08-04,,CHEF,09:00,17:00",
        "2026-08-05,,chef,09:00,17:00",
      ].join("\n"),
      options(),
    );
    expect(result.rows.map((row) => row.shift!.roleName)).toEqual(["Chef", "Chef", "Chef"]);
  });

  it("prefers the spelling the workspace already uses", () => {
    const result = importHeadedSchedule(
      [HEADER, "2026-08-03,,chef,09:00,17:00"].join("\n"),
      options({ knownRoleNames: ["Head Chef", "Chef"] }),
    );
    expect(result.rows[0]!.shift!.roleName).toBe("Chef");
  });

  it("leaves genuinely different roles alone", () => {
    const result = importHeadedSchedule(
      [HEADER, "2026-08-03,,Chef,09:00,17:00", "2026-08-04,,Bar,09:00,17:00"].join("\n"),
      options(),
    );
    expect(result.rows.map((row) => row.shift!.roleName)).toEqual(["Chef", "Bar"]);
  });
});

describe("a named person must hold the role", () => {
  it("refuses the row rather than letting the whole import fail at apply time", () => {
    const result = importHeadedSchedule(
      [HEADER, "2026-08-03,Bea Bar,Chef,09:00,17:00"].join("\n"),
      options(),
    );
    expect(result.rows[0]!.ok).toBe(false);
    expect(result.rows[0]!.diagnostics[0]!.message).toContain("Bea Bar is down as Bar");
  });

  it("accepts the same shift as an open one", () => {
    const result = importHeadedSchedule(
      [HEADER, "2026-08-03,,Chef,09:00,17:00"].join("\n"),
      options(),
    );
    expect(result.rows[0]!.ok).toBe(true);
  });
});

describe("how much one import may write", () => {
  // Eight hours apiece, so every row is a shift the rota would accept and the
  // only thing under test is how many of them there are.
  const rows = (count: number) =>
    [
      HEADER,
      ...Array.from({ length: count }, (_, index) => {
        const start = String(index % 24).padStart(2, "0");
        const end = String((index + 8) % 24).padStart(2, "0");
        return `2026-08-03,,Chef,${start}:00,${end}:00`;
      }),
    ].join("\n");

  it(`is ready at exactly ${MAX_PROPOSAL_OPERATIONS} operations`, () => {
    const result = importHeadedSchedule(rows(MAX_PROPOSAL_OPERATIONS), options());
    expect(result.operationCount).toBe(MAX_PROPOSAL_OPERATIONS);
    expect(result.operationLimit).toBe(MAX_PROPOSAL_OPERATIONS);
    expect(result.ok).toBe(true);
  });

  it(`refuses at ${MAX_PROPOSAL_OPERATIONS + 1}, before anything is marked ready`, () => {
    const result = importHeadedSchedule(rows(MAX_PROPOSAL_OPERATIONS + 1), options());
    expect(result.operationCount).toBe(MAX_PROPOSAL_OPERATIONS + 1);
    expect(result.ok).toBe(false);

    const refusal = result.diagnostics.find((entry) => entry.code === "too-many-operations");
    expect(refusal?.severity).toBe("error");
    // The manager is told both numbers, not just that it was "too big".
    expect(refusal!.message).toContain(String(MAX_PROPOSAL_OPERATIONS + 1));
    expect(refusal!.message).toContain(String(MAX_PROPOSAL_OPERATIONS));
  });

  it("counts generated operations, not pasted rows", () => {
    // One unreadable row generates no operation, so a paste one row over the
    // ceiling whose extra row is invalid is still applicable.
    const overByOneInvalidRow = [
      rows(MAX_PROPOSAL_OPERATIONS),
      "2026-08-03,,Chef,not-a-time,17:00",
    ].join("\n");
    const result = importHeadedSchedule(overByOneInvalidRow, options());
    expect(result.rows).toHaveLength(MAX_PROPOSAL_OPERATIONS + 1);
    expect(result.operationCount).toBe(MAX_PROPOSAL_OPERATIONS);
    expect(result.ok).toBe(true);
  });
});
