import { AlertTriangle, Bell, Calendar, CheckCircle2, Edit3, ExternalLink, X } from "lucide-react";
import { StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { cn } from "@/lib/utils";
import type { StoredTimesheetRow, TimesheetStatus } from "../types";

const cellTone: Record<string, string> = {
  warning: "text-warning",
  danger: "text-danger",
};

const statusBadge: Record<
  TimesheetStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  approved: { label: "Approved", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  unapproved: { label: "Unapproved", tone: "danger" },
};

interface Props {
  row: StoredTimesheetRow;
  status: TimesheetStatus;
  flagged: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onReview: (row: StoredTimesheetRow) => void;
  onAdjust: (row: StoredTimesheetRow) => void;
  onToggleApprove: (row: StoredTimesheetRow) => void;
  onToggleFlag: (row: StoredTimesheetRow) => void;
  onPrepareReminder: (name: string) => void;
  onViewRota: () => void;
}

export function TimesheetRow({
  row,
  status,
  flagged,
  selected,
  onToggleSelect,
  onReview,
  onAdjust,
  onToggleApprove,
  onToggleFlag,
  onPrepareReminder,
  onViewRota,
}: Props) {
  const badge = statusBadge[status];
  return (
    <tr
      tabIndex={0}
      aria-label={`${row.n}, ${badge.label}. Press Enter to open the entry`}
      className={cn(
        selected && "selected",
        row.exc === "Missing in" || status === "unapproved"
          ? "row-error"
          : row.exc !== "—"
            ? "row-warn"
            : "",
        flagged && "row-flagged",
      )}
      onClick={() => onReview(row)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onReview(row);
        }
      }}
    >
      <td onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(row.id)}
          aria-label={`Select timesheet for ${row.n}`}
        />
      </td>
      <td>
        <div className="flex items-center gap-3">
          <img
            src={`https://i.pravatar.cc/64?img=${row.img}`}
            className="h-7 w-7 rounded-full object-cover"
            alt=""
          />
          <div>
            <div className="text-sm font-medium">{row.n}</div>
            <div className="text-[11px] text-muted-foreground">
              {row.role}
              {row.workDate ? ` · ${row.workDate}` : ""}
            </div>
          </div>
        </div>
      </td>
      <td className="font-mono text-sm">{row.sched}</td>
      <td>
        <div className="font-mono text-sm font-semibold">{row.in}</div>
        <div
          className={cn("text-[11px]", row.inTone ? cellTone[row.inTone] : "text-muted-foreground")}
        >
          {row.inN}
        </div>
      </td>
      <td>
        <div className="font-mono text-sm font-semibold">{row.out}</div>
        <div
          className={cn(
            "text-[11px]",
            row.outTone ? cellTone[row.outTone] : "text-muted-foreground",
          )}
        >
          {row.outN}
        </div>
      </td>
      <td className="font-mono text-sm">{row.brk}</td>
      <td className="font-mono text-sm font-semibold">{row.paid}</td>
      <td>
        {row.exc === "—" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <StatusBadge tone={row.excTone === "danger" ? "danger" : "warning"}>
            {row.exc}
          </StatusBadge>
        )}
      </td>
      <td>
        <span className="inline-flex flex-wrap items-center gap-1">
          <StatusBadge tone={badge.tone} dot={status === "pending"}>
            {badge.label}
          </StatusBadge>
          {flagged && <StatusBadge tone="info">Flagged</StatusBadge>}
        </span>
      </td>
      <td className="text-right" onClick={(event) => event.stopPropagation()}>
        <RowActionMenu
          triggerLabel={`Actions for ${row.n}`}
          items={[
            { label: "Open entry", icon: ExternalLink, onSelect: () => onReview(row) },
            { label: "Adjust", icon: Edit3, onSelect: () => onAdjust(row) },
            {
              label: status === "approved" ? "Revert approval" : "Approve",
              icon: status === "approved" ? X : CheckCircle2,
              onSelect: () => onToggleApprove(row),
            },
            {
              label: flagged ? "Remove flag" : "Flag for review",
              icon: AlertTriangle,
              onSelect: () => onToggleFlag(row),
            },
            { kind: "separator" },
            {
              label: "Prepare reminder",
              icon: Bell,
              onSelect: () => onPrepareReminder(row.n),
            },
            { label: "View rota", icon: Calendar, onSelect: onViewRota },
          ]}
        />
      </td>
    </tr>
  );
}
