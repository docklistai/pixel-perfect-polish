import * as React from "react";
import { DrawerShell, ActionButton, StatusBadge } from "@/components/dl";
import { Bell, Check } from "lucide-react";
import { trainingCompletionLabel } from "../lib/teamPresentation";
import { formatDateTime } from "../lib/teamFormatting";
import type { TeamTrainingReminder } from "../types";

interface Props {
  item: TeamTrainingReminder | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSendReminder: (reminderId: string) => Promise<boolean>;
  onRecordCompletion: (reminderId: string, staffMemberId: string) => Promise<boolean>;
  onSaveNote: (reminderId: string, note: string) => Promise<boolean>;
}

const SOURCE_LABEL: Record<TeamTrainingReminder["source"], string> = {
  manager_reminder: "Manager reminder",
  staff_records: "Staff records",
};

export function TeamTrainingDetailDrawer({
  item,
  pending,
  onOpenChange,
  onSendReminder,
  onRecordCompletion,
  onSaveNote,
}: Props) {
  const [note, setNote] = React.useState("");

  React.useEffect(() => setNote(item?.note ?? ""), [item]);

  if (!item) return null;

  const rows: Array<[string, string]> = [
    ["Source", SOURCE_LABEL[item.source]],
    ["Assigned to", item.audienceLabel],
    ["Due", formatDateTime(item.dueAt)],
    ["Completion", `${trainingCompletionLabel(item)} done`],
    ["Type", item.mandatory ? "Mandatory" : "Optional"],
  ];

  const outstanding = item.assignees.filter((assignee) => !assignee.completed);
  const noteChanged = note.trim() !== (item.note ?? "").trim();

  return (
    <DrawerShell
      open
      onOpenChange={onOpenChange}
      title={item.title}
      description={`${SOURCE_LABEL[item.source]} · due ${formatDateTime(item.dueAt)}`}
      meta={
        <StatusBadge tone={item.mandatory ? "danger" : "info"}>
          {item.mandatory ? "Required" : "Optional"}
        </StatusBadge>
      }
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton icon={Bell} disabled={pending} onClick={() => void onSendReminder(item.id)}>
            Send reminder
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          {rows.map(([key, value], index) => (
            <div
              key={key}
              className={`flex items-center justify-between py-1.5 ${index > 0 ? "border-t border-border" : ""}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {key}
              </span>
              <span className="text-xs font-semibold">{value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned staff ({item.assignees.length})
          </div>
          {item.assignees.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nobody is currently assigned to this reminder.
            </p>
          ) : (
            item.assignees.map((assignee) => (
              <div
                key={assignee.staffMemberId}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    assignee.completed
                      ? "bg-success-soft text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-hidden
                >
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-sm font-semibold truncate">{assignee.name}</span>
                {assignee.completed ? (
                  <span className="text-[11px] text-muted-foreground">Done</span>
                ) : (
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => void onRecordCompletion(item.id, assignee.staffMemberId)}
                  >
                    Mark done
                  </ActionButton>
                )}
              </div>
            ))
          )}
          {outstanding.length === 0 && item.assignees.length > 0 && (
            <p className="text-xs text-muted-foreground">Everyone assigned has completed this.</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="team-training-note"
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Manager note
          </label>
          <textarea
            id="team-training-note"
            rows={3}
            value={note}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note about this reminder…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <ActionButton
            variant="secondary"
            size="sm"
            disabled={pending || !note.trim() || !noteChanged}
            onClick={() => void onSaveNote(item.id, note.trim())}
          >
            Save note
          </ActionButton>
        </div>
      </div>
    </DrawerShell>
  );
}
