import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, FeedbackBanner } from "@/components/dl";
import { CalendarDays, Download, Info, Plus, BarChart2 } from "lucide-react";
import { ReportsKpiCards } from "@/features/reports/components/ReportsKpiCards";
import { LabourTargetChart } from "@/features/reports/components/LabourTargetChart";
import { ReportsInsightsPanel } from "@/features/reports/components/ReportsInsightsPanel";
import { TimeApprovalTrend } from "@/features/reports/components/TimeApprovalTrend";
import { DepartmentLabourPanel } from "@/features/reports/components/DepartmentLabourPanel";
import { ReportsTopPerformersCard } from "@/features/reports/components/ReportsTopPerformersCard";
import { ReportsSavedReportsCard } from "@/features/reports/components/ReportsSavedReportsCard";
import { ReportsCoverageHeatmapCard } from "@/features/reports/components/ReportsCoverageHeatmapCard";
import { ReportsExportDialog } from "@/features/reports/components/ReportsExportDialog";
import { InsightDetailDrawer } from "@/features/reports/components/InsightDetailDrawer";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/reports")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Reports — Docklist" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [exportOpen, setExportOpen] = React.useState(false);
  const timeRows = useWorkspaceSelector((state) => state.timeRows);
  const leaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const [selectedReport, setSelectedReport] = React.useState<{
    name: string;
    sub?: string;
    tag?: string;
    icon?: React.ComponentType<{ className?: string }>;
  } | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Review labour cost, coverage, and attendance — with scheduling context and manager review points."
        actions={
          <>
            <span className="btn secondary sm" aria-label="Reporting period">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Last 4 weeks
            </span>
            <ActionButton variant="secondary" icon={Download} onClick={() => setExportOpen(true)}>
              Export
            </ActionButton>
            <ActionButton
              variant="primary"
              icon={Plus}
              onClick={() =>
                setSelectedReport({ name: "New custom report", tag: "Custom", icon: BarChart2 })
              }
            >
              New report
            </ActionButton>
          </>
        }
      />

      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        Use the review points below to spot rota issues — click each point to mark as reviewed.
      </div>

      <FeedbackBanner
        tone="info"
        title="Preview Mode"
        description="Reports are populated with demo data for private beta. This is not a live operational report."
        className="mb-4"
      />

      <ReportsKpiCards timeRows={timeRows} leaveRequests={leaveRequests} />

      <div className="grid grid-cols-12 gap-5 items-start">
        <LabourTargetChart />
        <DepartmentLabourPanel />
      </div>

      <div className="mt-4">
        <ReportsInsightsPanel
          onOpenDetail={(ins) => setSelectedReport({ name: ins.t, sub: ins.s, icon: ins.icon })}
        />
      </div>

      <div className="mt-4 grid grid-cols-12 gap-5 items-start">
        <TimeApprovalTrend />
        <ReportsTopPerformersCard />
        <ReportsSavedReportsCard onOpenReport={setSelectedReport} />
      </div>

      <ReportsCoverageHeatmapCard />

      <ReportsExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        reportName={selectedReport?.name ?? "weekly_report"}
      />
      <InsightDetailDrawer
        report={selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
        onExport={() => setExportOpen(true)}
      />
    </AppShell>
  );
}
