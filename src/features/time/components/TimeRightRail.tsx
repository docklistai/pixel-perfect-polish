import { Card } from "@/components/dl";
import { missedClockIns, timeQueries } from "../data/timeDemoData";

export function TimeRightRail() {
  return (
    <div className="col-span-12 lg:col-span-3 space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Attendance Trends</span>
          <span className="text-xs text-muted-foreground">This week</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-xs text-muted-foreground">Attendance Rate</div>
            <div className="text-2xl font-bold">95.3%</div>
            <div className="text-[11px] text-success">↑ 2.1% vs last week</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Avg. Paid Hours</div>
            <div className="text-2xl font-bold">7 h 43 m</div>
            <div className="text-[11px] text-muted-foreground">↑ 0 h 18 m vs last week</div>
          </div>
        </div>
        <svg viewBox="0 0 200 60" className="w-full h-20" aria-hidden="true">
          <polyline
            fill="none"
            stroke="var(--info)"
            strokeWidth="2"
            points="0,40 30,30 60,35 90,25 120,28 150,22 180,25 200,20"
          />
          {([0, 30, 60, 90, 120, 150, 180, 200] as const).map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={[40, 30, 35, 25, 28, 22, 25, 20][i]}
              r="2.5"
              fill="var(--info)"
            />
          ))}
        </svg>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Missed Clock-Ins</span>
          <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">
            {missedClockIns.length}
          </span>
        </div>
        {missedClockIns.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
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
            <span className="rounded-md bg-danger-soft text-danger text-[11px] px-2 py-0.5">
              Missing
            </span>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Open Queries</span>
          <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">
            {timeQueries.length}
          </span>
        </div>
        {timeQueries.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
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
            <span
              className={`text-[11px] font-medium ${p.stTone === "danger" ? "text-danger" : "text-info"}`}
            >
              {p.st}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
