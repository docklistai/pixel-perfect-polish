import { Card, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import type {
  OpsBriefing,
  OpsChecklistRun,
  OpsDepartment,
  OpsMetrics,
  OpsStaffOption,
} from "../types";
import { OpsCoverageCard } from "./OpsCoverageCard";

interface Props {
  metrics: OpsMetrics;
  departments: OpsDepartment[];
  staff: OpsStaffOption[];
  briefings: OpsBriefing[];
  checklistRuns: OpsChecklistRun[];
  onOpenBriefing: (id: string) => void;
  onOpenChecklist: (id?: string) => void;
}

export function OpsRightRail(props: Props) {
  const todayBriefings = props.briefings.filter((briefing) => briefing.isToday);
  const todayRuns = props.checklistRuns.filter((run) => run.isToday);
  return (
    <aside className="space-y-3">
      <OpsCoverageCard
        metrics={props.metrics}
        departments={props.departments}
        staff={props.staff}
      />
      <Card className="overflow-hidden p-0">
        <div className="flex items-center px-4 py-3">
          <h2 className="text-sm font-semibold">Today&apos;s briefings</h2>
          <StatusBadge tone="purple" className="ml-auto">
            {props.metrics.briefingsToday} posted
          </StatusBadge>
        </div>
        {todayBriefings.slice(0, 3).map((briefing) => (
          <button
            key={briefing.id}
            type="button"
            onClick={() => props.onOpenBriefing(briefing.id)}
            className="w-full border-t border-border px-4 py-3 text-left hover:bg-muted/40"
          >
            <div className="text-xs font-semibold">{briefing.title}</div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
              {briefing.summary}
            </p>
            <StatusBadge tone="purple" className="mt-2">
              {briefing.recipients.filter((r) => r.readAt).length}/{briefing.recipients.length} read
            </StatusBadge>
          </button>
        ))}
        {todayBriefings.length === 0 && (
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            No briefing authored today.
          </p>
        )}
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Checklists</h2>
        <div className="space-y-3">
          {todayRuns.slice(0, 4).map((run) => {
            const progress = run.items.length
              ? Math.round(
                  (run.items.filter((i) => i.state !== "pending").length / run.items.length) * 100,
                )
              : 0;
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => props.onOpenChecklist(run.id)}
                className="block w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {run.templateName}
                  </span>
                  <StatusBadge tone={run.status === "reviewed" ? "success" : "warning"}>
                    {run.status}
                  </StatusBadge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      run.status === "reviewed" ? "bg-success" : "bg-warning",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </button>
            );
          })}
          {todayRuns.length === 0 && (
            <p className="text-xs text-muted-foreground">No checklist runs yet.</p>
          )}
        </div>
      </Card>
    </aside>
  );
}
