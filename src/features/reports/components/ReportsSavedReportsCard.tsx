import { Card } from "@/components/dl";
import { Clock3, Download, Plane, PoundSterling, Trophy, type LucideIcon } from "lucide-react";

const savedReports = [
  { icon: PoundSterling, name: "Weekly labour summary", sub: "Owned by you" },
  { icon: Clock3, name: "Attendance — Kitchen", sub: "Last run yesterday" },
  { icon: Plane, name: "Leave forecast Q3", sub: "Owned by Olivia" },
  { icon: Trophy, name: "Performance review", sub: "Last run 7d ago" },
  { icon: Download, name: "Approved hours export", sub: "Last run 2d ago" },
] as const;

interface ReportsSavedReportsCardProps {
  onOpenReport: (report: { name: string; sub: string; icon: LucideIcon }) => void;
}

export function ReportsSavedReportsCard({ onOpenReport }: ReportsSavedReportsCardProps) {
  return (
    <Card className="col-span-12 lg:col-span-4 p-4 lg:p-5">
      <div className="mb-3 text-sm font-semibold">Saved reports</div>
      <div className="space-y-2">
        {savedReports.map((report) => (
          <button
            key={report.name}
            type="button"
            onClick={() => onOpenReport(report)}
            className="flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="av av-c8 sm">
              <report.icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className="grow">
              <div className="strong txt-md">{report.name}</div>
              <div className="muted txt-xs">{report.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
