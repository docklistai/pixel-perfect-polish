import { describe, expect, it } from "vitest";
import {
  COPY_ASSIGNMENT_BLOCKED_REASON,
  filterStaffByRoleEligibility,
  getAssignableStaffRows,
  getShiftCopyBlockedReason,
  isShiftCopyAssignable,
  isStaffEligibleForRole,
} from "./assignableStaff";
import type { DraftShift, StaffMember } from "../types";
import type { StaffRow } from "@/features/staff/types";

function staffRow(overrides: Partial<StaffRow> = {}): StaffRow {
  return {
    id: "staff-1",
    name: "Sam Rivers",
    n: "Sam Rivers",
    e: "sam@example.com",
    role: "Waiter",
    sub: "Front of House",
    dept: "Front of House",
    status: "Active",
    contract: "Part-time",
    hours: "24h/wk",
    avail: "—",
    availTone: "off",
    img: 1,
    employmentStatus: "active",
    ...overrides,
  };
}

describe("isStaffEligibleForRole", () => {
  const staff: StaffMember = {
    id: "staff-1",
    name: "Alex Thompson",
    role: "Supervisor",
    hrs: "40h",
    img: 1,
    tone: "info",
    eligibleRoles: ["Barista", "Bartender"],
  };

  it("returns true when target role matches primary role", () => {
    expect(isStaffEligibleForRole(staff, "Supervisor")).toBe(true);
    expect(isStaffEligibleForRole(staff, "supervisor")).toBe(true);
    expect(isStaffEligibleForRole(staff, "  SUPERVISOR  ")).toBe(true);
  });

  it("returns true when target role matches an additive secondary eligible role", () => {
    expect(isStaffEligibleForRole(staff, "Barista")).toBe(true);
    expect(isStaffEligibleForRole(staff, "barista")).toBe(true);
    expect(isStaffEligibleForRole(staff, "Bartender")).toBe(true);
  });

  it("returns false when target role is neither primary nor secondary eligible", () => {
    expect(isStaffEligibleForRole(staff, "Head Chef")).toBe(false);
    expect(isStaffEligibleForRole(staff, "Kitchen Porter")).toBe(false);
  });

  it("returns true when target role is empty, null or undefined", () => {
    expect(isStaffEligibleForRole(staff, "")).toBe(true);
    expect(isStaffEligibleForRole(staff, null)).toBe(true);
    expect(isStaffEligibleForRole(staff, undefined)).toBe(true);
  });
});

describe("filterStaffByRoleEligibility", () => {
  const staffList: StaffMember[] = [
    { id: "1", name: "Alice", role: "Chef", hrs: "40h", img: 1, tone: "info" },
    {
      id: "2",
      name: "Bob",
      role: "Waiter",
      hrs: "30h",
      img: 2,
      tone: "purple",
      eligibleRoles: ["Chef"],
    },
    { id: "3", name: "Charlie", role: "Barista", hrs: "20h", img: 3, tone: "warning" },
  ];

  it("returns all staff when target role is not specified", () => {
    expect(filterStaffByRoleEligibility(staffList, "")).toHaveLength(3);
  });

  it("returns primary role holders and secondary eligible role holders", () => {
    const chefs = filterStaffByRoleEligibility(staffList, "Chef");
    expect(chefs.map((s) => s.name)).toEqual(["Alice", "Bob"]);
  });
});

describe("getAssignableStaffRows", () => {
  it("keeps only active live staff as assignment candidates", () => {
    const rows = [
      staffRow(),
      staffRow({ id: "inactive", status: "Inactive", employmentStatus: "inactive" }),
      staffRow({ id: "left", status: "Left", employmentStatus: "left" }),
    ];

    expect(getAssignableStaffRows(rows).map((row) => row.id)).toEqual(["staff-1"]);
  });

  it("treats legacy rows labelled Active as assignable", () => {
    expect(getAssignableStaffRows([staffRow({ employmentStatus: undefined })])).toHaveLength(1);
  });

  it("filters by required role including secondary eligible roles when specified", () => {
    const rows = [
      staffRow({ id: "1", role: "Waiter" }),
      staffRow({ id: "2", role: "Barista", eligibleRoles: ["Waiter"] }),
      staffRow({ id: "3", role: "Chef" }),
    ];

    expect(getAssignableStaffRows(rows, "Waiter").map((r) => r.id)).toEqual(["1", "2"]);
    expect(getAssignableStaffRows(rows, "Chef").map((r) => r.id)).toEqual(["3"]);
  });
});

const activeStaff: StaffMember[] = [
  {
    id: "staff-1",
    name: "Sam Rivers",
    role: "Waiter",
    hrs: "24h",
    img: 1,
    tone: "info",
    eligibleRoles: ["Host"],
  },
];

function shift(
  staffId: string | null,
  role?: string,
): Pick<DraftShift, "staffId"> & { role?: string } {
  return { staffId, role };
}

describe("isShiftCopyAssignable", () => {
  it("allows an active assigned shift when role matches primary", () => {
    expect(isShiftCopyAssignable(shift("staff-1", "Waiter"), activeStaff)).toBe(true);
  });

  it("allows an active assigned shift when role matches secondary eligible role", () => {
    expect(isShiftCopyAssignable(shift("staff-1", "Host"), activeStaff)).toBe(true);
  });

  it("blocks an assigned shift when staff does not hold the required role", () => {
    expect(isShiftCopyAssignable(shift("staff-1", "Chef"), activeStaff)).toBe(false);
    expect(getShiftCopyBlockedReason(shift("staff-1", "Chef"), activeStaff)).toBe(
      COPY_ASSIGNMENT_BLOCKED_REASON,
    );
  });

  it("allows an active assigned shift when role is omitted", () => {
    expect(isShiftCopyAssignable(shift("staff-1"), activeStaff)).toBe(true);
  });

  it("allows an open shift", () => {
    expect(isShiftCopyAssignable(shift(null, "Chef"), activeStaff)).toBe(true);
  });

  it.each(["inactive", "left", "missing"])(
    "blocks a %s or otherwise non-candidate assigned shift",
    (staffId) => {
      expect(isShiftCopyAssignable(shift(staffId), activeStaff)).toBe(false);
      expect(getShiftCopyBlockedReason(shift(staffId), activeStaff)).toBe(
        COPY_ASSIGNMENT_BLOCKED_REASON,
      );
    },
  );

  it("reports a missing source separately", () => {
    expect(getShiftCopyBlockedReason(undefined, activeStaff)).toBe(
      "The source shift is no longer available.",
    );
  });
});
