import { AlertTriangle, CircleAlert } from "lucide-react";
import { Card, ActionButton } from "@/components/dl";

export function AlertsCard({
  openShiftCount,
  conflictCount,
  workingTimeAlertCount,
  onAddShift,
  onViewConflicts,
  onWorkingTimeAlert,
}: {
  openShiftCount: number;
  conflictCount: number;
  workingTimeAlertCount: number;
  onAddShift: () => void;
  onViewConflicts: () => void;
  onWorkingTimeAlert: () => void;
}) {
  const alerts = [
    {
      t: `${openShiftCount} Open shifts`,
      s: openShiftCount === 0 ? "All shifts assigned" : "Require staff",
      icon: AlertTriangle,
      tone: openShiftCount > 0 ? "warning" : "muted",
      action: onAddShift,
    },
    {
      t: `${conflictCount} Conflicts`,
      s: conflictCount === 0 ? "None this week" : "Need attention",
      icon: CircleAlert,
      tone: conflictCount > 0 ? "danger" : "muted",
      action: onViewConflicts,
    },
    {
      t: `${workingTimeAlertCount} Working time alert${workingTimeAlertCount === 1 ? "" : "s"}`,
      s: workingTimeAlertCount === 0 ? "Within planned hours" : "Exceeds planned hours",
      icon: AlertTriangle,
      tone: workingTimeAlertCount > 0 ? "warning" : "muted",
      action: onWorkingTimeAlert,
    },
  ] as const;

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Alerts</div>
        <span className="text-xs text-muted-foreground">({alerts.length})</span>
      </div>
      <div className="space-y-3">
        {alerts.map((a) => (
          <button
            key={a.t}
            type="button"
            onClick={a.action}
            className="flex w-full items-center gap-3 rounded-[12px] border border-border px-3 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${
                a.tone === "danger"
                  ? "bg-danger-soft text-danger"
                  : a.tone === "warning"
                    ? "bg-warning-soft text-warning"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <a.icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{a.t}</div>
              <div className="text-xs text-muted-foreground">{a.s}</div>
            </div>
            <span className="text-muted-foreground">›</span>
          </button>
        ))}
      </div>
      <ActionButton
        variant="ghost"
        size="sm"
        className="mt-3 px-0 text-xs font-semibold text-brand"
        onClick={onViewConflicts}
      >
        View conflicts
      </ActionButton>
    </Card>
  );
}
