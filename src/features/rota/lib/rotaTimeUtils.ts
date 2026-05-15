import { MAX_SHIFT_DURATION_MINUTES } from "./draftShiftCore";

export function parseHHMMToMinutes(value: string): number | null {
  const [hStr, mStr] = value.split(":");
  if (!hStr) return null;
  const hour = Number(hStr);
  const minute = mStr === undefined ? 0 : Number(mStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function getShiftDurationMinutes(start: string, end: string): number | null {
  const startMin = parseHHMMToMinutes(start);
  const endMin = parseHHMMToMinutes(end);
  if (startMin === null || endMin === null) return null;

  let duration = endMin - startMin;
  if (duration < 0) duration += 24 * 60;
  if (duration === 0) return null;

  return duration;
}

export function isValidShiftTimeRange(start: string, end: string): boolean {
  const duration = getShiftDurationMinutes(start, end);
  return duration !== null && duration <= MAX_SHIFT_DURATION_MINUTES;
}

export function shiftHours(start: string, end: string): number {
  const duration = getShiftDurationMinutes(start, end);
  if (duration === null || duration > MAX_SHIFT_DURATION_MINUTES) return 0;
  return duration / 60;
}

function formatTime(hhmm: string): string {
  const minutes = parseHHMMToMinutes(hhmm);
  if (minutes === null) return hhmm;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour >= 12 ? "pm" : "am";
  const display = ((hour + 11) % 12) + 1;
  return minute === 0
    ? `${display}${period}`
    : `${display}:${String(minute).padStart(2, "0")}${period}`;
}

export function formatShiftTime(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function isStartBeforeEnd(start: string, end: string): boolean {
  return isValidShiftTimeRange(start, end);
}
