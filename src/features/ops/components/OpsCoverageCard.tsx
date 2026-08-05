import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/dl";
import type { OpsDepartment, OpsMetrics, OpsStaffOption } from "../types";

export function OpsCoverageCard(props: {
  metrics: OpsMetrics;
  departments: OpsDepartment[];
  staff: OpsStaffOption[];
}) {
  const navigate = useNavigate();
  const total = props.metrics.onShift + props.metrics.uncoveredShifts;
  const coverage = total === 0 ? 100 : Math.round((props.metrics.onShift / total) * 100);
  const counts = props.departments
    .map((department) => ({
      ...department,
      count: props.staff.filter((staff) => staff.onShift && staff.departmentId === department.id)
        .length,
    }))
    .filter((department) => department.count > 0);
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold">On shift now</h2>
      <div className="mt-3 flex items-end gap-4">
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight">
            {props.metrics.onShift}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Published rota staff</div>
        </div>
        <CoverageRing percentage={coverage} />
        <div>
          <div className="text-sm font-semibold text-success">{coverage}%</div>
          <div className="text-[11px] text-muted-foreground">Coverage</div>
        </div>
      </div>
      <div className="my-3 h-px bg-border" />
      <div className="space-y-1">
        {counts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No staff currently on shift.</p>
        ) : (
          counts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate({ to: "/rota" })}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs hover:bg-muted/40"
            >
              <span className="size-1.5 rounded-full bg-brand" />
              <span className="min-w-0 flex-1">{item.name}</span>
              <strong>{item.count}</strong>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

function CoverageRing({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 20;
  const dash = (percentage / 100) * circumference;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label={`${percentage}% coverage`}>
      <circle cx="26" cy="26" r="20" stroke="var(--border)" strokeWidth="5" fill="none" />
      <circle
        cx="26"
        cy="26"
        r="20"
        stroke="var(--teal-500)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink-900)">
        {percentage}%
      </text>
    </svg>
  );
}
