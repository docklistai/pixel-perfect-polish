import { diagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import {
  dateAvailabilityExclusion,
  HARD_EXCLUSION_LABEL,
  type AvailabilityFacts,
} from "@/features/rota/lib/scheduling/eligibility";
import type { ShiftSignature } from "@/features/rota/lib/scheduling/shiftSignature";

/**
 * What recorded absence means for one imported row.
 *
 * Build the Week and schedule import ask the same eligibility authority
 * (`dateAvailabilityExclusion`) and get the same answer; they differ in what
 * they do with it, because they are not the same act:
 *
 * - **Build** is automatic scheduling. It picks people, so an undecided leave
 *   request is a hard exclusion — the planner must not quietly schedule over a
 *   request the manager has not answered yet.
 * - **Import** is an explicit manager instruction. The manager wrote that name
 *   against that day. Approved leave is *decided* absence and still refuses the
 *   row; pending leave is an *undecided request*, so the manager is told and
 *   left to decide.
 *
 * The wording comes from `HARD_EXCLUSION_LABEL`, the same phrasing Build uses
 * when it explains why somebody was passed over, so a manager reads one
 * vocabulary across both surfaces.
 */

/** The half of a signature that places a shift on the calendar. */
function intervalOf(signature: ShiftSignature) {
  return {
    workDate: signature.workDate,
    start: signature.startLocal,
    end: signature.endLocal,
  };
}

/**
 * The diagnostic this row earns from recorded absence, or null when it earns none.
 *
 * `severity: "error"` is what makes a row blocked — `analyseRows` treats it
 * exactly as it treats an unreadable date or an unknown staff name, so the row
 * is listed with its reason and produces no operation. `severity: "warning"`
 * leaves the row importable and merely annotated.
 *
 * Only rows naming a real person can collide: an open shift belongs to nobody,
 * and callers pass `staffId: null` for one.
 *
 * Recurring days off and one-off unavailability are deliberately NOT surfaced
 * here. The apply boundary still refuses them for an import, so they remain the
 * same late-refusal shape this function fixes for leave — see the completion
 * report's deferred findings. Extending to them is a product decision that has
 * not been taken, not an oversight to quietly correct.
 */
export function absenceDiagnosticForImportedRow({
  staffId,
  staffName,
  signature,
  availability,
  position,
}: {
  staffId: string | null;
  staffName: string;
  signature: ShiftSignature;
  availability: AvailabilityFacts;
  position: { row?: number; column?: number };
}): ParseDiagnostic | null {
  if (staffId === null) return null;

  const exclusion = dateAvailabilityExclusion(staffId, intervalOf(signature), availability);
  if (exclusion !== "approved-leave" && exclusion !== "pending-leave") return null;

  const reason = HARD_EXCLUSION_LABEL[exclusion];
  return exclusion === "approved-leave"
    ? diagnostic(
        "staff-unavailable",
        "error",
        `${staffName} ${reason} on a day this shift covers, so it will not be imported. Cancel the leave, or import this shift as open by clearing the staff column.`,
        position,
      )
    : diagnostic(
        "staff-unavailable",
        "warning",
        `${staffName} ${reason} covering a day this shift does. It will still be imported — decide the request in Leave if that is wrong.`,
        position,
      );
}
