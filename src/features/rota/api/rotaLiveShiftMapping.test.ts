import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildShiftUpdate,
  resolveActiveStaffAssignment,
  resolveDepartmentForCreate,
  resolveDepartmentForUpdate,
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

type DepartmentRow = { id: string; name: string; status?: "active" | "inactive" };

/**
 * Mocks the workspace-scoped reads. `lookup` stands in for the explicit
 * department check: returning null models both "no such department" and
 * "belongs to another workspace", which is what the workspace-scoped query
 * plus RLS actually produce.
 */
function departmentClient({
  staff,
  departments,
  lookup,
}: {
  staff: StaffAssignmentRow | null;
  departments: DepartmentRow[];
  lookup?: DepartmentRow | null;
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
    maybeSingle: async () => ({ data: lookup ?? null, error: null }),
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

describe("resolveDepartmentForCreate", () => {
  const departments: DepartmentRow[] = [
    { id: "front-of-house", name: "Front of house" },
    { id: "bar", name: "Bar" },
  ];

  it("lets an explicit department win over the staff profile department", async () => {
    await expect(
      resolveDepartmentForCreate(
        departmentClient({
          staff: { id: "staff-1", department_id: "front-of-house", employment_status: "active" },
          departments,
          lookup: { id: "events", name: "Events", status: "active" },
        }),
        "workspace-1",
        { departmentId: "events", staffId: "staff-1" },
      ),
    ).resolves.toBe("events");
  });

  it("falls back to the assigned staff member's department when none is given", async () => {
    await expect(
      resolveDepartmentForCreate(
        departmentClient({
          staff: { id: "staff-1", department_id: "bar", employment_status: "active" },
          departments,
        }),
        "workspace-1",
        { staffId: "staff-1" },
      ),
    ).resolves.toBe("bar");
  });

  it("falls back to the starter department for staff with no department of their own", async () => {
    await expect(
      resolveDepartmentForCreate(
        departmentClient({
          staff: { id: "staff-1", department_id: null, employment_status: "active" },
          departments,
        }),
        "workspace-1",
        { staffId: "staff-1" },
      ),
    ).resolves.toBe("front-of-house");
  });

  it("gives an open shift the workspace default rather than guessing from the role", async () => {
    await expect(
      resolveDepartmentForCreate(departmentClient({ staff: null, departments }), "workspace-1", {
        staffId: null,
      }),
    ).resolves.toBe("front-of-house");
  });

  it("rejects a department from another workspace", async () => {
    await expect(
      resolveDepartmentForCreate(
        departmentClient({ staff: null, departments, lookup: null }),
        "workspace-1",
        { departmentId: "11111111-1111-4111-8111-111111111111", staffId: null },
      ),
    ).rejects.toThrow("not available in this workspace");
  });

  it("rejects an inactive department for a new shift", async () => {
    await expect(
      resolveDepartmentForCreate(
        departmentClient({
          staff: null,
          departments,
          lookup: { id: "events", name: "Events", status: "inactive" },
        }),
        "workspace-1",
        { departmentId: "events", staffId: null },
      ),
    ).rejects.toThrow("no longer active");
  });

  it("reports honestly when the workspace has no active department at all (create)", async () => {
    await expect(
      resolveDepartmentForCreate(
        departmentClient({ staff: null, departments: [] }),
        "workspace-1",
        {
          staffId: null,
        },
      ),
    ).rejects.toThrow("Add a department to this workspace");
  });
});

describe("resolveDepartmentForUpdate", () => {
  const departments: DepartmentRow[] = [
    { id: "front-of-house", name: "Front of house" },
    { id: "bar", name: "Bar" },
  ];

  it("lets an explicit department in the patch win", async () => {
    await expect(
      resolveDepartmentForUpdate(
        departmentClient({
          staff: { id: "staff-1", department_id: "bar", employment_status: "active" },
          departments,
          lookup: { id: "events", name: "Events", status: "active" },
        }),
        "workspace-1",
        { departmentId: "events", staffId: "staff-1", existingDepartmentId: "front-of-house" },
      ),
    ).resolves.toBe("events");
  });

  it("keeps the existing department when staff are reassigned", async () => {
    // The heart of the contract: moving the shift to a Bar staff member must
    // not move the shift into Bar.
    await expect(
      resolveDepartmentForUpdate(
        departmentClient({
          staff: { id: "staff-1", department_id: "bar", employment_status: "active" },
          departments,
        }),
        "workspace-1",
        { staffId: "staff-1", existingDepartmentId: "front-of-house" },
      ),
    ).resolves.toBe("front-of-house");
  });

  it("keeps an existing department even after it has been deactivated", async () => {
    await expect(
      resolveDepartmentForUpdate(departmentClient({ staff: null, departments }), "workspace-1", {
        staffId: null,
        existingDepartmentId: "retired-department",
      }),
    ).resolves.toBe("retired-department");
  });

  it("uses the assignee's department only when the shift has none", async () => {
    await expect(
      resolveDepartmentForUpdate(
        departmentClient({
          staff: { id: "staff-1", department_id: "bar", employment_status: "active" },
          departments,
        }),
        "workspace-1",
        { staffId: "staff-1", existingDepartmentId: null },
      ),
    ).resolves.toBe("bar");
  });

  it("falls back to the workspace default when nothing else is available", async () => {
    await expect(
      resolveDepartmentForUpdate(departmentClient({ staff: null, departments }), "workspace-1", {
        staffId: null,
        existingDepartmentId: null,
      }),
    ).resolves.toBe("front-of-house");
  });

  it("still rejects a foreign or inactive department on update", async () => {
    await expect(
      resolveDepartmentForUpdate(
        departmentClient({ staff: null, departments, lookup: null }),
        "workspace-1",
        { departmentId: "11111111-1111-4111-8111-111111111111", staffId: null },
      ),
    ).rejects.toThrow("not available in this workspace");

    await expect(
      resolveDepartmentForUpdate(
        departmentClient({
          staff: null,
          departments,
          lookup: { id: "events", name: "Events", status: "inactive" },
        }),
        "workspace-1",
        { departmentId: "events", staffId: null },
      ),
    ).rejects.toThrow("no longer active");
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
      staff_member_id: "staff-1",
      assignment_status: "scheduled",
    });
  });

  it("keeps the shift's own department when an unrelated field is edited", async () => {
    // Assigning a Bar staff member to a Front-of-house shift must not drag the
    // shift into the Bar department behind the manager's back.
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

    expect(update.department_id).toBe("front-of-house");
  });

  it("moves the shift when the manager names a department explicitly", async () => {
    const update = await buildShiftUpdate(
      departmentClient({
        staff: null,
        departments: [{ id: "bar", name: "Bar" }],
        lookup: { id: "events", name: "Events", status: "active" },
      }),
      "workspace-1",
      openShift,
      week,
      location,
      { departmentId: "events" },
    );

    expect(update.department_id).toBe("events");
  });

  it("does not touch the staff_members table at all when moving a shift", async () => {
    const touched: string[] = [];
    const base = departmentClient({
      staff: { id: "staff-1", department_id: "bar", employment_status: "active" },
      departments: [{ id: "bar", name: "Bar" }],
      lookup: { id: "events", name: "Events", status: "active" },
    });
    const spy = {
      from: (table: string) => {
        touched.push(table);
        return (base as unknown as { from: (t: string) => unknown }).from(table);
      },
    } as unknown as SupabaseClient;

    await buildShiftUpdate(spy, "workspace-1", openShift, week, location, {
      departmentId: "events",
    });

    expect(touched).not.toContain("staff_members");
  });
});
