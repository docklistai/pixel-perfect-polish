import type { OpenShiftFillSummary } from "./rotaSuggestions";

/**
 * Manager-facing read-back of an open-shift fill. It states what was assigned
 * and, for anything left open, why — never that the rota is optimal or finished.
 */
export function buildFillSummaryMessage(result: OpenShiftFillSummary): string {
  const filled = result.suggestions.length;
  const gaps = result.unfilled;

  const filledPart =
    filled > 0
      ? `${filled} open shift${filled === 1 ? "" : "s"} assigned in the draft.`
      : "No open shifts could be filled.";

  if (gaps.length === 0) {
    return filled > 0 ? `${filledPart} Review before publishing.` : filledPart;
  }

  const reasons = [...new Set(gaps.map((gap) => gap.reason))];
  const shown = reasons.slice(0, 3).join(" ");
  const more = reasons.length > 3 ? ` (+${reasons.length - 3} more)` : "";

  return `${filledPart} ${gaps.length} still open — ${shown}${more}`.trim();
}
