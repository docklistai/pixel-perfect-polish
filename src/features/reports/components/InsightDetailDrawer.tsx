import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import { periodLabel } from "../lib/reportsPeriod";
import type { ReportsDetailKey, ReportsPageData } from "../types";
import { CoverageScheduleDetail, PublishedScheduleDetail } from "./ReportsScheduleDetail";
import { ContractReviewDetail, LeaveImpactDetail, TimeReviewDetail } from "./ReportsReviewDetail";

const TITLES: Record<ReportsDetailKey, string> = {
  published: "Published schedule review",
  coverage: "Coverage and open work",
  leave: "Leave impact",
  time: "Time review",
  contracts: "Contracted vs scheduled",
};

function DetailContent({ detail, data }: { detail: ReportsDetailKey; data: ReportsPageData }) {
  if (detail === "published") return <PublishedScheduleDetail weeks={data.weeks} />;
  if (detail === "coverage") return <CoverageScheduleDetail rows={data.coverageRows} />;
  if (detail === "leave") return <LeaveImpactDetail rows={data.leaveImpacts} />;
  if (detail === "time") return <TimeReviewDetail weeks={data.weeks} />;
  return <ContractReviewDetail rows={data.contractReviews} />;
}

export function InsightDetailDrawer({
  detail,
  data,
  onOpenChange,
}: {
  detail: ReportsDetailKey | null;
  data: ReportsPageData;
  onOpenChange: (open: boolean) => void;
}) {
  if (!detail) return null;
  return (
    <DrawerShell
      open
      onOpenChange={onOpenChange}
      title={TITLES[detail]}
      description={`${periodLabel(data.meta.periodStart, data.meta.periodEnd)} · workspace timezone ${data.meta.workspaceTimezone}`}
      meta={<StatusBadge tone="brand">Live</StatusBadge>}
      footer={
        <div className="flex w-full justify-end">
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
        </div>
      }
      width="lg"
    >
      <DetailContent detail={detail} data={data} />
    </DrawerShell>
  );
}
