import type { ShiftSignature } from "./shiftSignature";
import type {
  AvailabilityFacts,
  CommittedShift,
  HardExclusion,
  StaffSchedulingFact,
} from "./eligibility";

/**
 * The one object Build the Week produces, reviews and applies.
 *
 * Preview renders this and computes nothing of its own; apply sends this back
 * untouched. That is what makes "what the manager reviewed is what gets written"
 * structural rather than a matter of discipline — there is no second computation
 * that could drift from the first.
 */

export type DemandSourceKind = "template" | "previous-week-pattern" | "current-week";

export type DemandSourceRef = {
  kind: DemandSourceKind;
  /** Template id, or the source week's id. Absent for the current week. */
  id?: string;
  /** What the manager chose, for the review header and the audit event. */
  label: string;
};

/** One required shift shape and how many of it the week needs. */
export type DemandRequirement = {
  signature: ShiftSignature;
  required: number;
  /**
   * The role as a manager wrote it ("Head Chef").
   *
   * The signature carries `roleKey`, which is normalized for identity and is
   * therefore lowercased. Storing that as the shift's role would put "head chef"
   * on the grid. Identity and display are deliberately separate values.
   */
  roleName: string;
};

/** An existing draft shift, reduced to what planning needs. */
export type ExistingShiftFact = {
  id: string;
  signature: ShiftSignature;
  staffId: string | null;
  /** Presentation carried onto anything created from this shift. */
  colourOverride?: string;
  deptOverride?: string;
};

/**
 * Operations the apply RPC will validate and perform.
 *
 * There is deliberately **no delete and no update-assigned kind**. "Never delete
 * an existing shift" and "never alter an existing assigned shift" are enforced by
 * the absence of a way to express either, not by a rule someone has to remember.
 */
export type ProposalOperation =
  | { kind: "create-open"; signature: ShiftSignature; roleName: string; reason: string }
  | {
      kind: "create-assigned";
      signature: ShiftSignature;
      roleName: string;
      staffId: string;
      reason: string;
    }
  | {
      kind: "assign-open";
      shiftId: string;
      staffId: string;
      /**
       * The signature the shift had when the proposal was built. The apply RPC
       * re-derives it and refuses on mismatch, which proves the shift being
       * assigned is the one the manager reviewed — id and status alone are not
       * enough once identical shifts are legitimate.
       */
      expected: ShiftSignature;
      reason: string;
    };

export type ProposalWarningCode =
  /** The week already holds more of this shape than the source asks for. */
  | "excess-demand"
  /** An existing assignment clashes with leave or availability. Never touched. */
  | "existing-assignment-clash"
  /** Demand names a role no active staff member holds. */
  | "unstaffable-role";

export type ProposalWarning = {
  code: ProposalWarningCode;
  message: string;
  signature?: ShiftSignature;
  shiftId?: string;
  staffId?: string;
};

/** An open shift nobody eligible could take, with why. */
export type UnresolvedOpenShift = {
  signature: ShiftSignature;
  /** Present for an existing shift; absent for one this proposal would create. */
  shiftId?: string;
  reason: string;
  /** Counts per exclusion, so the review can show the breakdown. */
  exclusions: { kind: HardExclusion; count: number }[];
};

export type ProposedAssignment = {
  staffId: string;
  staffName: string;
  signature: ShiftSignature;
  /** Absent when the shift is also being created by this proposal. */
  shiftId?: string;
  reason: string;
};

export type DemandGroup = {
  signature: ShiftSignature;
  /** How many of this shape the proposal will create. */
  create: number;
  /** How many already exist, assigned or open. */
  existing: number;
  required: number;
};

/** What Build will not touch — stated positively so a manager can trust it. */
export type PreservedSummary = {
  assignedShifts: number;
  openShifts: number;
  /** Existing shifts this proposal would assign someone to. */
  openShiftsBeingAssigned: number;
};

export type BuildWeekProposalBody = {
  operations: ProposalOperation[];
  sections: {
    missingDemand: DemandGroup[];
    proposedAssignments: ProposedAssignment[];
    preserved: PreservedSummary;
    unresolvedOpen: UnresolvedOpenShift[];
  };
  warnings: ProposalWarning[];
  explanations: string[];
};

export type BuildWeekPlannerInput = {
  /** ISO dates for the seven columns, in order. */
  dayIsoDates: string[];
  locationId: string;
  source: DemandSourceRef;
  demand: DemandRequirement[];
  existingShifts: ExistingShiftFact[];
  staff: StaffSchedulingFact[];
  availability: AvailabilityFacts;
  /**
   * Shifts these staff already hold **outside** the week being built: an
   * adjacent week, or another location in the same workspace.
   *
   * The apply RPC checks interval overlap against every shift the person holds
   * in the workspace, with no week or location filter. Without this list the
   * planner would happily propose an assignment the database then refuses —
   * and because the planner is deterministic, "Build it again" would produce
   * exactly the same refusal. Supplying it is what keeps
   * "planner-accepted implies SQL-valid" true.
   *
   * Hard-exclusion input only. It is deliberately not counted toward the
   * load-balancing signal, because the load being spread is this week's.
   */
  externalCommitments?: CommittedShift[];
};

/**
 * Bumped whenever planner semantics change, so a proposal built by an older
 * deploy is rejected rather than applied under new rules.
 */
export const PLANNER_RULE_VERSION = "build-week/1";
