import { describe, expect, it } from "vitest";
import {
  describePasswordUpdateError,
  describeRecoveryLinkError,
  getRecoveryCodeFromUrl,
  PASSWORD_HINT,
  validateNewPassword,
} from "./passwordReset";

describe("validateNewPassword", () => {
  it("accepts a matching pair that meets the policy", () => {
    expect(validateNewPassword("Harbour99", "Harbour99")).toEqual({ ok: true });
  });

  it("rejects passwords that miss the policy with the shared hint", () => {
    expect(validateNewPassword("short1A", "short1A")).toEqual({
      ok: false,
      message: PASSWORD_HINT,
    });
    expect(validateNewPassword("nouppercase1", "nouppercase1")).toEqual({
      ok: false,
      message: PASSWORD_HINT,
    });
    expect(validateNewPassword("NoNumbersHere", "NoNumbersHere")).toEqual({
      ok: false,
      message: PASSWORD_HINT,
    });
  });

  it("rejects a mismatched confirmation", () => {
    const result = validateNewPassword("Harbour99", "Harbour98");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/match/i);
  });
});

describe("describeRecoveryLinkError", () => {
  it("returns null when the URL carries no error params", () => {
    expect(describeRecoveryLinkError({ hash: "", search: "" })).toBeNull();
    expect(
      describeRecoveryLinkError({ hash: "#access_token=abc", search: "?code=xyz" }),
    ).toBeNull();
  });

  it("describes expired links from hash params", () => {
    const message = describeRecoveryLinkError({
      hash: "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
      search: "",
    });
    expect(message).toMatch(/expired/i);
  });

  it("describes other link errors from query params without echoing them", () => {
    const message = describeRecoveryLinkError({
      hash: "",
      search: "?error=access_denied&error_description=Something+internal",
    });
    expect(message).toMatch(/isn't valid/i);
    expect(message).not.toMatch(/internal/i);
  });
});

describe("getRecoveryCodeFromUrl", () => {
  it("extracts the PKCE code from the query string", () => {
    expect(getRecoveryCodeFromUrl("?code=34e770dd-9ff9")).toBe("34e770dd-9ff9");
    expect(getRecoveryCodeFromUrl("?foo=bar&code=abc123")).toBe("abc123");
  });

  it("returns null when no usable code is present", () => {
    expect(getRecoveryCodeFromUrl("")).toBeNull();
    expect(getRecoveryCodeFromUrl("?error=access_denied")).toBeNull();
    expect(getRecoveryCodeFromUrl("?code=")).toBeNull();
  });
});

describe("describePasswordUpdateError", () => {
  it("maps the same-password rejection", () => {
    expect(
      describePasswordUpdateError("New password should be different from the old password."),
    ).toMatch(/different from your current one/i);
  });

  it("maps missing/expired sessions to an honest retry instruction", () => {
    expect(describePasswordUpdateError("Auth session missing!")).toMatch(/expired/i);
  });

  it("falls back to generic copy without echoing raw messages", () => {
    const message = describePasswordUpdateError("ERROR: relation secret_table");
    expect(message).toMatch(/couldn't update/i);
    expect(message).not.toMatch(/secret_table/i);
  });
});
