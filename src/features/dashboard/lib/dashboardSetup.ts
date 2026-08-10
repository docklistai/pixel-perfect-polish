import { CalendarPlus, PiggyBank, Send, Store, UserPlus, type LucideIcon } from "lucide-react";
import type { IntentName } from "@/lib/interactionIntents";
import type { AppRoute } from "../types";
import { buildStructureSteps, isStructureMissing } from "./dashboardSetupStructure";

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
  /**
   * Whether labour targets (budget or cost assumptions) are saved. Null while
   * unknown/loading — the optional budget step is omitted rather than flashed.
   */
  hasLabourTargets: boolean | null;
  /**
   * Whether business basics (opening/trading days) are configured. Null while
   * unknown/loading — the optional basics step is omitted rather than flashed.
   */
  hasBusinessBasics: boolean | null;
  /**
   * Active locations in the workspace. Null while unknown/loading. Bootstrap
   * creates one, so this is normally satisfied — it is surfaced because a rota
   * week cannot exist without it.
   */
  activeLocationCount: number | null;
  /**
   * Active departments. Null while unknown/loading. Bootstrap creates one, but
   * it can be archived later, and Build the Week needs one to group demand.
   */
  activeDepartmentCount: number | null;
}

export interface DashboardSetupStep {
  id: "basics" | "location" | "department" | "team" | "budget" | "rota" | "publish";
  title: string;
  description: string;
  done: boolean;
  route: Extract<AppRoute, "/staff" | "/rota" | "/settings">;
  cta: string;
  intent?: IntentName;
  icon: LucideIcon;
  /** Marked in the panel; nothing about scheduling depends on it. */
  optional?: boolean;
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
  const {
    staffCount,
    plannedShiftCount,
    hasPublishedSnapshot,
    hasLabourTargets,
    hasBusinessBasics,
    activeLocationCount,
    activeDepartmentCount,
  } = input;
  const teamDone = staffCount > 0;
  const rotaDone = plannedShiftCount > 0;
  const publishDone = hasPublishedSnapshot;

  const steps: DashboardSetupStep[] = [
    // Optional but recommended: only offered once we know its real state, and
    // only during first-run (before any staff exist) to keep the panel focused.
    ...(hasBusinessBasics === null || teamDone
      ? []
      : [
          {
            id: "basics" as const,
            title: "Set your business basics",
            // Names the rota start day explicitly: it is the one setting that
            // locks permanently at the first rota week, and a manager who never
            // opens Settings first can only discover that too late. Done-ness
            // still tracks the trading days — nothing here records a
            // "confirmed" start day, because nothing stores one.
            description:
              "Confirm the days you trade, and check your rota start day — it locks once you build your first rota.",
            done: hasBusinessBasics,
            route: "/settings" as const,
            cta: "Open settings",
            icon: Store,
          },
        ]),
    // Location and department — see dashboardSetupStructure.
    ...buildStructureSteps(activeLocationCount, activeDepartmentCount),
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
    // Deliberately last and marked optional. Nothing about building or
    // publishing a rota needs a labour budget, and a manager who treated this
    // as a required setup step was being sent to Settings before they had
    // scheduled anyone. Only offered once we know its real state.
    ...(hasLabourTargets === null
      ? []
      : [
          {
            id: "budget" as const,
            title: "Set your labour budget",
            description: "Weekly hours budget and cost assumptions power live budget warnings.",
            done: hasLabourTargets,
            route: "/settings" as const,
            cta: "Set targets",
            icon: PiggyBank,
            optional: true,
          },
        ]),
  ];

  const mode: DashboardSetupPlan["mode"] = teamDone ? "week" : "workspace";
  // Missing structure is surfaced even in an otherwise busy workspace: without a
  // location or department the rota cannot be built, so it is not "noise".
  const structureMissing = isStructureMissing(activeLocationCount, activeDepartmentCount);
  // Only genuinely empty states show the panel; a week that is being drafted
  // (or already published) hands over to the publish card and attention rail.
  const show = !teamDone || (!rotaDone && !publishDone) || structureMissing;

  return {
    show,
    mode,
    title: mode === "workspace" ? "Set up your workspace" : "Get this week's rota ready",
    subtitle:
      mode === "workspace"
        ? "A few quick steps to your first published rota."
        : "Nothing is planned for this week yet — pick up the weekly rhythm.",
    steps,
    doneCount: steps.filter((step) => step.done).length,
    showAccessCodesHint: mode === "workspace",
  };
}
