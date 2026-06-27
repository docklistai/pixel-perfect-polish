import { describe, expect, it } from "vitest";
import { validateDepartmentName, type DepartmentNameOption } from "./departmentName";

const EXISTING: DepartmentNameOption[] = [
  { id: "d1", name: "Front of house" },
  { id: "d2", name: "Kitchen" },
];

describe("validateDepartmentName", () => {
  it("accepts and trims a new unique name", () => {
    expect(validateDepartmentName("  Housekeeping  ", EXISTING)).toEqual({
      ok: true,
      name: "Housekeeping",
    });
  });

  it("rejects an empty name", () => {
    const result = validateDepartmentName("   ", EXISTING);
    expect(result.ok).toBe(false);
  });

  it("rejects a case-insensitive duplicate", () => {
    const result = validateDepartmentName("kitchen", EXISTING);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/already exists/);
  });

  it("allows renaming a department to its own name (excludeId)", () => {
    const result = validateDepartmentName("Kitchen", EXISTING, "d2");
    expect(result.ok).toBe(true);
  });

  it("rejects an over-long name", () => {
    const result = validateDepartmentName("x".repeat(121), EXISTING);
    expect(result.ok).toBe(false);
  });
});
