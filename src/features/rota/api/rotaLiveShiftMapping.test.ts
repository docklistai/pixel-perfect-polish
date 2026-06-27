import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildShiftUpdate,
  resolveActiveStaffAssignment,
  resolveDepartmentId,
  type ExistingShiftRow,
} from "./rotaLiveShiftMapping";
import type { LocationRow, RotaWeekRow } from "./rotaLiveMutationContext";

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

describe("buildShiftUpdate", () => {
  const week: RotaWeekRow = {
    id: "week-1",
    location_id: "location-1",
    week_start: "2026-06-22",
    status: "draft",
  };
  const location: LocationRow = { id: "location-1", timezone: "Europe/London" };
  const openShift: ExistingShiftRow = {
    id: "shift-1",
    rota_week_id: "week-1",
    location_id: "location-1",
    department_id: "front-of-house",
    staff_member_id: null,
    shift_date: "2026-06-22",
    starts_at: "2026-06-22T08:00:00+00:00",
    ends_at: "2026-06-22T16:00:00+00:00",
    break_minutes: 30,
    role_name: "Waiter",
    assignment_status: "open",
  };

  it("persists staff assignment and scheduled status together", async () => {
    const update = await buildShiftUpdate(
      departmentClient({
        staff: { id: "staff-1", department_id: "bar", employment_status: "active" },
        departments: [{ id: "bar", name: "Bar" }],
      }),
      "workspace-1",
      openShift,
      week,
      location,
      { staffId: "staff-1" },
    );

    expect(update).toMatchObject({
      department_id: "bar",
      staff_member_id: "staff-1",
      assignment_status: "scheduled",
    });
  });
});
