import { ActionButton, DetailRow, DrawerShell, FormSection, StatusBadge } from "@/components/dl";
import type { RoleCoverageSummary } from "../types";

export function CoverageDetailsDrawer({
  open,
  onOpenChange,
  staffCount,
  openShiftCount,
  conflictCount,
  roleCoverage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffCount: number;
  openShiftCount: number;
  conflictCount: number;
  roleCoverage: RoleCoverageSummary[];
}) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Coverage details"
      description="Scheduling health for the current visible rota."
      meta={<StatusBadge tone="success">98% coverage</StatusBadge>}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title="Week summary">
        <dl className="divide-y divide-border">
          <DetailRow label="Visible staff" value={`${staffCount}`} />
          <DetailRow label="Scheduled hours" value="802h" />
          <DetailRow label="Hours target" value="820h" />
          <DetailRow label="Open shifts" value={`${openShiftCount}`} />
          <DetailRow label="Conflicts" value={`${conflictCount}`} />
        </dl>
      </FormSection>

      <FormSection title="Role coverage">
        <div className="space-y-3">
          {roleCoverage.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="text-muted-foreground">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    row.pct >= 85 ? "bg-success" : row.pct >= 70 ? "bg-warning" : "bg-danger"
                  }`}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </FormSection>
    </DrawerShell>
  );
}
