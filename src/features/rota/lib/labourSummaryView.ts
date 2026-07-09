import type { LabourCostView } from "./labourCost";

export type LabourSummaryView = {
  /** "820h" style budget denominator plus where it came from. */
  budgetHours: number;
  budgetSource: "budget" | "contracted";
  /** Formatted money, or null when no honest estimate exists. */
  estCostLabel: string | null;
  labourPctLabel: string | null;
  targetPctLabel: string | null;
  statusTone: "ok" | "warning" | "danger";
  statusLabel: string;
  /** One short line explaining what is missing, when something is. */
  hint: string | null;
};

export function formatMoneyPence(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}

export function formatPct(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

/**
 * Derives the live labour summary presentation. Falls back to contracted
 * hours as the denominator when no weekly budget is set, and keeps the money
 * column honest (null) when there is no rate basis.
 */
export function buildLabourSummaryView({
  scheduledHours,
  contractedHours,
  labour,
}: {
  scheduledHours: number;
  contractedHours: number;
  labour: LabourCostView;
}): LabourSummaryView {
  const budgetSource = labour.budgetHours !== null ? "budget" : "contracted";
  const budgetHours = labour.budgetHours ?? contractedHours;

  const statusTone =
    labour.budgetState === "over"
      ? "danger"
      : labour.budgetState === "near"
        ? "warning"
        : budgetSource === "contracted" && scheduledHours > budgetHours && budgetHours > 0
          ? "warning"
          : "ok";
  const statusLabel =
    labour.budgetState === "over"
      ? "Over budget"
      : labour.budgetState === "near"
        ? "Approaching budget"
        : budgetSource === "contracted"
          ? scheduledHours > budgetHours && budgetHours > 0
            ? "Over contracted hours"
            : "Within contracted hours"
          : "Within budget";

  const hint =
    labour.estCostPence === null
      ? "Set an average hourly cost in Settings to see cost estimates."
      : labour.budgetHours === null
        ? "No weekly budget set — comparing against contracted hours."
        : null;

  return {
    budgetHours,
    budgetSource,
    estCostLabel: labour.estCostPence === null ? null : formatMoneyPence(labour.estCostPence),
    labourPctLabel: labour.labourPct === null ? null : formatPct(labour.labourPct),
    targetPctLabel:
      labour.targetLabourPct === null ? null : formatPct(labour.targetLabourPct),
    statusTone,
    statusLabel,
    hint,
  };
}
