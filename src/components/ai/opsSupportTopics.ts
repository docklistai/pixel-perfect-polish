import { ClipboardList, FilePenLine, ShieldAlert } from "lucide-react";
import type { SupportState, SupportTopic } from "./aiDrawerData";

export interface OpsSupportContext {
  state: SupportState;
  openItems: number | null;
  riskCount: number | null;
  criticalCount: number | null;
  overdueCount: number | null;
  unassignedCount: number | null;
  prioritySuggestions: Array<{
    title: string;
    priority: "low" | "normal" | "high" | "critical";
  }>;
}

export function suggestOpsPriority(
  entry: {
    dueAt: string | null;
    severity: string | null;
    assignedStaffMemberId: string | null;
    status: string;
  },
  nowMs: number,
): "low" | "normal" | "high" | "critical" {
  if (entry.status === "resolved" || entry.status === "archived") return "low";
  const dueMs = entry.dueAt ? Date.parse(entry.dueAt) : Number.POSITIVE_INFINITY;
  if (entry.severity === "critical" || dueMs < nowMs) return "critical";
  if (entry.severity === "high" || dueMs - nowMs <= 4 * 60 * 60 * 1000) return "high";
  if (!entry.assignedStaffMemberId || entry.status === "in_progress") return "normal";
  return "low";
}

export function buildOpsSupportTopics(ops: OpsSupportContext): SupportTopic[] {
  const unavailable =
    ops.state === "loading"
      ? "Live Ops data is still loading."
      : "Live Ops data is unavailable right now.";
  if (ops.state !== "ready")
    return [
      {
        id: "ops-summary",
        icon: ClipboardList,
        label: "Operational summary",
        note: `${unavailable} Open Ops to review the source records.`,
        route: "/ops",
        routeLabel: "Open Ops",
      },
    ];
  const open = ops.openItems ?? 0;
  const risks = ops.riskCount ?? 0;
  const suggestions = ops.prioritySuggestions
    .slice(0, 5)
    .map((item) => `${item.title}: ${item.priority}`)
    .join("; ");
  return [
    {
      id: "ops-summary",
      icon: ClipboardList,
      label: "Operational summary",
      note: `${open} unresolved operational item${open === 1 ? "" : "s"}; ${risks} deterministic risk${risks === 1 ? "" : "s"} currently surfaced.`,
      route: "/ops",
      routeLabel: "Open Ops",
    },
    {
      id: "ops-handover",
      icon: FilePenLine,
      label: "Handover draft for review",
      note: `Draft: ${open} unresolved item${open === 1 ? "" : "s"} to review, including ${ops.criticalCount ?? 0} critical and ${ops.overdueCount ?? 0} overdue. Select the source items in Ops before issuing.`,
      route: "/ops",
      routeLabel: "Review handover",
    },
    {
      id: "ops-rules",
      icon: ShieldAlert,
      label: "How Ops risk and priority work",
      note: `Risk rules flag critical incidents, passed due times, unassigned high-priority items, uncovered published shifts, unacknowledged handovers, and incomplete checklists. Priority suggestions use only due time, severity, assignment, and status; ${ops.unassignedCount ?? 0} unassigned priority item${ops.unassignedCount === 1 ? "" : "s"} currently need review.`,
      route: "/ops",
      routeLabel: "Review source items",
    },
    {
      id: "ops-priority",
      icon: ShieldAlert,
      label: "Per-item priority suggestions",
      note: suggestions || "No unresolved items are available for a priority suggestion.",
      route: "/ops",
      routeLabel: "Review source items",
    },
  ];
}
