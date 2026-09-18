import { ActionButton, DetailRow, DrawerShell, FormSection, StatusBadge } from "@/components/dl";
import type { RoleCoverageSummary } from "../types";

export function CoverageDetailsDrawer({
  open,
  onOpenChange,
  staffCount,
  openShiftCount,
  conflictCount,
  roleCoverage,
  plannedShiftCount,
  assignedShiftCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffCount: number;
  openShiftCount: number;
  conflictCount: number;
  roleCoverage: RoleCoverageSummary[];
  plannedShiftCount?: number;
  assignedShiftCount?: number;
}) {
  const planned =
    plannedShiftCount ??
    (assignedShiftCount !== undefined
      ? assignedShiftCount + openShiftCount
      : roleCoverage.every((r) => r.value === "No shifts planned")
        ? 0
        : openShiftCount);
  const assigned = assignedShiftCount ?? Math.max(0, planned - openShiftCount);
  const isZeroPlanned =
    planned === 0 ||
    (openShiftCount === 0 && roleCoverage.every((r) => r.value === "No shifts planned"));

  const statusTone = isZeroPlanned ? "muted" : openShiftCount > 0 ? "warning" : "success";

  const statusLabel = isZeroPlanned
    ? "No shifts planned"
    : openShiftCount > 0
      ? `${openShiftCount} open shift${openShiftCount === 1 ? "" : "s"}`
      : "All shifts assigned";

  const assignmentSummary = isZeroPlanned
    ? "No shifts planned"
    : openShiftCount > 0
      ? `${assigned} of ${planned} assigned · ${openShiftCount} open`
      : `${assigned} of ${planned} assigned`;

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
        <div className="divide-y divide-border">
          {roleCoverage.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-2 text-xs">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="text-muted-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      </FormSection>
    </DrawerShell>
  );
}
