import { ArrowRight, Bell, CheckCircle2, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/dl";
import { AiSuggestionCard } from "@/components/ai/AiSuggestionCard";
import { timeQueries } from "../data/timeDemoData";
import type { StoredTimesheetRow, TimeQuery } from "../types";

interface Props {
  onApproveSuggested: () => void;
  onOpenAssistant: () => void;
  onPrepareReminder: (name: string) => void;
  onOpenQuery: (query: TimeQuery) => void;
  rows: StoredTimesheetRow[];
}

export function TimeRightRail({
  onApproveSuggested,
  onOpenAssistant,
  onPrepareReminder,
  onOpenQuery,
  rows,
}: Props) {
  const cleanPending = rows.filter((row) => row.exc === "—" && row.status === "pending");
  const missedClockIns = rows.filter((row) => row.in === "—");
  return (
    <div className="col-span-12 lg:col-span-3 space-y-4">
      <AiSuggestionCard
        tone="teal"
        title={`${cleanPending.length} clean pending timesheet${cleanPending.length === 1 ? "" : "s"} ready to review`}
        body={
          cleanPending.length > 0
            ? `${cleanPending.map((row) => row.n).join(", ")} clocked with no recorded exception. Review before approving.`
            : "No clean pending timesheets remain in this view."
        }
        actions={[
          {
            label: "Review clean entry",
            primary: true,
            icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
            onClick: onApproveSuggested,
          },
          {
            label: "Open assistant",
            icon: <Sparkles className="h-3.5 w-3.5" aria-hidden />,
            onClick: onOpenAssistant,
          },
        ]}
      />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold">Attendance this week</span>
          </span>
          <span className="text-xs text-muted-foreground">vs last week</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Attendance rate
            </div>
            <div className="font-display text-[22px] font-bold tracking-tight leading-tight">
              95.3%
            </div>
            <div className="text-[11px] font-semibold text-success">↑ 2.1% vs last week</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Avg paid hours
            </div>
            <div className="font-display text-[22px] font-bold tracking-tight leading-tight">
              7h 43m
            </div>
            <div className="text-[11px] font-semibold text-success">↑ 18m vs last week</div>
          </div>
        </div>
        <svg viewBox="0 0 280 80" className="w-full h-20" aria-hidden>
          <defs>
            <linearGradient id="time-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--teal-500)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--teal-500)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {(() => {
            const data = [88, 93, 95, 92, 96, 98, 95];
            const w = 280;
            const h = 80;
            const min = 80;
            const max = 100;
            const pts = data.map((v, i) => {
              const x = (i / (data.length - 1)) * w;
              const y = h - ((v - min) / (max - min)) * h;
              return `${x},${y}`;
            });
            const polyline = pts.join(" ");
            return (
              <>
                <polygon points={`0,${h} ${polyline} ${w},${h}`} fill="url(#time-spark-fill)" />
                <polyline points={polyline} fill="none" stroke="var(--teal-500)" strokeWidth="2" />
                {pts.map((p, i) => {
                  const [x, y] = p.split(",");
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="2.5"
                      fill="var(--bg-card)"
                      stroke="var(--teal-500)"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </>
            );
          })()}
        </svg>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <div className="card-section flex items-center justify-between">
          <span className="text-sm font-semibold">Missed clock-ins</span>
          <span className="badge red">{missedClockIns.length}</span>
        </div>
        {missedClockIns.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPrepareReminder(p.n)}
            className="flex w-full items-center gap-3 border-t border-border/40 px-4 py-3 text-left transition hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <img
              src={`https://i.pravatar.cc/64?img=${p.img}`}
              className="h-8 w-8 rounded-full object-cover"
              alt=""
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{p.n}</div>
              <div className="text-[11px] text-muted-foreground">Today · {p.sched}</div>
            </div>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
              title={`Prepare reminder for ${p.n}`}
            >
              <Bell className="h-3.5 w-3.5" aria-hidden />
            </span>
          </button>
        ))}
      </Card>

      <Card className="p-0">
        <div className="card-section flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold">Hours queries</span>
          </span>
          <span className="badge">{timeQueries.length}</span>
        </div>
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-[11px] text-muted-foreground">
            Staff-raised questions about recorded hours — Docklist records hours only
          </span>
        </div>
        {timeQueries.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpenQuery(p)}
            className="flex w-full items-center gap-3 border-t border-border/40 px-4 py-3 text-left transition hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <img
              src={`https://i.pravatar.cc/64?img=${p.img}`}
              className="h-8 w-8 rounded-full object-cover"
              alt=""
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{p.n}</div>
              <div className="text-[11px] text-muted-foreground">{p.t}</div>
            </div>
            <span className={`badge ${p.stTone === "danger" ? "red" : "blue"}`}>{p.st}</span>
          </button>
        ))}
        <div className="card-foot">
          <button
            type="button"
            className="link txt-sm inline-flex items-center gap-1"
            onClick={() =>
              toast.info("Hours queries", { description: "All open queries are shown." })
            }
          >
            View all <ArrowRight className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </Card>
    </div>
  );
}
