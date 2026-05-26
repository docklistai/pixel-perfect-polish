import { Card } from "@/components/dl";

const segments = [
  { department: "Front of House", value: "£14,820", pct: 35, color: "#3B82F6" },
  { department: "Kitchen", value: "£12,640", pct: 30, color: "#E8A33D" },
  { department: "Housekeeping", value: "£8,450", pct: 20, color: "#1DA672" },
  { department: "Bar", value: "£3,210", pct: 8, color: "#E94358" },
  { department: "Other", value: "£3,060", pct: 7, color: "#97A0B3" },
];

export function DepartmentLabourPanel() {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card className="col-span-12 lg:col-span-4 p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          COST BY DEPARTMENT
        </div>
      </div>

      <div className="relative grid h-40 place-items-center">
        <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r={radius} stroke="var(--ink-100)" strokeWidth="18" fill="none" />
          {segments.map((segment) => {
            const length = (segment.pct / 100) * circumference;
            const dash = `${length} ${circumference - length}`;
            const dashOffset = -offset;
            offset += length;

            return (
              <circle
                key={segment.department}
                cx="80"
                cy="80"
                r={radius}
                stroke={segment.color}
                strokeWidth="18"
                fill="none"
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 80 80)"
              />
            );
          })}
        </svg>
        <div className="absolute text-center">
          <div className="font-display text-[22px] font-bold">£42,180</div>
          <div className="text-xs text-muted-foreground">Total cost</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {segments.map((segment) => (
          <div key={segment.department} className="row gap-2">
            <span className="dot" style={{ background: segment.color }} />
            <span className="grow txt-md">{segment.department}</span>
            <span className="muted txt-xs">{segment.pct}%</span>
            <span className="strong txt-md" style={{ minWidth: 64, textAlign: "right" }}>
              {segment.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
