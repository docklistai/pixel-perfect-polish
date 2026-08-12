import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, requireActiveManagerWorkspaceId } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  requireActiveManagerWorkspaceId: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (handler: unknown) => handler }),
}));

vi.mock("@/lib/supabase/serverClient", () => ({ getSupabaseServerClient }));
vi.mock("@/features/auth/api/activeManagerWorkspace", () => ({
  requireActiveManagerWorkspaceId,
}));

interface QueryResult {
  data: unknown;
  error: Error | null;
}

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    then: (resolve: (value: QueryResult) => void) => Promise.resolve(result).then(resolve),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.single.mockResolvedValue(result);
  return builder;
}

describe("fetchWorkspaceStaffFn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveManagerWorkspaceId.mockResolvedValue("workspace-1");
  });

  it("reads birthdays only through the guarded RPC and merges them by staff id", async () => {
    const staff = query({
      data: [
        {
          id: "staff-1",
          display_name: "Sophie Carter",
          email: "sophie@example.test",
          phone: null,
          role_name: "Supervisor",
          employment_status: "active",
          contract_type: "part_time",
          contracted_minutes_per_week: 1920,
          membership_id: "membership-1",
          department_id: "department-1",
          primary_location_id: "location-1",
        },
      ],
      error: null,
    });
    const departments = query({
      data: [{ id: "department-1", name: "Front of House" }],
      error: null,
    });
    const memberships = query({
      data: [{ id: "membership-1", user_id: "user-1" }],
      error: null,
    });
    const locations = query({
      data: [{ id: "location-1", timezone: "Europe/London" }],
      error: null,
    });
    const workspaces = query({ data: { timezone: "UTC" }, error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: [{ staff_member_id: "staff-1", birth_day: 9, birth_month: 6 }],
      error: null,
    });
    const from = vi.fn((table: string) => {
      if (table === "staff_members") return staff;
      if (table === "departments") return departments;
      if (table === "workspace_memberships") return memberships;
      if (table === "locations") return locations;
      return workspaces;
    });
    getSupabaseServerClient.mockReturnValue({ from, rpc });

    const { fetchWorkspaceStaffFn } = await import("./staffLiveData");
    const rows = await (
      fetchWorkspaceStaffFn as unknown as () => Promise<
        Array<{
          id: string;
          birthDay: number | null;
          birthMonth: number | null;
        }>
      >
    )();

    expect(staff.select).toHaveBeenCalledWith(
      "id, display_name, email, phone, role_name, employment_status, contract_type, contracted_minutes_per_week, membership_id, department_id, primary_location_id",
    );
    expect(staff.select.mock.calls[0]?.[0]).not.toContain("birth_day");
    expect(staff.select.mock.calls[0]?.[0]).not.toContain("birth_month");
    expect(rpc).toHaveBeenCalledWith("rpc_team_read_staff_birthdays", {
      p_workspace_id: "workspace-1",
    });
    expect(rows).toMatchObject([{ id: "staff-1", birthDay: 9, birthMonth: 6 }]);
  });
});
