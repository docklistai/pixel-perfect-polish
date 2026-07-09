/** Parsing/formatting for the manager-entered hourly rate field (pounds ⇄ pence). */

export type PayRateParseResult =
  | { ok: true; pence: number | null }
  | { ok: false; message: string };

export function formatPayRatePounds(pence: number | undefined): string {
  if (pence === undefined) return "";
  return Number.isInteger(pence / 100) ? String(pence / 100) : (pence / 100).toFixed(2);
}

/** Empty input clears the rate (fallback rate applies again). */
export function parsePayRateInput(raw: string): PayRateParseResult {
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (cleaned === "") return { ok: true, pence: null };
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 1000) {
    return { ok: false, message: "Hourly rate must be a £ amount between 0 and 1000." };
  }
  return { ok: true, pence: Math.round(value * 100) };
}
