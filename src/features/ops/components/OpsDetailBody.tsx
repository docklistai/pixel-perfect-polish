import * as React from "react";
import { MessageSquarePlus, Plus } from "lucide-react";
import { ActionButton, StatusBadge } from "@/components/dl";
import type { OpsEntry, OpsEntryDetail, OpsStaffOption, OpsStatus } from "../types";
import {
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  formatOpsDateTime,
} from "../lib/opsPresentation";
import { OpsEntryContextCard } from "./OpsEntryContextCard";

interface Props {
  entry: OpsEntry;
  detail: OpsEntryDetail | null;
  staff: OpsStaffOption[];
  pending: boolean;
  onAddNote: (note: string) => Promise<boolean>;
  onAssign: (staffId: string | null) => Promise<boolean>;
  onAddFollowUp: () => void;
  onOpenFollowUp: (id: string) => void;
  onStatus: (id: string, status: OpsStatus) => Promise<boolean>;
}

export function OpsDetailBody(props: Props) {
  const [note, setNote] = React.useState("");
  const saveNote = async () => {
    if (note.trim() && (await props.onAddNote(note))) setNote("");
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={STATUS_TONE[props.entry.status]}>
          {STATUS_LABEL[props.entry.status]}
        </StatusBadge>
        <StatusBadge tone={PRIORITY_TONE[props.entry.priority]}>
          {props.entry.priority} priority
        </StatusBadge>
        {props.entry.severity && (
          <StatusBadge
            tone={
              props.entry.severity === "critical" || props.entry.severity === "high"
                ? "danger"
                : "warning"
            }
          >
            {props.entry.severity} severity
          </StatusBadge>
        )}
      </div>
      <OpsEntryContextCard entry={props.entry} />
      <div className="card rounded-xl border border-border bg-muted/20 p-4">
        <label
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          htmlFor="ops-detail-assignee"
        >
          Assignee
        </label>
        <select
          id="ops-detail-assignee"
          className="select w-full"
          value={props.entry.assignedStaffMemberId ?? ""}
          disabled={props.pending || !["open", "in_progress"].includes(props.entry.status)}
          onChange={(e) => void props.onAssign(e.target.value || null)}
        >
          <option value="">Unassigned</option>
          {[...props.staff]
            .sort((a, b) => Number(b.onShift) - Number(a.onShift) || a.name.localeCompare(b.name))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.onShift ? " · on shift" : ""}
              </option>
            ))}
        </select>
      </div>
      <div className="card space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Follow-up tasks
          </h3>
          <ActionButton
            className="ml-auto"
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={props.onAddFollowUp}
            disabled={props.entry.parentEntryId !== null || props.entry.status === "archived"}
          >
            Add task
          </ActionButton>
        </div>
        {props.detail?.followUps.length ? (
          props.detail.followUps.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm"
                onClick={() => props.onOpenFollowUp(item.id)}
              >
                {item.title}
              </button>
              <StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusBadge>
              {item.status !== "resolved" && item.status !== "archived" && (
                <button
                  type="button"
                  className="link text-xs"
                  onClick={() => void props.onStatus(item.id, "resolved")}
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs italic text-muted-foreground">No follow-up tasks.</p>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lifecycle history
        </h3>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {props.detail?.events.map((event) => (
            <div key={event.id} className="border-l-2 border-border pl-3 text-xs">
              <div className="font-medium">
                {event.eventType.replaceAll("_", " ")} · {event.actorName}
              </div>
              {event.note && (
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{event.note}</p>
              )}
              <time className="text-[11px] text-muted-foreground">
                {formatOpsDateTime(event.occurredAt)}
              </time>
            </div>
          ))}
        </div>
      </div>
      {props.entry.status !== "archived" && (
        <div className="space-y-2 border-t border-border pt-4">
          <label
            htmlFor="ops-detail-note"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Add manager update
          </label>
          <textarea
            id="ops-detail-note"
            className="textarea w-full"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Append an immutable manager-only update…"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Append-only · managers only</span>
            <ActionButton
              size="sm"
              icon={MessageSquarePlus}
              disabled={props.pending || !note.trim()}
              onClick={saveNote}
            >
              Save update
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
