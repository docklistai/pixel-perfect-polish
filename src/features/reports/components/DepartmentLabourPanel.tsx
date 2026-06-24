import { ExternalLink } from "lucide-react";
import { Card } from "@/components/dl";

const segments = [
  { department: "Front of House", value: "£7,294", pct: 35, color: "#3B82F6" },
  { department: "Kitchen", value: "£6,252", pct: 30, color: "#E8A33D" },
  { department: "Housekeeping", value: "£3,126", pct: 15, color: "#1DA672" },
  { department: "Bar", value: "£2,084", pct: 10, color: "#E94358" },
  { department: "Maintenance", value: "£2,084", pct: 10, color: "#97A0B3" },
];

export function DepartmentLabourPanel() {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card className="col-span-12 lg:col-span-4 p-4 lg:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div>
          <div className="text-sm font-semibold">Sample cost by department</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sample finance figure
          </div>
        </div>
        <div className="grow" />
        <button
          type="button"
          aria-label="Cost by department detail preview unavailable"
          disabled
          className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground opacity-50"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
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
          <div className="font-display text-[22px] font-bold leading-none">£20,840</div>
          <div className="mt-1 text-xs text-muted-foreground">Sample total cost</div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {segments.map((segment) => (
          <div key={segment.department} className="flex items-center gap-2 text-[13px]">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: segment.color }}
            />
            <span className="grow truncate">{segment.department}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{segment.pct}%</span>
            <span
              className="shrink-0 font-mono text-[13px] font-semibold tabular-nums"
              style={{ minWidth: 64, textAlign: "right" }}
            >
              {segment.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
