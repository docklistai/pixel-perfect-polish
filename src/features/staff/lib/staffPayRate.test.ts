import { describe, expect, it } from "vitest";
import { formatPayRatePounds, parsePayRateInput } from "./staffPayRate";

describe("formatPayRatePounds", () => {
  it("formats whole pounds without decimals and pence with two", () => {
    expect(formatPayRatePounds(1200)).toBe("12");
    expect(formatPayRatePounds(1325)).toBe("13.25");
    expect(formatPayRatePounds(undefined)).toBe("");
  });
});

describe("parsePayRateInput", () => {
  it("parses pounds into pence, tolerating £ and commas", () => {
    expect(parsePayRateInput("£13.20")).toEqual({ ok: true, pence: 1320 });
    expect(parsePayRateInput("12")).toEqual({ ok: true, pence: 1200 });
  });

  it("treats empty input as clearing the rate", () => {
    expect(parsePayRateInput("  ")).toEqual({ ok: true, pence: null });
  });

  it("rejects nonsense and out-of-range values", () => {
    expect(parsePayRateInput("abc").ok).toBe(false);
    expect(parsePayRateInput("-4").ok).toBe(false);
    expect(parsePayRateInput("1500").ok).toBe(false);
  });
});
