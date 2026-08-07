import { describe, expect, it } from "vitest";
import { importHeadedSchedule, type HeadedImportOptions } from "./headedScheduleImport";
import { parseInlineCellInput } from "@/features/rota/components/grid/inlineCellParsing";
import { buildInlineCellPreview } from "@/features/rota/components/grid/inlineCellPreview";
import {
  minutesFromHHMM,
  resolveTimePair,
} from "@/features/rota/lib/scheduling/shiftTimeVocabulary";
import { isOvernightLocal } from "@/features/rota/lib/scheduling/calendarInterval";

/**
 * Explicit times mean what they say, and one shift-length rule governs both
 * surfaces.
 *
 * Two rules meet in these cases and they are tested at the levels they belong
 * to. The *time contract* — what "09:00"–"02:00" means — is asserted against
 * `resolveTimePair`, which is the only thing that decides it. The *shift rule* —
 * whether a shift that long may be created at all — is asserted against the
 * import and the rota cell, which are what create shifts. An explicit overnight
 * range can therefore be preserved exactly and still be refused for running too
 * long, and those are two different answers to two different questions.
 *
 * Every case here starts before 18:00 on purpose. The afternoon inference was
 * short-circuited for a start at or after 18:00, so every overnight case that
 * existed before this correction — "22:00-02:00", "9pm-2am" — passed by
 * accident. A suite that kept to those starts would rebuild the same blind spot.
 */

const WEEK = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];

function options(overrides: Partial<HeadedImportOptions> = {}): HeadedImportOptions {
  return {
    dateOrder: "day-first",
    weekIsoDates: WEEK,
    locationId: "loc-1",
    staff: [{ id: "s1", name: "Ana Chef", active: true, roleName: "Chef" }],
    departments: [{ id: "dept-kitchen", name: "Kitchen", active: true }],
    defaultDepartmentId: "dept-kitchen",
    ...overrides,
  };
}

const HEADER = "Date,Staff,Role,Start,End";

/** One imported row, as start/end text. Staff is left blank: an open shift. */
function importedTimes(start: string, end: string) {
  return importHeadedSchedule([HEADER, `2026-08-03,,Chef,${start},${end}`].join("\n"), options())
    .rows[0]!;
}

/** Whether the rota cell accepts the same pair, and what it made of it. */
function inlineTimes(start: string, end: string) {
  const result = parseInlineCellInput(`${start}-${end} Chef`, { roleOptions: ["Chef"] });
  return result.kind === "shifts" ? result.shifts[0]! : null;
}

describe("an explicit 24-hour end is never moved into the afternoon", () => {
  it.each([
    ["09:00", "02:00", "09:00", "02:00"],
    ["09:00", "01:00", "09:00", "01:00"],
    ["10:00", "04:00", "10:00", "04:00"],
    ["12:00", "03:00", "12:00", "03:00"],
    ["17:00", "04:00", "17:00", "04:00"],
    ["09:00", "08:59", "09:00", "08:59"],
    ["0900", "0200", "09:00", "02:00"],
    ["1200", "0300", "12:00", "03:00"],
    ["1700", "0400", "17:00", "04:00"],
  ])('reads "%s"–"%s" as written', (start, end, expectedStart, expectedEnd) => {
    const resolved = resolveTimePair(start, end);

    expect(resolved).not.toBeNull();
    expect(resolved!.start).toBe(expectedStart);
    expect(resolved!.end).toBe(expectedEnd);
    expect(minutesFromHHMM(resolved!.start)).toBe(minutesFromHHMM(expectedStart));
    expect(minutesFromHHMM(resolved!.end)).toBe(minutesFromHHMM(expectedEnd));

    // An end before the start is a shift running past midnight, not an hour
    // waiting to be corrected.
    expect(isOvernightLocal(resolved!.start, resolved!.end)).toBe(true);

    // Nothing was chosen on the manager's behalf, so there is nothing to read
    // back to them.
    expect(resolved!.ambiguousBareHours).toBe(false);
  });

  it.each([
    ["09:00", "02:00", "14:00"],
    ["09:00", "01:00", "13:00"],
    ["10:00", "04:00", "16:00"],
    ["17:00", "04:00", "16:00"],
  ])('never rewrites "%s"–"%s" to an inferred "%s"', (start, end, wouldHaveBeen) => {
    expect(resolveTimePair(start, end)!.end).not.toBe(wouldHaveBeen);
  });
});

