import { z } from "zod";
import type { ReportsPageData } from "../types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
const count = z.number().int().nonnegative();
const minutes = count;
const status = z.enum(["active", "inactive"]);
const option = z.object({ id: uuid, name: z.string(), status }).strict();

const totals = z
  .object({
    scheduledMinutes: minutes,
    assignedShifts: count,
    openShifts: count,
    openMinutes: minutes,
    approvedWorkedMinutes: minutes,
    approvedEntries: count,
    awaitingReviewEntries: count,
    pendingLeave: count,
    approvedLeaveAffectedShifts: count,
    approvedLeaveAffectedMinutes: minutes,
  })
  .strict();

const pageSchema = z
  .object({
    meta: z
      .object({
        source: z.literal("latest_published_snapshots"),
        workspaceTimezone: z.string().min(1),
        rotaStartWeekday: z.number().int().min(0).max(6),
        periodStart: isoDate,
        periodEnd: isoDate,
        currentWeekStart: isoDate,
        hourSemantics: z.literal("net_after_breaks"),
        shiftAttribution: z.literal("local_shift_start_date"),
        heatmapSemantics: z.literal("average_assigned_headcount_by_local_3_hour_bucket"),
        contractBasis: z.literal("exact_current_rota_week_only"),
      })
      .strict(),
    filters: z.object({ locationId: uuid.nullable(), departmentId: uuid.nullable() }).strict(),
    options: z.object({ locations: z.array(option), departments: z.array(option) }).strict(),
    totals,
    weeks: z.array(
      z
        .object({
          weekStart: isoDate,
          weekEnd: isoDate,
          publicationStatus: z.enum(["published", "partially_published", "not_published"]),
          publishedLocations: count,
          expectedLocations: count,
          scheduledMinutes: minutes,
          assignedShifts: count,
          openShifts: count,
          openMinutes: minutes,
          approvedWorkedMinutes: minutes,
          awaitingReviewEntries: count,
        })
        .strict(),
    ),
    departmentHours: z.array(
      z
        .object({
          id: uuid,
          name: z.string(),
          status,
          scheduledMinutes: minutes,
          assignedShifts: count,
        })
        .strict(),
    ),
    heatmap: z.array(
      z
        .object({
          weekday: z.number().int().min(0).max(6),
          bucketStartHour: z.number().int().min(0).max(23),
          bucketEndHour: z.number().int().min(1).max(24),
          averageHeadcount: z.number().nonnegative(),
        })
        .strict(),
    ),
    leaveImpacts: z.array(
      z
        .object({
          leaveRequestId: uuid,
          staffName: z.string(),
          leaveType: z.enum(["annual_leave", "personal", "sick", "unpaid", "other"]),
          startDate: isoDate,
          endDate: isoDate,
          affectedShifts: count,
          affectedMinutes: minutes,
        })
        .strict(),
    ),
    contractReviews: z.array(
      z
        .object({
          staffMemberId: uuid,
          staffName: z.string(),
          contractedMinutes: minutes,
          scheduledMinutes: minutes,
          differenceMinutes: minutes,
          basis: z.literal("current_contract"),
        })
        .strict(),
    ),
    coverageRows: z.array(
      z
        .object({
          date: isoDate,
          location: z.string(),
          department: z.string(),
          assignedShifts: count,
          openShifts: count,
          scheduledMinutes: minutes,
          openMinutes: minutes,
        })
        .strict(),
    ),
  })
  .strict();

export function normaliseReportsPage(raw: unknown): ReportsPageData {
  return pageSchema.parse(raw) as ReportsPageData;
}
