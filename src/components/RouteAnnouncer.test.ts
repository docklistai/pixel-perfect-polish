import { describe, expect, it } from "vitest";
import { getRouteLabel } from "./routeLabels";

describe("getRouteLabel", () => {
  it.each([
    ["/landing", "DocklistAI home"],
    ["/auth", "Manager and staff sign in"],
    ["/auth/reset", "Reset password"],
    ["/portal/access", "Staff portal access"],
    ["/no-access", "Workspace access"],
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Service"],
  ])("announces %s as %s", (pathname, label) => {
    expect(getRouteLabel(pathname)).toBe(label);
  });

  it("uses the nearest known parent label for nested routes", () => {
    expect(getRouteLabel("/portal/settings")).toBe("Staff portal");
  });
});
