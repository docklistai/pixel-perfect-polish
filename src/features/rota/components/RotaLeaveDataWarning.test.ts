import { describe, expect, it } from "vitest";
import { getRotaLeaveDataNotice } from "./RotaLeaveDataWarning";

describe("getRotaLeaveDataNotice", () => {
  it("distinguishes leave loading from a completed empty result", () => {
    expect(getRotaLeaveDataNotice({ isLoading: true, isError: false })).toMatchObject({
      title: "Checking approved leave",
      tone: "info",
    });
    expect(getRotaLeaveDataNotice({ isLoading: false, isError: false })).toBeNull();
  });

  it("reports leave failures instead of implying leave was checked", () => {
    expect(getRotaLeaveDataNotice({ isLoading: false, isError: true })).toMatchObject({
      title: "Leave data unavailable",
      tone: "warning",
    });
  });
});
