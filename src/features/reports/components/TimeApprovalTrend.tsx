import { Card } from "@/components/dl";

const attendance = [
  { day: "Mon", thisPeriod: 92, previous: 90 },
  { day: "Tue", thisPeriod: 95, previous: 91 },
  { day: "Wed", thisPeriod: 94, previous: 93 },
  { day: "Thu", thisPeriod: 97, previous: 94 },
  { day: "Fri", thisPeriod: 98, previous: 96 },
  { day: "Sat", thisPeriod: 96, previous: 95 },
  { day: "Sun", thisPeriod: 91, previous: 88 },
];

export function TimeApprovalTrend() {
  const max = 100;
  const chartHeight = 160;

  return (
    <Card className="col-span-12 lg:col-span-4 p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Attendance rate</div>
        <span className="text-xs text-muted-foreground">Weekly view</span>
      </div>

      <div className="mb-3 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="dot" style={{ background: "var(--blue-500)" }} /> This period
        </span>
        <span className="flex items-center gap-1">
          <span className="dot" style={{ background: "var(--ink-300)" }} /> Previous
        </span>
      </div>

      <div className="row gap-3" style={{ alignItems: "flex-end", height: chartHeight + 20 }}>
        {attendance.map((day) => (
          <div key={day.day} className="col" style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <div
              className="row gap-1"
              style={{
                alignItems: "flex-end",
                height: chartHeight,
                width: "100%",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: (day.previous / max) * chartHeight,
                  background: "var(--ink-200)",
                  borderRadius: "4px 4px 0 0",
                }}
              />
              <div
                style={{
                  width: 14,
                  height: (day.thisPeriod / max) * chartHeight,
                  background: "var(--blue-500)",
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
            <div className="muted txt-xs">{day.day}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 row gap-3">
        <span className="muted txt-xs row gap-2">
          <span className="dot" style={{ background: "var(--blue-500)" }} /> This period
        </span>
        <span className="muted txt-xs row gap-2">
          <span className="dot" style={{ background: "var(--ink-300)" }} /> Previous
        </span>
      </div>
    </Card>
  );
}
