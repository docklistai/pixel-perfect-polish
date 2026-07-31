import type { RotaOverlayKey } from "../hooks/useRotaOverlays";

export const MUTATING_OVERLAYS = new Set<RotaOverlayKey>(["addShift", "publish", "buildWeek"]);
export const LIVE_UNSUPPORTED_OVERLAYS = new Set<RotaOverlayKey>();
