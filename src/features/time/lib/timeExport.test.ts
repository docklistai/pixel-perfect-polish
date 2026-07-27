import { describe, expect, it } from "vitest";
import {
  APPROVED_HOURS_CSV_HEADER,
  approvedRowsForExport,
  buildApprovedHoursCsv,
  canExportApprovedHours,
} from "./timeExport";
import type { StoredTimesheetRow } from "../types";

function row(status: StoredTimesheetRow["status"]): StoredTimesheetRow {
  return { id: status, status } as StoredTimesheetRow;
}

describe("time export helpers", () => {
  it("enables export only when approved rows exist", () => {
    expect(canExportApprovedHours([row("pending"), row("unapproved")])).toBe(false);
    expect(canExportApprovedHours([row("pending"), row("approved")])).toBe(true);
  });

  it("returns only approved rows for the CSV path", () => {
    expect(approvedRowsForExport([row("pending"), row("approved")]).map((r) => r.status)).toEqual([
      "approved",
    ]);
  });
});

describe("approved-hours CSV", () => {
  // The column holds a staff_members row id, not a payroll employee number.
  it("names the first column Staff record ID, not Employee ID", () => {
    expect(APPROVED_HOURS_CSV_HEADER[0]).toBe("Staff record ID");
    expect(APPROVED_HOURS_CSV_HEADER).not.toContain("Employee ID");
    expect(buildApprovedHoursCsv([]).split("\n")[0]).toBe(
      '"Staff record ID","Name","Approved Hours","Role","Department"',
    );
  });

  it("quotes every cell and escapes embedded quotes", () => {
    const csv = buildApprovedHoursCsv([
      {
        id: "staff-1",
        name: 'Sam "Sammy" Rivers',
        approvedHours: "12.50",
        role: "Chef, Head",
        department: "Kitchen",
      },
    ]);

    expect(csv.split("\n")[1]).toBe(
      '"staff-1","Sam ""Sammy"" Rivers","12.50","Chef, Head","Kitchen"',
    );
  });
});
