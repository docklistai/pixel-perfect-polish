import { describe, expect, it } from "vitest";
import {
  approvalDialogRows,
  demoManagerCreateStaffOptions,
  managerCreateDialogState,
} from "./leaveActionDialogContent";
import type { LeaveRequest } from "../types";

const request = {
  id: "leave-1",
  staffId: "staff-1",
  n: "Sam Doe",
  role: "Chef",
  dept: "Kitchen",
  date: "8 Jun - 9 Jun",
  startIso: "2026-06-08",
  endIso: "2026-06-09",
  days: 2,
  type: "Annual leave",
  impact: "High",
  tone: "danger",
  state: "pending",
  notice: 10,
  reason: "Trip",
  img: 1,
  balance: "-",
  submitted: "1 Jun",
  coverNote: "",
} satisfies LeaveRequest;

describe("approvalDialogRows", () => {
  it("keeps sample entitlement and coverage stats in demo mode", () => {
    const rows = approvalDialogRows("demo", request);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Days remaining after", value: "11 / 28" }),
        expect.objectContaining({
          label: "Other staff off these days",
          value: "2 already approved",
        }),
      ]),
    );
  });

  it("does not show sample entitlement or coverage stats in live mode", () => {
    const rows = approvalDialogRows("live", request);
    const values = rows.map((row) => row.value);

    expect(values).not.toContain("11 / 28");
    expect(values).not.toContain("2 already approved");
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Leave balances", value: "Not tracked yet" }),
        expect.objectContaining({ label: "Cover check", value: "Open the rota to confirm cover" }),
      ]),
    );
  });
});

describe("managerCreateDialogState", () => {
  it("marks live manager-created leave as unavailable before form entry", () => {
    expect(managerCreateDialogState("live")).toMatchObject({
      canCreate: false,
      description: "Staff portal submissions only",
      unavailableTitle: "Manager-created leave is not connected yet",
    });
  });

  it("keeps the demo manager-create flow available with sample staff", () => {
    expect(managerCreateDialogState("demo")).toMatchObject({
      canCreate: true,
      description: "On behalf of a team member",
    });
    expect(demoManagerCreateStaffOptions).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "James Walker" })]),
    );
  });
});
