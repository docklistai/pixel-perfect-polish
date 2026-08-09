import type { BoundaryOverlap } from "../api/boundaryOverlaps";
import type { ConflictSummary, DraftShift, ShiftId, StaffMember } from "../types";
import { formatShiftTime } from "./draftRota";

/**
 * Conflicts between the week on screen and assigned shifts outside it.
 *
 * The overlap decision is NOT made here — it is made server-side on raw
 * `timestamptz` instants (`api/boundaryOverlaps.ts`) with the same predicate
 * `rpc_publish_rota_week` uses, so the database and the publish dialog cannot
 * disagree. This module only turns settled overlaps into the conflict shapes
 * the existing UI already renders.
 *
 * ANCHORING. Every summary is keyed on the CURRENT-week shift id, because
 * `ConflictDrawer`'s "Review shift" resolves it against `displayShifts`
 * (`useRotaDraftController.selectedShift`). A summary keyed on the external
 * shift would open nothing.
 *
 * NO PAIR DE-DUPLICATION. `buildLocalConflictSummaries` filters
 * `base.id < overlapping.id` to emit one summary per in-week pair, where both
 * halves are present twice. Boundary pairs are produced once by construction
 * and only one half is in this week, so applying that filter would silently
 * drop every conflict whose external shift id happens to sort lower.
 */

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Sun 3 Aug" for an ISO date, read at midday UTC so no zone shifts the day. */
function isoDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return `${WEEKDAY_ABBR[date.getUTCDay()]} ${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`;
}

/** Unique CURRENT-week shifts touched by an external overlap. */
export function boundaryConflictShiftIds(overlaps: readonly BoundaryOverlap[]): Set<ShiftId> {
  return new Set(overlaps.map((overlap) => overlap.shiftId));
}

/** Marks current-week shifts that overlap something outside this week. */
export function withBoundaryConflictStatus(
  shifts: DraftShift[],
  overlaps: readonly BoundaryOverlap[],
): DraftShift[] {
  if (overlaps.length === 0) return shifts;
  const conflicted = boundaryConflictShiftIds(overlaps);
  return shifts.map((shift) => {
    // Open shifts keep their own status; they can never be a party to an
    // overlap, and overwriting it would misreport the row as scheduled.
    if (shift.staffId === null) return shift;
    return conflicted.has(shift.id) ? { ...shift, status: "conflict" } : shift;
  });
}

function whereClause(overlap: BoundaryOverlap): string {
  if (overlap.sameLocation) return "";
  return overlap.otherLocationName ? ` at ${overlap.otherLocationName}` : " at another location";
}

function weekClause(overlap: BoundaryOverlap): string {
  switch (overlap.side) {
    case "before":
      return "the previous rota week";
    case "after":
      return "the next rota week";
    case "same-dates":
      return "another rota";
  }
}

/**
 * One summary per affected CURRENT-week shift, never one per pair.
 *
 * `ConflictSummary.id` is the shift id and is used as the React key in
 * `ConflictDrawer`, so a shift overlapping two external shifts must still
 * produce a single row. That also keeps the drawer's count aligned with the
 * acknowledgement count, which counts affected shifts.
 */
export function buildBoundaryConflictSummaries(
  overlaps: readonly BoundaryOverlap[],
  shifts: DraftShift[],
  staff: StaffMember[],
  dayLabels: string[],
): ConflictSummary[] {
  const byShift = new Map<ShiftId, BoundaryOverlap[]>();
  for (const overlap of overlaps) {
    const group = byShift.get(overlap.shiftId);
    if (group) group.push(overlap);
    else byShift.set(overlap.shiftId, [overlap]);
  }

  return [...byShift].flatMap(([shiftId, group]) => {
    const shift = shifts.find((row) => row.id === shiftId);
    const first = group[0]!;
    if (!shift) return [];
    const staffName = staff.find((member) => member.id === first.staffMemberId)?.name ?? "Unknown";
    const otherWhen = `${isoDateLabel(first.otherShiftDate)} ${formatShiftTime(first.otherStart, first.otherEnd)}`;
    const extra = group.length - 1;

    return [
      {
        id: shiftId,
        staff: staffName,
        day: dayLabels[shift.dayIndex] ?? "",
        detail:
          `${shift.role} · ${formatShiftTime(shift.start, shift.end)} overlaps ${otherWhen}${whereClause(first)}` +
          (extra > 0 ? ` (+${extra} more)` : ""),
        cause:
          extra > 0
            ? `${staffName} is already scheduled for ${group.length} overlapping shifts outside this rota.`
            : `${staffName} is already scheduled${whereClause(first)} in ${weekClause(first)}.`,
        guidance: "Review the times or assign one shift to another staff member.",
      },
    ];
  });
}
