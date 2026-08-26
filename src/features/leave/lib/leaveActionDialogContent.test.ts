import { describe, expect, it } from "vitest";
import {
  approvalDialogRows,
  consumesAnnualEntitlement,
  demoManagerCreateStaffOptions,
  managerCreateDialogState,
} from "./leaveActionDialogContent";
import type { LeaveRequest } from "../types";
import type { LeaveBalance } from "./leaveBalance";

function balance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    recorded: true,
    entitlementDays: 28,
    booked: 12,
    pending: 0,
    remaining: 16,
    ...overrides,
  };
}

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
        expect.objectContaining({ label: "Cover check", value: "Open the rota to confirm cover" }),
      ]),
    );
  });

  it("reports annual leave as untracked when no balance is available", () => {
    const rows = approvalDialogRows("live", request, null);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Annual leave", value: "Not tracked yet" }),
      ]),
    );
  });

  it("shows the real balance for an annual leave request", () => {
    const rows = approvalDialogRows("live", request, balance({ pending: 3 }));

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Annual leave",
          value: "12 booked of 28 · 16 remaining",
        }),
        expect.objectContaining({ label: "Pending", value: "3 days · calendar days" }),
      ]),
    );
  });

  it("states the calendar-day unit even when nothing is pending", () => {
    const rows = approvalDialogRows("live", request, balance());
    const pending = rows.find((row) => row.label === "Pending");

    expect(pending?.value).toBe("None · calendar days");
  });

  it("surfaces a negative remaining rather than hiding an over-booked balance", () => {
    const rows = approvalDialogRows("live", request, balance({ booked: 31, remaining: -3 }));

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Annual leave",
          value: "31 booked of 28 · -3 remaining",
        }),
      ]),
    );
  });

  it("reports an unrecorded entitlement without inventing a workspace default", () => {
    const rows = approvalDialogRows(
      "live",
      request,
      balance({ recorded: false, entitlementDays: null, booked: 0, remaining: null }),
    );
    const annual = rows.find((row) => row.label === "Annual leave");

    expect(annual?.value).toBe("Entitlement not recorded");
    expect(annual?.value).not.toMatch(/\d/);
  });

  it("never claims a non-consuming leave type affects the annual balance", () => {
    for (const type of ["Sick leave", "Unpaid leave", "Personal leave", "Other"]) {
      const rows = approvalDialogRows("live", { ...request, type }, balance());
      const annual = rows.find((row) => row.label === "Annual leave");

      expect(annual?.value).toBe("Not affected by this leave type");
      expect(rows.some((row) => row.label === "Pending")).toBe(false);
    }
  });
});

describe("consumesAnnualEntitlement", () => {
  it("is true only for annual leave", () => {
    expect(consumesAnnualEntitlement({ type: "Annual leave" })).toBe(true);
    for (const type of ["Sick leave", "Unpaid leave", "Personal leave", "Other"]) {
      expect(consumesAnnualEntitlement({ type })).toBe(false);
    }
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
