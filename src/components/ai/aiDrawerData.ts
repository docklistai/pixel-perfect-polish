import { AlertTriangle, Plane, Clock, type LucideIcon } from "lucide-react";
import { TIME_OPERATIONAL_LOOKBACK_DAYS } from "@/features/time/lib/timeQueryRange";
import { buildOpsSupportTopics, type OpsSupportContext } from "./opsSupportTopics";

export type SupportState = "ready" | "loading" | "unavailable" | "error";

/** Counts the support drawer reasons over. `null` means a reliable live value is unavailable. */
export interface AiWorkspaceContext {
  rota: {
    state: SupportState;
    hasWeek: boolean;
    openShiftCount: number | null;
  };
  leave: {
    state: SupportState;
    pendingLeaveCount: number | null;
    approvedLeaveCount: number | null;
  };
  time: {
    state: SupportState;
    pendingTimeCount: number | null;
    approvedTimeCount: number | null;
  };
  ops?: OpsSupportContext;
}

export type SupportRoute = "/rota" | "/leave" | "/time" | "/ops";

/**
 * A single bounded manager-support topic: a fixed label, a deterministic
 * one-line review note built from live counts, and a route into a real screen.
 * No free text, no computation beyond the counts shown, no writes.
 */
export interface SupportTopic {
  id: string;
  icon: LucideIcon;
  label: string;
  note: string;
  route: SupportRoute;
  routeLabel: string;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function stateLabel(state: SupportState): string {
  switch (state) {
    case "ready":
      return "";
    case "loading":
      return "still loading";
    case "error":
      return "unavailable";
    case "unavailable":
      return "unavailable";
  }
}

function buildUnavailableNote(label: string, routeLabel: string, state: SupportState): string {
  const reviewRoute = routeLabel.replace(/^Open\s+/i, "");
  const suffix = stateLabel(state);
  return suffix
    ? `${label} counts are ${suffix} right now. Open ${reviewRoute.toLowerCase()} to review the live screen.`
    : `${label} counts are unavailable right now. Open ${reviewRoute.toLowerCase()} to review the live screen.`;
}

export function buildSupportStatusMessage(context: AiWorkspaceContext): string {
  if (
    context.rota.state === "loading" ||
    context.leave.state === "loading" ||
    context.time.state === "loading" ||
    context.ops?.state === "loading"
  ) {
    return "Live workspace counts are still loading.";
  }
  if (
    context.rota.state !== "ready" ||
    context.leave.state !== "ready" ||
    context.time.state !== "ready" ||
    (context.ops !== undefined && context.ops.state !== "ready")
  ) {
    return "One or more live counts are unavailable right now. The links below still open the live screens.";
  }
  if (!context.rota.hasWeek) {
    return "No live rota has been saved yet. Open the rota to create the first draft.";
  }
  return "Live workspace counts from the current rota, leave, and time data.";
}

/** Builds the fixed set of support topics from live workspace counts. */
export function buildSupportTopics(context: AiWorkspaceContext): SupportTopic[] {
  const rotaOpenCount = context.rota.openShiftCount;
  const pendingLeaveCount = context.leave.pendingLeaveCount;
  const approvedLeaveCount = context.leave.approvedLeaveCount;
  const pendingTimeCount = context.time.pendingTimeCount;
  const approvedTimeCount = context.time.approvedTimeCount;

  return [
    ...(context.ops ? buildOpsSupportTopics(context.ops) : []),
    {
      id: "rota-review",
      icon: AlertTriangle,
      label: "Rota review",
      note:
        context.rota.state === "ready"
          ? context.rota.hasWeek
            ? rotaOpenCount === null
              ? "Open shifts are shown on the rota. Review the live rota before publishing."
              : rotaOpenCount > 0
                ? `${plural(rotaOpenCount, "open shift")} in this week's live draft still need assignment before publishing.`
                : "No open shifts in the live rota. Review the draft before publishing."
            : "No live rota has been saved yet. Open the rota to create the first draft."
          : buildUnavailableNote("Rota", "rota", context.rota.state),
      route: "/rota",
      routeLabel: "Open rota",
    },
    {
      id: "coverage-check",
      icon: Plane,
      label: "Coverage check",
      note:
        context.leave.state === "ready"
          ? pendingLeaveCount === null || approvedLeaveCount === null
            ? "Leave counts are available on the leave page."
            : pendingLeaveCount > 0 || approvedLeaveCount > 0
              ? `${plural(pendingLeaveCount, "pending")} and ${approvedLeaveCount} approved leave request${approvedLeaveCount === 1 ? "" : "s"} to check against coverage.`
              : "No leave requests recorded. Not enough data for a coverage note."
          : buildUnavailableNote("Leave", "leave", context.leave.state),
      route: "/leave",
      routeLabel: "Open leave",
    },
    {
      id: "time-review",
      icon: Clock,
      label: "Timesheets to review",
      note:
        context.time.state === "ready"
          ? pendingTimeCount === null || approvedTimeCount === null
            ? "Time counts are available on the time page."
            : pendingTimeCount > 0
              ? `${plural(pendingTimeCount, "timesheet")} awaiting review; ${approvedTimeCount} approved in the last ${TIME_OPERATIONAL_LOOKBACK_DAYS} days.`
              : `No timesheets awaiting review; ${approvedTimeCount} approved in the last ${TIME_OPERATIONAL_LOOKBACK_DAYS} days.`
          : buildUnavailableNote("Time", "time", context.time.state),
      route: "/time",
      routeLabel: "Open time",
    },
  ];
}
