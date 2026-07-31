import { describe, expect, it } from "vitest";
import {
  demandFromCurrentWeek,
  demandFromPreviousWeek,
  demandFromTemplate,
  type PreviousWeekShift,
  type TemplateSlot,
} from "./demandSources";
import { buildShiftSignature, signatureKey } from "./shiftSignature";
import type { ExistingShiftFact } from "./buildWeekProposal";

const WEEK = [
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
];
const LOC = "loc-1";
const DEPT = "dept-1";

function slot(overrides: Partial<TemplateSlot> = {}): TemplateSlot {
  return {
    weekday: 0,
    roleName: "Chef",
    departmentId: DEPT,
    startLocal: "09:00",
    endLocal: "17:00",
    breakMinutes: 30,
    quantity: 1,
    ...overrides,
  };
}

function previous(overrides: Partial<PreviousWeekShift> = {}): PreviousWeekShift {
  return {
    dayOffset: 0,
    roleName: "Chef",
    departmentId: DEPT,
    startLocal: "09:00",
    endLocal: "17:00",
    breakMinutes: 30,
    ...overrides,
  };
}

describe("demandFromTemplate", () => {
  it("maps a slot onto the target week's date for that weekday", () => {
    const [requirement] = demandFromTemplate([slot({ weekday: 5 })], WEEK, LOC);
    expect(requirement!.signature.workDate).toBe(WEEK[5]);
  });

  it("carries the slot's quantity as the requirement", () => {
    const [requirement] = demandFromTemplate([slot({ quantity: 3 })], WEEK, LOC);
    expect(requirement!.required).toBe(3);
  });

  it("merges two slots with the same shape rather than duplicating them", () => {
    const requirements = demandFromTemplate(
      [slot({ quantity: 2 }), slot({ quantity: 1 })],
      WEEK,
      LOC,
    );
    expect(requirements).toHaveLength(1);
    expect(requirements[0]!.required).toBe(3);
  });

  it("keeps slots with different shapes separate", () => {
    const requirements = demandFromTemplate([slot(), slot({ roleName: "Bar" })], WEEK, LOC);
    expect(requirements).toHaveLength(2);
  });

  it("marks an overnight slot explicitly", () => {
    const [requirement] = demandFromTemplate(
      [slot({ startLocal: "22:00", endLocal: "02:00" })],
      WEEK,
      LOC,
    );
    expect(requirement!.signature.overnight).toBe(true);
  });
});

describe("demandFromPreviousWeek", () => {
  it("collapses identical shifts into a count, keeping the multiset", () => {
    const requirements = demandFromPreviousWeek([previous(), previous(), previous()], WEEK, LOC);
    expect(requirements).toHaveLength(1);
    expect(requirements[0]!.required).toBe(3);
  });

  it("maps the day offset onto the target week", () => {
    const [requirement] = demandFromPreviousWeek([previous({ dayOffset: 4 })], WEEK, LOC);
    expect(requirement!.signature.workDate).toBe(WEEK[4]);
  });

  it("carries no assignment — only shape, count and display role survive", () => {
    // PreviousWeekShift has no staff field at all, which is the point: last
    // week's assignments are decided again against this week's leave.
    const [requirement] = demandFromPreviousWeek([previous()], WEEK, LOC);
    expect(Object.keys(requirement!).sort()).toEqual(["required", "roleName", "signature"]);
    expect(JSON.stringify(requirement)).not.toContain("staff");
  });

  it("normalizes role spelling so Chef and chef are one requirement", () => {
    const requirements = demandFromPreviousWeek(
      [previous({ roleName: "Chef" }), previous({ roleName: " chef " })],
      WEEK,
      LOC,
    );
    expect(requirements).toHaveLength(1);
    expect(requirements[0]!.required).toBe(2);
  });
});

describe("demandFromCurrentWeek", () => {
  const existing = (id: string, staffId: string | null, role = "Chef"): ExistingShiftFact => ({
    id,
    staffId,
    signature: buildShiftSignature({
      workDate: WEEK[0]!,
      start: "09:00",
      end: "17:00",
      role,
      departmentId: DEPT,
      locationId: LOC,
      breakMinutes: 30,
    }),
  });

  it("counts the week's own shifts, assigned and open alike", () => {
    const requirements = demandFromCurrentWeek([
      existing("a", "s1"),
      existing("b", null),
      existing("c", "s2", "Bar"),
    ]);
    const chef = requirements.find((r) => r.signature.roleKey === "chef");
    expect(chef!.required).toBe(2);
    expect(requirements).toHaveLength(2);
  });

  it("produces demand that is already fully met, so nothing would be created", () => {
    const shifts = [existing("a", null), existing("b", null)];
    const requirements = demandFromCurrentWeek(shifts);
    const key = signatureKey(shifts[0]!.signature);
    expect(signatureKey(requirements[0]!.signature)).toBe(key);
    expect(requirements[0]!.required).toBe(shifts.length);
  });

  it("is empty for an empty week", () => {
    expect(demandFromCurrentWeek([])).toEqual([]);
  });
});
