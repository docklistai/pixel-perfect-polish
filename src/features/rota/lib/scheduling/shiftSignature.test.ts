import { describe, expect, it } from "vitest";
import {
  buildShiftSignature,
  compareSignatures,
  countBySignature,
  normaliseRoleKey,
  signatureKey,
  type ShiftSignature,
  type ShiftSignatureInput,
} from "./shiftSignature";

const MON = "2026-07-27";
const DEPT = "11111111-1111-4111-8111-111111111111";
const LOC = "22222222-2222-4222-8222-222222222222";

function input(overrides: Partial<ShiftSignatureInput> = {}): ShiftSignatureInput {
  return {
    workDate: MON,
    start: "09:00",
    end: "17:00",
    role: "Bar",
    departmentId: DEPT,
    locationId: LOC,
    breakMinutes: 30,
    ...overrides,
  };
}

describe("normaliseRoleKey", () => {
  it("collapses whitespace, trims and lowercases", () => {
    expect(normaliseRoleKey("  Head   Chef ")).toBe("head chef");
    expect(normaliseRoleKey("FOH")).toBe("foh");
    expect(normaliseRoleKey("Bar\tBack")).toBe("bar back");
    expect(normaliseRoleKey("Bar\r\nBack")).toBe("bar back");
  });

  it("keeps punctuation significant so distinct roles stay distinct", () => {
    expect(normaliseRoleKey("Bar/Kitchen")).not.toBe(normaliseRoleKey("Bar Kitchen"));
    expect(normaliseRoleKey("Front-of-House")).not.toBe(normaliseRoleKey("Front of House"));
  });

  it("never matches a role to a longer role containing it", () => {
    // The substring-matching defect this replaces: "Bar" silently became "Barista".
    expect(normaliseRoleKey("Bar")).not.toBe(normaliseRoleKey("Barista"));
    expect(normaliseRoleKey("Chef")).not.toBe(normaliseRoleKey("Head Chef"));
  });

  it("leaves a non-breaking space alone, matching the SQL character class", () => {
    // JavaScript \s would collapse U+00A0 but Postgres \s would not, so the
    // explicit ASCII class must leave it in place on both sides.
    expect(normaliseRoleKey("Bar Back")).toBe("bar back");
  });
});

describe("buildShiftSignature", () => {
  it("derives overnight state explicitly", () => {
    expect(buildShiftSignature(input({ start: "22:00", end: "02:00" })).overnight).toBe(true);
    expect(buildShiftSignature(input()).overnight).toBe(false);
  });

  it("normalizes the role into the signature", () => {
    expect(buildShiftSignature(input({ role: "  Head  Chef " })).roleKey).toBe("head chef");
  });
});

describe("signatureKey", () => {
  it("matches for shifts that differ only in role spelling or spacing", () => {
    const a = buildShiftSignature(input({ role: "Bar" }));
    const b = buildShiftSignature(input({ role: " BAR " }));
    expect(signatureKey(a)).toBe(signatureKey(b));
  });

  it("differs for every field that is part of demand", () => {
    const base = signatureKey(buildShiftSignature(input()));
    const variants: Partial<ShiftSignatureInput>[] = [
      { workDate: "2026-07-28" },
      { start: "10:00" },
      { end: "18:00" },
      { role: "Kitchen" },
      { departmentId: "33333333-3333-4333-8333-333333333333" },
      { locationId: "44444444-4444-4444-8444-444444444444" },
      { breakMinutes: 0 },
    ];
    for (const variant of variants) {
      expect(signatureKey(buildShiftSignature(input(variant)))).not.toBe(base);
    }
  });

  it("includes overnight state, so it cannot be lost from the bucket key", () => {
    // Overnight is derived from the times, so it cannot be varied through
    // buildShiftSignature. Constructing the signature directly is the only way to
    // assert the field actually participates in the key.
    const base = buildShiftSignature(input({ start: "22:00", end: "02:00" }));
    const asDayShift: ShiftSignature = { ...base, overnight: false };
    expect(base.overnight).toBe(true);
    expect(signatureKey(base)).not.toBe(signatureKey(asDayShift));
  });

  it("stays unambiguous when the role contains the separator", () => {
    // roleKey is the only component that can contain a space, which is why it is
    // placed last. A role of "head chef" must not be confusable with a different
    // signature whose role is "head" followed by a shifted field.
    const headChef = buildShiftSignature(input({ role: "Head Chef" }));
    const head = buildShiftSignature(input({ role: "Head" }));
    expect(signatureKey(headChef)).not.toBe(signatureKey(head));
    expect(signatureKey(headChef).endsWith("head chef")).toBe(true);
  });
});

describe("countBySignature — demand is a multiset", () => {
  it("counts identical required shifts rather than collapsing them", () => {
    const rows = [input(), input(), input({ role: "Kitchen" })];
    const buckets = countBySignature(rows, buildShiftSignature);
    expect(buckets.size).toBe(2);
    const bar = buckets.get(signatureKey(buildShiftSignature(input())));
    expect(bar?.count).toBe(2);
  });

  it("keeps the first signature instance as the bucket representative", () => {
    const buckets = countBySignature([input({ role: "bar" }), input({ role: "BAR" })], (row) =>
      buildShiftSignature(row),
    );
    expect(buckets.size).toBe(1);
    expect([...buckets.values()][0]!.count).toBe(2);
  });
});

describe("compareSignatures", () => {
  it("is a total order — no two distinct signatures tie", () => {
    const signatures = [
      buildShiftSignature(input()),
      buildShiftSignature(input({ workDate: "2026-07-28" })),
      buildShiftSignature(input({ role: "Kitchen" })),
      buildShiftSignature(input({ start: "10:00" })),
    ];
    for (const left of signatures) {
      for (const right of signatures) {
        const tied = compareSignatures(left, right) === 0;
        expect(tied).toBe(signatureKey(left) === signatureKey(right));
      }
    }
  });

  it("sorts deterministically regardless of input order", () => {
    const a = buildShiftSignature(input({ workDate: "2026-07-29" }));
    const b = buildShiftSignature(input({ workDate: "2026-07-27" }));
    expect([a, b].sort(compareSignatures).map((s) => s.workDate)).toEqual([
      "2026-07-27",
      "2026-07-29",
    ]);
    expect([b, a].sort(compareSignatures).map((s) => s.workDate)).toEqual([
      "2026-07-27",
      "2026-07-29",
    ]);
  });
});
