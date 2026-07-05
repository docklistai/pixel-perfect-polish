import { describe, it, expect } from "vitest";
import {
  DEFAULT_MANUAL_ENTRY_REASON,
  prepareManualEntry,
  type ManualEntryInput,
} from "./manualEntry";

const valid: ManualEntryInput = {
  staffMemberId: "0b9f4b1e-1111-4222-8333-444455556666",
  workDate: "2026-07-01",
  clockIn: "09:00",
  clockOut: "17:00",
  finishesNextDay: false,
  breakTime: "0:30",
  note: "",
};

function paidMinutes(result: ReturnType<typeof prepareManualEntry>): number | null {
  if (!result.ok) return null;
  return (
    Math.round(
      (Date.parse(result.payload.clockedOutAt) - Date.parse(result.payload.clockedInAt)) / 60_000,
    ) - result.payload.breakMinutes
  );
}

describe("prepareManualEntry", () => {
  it("builds a payload with exact UTC instants for a BST work date", () => {
    const result = prepareManualEntry(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 09:00 / 17:00 London on 2026-07-01 (BST, UTC+1) → 08:00Z / 16:00Z.
    expect(result.payload.clockedInAt).toBe("2026-07-01T08:00:00.000Z");
    expect(result.payload.clockedOutAt).toBe("2026-07-01T16:00:00.000Z");
    expect(result.payload.breakMinutes).toBe(30);
    expect(result.payload.workDate).toBe("2026-07-01");
    expect(result.payload.staffMemberId).toBe(valid.staffMemberId);
  });

  it("uses the default audit reason when the note is blank", () => {
    const result = prepareManualEntry({ ...valid, note: "   " });
    expect(result.ok && result.payload.reason).toBe(DEFAULT_MANUAL_ENTRY_REASON);
  });

  it("uses the trimmed note as the audit reason when provided", () => {
    const result = prepareManualEntry({ ...valid, note: "  Paper timesheet  " });
    expect(result.ok && result.payload.reason).toBe("Paper timesheet");
  });

  it("requires a staff member", () => {
    const result = prepareManualEntry({ ...valid, staffMemberId: "" });
    expect(result).toEqual({ ok: false, message: "Choose a staff member." });
  });

  it("requires a YYYY-MM-DD work date", () => {
    const result = prepareManualEntry({ ...valid, workDate: "01/07/2026" });
    expect(result).toEqual({ ok: false, message: "Choose a work date." });
  });

  it("rejects unparseable clock fields", () => {
    expect(prepareManualEntry({ ...valid, clockIn: "" }).ok).toBe(false);
    expect(prepareManualEntry({ ...valid, clockOut: "25:00" }).ok).toBe(false);
    expect(prepareManualEntry({ ...valid, clockIn: "nine" }).ok).toBe(false);
  });

  it("rejects a same-day clock-out at or before the clock-in", () => {
    const equal = prepareManualEntry({ ...valid, clockOut: "09:00" });
    expect(equal).toEqual({ ok: false, message: "Clock-out must be after clock-in." });
    const before = prepareManualEntry({ ...valid, clockOut: "08:00" });
    expect(before.ok).toBe(false);
  });

  it("rejects overnight-looking wall-clock times without the next-day flag", () => {
    const result = prepareManualEntry({ ...valid, clockIn: "18:00", clockOut: "02:00" });
    expect(result).toEqual({ ok: false, message: "Clock-out must be after clock-in." });
  });

  it("builds an overnight entry when the manager marks it as finishing next day", () => {
    const result = prepareManualEntry({
      ...valid,
      clockIn: "18:00",
      clockOut: "02:00",
      finishesNextDay: true,
      breakTime: "0:00",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.clockedInAt).toBe("2026-07-01T17:00:00.000Z");
    expect(result.payload.clockedOutAt).toBe("2026-07-02T01:00:00.000Z");
    expect(paidMinutes(result)).toBe(8 * 60);
  });

  it("calculates overnight paid time from exact instants minus break", () => {
    const result = prepareManualEntry({
      ...valid,
      clockIn: "22:00",
      clockOut: "06:00",
      finishesNextDay: true,
      breakTime: "0:30",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.breakMinutes).toBe(30);
    expect(paidMinutes(result)).toBe(7 * 60 + 30);
  });

  it("rejects a break that consumes the whole worked time", () => {
    const result = prepareManualEntry({
      ...valid,
      clockIn: "09:00",
      clockOut: "09:30",
      breakTime: "0:30",
    });
    expect(result).toEqual({
      ok: false,
      message: "The break can't be as long as the time worked.",
    });
  });

  it("rejects a break that consumes the whole overnight shift", () => {
    const result = prepareManualEntry({
      ...valid,
      clockIn: "22:00",
      clockOut: "06:00",
      finishesNextDay: true,
      breakTime: "8:00",
    });
    expect(result).toEqual({
      ok: false,
      message: "The break can't be as long as the time worked.",
    });
  });

  it("uses exact instants across a DST boundary", () => {
    const result = prepareManualEntry({
      ...valid,
      workDate: "2026-03-28",
      clockIn: "22:00",
      clockOut: "02:00",
      finishesNextDay: true,
      breakTime: "0:00",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.clockedInAt).toBe("2026-03-28T22:00:00.000Z");
    expect(result.payload.clockedOutAt).toBe("2026-03-29T01:00:00.000Z");
    expect(paidMinutes(result)).toBe(3 * 60);
  });

  it("rejects an unparseable break", () => {
    expect(prepareManualEntry({ ...valid, breakTime: "half an hour" }).ok).toBe(false);
  });

  it("rejects a note over 2000 characters", () => {
    const result = prepareManualEntry({ ...valid, note: "x".repeat(2001) });
    expect(result).toEqual({ ok: false, message: "Keep the note under 2000 characters." });
  });
});
