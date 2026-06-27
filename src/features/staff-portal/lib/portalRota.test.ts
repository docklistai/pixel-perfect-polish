import { describe, it, expect } from "vitest";
import {
  clockInShift,
  DEMO_NOW,
  londonPortalNow,
  resolvePortalHasPublished,
  upcomingPortalShifts,
  type PortalNow,
} from "./portalRota";
import type { PortalShift } from "../types";

function shift(overrides: Partial<PortalShift> = {}): PortalShift {
  return {
    id: "s1",
    date: "2026-06-11",
    dayLabel: "Thu 11 Jun",
    start: "09:00",
    end: "17:00",
    hours: 8,
    role: "Barista",
    station: "Bar",
    breakMinutes: 30,
    status: "confirmed",
    sourceSnapshotVersion: 1,
    publishedAt: "2026-06-08T09:00:00.000Z",
    ...overrides,
  };
}

describe("upcomingPortalShifts (injected now)", () => {
  const shifts = [
    shift({ id: "past", date: "2026-06-09" }),
    shift({ id: "today-done", date: "2026-06-11", start: "07:00", end: "10:00" }),
    shift({ id: "today-active", date: "2026-06-11", start: "12:00", end: "20:00" }),
    shift({ id: "future", date: "2026-06-13" }),
  ];

  it("uses the demo clock by default (frozen 13:00 on 11 Jun)", () => {
    const ids = upcomingPortalShifts(shifts).map((s) => s.id);
    // demo now = 13:00: the morning shift has ended, the active + future remain.
    expect(ids).toEqual(["today-active", "future"]);
  });

  it("respects an injected real now", () => {
    const earlyMorning: PortalNow = { todayIso: "2026-06-11", nowMinutes: 8 * 60 };
    const ids = upcomingPortalShifts(shifts, earlyMorning).map((s) => s.id);
    // at 08:00 the 07:00–10:00 shift is still running, so it is still upcoming.
    expect(ids).toEqual(["today-done", "today-active", "future"]);
  });
});

describe("clockInShift (injected now)", () => {
  const todays = [shift({ id: "morning", date: "2026-06-11", start: "07:00", end: "11:00" })];

  it("does not depend on the frozen demo time when a real now is passed", () => {
    expect(clockInShift(todays, { todayIso: "2026-06-11", nowMinutes: 8 * 60 })?.id).toBe(
      "morning",
    );
    // demo now (13:00) is past the morning shift — nothing to clock into.
    expect(clockInShift(todays, DEMO_NOW)).toBeNull();
  });
});

describe("londonPortalNow", () => {
  it("derives date and minutes in the workspace timezone", () => {
    // 23:30 UTC on 11 Jun is 00:30 BST on 12 Jun.
    expect(londonPortalNow(new Date("2026-06-11T23:30:00Z"))).toEqual({
      todayIso: "2026-06-12",
      nowMinutes: 30,
    });
  });
});

describe("resolvePortalHasPublished", () => {
  it("distinguishes an empty personal rota from no published rota", () => {
    expect(resolvePortalHasPublished([], true)).toBe(true);
    expect(resolvePortalHasPublished([], false)).toBe(false);
  });
});
