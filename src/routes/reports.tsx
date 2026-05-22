import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, FilterButton, ActionButton } from "@/components/dl";
import { Calendar, Filter, Download } from "lucide-react";
import { ReportsKpiCards } from "@/features/reports/components/ReportsKpiCards";
import { LabourTargetChart } from "@/features/reports/components/LabourTargetChart";
import { ReportsInsightsPanel } from "@/features/reports/components/ReportsInsightsPanel";
import { TimeApprovalTrend } from "@/features/reports/components/TimeApprovalTrend";
import { AbsenceBreakdown } from "@/features/reports/components/AbsenceBreakdown";
import { DepartmentLabourPanel } from "@/features/reports/components/DepartmentLabourPanel";
import { ReportsFilterDrawer } from "@/features/reports/components/ReportsFilterDrawer";
import { ReportsExportDialog } from "@/features/reports/components/ReportsExportDialog";
import { InsightDetailDrawer } from "@/features/reports/components/InsightDetailDrawer";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Docklist" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [insightOpen, setInsightOpen] = React.useState(false);
  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Review labour and coverage, then return to Rota, Time, or Leave to act."
        actions={
          <>
            <FilterButton icon={Calendar} label="18 – 24 May 2026" />
            <FilterButton
              icon={Filter}
              label="Filters"
              showCaret={false}
              onClick={() => setFilterOpen(true)}
            />
            <FilterButton
              icon={Download}
              label="Export"
              showCaret={false}
              onClick={() => setExportOpen(true)}
            />
            <ActionButton variant="secondary" onClick={() => setInsightOpen(true)}>
              View top review point
            </ActionButton>
          </>
        }
      />

      <ReportsKpiCards />

      <div className="grid grid-cols-12 gap-5">
        <LabourTargetChart />
        <ReportsInsightsPanel />
        <TimeApprovalTrend />
        <AbsenceBreakdown />
        <DepartmentLabourPanel />
      </div>

      <ReportsFilterDrawer open={filterOpen} onOpenChange={setFilterOpen} />
      <InsightDetailDrawer open={insightOpen} onOpenChange={setInsightOpen} />
      <ReportsExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AppShell>
  );
}
