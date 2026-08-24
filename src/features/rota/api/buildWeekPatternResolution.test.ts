import { describe, expect, it } from "vitest";
import {
  findRecentPatternWeek,
  NO_RECENT_PATTERN_REASON,
  resolveDemand,
} from "./buildWeekDemandResolution";
import type { SupabaseClientLike } from "./buildWeekFacts";
import type { ExistingShiftFact } from "../lib/scheduling/buildWeekProposal";
import { buildShiftSignature } from "../lib/scheduling/shiftSignature";

/**
 * Reading a demand source out of the database.
 *
 * The behaviour under test is the bounded backwards search and, just as
 * importantly, what the manager is told about it: the week actually used has to
 * be named, and last week's assignments must never come along for the ride.
 */

// 2026-06-15 is a Monday.
const WEEK_START = "2026-06-15";
const WEEK = Array.from({ length: 7 }, (_, i) => `2026-06-${String(15 + i).padStart(2, "0")}`);
const LOC = "11111111-1111-4111-8111-111111111111";
const DEPT = "22222222-2222-4222-8222-222222222222";
const TZ = "Europe/London";

type Call = { table: string; filters: [string, unknown][] };
type Result = { data: unknown; error: null };

/**
 * A Supabase stand-in that records what was asked and answers per table.
 *
 * Every builder method returns the same object and the object is awaitable, so
 * the chains used by the resolution code (`select().eq().in()`, `.order()`,
 * `.maybeSingle()`) all land on one handler.
 */
function fakeClient(answer: (call: Call) => Result): {
  client: SupabaseClientLike;
  calls: Call[];
} {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, filters: [] };
    calls.push(call);
    const settle = () => Promise.resolve(answer(call));
    const query: Record<string, unknown> = {
      select: () => query,
      order: () => query,
      eq: (column: string, value: unknown) => {
        call.filters.push([column, value]);
        return query;
      },
      in: (column: string, values: unknown) => {
        call.filters.push([column, values]);
        return query;
      },
      maybeSingle: () => settle(),
      then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
        settle().then(resolve, reject),
    };
    return query;
  };
  return { client: { from } as unknown as SupabaseClientLike, calls };
}

/** A shift row as the resolution code reads it. */
function shiftRow(date: string, role: string, staffId: string | null) {
  return {
    id: `shift-${date}-${role}`,
    staff_member_id: staffId,
    department_id: DEPT,
    location_id: LOC,
    shift_date: date,
    starts_at: `${date}T08:00:00+00:00`,
    ends_at: `${date}T16:00:00+00:00`,
    break_minutes: 30,
    role_name: role,
    colour_override: null,
    dept_override: null,
  };
}

/** Answers the two lookup queries, then the shift read for the chosen week. */
function patternClient(weeks: { weekStart: string; id: string; shifts: number }[]) {
  const rows = new Map<string, ReturnType<typeof shiftRow>[]>();
  for (const week of weeks) {
    rows.set(
      week.id,
      Array.from({ length: week.shifts }, (_, i) =>
        shiftRow(week.weekStart, i % 2 === 0 ? "Bartender" : "Waiter", `staff-${i}`),
      ),
    );
  }
  return fakeClient((call) => {
    if (call.table === "rota_weeks") {
      const wanted = call.filters.find(([column]) => column === "week_start")?.[1] as string[];
      return {
        data: weeks
          .filter((week) => wanted.includes(week.weekStart))
          .map((week) => ({ id: week.id, week_start: week.weekStart })),
        error: null,
      };
    }
    // Counting pass: `rota_week_id` arrives as an array via `.in`.
    const weekFilter = call.filters.find(([column]) => column === "rota_week_id")?.[1];
    if (Array.isArray(weekFilter)) {
      return {
        data: weekFilter.flatMap((id) =>
          (rows.get(id as string) ?? []).map(() => ({ rota_week_id: id })),
        ),
        error: null,
      };
    }
    return { data: rows.get(weekFilter as string) ?? [], error: null };
  });
}

const args = (client: SupabaseClientLike) => ({
  supabase: client,
  workspaceId: "workspace-1",
  locationId: LOC,
  weekStart: WEEK_START,
});

describe("findRecentPatternWeek", () => {
  it("uses the immediately previous week when it has shifts", async () => {
    const { client } = patternClient([
      { weekStart: "2026-06-08", id: "w1", shifts: 4 },
      { weekStart: "2026-06-01", id: "w2", shifts: 9 },
    ]);
    const found = await findRecentPatternWeek(args(client));
    expect(found).toMatchObject({ weekStart: "2026-06-08", weeksBack: 1, shiftCount: 4 });
  });

  it("skips an empty previous week and uses the one before it", async () => {
    const { client } = patternClient([
      { weekStart: "2026-06-08", id: "w1", shifts: 0 },
      { weekStart: "2026-06-01", id: "w2", shifts: 6 },
    ]);
    const found = await findRecentPatternWeek(args(client));
    expect(found).toMatchObject({ weekStart: "2026-06-01", weeksBack: 2, shiftCount: 6 });
  });

  it("reaches four weeks back but no further", async () => {
    const { client } = patternClient([
      { weekStart: "2026-05-18", id: "w4", shifts: 3 },
      // A fifth week back, deliberately shift-bearing: it must not be queried
      // for, nor chosen if the database returns it anyway.
      { weekStart: "2026-05-11", id: "w5", shifts: 50 },
    ]);
    const found = await findRecentPatternWeek(args(client));
    expect(found).toMatchObject({ weekStart: "2026-05-18", weeksBack: 4 });
  });

  it("never asks about a fifth week back", async () => {
    const { client, calls } = patternClient([{ weekStart: "2026-06-08", id: "w1", shifts: 2 }]);
    await findRecentPatternWeek(args(client));
    const wanted = calls[0]!.filters.find(([column]) => column === "week_start")?.[1] as string[];
    expect(wanted).toEqual(["2026-06-08", "2026-06-01", "2026-05-25", "2026-05-18"]);
    expect(wanted).not.toContain("2026-05-11");
  });

  it("reports nothing when no week in the window has shifts", async () => {
    const { client } = patternClient([
      { weekStart: "2026-06-08", id: "w1", shifts: 0 },
      { weekStart: "2026-06-01", id: "w2", shifts: 0 },
    ]);
    expect(await findRecentPatternWeek(args(client))).toBeNull();
  });

  it("reports nothing when no earlier week exists at all", async () => {
    const { client } = patternClient([]);
    expect(await findRecentPatternWeek(args(client))).toBeNull();
  });
});

