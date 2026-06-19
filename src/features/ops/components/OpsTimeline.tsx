import * as React from "react";
import { Check, ChevronDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/dl";
import type { OpsEntry, OpsLogTab } from "../types";
import { BriefingsTab, ChecklistsTab, EntryListTab } from "./OpsLogTabs";
import { OpsTimelineEntry } from "./OpsTimelineEntry";

const SORT_OPTIONS = ["Time (newest)", "Time (oldest)", "Priority", "Status"];

const tabs: Array<{
  id: OpsLogTab;
  label: string;
  count?: number;
  tone?: Tone;
}> = [
  { id: "timeline", label: "Today's timeline" },
  { id: "briefings", label: "Briefings", count: 2, tone: "purple" },
  { id: "tasks", label: "Tasks", count: 6, tone: "info" },
  { id: "incidents", label: "Incidents", count: 5, tone: "warning" },
  { id: "checks", label: "Checklists", count: 4, tone: "muted" },
];

interface OpsTimelineProps {
  entries: OpsEntry[];
  onOpenEntry: (entry: OpsEntry) => void;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenLogEntry: () => void;
}

export function OpsTimeline({
  entries,
  onOpenEntry,
  onMarkDone,
  onDelete,
  onOpenLogEntry,
}: OpsTimelineProps) {
  const [tab, setTab] = React.useState<OpsLogTab>("timeline");
  const [sortBy, setSortBy] = React.useState(SORT_OPTIONS[0]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-4 pt-2">
        <div className="tabs min-w-max border-b-0">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn("tab", tab === item.id && "active")}
              onClick={() => setTab(item.id)}
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
        <div className="ml-auto hidden shrink-0 pb-2 sm:block">
          <RowActionMenu
            triggerLabel="Sort operational log"
            trigger={
              <button type="button" className="btn ghost sm">
                Sort <ChevronDown className="size-3" aria-hidden />
              </button>
            }
            items={[
              { kind: "label", text: "Sort by" },
              ...SORT_OPTIONS.map((option) => ({
                label: option,
                icon: sortBy === option ? Check : undefined,
                onSelect: () => setSortBy(option),
              })),
            ]}
          />
        </div>
      </div>

      {tab === "timeline" && (
        <TimelineTab
          entries={entries}
          onOpenEntry={onOpenEntry}
          onMarkDone={onMarkDone}
          onDelete={onDelete}
        />
      )}
      {tab === "briefings" && <BriefingsTab onNew={onOpenLogEntry} />}
      {tab === "tasks" && (
        <EntryListTab
          entries={entries.filter((entry) => entry.icon !== FileText && entry.dot !== "danger")}
          emptyTitle="No tasks to review"
          onOpenEntry={onOpenEntry}
          onMarkDone={onMarkDone}
        />
      )}
      {tab === "incidents" && (
        <EntryListTab
          entries={entries.filter(
            (entry) => entry.dot === "danger" || entry.dot === "warning" || entry.icon === FileText,
          )}
          emptyTitle="No incidents to review"
          onOpenEntry={onOpenEntry}
          onMarkDone={onMarkDone}
        />
      )}
      {tab === "checks" && <ChecklistsTab />}
    </Card>
  );
}

function TimelineTab({
  entries,
  onOpenEntry,
  onMarkDone,
  onDelete,
}: Omit<OpsTimelineProps, "onOpenLogEntry">) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Today's operations timeline will appear here."
      />
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="relative pl-[76px] sm:pl-[88px]">
        <div className="absolute bottom-2 top-2 w-px bg-border" style={{ left: 71 }} aria-hidden />
        {entries.map((entry) => (
          <div key={entry.id} className="relative mb-3">
            <div className="absolute -left-[76px] top-3.5 w-[48px] text-right text-xs font-semibold text-muted-foreground sm:-left-[88px] sm:w-[60px]">
              {entry.t}
            </div>
            <div
              className="absolute -left-[11px] top-3.5 size-3 rounded-full border-[3px] bg-card"
              style={{
                borderColor: entry.highlight ? "var(--red-500)" : "var(--teal-500)",
              }}
              aria-hidden
            />
            <OpsTimelineEntry
              entry={entry}
              onOpen={() => onOpenEntry(entry)}
              onMarkDone={() => onMarkDone(entry.id)}
              onDelete={() => onDelete(entry.id)}
            />
          </div>
        ))}
      </div>
      <div className="pt-1 text-center">
        <button
          type="button"
          className="link text-sm"
          onClick={() =>
            toast.info("Timeline", { description: "You're viewing the full log for today" })
          }
        >
          View earlier entries <ChevronDown className="size-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}
