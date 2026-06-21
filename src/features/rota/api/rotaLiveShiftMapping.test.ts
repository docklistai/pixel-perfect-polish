import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActiveStaffAssignment } from "./rotaLiveShiftMapping";

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
