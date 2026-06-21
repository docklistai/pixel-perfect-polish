import { describe, expect, it } from "vitest";
import {
  COPY_ASSIGNMENT_BLOCKED_REASON,
  getAssignableStaffRows,
  getShiftCopyBlockedReason,
  isShiftCopyAssignable,
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
});

const activeStaff: StaffMember[] = [
  {
    id: "staff-1",
    name: "Sam Rivers",
    role: "Waiter",
    hrs: "24h",
    img: 1,
    tone: "info",
  },
];

function shift(staffId: string | null): Pick<DraftShift, "staffId"> {
  return { staffId };
}

describe("isShiftCopyAssignable", () => {
  it("allows an active assigned shift", () => {
    expect(isShiftCopyAssignable(shift("staff-1"), activeStaff)).toBe(true);
  });

  it("allows an open shift", () => {
    expect(isShiftCopyAssignable(shift(null), activeStaff)).toBe(true);
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
