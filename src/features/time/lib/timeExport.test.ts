import { describe, expect, it } from "vitest";
import { approvedRowsForExport, canExportApprovedHours } from "./timeExport";
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