describe("shorthand still means what it always meant", () => {
  it.each([
    ["9", "5", "09:00", "17:00"],
    ["9", "2", "09:00", "14:00"],
    ["9", "12", "09:00", "12:00"],
  ])('reads bare "%s"–"%s" as %s–%s', (start, end, expectedStart, expectedEnd) => {
    const resolved = resolveTimePair(start, end)!;
    expect(resolved.start).toBe(expectedStart);
    expect(resolved.end).toBe(expectedEnd);
  });

  it("keeps reading am/pm exactly as before", () => {
    expect(resolveTimePair("9pm", "2am")).toMatchObject({ start: "21:00", end: "02:00" });
    expect(resolveTimePair("9am", "5pm")).toMatchObject({ start: "09:00", end: "17:00" });
  });

  it("still says so when a bare pair could have meant the evening", () => {
    expect(resolveTimePair("5", "10")!.ambiguousBareHours).toBe(true);
  });

  /**
   * What separates explicit from shorthand is the shape of the hour, not the
   * width of the string. Both cases below are two characters wide and neither
   * is explicit; treating them as explicit is the mistake that turns a split
   * shift into a morning and a dot time into a twenty-hour day.
   */
  it("treats a bare 10 or 11 as shorthand, exactly like a bare 9", () => {
    // The second segment of a split cell: 5-10 after a segment ending at noon.
    expect(resolveTimePair("5", "10", 12 * 60)).toMatchObject({ start: "17:00", end: "22:00" });
    expect(resolveTimePair("5", "11", 12 * 60)).toMatchObject({ start: "17:00", end: "23:00" });
    // And a bare 10 or 11 as a start still reads as a morning it could have
    // meant, rather than passing as an explicit 24-hour value.
    expect(resolveTimePair("10", "11")!.ambiguousBareHours).toBe(true);
  });

  it("keeps a one-digit dot time as shorthand", () => {
    expect(resolveTimePair("7.30", "3.30")).toMatchObject({ start: "07:30", end: "15:30" });
    expect(resolveTimePair("9", "5.30")).toMatchObject({ start: "09:00", end: "17:30" });
  });

  it("reads a full two-digit clock time as explicit", () => {
    expect(resolveTimePair("09:00", "10:00")).toMatchObject({ start: "09:00", end: "10:00" });
    expect(resolveTimePair("12:00", "11:00")).toMatchObject({ start: "12:00", end: "11:00" });
  });
});

describe("an explicit overnight shift within the ceiling imports as written", () => {
  it.each([
    ["09:00", "01:00"],
    ["12:00", "03:00"],
    ["17:00", "04:00"],
    ["1700", "0400"],
  ])('imports "%s"–"%s" and previews it unchanged', (start, end) => {
    const imported = importedTimes(start, end);
    const resolved = resolveTimePair(start, end)!;

    expect(imported.ok).toBe(true);
    // The operation payload the apply receives, and the three fields the review
    // list renders for this row.
    expect(imported.shift!.signature.startLocal).toBe(resolved.start);
    expect(imported.shift!.signature.endLocal).toBe(resolved.end);
    expect(imported.shift!.signature.overnight).toBe(true);
    // No ambiguity note: nothing was inferred.
    expect(imported.diagnostics).toEqual([]);

    // And the rota cell reads it identically, down to the read-back it shows.
    const inline = inlineTimes(start, end)!;
    expect(inline.start).toBe(resolved.start);
    expect(inline.end).toBe(resolved.end);
    expect(inline.timeWarning).toBeNull();
    expect(buildInlineCellPreview(`${start}-${end} Chef`, { roleOptions: ["Chef"] })).toEqual({
      tone: "ok",
      summary: `${resolved.start}–${resolved.end} · Chef`,
    });
  });
});