describe("resolveDemand — previous-week pattern", () => {
  const resolveArgs = (client: SupabaseClientLike) => ({
    supabase: client,
    workspaceId: "workspace-1",
    source: { kind: "previous-week-pattern" } as const,
    dayIsoDates: WEEK,
    locationId: LOC,
    weekStart: WEEK_START,
    existingShifts: [] as ExistingShiftFact[],
    existingRows: [],
    timezone: TZ,
  });

  it("names the week the pattern actually came from", async () => {
    const { client } = patternClient([
      { weekStart: "2026-06-08", id: "w1", shifts: 0 },
      { weekStart: "2026-06-01", id: "w2", shifts: 2 },
    ]);
    const resolved = await resolveDemand(resolveArgs(client));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    // The label must not say "last week" when it is two weeks back.
    expect(resolved.source.label).toBe("Staffing pattern from 1–7 Jun");
    expect(resolved.source.id).toBe("w2");
  });

  it("puts the source week in the content version, so a different week invalidates a proposal", async () => {
    const { client } = patternClient([{ weekStart: "2026-06-08", id: "w1", shifts: 2 }]);
    const resolved = await resolveDemand(resolveArgs(client));
    if (!resolved.ok) throw new Error("expected a resolved demand");
    expect(resolved.contentVersion).toBe("week:2026-06-08|shifts:2");
  });

  it("carries shape only — no assignment from the source week survives", async () => {
    const { client } = patternClient([{ weekStart: "2026-06-08", id: "w1", shifts: 4 }]);
    const resolved = await resolveDemand(resolveArgs(client));
    if (!resolved.ok) throw new Error("expected a resolved demand");
    const serialised = JSON.stringify(resolved.demand);
    expect(serialised).not.toContain("staff-");
    expect(serialised).not.toContain("staff_member_id");
    // Requirements are counts of shapes, and every one lands inside this week.
    for (const requirement of resolved.demand) {
      expect(requirement.required).toBeGreaterThan(0);
      expect(WEEK).toContain(requirement.signature.workDate);
    }
  });

  it("refuses with one honest reason when nothing recent has shifts", async () => {
    const { client } = patternClient([{ weekStart: "2026-06-08", id: "w1", shifts: 0 }]);
    const resolved = await resolveDemand(resolveArgs(client));
    expect(resolved).toEqual({ ok: false, message: NO_RECENT_PATTERN_REASON });
    expect(NO_RECENT_PATTERN_REASON).toContain("4 weeks");
  });
});

describe("resolveDemand — other sources are unchanged", () => {
  it("keeps current-week semantics: demand equals what is already there", async () => {
    const { client } = patternClient([]);
    const signature = buildShiftSignature({
      workDate: WEEK[0]!,
      start: "09:00",
      end: "17:00",
      role: "Bartender",
      departmentId: DEPT,
      locationId: LOC,
      breakMinutes: 30,
    });
    const existing: ExistingShiftFact[] = [{ id: "s1", staffId: null, signature }];
    const resolved = await resolveDemand({
      supabase: client,
      workspaceId: "workspace-1",
      source: { kind: "current-week" },
      dayIsoDates: WEEK,
      locationId: LOC,
      weekStart: WEEK_START,
      existingShifts: existing,
      existingRows: [shiftRow(WEEK[0]!, "Bartender", null)],
      timezone: TZ,
    });
    if (!resolved.ok) throw new Error("expected a resolved demand");
    expect(resolved.source).toEqual({
      kind: "current-week",
      label: "This week's existing shifts",
    });
    expect(resolved.demand).toHaveLength(1);
    expect(resolved.demand[0]!.required).toBe(1);
  });

  it("explains an empty template rather than proposing nothing silently", async () => {
    const { client } = fakeClient((call) =>
      call.table === "rota_demand_templates"
        ? { data: { id: "t1", name: "Summer" }, error: null }
        : { data: [], error: null },
    );
    const resolved = await resolveDemand({
      supabase: client,
      workspaceId: "workspace-1",
      source: { kind: "template", templateId: "t1" },
      dayIsoDates: WEEK,
      locationId: LOC,
      weekStart: WEEK_START,
      existingShifts: [],
      existingRows: [],
      timezone: TZ,
    });
    expect(resolved).toEqual({ ok: false, message: "That template has no shifts in it yet." });
  });

  it("explains a template that no longer exists", async () => {
    const { client } = fakeClient(() => ({ data: null, error: null }));
    const resolved = await resolveDemand({
      supabase: client,
      workspaceId: "workspace-1",
      source: { kind: "template", templateId: "gone" },
      dayIsoDates: WEEK,
      locationId: LOC,
      weekStart: WEEK_START,
      existingShifts: [],
      existingRows: [],
      timezone: TZ,
    });
    expect(resolved).toEqual({ ok: false, message: "That template no longer exists." });
  });
});
