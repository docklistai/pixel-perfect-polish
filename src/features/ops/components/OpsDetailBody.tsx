import * as React from "react";
import { ActionButton, StatusBadge } from "@/components/dl";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Globe, Plus, User } from "lucide-react";
import { toast } from "sonner";
import type { OpsEntry, OpsEntryDetails, OpsFollowUpItem } from "../types";

interface OpsDetailBodyProps {
  entry: OpsEntry;
  details: OpsEntryDetails;
}

/** Drawer body for an ops entry: header, details, follow-ups, comment. Mount with key={entry.id}. */
export function OpsDetailBody({ entry, details }: OpsDetailBodyProps) {
  const [followups, setFollowups] = React.useState<OpsFollowUpItem[]>(details.followups);
  const [comment, setComment] = React.useState("");

  const priorityTone = entry.prioTone === "danger" ? "danger" : "warning";
  const doneCount = followups.filter((f) => f.done).length;

  const handleToggleFollowUp = (index: number) => {
    const next = [...followups];
    next[index] = { ...next[index], done: !next[index].done };
    setFollowups(next);
  };

  const handleSaveComment = () => {
    if (!comment.trim()) return;
    toast.success("Update saved", { description: "Audit log updated" });
    setComment("");
  };

  return (
    <div className="space-y-4">
      {/* Entry header */}
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-xl ${
            entry.dot === "danger"
              ? "bg-danger-soft text-danger"
              : entry.stTone === "success"
                ? "bg-success-soft text-success"
                : "bg-info-soft text-info"
          }`}
        >
          {entry.dot === "danger" ? (
            <AlertTriangle className="h-5 w-5" />
          ) : entry.stTone === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">{entry.title}</div>
          <div className="text-xs text-muted-foreground">{entry.area}</div>
          <div className="flex gap-2 mt-1.5">
            <StatusBadge
              tone={
                entry.stTone === "success"
                  ? "success"
                  : entry.stTone === "info"
                    ? "info"
                    : "warning"
              }
            >
              {entry.st}
            </StatusBadge>
            {entry.prio && <StatusBadge tone={priorityTone}>{entry.prio} priority</StatusBadge>}
            {details.severity && (
              <StatusBadge tone={details.severity === "High" ? "danger" : "warning"}>
                {details.severity} severity
              </StatusBadge>
            )}
          </div>
        </div>
      </div>

      {/* Details card with nested manager notes, per prototype */}
      <div className="card p-4 space-y-3 bg-muted/20 border border-border rounded-xl">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </div>
        <div className="text-sm leading-relaxed text-foreground/90">{details.description}</div>
        <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {details.location}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {entry.who?.n ?? entry.by ?? "Team"}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Logged {entry.t}
          </span>
        </div>
        {details.notes && (
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <div className="text-xs text-muted-foreground mb-1">Manager notes</div>
            <div className="text-sm leading-relaxed text-foreground/80">{details.notes}</div>
          </div>
        )}
      </div>

      {/* Follow-up tasks */}
      <div className="card p-4 space-y-3 bg-muted/20 border border-border rounded-xl">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Follow-up tasks
          </div>
          {followups.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              {doneCount} of {followups.length} done
            </span>
          )}
        </div>

        {followups.length > 0 ? (
          <div className="space-y-2">
            {followups.map((f, i) => (
              <label
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer bg-card border border-border/60 hover:bg-muted/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={f.done}
                  onChange={() => handleToggleFollowUp(i)}
                  className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                />
                <span
                  className={`text-sm select-none ${f.done ? "line-through text-muted-foreground/60" : "text-foreground"}`}
                >
                  {f.title}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic py-1">No pending follow-ups.</div>
        )}

        <ActionButton
          variant="ghost"
          size="sm"
          icon={Plus}
          onClick={() => toast.info("Added", { description: "Follow-up added to the queue" })}
        >
          Add task
        </ActionButton>
      </div>

      {/* Add comment */}
      <div className="space-y-2 pt-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Add a comment
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="textarea w-full resize-none"
          placeholder="Add an update for managers reviewing this entry…"
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">Visible to managers only</span>
          <ActionButton size="sm" onClick={handleSaveComment} disabled={!comment.trim()}>
            Save update
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
