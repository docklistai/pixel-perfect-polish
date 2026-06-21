/**
 * The single source of truth for whether a timesheet row may be approved.
 * Individual, selected, suggested, and bulk approvals all flow through these
 * helpers so the rules can never drift between entry points. A row is approvable
 * only when it is in the review period, currently pending, has a clock-in and
 * clock-out, and carries no unresolved exception or flag.
 */

import type { StoredTimesheetRow } from "../types";

export type EligibilityReason =
  | "ok"
  | "out-of-period"
  | "already-approved"
  | "rejected"
  | "incomplete"
  | "exception";

export type ExcludedReason = Exclude<EligibilityReason, "ok">;

/** Why a single row can or cannot be approved. Order = reporting priority. */
export function approvalEligibility(row: StoredTimesheetRow, inPeriod = true): EligibilityReason {
  if (!inPeriod) return "out-of-period";
  if (row.status === "approved") return "already-approved";
  if (row.status === "unapproved") return "rejected";
  if (row.in === "—" || row.out === "—" || row.paid === "—") return "incomplete";
  if (row.exc !== "—" || row.flagged) return "exception";
  return "ok";
}

export function isApprovable(row: StoredTimesheetRow, inPeriod = true): boolean {
  return approvalEligibility(row, inPeriod) === "ok";
}

/** Short reason shown when an individual approval is blocked. */
export const REASON_LABEL: Record<ExcludedReason, string> = {
  "out-of-period": "outside the review period",
  "already-approved": "already approved",
  rejected: "returned for correction",
  incomplete: "missing a clock-in or clock-out",
  exception: "has an unresolved exception",
};

/** Plural reason used in excluded-count summaries. */
const SUMMARY_LABEL: Record<ExcludedReason, string> = {
  "out-of-period": "outside this period",
  "already-approved": "already approved",
  rejected: "returned for correction",
  incomplete: "incomplete",
  exception: "with exceptions",
};

export interface ApprovalPartition {
  eligible: StoredTimesheetRow[];
  excluded: Array<{ row: StoredTimesheetRow; reason: ExcludedReason }>;
}

/**
 * Split rows into those that may be approved and those that may not, with the
 * reason for each exclusion. `inPeriod` lets callers fold period scoping in;
 * when rows are already period-scoped the default (always in-period) is fine.
 */
export function partitionForApproval(
  rows: StoredTimesheetRow[],
  inPeriod: (row: StoredTimesheetRow) => boolean = () => true,
): ApprovalPartition {
  const eligible: StoredTimesheetRow[] = [];
  const excluded: ApprovalPartition["excluded"] = [];
  for (const row of rows) {
    const reason = approvalEligibility(row, inPeriod(row));
    if (reason === "ok") eligible.push(row);
    else excluded.push({ row, reason });
  }
  return { eligible, excluded };
}

/**
 * Shared toast copy for a bulk approval so demo and live paths stay identical:
 * `empty` true means nothing was approvable and `description` explains why.
 */
export function describeBulkApproval(
  eligible: StoredTimesheetRow[],
  excluded: ApprovalPartition["excluded"],
): { empty: boolean; description: string } {
  if (eligible.length === 0) {
    return {
      empty: true,
      description: excluded.length
        ? `All entries are ${excludedSummary(excluded)}.`
        : "No eligible entries to approve.",
    };
  }
  const skipped = excluded.length ? ` (${excludedSummary(excluded)} skipped)` : "";
  return {
    empty: false,
    description: `${eligible.length} timesheet${eligible.length === 1 ? "" : "s"} approved${skipped}.`,
  };
}

/** "2 incomplete, 1 already approved" — empty string when nothing excluded. */
export function excludedSummary(excluded: ApprovalPartition["excluded"]): string {
  if (excluded.length === 0) return "";
  const counts = new Map<ExcludedReason, number>();
  for (const { reason } of excluded) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts.entries()].map(([reason, n]) => `${n} ${SUMMARY_LABEL[reason]}`).join(", ");
}

/** The first `limit` rows safe to approve — drives the "clean pending" nudge. */
export function suggestedApprovals(
  rows: StoredTimesheetRow[],
  inPeriod = true,
  limit = 3,
): StoredTimesheetRow[] {
  return rows.filter((row) => isApprovable(row, inPeriod)).slice(0, limit);
}
