import { describe, it, expect } from "vitest";
import { buildLeavePolicyPayload, leavePolicyFieldsFrom } from "./leavePolicyFields";

describe("leavePolicyFieldsFrom", () => {
  it("renders an unconfigured policy as empty fields, never as a default figure", () => {
    expect(leavePolicyFieldsFrom(null)).toEqual({
      leaveYearStartMonth: "",
      defaultAnnualLeaveDays: "",
    });
    expect(
      leavePolicyFieldsFrom({ leaveYearStartMonth: null, defaultAnnualLeaveDays: null }),
    ).toEqual({ leaveYearStartMonth: "", defaultAnnualLeaveDays: "" });
  });

  it("renders a configured policy", () => {
    expect(leavePolicyFieldsFrom({ leaveYearStartMonth: 4, defaultAnnualLeaveDays: 28 })).toEqual({
      leaveYearStartMonth: "4",
      defaultAnnualLeaveDays: "28",
    });
  });

  it("renders a stated zero default as zero, not as unset", () => {
    expect(leavePolicyFieldsFrom({ leaveYearStartMonth: 1, defaultAnnualLeaveDays: 0 })).toEqual({
      leaveYearStartMonth: "1",
      defaultAnnualLeaveDays: "0",
    });
  });
});

describe("buildLeavePolicyPayload", () => {
  it("accepts a fully configured policy", () => {
    const result = buildLeavePolicyPayload({
      leaveYearStartMonth: "4",
      defaultAnnualLeaveDays: "28",
    });
    expect(result).toEqual({
      ok: true,
      payload: { leaveYearStartMonth: 4, defaultAnnualLeaveDays: 28 },
    });
  });

  it("accepts both fields cleared", () => {
    const result = buildLeavePolicyPayload({
      leaveYearStartMonth: "",
      defaultAnnualLeaveDays: "",
    });
    expect(result).toEqual({
      ok: true,
      payload: { leaveYearStartMonth: null, defaultAnnualLeaveDays: null },
    });
  });

  it("accepts a leave year with no stated default", () => {
    const result = buildLeavePolicyPayload({
      leaveYearStartMonth: "4",
      defaultAnnualLeaveDays: "",
    });
    expect(result).toEqual({
      ok: true,
      payload: { leaveYearStartMonth: 4, defaultAnnualLeaveDays: null },
    });
  });

  it("accepts a stated zero default", () => {
    const result = buildLeavePolicyPayload({
      leaveYearStartMonth: "1",
      defaultAnnualLeaveDays: "0",
    });
    expect(result).toEqual({
      ok: true,
      payload: { leaveYearStartMonth: 1, defaultAnnualLeaveDays: 0 },
    });
  });

  it("rejects an out-of-range month", () => {
    expect(
      buildLeavePolicyPayload({ leaveYearStartMonth: "0", defaultAnnualLeaveDays: "" }).ok,
    ).toBe(false);
    expect(
      buildLeavePolicyPayload({ leaveYearStartMonth: "13", defaultAnnualLeaveDays: "" }).ok,
    ).toBe(false);
  });

  it("rejects a non-numeric or fractional entitlement", () => {
    expect(
      buildLeavePolicyPayload({ leaveYearStartMonth: "4", defaultAnnualLeaveDays: "abc" }).ok,
    ).toBe(false);
    expect(
      buildLeavePolicyPayload({ leaveYearStartMonth: "4", defaultAnnualLeaveDays: "22.5" }).ok,
    ).toBe(false);
    expect(
      buildLeavePolicyPayload({ leaveYearStartMonth: "4", defaultAnnualLeaveDays: "-1" }).ok,
    ).toBe(false);
  });

  it("rejects an entitlement above a calendar year", () => {
    expect(
      buildLeavePolicyPayload({ leaveYearStartMonth: "4", defaultAnnualLeaveDays: "367" }).ok,
    ).toBe(false);
  });

  it("tolerates surrounding whitespace", () => {
    expect(
      buildLeavePolicyPayload({ leaveYearStartMonth: " 4 ", defaultAnnualLeaveDays: " 28 " }),
    ).toEqual({ ok: true, payload: { leaveYearStartMonth: 4, defaultAnnualLeaveDays: 28 } });
  });
});
