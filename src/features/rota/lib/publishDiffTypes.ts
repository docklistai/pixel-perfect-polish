import type { RotaDayIndex } from "../types";

/**
 * The vocabulary of the publish change review, kept apart from both the
 * comparison (`publishDiff.ts`) and its wording (`publishDiffFormat.ts`) so
 * neither has to import the other.
 */

/** A shift reduced to the fields a manager would recognise as "the same shift". */
export interface PublishDiffShift {
  /** `shifts.id` / `published_rota_shifts.source_shift_id`. */
  id: string;
  dayIndex: RotaDayIndex;
  staffId: string | null;
  /** Null for an open shift, or when the name could not be resolved. */
  staffName: string | null;
  role: string;
  /** 24-hour HH:MM. */
  start: string;
  /** 24-hour HH:MM. May be at or before `start` when the shift runs overnight. */
  end: string;
  breakMinutes: number;
  departmentName: string | null;
}

/** One field that differs between the published row and the current draft. */
export interface PublishDiffFieldChange {
  label: string;
  from: string;
  to: string;
}

export type PublishDiffEntry =
  | { kind: "added"; shift: PublishDiffShift }
  | { kind: "removed"; shift: PublishDiffShift }
  | {
      kind: "changed";
      before: PublishDiffShift;
      after: PublishDiffShift;
      changes: PublishDiffFieldChange[];
    };

export interface PublishDiff {
  entries: PublishDiffEntry[];
  totals: { added: number; removed: number; changed: number };
  /**
   * Distinct staff who hold a shift on either side of a difference.
   *
   * Deliberately not a claim about who will be notified — that is the publish
   * RPC's decision. Open shifts contribute nobody, which is why an open-shift
   * change can legitimately report zero affected staff.
   */
  affectedStaffCount: number;
  /** True when this week has never been published, so everything reads as new. */
  isFirstPublish: boolean;
  /** True when nothing differs — the settled state after a publish. */
  isUnchanged: boolean;
}
