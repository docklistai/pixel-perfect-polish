import { describe, expect, it } from "vitest";
import { formatPortalElapsed } from "./portalElapsed";

describe("formatPortalElapsed", () => {
  it("formats a positive duration", () => {
    expect(formatPortalElapsed(3_661_000)).toBe("01:01:01");
  });

  it("clamps brief negative client/server clock skew to zero", () => {
    expect(formatPortalElapsed(-250)).toBe("00:00:00");
  });

  it("does not leak a non-finite value into the clock UI", () => {
    expect(formatPortalElapsed(Number.NaN)).toBe("00:00:00");
  });
});
