import { Card } from "@/components/dl";

export function TimeApprovalTrend() {
  return (
    <Card className="col-span-12 lg:col-span-4 rounded-2xl p-4 lg:p-5">
      <div
        id="time-approval-chart-title"
        className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-3"
      >
        TIME APPROVAL TREND
      </div>
      <div id="time-approval-chart-summary" className="sr-only">
        Time approval trend for the week of 18 May 2026. Most days had over 70 percent of timesheets
        approved on time. Saturday had the lowest rate at 68 percent.
      </div>
      <div className="flex items-center gap-3 text-xs mb-2">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-brand" /> Approved on time
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-danger" /> Approved late
        </span>
      </div>
      <svg
        viewBox="0 0 280 140"
        className="w-full h-40"
        role="img"
        aria-labelledby="time-approval-chart-title"
        aria-describedby="time-approval-chart-summary"
      >
        {[
          { d: "Mon 18", on: 82 },
          { d: "Tue 19", on: 78 },
          { d: "Wed 20", on: 85 },
          { d: "Thu 21", on: 71 },
          { d: "Fri 22", on: 80 },
          { d: "Sat 23", on: 68 },
          { d: "Sun 24", on: 74 },
        ].map(({ d, on }, i) => {
          const onTimeH = (on / 100) * 70;
          const lateH = 10;
          const onTimeY = 100 - onTimeH;
          const lateY = onTimeY - lateH;
          return (
            <g key={d} transform={`translate(${20 + i * 36}, 0)`}>
              <rect x="0" y={onTimeY} width="20" height={onTimeH} fill="var(--brand)" rx="2" />
              <rect x="0" y={lateY} width="20" height={lateH} fill="var(--danger)" rx="2" />
              <text x="10" y="125" fontSize="8" textAnchor="middle" fill="var(--muted-foreground)">
                {d}
              </text>
            </g>
          );
        })}
        {["100%", "75%", "50%", "25%", "0%"].map((t, i) => (
          <text key={t} x="0" y={20 + i * 25} fontSize="8" fill="var(--muted-foreground)">
            {t}
          </text>
        ))}
      </svg>
      <div className="text-xs text-muted-foreground mt-2">
        78% of timesheets were approved on time this week.
      </div>
    </Card>
  );
}
