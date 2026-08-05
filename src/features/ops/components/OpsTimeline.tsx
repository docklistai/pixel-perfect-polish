import { Card, EmptyState } from "@/components/dl";
import type {
  OpsBriefing,
  OpsChecklistRun,
  OpsEntry,
  OpsLogTab,
  OpsPageData,
  OpsTimelineRow,
} from "../types";
import { BriefingsTab, ChecklistsTab } from "./OpsLogTabs";
import { EntryListTab } from "./OpsEntryListTab";
import { OpsLogViewTabs } from "./OpsLogViewTabs";
import { OpsTimelineEntry } from "./OpsTimelineEntry";

interface Props {
  tab: OpsLogTab;
  onTabChange: (tab: OpsLogTab) => void;
  timeline: OpsTimelineRow[];
  timelineTruncated: boolean;
  timelineEntryEventLimit: number;
  entries: OpsEntry[];
  briefings: OpsBriefing[];
  checklistRuns: OpsChecklistRun[];
  onOpenEntry: (entryId: string) => void;
  onOpenBriefing: (briefingId: string) => void;
  onOpenChecklist: (runId?: string) => void;
  onNewBriefing: () => void;
  onOpenHandover: () => void;
  onMarkDone: (entryId: string) => void;
  facets: OpsPageData["facets"];
  onClearFilter?: () => void;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  pageSize: number;
}

export function OpsTimeline(props: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <OpsLogViewTabs
        tab={props.tab}
        facets={props.facets}
        briefingCount={props.briefings.length}
        checklistCount={props.checklistRuns.length}
        onChange={props.onTabChange}
      />
      {props.tab === "timeline" && <TimelineTab {...props} />}
      {props.tab === "briefings" && (
        <BriefingsTab
          briefings={props.briefings}
          onNew={props.onNewBriefing}
          onOpen={props.onOpenBriefing}
        />
      )}
      {(props.tab === "tasks" || props.tab === "incidents") && (
        <EntryListTab
          entries={props.entries}
          emptyTitle={props.tab === "tasks" ? "No tasks to review" : "No incidents to review"}
          onOpenEntry={props.onOpenEntry}
          onClearFilter={props.onClearFilter}
          onPageChange={props.onPageChange}
          page={props.page}
          total={props.total}
          pageSize={props.pageSize}
        />
      )}
      {props.tab === "checks" && (
        <ChecklistsTab runs={props.checklistRuns} onOpen={props.onOpenChecklist} />
      )}
    </Card>
  );
}

/**
 * Today's timeline is a chronological activity feed for the selected location and local
 * calendar day. It is deliberately not paginated with the entry list: entry paging never
 * changes which handover or briefing events appear here. Only entry events are capped, so
 * the note below is the honest account of what was left out.
 */
function TimelineTab(props: Props) {
  if (props.timeline.length === 0)
    return (
      <EmptyState
        title="No activity today"
        description="Entry updates, handovers, and briefings for this location and day will appear here."
      />
    );
  return (
    <div className="p-4 sm:p-5">
      <div className="relative pl-[76px] sm:pl-[88px]">
        <div className="absolute bottom-2 top-2 w-px bg-border" style={{ left: 71 }} aria-hidden />
        {props.timeline.map((row) => (
          <OpsTimelineEntry
            key={`${row.kind}-${row.id}`}
            row={row}
            onOpen={() =>
              row.kind === "entry_event"
                ? props.onOpenEntry(row.referenceId)
                : row.kind === "briefing"
                  ? props.onOpenBriefing(row.referenceId)
                  : props.onOpenHandover()
            }
            onMarkDone={
              row.kind === "entry_event" ? () => props.onMarkDone(row.referenceId) : undefined
            }
          />
        ))}
      </div>
      {props.timelineTruncated && (
        <p className="px-1 pt-3 text-xs text-muted-foreground">
          Showing the latest {props.timelineEntryEventLimit} operational updates. Every handover and
          briefing for today is still listed.
        </p>
      )}
    </div>
  );
}
