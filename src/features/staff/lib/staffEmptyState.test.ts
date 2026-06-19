import { describe, expect, it } from "vitest";
import { resolveStaffEmptyState } from "./staffEmptyState";
import type { StaffEmptyStateInput } from "./staffEmptyState";

function input(overrides: Partial<StaffEmptyStateInput> = {}): StaffEmptyStateInput {
  return {
    totalRows: 0,
    filteredRows: 0,
    query: "",
    deptFilter: "All",
    statusFilter: "All",
    attentionFilter: "all",
    ...overrides,
  };
}

describe("resolveStaffEmptyState", () => {
  it("returns null when rows are present", () => {
    expect(resolveStaffEmptyState(input({ totalRows: 3, filteredRows: 3 }))).toBeNull();
  });

  it("shows the first-staff CTA for a genuinely empty roster with no filters", () => {
    expect(resolveStaffEmptyState(input())).toBe("first-staff");
  });

  it("shows the filter-empty message when a search hides everyone", () => {
    expect(resolveStaffEmptyState(input({ totalRows: 5, filteredRows: 0, query: "zzz" }))).toBe(
      "filtered",
    );
  });

  it("shows the filter-empty message when a department filter hides everyone", () => {
    expect(
      resolveStaffEmptyState(input({ totalRows: 5, filteredRows: 0, deptFilter: "Kitchen" })),
    ).toBe("filtered");
  });

  it("treats an empty roster with an active filter as filtered, not first-staff", () => {
    expect(
      resolveStaffEmptyState(input({ totalRows: 0, filteredRows: 0, statusFilter: "Active" })),
    ).toBe("filtered");
  });

  it("treats an active attention filter as filtered", () => {
    expect(
      resolveStaffEmptyState(
        input({ totalRows: 4, filteredRows: 0, attentionFilter: "missing-documents" }),
      ),
    ).toBe("filtered");
  });
});
