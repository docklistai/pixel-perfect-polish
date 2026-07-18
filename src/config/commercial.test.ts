import { describe, expect, it } from "vitest";

import {
  BETA_ACCESS_MAILTO,
  BILLING_ACTIVE,
  COMMERCIAL_PLANS,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "./commercial";

describe("private-beta commercial configuration", () => {
  it("keeps billing inactive and exposes one support contact", () => {
    expect(BILLING_ACTIVE).toBe(false);
    expect(SUPPORT_MAILTO).toBe(`mailto:${SUPPORT_EMAIL}`);
    expect(BETA_ACCESS_MAILTO).toContain(encodeURIComponent("DocklistAI private beta access"));
  });

  it("keeps indicative public and in-app prices in one source", () => {
    expect(Object.values(COMMERCIAL_PLANS).map((plan) => plan.monthlyPrice)).toEqual([
      "£0",
      "£39",
      "£79",
    ]);
  });
});
