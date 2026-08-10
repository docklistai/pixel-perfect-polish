import { Building2, MapPin } from "lucide-react";
import type { DashboardSetupStep } from "./dashboardSetup";

/**
 * The two structural prerequisites a rota depends on: somewhere to schedule
 * against, and a department to count demand for.
 *
 * Workspace bootstrap creates one of each, so these are normally already
 * satisfied. They surface only when genuinely missing, rather than adding two
 * permanently-green rows to every first run. A null count means the read is
 * still in flight and is never treated as missing.
 */
export function buildStructureSteps(
  activeLocationCount: number | null,
  activeDepartmentCount: number | null,
): DashboardSetupStep[] {
  const steps: DashboardSetupStep[] = [];

  if (activeLocationCount !== null && activeLocationCount === 0) {
    steps.push({
      id: "location",
      // Settings cannot create a location — bootstrap makes the first one — so
      // this no longer says "Add" or offers a CTA that implies it can. It routes
      // to the one screen that explains the state and how to get it restored.
      title: "No active location",
      description: "A rota is scheduled against a site. Settings explains how to restore yours.",
      done: false,
      route: "/settings",
      cta: "See what to do",
      icon: MapPin,
    });
  }

  if (activeDepartmentCount !== null && activeDepartmentCount === 0) {
    steps.push({
      id: "department",
      title: "Add a department",
      description: "Departments group the rota and let Build the Week count demand by area.",
      done: false,
      route: "/staff",
      cta: "Manage departments",
      intent: "staff.departments",
      icon: Building2,
    });
  }

  return steps;
}

/** True once a count has loaded and proves the workspace is missing structure. */
export function isStructureMissing(
  activeLocationCount: number | null,
  activeDepartmentCount: number | null,
): boolean {
  return (
    (activeLocationCount !== null && activeLocationCount === 0) ||
    (activeDepartmentCount !== null && activeDepartmentCount === 0)
  );
}
