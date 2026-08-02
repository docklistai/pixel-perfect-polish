import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceStructureFn } from "../api/workspaceStructure";
import { buildDashboardSetup, type DashboardSetupPlan } from "../lib/dashboardSetup";

interface SetupPlanInput {
  workspaceId: string | null;
  isLive: boolean;
  /** Undefined while the live reads are still resolving. */
  liveReady: boolean | undefined;
  staffCount: number | null | undefined;
  plannedShiftCount: number | null | undefined;
  hasPublishedSnapshot: boolean | undefined;
  hasLabourTargets: boolean | null;
  hasBusinessBasics: boolean | null;
}

/**
 * The live first-run setup checklist, including the location/department counts
 * it needs. Demo workspaces are always populated, so the plan is live-only and
 * resolves to null everywhere else.
 */
export function useDashboardSetupPlan(input: SetupPlanInput): DashboardSetupPlan | null {
  const structure = useQuery({
    queryKey: ["dashboard", "workspace-structure", input.workspaceId],
    queryFn: () => fetchWorkspaceStructureFn(),
    enabled: input.isLive && Boolean(input.workspaceId),
    staleTime: 30_000,
  });

  if (!input.isLive || !input.liveReady) return null;

  return buildDashboardSetup({
    staffCount: input.staffCount ?? 0,
    plannedShiftCount: input.plannedShiftCount ?? 0,
    hasPublishedSnapshot: input.hasPublishedSnapshot ?? false,
    hasLabourTargets: input.hasLabourTargets,
    hasBusinessBasics: input.hasBusinessBasics,
    activeLocationCount: structure.data?.activeLocationCount ?? null,
    activeDepartmentCount: structure.data?.activeDepartmentCount ?? null,
  });
}
