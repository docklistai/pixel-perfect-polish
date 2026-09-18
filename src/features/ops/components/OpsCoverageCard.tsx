import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/dl";
import type { OpsDepartment, OpsMetrics, OpsStaffOption } from "../types";

export function OpsCoverageCard(props: {
  metrics: OpsMetrics;
  departments: OpsDepartment[];
  staff: OpsStaffOption[];
}) {
  const navigate = useNavigate();
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
      <div className="mt-3 flex items-end gap-6">
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight">
            {props.metrics.onShift}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Staff on shift now</div>
        </div>
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight text-muted-foreground">
            {props.metrics.uncoveredShifts}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Open published shifts</div>
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
