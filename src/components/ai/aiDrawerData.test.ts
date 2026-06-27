import { describe, expect, it } from "vitest";
import { buildSupportTopics } from "./aiDrawerData";

function topics(openShiftCount: number | null) {
  return buildSupportTopics({
    pendingLeaveCount: 0,
    approvedLeaveCount: 0,
    pendingTimeCount: 0,
    approvedTimeCount: 0,
    openShiftCount,
  });
}

describe("buildSupportTopics", () => {
  it("does not make a false no-open-shifts claim when live rota count is unavailable", () => {
    const rota = topics(null).find((topic) => topic.id === "rota-review");
    expect(rota?.note).toContain("Open shifts are shown on the rota");
    expect(rota?.note).not.toContain("No open shifts");
  });

  it("uses a positive open-shift count when a reliable count is supplied", () => {
    const rota = topics(2).find((topic) => topic.id === "rota-review");
    expect(rota?.note).toContain("2 open shifts");
  });
});
