import * as React from "react";
import { useNavigate } from "@tanstack/react-router";

interface RotaLocationSelectionOptions {
  searchLocation: string | undefined;
  searchLocationIsValid: boolean;
  liveLocationId: string | null;
  hasMultipleLocations: boolean;
  setLiveLocationId: (locationId: string) => void;
  clearSelectedShift: () => void;
  clearRecovery: () => void;
  clearConfirmation: () => void;
  closeOverlays: () => void;
}

export type StableLocationTransition = {
  nextLocationId: string | null;
  changed: boolean;
};

/** Keeps the last resolved location while a replacement query is loading. */
export function advanceStableLocation(
  previousLocationId: string | null,
  currentLocationId: string | null,
): StableLocationTransition {
  if (!currentLocationId) {
    return { nextLocationId: previousLocationId, changed: false };
  }
  return {
    nextLocationId: currentLocationId,
    changed: previousLocationId !== null && previousLocationId !== currentLocationId,
  };
}

/** Applies valid route week offsets once per changed search value. */
export function useRotaWeekSearch(
  week: number | undefined,
  setWeekOffset: (week: number) => void,
): void {
  const appliedWeekRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (week === undefined || appliedWeekRef.current === week) return;
    appliedWeekRef.current = week;
    setWeekOffset(week);
  }, [setWeekOffset, week]);
}

/** Keeps route search, live location data, and location-bound UI state aligned. */
export function useRotaLocationSelection({
  searchLocation,
  searchLocationIsValid,
  liveLocationId,
  hasMultipleLocations,
  setLiveLocationId,
  clearSelectedShift,
  clearRecovery,
  clearConfirmation,
  closeOverlays,
}: RotaLocationSelectionOptions): (locationId: string) => void {
  const navigate = useNavigate();
  const previousLocationRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (
      !liveLocationId ||
      !hasMultipleLocations ||
      searchLocation === liveLocationId ||
      searchLocationIsValid
    )
      return;
    void navigate({
      to: "/rota",
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        location: liveLocationId,
      }),
      replace: true,
    });
  }, [hasMultipleLocations, liveLocationId, navigate, searchLocation, searchLocationIsValid]);

  React.useEffect(() => {
    const transition = advanceStableLocation(previousLocationRef.current, liveLocationId);
    previousLocationRef.current = transition.nextLocationId;
    if (transition.changed) {
      clearSelectedShift();
      clearRecovery();
      clearConfirmation();
      closeOverlays();
    }
  }, [clearConfirmation, clearRecovery, clearSelectedShift, closeOverlays, liveLocationId]);

  return React.useCallback(
    (locationId: string) => {
      clearSelectedShift();
      setLiveLocationId(locationId);
      void navigate({
        to: "/rota",
        search: (previous: Record<string, unknown>) => ({ ...previous, location: locationId }),
        replace: true,
      });
    },
    [clearSelectedShift, navigate, setLiveLocationId],
  );
}
