import { describe, expect, it } from "vitest";
import { parseBulkStaff } from "./bulkStaff";
import type { WorkspaceDepartment } from "../types";

const DEPARTMENTS: WorkspaceDepartment[] = [
  { id: "dept-foh", name: "Front of house" },
  { id: "dept-kitchen", name: "Kitchen" },
];

describe("parseBulkStaff — valid rows", () => {
  it("parses comma-separated rows into insert payloads", () => {
    const text = "Ava Bennett, Waiter, Front of house, Part-time, 20, ava@seaside.test";
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.rows[0]!.ok).toBe(true);
    expect(result.rows[0]!.payload).toEqual({
      display_name: "Ava Bennett",
      email: "ava@seaside.test",
      role_name: "Waiter",
      department_id: "dept-foh",
      contract_type: "part_time",
      contracted_minutes_per_week: 1200,
    });
  });

  it("keeps a comma inside a quoted name instead of splitting on it", () => {
    // The quote-blind split read this as the name `"Smith` and the role ` John"`,
    // silently creating a staff member nobody asked for.
    const text = '"Smith, John", Waiter, Kitchen';
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.validCount).toBe(1);
    expect(result.rows[0]!.payload?.display_name).toBe("Smith, John");
    expect(result.rows[0]!.payload?.role_name).toBe("Waiter");
    expect(result.rows[0]!.payload?.department_id).toBe("dept-kitchen");
  });

  it("picks one delimiter for the whole paste, not per line", () => {
    // A stray tab in one CSV row must not make that row split differently.
    const text = ["Ava Bennett, Waiter, Kitchen", "Ben\tCarter, Runner, Kitchen"].join("\n");
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]!.payload?.display_name).toBe("Ben\tCarter");
  });

  it("reports malformed quoting instead of silently dropping the paste", () => {
    const result = parseBulkStaff('"Smith, John, Waiter', DEPARTMENTS);
    expect(result.readError).toMatch(/quote/i);
    expect(result.rows).toEqual([]);
  });

  it("accepts tab-separated rows and skips a header line", () => {
    const text = ["Name\tRole\tDepartment", "Ben Carter\tHead Chef\tKitchen"].join("\n");
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.payload?.department_id).toBe("dept-kitchen");
    expect(result.rows[0]!.payload?.contract_type).toBeNull();
  });

  it("treats a blank department as Unassigned and blank optionals as null", () => {
    const text = "Finn Grant, Runner";
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.rows[0]!.ok).toBe(true);
    expect(result.rows[0]!.payload?.department_id).toBeNull();
    expect(result.rows[0]!.payload?.email).toBeNull();
    expect(result.rows[0]!.preview.department).toBe("Unassigned");
  });

  it("ignores fully blank lines", () => {
    const text = "\n\nAva, Waiter\n\n";
    const result = parseBulkStaff(text, DEPARTMENTS);
    expect(result.rows).toHaveLength(1);
  });
});

describe("parseBulkStaff — row errors", () => {
  it("flags a missing required name or role", () => {
    const text = ", Waiter, Front of house";
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.rows[0]!.ok).toBe(false);
    expect(result.errorCount).toBe(1);
    expect(result.rows[0]!.errors.join(" ")).toMatch(/name/i);
  });

  it("flags an unknown department name", () => {
    const text = "Ava Bennett, Waiter, Spa";
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.rows[0]!.ok).toBe(false);
    expect(result.rows[0]!.errors.join(" ")).toMatch(/Unknown department "Spa"/);
  });

  it("flags an unrecognised contract type", () => {
    const text = "Ava Bennett, Waiter, Kitchen, Zero-hours, 10";
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.rows[0]!.ok).toBe(false);
    expect(result.rows[0]!.errors.join(" ")).toMatch(/Contract "Zero-hours"/);
  });

  it("flags an invalid email and invalid hours", () => {
    const text = "Ava Bennett, Waiter, Kitchen, casual, 999, not-an-email";
    const result = parseBulkStaff(text, DEPARTMENTS);

    const joined = result.rows[0]!.errors.join(" ");
    expect(result.rows[0]!.ok).toBe(false);
    expect(joined).toMatch(/email/i);
    expect(joined).toMatch(/hours/i);
  });

  it("flags duplicate emails within the same paste", () => {
    const text = [
      "Ava, Waiter, , , , dup@seaside.test",
      "Bea, Waiter, , , , dup@seaside.test",
    ].join("\n");
    const result = parseBulkStaff(text, DEPARTMENTS);

    expect(result.rows[0]!.ok).toBe(true);
    expect(result.rows[1]!.ok).toBe(false);
    expect(result.rows[1]!.errors.join(" ")).toMatch(/Duplicate email — also on row 1/);
  });

  it("separates valid and invalid rows in a mixed paste", () => {
    const text = ["Ava Bennett, Waiter, Kitchen", ", , ", "Ben Carter, Chef, Spa"].join("\n");
    const result = parseBulkStaff(text, DEPARTMENTS);

    // Row 1 valid; the ", , " row fails (no name/role); "Spa" is an unknown dept.
    expect(result.rows).toHaveLength(3);
    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(2);
  });
});
