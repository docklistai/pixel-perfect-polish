import { CheckCircle2, ExternalLink, FileText, MoreHorizontal, Send } from "lucide-react";
import { IconButton, StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import type { OpsTimelineRow } from "../types";
import { ENTRY_TYPE_ICON, PRIORITY_TONE, formatOpsTime } from "../lib/opsPresentation";

export function OpsTimelineEntry(props: {
  row: OpsTimelineRow;
  onOpen: () => void;
  onMarkDone?: () => void;
}) {
  const { row } = props;
  const Icon =
    row.kind === "handover"
      ? Send
      : row.kind === "briefing"
        ? FileText
        : ENTRY_TYPE_ICON[row.entryType ?? "note"];
  const canResolve = row.kind === "entry_event" && !["resolved", "archived"].includes(row.status);
  return (
    <div className="relative mb-3">
      <time
        dateTime={row.occurredAt}
        className="absolute -left-[76px] top-3.5 w-[48px] text-right text-xs font-semibold text-muted-foreground sm:-left-[88px] sm:w-[60px]"
      >
        {formatOpsTime(row.occurredAt)}
      </time>
      <span
        className="absolute -left-[11px] top-3.5 size-3 rounded-full border-[3px] border-brand bg-card"
        aria-hidden
      />
      <div className="flex w-full min-w-0 items-center gap-2 rounded-[10px] border border-border p-3 transition-colors hover:bg-muted/40">
        <button
          type="button"
          onClick={props.onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-info-soft text-info">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{row.title}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {row.summary} · {row.locationName}
            </span>
          </span>
          <StatusBadge tone={PRIORITY_TONE[row.priority]} className="hidden sm:inline-flex">
            {row.priority}
          </StatusBadge>
          <span className="hidden text-[11px] text-muted-foreground md:block">{row.actorName}</span>
          <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
        <RowActionMenu
          triggerLabel={`Actions for ${row.title}`}
          trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${row.title}`} />}
          items={[
            { label: "Open", icon: ExternalLink, onSelect: props.onOpen },
            ...(canResolve && props.onMarkDone
              ? [
                  {
                    label: "Mark done",
                    icon: CheckCircle2,
                    onSelect: props.onMarkDone,
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
}
