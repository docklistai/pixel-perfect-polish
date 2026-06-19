import * as React from "react";

export type RotaOverlayKey =
  | "addShift"
  | "publish"
  | "conflicts"
  | "generate"
  | "filters"
  | "coverageDetails"
  | "workingTime";

const CLOSED_OVERLAYS: Record<RotaOverlayKey, boolean> = {
  addShift: false,
  publish: false,
  conflicts: false,
  generate: false,
  filters: false,
  coverageDetails: false,
  workingTime: false,
};

/** Open/closed state for every rota drawer and dialog. */
export function useRotaOverlays() {
  const [openOverlays, setOpenOverlays] = React.useState(CLOSED_OVERLAYS);
  const setOverlay = React.useCallback((key: RotaOverlayKey, open: boolean) => {
    setOpenOverlays((prev) => ({ ...prev, [key]: open }));
  }, []);
  const openOverlay = React.useCallback(
    (key: RotaOverlayKey) => setOverlay(key, true),
    [setOverlay],
  );
  return { openOverlays, setOverlay, openOverlay };
}

export type RotaOverlaysState = ReturnType<typeof useRotaOverlays>;
