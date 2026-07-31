import type { ShiftSignature } from "./shiftSignature";
import {
  compareCandidates,
  hardExclusionFor,
  scheduledMinutesFor,
  type AvailabilityFacts,
  type Candidate,
  type CommittedShift,
  type HardExclusion,
  type StaffSchedulingFact,
} from "./eligibility";
import type { LocalShiftTimes } from "./calendarInterval";
import type { ExistingShiftFact } from "./buildWeekProposal";

/**
 * Choosing one person for one slot.
 *
 * Split out of the planner so the planner reads as the *shape* of a build —
 * reconcile demand, offer slots, record what was preserved — and the question
 * "who takes this slot" has one place to live. Nothing here writes, and nothing
 * here can invent an operation kind.
 */

/** A slot that needs somebody: an existing open shift, or one being created. */
export type OpenSlot = {
  signature: ShiftSignature;
  /** Display role for a created shift; an existing shift keeps its own. */
  roleName: string;
  /** Present when the slot is an existing open shift. */
  shiftId?: string;
  /** Stable ordering key, so the assignment pass is deterministic. */
  order: string;
};

export type SlotOutcome =
  | { staff: StaffSchedulingFact }
  | { exclusions: Map<HardExclusion, number>; roleHolders: number };

export function timesOf(signature: ShiftSignature): LocalShiftTimes {
  return { workDate: signature.workDate, start: signature.startLocal, end: signature.endLocal };
}

export function committedFrom(shifts: readonly ExistingShiftFact[]): CommittedShift[] {
  const committed: CommittedShift[] = [];
  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    committed.push({ shiftId: shift.id, staffId: shift.staffId, times: timesOf(shift.signature) });
  }
  return committed;
}

export function chooseCandidate({
  slot,
  staff,
  committed,
  externalCommitments,
  availability,
}: {
  slot: OpenSlot;
  staff: readonly StaffSchedulingFact[];
  committed: readonly CommittedShift[];
  /**
   * Shifts this person already holds *outside* the week being built — an
   * adjacent week, or another location in the same workspace.
   *
   * They are hard-exclusion input only, never counted toward the load-balancing
   * signal, because the balance being spread is this week's work. Without them
   * the planner would propose an assignment the apply RPC then refuses, since
   * that RPC compares against every shift the person holds in the workspace.
   */
  externalCommitments: readonly CommittedShift[];
  availability: AvailabilityFacts;
}): SlotOutcome {
  const target = timesOf(slot.signature);
  const exclusions = new Map<HardExclusion, number>();
  const eligible: Candidate[] = [];
  let roleHolders = 0;
  const allCommitments =
    externalCommitments.length === 0 ? committed : [...committed, ...externalCommitments];

  for (const member of staff) {
    if (member.roleKey === slot.signature.roleKey && member.active) roleHolders += 1;
    const excluded = hardExclusionFor({
      staff: member,
      target,
      requiredRoleKey: slot.signature.roleKey,
      committed: allCommitments,
      availability,
      ...(slot.shiftId !== undefined ? { excludeShiftId: slot.shiftId } : {}),
    });
    if (excluded) {
      // Role mismatch is not a reason this shift is stuck — it just means this
      // person was never a candidate. Counting it would drown the real reasons.
      if (excluded !== "role-mismatch" && excluded !== "inactive") {
        exclusions.set(excluded, (exclusions.get(excluded) ?? 0) + 1);
      }
      continue;
    }
    eligible.push({ staff: member, scheduledMinutes: scheduledMinutesFor(member.id, committed) });
  }

  if (eligible.length === 0) return { exclusions, roleHolders };
  const best = [...eligible].sort((left, right) =>
    compareCandidates(left, right, slot.signature.departmentId),
  )[0]!;
  return { staff: best.staff };
}
