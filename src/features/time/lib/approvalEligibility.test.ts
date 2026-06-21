import { describe, it, expect } from "vitest";
import {
  approvalEligibility,
  isApprovable,
  partitionForApproval,
  excludedSummary,
  suggestedApprovals,
} from "./approvalEligibility";
import type { StoredTimesheetRow } from "../types";

function row(overrides: Partial<StoredTimesheetRow> = {}): StoredTimesheetRow {
  return {
    id: "r1",
    n: "Test Person",
    role: "Waiter",
    img: 1,
    sched: "08:00 – 16:00",
    in: "08:00",
    inN: "On time",
    out: "16:00",
    outN: "On time",
    brk: "0:30",
    paid: "7 h 30 m",
    exc: "—",
    department: "Front of House",
    status: "pending",
    flagged: false,
    auditTrail: [],
    ...overrides,
  };
}

describe("approvalEligibility", () => {
  it("approves a complete, in-period, pending row with no exception", () => {
    expect(approvalEligibility(row())).toBe("ok");
    expect(isApprovable(row())).toBe(true);
  });

  it("blocks out-of-period rows first", () => {
    expect(approvalEligibility(row(), false)).toBe("out-of-period");
  });

  it("blocks already-approved and returned (unapproved) rows", () => {
    expect(approvalEligibility(row({ status: "approved" }))).toBe("already-approved");
    expect(approvalEligibility(row({ status: "unapproved" }))).toBe("rejected");
  });

  it("blocks rows missing a clock-in, clock-out, or paid total", () => {
    expect(approvalEligibility(row({ in: "—", paid: "—" }))).toBe("incomplete");
    expect(approvalEligibility(row({ out: "—", paid: "—" }))).toBe("incomplete");
  });

  it("blocks rows with an exception or a flag", () => {
    expect(approvalEligibility(row({ exc: "Late in" }))).toBe("exception");
    expect(approvalEligibility(row({ flagged: true }))).toBe("exception");
  });
});

describe("partitionForApproval / excludedSummary", () => {
  it("separates eligible rows and reports excluded reasons", () => {
    const rows = [
      row({ id: "ok" }),
      row({ id: "approved", status: "approved" }),
      row({ id: "missing", in: "—", paid: "—" }),
      row({ id: "exc", exc: "Late in" }),
    ];
    const { eligible, excluded } = partitionForApproval(rows);
    expect(eligible.map((r) => r.id)).toEqual(["ok"]);
    expect(excluded.map((e) => e.reason).sort()).toEqual([
      "already-approved",
      "exception",
      "incomplete",
    ]);
    expect(excludedSummary(excluded)).toContain("1 incomplete");
    expect(excludedSummary([])).toBe("");
  });

  it("folds the period predicate into the partition", () => {
    const inThisWeek = row({ id: "in", workDate: "2026-06-10" });
    const lastWeek = row({ id: "out", workDate: "2026-06-03" });
    const { eligible, excluded } = partitionForApproval(
      [inThisWeek, lastWeek],
      (r) => r.workDate === "2026-06-10",
    );
    expect(eligible.map((r) => r.id)).toEqual(["in"]);
    expect(excluded[0]?.reason).toBe("out-of-period");
  });
});

describe("suggestedApprovals", () => {
  it("returns only approvable rows up to the limit", () => {
    const rows = [
      row({ id: "a" }),
      row({ id: "b", out: "—", paid: "—" }), // incomplete — excluded
      row({ id: "c" }),
      row({ id: "d" }),
    ];
    expect(suggestedApprovals(rows, true, 2).map((r) => r.id)).toEqual(["a", "c"]);
  });
});
