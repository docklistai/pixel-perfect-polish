import { describe, expect, it } from "vitest";
import { importHeadedSchedule, type HeadedImportOptions } from "./headedScheduleImport";
import { emptyAvailabilityFacts } from "@/features/rota/lib/scheduling/eligibility";

/**
 * Recorded absence, as a manager meets it while reviewing a paste.
 *
 * The product decision these tests hold in place:
 *
 *   approved leave -> the row is BLOCKED, listed with its reason, and produces
 *                     no operation. Decided absence.
 *   pending  leave -> the row is WARNED and still imported. An undecided
 *                     request is not a decision the import should make.
 *
 * Both are read through `dateAvailabilityExclusion`, the same authority Build
 * the Week asks, so the preview and the apply boundary cannot come to disagree
 * about who is free.
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
const LOC = "loc-1";
const DEPT = "dept-kitchen";

/** Approved leave for Ana on Wednesday; pending leave for Pat on the same day. */
function availability(
  overrides: {
    approved?: [string, string[]][];
    pending?: [string, string[]][];
  } = {},
) {
  const facts = emptyAvailabilityFacts();
  for (const [staffId, dates] of overrides.approved ?? [["s1", ["2026-08-05"]]]) {
    facts.approvedLeaveDatesByStaff.set(staffId, new Set(dates));
  }
  for (const [staffId, dates] of overrides.pending ?? [["s2", ["2026-08-05"]]]) {
    facts.pendingLeaveDatesByStaff.set(staffId, new Set(dates));
  }
  return facts;
}

function options(overrides: Partial<HeadedImportOptions> = {}): HeadedImportOptions {
  return {
    dateOrder: "iso",
    weekIsoDates: WEEK,
    locationId: LOC,
    staff: [
      { id: "s1", name: "Ana Chef", active: true },
      { id: "s2", name: "Pat Chef", active: true },
      { id: "s3", name: "Fran Chef", active: true },
    ],
    departments: [{ id: DEPT, name: "Kitchen", active: true }],
    defaultDepartmentId: DEPT,
    availability: availability(),
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
) => [date, staff, role, start, end, "Kitchen", "30"].join(",");

const paste = (...rows: string[]) => [HEADER, ...rows].join("\n");

describe("approved leave blocks an imported row", () => {
  it("refuses the row and names the person and the reason", () => {
    const result = importHeadedSchedule(paste(row("2026-08-05", "Ana Chef")), options());

    expect(result.validCount).toBe(0);
    expect(result.errorCount).toBe(1);
    const [blocked] = result.rows;
    expect(blocked?.ok).toBe(false);
    expect(blocked?.diagnostics.map((entry) => entry.message).join(" ")).toContain(
      "Ana Chef is on approved leave",
    );
    expect(blocked?.diagnostics.some((entry) => entry.severity === "error")).toBe(true);
  });

  it("still lists the row rather than dropping it", () => {
    const result = importHeadedSchedule(paste(row("2026-08-05", "Ana Chef")), options());
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.row).toBe(1);
  });

  it("produces no operation for it", () => {
    const result = importHeadedSchedule(paste(row("2026-08-05", "Ana Chef")), options());
    // One valid row is one operation; a blocked row generates none.
    expect(result.operationCount).toBe(0);
    expect(result.ok).toBe(false);
  });

  it("leaves the rest of the paste importable — the existing mixed-row contract", () => {
    const result = importHeadedSchedule(
      paste(
        row("2026-08-05", "Ana Chef"),
        row("2026-08-05", "Fran Chef"),
        row("2026-08-06", "Fran Chef"),
      ),
      options(),
    );

    expect(result.ok).toBe(true);
    expect(result.validCount).toBe(2);
    expect(result.errorCount).toBe(1);
    expect(result.operationCount).toBe(2);
    expect(result.rows.map((entry) => entry.ok)).toEqual([false, true, true]);
  });

  it("does not let a blocked row claim a duplicate against the rows that survive", () => {
    // Ana's blocked row and Fran's importable row are the same shift but for the
    // person. A blocked row is never written, so it must not register as the
    // first sighting of anything.
    const result = importHeadedSchedule(
      paste(row("2026-08-05", "Ana Chef"), row("2026-08-05", "Fran Chef")),
      options(),
    );
    expect(result.duplicatesInFile).toBe(0);
    expect(result.rows[1]?.diagnostics).toHaveLength(0);
  });

  it("does not touch an open row, which belongs to nobody", () => {
    const result = importHeadedSchedule(paste(row("2026-08-05", "")), options());
    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.shift?.staffId).toBeNull();
  });

  it("leaves a row alone when the leave falls on another day", () => {
    const result = importHeadedSchedule(paste(row("2026-08-04", "Ana Chef")), options());
    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.diagnostics).toHaveLength(0);
  });
});

