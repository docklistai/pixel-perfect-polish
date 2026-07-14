import { describe, expect, it } from "vitest";
import type { StoredTimesheetRow, TimeAdjustment } from "../types";
import { prepareAdjustment } from "./liveAdjustment";

const row: StoredTimesheetRow = {
  id: "entry-1",
  staffMemberId: "staff-1",
  n: "Test Staff",
  role: "Bartender",
  img: 1,
  sched: "22:00–06:00",
  in: "22:00",
  inN: "",
  out: "06:00",
  outN: "",
  brk: "30m",
  paid: "7 h 30 m",
  exc: "—",
  department: "Bar",
  status: "pending",
  flagged: false,
  auditTrail: [],
  workDate: "2026-07-15",
  timezone: "America/New_York",
};

const adjustment: TimeAdjustment = {
  clockIn: "22:00",
  clockOut: "06:00",
  breakTime: "0:30",
  reason: "Correction",
  note: "",
};

describe("prepareAdjustment", () => {
  it("treats an earlier clock-out wall time as the following local day", () => {
    const result = prepareAdjustment(row, adjustment);
    expect(result).toEqual({
      ok: true,
      payload: {
        clockedInAt: "2026-07-16T02:00:00.000Z",
        clockedOutAt: "2026-07-16T10:00:00.000Z",
        breakMinutes: 30,
        reason: "Correction",
      },
    });
  });

  it("rejects a nonexistent local DST time without throwing", () => {
    const result = prepareAdjustment(
      { ...row, workDate: "2026-03-29", timezone: "Europe/London" },
      { ...adjustment, clockIn: "01:30", clockOut: "03:30" },
    );
    expect(result).toEqual({
      ok: false,
      message:
        "Local time 01:30 on 2026-03-29 does not exist in Europe/London. Choose another time.",
    });
  });
});
