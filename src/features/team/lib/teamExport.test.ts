import { describe, expect, it } from "vitest";
import { rosterFilename, rosterToCsv } from "./teamExport";
import type { TeamRosterRow } from "../types";

function row(overrides: Partial<TeamRosterRow> = {}): TeamRosterRow {
  return {
    displayName: "Sophie Carter",
    roleName: "FOH Supervisor",
    departmentName: "Front of House",
    deliveredAt: "2026-08-10T09:00:00Z",
    readAt: "2026-08-10T10:00:00Z",
    acknowledgedAt: null,
    status: "read",
    ...overrides,
  };
}

describe("announcement roster export", () => {
  it("writes a header and one line per recipient", () => {
    const csv = rosterToCsv([row(), row({ displayName: "Daniel Mitchell", status: "unread" })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('"Name","Role","Department","Status","Delivered","Read","Acknowledged"');
    expect(lines[1]).toContain('"Sophie Carter"');
    expect(lines[1]).toContain('"read"');
  });

  it("renders a missing value as an empty cell, never 'null'", () => {
    const csv = rosterToCsv([row({ acknowledgedAt: null, roleName: null })]);
    expect(csv).not.toContain("null");
    expect(csv).toContain('""');
  });

  it("neutralises spreadsheet formula injection", () => {
    const csv = rosterToCsv([row({ displayName: "=SUM(A1:A9)" })]);
    expect(csv).toContain('"\'=SUM(A1:A9)"');
  });

  it("escapes embedded quotes", () => {
    const csv = rosterToCsv([row({ displayName: 'Sophie "Sam" Carter' })]);
    expect(csv).toContain('"Sophie ""Sam"" Carter"');
  });

  it("exports only roster columns — no announcement body or manager notes", () => {
    const csv = rosterToCsv([row()]);
    expect(csv.split("\r\n")[0]).not.toMatch(/body|note|comment/i);
  });

  it("builds a dated, slugged filename", () => {
    expect(rosterFilename("Summer Menu Launch!", new Date("2026-08-11T00:00:00Z"))).toBe(
      "docklist-team-summer-menu-launch-2026-08-11.csv",
    );
  });

  it("falls back when a title has no usable characters", () => {
    expect(rosterFilename("!!!", new Date("2026-08-11T00:00:00Z"))).toBe(
      "docklist-team-announcement-2026-08-11.csv",
    );
  });
});
