import { CheckCircle2, ExternalLink, Plus, Trash2, User } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { StaffMonogram } from "@/features/staff/components/StaffMonogram";
import { cn } from "@/lib/utils";
import type { OpsEntry } from "../types";
import { notifyOpsPreview } from "../lib/opsPreview";

export function OpsTimelineEntry({
  entry,
  onOpen,
  onMarkDone,
  onDelete,
}: {
  entry: OpsEntry;
  onOpen: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const priorityTone: Tone =
    entry.prioTone === "danger" ? "danger" : entry.prioTone === "warning" ? "warning" : "info";
  const statusTone: Tone =
    entry.stTone === "success" ? "success" : entry.stTone === "info" ? "info" : "warning";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-3 rounded-[10px] border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        entry.highlight ? "border-danger/30 bg-danger-soft/30" : "border-border",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-[10px]",
          entry.highlight
            ? "bg-danger-soft text-danger"
            : entry.stTone === "success"
              ? "bg-success-soft text-success"
              : "bg-info-soft text-info",
        )}
      >
        <entry.icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{entry.title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{entry.area}</span>
      </span>
      {entry.prio && (
        <StatusBadge tone={priorityTone} className="hidden sm:inline-flex">
          {entry.prio}
        </StatusBadge>
      )}
      <StatusBadge tone={statusTone}>{entry.st}</StatusBadge>
      {entry.who && (
        <span className="hidden md:block">
          <StaffMonogram name={entry.who.n} />
        </span>
      )}
      <div onClick={(event) => event.stopPropagation()}>
        <RowActionMenu
          triggerLabel={`Actions for ${entry.title}`}
          items={[
            { label: "Open", icon: ExternalLink, onSelect: onOpen },
            {
              label: "Reassign…",
              icon: User,
              onSelect: () => notifyOpsPreview("Reassigning entries"),
            },
            {
              label: "Add follow-up",
              icon: Plus,
              onSelect: () => notifyOpsPreview("Adding a follow-up"),
            },
            { kind: "separator" },
            { label: "Mark done", icon: CheckCircle2, onSelect: onMarkDone },
            { label: "Delete", icon: Trash2, danger: true, onSelect: onDelete },
          ]}
        />
      </div>
    </div>
  );
}
