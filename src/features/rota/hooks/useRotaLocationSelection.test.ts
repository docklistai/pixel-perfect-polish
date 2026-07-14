import { describe, expect, it } from "vitest";
import { advanceStableLocation } from "./useRotaLocationSelection";

describe("advanceStableLocation", () => {
  it("keeps the last resolved location through an A to loading to B transition", () => {
    const atA = advanceStableLocation(null, "location-a");
    const loading = advanceStableLocation(atA.nextLocationId, null);
    const atB = advanceStableLocation(loading.nextLocationId, "location-b");

    expect(atA).toEqual({ nextLocationId: "location-a", changed: false });
    expect(loading).toEqual({ nextLocationId: "location-a", changed: false });
    expect(atB).toEqual({ nextLocationId: "location-b", changed: true });
  });

  it("does not report a change when the resolved location is unchanged", () => {
    expect(advanceStableLocation("location-a", "location-a")).toEqual({
      nextLocationId: "location-a",
      changed: false,
    });
  });
});
