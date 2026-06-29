import { describe, expect, it } from "vitest";
import { buildSupportStatusMessage, buildSupportTopics } from "./aiDrawerData";

const readyContext = {
  rota: {
    state: "ready" as const,
    hasWeek: true,
    openShiftCount: 2,
  },
  leave: {
    state: "ready" as const,
    pendingLeaveCount: 1,
    approvedLeaveCount: 2,
  },
  time: {
    state: "ready" as const,
    pendingTimeCount: 3,
    approvedTimeCount: 4,
  },
};

describe("buildSupportTopics", () => {
  it("uses live counts when the workspace data is ready", () => {
    const topics = buildSupportTopics(readyContext);

    expect(topics[0]?.note).toContain("2 open shifts");
    expect(topics[1]?.note).toContain("1 pending");
    expect(topics[2]?.note).toContain("3 timesheets");
    expect(buildSupportStatusMessage(readyContext)).toContain("current rota");
  });

  it("shows a loading fallback when live counts are still loading", () => {
    const topics = buildSupportTopics({
      ...readyContext,
      rota: { ...readyContext.rota, state: "loading" as const },
      leave: { ...readyContext.leave, state: "loading" as const },
      time: { ...readyContext.time, state: "loading" as const },
    });

    expect(topics[0]?.note).toContain("still loading");
    expect(topics[1]?.note).toContain("still loading");
    expect(topics[2]?.note).toContain("still loading");
    expect(
      buildSupportStatusMessage({
        ...readyContext,
        rota: { ...readyContext.rota, state: "loading" as const },
        leave: { ...readyContext.leave, state: "loading" as const },
        time: { ...readyContext.time, state: "loading" as const },
      }),
    ).toContain("loading");
  });

  it("shows an unavailable fallback when live counts cannot be read", () => {
    const topics = buildSupportTopics({
      ...readyContext,
      rota: { ...readyContext.rota, state: "unavailable" as const },
      leave: { ...readyContext.leave, state: "error" as const },
      time: { ...readyContext.time, state: "unavailable" as const },
    });

    expect(topics[0]?.note).toContain("unavailable right now");
    expect(topics[1]?.note).toContain("unavailable right now");
    expect(topics[2]?.note).toContain("unavailable right now");
    expect(
      buildSupportStatusMessage({
        ...readyContext,
        rota: { ...readyContext.rota, state: "unavailable" as const },
        leave: { ...readyContext.leave, state: "error" as const },
        time: { ...readyContext.time, state: "unavailable" as const },
      }),
    ).toContain("unavailable");
  });
});
