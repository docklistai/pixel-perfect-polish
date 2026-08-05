import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { ActionButton, StatusBadge } from "@/components/dl";
import type { OpsChecklistRun } from "../types";

export function OpsChecklistRunCard(props: {
  run: OpsChecklistRun;
  pending: boolean;
  onSetItem: (
    id: string,
    state: "pending" | "done" | "exception",
    note: string | null,
  ) => Promise<boolean>;
  onReview: (id: string) => Promise<boolean>;
  onOpenEntry: (id: string) => void;
}) {
  const [exceptionId, setExceptionId] = React.useState("");
  const [note, setNote] = React.useState("");
  const saveException = async () => {
    if (exceptionId && note.trim() && (await props.onSetItem(exceptionId, "exception", note))) {
      setExceptionId("");
      setNote("");
    }
  };
  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <strong className="text-sm">{props.run.templateName}</strong>
        <StatusBadge tone={props.run.status === "reviewed" ? "success" : "warning"}>
          {props.run.status}
        </StatusBadge>
        <span className="ml-auto text-xs text-muted-foreground">
          {props.run.assignedStaffName ?? "Unassigned"}
        </span>
      </div>
      {props.run.items.map((item) => (
        <React.Fragment key={item.id}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={item.state === "done"}
              disabled={props.run.status === "reviewed" || props.pending}
              onChange={() =>
                void props.onSetItem(
                  item.id,
                  item.state === "done" ? "pending" : "done",
                  item.requiresNote ? "Completed by manager" : null,
                )
              }
            />
            <span className="min-w-0 flex-1">{item.label}</span>
            {item.requiresNote && <StatusBadge tone="muted">Note required</StatusBadge>}
            {item.linkedOpsEntryId && (
              <button
                type="button"
                className="link text-xs"
                onClick={() => props.onOpenEntry(item.linkedOpsEntryId!)}
              >
                Open task
              </button>
            )}
            <button
              type="button"
              className="btn ghost sm"
              disabled={props.run.status === "reviewed"}
              onClick={() => setExceptionId(item.id)}
            >
              Exception
            </button>
          </div>
          {item.history.length > 0 && (
            <div className="border-b border-border px-3 pb-2 text-[11px] text-muted-foreground">
              Last change: {item.history.at(-1)?.resultingState} by {item.history.at(-1)?.actorName}
            </div>
          )}
        </React.Fragment>
      ))}
      {exceptionId && (
        <div className="flex gap-2 border-b border-border p-3">
          <input
            aria-label="Exception note"
            className="input min-w-0 flex-1"
            value={note}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Describe the exception"
          />
          <ActionButton size="sm" onClick={saveException}>
            Create linked task
          </ActionButton>
        </div>
      )}
      {props.run.status === "completed" && (
        <div className="flex justify-end p-3">
          <ActionButton
            icon={ShieldCheck}
            onClick={() => props.onReview(props.run.id)}
            disabled={props.pending}
          >
            Manager review
          </ActionButton>
        </div>
      )}
    </div>
  );
}
