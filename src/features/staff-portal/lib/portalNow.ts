import { DEMO_WORLD } from "@/features/demo/data/demoWorld";

export interface PortalNow {
  todayIso: string;
  nowMinutes: number;
  nowMs?: number;
}

export function portalNowInTimezone(timezone: string, now: Date = new Date()): PortalNow {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    todayIso: `${get("year")}-${get("month")}-${get("day")}`,
    nowMinutes: Number(hour) * 60 + Number(get("minute")),
    nowMs: now.getTime(),
  };
}

export const DEMO_NOW: PortalNow = {
  todayIso: DEMO_WORLD.todayIso,
  nowMinutes: DEMO_WORLD.nowMinutes,
};

export interface PortalWeekDay {
  iso: string;
  dayNum: number;
  letter: string;
}

const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function currentWeekStrip(now: PortalNow = DEMO_NOW): PortalWeekDay[] {
  const base = new Date(`${now.todayIso}T00:00:00Z`);
  const mondayOffset = (base.getUTCDay() + 6) % 7;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - mondayOffset);
  return WEEK_LETTERS.map((letter, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return { iso: day.toISOString().slice(0, 10), dayNum: day.getUTCDate(), letter };
  });
}
