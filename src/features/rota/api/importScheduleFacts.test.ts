import { describe, expect, it } from "vitest";
import type { SupabaseClientLike } from "./buildWeekFacts";
import { loadImportFacts } from "./importScheduleFacts";

/**
 * What an import preview is allowed to believe about absence.
 *
 * The rule under test is fail-closed. A preview that treated "the leave read
 * failed" as "nobody is on leave" would mark a row importable that the apply
 * boundary refuses — the exact late-refusal this read exists to prevent, made
 * worse by being intermittent. So the read is unconditional and its failure
 * takes the whole preview down with it.
 */

const WEEK_START = "2026-08-03";
const WEEK = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];

type TableResult = { data: unknown[] | null; error: { message: string } | null };

/**
 * A Supabase double that answers per table and resolves wherever the chain is
 * awaited, which is what the real PostgREST builder does.
 */
function fakeSupabase(results: Record<string, TableResult>): SupabaseClientLike {
  return {
    from(table: string) {
      const result = results[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {
        then: (resolve: (value: TableResult) => unknown) => Promise.resolve(result).then(resolve),
      };
      for (const method of ["select", "eq", "in", "gte", "lte", "not", "neq", "order"]) {
        builder[method] = () => builder;
      }
      return builder;
    },
  } as unknown as SupabaseClientLike;
}

const healthy: Record<string, TableResult> = {
  shifts: { data: [], error: null },
  staff_members: {
    data: [{ id: "s1", display_name: "Ana Chef", employment_status: "active", role_name: "Chef" }],
    error: null,
  },
  departments: { data: [{ id: "d1", name: "Kitchen", status: "active" }], error: null },
  leave_requests: {
    data: [
      {
        staff_member_id: "s1",
        start_date: "2026-08-05",
        end_date: "2026-08-05",
        status: "approved",
      },
    ],
    error: null,
  },
  staff_recurring_day_off_requests: { data: [], error: null },
  staff_one_off_unavailability_requests: { data: [], error: null },
};

const load = (results: Record<string, TableResult>) =>
  loadImportFacts({
    supabase: fakeSupabase(results),
    workspaceId: "w1",
    rotaWeekId: "week-1",
    timezone: "Europe/London",
    weekStart: WEEK_START,
    weekIsoDates: WEEK,
  });

describe("loadImportFacts", () => {
  it("indexes recorded absence alongside the staff and department facts", async () => {
    const facts = await load(healthy);

    expect(facts.staff).toHaveLength(1);
    expect(facts.availability.approvedLeaveDatesByStaff.get("s1")?.has("2026-08-05")).toBe(true);
    expect(facts.availability.pendingLeaveDatesByStaff.size).toBe(0);
  });

  it("fails the preview when leave cannot be read, rather than reporting no leave", async () => {
    await expect(
      load({ ...healthy, leave_requests: { data: null, error: { message: "boom" } } }),
    ).rejects.toMatchObject({ message: "boom" });
  });

  it("fails the preview when recurring days off cannot be read", async () => {
    await expect(
      load({
        ...healthy,
        staff_recurring_day_off_requests: { data: null, error: { message: "boom" } },
      }),
    ).rejects.toMatchObject({ message: "boom" });
  });

  it("fails the preview when one-off unavailability cannot be read", async () => {
    await expect(
      load({
        ...healthy,
        staff_one_off_unavailability_requests: { data: null, error: { message: "boom" } },
      }),
    ).rejects.toMatchObject({ message: "boom" });
  });
});
