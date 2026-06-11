const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoParts(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

export function leaveDaysInclusive(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function formatLeaveRange(startIso: string, endIso: string): string {
  const start = isoParts(startIso);
  const end = isoParts(endIso);
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} – ${end.day} ${MONTHS[start.month - 1]} ${start.year}`;
  }
  return `${start.day} ${MONTHS[start.month - 1]} ${start.year} – ${end.day} ${MONTHS[end.month - 1]} ${end.year}`;
}

export function leaveRangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  return firstStart <= secondEnd && secondStart <= firstEnd;
}

export function leaveRangeDaysInMonth(
  startIso: string,
  endIso: string,
  year: number,
  month: number,
): number[] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  if (!leaveRangesOverlap(startIso, endIso, first, last)) return [];
  const start = Math.max(1, isoParts(startIso).month === month ? isoParts(startIso).day : 1);
  const end = Math.min(lastDay, isoParts(endIso).month === month ? isoParts(endIso).day : lastDay);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
