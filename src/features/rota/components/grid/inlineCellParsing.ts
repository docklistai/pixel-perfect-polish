import { isValidShiftTimeRange } from "../../lib/draftRota";

export type ParsedInlineShift = {
  start: string;
  end: string;
  role: string | null;
  breakMinutes: number | null;
  open: boolean;
};

export type InlineCellParseResult =
  | { kind: "clear"; all: boolean }
  | { kind: "shifts"; shifts: ParsedInlineShift[] }
  | { kind: "error"; message: string };

export type InlineCellParseOptions = {
  defaultRole?: string;
  roleOptions?: string[];
};

type ParsedTime = {
  value: string;
  hour: number;
  minute: number;
  hasPeriod: boolean;
  rawHour: number;
};

const TIME_PATTERN = String.raw`(?:\d{3,4}|\d{1,2}(?::|\.)\d{2}|\d{1,2})\s*(?:am|pm)?`;
const RANGE_PATTERN = new RegExp(
  String.raw`(${TIME_PATTERN})\s*(?:[-\u2013\u2014]|\bto\b|\btill\b|\buntil\b)\s*(${TIME_PATTERN})`,
  "i",
);

function normaliseToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseTimePart(value: string): ParsedTime | null {
  const cleaned = value.trim().toLowerCase().replace(".", ":").replace(/\s+/g, "");
  const compact = cleaned.match(/^(\d{1,2})(\d{2})(am|pm)?$/i);
  const colon = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
  const match = compact ?? colon;
  if (!match) return null;

  let hour = Number(match[1]);
  const rawHour = hour;
  const minute = match[2] ? Number(match[2]) : 0;
  const period = match[3]?.toLowerCase();
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (minute < 0 || minute > 59) return null;
  if (period && (hour < 1 || hour > 12)) return null;
  if (!period && (hour < 0 || hour > 23)) return null;
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  return {
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    hour,
    minute,
    hasPeriod: Boolean(period),
    rawHour,
  };
}

function inferEndTime(start: ParsedTime, end: ParsedTime): string {
  if (end.hasPeriod) return end.value;
  if (end.hour >= start.hour) return end.value;

  const shouldInferAfternoon = !start.hasPeriod && start.hour < 18 && end.rawHour <= 11;
  if (!shouldInferAfternoon) return end.value;

  const inferredHour = end.hour + 12;
  if (inferredHour > 23) return end.value;
  return `${String(inferredHour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`;
}

export function parseTimeRange(input: string): { start: string; end: string } | null {
  const match = input.match(RANGE_PATTERN);
  if (!match) return null;
  const start = parseTimePart(match[1]!);
  const parsedEnd = parseTimePart(match[2]!);
  if (!start || !parsedEnd) return null;

  const end = inferEndTime(start, parsedEnd);
  if (!isValidShiftTimeRange(start.value, end)) return null;
  return { start: start.value, end };
}

function extractBreakMinutes(input: string): { text: string; breakMinutes: number | null } {
  if (/\bno\s+break\b/i.test(input)) {
    return { text: input.replace(/\bno\s+break\b/gi, " "), breakMinutes: 0 };
  }
  const match = input.match(/\b(?:break|brk)\s*(\d{1,3})\b/i);
  if (!match) return { text: input, breakMinutes: null };
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240) {
    return { text: input, breakMinutes: null };
  }
  return { text: input.replace(match[0], " "), breakMinutes: minutes };
}

function resolveRole(text: string, options: InlineCellParseOptions): string | null {
  const compact = normaliseToken(text.replace(/\bovernight\b/gi, " "));
  if (!compact) return null;

  const roleOptions = options.roleOptions ?? [];
  const direct = roleOptions.find((role) => normaliseToken(role) === compact);
  if (direct) return direct;

  const contained = roleOptions.find((role) => {
    const roleKey = normaliseToken(role);
    return compact.includes(roleKey) || roleKey.includes(compact);
  });
  if (contained) return contained;

  return compact
    .split(" ")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function parseShiftSegment(
  input: string,
  options: InlineCellParseOptions,
): ParsedInlineShift | null {
  const open = /\b(open|unassigned)\b/i.test(input);
  const { text: withoutBreak, breakMinutes } = extractBreakMinutes(input);
  const rangeMatch = withoutBreak.match(RANGE_PATTERN);
  if (!rangeMatch) return null;

  const range = parseTimeRange(rangeMatch[0]);
  if (!range) return null;

  const roleText = withoutBreak
    .replace(rangeMatch[0], " ")
    .replace(/\b(open|unassigned|overnight)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...range,
    role: resolveRole(roleText, options),
    breakMinutes,
    open,
  };
}

export function parseInlineCellInput(
  input: string,
  options: InlineCellParseOptions = {},
): InlineCellParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "clear", all: false };

  if (/^(?:off|day off|no shift|clear|delete)$/i.test(trimmed)) {
    return { kind: "clear", all: false };
  }
  if (/^(?:clear|delete)\s+all$/i.test(trimmed)) {
    return { kind: "clear", all: true };
  }
  if (/^(?:open|unassigned)$/i.test(trimmed)) {
    return {
      kind: "shifts",
      shifts: [
        {
          start: "09:00",
          end: "17:00",
          role: options.defaultRole ?? null,
          breakMinutes: null,
          open: true,
        },
      ],
    };
  }

  const segments = trimmed
    .split(/\s*(?:\/|\+|,)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const parsed = segments.map((segment) => parseShiftSegment(segment, options));
  if (parsed.some((shift) => shift === null)) {
    return {
      kind: "error",
      message: "Use times like 9-5, 22:00-02:00, open 6pm-11pm bar, or 9-12 / 17-22.",
    };
  }

  return { kind: "shifts", shifts: parsed as ParsedInlineShift[] };
}
