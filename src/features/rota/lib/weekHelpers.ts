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
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

function weekStart(offset: number): Date {
  const base = currentWeekStart();
  const d = new Date(base);
  d.setDate(base.getDate() + offset * 7);
  return d;
}

export function getWeekDayLabels(offset: number): string[] {
  const start = weekStart(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return `${DAY_NAMES[i]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  });
}

export function getCurrentWeekDayIndex(offset: number): number | null {
  if (offset !== 0) return null;
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
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
