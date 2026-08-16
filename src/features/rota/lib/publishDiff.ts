import type { DraftShift } from "../types";
import type {
  PublishDiff,
  PublishDiffEntry,
  PublishDiffFieldChange,
  PublishDiffShift,
} from "./publishDiffTypes";
import {
  assignmentLabel,
  dayLabelFor,
  DEPARTMENT_UNSET,
  formatShiftTimeRange,
} from "./publishDiffFormat";

/**
 * What changed in this rota week since the last publication.
 *
 * PRESENTATION ONLY. This module reads two sets of facts that already exist —
 * the manager's current draft shifts and the rows of the latest published
 * snapshot — and describes the difference between them. It decides nothing:
 * publish eligibility, conflict authority and notification targeting are all
 * settled elsewhere and are not consulted here.
 *
 * WHY IDENTITY IS THE SOURCE SHIFT ID. `published_rota_shifts.source_shift_id`
 * is the `shifts.id` the row was published from, and `DraftShift.id` is that
 * same id. Matching on it is what lets an edited shift read as one `changed`
 * entry rather than an unrelated add and remove. A snapshot row whose source
 * shift no longer exists is a removal, which is exactly what a hard-deleted
 * draft shift should look like.
 *
 * WHY DAY LABELS ARE INJECTED. `dayIndex` is an offset from the week's start,
 * and a workspace may start its week on any day, so there is no fixed mapping
 * from index to weekday name. The caller passes the labels it is already
 * rendering in the grid, which keeps this module pure and keeps one vocabulary
 * on screen.
 */

export type {
  PublishDiff,
  PublishDiffEntry,
  PublishDiffFieldChange,
  PublishDiffShift,
} from "./publishDiffTypes";
export { describePublishDiffShift, formatShiftTimeRange } from "./publishDiffFormat";

function compareShifts(
  before: PublishDiffShift,
  after: PublishDiffShift,
  dayLabels: readonly string[],
): PublishDiffFieldChange[] {
  const changes: PublishDiffFieldChange[] = [];
  // Assignment covers all four transitions in one row: reassignment,
  // assigned → open, open → assigned, and open → open (which never differs).
  if (before.staffId !== after.staffId) {
    changes.push({
      label: "Assignment",
      from: assignmentLabel(before),
      to: assignmentLabel(after),
    });
  }
  if (before.dayIndex !== after.dayIndex) {
    changes.push({
      label: "Day",
      from: dayLabelFor(before.dayIndex, dayLabels),
      to: dayLabelFor(after.dayIndex, dayLabels),
    });
  }
  if (before.start !== after.start || before.end !== after.end) {
    changes.push({
      label: "Time",
      from: formatShiftTimeRange(before.start, before.end),
      to: formatShiftTimeRange(after.start, after.end),
    });
  }
  if (before.role !== after.role) {
    changes.push({ label: "Role", from: before.role, to: after.role });
  }
  if ((before.departmentName ?? null) !== (after.departmentName ?? null)) {
    changes.push({
      label: "Department",
      from: before.departmentName ?? DEPARTMENT_UNSET,
      to: after.departmentName ?? DEPARTMENT_UNSET,
    });
  }
  if (before.breakMinutes !== after.breakMinutes) {
    changes.push({
      label: "Break",
      from: `${before.breakMinutes} min`,
      to: `${after.breakMinutes} min`,
    });
  }
  return changes;
}

/** Projects a live draft shift onto the comparable shape. */
export function draftShiftToDiffShift(
  shift: DraftShift,
  staffNames: ReadonlyMap<string, string>,
): PublishDiffShift {
  return {
    id: shift.id,
    dayIndex: shift.dayIndex,
    staffId: shift.staffId,
    staffName: shift.staffId === null ? null : (staffNames.get(shift.staffId) ?? null),
    role: shift.role,
    start: shift.start,
    end: shift.end,
    breakMinutes: shift.breakMinutes,
    departmentName: shift.departmentName ?? null,
  };
}

export function buildPublishDiff({
  draft,
  published,
  isFirstPublish,
  dayLabels,
}: {
  draft: readonly PublishDiffShift[];
  published: readonly PublishDiffShift[];
  isFirstPublish: boolean;
  dayLabels: readonly string[];
}): PublishDiff {
  const publishedById = new Map(published.map((shift) => [shift.id, shift]));
  const draftIds = new Set(draft.map((shift) => shift.id));
  const entries: PublishDiffEntry[] = [];
  const affectedStaff = new Set<string>();

  const touch = (shift: PublishDiffShift) => {
    if (shift.staffId !== null) affectedStaff.add(shift.staffId);
  };

  for (const shift of draft) {
    const previous = publishedById.get(shift.id);
    if (!previous) {
      entries.push({ kind: "added", shift });
      touch(shift);
      continue;
    }
    const changes = compareShifts(previous, shift, dayLabels);
    if (changes.length === 0) continue;
    entries.push({ kind: "changed", before: previous, after: shift, changes });
    touch(previous);
    touch(shift);
  }

  for (const shift of published) {
    if (draftIds.has(shift.id)) continue;
    entries.push({ kind: "removed", shift });
    touch(shift);
  }

  const totals = {
    added: entries.filter((entry) => entry.kind === "added").length,
    removed: entries.filter((entry) => entry.kind === "removed").length,
    changed: entries.filter((entry) => entry.kind === "changed").length,
  };

  return {
    entries,
    totals,
    affectedStaffCount: affectedStaff.size,
    isFirstPublish,
    isUnchanged: entries.length === 0,
  };
}
