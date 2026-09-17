import { CalendarClock, CircleAlert, Clock3, Plane } from "lucide-react";
import type { ReportsPageData, ReportsPublicationStatus, ReportsTone } from "../types";
import { formatMinutes } from "./reportsFormat";
import { shortWeekLabel } from "./reportsPeriod";

export { buildReviewPoints, QUICK_REPORTS } from "./reportsReview";
export { formatMinutes } from "./reportsFormat";

export function buildReportsKpis(data: ReportsPageData) {
  return [
    {
      label: "Scheduled hours",
      value: formatMinutes(data.totals.scheduledMinutes),
      sub: `${data.totals.assignedShifts} assigned shifts · breaks deducted`,
      icon: CalendarClock,
      tone: "brand" as ReportsTone,
    },
    {
      label: "Open work",
      value: String(data.totals.openShifts),
      sub: `${formatMinutes(data.totals.openMinutes)} open · published rota only`,
      icon: CircleAlert,
      tone: "warning" as ReportsTone,
    },
    {
      label: "Approved worked hours",
      value: formatMinutes(data.totals.approvedWorkedMinutes),
      sub: `${data.totals.approvedEntries} approved time entries`,
      icon: Clock3,
      tone: "info" as ReportsTone,
    },
    {
      label: "Pending leave",
      value: String(data.totals.pendingLeave),
      sub: "manager review queue",
      icon: Plane,
      tone: "purple" as ReportsTone,
    },
  ];
}

export function buildTrendPoints(data: ReportsPageData) {
  return data.weeks.map((week) => ({
    label: shortWeekLabel(week.weekStart),
    status: week.publicationStatus,
    scheduledHours: week.scheduledMinutes / 60,
    openHours: week.openMinutes / 60,
    ...week,
  }));
}

export function weekPublicationLabel(status: ReportsPublicationStatus): string {
  if (status === "not_published") return "Not published";
  if (status === "partially_published") return "Partially published";
  return "Published";
}

export interface ScheduledVsWorkedSummary {
  /** True when at least one week in the period has a published rota snapshot. */
  hasPublishedWeek: boolean;
  /** Published scheduled hours, formatted as e.g. "160h 00m". */
  scheduledHours: string;
  /** Raw scheduled minutes from published snapshots. */
  scheduledMinutes: number;
  /** Approved worked hours, formatted as e.g. "152h 30m". */
  approvedWorkedHours: string;
  /** Raw approved worked minutes. */
  approvedWorkedMinutes: number;
  /** Exact count of time entries awaiting review (pending). */
  awaitingReviewCount: number;
  /** Exact count of approved time entries. */
  approvedEntriesCount: number;
}

export function buildScheduledVsWorkedSummary(data: ReportsPageData): ScheduledVsWorkedSummary {
  const hasPublishedWeek = data.weeks.some(
    (w) => w.publicationStatus === "published" || w.publicationStatus === "partially_published",
  );

  return {
    hasPublishedWeek,
    scheduledHours: formatMinutes(data.totals.scheduledMinutes),
    scheduledMinutes: data.totals.scheduledMinutes,
    approvedWorkedHours: formatMinutes(data.totals.approvedWorkedMinutes),
    approvedWorkedMinutes: data.totals.approvedWorkedMinutes,
    awaitingReviewCount: data.totals.awaitingReviewEntries,
    approvedEntriesCount: data.totals.approvedEntries,
  };
}
