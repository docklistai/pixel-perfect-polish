import { CalendarPlus, Send, UserPlus, type LucideIcon } from "lucide-react";
import type { IntentName } from "@/lib/interactionIntents";
import type { AppRoute } from "../types";

/**
 * Pure derivation of the dashboard's "get set up" panel from live workspace
 * counts. The panel replaces the attention summary only while a live workspace
 * is genuinely empty — a brand-new workspace (no staff) or a week with nothing
 * drafted or published yet. Once shifts exist, the normal publish/attention
 * surfaces take over, so an actively drafting manager is never nagged.
 */

export interface DashboardSetupInput {
  /** Staff members on the live roster. */
  staffCount: number;
  /** Shifts (assigned or open) in the current live rota week. */
  plannedShiftCount: number;
  /** Whether the current week has a published snapshot staff can see. */
  hasPublishedSnapshot: boolean;
}

export interface DashboardSetupStep {
  id: "team" | "rota" | "publish";
  title: string;
  description: string;
  done: boolean;
  route: Extract<AppRoute, "/staff" | "/rota">;
  cta: string;
  intent?: IntentName;
  icon: LucideIcon;
}

export interface DashboardSetupPlan {
  /** True while the workspace is in a state where the panel should render. */
  show: boolean;
  /** "workspace" = first-run setup; "week" = staffed workspace, empty week. */
  mode: "workspace" | "week";
  title: string;
  subtitle: string;
  steps: DashboardSetupStep[];
  doneCount: number;
  /** Point new managers at access codes so staff can reach the portal. */
  showAccessCodesHint: boolean;
}

export function buildDashboardSetup(input: DashboardSetupInput): DashboardSetupPlan {
  const { staffCount, plannedShiftCount, hasPublishedSnapshot } = input;
  const teamDone = staffCount > 0;
  const rotaDone = plannedShiftCount > 0;
  const publishDone = hasPublishedSnapshot;

  const steps: DashboardSetupStep[] = [
    {
      id: "team",
      title: "Add your team",
      description: "Add staff members so there is someone to schedule.",
      done: teamDone,
      route: "/staff",
      cta: "Add staff",
      intent: "staff.add",
      icon: UserPlus,
    },
    {
      id: "rota",
      title: "Build this week's rota",
      description: "Add shifts to the draft — only you can see it while you work.",
      done: rotaDone,
      route: "/rota",
      cta: "Open rota",
      intent: "rota.addShift",
      icon: CalendarPlus,
    },
    {
      id: "publish",
      title: "Publish for your team",
      description: "Staff only ever see the rota you choose to publish.",
      done: publishDone,
      route: "/rota",
      cta: "Review & publish",
      intent: "rota.publish",
      icon: Send,
    },
  ];

  const mode: DashboardSetupPlan["mode"] = teamDone ? "week" : "workspace";
  // Only genuinely empty states show the panel; a week that is being drafted
  // (or already published) hands over to the publish card and attention rail.
  const show = !teamDone || (!rotaDone && !publishDone);

  return {
    show,
    mode,
    title: mode === "workspace" ? "Set up your workspace" : "Get this week's rota ready",
    subtitle:
      mode === "workspace"
        ? "Three steps to your first published rota."
        : "Nothing is planned for this week yet — pick up the weekly rhythm.",
    steps,
    doneCount: steps.filter((step) => step.done).length,
    showAccessCodesHint: mode === "workspace",
  };
}
