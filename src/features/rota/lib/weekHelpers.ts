const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function currentWeekStart(): Date {
  return new Date(2026, 5, 8);
}

function weekStart(offset: number): Date {
  const base = currentWeekStart();
  const d = new Date(base);
  d.setDate(base.getDate() + offset * 7);
  return d;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDayLabels(offset: number): string[] {
  const start = weekStart(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return `${DAY_NAMES[i]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  });
}

export function getWeekStartIso(offset: number): string {
  return toIsoDate(weekStart(offset));
}

export function getWeekDateIsoLabels(offset: number): string[] {
  const start = weekStart(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toIsoDate(d);
  });
}

export function getCurrentWeekDayIndex(offset: number): number | null {
  if (offset !== 0) return null;
  return 3;
}

export function getWeekLabel(offset: number): string {
  const start = weekStart(offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
}
