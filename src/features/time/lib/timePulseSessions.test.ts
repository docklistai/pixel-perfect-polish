import { describe, expect, it } from "vitest";
import { chooseShiftEntry, selectEntriesByShift } from "./timePulseSessions";
import type { TimePulseEntryInput } from "./timePulseTypes";

function entry(overrides: Partial<TimePulseEntryInput> = {}): TimePulseEntryInput {
  return {
    id: "entry-1",
    staffMemberId: "staff-1",
    shiftId: "shift-1",
    scheduledStartAt: "2026-08-17T09:00:00.000Z",
    scheduledEndAt: "2026-08-17T17:00:00.000Z",
    clockedInAt: "2026-08-17T09:00:00.000Z",
    clockedOutAt: null,
    onOpenBreak: false,
    ...overrides,
  };
}

describe("one session per shift, chosen deterministically", () => {
  it("prefers the open session over a closed one, whichever order they arrive", () => {
    const closed = entry({ id: "closed", clockedOutAt: "2026-08-17T11:00:00.000Z" });
    const open = entry({ id: "open", clockedInAt: "2026-08-17T11:05:00.000Z" });

    expect(chooseShiftEntry(closed, open).id).toBe("open");
    expect(chooseShiftEntry(open, closed).id).toBe("open");
    expect(selectEntriesByShift([closed, open]).get("shift-1")!.id).toBe("open");
    expect(selectEntriesByShift([open, closed]).get("shift-1")!.id).toBe("open");
  });

  it("prefers the open session even when the closed one clocked in later", () => {
    const open = entry({ id: "open", clockedInAt: "2026-08-17T09:00:00.000Z" });
    const closed = entry({
      id: "closed",
      clockedInAt: "2026-08-17T13:00:00.000Z",
      clockedOutAt: "2026-08-17T14:00:00.000Z",
    });
    expect(selectEntriesByShift([open, closed]).get("shift-1")!.id).toBe("open");
  });

  it("falls back to the latest clock-in when every session is closed", () => {
    const early = entry({
      id: "early",
      clockedInAt: "2026-08-17T09:00:00.000Z",
      clockedOutAt: "2026-08-17T11:00:00.000Z",
    });
    const late = entry({
      id: "late",
      clockedInAt: "2026-08-17T12:00:00.000Z",
      clockedOutAt: "2026-08-17T15:00:00.000Z",
    });
    expect(selectEntriesByShift([early, late]).get("shift-1")!.id).toBe("late");
    expect(selectEntriesByShift([late, early]).get("shift-1")!.id).toBe("late");
  });

  it("is stable when two sessions are indistinguishable by time", () => {
    const a = entry({ id: "aaa", clockedOutAt: "2026-08-17T17:00:00.000Z" });
    const b = entry({ id: "zzz", clockedOutAt: "2026-08-17T17:00:00.000Z" });
    expect(chooseShiftEntry(a, b).id).toBe("aaa");
    expect(chooseShiftEntry(b, a).id).toBe("aaa");
  });

  it("never indexes an entry that has no shift", () => {
    expect(selectEntriesByShift([entry({ shiftId: null })]).size).toBe(0);
  });

  it("keeps different shifts independent", () => {
    const chosen = selectEntriesByShift([
      entry({ id: "a", shiftId: "shift-a" }),
      entry({ id: "b", shiftId: "shift-b" }),
    ]);
    expect(chosen.get("shift-a")!.id).toBe("a");
    expect(chosen.get("shift-b")!.id).toBe("b");
  });
});
