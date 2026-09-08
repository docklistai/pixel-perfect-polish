import { describe, expect, it } from "vitest";

import { canBuildFromCurrentWeek, isBuildWeekColdStart } from "./buildWeekColdStart";

const facts = (overrides: Partial<Parameters<typeof isBuildWeekColdStart>[0]> = {}) => ({
  resolved: true,
  templateCount: 0,
  previousPatternAvailable: false,
  plannedShiftCount: 0,
  ...overrides,
});

describe("isBuildWeekColdStart", () => {
  it("is a cold start with no template, no recent pattern and no shifts", () => {
    expect(isBuildWeekColdStart(facts())).toBe(true);
  });

  it("is not a cold start once a template exists", () => {
    expect(isBuildWeekColdStart(facts({ templateCount: 1 }))).toBe(false);
  });

  it("is not a cold start once a recent week can be copied", () => {
    expect(isBuildWeekColdStart(facts({ previousPatternAvailable: true }))).toBe(false);
  });

  it("is not a cold start once the week itself has shifts", () => {
    // This is the exit: sketching Open shifts gives the current-week source
    // something to describe, so the ordinary source step returns.
    expect(isBuildWeekColdStart(facts({ plannedShiftCount: 1 }))).toBe(false);
  });

  it("waits for both source questions before claiming anything", () => {
    // While loading, "nothing to build from" and "not asked yet" are the same
    // shape. Guidance must never flash over options that are about to appear.
    expect(isBuildWeekColdStart(facts({ resolved: false }))).toBe(false);
  });

  it("needs every source to be absent, not just one", () => {
    expect(isBuildWeekColdStart(facts({ templateCount: 2, previousPatternAvailable: true }))).toBe(
      false,
    );
    expect(isBuildWeekColdStart(facts({ templateCount: 2, plannedShiftCount: 4 }))).toBe(false);
  });
});

describe("canBuildFromCurrentWeek", () => {
  it("needs at least one Open shift for the assignment pass to have work", () => {
    expect(canBuildFromCurrentWeek(0)).toBe(false);
    expect(canBuildFromCurrentWeek(1)).toBe(true);
    expect(canBuildFromCurrentWeek(12)).toBe(true);
  });
});