describe("the Overnight column must agree with the times", () => {
  const withOvernight = (start: string, end: string, stated: string) =>
    importHeadedSchedule(
      ["Date,Role,Start,End,Overnight", `2026-08-03,Chef,${start},${end},${stated}`].join("\n"),
      options(),
    ).rows[0]!;

  it("accepts an explicit overnight range declared overnight", () => {
    const row = withOvernight("17:00", "04:00", "yes");
    expect(row.ok).toBe(true);
    expect(row.shift!.signature.overnight).toBe(true);
  });

  it("refuses an explicit overnight range declared not overnight", () => {
    const row = withOvernight("12:00", "03:00", "no");
    expect(row.ok).toBe(false);
    // The refusal quotes what the manager actually wrote, resolved — never the
    // afternoon end this used to invent.
    expect(row.diagnostics[0]!.message).toContain("12:00–03:00");
    expect(row.diagnostics[0]!.message).not.toContain("15:00");
    expect(row.diagnostics[0]!.field).toBe("overnight");
  });

  it("refuses a same-day range declared overnight", () => {
    const row = withOvernight("09:00", "17:00", "yes");
    expect(row.ok).toBe(false);
    expect(row.diagnostics[0]!.message).toContain("09:00–17:00");
    expect(row.diagnostics[0]!.message).toContain("does not");
  });

  it("accepts a same-day range declared not overnight", () => {
    const row = withOvernight("09:00", "17:00", "no");
    expect(row.ok).toBe(true);
    expect(row.shift!.signature.overnight).toBe(false);
  });
});

describe("one shift-length ceiling on both surfaces", () => {
  /**
   * Written as a comparison rather than two independent expectations. Two
   * suites each asserting their own answer is exactly how the import came to
   * accept a 20-hour shift the rota cell had always refused.
   */
  const bothAgree = (start: string, end: string) => {
    const importAccepts = importedTimes(start, end).ok;
    const inlineAccepts = inlineTimes(start, end) !== null;
    expect(importAccepts).toBe(inlineAccepts);
    return importAccepts;
  };

  it.each([
    // Same-day, so the boundary is walked without an overnight reading in play.
    ["06:00", "21:59", "15 hours 59 minutes", true],
    ["06:00", "22:00", "16 hours", true],
    ["06:00", "22:01", "16 hours 1 minute", false],
    ["06:00", "23:00", "17 hours", false],
    // And across midnight, where the same minutes are counted the long way.
    ["09:00", "00:59", "15 hours 59 minutes", true],
    ["09:00", "01:00", "16 hours", true],
    ["09:00", "01:01", "16 hours 1 minute", false],
    ["09:00", "02:00", "17 hours", false],
    ["08:00", "23:59", "15 hours 59 minutes", true],
    ["08:00", "00:00", "16 hours", true],
    ["07:59", "00:00", "16 hours 1 minute", false],
    ["07:00", "00:00", "17 hours", false],
  ])("%s–%s is %s, so both surfaces say accepted=%s", (start, end, _length, accepted) => {
    expect(bothAgree(start, end)).toBe(accepted);
  });

  it("names the length and the limit when it refuses", () => {
    const row = importedTimes("09:00", "02:00");
    expect(row.ok).toBe(false);

    const refusal = row.diagnostics[0]!;
    // The times as resolved, not as inferred: this row would once have been
    // silently imported as 09:00–14:00.
    expect(refusal.message).toContain("09:00–02:00");
    expect(refusal.message).not.toContain("14:00");
    expect(refusal.message).toContain("17 hours");
    expect(refusal.message).toContain("cannot be longer than 16 hours");
    expect(refusal.severity).toBe("error");
    expect(refusal.field).toBe("end");
  });

  it("refuses a compact overnight pair on its length, not by rewriting it", () => {
    const row = importedTimes("0900", "0200");
    expect(row.ok).toBe(false);
    expect(row.diagnostics[0]!.message).toContain("09:00–02:00");
  });

  it("refuses a near-24-hour range without calling it zero length", () => {
    const row = importedTimes("09:00", "08:59");
    expect(row.ok).toBe(false);
    expect(row.diagnostics[0]!.message).toContain("09:00–08:59");
    expect(row.diagnostics[0]!.message).toContain("23 hours 59 minutes");
    expect(row.diagnostics[0]!.message).not.toContain("no length");
  });

  it("still refuses a zero-length range for having no length at all", () => {
    const row = importedTimes("09:00", "09:00");
    expect(row.ok).toBe(false);
    expect(row.diagnostics[0]!.message).toContain("so it has no length");
    expect(inlineTimes("09:00", "09:00")).toBeNull();
  });
});
