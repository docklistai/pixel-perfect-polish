import { describe, expect, it } from "vitest";
import { MONTHS, birthdayChanged, daysInMonth, parseBirthday } from "./staffBirthday";

describe("birthday parsing", () => {
  it("accepts a valid day and month", () => {
    expect(parseBirthday({ day: "9", month: "6" })).toEqual({ ok: true, day: 9, month: 6 });
  });

  it("treats both-empty as clearing the birthday", () => {
    expect(parseBirthday({ day: "", month: "" })).toEqual({ ok: true, day: null, month: null });
    expect(parseBirthday({ day: "  ", month: " " })).toEqual({ ok: true, day: null, month: null });
  });

  it("refuses a half-set pair in either direction", () => {
    const dayOnly = parseBirthday({ day: "9", month: "" });
    const monthOnly = parseBirthday({ day: "", month: "6" });
    expect(dayOnly.ok).toBe(false);
    expect(monthOnly.ok).toBe(false);
    if (!dayOnly.ok) expect(dayOnly.message).toMatch(/both a day and a month/i);
  });

  it("refuses impossible calendar dates, matching the database check", () => {
    const feb30 = parseBirthday({ day: "30", month: "2" });
    expect(feb30.ok).toBe(false);
    if (!feb30.ok) expect(feb30.message).toBe("February has 29 days.");

    expect(parseBirthday({ day: "31", month: "4" }).ok).toBe(false);
    expect(parseBirthday({ day: "31", month: "6" }).ok).toBe(false);
    expect(parseBirthday({ day: "0", month: "6" }).ok).toBe(false);
  });

  it("allows 29 February, because no year is stored to make it invalid", () => {
    expect(parseBirthday({ day: "29", month: "2" })).toEqual({ ok: true, day: 29, month: 2 });
  });

  it("refuses a month outside 1-12 and non-integers", () => {
    expect(parseBirthday({ day: "9", month: "13" }).ok).toBe(false);
    expect(parseBirthday({ day: "9.5", month: "6" }).ok).toBe(false);
    expect(parseBirthday({ day: "abc", month: "6" }).ok).toBe(false);
  });

  it("has no concept of a year anywhere in the contract", () => {
    const parsed = parseBirthday({ day: "9", month: "6" });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(Object.keys(parsed)).toEqual(["ok", "day", "month"]);
  });
});

describe("month lengths", () => {
  it("matches the database calendar check exactly", () => {
    expect(daysInMonth(2)).toBe(29);
    for (const month of [4, 6, 9, 11]) expect(daysInMonth(month)).toBe(30);
    for (const month of [1, 3, 5, 7, 8, 10, 12]) expect(daysInMonth(month)).toBe(31);
  });

  it("offers all twelve months", () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toEqual({ value: 1, label: "January" });
  });
});

describe("change detection", () => {
  it("only reports a change when the stored pair actually differs", () => {
    expect(birthdayChanged({ day: 9, month: 6 }, 9, 6)).toBe(false);
    expect(birthdayChanged({ day: 9, month: 6 }, 10, 6)).toBe(true);
    expect(birthdayChanged({ day: null, month: null }, null, null)).toBe(false);
    // Clearing a stored birthday is a change and must be written.
    expect(birthdayChanged({ day: null, month: null }, 9, 6)).toBe(true);
    // Undefined (demo row without the field) is treated as unset.
    expect(birthdayChanged({ day: null, month: null }, undefined, undefined)).toBe(false);
  });
});
