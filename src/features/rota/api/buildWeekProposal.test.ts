import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSupabaseServerClient,
  getLiveContext,
  loadAvailabilityFacts,
  loadExternalCommitments,
  resolveDemand,
} = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  getLiveContext: vi.fn(),
  loadAvailabilityFacts: vi.fn(),
  loadExternalCommitments: vi.fn(),
  resolveDemand: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ inputValidator: () => ({ handler: (handler: unknown) => handler }) }),
}));

vi.mock("@/lib/supabase/serverClient", () => ({ getSupabaseServerClient }));
vi.mock("./rotaLiveMutationContext", () => ({ getLiveContext }));
vi.mock("./buildWeekAvailability", () => ({ loadAvailabilityFacts, loadExternalCommitments }));
vi.mock("./buildWeekDemandResolution", () => ({ resolveDemand }));
vi.mock("../lib/scheduling/buildWeekPlanner", () => ({
  planBuildWeek: vi.fn().mockReturnValue({ operations: [{ kind: "test" }] }),
}));

function mockQuery(data: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data, error: null }).then(resolve),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
  return builder;
}

describe("buildWeekProposalFn", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let staffQuery: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let shiftsQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    staffQuery = mockQuery([]);
    shiftsQuery = mockQuery([]);

    supabase = {
      from: vi.fn((table: string) => {
        if (table === "staff_members") return staffQuery;
        if (table === "shifts") return shiftsQuery;
        return mockQuery([]);
      }),
      rpc: vi
        .fn()
        .mockResolvedValue({ data: { fingerprint: "fp-1", digest: "dg-1" }, error: null }),
    };

    getSupabaseServerClient.mockReturnValue(supabase);
    loadAvailabilityFacts.mockResolvedValue([]);
    loadExternalCommitments.mockResolvedValue([]);
  });

  const runHandler = async (input: unknown) => {
    const { buildWeekProposalFn } = await import("./buildWeekProposal");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (buildWeekProposalFn as unknown as (ctx: { data: unknown }) => Promise<any>)({
      data: input,
    });
  };

  it("fresh + template: returns ok: true with rotaWeekId: null and calls fresh stamp", async () => {
    getLiveContext.mockResolvedValue({
      workspaceId: "ws-1",
      location: { id: "loc-1", timezone: "UTC" },
      weekStart: "2026-08-10",
      week: null,
    });
    resolveDemand.mockResolvedValue({
      ok: true,
      source: { kind: "template", id: "tpl-1", label: "Tpl" },
      contentVersion: 1,
      demand: [],
    });

    const result = await runHandler({
      weekOffset: 1,
      source: { kind: "template", templateId: "tpl-1" },
    });

    expect(result.ok).toBe(true);
    expect(result.rotaWeekId).toBe(null);
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_build_week_fresh_proposal_stamp", {
      p_workspace_id: "ws-1",
      p_location_id: "loc-1",
      p_week_start: "2026-08-10",
      p_source: expect.any(Object),
      p_operations: [{ kind: "test" }],
    });
    // read-only check
    expect(staffQuery.insert).not.toHaveBeenCalled();
    expect(shiftsQuery.insert).not.toHaveBeenCalled();
    // No shifts queried since week is null
    expect(supabase.from).not.toHaveBeenCalledWith("shifts");
  });

  it("fresh + previous-week-pattern: returns ok: true and calls fresh stamp", async () => {
    getLiveContext.mockResolvedValue({
      workspaceId: "ws-1",
      location: { id: "loc-1", timezone: "UTC" },
      weekStart: "2026-08-10",
      week: null,
    });
    resolveDemand.mockResolvedValue({
      ok: true,
      source: { kind: "previous-week-pattern", label: "Prev" },
      contentVersion: 1,
      demand: [],
    });

    const result = await runHandler({ weekOffset: 1, source: { kind: "previous-week-pattern" } });

    expect(result.ok).toBe(true);
    expect(result.rotaWeekId).toBe(null);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "rpc_build_week_fresh_proposal_stamp",
      expect.any(Object),
    );
  });

  it("fresh + current-week: explicit refusal, no RPC call", async () => {
    getLiveContext.mockResolvedValue({
      workspaceId: "ws-1",
      location: { id: "loc-1", timezone: "UTC" },
      weekStart: "2026-08-10",
      week: null,
    });

    const result = await runHandler({ weekOffset: 1, source: { kind: "current-week" } });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/There are no shifts in this week yet/);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("existing draft week: unchanged behaviour, calls existing stamp", async () => {
    getLiveContext.mockResolvedValue({
      workspaceId: "ws-1",
      location: { id: "loc-1", timezone: "UTC" },
      weekStart: "2026-08-10",
      week: { id: "week-1", status: "draft" },
    });
    resolveDemand.mockResolvedValue({
      ok: true,
      source: { kind: "template", id: "tpl-1", label: "Tpl" },
      contentVersion: 1,
      demand: [],
    });

    const result = await runHandler({
      weekOffset: 1,
      source: { kind: "template", templateId: "tpl-1" },
    });

    expect(result.ok).toBe(true);
    expect(result.rotaWeekId).toBe("week-1");
    expect(supabase.from).toHaveBeenCalledWith("shifts");
    expect(shiftsQuery.eq).toHaveBeenCalledWith("rota_week_id", "week-1");
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_build_week_proposal_stamp", {
      p_workspace_id: "ws-1",
      p_rota_week_id: "week-1",
      p_source: expect.any(Object),
      p_operations: [{ kind: "test" }],
    });
  });

  it("published week: unchanged refusal", async () => {
    getLiveContext.mockResolvedValue({
      workspaceId: "ws-1",
      location: { id: "loc-1", timezone: "UTC" },
      weekStart: "2026-08-10",
      week: { id: "week-1", status: "published" },
    });

    const result = await runHandler({
      weekOffset: 1,
      source: { kind: "template", templateId: "tpl-1" },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Build only runs on a draft week/);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
