import { describe, expect, it, vi } from "vitest";
import { loadExternalCommitments } from "./buildWeekAvailability";
import type { SupabaseClientLike } from "./buildWeekFacts";

describe("loadExternalCommitments", () => {
  function makeMockSupabase() {
    const builder = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "shift-1",
            staff_member_id: "staff-1",
            shift_date: "2026-08-03",
            starts_at: "2026-08-03T09:00:00Z",
            ends_at: "2026-08-03T17:00:00Z",
            rota_week_id: "week-1",
          },
        ],
        error: null,
      }),
    };
    return builder as unknown as SupabaseClientLike;
  }

  it("applies .neq filter when a rotaWeekId is provided", async () => {
    const supabase = makeMockSupabase();
    await loadExternalCommitments(supabase, "workspace-1", "week-1", "2026-08-03", "Europe/London");

    // @ts-expect-error mock builder exposes neq
    expect(supabase.neq).toHaveBeenCalledWith("rota_week_id", "week-1");
  });

  it("omits .neq filter when rotaWeekId is null to include all commitments", async () => {
    const supabase = makeMockSupabase();
    const result = await loadExternalCommitments(
      supabase,
      "workspace-1",
      null,
      "2026-08-03",
      "Europe/London",
    );

    // @ts-expect-error mock builder exposes neq
    expect(supabase.neq).not.toHaveBeenCalled();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      shiftId: "shift-1",
      staffId: "staff-1",
      times: {
        workDate: "2026-08-03",
        start: "10:00",
        end: "18:00",
      },
    });
  });
});
