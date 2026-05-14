import { Card } from "@/components/dl";
import type { RoleCoverageSummary } from "../types";

export function RoleCoverageCard({ roleCoverage }: { roleCoverage: RoleCoverageSummary[] }) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Role days covered</div>
        <span className="text-xs text-muted-foreground">Assigned days</span>
      </div>
      <div className="space-y-3">
        {roleCoverage.slice(0, 5).map((row) => (
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
    </Card>
  );
}
