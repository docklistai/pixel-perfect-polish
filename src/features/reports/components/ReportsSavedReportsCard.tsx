import { Card } from "@/components/dl";
import { Clock3, Download, Plane, PoundSterling, Trophy } from "lucide-react";

const savedReports = [
  { icon: PoundSterling, name: "Weekly labour summary", sub: "Owned by you" },
  { icon: Clock3, name: "Attendance — Kitchen", sub: "Last run yesterday" },
  { icon: Plane, name: "Leave forecast Q3", sub: "Owned by Olivia" },
  { icon: Trophy, name: "Performance review", sub: "Last run 7d ago" },
  { icon: Download, name: "Payroll export May", sub: "Last run 2d ago" },
] as const;

export function ReportsSavedReportsCard() {
  return (
    <Card className="col-span-12 lg:col-span-4 p-4 lg:p-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        SAVED REPORTS
      </div>
      <div className="space-y-2">
        {savedReports.map((report) => (
          <div key={report.name} className="row gap-3 w-full rounded-lg px-2.5 py-2 text-left">
            <div className="av av-c8 sm">
              <report.icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className="grow">
              <div className="strong txt-md">{report.name}</div>
              <div className="muted txt-xs">{report.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
