import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, AppShell, PageHeader } from "@/components/dl";
import { requireManagerAccess } from "@/features/auth";
import { DepartmentLabourPanel } from "@/features/reports/components/DepartmentLabourPanel";
import { InsightDetailDrawer } from "@/features/reports/components/InsightDetailDrawer";
import { LabourTargetChart } from "@/features/reports/components/LabourTargetChart";
import { ReportsContractReviewCard } from "@/features/reports/components/ReportsContractReviewCard";
import { ReportsCoverageHeatmapCard } from "@/features/reports/components/ReportsCoverageHeatmapCard";
import { ReportsFilters } from "@/features/reports/components/ReportsFilters";
import { ReportsInsightsPanel } from "@/features/reports/components/ReportsInsightsPanel";
import { ReportsKpiCards } from "@/features/reports/components/ReportsKpiCards";
import { ReportsQuickReportsCard } from "@/features/reports/components/ReportsQuickReportsCard";
import { ReportsStateCard } from "@/features/reports/components/ReportsStateCard";
import { TimeApprovalTrend } from "@/features/reports/components/TimeApprovalTrend";
import { useReportsPage } from "@/features/reports/hooks/useReportsPage";
import { downloadCoverageCsv } from "@/features/reports/lib/reportsCsv";
import { periodLabel } from "@/features/reports/lib/reportsPeriod";
import type { ReportsDetailKey } from "@/features/reports/types";

export const Route = createFileRoute("/reports")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Reports — Docklist" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const navigate = useNavigate();
  const reports = useReportsPage();
  const [selectedDetail, setSelectedDetail] = React.useState<ReportsDetailKey | null>(null);
  const data = reports.data;

  const exportCoverage = () => {
    if (!data || data.coverageRows.length === 0) return;
    downloadCoverageCsv(data.coverageRows, data.meta.periodStart, data.meta.periodEnd);
    toast.success("Published schedule coverage exported", {
      description: `${data.coverageRows.length} filtered coverage rows downloaded as CSV.`,
    });
  };

  const hasOperationalData = Boolean(
    data &&
    (data.coverageRows.length > 0 ||
      data.totals.approvedEntries > 0 ||
      data.totals.awaitingReviewEntries > 0 ||
      data.totals.pendingLeave > 0),
  );

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle={
          data
            ? `Published scheduling and manager review · ${periodLabel(data.meta.periodStart, data.meta.periodEnd)}`
            : "Published scheduling and manager review for your workspace."
        }
        actions={
          <ActionButton
            variant="secondary"
            icon={Download}
            onClick={exportCoverage}
            disabled={!data || data.coverageRows.length === 0}
            title={
              !data?.coverageRows.length
                ? "No filtered published coverage rows to export"
                : undefined
            }
          >
            Export coverage CSV
          </ActionButton>
        }
      />

      <ReportsFilters
        preset={reports.periodPreset}
        onPresetChange={reports.setPeriodPreset}
        locationId={reports.locationId}
        onLocationChange={reports.setLocationId}
        departmentId={reports.departmentId}
        onDepartmentChange={reports.setDepartmentId}
        locations={data?.options.locations ?? []}
        departments={data?.options.departments ?? []}
        disabled={reports.isLoading}
      />

      {reports.isLoading ? (
        <ReportsStateCard state="loading" />
      ) : reports.isError || !data ? (
        <ReportsStateCard state="error" />
      ) : (
        <>
          {!hasOperationalData && <ReportsStateCard state="empty" />}
          <ReportsKpiCards data={data} />
          <div className="grid grid-cols-12 items-start gap-5">
            <LabourTargetChart data={data} />
            <DepartmentLabourPanel rows={data.departmentHours} />
          </div>
          <div className="mt-4">
            <ReportsInsightsPanel data={data} onOpenDetail={setSelectedDetail} />
          </div>
          <div className="mt-4 grid grid-cols-12 items-start gap-5">
            <TimeApprovalTrend weeks={data.weeks} />
            <ReportsContractReviewCard
              rows={data.contractReviews}
              preset={reports.periodPreset}
              onOpen={() => setSelectedDetail("contracts")}
            />
            <ReportsQuickReportsCard
              onOpen={setSelectedDetail}
              onApprovedExport={() => navigate({ to: "/time" })}
            />
          </div>
          <ReportsCoverageHeatmapCard cells={data.heatmap} />
          <InsightDetailDrawer
            detail={selectedDetail}
            data={data}
            onOpenChange={(open) => !open && setSelectedDetail(null)}
          />
        </>
      )}
    </AppShell>
  );
}
