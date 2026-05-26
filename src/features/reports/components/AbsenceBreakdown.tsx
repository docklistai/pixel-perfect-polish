import { Card } from "@/components/dl";

export function AbsenceBreakdown() {
  return (
    <Card className="col-span-12 lg:col-span-4 rounded-2xl p-4 lg:p-5">
      <div id="absence-chart-title" className="text-sm font-semibold mb-3">
        Absence breakdown
      </div>
      <div id="absence-chart-summary" className="sr-only">
        Absence breakdown for the week of 18 May 2026. Total 36 hours: sickness 22 hours (61
        percent), annual leave 8 hours (22 percent), unpaid leave 3 hours (8 percent), other 3 hours
        (8 percent). Absence rate was 4.2 percent.
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32">
          <svg
            viewBox="0 0 36 36"
            className="h-32 w-32 -rotate-90"
            role="img"
            aria-labelledby="absence-chart-title"
            aria-describedby="absence-chart-summary"
          >
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="var(--accent-purple)"
              strokeWidth="6"
              strokeDasharray="54 88"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="var(--success)"
              strokeWidth="6"
              strokeDasharray="19 88"
              strokeDashoffset="-54"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="var(--warning)"
              strokeWidth="6"
              strokeDasharray="7 88"
              strokeDashoffset="-73"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="oklch(0.85 0.02 240)"
              strokeWidth="6"
              strokeDasharray="8 88"
              strokeDashoffset="-80"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold">36</div>
            <div className="text-[10px] text-muted-foreground">Total hours</div>
          </div>
        </div>
        <div className="space-y-1.5 text-xs flex-1">
          {[
            ["Sickness", "22h (61%)", "purple"],
            ["Annual Leave", "8h (22%)", "success"],
            ["Unpaid Leave", "3h (8%)", "warning"],
            ["Other", "3h (8%)", "muted"],
          ].map(([n, v, t]) => (
            <div key={n} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: t === "muted" ? "oklch(0.85 0.02 240)" : `var(--${t})` }}
              />
              <span className="flex-1">{n}</span>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-3">
        Absence rate was 4.2%, down 0.6pp vs last week.
      </div>
    </Card>
  );
}
