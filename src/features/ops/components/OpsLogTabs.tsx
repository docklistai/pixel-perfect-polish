import { FileText, Plus } from "lucide-react";
import { ActionButton, EmptyState, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import { opsBriefings, opsChecklists } from "../data/opsDemoData";
import { notifyOpsPreview } from "../lib/opsPreview";
import type { OpsEntry } from "../types";

export function BriefingsTab({ onNew }: { onNew: () => void }) {
  return (
    <div>
      <div className="flex items-center border-b border-border px-4 py-2.5">
        <ActionButton size="sm" icon={Plus} onClick={onNew}>
          New briefing
        </ActionButton>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Internal shift and handover briefings
        </span>
      </div>
      {opsBriefings.map((briefing) => (
        <button
          key={briefing.title}
          type="button"
          onClick={() => notifyOpsPreview("Opening briefings")}
          className="flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left transition-colors hover:bg-muted/40"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-purple-soft text-accent-purple">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{briefing.title}</span>
            <span className="block text-xs text-muted-foreground">{briefing.by}</span>
            <span className="mt-2 block text-xs text-muted-foreground">{briefing.body}</span>
          </span>
          <StatusBadge tone={briefing.tone}>Read {briefing.read}</StatusBadge>
        </button>
      ))}
    </div>
  );
}

export function EntryListTab({
  entries,
  emptyTitle,
  onOpenEntry,
  onMarkDone,
}: {
  entries: OpsEntry[];
  emptyTitle: string;
  onOpenEntry: (entry: OpsEntry) => void;
  onMarkDone: (id: string) => void;
}) {
  if (entries.length === 0) {
    return <EmptyState title={emptyTitle} description="Nothing needs attention in this view." />;
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => (
        <div
          key={entry.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpenEntry(entry)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenEntry(entry);
            }
          }}
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{entry.title}</span>
            <span className="block text-[11px] text-muted-foreground">{entry.area}</span>
          </span>
          {entry.prio && (
            <StatusBadge tone={entry.prioTone === "danger" ? "danger" : "warning"}>
              {entry.prio}
            </StatusBadge>
          )}
          <StatusBadge tone={entry.stTone === "success" ? "success" : "warning"}>
            {entry.st}
          </StatusBadge>
          {entry.st !== "Done" && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={(event) => {
                event.stopPropagation();
                onMarkDone(entry.id);
              }}
            >
              Mark done
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function ChecklistsTab() {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {opsChecklists.map((checklist) => (
        <button
          key={checklist.name}
          type="button"
          onClick={() => notifyOpsPreview("Opening checklists")}
          className="rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{checklist.name}</span>
            <StatusBadge tone={checklist.tone}>{checklist.status}</StatusBadge>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                checklist.tone === "success"
                  ? "bg-success"
                  : checklist.tone === "warning"
                    ? "bg-warning"
                    : "bg-muted-foreground/30",
              )}
              style={{ width: `${checklist.progress}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {checklist.progress}% complete
          </div>
        </button>
      ))}
    </div>
  );
}
