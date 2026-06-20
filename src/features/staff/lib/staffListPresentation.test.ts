import { describe, expect, it } from "vitest";
import { STAFF_STATUS_FILTERS, buildStaffStats, filterStaffRows } from "./staffListPresentation";
import type { StaffRow } from "../types";

function row(overrides: Partial<StaffRow> = {}): StaffRow {
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
    ...overrides,
  };
}

describe("buildStaffStats", () => {
  it("derives total, active, inactive, and left counts from the roster", () => {
    const stats = buildStaffStats([
      row(),
      row({ id: "staff-2", status: "Active" }),
      row({ id: "staff-3", status: "Inactive" }),
      row({ id: "staff-4", status: "Left" }),
    ]);

    expect(stats.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: "Total staff", value: "4" },
      { label: "Active", value: "2" },
      { label: "Inactive", value: "1" },
      { label: "Left", value: "1" },
    ]);
  });

  it("returns honest zero counts for an empty roster", () => {
    expect(buildStaffStats([]).map((stat) => stat.value)).toEqual(["0", "0", "0", "0"]);
  });
});

describe("staff status filters", () => {
  const rows = [
    row({ id: "active", status: "Active" }),
    row({ id: "inactive", status: "Inactive" }),
    row({ id: "left", status: "Left" }),
  ];

  it("exposes only statuses supported by live staff data", () => {
    expect(STAFF_STATUS_FILTERS).toEqual(["All", "Active", "Inactive", "Left"]);
  });

  it.each(["Active", "Inactive", "Left"] as const)("filters the roster to %s staff", (status) => {
    expect(
      filterStaffRows(rows, {
        query: "",
        department: "All",
        status,
      }).map((staff) => staff.id),
    ).toEqual([status.toLowerCase()]);
  });

  it("keeps all statuses when the filter is All", () => {
    expect(
      filterStaffRows(rows, {
        query: "",
        department: "All",
        status: "All",
      }),
    ).toHaveLength(3);
  });
});
