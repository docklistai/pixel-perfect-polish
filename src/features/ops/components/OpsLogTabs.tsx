import { FileText, Plus } from "lucide-react";
import { ActionButton, EmptyState, StatusBadge } from "@/components/dl";
import type { OpsBriefing, OpsChecklistRun } from "../types";
import { formatOpsDateTime } from "../lib/opsPresentation";

export function BriefingsTab({
  briefings,
  onNew,
  onOpen,
}: {
  briefings: OpsBriefing[];
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center border-b border-border px-4 py-2.5">
        <ActionButton size="sm" icon={Plus} onClick={onNew}>
          New briefing
        </ActionButton>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Manager operational briefings
        </span>
      </div>
      {briefings.length === 0 ? (
        <EmptyState
          title="No briefings yet"
          description="Create a retained manager-to-manager operational briefing."
        />
      ) : (
        briefings.map((briefing) => (
          <button
            key={briefing.id}
            type="button"
            onClick={() => onOpen(briefing.id)}
            className="flex w-full gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted/40"
          >
            <FileText className="mt-0.5 size-4 text-purple" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{briefing.title}</span>
              <span className="block line-clamp-2 text-xs text-muted-foreground">
                {briefing.summary}
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {briefing.authorName} · {briefing.locationName} ·{" "}
                {formatOpsDateTime(briefing.createdAt)}
              </span>
            </span>
            <StatusBadge tone="purple">
              {briefing.recipients.filter((recipient) => recipient.acknowledgedAt).length}/
              {briefing.recipients.length} ack
            </StatusBadge>
          </button>
        ))
      )}
    </div>
  );
}

export function ChecklistsTab({
  runs,
  onOpen,
}: {
  runs: OpsChecklistRun[];
  onOpen: (id?: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center border-b border-border px-4 py-2.5">
        <ActionButton size="sm" icon={Plus} onClick={() => onOpen()}>
          Start or manage checklist
        </ActionButton>
      </div>
      {runs.length === 0 ? (
        <EmptyState
          title="No checklist runs"
          description="Start a reusable checklist manually when work begins."
        />
      ) : (
        runs.map((run) => {
          const done = run.items.filter((item) => item.state !== "pending").length;
          return (
            <button
              key={run.id}
              type="button"
              onClick={() => onOpen(run.id)}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{run.templateName}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {run.locationName} · {done}/{run.items.length} items
                </span>
              </span>
              <StatusBadge
                tone={
                  run.status === "reviewed"
                    ? "success"
                    : run.status === "completed"
                      ? "warning"
                      : "muted"
                }
              >
                {run.status}
              </StatusBadge>
            </button>
          );
        })
      )}
    </div>
  );
}
