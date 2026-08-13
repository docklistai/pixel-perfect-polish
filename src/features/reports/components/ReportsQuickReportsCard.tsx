import { CalendarCheck2, Clock3, Download, Plane, Rows3 } from "lucide-react";
import { Card } from "@/components/dl";
import { QUICK_REPORTS } from "../lib/reportsPresentation";
import type { ReportsDetailKey } from "../types";

const ICONS = {
  published: CalendarCheck2,
  coverage: Rows3,
  leave: Plane,
  time: Clock3,
  approved: Download,
};

export function ReportsQuickReportsCard({
  onOpen,
  onApprovedExport,
}: {
  onOpen: (detail: ReportsDetailKey) => void;
  onApprovedExport: () => void;
}) {
  return (
    <Card className="col-span-12 p-4 lg:col-span-4 lg:p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold">Quick reports</div>
        <div className="text-xs text-muted-foreground">
          Fixed operational shortcuts · not saved configuration
        </div>
      </div>
      <div className="space-y-1">
        {QUICK_REPORTS.map((report) => {
          const Icon = ICONS[report.id as keyof typeof ICONS];
          return (
            <button
              key={report.id}
              type="button"
              onClick={() =>
                report.detail === "approved_export" ? onApprovedExport() : onOpen(report.detail)
              }
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="av av-c8 sm">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="grow">
                <span className="strong txt-md block">{report.label}</span>
                <span className="muted txt-xs block">{report.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
