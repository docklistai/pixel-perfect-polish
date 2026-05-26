import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { Briefcase, CalendarDays, ChevronDown, Download, Sparkles } from "lucide-react";
import { ReportsKpiCards } from "@/features/reports/components/ReportsKpiCards";
import { LabourTargetChart } from "@/features/reports/components/LabourTargetChart";
import { ReportsInsightsPanel } from "@/features/reports/components/ReportsInsightsPanel";
import { TimeApprovalTrend } from "@/features/reports/components/TimeApprovalTrend";
import { DepartmentLabourPanel } from "@/features/reports/components/DepartmentLabourPanel";
import { ReportsTopPerformersCard } from "@/features/reports/components/ReportsTopPerformersCard";
import { ReportsSavedReportsCard } from "@/features/reports/components/ReportsSavedReportsCard";
import { ReportsCoverageHeatmapCard } from "@/features/reports/components/ReportsCoverageHeatmapCard";
import { ReportsFilterDrawer } from "@/features/reports/components/ReportsFilterDrawer";
import { ReportsExportDialog } from "@/features/reports/components/ReportsExportDialog";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Docklist" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { openAiDrawer } = useOverlays();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Review labour and coverage, then return to Rota, Time, or Leave to act."
        actions={
          <>
            <ActionButton
              variant="secondary"
              icon={CalendarDays}
              iconRight={ChevronDown}
              onClick={() => setFilterOpen(true)}
            >
              Last 4 weeks
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon={Briefcase}
              iconRight={ChevronDown}
              onClick={() => setFilterOpen(true)}
            >
              All departments
            </ActionButton>
            <ActionButton variant="outline" icon={Sparkles} onClick={openAiDrawer}>
              AI review
            </ActionButton>
            <ActionButton variant="secondary" icon={Download} onClick={() => setExportOpen(true)}>
              Export
            </ActionButton>
          </>
        }
      />

      <ReportsKpiCards />

      <div className="grid grid-cols-12 gap-5 items-start">
        <LabourTargetChart />
        <DepartmentLabourPanel />
      </div>

      <div className="mt-4">
        <ReportsInsightsPanel />
      </div>

      <div className="mt-4 grid grid-cols-12 gap-5 items-start">
        <TimeApprovalTrend />
        <ReportsTopPerformersCard />
        <ReportsSavedReportsCard />
      </div>

      <ReportsCoverageHeatmapCard />

      <ReportsFilterDrawer open={filterOpen} onOpenChange={setFilterOpen} />
      <ReportsExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AppShell>
  );
}
