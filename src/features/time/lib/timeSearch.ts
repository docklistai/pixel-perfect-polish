const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface TimeSearch {
  /** Inclusive ISO start date of the review period (YYYY-MM-DD). */
  start?: string;
  /** Inclusive ISO end date of the review period (YYYY-MM-DD). */
  end?: string;
}

/**
 * Parse the optional `?start=` and `?end=` deep-link params for the time route.
 * Also accepts `startDate` and `endDate` aliases. Validates ISO YYYY-MM-DD strings.
 */
export function parseTimeSearch(search: Record<string, unknown>): TimeSearch {
  const result: TimeSearch = {};
  const rawStart = search.start ?? search.startDate;
  if (typeof rawStart === "string" && ISO_DATE_RE.test(rawStart)) {
    result.start = rawStart;
  }
  const rawEnd = search.end ?? search.endDate;
  if (typeof rawEnd === "string" && ISO_DATE_RE.test(rawEnd)) {
    result.end = rawEnd;
  }
  return result;
}
