import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchBoundaryOverlaps, type BoundaryLocation } from "./boundaryOverlaps";

/**
 * The overlap decision itself lives here rather than in the frontend interval
 * engine, so these tests assert on raw `timestamptz` instants — never on
 * wall-clock strings. The SQL side of the same rule is covered by
 * `supabase/tests/phase53_cross_boundary_overlap_tests.sql`.
 */

// 2026-06-08 is a Monday; the week runs to Sunday 2026-06-14.
const WEEK_START = "2026-06-08";
const WEEK_END = "2026-06-14";
const CURRENT_WEEK_ID = "week-current";
const CURRENT_LOCATION = "loc-current";

type CandidateRow = {
  id: string;
  staff_member_id: string;
  rota_week_id: string;
  location_id: string;
  department_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

type RecordedCall = { table: string; columns: string; filters: [string, unknown[]][] };

function fakeSupabase(rows: CandidateRow[]) {
  const calls: RecordedCall[] = [];
  let current: RecordedCall | null = null;

  const record =
    (op: string) =>
    (...args: unknown[]) => {
      current!.filters.push([op, args]);
      return builder;
    };

  const builder = {
    select(columns: string) {
      current!.columns = columns;
      return builder;
    },
    eq: record("eq"),
    neq: record("neq"),
    in: record("in"),
    lt: record("lt"),
    gt: record("gt"),
    then(
      resolve: (value: { data: CandidateRow[]; error: null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    },
  };

  const client = {
    from(table: string) {
      current = { table, columns: "", filters: [] };
      calls.push(current);
      return builder;
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}

function candidate(overrides: Partial<CandidateRow> = {}): CandidateRow {
  return {
    id: "other-1",
    staff_member_id: "staff-1",
    rota_week_id: "week-previous",
    location_id: CURRENT_LOCATION,
    department_id: "dept-1",
    shift_date: "2026-06-07",
    starts_at: "2026-06-07T22:00:00.000Z",
    ends_at: "2026-06-08T06:00:00.000Z",
    created_at: "2026-06-01T09:00:00.000Z",
    updated_at: "2026-06-01T09:00:00.000Z",
    ...overrides,
  };
}

const LOCATIONS = new Map<string, BoundaryLocation>([
  [CURRENT_LOCATION, { name: "Harbour", timezone: "UTC" }],
  ["loc-other", { name: "Riverside", timezone: "UTC" }],
]);

async function run(
  shifts: { id: string; staff_member_id: string | null; starts_at: string; ends_at: string }[],
  rows: CandidateRow[],
) {
  const { client, calls } = fakeSupabase(rows);
  const result = await fetchBoundaryOverlaps({
    supabase: client,
    workspaceId: "ws-1",
    rotaWeekId: CURRENT_WEEK_ID,
    currentLocationId: CURRENT_LOCATION,
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    shifts,
    locations: LOCATIONS,
  });
  return { overlaps: result.overlaps, partnerChangeAt: result.partnerChangeAt, calls };
}

/** Monday 05:00–13:00, the shift the worked defect overlaps. */
const MONDAY_EARLY = {
  id: "current-mon",
  staff_member_id: "staff-1",
  starts_at: "2026-06-08T05:00:00.000Z",
  ends_at: "2026-06-08T13:00:00.000Z",
};

/** Sunday 22:00 running into Monday 06:00 — the last day of this week. */
const SUNDAY_OVERNIGHT = {
  id: "current-sun",
  staff_member_id: "staff-1",
  starts_at: "2026-06-14T22:00:00.000Z",
  ends_at: "2026-06-15T06:00:00.000Z",
};

describe("fetchBoundaryOverlaps", () => {
  it("detects a previous-week overnight shift overlapping this Monday", async () => {
    const { overlaps } = await run([MONDAY_EARLY], [candidate()]);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toMatchObject({
      shiftId: "current-mon",
      otherShiftId: "other-1",
      staffMemberId: "staff-1",
      otherShiftDate: "2026-06-07",
      otherStart: "22:00",
      otherEnd: "06:00",
      sameLocation: true,
      side: "before",
    });
  });

  it("detects this Sunday's overnight shift overlapping next week's Monday", async () => {
    const { overlaps } = await run(
      [SUNDAY_OVERNIGHT],
      [
        candidate({
          id: "other-next",
          rota_week_id: "week-next",
          shift_date: "2026-06-15",
          starts_at: "2026-06-15T05:00:00.000Z",
          ends_at: "2026-06-15T13:00:00.000Z",
        }),
      ],
    );

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toMatchObject({ shiftId: "current-sun", side: "after" });
  });

  it("treats a boundary-adjacent shift that merely touches as no overlap", async () => {
    const { overlaps } = await run(
      [
        {
          id: "current-mon",
          staff_member_id: "staff-1",
          starts_at: "2026-06-08T06:00:00.000Z",
          ends_at: "2026-06-08T14:00:00.000Z",
        },
      ],
      // Previous week ends exactly when this shift starts — a clean handover.
      [candidate()],
    );

    expect(overlaps).toEqual([]);
  });

  it("detects an overlap at another location and names it", async () => {
    const { overlaps } = await run(
      [MONDAY_EARLY],
      [
        candidate({
          id: "other-loc",
          rota_week_id: "week-other-location",
          location_id: "loc-other",
          shift_date: "2026-06-08",
          starts_at: "2026-06-08T12:00:00.000Z",
          ends_at: "2026-06-08T20:00:00.000Z",
        }),
      ],
    );

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toMatchObject({
      sameLocation: false,
      otherLocationName: "Riverside",
      // Same calendar dates as this week, but a different rota week.
      side: "same-dates",
    });
  });

  it("detects an overlap in another department", async () => {
    const { overlaps } = await run(
      [MONDAY_EARLY],
      [
        candidate({
          id: "other-dept",
          department_id: "dept-kitchen",
          shift_date: "2026-06-08",
          starts_at: "2026-06-08T12:00:00.000Z",
          ends_at: "2026-06-08T20:00:00.000Z",
        }),
      ],
    );

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]!.otherDepartmentId).toBe("dept-kitchen");
  });

  it("never pairs shifts belonging to different staff members", async () => {
    const { overlaps } = await run([MONDAY_EARLY], [candidate({ staff_member_id: "staff-2" })]);

    expect(overlaps).toEqual([]);
  });

  it("ignores open shifts on the current side and never queries for a week with none", async () => {
    const { overlaps, calls } = await run(
      [{ id: "open-1", staff_member_id: null, starts_at: "", ends_at: "" }],
      [candidate()],
    );

    expect(overlaps).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("returns one row per external partner when a shift overlaps several", async () => {
    const { overlaps } = await run(
      [MONDAY_EARLY],
      [
        candidate({ id: "other-a" }),
        candidate({
          id: "other-b",
          rota_week_id: "week-other-location",
          location_id: "loc-other",
          shift_date: "2026-06-08",
          starts_at: "2026-06-08T12:00:00.000Z",
          ends_at: "2026-06-08T20:00:00.000Z",
        }),
      ],
    );

    // Two pairs, one affected current-week shift. Collapsing to a single
    // affected shift is the conflict model's job, not this layer's.
    expect(overlaps).toHaveLength(2);
    expect(new Set(overlaps.map((overlap) => overlap.shiftId))).toEqual(new Set(["current-mon"]));
  });

  it("scopes the query to the workspace, excludes this rota week, and bounds it", async () => {
    const { calls } = await run([MONDAY_EARLY, SUNDAY_OVERNIGHT], [candidate()]);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.table).toBe("shifts");
    expect(calls[0]!.columns).not.toContain("*");
    expect(calls[0]!.filters).toEqual([
      ["eq", ["workspace_id", "ws-1"]],
      ["neq", ["rota_week_id", CURRENT_WEEK_ID]],
      ["in", ["staff_member_id", ["staff-1"]]],
      // The week's own occupied envelope: earliest start, latest end.
      ["lt", ["starts_at", "2026-06-15T06:00:00.000Z"]],
      ["gt", ["ends_at", "2026-06-08T05:00:00.000Z"]],
    ]);
  });

  it("renders the partner's times in its own location timezone, not the viewer's", async () => {
    const locations = new Map<string, BoundaryLocation>([
      [CURRENT_LOCATION, { name: "Harbour", timezone: "UTC" }],
      ["loc-madrid", { name: "Madrid", timezone: "Europe/Madrid" }],
    ]);
    const { client } = fakeSupabase([
      candidate({
        id: "other-madrid",
        location_id: "loc-madrid",
        shift_date: "2026-06-08",
        // 10:00–18:00 local in Madrid (UTC+2 in June).
        starts_at: "2026-06-08T08:00:00.000Z",
        ends_at: "2026-06-08T16:00:00.000Z",
      }),
    ]);

    const { overlaps } = await fetchBoundaryOverlaps({
      supabase: client,
      workspaceId: "ws-1",
      rotaWeekId: CURRENT_WEEK_ID,
      currentLocationId: CURRENT_LOCATION,
      weekStart: WEEK_START,
      weekEnd: WEEK_END,
      shifts: [MONDAY_EARLY],
      locations,
    });

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toMatchObject({ otherStart: "10:00", otherEnd: "18:00" });
  });
});
