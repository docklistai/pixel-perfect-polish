import { StatusBadge, type Tone } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { OpsLogTab, OpsPageData } from "../types";

export function OpsLogViewTabs(props: {
  tab: OpsLogTab;
  facets: OpsPageData["facets"];
  briefingCount: number;
  checklistCount: number;
  onChange: (tab: OpsLogTab) => void;
}) {
  const tabs: Array<{ id: OpsLogTab; label: string; count?: number; tone?: Tone }> = [
    { id: "timeline", label: "Today's timeline" },
    { id: "briefings", label: "Briefings", count: props.briefingCount, tone: "purple" },
    { id: "tasks", label: "Tasks", count: props.facets.tasks, tone: "info" },
    { id: "incidents", label: "Incidents", count: props.facets.incidents, tone: "warning" },
    { id: "checks", label: "Checklists", count: props.checklistCount, tone: "muted" },
  ];
  return (
    <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain border-b border-border px-4 pb-1 pt-2">
      <div
        className="dl-tabs min-w-max border-b-0"
        role="tablist"
        aria-label="Operational log views"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={props.tab === item.id}
            className={cn("dl-tab", props.tab === item.id && "active")}
            onClick={() => props.onChange(item.id)}
          >
            {item.label}
            {item.count !== undefined && (
              <StatusBadge tone={item.tone} className="ml-1.5">
                {item.count}
              </StatusBadge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
