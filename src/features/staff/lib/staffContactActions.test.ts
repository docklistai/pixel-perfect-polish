import { describe, expect, it } from "vitest";
import { getStaffContactLinks } from "./staffContactActions";

describe("getStaffContactLinks", () => {
  it("returns real mailto and tel links when live contact data exists", () => {
    expect(
      getStaffContactLinks({
        email: " sam@example.com ",
        phone: " +44 7700 900123 ",
      }),
    ).toEqual({
      emailHref: "mailto:sam@example.com",
      phoneHref: "tel:+44 7700 900123",
    });
  });

  it("omits links when contact data is blank or missing", () => {
    expect(getStaffContactLinks({ email: "  ", phone: undefined })).toEqual({
      emailHref: null,
      phoneHref: null,
    });
  });
});
