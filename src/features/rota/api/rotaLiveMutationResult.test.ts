import { describe, expect, it } from "vitest";
import {
  validateLiveRotaRemoveResult,
  validateLiveRotaShiftResult,
} from "./rotaLiveMutationResult";

const weekId = "11111111-1111-4111-8111-111111111111";
const shiftId = "22222222-2222-4222-8222-222222222222";

describe("live rota mutation result validation", () => {
  it("accepts genuine create and update responses", () => {
    const result = { rotaWeekId: weekId, shiftId };
    expect(validateLiveRotaShiftResult(result)).toEqual(result);
  });

  it("accepts a genuine remove response", () => {
    const result = { rotaWeekId: weekId };
    expect(validateLiveRotaRemoveResult(result)).toEqual(result);
  });

  it.each([
    ["raw JSON 500 body", { error: "Database write failed" }],
    ["serialized framework error", { name: "ServerFnError", message: "Internal Server Error" }],
    ["message-only error", { message: "Database write failed" }],
    ["empty object", {}],
    ["null", null],
    ["malformed successful payload", { rotaWeekId: weekId, shiftId: 42 }],
    ["unexpected successful payload", { rotaWeekId: weekId, shiftId, extra: true }],
  ])("fails closed for a %s", (_name, value) => {
    expect(() => validateLiveRotaShiftResult(value)).toThrow(/invalid mutation result/i);
  });

  it("keeps a genuine Error as a failure", () => {
    expect(() => validateLiveRotaShiftResult(new Error("write rejected"))).toThrow(
      /write rejected/i,
    );
  });

  it.each([null, {}, { message: "failed" }, { rotaWeekId: "not-a-uuid" }])(
    "rejects malformed remove payload %#",
    (value) => {
      expect(() => validateLiveRotaRemoveResult(value)).toThrow(/invalid mutation result/i);
    },
  );

  /**
   * Mark open and Duplicate previously used their resolved payload unchecked:
   * mark open toasted success for any resolved value, and duplicate returned
   * `result.shiftId` off an unvalidated object. Both now go through the same
   * validator, so these are the exact shapes that must fail closed.
   */
  describe("mark open and duplicate payloads", () => {
    it.each([
      ["raw JSON 500 body", { error: "Database write failed" }],
      ["error-shaped body", { message: "Internal Server Error" }],
      ["empty object", {}],
      ["null", null],
      ["undefined", undefined],
      ["missing shiftId (remove-shaped)", { rotaWeekId: weekId }],
      ["null shiftId", { rotaWeekId: weekId, shiftId: null }],
      ["empty-string shiftId", { rotaWeekId: weekId, shiftId: "" }],
      ["non-uuid shiftId", { rotaWeekId: weekId, shiftId: "copy-1" }],
    ])("fails closed for a %s", (_name, value) => {
      expect(() => validateLiveRotaShiftResult(value)).toThrow(/invalid mutation result/i);
    });

    it("accepts the genuine mark-open / duplicate envelope", () => {
      expect(validateLiveRotaShiftResult({ rotaWeekId: weekId, shiftId })).toEqual({
        rotaWeekId: weekId,
        shiftId,
      });
    });
  });
});
