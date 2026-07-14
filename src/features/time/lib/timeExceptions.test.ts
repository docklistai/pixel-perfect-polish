import { describe, expect, it } from "vitest";
import {
  deriveTimeExceptions,
  hasIncompleteBreak,
  TIME_EXCEPTION_GRACE_MINUTES,
} from "./timeExceptions";

const schedule = {
  scheduledStartAt: "2026-07-14T08:00:00.000Z",
  scheduledEndAt: "2026-07-14T16:00:00.000Z",
};

describe("deriveTimeExceptions", () => {
  it("uses one documented five-minute grace threshold", () => {
    expect(TIME_EXCEPTION_GRACE_MINUTES).toBe(5);
    expect(
      deriveTimeExceptions({
        ...schedule,
        clockedInAt: "2026-07-14T08:05:00.000Z",
        clockedOutAt: "2026-07-14T15:55:00.000Z",
      }),
    ).toEqual([]);
    expect(
      deriveTimeExceptions({
        ...schedule,
        clockedInAt: "2026-07-14T08:05:59.000Z",
        clockedOutAt: schedule.scheduledEndAt,
      }),
    ).toContain("late-clock-in");
  });

  it.each([
    ["late clock-in", "2026-07-14T08:06:00.000Z", "2026-07-14T16:00:00.000Z", "late-clock-in"],
    ["early clock-out", "2026-07-14T08:00:00.000Z", "2026-07-14T15:54:00.000Z", "early-clock-out"],
    ["late finish", "2026-07-14T08:00:00.000Z", "2026-07-14T16:06:00.000Z", "late-finish"],
  ])("derives %s", (_label, clockedInAt, clockedOutAt, expected) => {
    expect(deriveTimeExceptions({ ...schedule, clockedInAt, clockedOutAt })).toContain(expected);
  });

  it("derives a missing clock-out only after the scheduled end plus grace", () => {
    expect(
      deriveTimeExceptions({
        ...schedule,
        clockedInAt: "2026-07-14T08:00:00.000Z",
        clockedOutAt: null,
        now: new Date("2026-07-14T16:06:00.000Z"),
      }),
    ).toContain("missing-clock-out");
  });

  it("keeps unmatched and ambiguous attendance honest as unscheduled", () => {
    expect(
      deriveTimeExceptions({
        scheduledStartAt: null,
        scheduledEndAt: null,
        clockedInAt: "2026-07-14T08:00:00.000Z",
        clockedOutAt: "2026-07-14T16:00:00.000Z",
      }),
    ).toEqual(["unscheduled-attendance"]);
  });

  it("compares overnight shifts using absolute instants", () => {
    expect(
      deriveTimeExceptions({
        scheduledStartAt: "2026-07-14T22:00:00.000Z",
        scheduledEndAt: "2026-07-15T06:00:00.000Z",
        clockedInAt: "2026-07-14T22:06:00.000Z",
        clockedOutAt: "2026-07-15T06:07:00.000Z",
      }),
    ).toEqual(["late-clock-in", "late-finish"]);
  });

  it("adds the lazily-derived incomplete-break exception", () => {
    expect(
      deriveTimeExceptions({
        ...schedule,
        clockedInAt: schedule.scheduledStartAt,
        clockedOutAt: schedule.scheduledEndAt,
        hasIncompleteBreak: true,
      }),
    ).toContain("incomplete-break");
  });
});

describe("hasIncompleteBreak", () => {
  it("accepts paired breaks", () => {
    expect(
      hasIncompleteBreak([
        { id: "a", eventType: "break_start", occurredAt: "2026-07-14T12:00:00Z" },
        { id: "b", eventType: "break_end", occurredAt: "2026-07-14T12:30:00Z" },
      ]),
    ).toBe(false);
  });

  it("detects an open or invalid break sequence", () => {
    expect(
      hasIncompleteBreak([
        { id: "a", eventType: "break_start", occurredAt: "2026-07-14T12:00:00Z" },
      ]),
    ).toBe(true);
    expect(
      hasIncompleteBreak([{ id: "a", eventType: "break_end", occurredAt: "2026-07-14T12:30:00Z" }]),
    ).toBe(true);
  });
});
