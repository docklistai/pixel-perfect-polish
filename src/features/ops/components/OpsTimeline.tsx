import { Card, EmptyState } from "@/components/dl";
import { opsTimeline, toneBg } from "../data/opsDemoData";
import type { TimelineEntry } from "../types";

interface OpsTimelineProps {
  onOpenEntry: (entry: TimelineEntry) => void;
}

export function OpsTimeline({ onOpenEntry }: OpsTimelineProps) {
  return (
    <Card className="col-span-12 lg:col-span-9 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold">Operations timeline</h2>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <span className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground">
            Today
          </span>
          <span className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground">
            All categories
          </span>
          <span className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground">
            All locations
          </span>
        </div>
      </div>

      {opsTimeline.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Today's operations timeline will appear here."
        />
      ) : (
        <div className="space-y-2">
          {opsTimeline.map((e, i) => (
            <div key={i} className="grid grid-cols-[60px_1fr] gap-3 items-center">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: `var(--${e.dot})` }}
                  aria-hidden="true"
                />
                {e.t}
              </div>
              <button
                type="button"
                onClick={() => onOpenEntry(e)}
                className={`flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${e.highlight ? "bg-danger-soft/30 border-danger/30" : ""}`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${toneBg[e.dot === "danger" ? "warning" : e.dot]}`}
                >
                  <e.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground">{e.area}</div>
                  {e.by && <div className="text-[11px] text-muted-foreground">{e.by}</div>}
                </div>
                {e.who && (
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={`https://i.pravatar.cc/64?img=${e.who.img}`}
                      className="h-7 w-7 rounded-full object-cover shrink-0"
                      alt=""
                      loading="lazy"
                      width={28}
                      height={28}
                    />
                    <span className="text-sm min-w-0 truncate">{e.who.n}</span>
                  </div>
                )}
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
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
