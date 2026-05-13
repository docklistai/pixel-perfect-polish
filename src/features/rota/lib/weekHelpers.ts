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

const BASE_DATE = new Date(2025, 4, 12);

function weekStart(offset: number): Date {
  const d = new Date(BASE_DATE);
  d.setDate(BASE_DATE.getDate() + offset * 7);
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

export function getWeekLabel(offset: number): string {
  const start = weekStart(offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
}
