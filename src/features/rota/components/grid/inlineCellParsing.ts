function parseTimePart(t: string): string | null {
  const match = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = parseInt(match[1]!, 10);
  const min = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3]?.toLowerCase();
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseTimeRange(input: string): { start: string; end: string } | null {
  const parts = input.split(/[-–—]|to/i);
  if (parts.length !== 2) return null;
  const startStr = parseTimePart(parts[0]!);
  let endStr = parseTimePart(parts[1]!);
  if (!startStr || !endStr) return null;

  const startHr = parseInt(startStr.split(":")[0]!, 10);
  let endHr = parseInt(endStr.split(":")[0]!, 10);
  if (endHr < startHr && endHr < 12) {
    endHr += 12;
    endStr = `${String(endHr).padStart(2, "0")}:${endStr.split(":")[1]}`;
  }
  return { start: startStr, end: endStr };
}
