import { addIsoDays, weekStartForOffset } from "@/features/rota/lib/liveRotaDates";
import type { ReportsPeriodPreset } from "../types";

export function buildReportsPeriod({
  timezone,
  rotaStartWeekday,
  preset,
  now = new Date(),
}: {
  timezone: string;
  rotaStartWeekday: number;
  preset: ReportsPeriodPreset;
  now?: Date;
}): { startDate: string; endDate: string } {
  const currentWeek = weekStartForOffset(timezone, 0, rotaStartWeekday, now);
  const startDate = preset === "four_weeks" ? addIsoDays(currentWeek, -21) : currentWeek;
  return { startDate, endDate: addIsoDays(currentWeek, 6) };
}

function dateParts(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  return {
    day: date.getUTCDate(),
    month: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(date),
    year: date.getUTCFullYear(),
  };
}

export function periodLabel(startIso: string, endIso: string): string {
  const start = dateParts(startIso);
  const end = dateParts(endIso);
  const startLabel = `${start.day} ${start.month}${start.year === end.year ? "" : ` ${start.year}`}`;
  return `${startLabel} – ${end.day} ${end.month} ${end.year}`;
}

export function shortWeekLabel(startIso: string): string {
  const start = dateParts(startIso);
  return `${start.day} ${start.month}`;
}