describe("pending leave warns but still imports", () => {
  it("keeps the row importable and produces its operation", () => {
    const result = importHeadedSchedule(paste(row("2026-08-05", "Pat Chef")), options());

    expect(result.ok).toBe(true);
    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.operationCount).toBe(1);
    expect(result.rows[0]?.ok).toBe(true);
    expect(result.rows[0]?.shift?.staffId).toBe("s2");
  });

  it("attaches the pending-leave reason as a warning, not an error", () => {
    const result = importHeadedSchedule(paste(row("2026-08-05", "Pat Chef")), options());
    const [advisory] = result.rows[0]?.diagnostics ?? [];

    expect(advisory?.severity).toBe("warning");
    expect(advisory?.code).toBe("staff-unavailable");
    expect(advisory?.message).toContain("Pat Chef has a pending leave request");
    expect(advisory?.message).toContain("will still be imported");
  });

  it("prefers the approved reason when one person has both", () => {
    const result = importHeadedSchedule(
      paste(row("2026-08-05", "Pat Chef")),
      options({
        availability: availability({
          approved: [["s2", ["2026-08-05"]]],
          pending: [["s2", ["2026-08-05"]]],
        }),
      }),
    );
    expect(result.rows[0]?.ok).toBe(false);
    expect(result.rows[0]?.diagnostics[0]?.message).toContain("is on approved leave");
  });
});

describe("an overnight row is checked against both dates it touches", () => {
  it("blocks when approved leave falls on the day it ends", () => {
    const result = importHeadedSchedule(
      paste(row("2026-08-04", "Ana Chef", "Chef", "22:00", "02:00")),
      options({ availability: availability({ approved: [["s1", ["2026-08-05"]]] }) }),
    );

    expect(result.rows[0]?.ok).toBe(false);
    expect(result.rows[0]?.shift).toBeUndefined();
    expect(result.rows[0]?.diagnostics.map((entry) => entry.message).join(" ")).toContain(
      "is on approved leave",
    );
  });

  it("warns when pending leave falls on the day it ends", () => {
    const result = importHeadedSchedule(
      paste(row("2026-08-04", "Pat Chef", "Chef", "22:00", "02:00")),
      options({ availability: availability({ pending: [["s2", ["2026-08-05"]]] }) }),
    );

    expect(result.rows[0]?.ok).toBe(true);
    expect(result.rows[0]?.diagnostics[0]?.severity).toBe("warning");
  });

  it("leaves a same-day shift alone when only the following day is taken", () => {
    const result = importHeadedSchedule(
      paste(row("2026-08-04", "Ana Chef", "Chef", "09:00", "17:00")),
      options({ availability: availability({ approved: [["s1", ["2026-08-05"]]] }) }),
    );
    expect(result.rows[0]?.ok).toBe(true);
    expect(result.rows[0]?.diagnostics).toHaveLength(0);
  });
});

describe("without availability facts", () => {
  it("parses exactly as before — the server always supplies them", () => {
    const { availability: _omitted, ...withoutFacts } = options();
    const result = importHeadedSchedule(paste(row("2026-08-05", "Ana Chef")), withoutFacts);

    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.diagnostics).toHaveLength(0);
  });
});
