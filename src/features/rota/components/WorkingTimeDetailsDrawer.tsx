import { AlertTriangle } from "lucide-react";
import { ActionButton, DetailRow, DrawerShell, FormSection, StatusBadge } from "@/components/dl";
import type { WorkingTimeAlert } from "../types";

export function WorkingTimeDetailsDrawer({
  open,
  onOpenChange,
  alerts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: WorkingTimeAlert[];
}) {
  const meta =
    alerts.length > 0 ? (
      <StatusBadge tone="warning">Needs review</StatusBadge>
    ) : (
      <StatusBadge tone="success">All within plan</StatusBadge>
    );

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Scheduled days review"
      description="Staff scheduled above their planned weekly days. This is a day-pattern check, not full working-time or rest-break enforcement."
      meta={meta}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title={alerts.length === 1 ? "Issue" : "Issues"}>
        {alerts.length > 0 ? (
          <div className="rounded-xl border border-warning/30 bg-warning-soft px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
              {alerts.length} scheduled above plan
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {alerts.map((alert) => (
                <li key={alert.staffId}>
                  {alert.staffName} · scheduled {alert.scheduledDays} of 7 days
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No staff are scheduled above their planned weekly days.
          </p>
        )}
      </FormSection>

      <FormSection title="Why it matters">
        <dl className="divide-y divide-border">
          <DetailRow label="Signal" value="More days scheduled than planned" />
          <DetailRow label="Likely action" value="Move or shorten a shift" />
          <DetailRow label="Resolves with" value="Reassigning or removing extra days" />
        </dl>
      </FormSection>
    </DrawerShell>
  );
}
