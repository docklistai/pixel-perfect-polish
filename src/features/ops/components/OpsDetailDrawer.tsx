import * as React from "react";
import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import {
  Globe,
  User,
  Clock,
  Check,
  Plus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { TimelineEntry } from "../types";

interface OpsDetailDrawerProps {
  entry: TimelineEntry | null;
  onOpenChange: (open: boolean) => void;
}

interface FollowUpItem {
  title: string;
  done: boolean;
}

const OPS_DETAILS: Record<
  string,
  {
    description: string;
    location: string;
    severity?: string;
    notes?: string;
    followups: FollowUpItem[];
  }
> = {
  "Daily briefing completed": {
    description:
      "Front of House daily briefing covered allergens, VIPs, daily specials and uniform spot-check.",
    location: "FOH back-of-house",
    notes: "All 12 FOH staff attended. Sophie ran the briefing — minutes attached.",
    followups: [
      { title: "Print updated allergen sheet for kitchen pass", done: true },
      { title: "Confirm VIP table 14 with sommelier", done: true },
    ],
  },
  "Incident report – Guest slip in lobby": {
    description:
      "Guest slipped near the entrance — wet floor sign was missing after cleaning. Guest declined first aid but agreed to a follow-up call.",
    location: "Main lobby, near reception",
    severity: "High",
    notes:
      "Floor was buffed at 09:00. Wet floor sign was misplaced during the change-over from night porter to FOH.",
    followups: [
      { title: "Call guest before 18:00 (Sophie)", done: false },
      { title: "Check insurance reference — claim number", done: false },
      { title: "Brief night porter at handover", done: true },
    ],
  },
  "Maintenance – Leaking tap": {
    description:
      "Slow drip from the basin tap in room 205. Reported by housekeeping during AM service.",
    location: "Room 205",
    severity: "Medium",
    notes: "Towel placed temporarily. Plumber scheduled for Thursday morning.",
    followups: [
      { title: "Confirm plumber arrival window", done: true },
      { title: "Move guest if not fixed by Thursday 14:00", done: false },
    ],
  },
};

const normalizeTitle = (title: string) => {
  return title
    .replace(/[\u2013\u2014-]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
};

export function OpsDetailDrawer({ entry, onOpenChange }: OpsDetailDrawerProps) {
  const [followups, setFollowups] = React.useState<FollowUpItem[]>([]);
  const [comment, setComment] = React.useState("");

  const entryDetails = React.useMemo(() => {
    if (!entry) return null;
    const normalized = normalizeTitle(entry.title);
    const key = Object.keys(OPS_DETAILS).find((k) => normalizeTitle(k) === normalized);
    return key
      ? OPS_DETAILS[key]
      : {
          description:
            "Standard log entry. Includes audience, severity, and follow-up tasks where relevant.",
          location: entry.area.split("·")[0]?.trim() || "Main building",
          followups: [],
        };
  }, [entry]);

  React.useEffect(() => {
    if (entryDetails) {
      setFollowups(entryDetails.followups);
      setComment("");
    }
  }, [entryDetails]);

  if (!entry || !entryDetails) return null;

  const priorityTone = entry.prioTone === "danger" ? "danger" : "warning";
  const doneCount = followups.filter((f) => f.done).length;

  const handleToggleFollowUp = (index: number) => {
    const next = [...followups];
    next[index] = { ...next[index], done: !next[index].done };
    setFollowups(next);
  };

  const handleAddTask = () => {
    const title = window.prompt("Enter follow-up task description:");
    if (title && title.trim()) {
      setFollowups([...followups, { title: title.trim(), done: false }]);
      toast.success("Follow-up added to the queue");
    }
  };

  const handleSaveComment = () => {
    if (!comment.trim()) return;
    toast.success("Update saved", { description: "Audit log updated" });
    setComment("");
  };

  return (
    <DrawerShell
      open={entry !== null}
      onOpenChange={onOpenChange}
      title={entry.title}
      description={`${entry.t} · ${entry.area}`}
      meta={entry.prio ? <StatusBadge tone={priorityTone}>{entry.prio}</StatusBadge> : null}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
      width="lg"
    >
      <div className="space-y-4">
        {/* Entry Type Header Indicator */}
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
              {entryDetails.severity && (
                <StatusBadge tone={entryDetails.severity === "High" ? "danger" : "warning"}>
                  {entryDetails.severity} severity
                </StatusBadge>
              )}
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="card p-4 space-y-3 bg-muted/20 border border-border rounded-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Details
          </div>
          <div className="text-sm leading-relaxed text-foreground/90">
            {entryDetails.description}
          </div>
          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {entryDetails.location}
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
        </div>

        {/* Manager Notes Card */}
        {entryDetails.notes && (
          <div className="card p-3.5 bg-accent-purple-soft/10 border border-accent-purple/20 rounded-xl">
            <div className="text-xs font-semibold text-accent-purple mb-1">Manager notes</div>
            <div className="text-sm leading-relaxed text-foreground/80">{entryDetails.notes}</div>
          </div>
        )}

        {/* Follow-up Tasks Checklist */}
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
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={handleAddTask}
            className="w-full justify-center mt-1"
          >
            Add task
          </ActionButton>
        </div>

        {/* Add comment textarea */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add a comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Add an update for managers reviewing this entry…"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground italic">
              Visible to managers only
            </span>
            <ActionButton size="sm" onClick={handleSaveComment} disabled={!comment.trim()}>
              Save update
            </ActionButton>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
