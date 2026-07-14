import type { RotaOverlayKey } from "../hooks/useRotaOverlays";

export const MUTATING_OVERLAYS = new Set<RotaOverlayKey>(["addShift", "publish", "generate"]);
export const LIVE_UNSUPPORTED_OVERLAYS = new Set<RotaOverlayKey>();
