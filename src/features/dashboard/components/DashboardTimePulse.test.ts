import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const card = readFileSync("src/features/dashboard/components/DashboardTimePulse.tsx", "utf8");
const hook = readFileSync("src/features/dashboard/hooks/useTimePulse.ts", "utf8");
const read = readFileSync("src/features/time/api/timePulseRead.ts", "utf8");

/** Code only — prose that *names* a rejected pattern must not fail its own check. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
const hookCode = stripComments(hook);
const cardCode = stripComments(card);
const readCode = stripComments(read);

describe("Time Pulse freshness and manual refresh", () => {
  it("states when the data was read instead of implying it is live", () => {
    expect(card).toContain("As at ${asAt}");
    expect(card).toContain("generatedAt");
    // Formatted in a real workspace timezone, never browser-local time.
    expect(card).toContain("formatClockTime(generatedAt, workspaceTimezone)");
    expect(card).not.toMatch(/new Date\(\)\.toLocaleTimeString|toLocaleTimeString\(\)/);
  });

  it("offers a manual Refresh control with an honest in-flight state", () => {
    expect(card).toContain("onClick={onRefresh}");
    expect(card).toContain("disabled={isRefreshing}");
    expect(card).toContain('isRefreshing ? "Refreshing…"');
    expect(hook).toContain("isRefreshing: enabled && query.isFetching && !query.isLoading");
  });

  it("never polls in the background", () => {
    expect(hookCode).not.toMatch(/refetchInterval|setInterval/);
    expect(cardCode).not.toMatch(/setInterval|setTimeout/);
  });

  it("keeps refresh inert while the experiment is off", () => {
    // The control must not become a way to read attendance the flag disabled.
    expect(hook).toContain("if (!enabled) return;");
    expect(hook).toContain("enabled,");
  });
});

describe("Time Pulse read stays scoped to today's resolved shifts", () => {
  it("drops shift-linked entries whose shift is not on today's board", () => {
    expect(read).toContain(
      "const todaysShiftIds = new Set(shifts.map((shift) => shift.sourceShiftId));",
    );
    expect(read).toContain("if (entry.shiftId !== null) return todaysShiftIds.has(entry.shiftId);");
  });

  it("remains read-only", () => {
    expect(readCode).not.toMatch(/\.(insert|upsert|update|delete)\(/);
  });
});
