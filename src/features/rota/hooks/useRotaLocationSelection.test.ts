// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { advanceStableLocation, useRotaWeekSearch } from "./useRotaLocationSelection";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

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

describe("useRotaWeekSearch", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("applies inbound search week offset to rota state", () => {
    const setWeekOffset = vi.fn();
    renderHook(({ week, current }) => useRotaWeekSearch(week, setWeekOffset, current), {
      initialProps: { week: 2 as number | undefined, current: 0 },
    });

    expect(setWeekOffset).toHaveBeenCalledWith(2);
  });

  it("syncs UI week changes back to URL via navigate", () => {
    const setWeekOffset = vi.fn();
    const { rerender } = renderHook(
      ({ week, current }) => useRotaWeekSearch(week, setWeekOffset, current),
      { initialProps: { week: undefined as number | undefined, current: 0 } },
    );

    // Initial render at week 0 without ?week does not navigate
    expect(mockNavigate).not.toHaveBeenCalled();

    // UI week changes to 1
    rerender({ week: undefined, current: 1 });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/rota",
      }),
    );
  });

  it("ignores stale intermediate route updates while a newer outbound navigation is pending", () => {
    const setWeekOffset = vi.fn();
    const { rerender } = renderHook(
      ({ week, current }) => useRotaWeekSearch(week, setWeekOffset, current),
      { initialProps: { week: undefined as number | undefined, current: 0 } },
    );

    // User clicks Next (offset 1)
    rerender({ week: undefined, current: 1 });
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // User clicks Next again before router catches up (offset 2)
    rerender({ week: undefined, current: 2 });
    expect(mockNavigate).toHaveBeenCalledTimes(2);

    // Router finishes first navigation with stale week 1
    rerender({ week: 1, current: 2 });
    // setWeekOffset should NOT be called with stale week 1
    expect(setWeekOffset).not.toHaveBeenCalledWith(1);

    // Router catches up with final target week 2
    rerender({ week: 2, current: 2 });
    expect(setWeekOffset).not.toHaveBeenCalled();

    // Now user clicks browser back to week 1 (external navigation, no outbound pending)
    rerender({ week: 1, current: 2 });
    expect(setWeekOffset).toHaveBeenCalledWith(1);
  });
});
