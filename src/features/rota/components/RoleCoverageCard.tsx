import { Card } from "@/components/dl";
import type { RoleCoverageSummary } from "../types";

export function RoleCoverageCard({ roleCoverage }: { roleCoverage: RoleCoverageSummary[] }) {
  return (
    <Card className="rota-role-coverage p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Role coverage</div>
        <span className="text-xs text-muted-foreground">This week</span>
      </div>
      <div>
        {roleCoverage.slice(0, 5).map((row) => {
          const state = row.pct >= 85 ? "ok" : row.pct >= 70 ? "under" : "over";
          return (
            <div key={row.label} className={`role-row ${state}`}>
              <span className="role-name truncate font-medium">{row.label}</span>
              <div className="role-bar">
                <i aria-hidden style={{ width: `${row.pct}%` }} />
              </div>
              <span className="role-val font-mono tabular-nums">{row.value}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
