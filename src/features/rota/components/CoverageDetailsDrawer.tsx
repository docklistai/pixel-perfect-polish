import { ActionButton, DetailRow, DrawerShell, FormSection, StatusBadge } from "@/components/dl";
import type { RoleCoverageSummary } from "../types";

export function CoverageDetailsDrawer({
  open,
  onOpenChange,
  staffCount,
  openShiftCount,
  conflictCount,
  coveragePct,
  roleCoverage,
  plannedShiftCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffCount: number;
  openShiftCount: number;
  conflictCount: number;
  coveragePct: number;
  roleCoverage: RoleCoverageSummary[];
  plannedShiftCount?: number;
}) {
  const isZeroPlanned =
    plannedShiftCount === 0 ||
    (coveragePct === 0 &&
      openShiftCount === 0 &&
      roleCoverage.every((r) => r.value === "No shifts planned"));

  const assignedCount =
    plannedShiftCount !== undefined ? Math.max(0, plannedShiftCount - openShiftCount) : null;

  const statusTone = isZeroPlanned ? "muted" : openShiftCount > 0 ? "warning" : "success";

  const statusLabel = isZeroPlanned
    ? "No shifts planned"
    : openShiftCount > 0
      ? `${openShiftCount} open shift${openShiftCount === 1 ? "" : "s"}`
      : "All shifts assigned";

  const assignmentSummary = isZeroPlanned
    ? "No shifts planned"
    : assignedCount !== null && plannedShiftCount !== undefined
      ? `${assignedCount} of ${plannedShiftCount} assigned`
      : `${coveragePct}%`;

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Shift assignment details"
      description="Scheduling status for the current visible rota."
      meta={<StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title="Week summary">
        <dl className="divide-y divide-border">
          <DetailRow label="Visible staff" value={`${staffCount}`} />
          <DetailRow label="Shift assignment" value={assignmentSummary} />
          <DetailRow label="Open shifts" value={`${openShiftCount}`} />
          <DetailRow label="Conflicts" value={`${conflictCount}`} />
        </dl>
      </FormSection>

      <FormSection title="Role assignment">
        <div className="space-y-3">
          {roleCoverage.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="text-muted-foreground">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Role bars show assigned shifts relative to planned shifts for that role.
        </p>
      </FormSection>
    </DrawerShell>
  );
}
