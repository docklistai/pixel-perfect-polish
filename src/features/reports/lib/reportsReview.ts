import type { ReportsDetailKey, ReportsPageData, ReportsTone } from "../types";
import { formatMinutes } from "./reportsFormat";

export interface ReportsReviewPoint {
  id: string;
  title: string;
  body: string;
  tone: ReportsTone;
  detail: ReportsDetailKey;
}

export function buildReviewPoints(data: ReportsPageData): ReportsReviewPoint[] {
  const points: ReportsReviewPoint[] = [];
  if (data.totals.openShifts > 0) {
    const shiftLabel = data.totals.openShifts === 1 ? "shift" : "shifts";
    points.push({
      id: "open-work",
      title: `${data.totals.openShifts} published ${shiftLabel} still ${data.totals.openShifts === 1 ? "needs" : "need"} cover`,
      body: `${formatMinutes(data.totals.openMinutes)} of published work is open in this period.`,
      tone: "warning",
      detail: "coverage",
    });
  }
  if (data.totals.approvedLeaveAffectedShifts > 0) {
    const absenceLabel = data.leaveImpacts.length === 1 ? "absence" : "absences";
    const shiftLabel = data.totals.approvedLeaveAffectedShifts === 1 ? "shift" : "shifts";
    points.push({
      id: "leave-impact",
      title: `${data.leaveImpacts.length} approved ${absenceLabel} ${data.leaveImpacts.length === 1 ? "affects" : "affect"} ${data.totals.approvedLeaveAffectedShifts} published ${shiftLabel}`,
      body: `${formatMinutes(data.totals.approvedLeaveAffectedMinutes)} of assigned published work overlaps approved leave.`,
      tone: "purple",
      detail: "leave",
    });
  }
  if (data.totals.awaitingReviewEntries > 0) {
    const entryLabel = data.totals.awaitingReviewEntries === 1 ? "entry awaits" : "entries await";
    points.push({
      id: "time-review",
      title: `${data.totals.awaitingReviewEntries} time ${entryLabel} manager review`,
      body: "Open Time to approve, reject or adjust the underlying entries.",
      tone: "info",
      detail: "time",
    });
  }
  if (data.contractReviews.length > 0) {
    const comparisonLabel =
      data.contractReviews.length === 1 ? "comparison needs" : "comparisons need";
    points.push({
      id: "contracts",
      title: `${data.contractReviews.length} current-week contract ${comparisonLabel} review`,
      body: "Current contract values are compared with this current rota week only.",
      tone: "warning",
      detail: "contracts",
    });
  }
  return points;
}

export const QUICK_REPORTS: readonly {
  id: string;
  label: string;
  sub: string;
  detail: ReportsDetailKey | "approved_export";
}[] = [
  {
    id: "published",
    label: "Published schedule review",
    sub: "Latest snapshots by rota week",
    detail: "published",
  },
  {
    id: "coverage",
    label: "Coverage and open work",
    sub: "Assigned and open published shifts",
    detail: "coverage",
  },
  {
    id: "leave",
    label: "Leave impact",
    sub: "Approved absences affecting published work",
    detail: "leave",
  },
  {
    id: "time",
    label: "Time review",
    sub: "Approved hours and entries awaiting review",
    detail: "time",
  },
  {
    id: "approved",
    label: "Approved hours export",
    sub: "Open the existing Time export",
    detail: "approved_export",
  },
] as const;
