import { describe, expect, it } from "vitest";
import { buildStaffMemberInsert, canSubmitAddStaffForm, describeStaffWriteError } from "./addStaff";
import type { AddStaffFormValues } from "./addStaff";

function values(overrides: Partial<AddStaffFormValues> = {}): AddStaffFormValues {
  return {
    fullName: "Sam Rivers",
    email: "Sam.Rivers@Harbourview.co.uk",
    role: "Waiter",
    departmentId: "",
    contractType: "",
    hoursPerWeek: "",
    ...overrides,
  };
}

describe("buildStaffMemberInsert", () => {
  it("trims the name/role and lowercases the email", () => {
    const result = buildStaffMemberInsert(
      values({ fullName: "  Sam Rivers  ", role: "  Waiter  " }),
    );
    expect(result).toMatchObject({
      ok: true,
      payload: {
        display_name: "Sam Rivers",
        role_name: "Waiter",
        email: "sam.rivers@harbourview.co.uk",
      },
    });
  });

  it("converts contracted hours to whole minutes", () => {
    const result = buildStaffMemberInsert(values({ hoursPerWeek: "37.5" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.contracted_minutes_per_week).toBe(2250);
  });

  it("collapses blank optional fields to null", () => {
    const result = buildStaffMemberInsert(
      values({ email: "", departmentId: "", contractType: "", hoursPerWeek: "" }),
    );
    expect(result).toMatchObject({
      ok: true,
      payload: {
        email: null,
        department_id: null,
        contract_type: null,
        contracted_minutes_per_week: null,
      },
    });
  });

  it("keeps a valid contract type and department id", () => {
    const result = buildStaffMemberInsert(
      values({ contractType: "part_time", departmentId: "dept-uuid-1" }),
    );
    expect(result).toMatchObject({
      ok: true,
      payload: { contract_type: "part_time", department_id: "dept-uuid-1" },
    });
  });

  it("drops an unrecognised contract type to null", () => {
    const result = buildStaffMemberInsert(values({ contractType: "zero_hours" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.contract_type).toBeNull();
  });

  it("requires a name", () => {
    const result = buildStaffMemberInsert(values({ fullName: "   " }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.fullName).toBeTruthy();
  });

  it("requires a role", () => {
    const result = buildStaffMemberInsert(values({ role: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.role).toBeTruthy();
  });

  it("rejects a malformed email", () => {
    const result = buildStaffMemberInsert(values({ email: "not-an-email" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeTruthy();
  });

  it("rejects negative or non-numeric hours", () => {
    expect(buildStaffMemberInsert(values({ hoursPerWeek: "-4" })).ok).toBe(false);
    expect(buildStaffMemberInsert(values({ hoursPerWeek: "abc" })).ok).toBe(false);
  });

  it("rejects hours beyond a week", () => {
    const result = buildStaffMemberInsert(values({ hoursPerWeek: "200" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.hoursPerWeek).toBeTruthy();
  });
});

describe("describeStaffWriteError", () => {
  it("maps a duplicate email to a specific message", () => {
    expect(describeStaffWriteError("23505")).toMatch(/already exists/i);
  });

  it("maps a permission error", () => {
    expect(describeStaffWriteError("42501")).toMatch(/permission/i);
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(describeStaffWriteError(null)).toMatch(/couldn't save/i);
    expect(describeStaffWriteError("99999")).toMatch(/couldn't save/i);
  });
});

describe("canSubmitAddStaffForm", () => {
  it("waits for live departments before allowing creation", () => {
    expect(
      canSubmitAddStaffForm({ source: "live", submitting: false, departmentsLoading: true }),
    ).toBe(false);
    expect(
      canSubmitAddStaffForm({ source: "live", submitting: false, departmentsLoading: false }),
    ).toBe(true);
  });
});
