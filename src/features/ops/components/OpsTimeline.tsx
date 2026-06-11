import * as React from "react";
import { Check, CheckCircle2, ChevronDown, ExternalLink, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { toneBg } from "../data/opsDemoData";
import type { OpsEntry } from "../types";

const SORT_OPTIONS = ["Time (newest)", "Time (oldest)", "Priority", "Status"];

interface OpsTimelineProps {
  entries: OpsEntry[];
  onOpenEntry: (entry: OpsEntry) => void;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
}

export function OpsTimeline({ entries, onOpenEntry, onMarkDone, onDelete }: OpsTimelineProps) {
  const [sortBy, setSortBy] = React.useState(SORT_OPTIONS[0]);

  return (
    <Card className="col-span-12 lg:col-span-9 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold">Today's timeline</h2>
        <div className="ml-auto">
          <RowActionMenu
            triggerLabel="Sort timeline"
            trigger={
              <button type="button" className="btn ghost sm">
                Sort <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
            }
            items={[
              { kind: "label", text: "Sort by" },
              ...SORT_OPTIONS.map((s) => ({
                label: s,
                icon: sortBy === s ? Check : undefined,
                onSelect: () => setSortBy(s),
              })),
            ]}
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Today's operations timeline will appear here."
        />
      ) : (
        <div className="relative pl-[88px]">
          <div
            className="absolute bottom-2 top-2 w-0.5"
            style={{ left: 72, background: "var(--border)" }}
            aria-hidden
          />
          {entries.map((e) => (
            <div key={e.id} className="relative mb-3">
              <div
                className="absolute top-3.5 w-[60px] text-right text-xs font-semibold"
                style={{ left: -88, color: "var(--ink-500)" }}
              >
                {e.t}
              </div>
              <div
                className="absolute top-3.5 h-3 w-3 rounded-full"
                style={{
                  left: -22,
                  background: "var(--bg-card)",
                  border: `3px solid ${e.highlight ? "var(--red-500)" : "var(--teal-500)"}`,
                }}
                aria-hidden
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenEntry(e)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onOpenEntry(e);
                  }
                }}
                className={`flex w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-border p-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${e.highlight ? "bg-danger-soft/30 border-danger/30" : ""}`}
              >
                <div
                  className={`h-[30px] w-[30px] rounded-lg flex items-center justify-center shrink-0 ${toneBg[e.dot === "danger" ? "warning" : e.dot]}`}
                >
                  <e.icon className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground">{e.area}</div>
                  {e.by && <div className="text-[11px] text-muted-foreground">{e.by}</div>}
                </div>
                {e.prio && (
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: `var(--${e.prioTone})` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{" "}
                    {e.prio}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${e.stTone === "success" ? "bg-success-soft text-success" : e.stTone === "info" ? "bg-info-soft text-info" : "bg-warning-soft text-warning"}`}
                >
                  {e.st}
                </span>
                {e.who && (
                  <img
                    src={`https://i.pravatar.cc/64?img=${e.who.img}`}
                    className="h-7 w-7 rounded-full object-cover shrink-0"
                    alt=""
                    loading="lazy"
                    width={28}
                    height={28}
                  />
                )}
                <RowActionMenu
                  triggerLabel={`Actions for ${e.title}`}
                  items={[
                    { label: "Open", icon: ExternalLink, onSelect: () => onOpenEntry(e) },
                    {
                      label: "Reassign…",
                      icon: User,
                      onSelect: () =>
                        toast.info("Reassign", { description: "Reassign panel opened" }),
                    },
                    {
                      label: "Add follow-up",
                      icon: Plus,
                      onSelect: () =>
                        toast.info("Follow-up", { description: "Follow-up task added" }),
                    },
                    { kind: "separator" },
                    { label: "Mark done", icon: CheckCircle2, onSelect: () => onMarkDone(e.id) },
                    { label: "Delete", icon: Trash2, danger: true, onSelect: () => onDelete(e.id) },
                  ]}
                />
              </div>
            </div>
          ))}
          <div className="pt-1 text-center">
            <button
              type="button"
              className="link text-sm"
              onClick={() =>
                toast.info("Timeline", { description: "You're viewing the full log for today" })
              }
            >
              View earlier entries <ChevronDown className="inline h-3 w-3" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
