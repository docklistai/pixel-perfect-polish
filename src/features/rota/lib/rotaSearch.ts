/** Largest week offset the live rota read accepts (mirrors rotaLiveData's validator). */
export const MAX_ROTA_WEEK_OFFSET = 260;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RotaSearch {
  /** Optional deep-link week offset relative to the current week (0 = this week). */
  week?: number;
  /** Optional deep-link rota location id (multi-location workspaces only). */
  location?: string;
}

/**
 * Parse the optional `?week=` and `?location=` deep-link params for the rota
 * route. `week` accepts an integer in [-260, 260]; `location` accepts a UUID.
 * Anything else — missing, non-numeric, fractional, out of range, or not a
 * UUID — is dropped so navigation never throws and the rota simply falls back
 * to its defaults. Pure and framework-agnostic for easy testing.
 */
export function parseRotaWeekSearch(search: Record<string, unknown>): RotaSearch {
  const result: RotaSearch = {};

  const raw = search.week;
  let num = NaN;
  if (typeof raw === "number") num = raw;
  else if (typeof raw === "string" && raw.trim() !== "") num = Number(raw);
  if (Number.isInteger(num) && num >= -MAX_ROTA_WEEK_OFFSET && num <= MAX_ROTA_WEEK_OFFSET) {
    result.week = num;
  }

  const rawLocation = search.location;
  if (typeof rawLocation === "string" && UUID_RE.test(rawLocation)) {
    result.location = rawLocation.toLowerCase();
  }

  return result;
}
