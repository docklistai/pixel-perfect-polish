/** Largest week offset the live rota read accepts (mirrors rotaLiveData's validator). */
export const MAX_ROTA_WEEK_OFFSET = 260;

export interface RotaSearch {
  /** Optional deep-link week offset relative to the current week (0 = this week). */
  week?: number;
}

/**
 * Parse the optional `?week=` deep-link offset for the rota route. Accepts an
 * integer in [-260, 260]; anything else — missing, non-numeric, fractional, or
 * out of range — is dropped so navigation never throws and the rota simply
 * falls back to its default week. Pure and framework-agnostic for easy testing.
 */
export function parseRotaWeekSearch(search: Record<string, unknown>): RotaSearch {
  const raw = search.week;
  let num = NaN;
  if (typeof raw === "number") num = raw;
  else if (typeof raw === "string" && raw.trim() !== "") num = Number(raw);
  if (!Number.isInteger(num) || num < -MAX_ROTA_WEEK_OFFSET || num > MAX_ROTA_WEEK_OFFSET) {
    return {};
  }
  return { week: num };
}
