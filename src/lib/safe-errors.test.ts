import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createErrorReference,
  createServerErrorRecord,
  reportServerError,
  toSafeBusinessMessage,
  toSafeCustomerMessage,
} from "./safe-errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("safe error reporting", () => {
  it("maps known infrastructure codes without returning the original message", () => {
    const error = Object.assign(new Error("duplicate key value contains customer@example.com"), {
      code: "23505",
    });

    expect(toSafeCustomerMessage(error, "The save failed.")).toBe(
      "That conflicts with an existing record. Refresh and try again.",
    );
    expect(toSafeCustomerMessage(new Error("database host secret"), "The save failed.")).toBe(
      "The save failed.",
    );
  });

  it("builds a redacted record without query strings, headers, messages, or stacks", () => {
    const request = new Request(
      "https://docklist.example/staff/18eaf5f7-d4d2-4b3a-b370-80fc81a80938?token=secret",
      {
        method: "POST",
        headers: { cookie: "session=secret" },
      },
    );
    const error = Object.assign(new Error("password=secret"), { code: "PGRST301" });

    const record = createServerErrorRecord(error, {
      operation: "rota.publish",
      referenceId: "err-test-reference",
      request,
    });
    const serialized = JSON.stringify(record);

    expect(record).toMatchObject({
      event: "server_error",
      referenceId: "err-test-reference",
      operation: "rota.publish",
      method: "POST",
      pathname: "/staff/:redacted",
      errorType: "Error",
      code: "PGRST301",
    });
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("18eaf5f7");
    expect(serialized).not.toContain("cookie");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("stack");
  });

  it("returns the same reference that is written to the structured server log", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const failure = reportServerError(new Error("internal detail"), {
      operation: "time.approve",
      fallbackMessage: "We couldn't approve those hours.",
      referenceId: "err-test-reference",
    });

    expect(failure).toEqual({
      message: "We couldn't approve those hours.",
      referenceId: "err-test-reference",
    });
    expect(errorLog).toHaveBeenCalledOnce();
    expect(String(errorLog.mock.calls[0]?.[0])).toContain("err-test-reference");
    expect(String(errorLog.mock.calls[0]?.[0])).not.toContain("internal detail");
  });

  it("creates opaque references suitable for customer support", () => {
    expect(createErrorReference()).toMatch(/^err-[0-9a-f-]{36}$/);
  });
});

describe("toSafeBusinessMessage", () => {
  it("passes through hand-authored RPC text for known business codes", () => {
    const error = Object.assign(new Error("Only a pending request can be withdrawn."), {
      code: "55000",
    });
    expect(toSafeBusinessMessage(error, "fallback")).toBe(
      "Only a pending request can be withdrawn.",
    );

    const invalidInput = Object.assign(new Error("Enter a valid reason, then try again."), {
      code: "22023",
    });
    expect(toSafeBusinessMessage(invalidInput, "fallback")).toBe(
      "Enter a valid reason, then try again.",
    );
  });

  it("never passes through raw PostgREST/constraint/relation text even for a passthrough code", () => {
    const rawConstraint = Object.assign(
      new Error('duplicate key value violates unique constraint "staff_members_email_key"'),
      { code: "55000" },
    );
    expect(toSafeBusinessMessage(rawConstraint, "fallback")).toBe("fallback");

    const rawRelation = Object.assign(new Error('relation "public.staff_members" does not exist'), {
      code: "22023",
    });
    expect(toSafeBusinessMessage(rawRelation, "fallback")).toBe("fallback");

    const rawSyntax = Object.assign(new Error('syntax error at or near "SELECT"'), {
      code: "55000",
    });
    expect(toSafeBusinessMessage(rawSyntax, "fallback")).toBe("fallback");
  });

  it("rejects an oversized message even for a passthrough code", () => {
    const tooLong = Object.assign(new Error("x".repeat(301)), { code: "55000" });
    expect(toSafeBusinessMessage(tooLong, "fallback")).toBe("fallback");
  });

  it("never passes through message text for a non-passthrough code, even if it looks safe", () => {
    const error = Object.assign(new Error("This looks like a perfectly safe sentence."), {
      code: "23503",
    });
    // 23503 has its own SAFE_CODE_MESSAGES entry, not the raw RPC text.
    expect(toSafeBusinessMessage(error, "fallback")).toBe(
      "That record is still in use. Refresh and try again.",
    );
  });

  it("falls back to the generic default for a completely unknown error shape", () => {
    expect(toSafeBusinessMessage("not an error object", "fallback")).toBe("fallback");
    expect(toSafeBusinessMessage(null, "fallback")).toBe("fallback");
  });
});
