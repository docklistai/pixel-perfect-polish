import type { RotaGridCell } from "../../types";

/**
 * Tooltip for a cell's leave state. Pending stays visible on occupied cells so
 * a manager who assigned before the request arrived still sees the overlap;
 * approved leave on an occupied cell is already surfaced as a shift conflict,
 * so its title remains empty-cell only.
 */
export function cellLeaveTitle(
  leaveState: RotaGridCell["leaveState"],
  hasShift: boolean,
): string | undefined {
  if (leaveState === "pending") return "Pending leave request";
  if (leaveState === "approved" && !hasShift) return "Approved leave";
  return undefined;
}
