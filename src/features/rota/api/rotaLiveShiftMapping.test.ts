import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActiveStaffAssignment, resolveDepartmentId } from "./rotaLiveShiftMapping";

function staffClient(
  staff: {
    id: string;
    department_id: string | null;
    employment_status: "active" | "inactive" | "left";
  } | null,
): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: staff, error: null }),
  };

  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

type StaffAssignmentRow = {
  id: string;
  department_id: string | null;
  employment_status: "active" | "inactive" | "left";
};

type DepartmentRow = { id: string; name: string };

function departmentClient({
  staff,
  departments,
}: {
  staff: StaffAssignmentRow | null;
  departments: DepartmentRow[];
}): SupabaseClient {
  const staffQuery = {
    select: () => staffQuery,
    eq: () => staffQuery,
    maybeSingle: async () => ({ data: staff, error: null }),
  };
  const departmentQuery = {
    select: () => departmentQuery,
    eq: () => departmentQuery,
    order: () => departmentQuery,
    then: (
      resolve: (value: { data: DepartmentRow[]; error: null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve({ data: departments, error: null }).then(resolve, reject),
  };

  return {
    from: (table: string) => (table === "staff_members" ? staffQuery : departmentQuery),
  } as unknown as SupabaseClient;
}

describe("resolveActiveStaffAssignment", () => {
  it("returns the active staff assignment", async () => {
    await expect(
      resolveActiveStaffAssignment(
        staffClient({
          id: "staff-1",
          department_id: "department-1",
          employment_status: "active",
        }),
        "workspace-1",
        "staff-1",
      ),
    ).resolves.toEqual({ id: "staff-1", departmentId: "department-1" });
  });

  it.each(["inactive", "left"] as const)(
    "rejects %s staff before a shift insert",
    async (status) => {
      await expect(
        resolveActiveStaffAssignment(
          staffClient({
            id: "staff-1",
            department_id: "department-1",
            employment_status: status,
          }),
          "workspace-1",
          "staff-1",
        ),
      ).rejects.toThrow("Assigned staff member is not active in this workspace");
    },
  );

  it("rejects a missing staff assignment before a shift insert", async () => {
    await expect(
      resolveActiveStaffAssignment(staffClient(null), "workspace-1", "staff-1"),
    ).rejects.toThrow("Assigned staff member is not active in this workspace");
  });
});

describe("resolveDepartmentId", () => {
  const departments: DepartmentRow[] = [
    { id: "front-of-house", name: "Front of house" },
    { id: "bar", name: "Bar" },
  ];

  it("uses the assigned active staff member's department when available", async () => {
    await expect(
      resolveDepartmentId(
        departmentClient({
          staff: { id: "staff-1", department_id: "bar", employment_status: "active" },
          departments,
        }),
        "workspace-1",
        { staffId: "staff-1", role: "Server" },
      ),
    ).resolves.toBe("bar");
  });

  it("falls back to the starter department for active assigned staff without a department", async () => {
    await expect(
      resolveDepartmentId(
        departmentClient({
          staff: { id: "staff-1", department_id: null, employment_status: "active" },
          departments,
        }),
        "workspace-1",
        { staffId: "staff-1", role: "Bartender" },
      ),
    ).resolves.toBe("front-of-house");
  });

  it("can still group open shifts by role when no staff member is assigned", async () => {
    await expect(
      resolveDepartmentId(
        departmentClient({
          staff: null,
          departments,
        }),
        "workspace-1",
        { staffId: null, role: "Bartender" },
      ),
    ).resolves.toBe("bar");
  });
});
