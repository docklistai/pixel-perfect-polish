import { describe, expect, it } from "vitest";
import { buildTimeReviewTimeline } from "./timeReviewTimeline";

describe("buildTimeReviewTimeline", () => {
  it("combines clock, approval reason, and before/after adjustment evidence", () => {
    const timeline = buildTimeReviewTimeline({
      clockEvents: [
        { id: "clock", eventType: "clock_in", source: "staff", occurredAt: "2026-07-14T08:01:00Z" },
      ],
      stateEvents: [
        {
          id: "approval",
          eventType: "approved",
          resultingStatus: "approved",
          reason: "Checked against the rota",
          occurredAt: "2026-07-14T17:00:00Z",
        },
      ],
      adjustmentAudits: [
        {
          id: "adjustment",
          action: "time_entry.adjusted",
          occurredAt: "2026-07-14T16:30:00Z",
          details: {
            previous_clocked_in_at: "2026-07-14T08:05:00Z",
            clocked_in_at: "2026-07-14T08:01:00Z",
            previous_break_minutes: 0,
            break_minutes: 30,
            reason: "Corrected from signed sheet",
          },
        },
      ],
    });

    expect(timeline.map((item) => item.title)).toEqual([
      "Clocked in",
      "Adjustment evidence",
      "Entry approved",
    ]);
    expect(timeline[1]?.body).toBe("Corrected from signed sheet");
    expect(timeline[1]?.evidence).toContain(
      "Clock in: 2026-07-14T08:05:00Z → 2026-07-14T08:01:00Z",
    );
    expect(timeline[2]?.body).toBe("Checked against the rota");
  });
});
