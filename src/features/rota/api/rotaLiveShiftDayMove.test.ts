import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildShiftUpdate, type ExistingShiftRow } from "./rotaLiveShiftMapping";
import { updateShiftInput } from "./rotaLiveMutationSchemas";
import { toUpdatePatch } from "../hooks/useRotaLiveShiftMutations";
import type { LocationRow, RotaWeekRow } from "./rotaLiveMutationContext";
import type { RotaDayIndex } from "../types";

/**
 * Moving a shift between days of its own rota week.
 *
 * The property under test throughout is that a day move re-anchors the same
 * LOCAL WALL CLOCK to a new date, rather than adding a day of milliseconds to a
 * stored instant. The two are indistinguishable until a DST boundary sits
 * inside the week, at which point the naive version silently shifts every start
 * time by an hour.
 */

const SHIFT_ID = "11111111-1111-4111-8111-111111111111";
const STAFF_A = "22222222-2222-4222-8222-222222222222";
const STAFF_B = "33333333-3333-4333-8333-333333333333";

function client(
  staff: { id: string; department_id: string | null; employment_status: string } | null = {
    id: STAFF_B,
    department_id: "bar",
    employment_status: "active",
  },
): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    maybeSingle: async () => ({ data: staff, error: null }),
  };
  return { from: () => query } as unknown as SupabaseClient;
}

const location: LocationRow = { id: "location-1", timezone: "Europe/London" };

function week(weekStart: string): RotaWeekRow {
  return { id: "week-1", location_id: "location-1", week_start: weekStart, status: "draft" };
}

function shift(overrides: Partial<ExistingShiftRow> = {}): ExistingShiftRow {
  return {
    id: SHIFT_ID,
    rota_week_id: "week-1",
    location_id: "location-1",
    department_id: "front-of-house",
    staff_member_id: STAFF_A,
    shift_date: "2026-06-22",
    starts_at: "2026-06-22T08:00:00+00:00",
    ends_at: "2026-06-22T16:00:00+00:00",
    break_minutes: 30,
    role_name: "Waiter",
    assignment_status: "scheduled",
    ...overrides,
  };
}

describe("updateShiftInput — dayIndex", () => {
  const base = { shiftId: SHIFT_ID };

  it.each([0, 3, 6])("accepts day %i", (dayIndex) => {
    expect(updateShiftInput.parse({ ...base, patch: { dayIndex } }).patch.dayIndex).toBe(dayIndex);
  });

  it.each([-1, 7, 1.5])("rejects %s", (dayIndex) => {
    expect(() => updateShiftInput.parse({ ...base, patch: { dayIndex } })).toThrow();
  });

  it("still refuses an entirely empty patch", () => {
    expect(() => updateShiftInput.parse({ ...base, patch: {} })).toThrow();
  });
});

describe("toUpdatePatch", () => {
  it("forwards a day move to the server function", () => {
    expect(toUpdatePatch({ dayIndex: 4 as RotaDayIndex })).toEqual({ dayIndex: 4 });
  });

  it("forwards day and assignment together", () => {
    expect(toUpdatePatch({ dayIndex: 4 as RotaDayIndex, staffId: STAFF_B })).toEqual({
      dayIndex: 4,
      staffId: STAFF_B,
    });
  });

  it("keeps day 0 rather than dropping it as falsy", () => {
    expect(toUpdatePatch({ dayIndex: 0 as RotaDayIndex })).toEqual({ dayIndex: 0 });
  });

  it("still drops draft-only fields", () => {
    expect(toUpdatePatch({ dayIndex: 1 as RotaDayIndex, tone: "warning", edited: true })).toEqual({
      dayIndex: 1,
    });
  });
});

