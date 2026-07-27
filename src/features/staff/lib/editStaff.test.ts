import { describe, expect, it } from "vitest";
import {
  buildStaffMemberUpdate,
  isEmploymentStatus,
  isOffboardOnlyStatusWrite,
  STAFF_EMPLOYMENT_STATUS_OPTIONS,
  updateStaffSchema,
} from "./editStaff";
import { describeStaffWriteError } from "./addStaff";
import type { EditStaffFormValues } from "./editStaff";

function values(overrides: Partial<EditStaffFormValues> = {}): EditStaffFormValues {
  return {
    fullName: "Sam Rivers",
    email: "Sam.Rivers@Harbourview.co.uk",
    phone: "  07700 900123 ",
    role: "Waiter",
    departmentId: "",
    contractType: "",
    hoursPerWeek: "",
    employmentStatus: "active",
    ...overrides,
  };
}

const VALID_INPUT = {
  id: "11111111-1111-1111-1111-111111111111",
  display_name: "Sam Rivers",
  email: null,
  phone: null,
  role_name: "Waiter",
  department_id: null,
  contract_type: null,
  contracted_minutes_per_week: null,
  employment_status: "active" as const,
};

describe("buildStaffMemberUpdate", () => {
  it("reuses Add normalization: trims name/role, lowercases email, hours→minutes", () => {
    const result = buildStaffMemberUpdate(
      values({ fullName: "  Sam Rivers  ", role: "  Waiter  ", hoursPerWeek: "37.5" }),
    );
    expect(result).toMatchObject({
      ok: true,
      payload: {
        display_name: "Sam Rivers",
        role_name: "Waiter",
        email: "sam.rivers@harbourview.co.uk",
        contracted_minutes_per_week: 2250,
      },
    });
  });

  it("trims phone and collapses a blank phone to null", () => {
    expect(buildStaffMemberUpdate(values()).ok).toBe(true);
    const trimmed = buildStaffMemberUpdate(values());
    if (trimmed.ok) expect(trimmed.payload.phone).toBe("07700 900123");

    const blank = buildStaffMemberUpdate(values({ phone: "   " }));
    if (blank.ok) expect(blank.payload.phone).toBeNull();
  });

  it("collapses blank optional fields to null", () => {
    const result = buildStaffMemberUpdate(
      values({ email: "", departmentId: "", contractType: "", hoursPerWeek: "", phone: "" }),
    );
    expect(result).toMatchObject({
      ok: true,
      payload: {
        email: null,
        department_id: null,
        contract_type: null,
        contracted_minutes_per_week: null,
        phone: null,
      },
    });
  });

  it("accepts each editable employment status: active / inactive", () => {
    for (const status of ["active", "inactive"] as const) {
      const result = buildStaffMemberUpdate(values({ employmentStatus: status }));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.payload.employment_status).toBe(status);
    }
  });

  it("never offers 'left' as an editable status", () => {
    expect(STAFF_EMPLOYMENT_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      "active",
      "inactive",
    ]);
    expect(isEmploymentStatus("left")).toBe(false);
  });

  it("omits employment_status entirely for an already-offboarded member", () => {
    const result = buildStaffMemberUpdate(values({ employmentStatus: "active" }), {
      offboarded: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect("employment_status" in result.payload).toBe(false);
  });

  it("propagates Add field errors (required name/role, bad email, bad hours)", () => {
    expect(buildStaffMemberUpdate(values({ fullName: "  " })).ok).toBe(false);
    expect(buildStaffMemberUpdate(values({ role: "" })).ok).toBe(false);
    expect(buildStaffMemberUpdate(values({ email: "nope" })).ok).toBe(false);
    expect(buildStaffMemberUpdate(values({ hoursPerWeek: "200" })).ok).toBe(false);
  });
});

describe("updateStaffSchema", () => {
  it("accepts a valid update payload", () => {
    expect(() => updateStaffSchema.parse(VALID_INPUT)).not.toThrow();
  });

  it("never accepts a client-supplied workspace_id (extra keys are stripped)", () => {
    const parsed = updateStaffSchema.parse({ ...VALID_INPUT, workspace_id: "evil-workspace" });
    expect("workspace_id" in parsed).toBe(false);
  });

  it("requires a uuid id", () => {
    expect(() => updateStaffSchema.parse({ ...VALID_INPUT, id: "not-a-uuid" })).toThrow();
  });

  it("rejects an unknown employment status", () => {
    expect(() =>
      updateStaffSchema.parse({ ...VALID_INPUT, employment_status: "retired" }),
    ).toThrow();
  });

  it("rejects a generic write of employment_status='left'", () => {
    expect(() => updateStaffSchema.parse({ ...VALID_INPUT, employment_status: "left" })).toThrow();
    expect(isOffboardOnlyStatusWrite({ ...VALID_INPUT, employment_status: "left" })).toBe(true);
    expect(isOffboardOnlyStatusWrite(VALID_INPUT)).toBe(false);
    expect(isOffboardOnlyStatusWrite(null)).toBe(false);
  });

  it("accepts an update that omits employment_status (offboarded member)", () => {
    const { employment_status: _omitted, ...withoutStatus } = VALID_INPUT;
    const parsed = updateStaffSchema.parse(withoutStatus);
    expect(parsed.employment_status).toBeUndefined();
  });
});

describe("describeStaffWriteError (update cases)", () => {
  it("maps a missing row (PGRST116) to a not-found message", () => {
    expect(describeStaffWriteError("PGRST116")).toMatch(/could not be found/i);
  });

  it("maps a duplicate email on update", () => {
    expect(describeStaffWriteError("23505")).toMatch(/already exists/i);
  });
});
