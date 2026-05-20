import { Card } from "@/components/dl";
import { TrendingUp } from "lucide-react";

export function LabourTargetChart() {
  return (
    <Card className="col-span-12 lg:col-span-8 rounded-2xl p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          id="reports-chart-title"
          className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground"
        >
          LABOUR % VS TARGET
        </div>
        <span className="rounded-xl border border-border px-3 py-1 text-xs text-muted-foreground">
          Weekly view
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs mb-3">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-brand inline-block rounded" /> Labour %
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 inline-block rounded"
            style={{
              background:
                "repeating-linear-gradient(to right, var(--muted-foreground) 0 2px, transparent 2px 4px)",
            }}
          />{" "}
          Target
        </span>
      </div>

      <div id="reports-chart-summary" className="sr-only">
        Labour averaged 28.6 percent this week, which is 1.8 percentage points above the 27 percent
        planning target. Weekends were the main driver of overage.
      </div>

      <svg
        viewBox="0 0 600 240"
        className="w-full h-72"
        role="img"
        aria-labelledby="reports-chart-title"
        aria-describedby="reports-chart-summary"
      >
        {/* grid */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1="40"
            x2="580"
            y1={20 + i * 40}
            y2={20 + i * 40}
            stroke="oklch(0.94 0.01 240)"
          />
        ))}
        {/* labour line */}
        <polyline
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          points="80,150 160,140 240,160 320,130 400,90 480,80 560,110"
        />
        {/* target dashed */}
        <polyline
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          points="80,135 160,135 240,135 320,135 400,135 480,135 560,135"
        />
        {/* dots */}
        {[
          [80, 150],
          [160, 140],
          [240, 160],
          [320, 130],
          [400, 90],
          [480, 80],
          [560, 110],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="var(--brand)" />
        ))}
        {/* y-axis labels */}
        {["40%", "35%", "30%", "25%", "20%", "15%"].map((t, i) => (
          <text key={t} x="10" y={25 + i * 40} fontSize="10" fill="var(--muted-foreground)">
            {t}
          </text>
        ))}
      </svg>
      <div className="flex justify-between text-[11px] text-muted-foreground px-10">
        {["Mon 18", "Tue 19", "Wed 20", "Thu 21", "Fri 22", "Sat 23", "Sun 24"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-muted/50 px-3 py-2.5 text-xs">
        <TrendingUp className="h-4 w-4 text-brand" />
        <span>
          Labour % averaged 28.6% this week, 1.8pp above the planning target. Weekends were the main
          driver — review Saturday and Sunday shifts before publishing next rota.
        </span>
      </div>
    </Card>
  );
}