describe("buildShiftUpdate — day moves", () => {
  it("re-dates the shift and keeps the local clock, duration and break", async () => {
    const update = await buildShiftUpdate(
      client(),
      "workspace-1",
      shift(),
      week("2026-06-22"),
      location,
      {
        dayIndex: 3,
      },
    );

    // The fixture stores 08:00Z in June, which is 09:00 local under BST. The
    // move keeps 09:00–17:00 local, so the instants shift by exactly three days.
    expect(update.shift_date).toBe("2026-06-25");
    expect(update.starts_at).toBe(new Date("2026-06-25T09:00:00+01:00").toISOString());
    expect(update.ends_at).toBe(new Date("2026-06-25T17:00:00+01:00").toISOString());
    expect(update.break_minutes).toBe(30);
    expect(update.role_name).toBe("Waiter");
    expect(update.department_id).toBe("front-of-house");
  });

  it("leaves the stored instants untouched when nothing moves", async () => {
    const original = shift();
    const update = await buildShiftUpdate(
      client(),
      "workspace-1",
      original,
      week("2026-06-22"),
      location,
      { dayIndex: 0 },
    );

    expect(update.shift_date).toBe(original.shift_date);
    expect(update.starts_at).toBe(original.starts_at);
    expect(update.ends_at).toBe(original.ends_at);
  });

  it("preserves the overnight relationship, ending on the day after the new date", async () => {
    const overnight = shift({
      shift_date: "2026-06-22",
      starts_at: "2026-06-22T21:00:00+00:00",
      ends_at: "2026-06-23T05:00:00+00:00",
    });

    const update = await buildShiftUpdate(
      client(),
      "workspace-1",
      overnight,
      week("2026-06-22"),
      location,
      { dayIndex: 5 },
    );

    expect(update.shift_date).toBe("2026-06-27");
    // 22:00 local on the 27th through 06:00 local on the 28th — still eight
    // hours, still crossing midnight.
    expect(update.starts_at).toBe(new Date("2026-06-27T22:00:00+01:00").toISOString());
    expect(update.ends_at).toBe(new Date("2026-06-28T06:00:00+01:00").toISOString());
  });

  it("keeps the wall clock across a DST boundary inside the week", async () => {
    // Week of Mon 23 March 2026; British Summer Time begins on Sunday the 29th,
    // which is day 6. A 09:00 start on the Monday is 09:00 UTC; the same 09:00
    // on the Sunday is 08:00 UTC. Adding 24h of milliseconds six times would
    // have produced 10:00 local — an hour of unpaid work nobody asked for.
    const gmtShift = shift({
      shift_date: "2026-03-23",
      starts_at: "2026-03-23T09:00:00+00:00",
      ends_at: "2026-03-23T17:00:00+00:00",
    });

    const update = await buildShiftUpdate(
      client(),
      "workspace-1",
      gmtShift,
      week("2026-03-23"),
      location,
      { dayIndex: 6 },
    );

    expect(update.shift_date).toBe("2026-03-29");
    expect(update.starts_at).toBe("2026-03-29T08:00:00.000Z");
    expect(update.ends_at).toBe("2026-03-29T16:00:00.000Z");
    // The clock face the manager sees is unchanged, which is the whole point.
    expect(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(update.starts_at)),
    ).toBe("09:00");
  });

  it("moves day and assignee in a single update", async () => {
    const update = await buildShiftUpdate(
      client(),
      "workspace-1",
      shift(),
      week("2026-06-22"),
      location,
      {
        dayIndex: 2,
        staffId: STAFF_B,
      },
    );

    expect(update.shift_date).toBe("2026-06-24");
    expect(update.staff_member_id).toBe(STAFF_B);
    expect(update.assignment_status).toBe("scheduled");
  });

  it("unassigns to the open row without disturbing the date", async () => {
    const update = await buildShiftUpdate(
      client(),
      "workspace-1",
      shift(),
      week("2026-06-22"),
      location,
      {
        staffId: null,
      },
    );

    expect(update.staff_member_id).toBeNull();
    expect(update.assignment_status).toBe("open");
    expect(update.shift_date).toBe("2026-06-22");
  });
});

describe("buildShiftUpdate — active assignee protection", () => {
  it("refuses a reassignment to somebody who has left", async () => {
    await expect(
      buildShiftUpdate(
        client({ id: STAFF_B, department_id: "bar", employment_status: "left" }),
        "workspace-1",
        shift(),
        week("2026-06-22"),
        location,
        { staffId: STAFF_B },
      ),
    ).rejects.toThrow("not active in this workspace");
  });

  it("refuses a reassignment to somebody outside this workspace", async () => {
    await expect(
      buildShiftUpdate(client(null), "workspace-1", shift(), week("2026-06-22"), location, {
        staffId: STAFF_B,
      }),
    ).rejects.toThrow("not active in this workspace");
  });

  it("allows a reassignment to an active team member", async () => {
    const update = await buildShiftUpdate(
      client(),
      "workspace-1",
      shift(),
      week("2026-06-22"),
      location,
      {
        staffId: STAFF_B,
      },
    );
    expect(update.staff_member_id).toBe(STAFF_B);
  });

  it("allows unassigning, which needs no assignee to be active", async () => {
    // `client(null)` would refuse any lookup, proving none is made.
    const update = await buildShiftUpdate(
      client(null),
      "workspace-1",
      shift(),
      week("2026-06-22"),
      location,
      {
        staffId: null,
      },
    );
    expect(update.staff_member_id).toBeNull();
  });

  it("still moves the shift of someone who has since left, as long as the assignee is unchanged", async () => {
    // Their row is still on the grid because they hold shifts. Tidying those
    // shifts up must not be blocked by the check that guards reassignment.
    const update = await buildShiftUpdate(
      client(null),
      "workspace-1",
      shift(),
      week("2026-06-22"),
      location,
      {
        dayIndex: 4,
      },
    );
    expect(update.shift_date).toBe("2026-06-26");
    expect(update.staff_member_id).toBe(STAFF_A);
  });
});
