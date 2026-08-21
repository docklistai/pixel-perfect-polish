import { afterEach, describe, expect, it, vi } from "vitest";
import { shiftWriteError } from "./shiftWriteError";

/**
 * Shift write refusals the manager has to be able to act on.
 *
 * The rule under test is the one a move newly makes easy to hit: reassigning a
 * shift somebody has already clocked in against. It is refused by
 * `guard_shift_write` with a hand-authored 55000 message, and before this the
 * message was thrown as a raw PostgrestError — which serialises to nothing
 * useful, leaving the manager with a generic failure and no explanation.
 */

const pgError = (code: string, message: string) => ({ code, message, name: "PostgrestError" });

afterEach(() => vi.restoreAllMocks());

describe("shiftWriteError", () => {
  it("passes the clocked-shift refusal through verbatim", () => {
    const error = shiftWriteError(
      pgError("55000", "shift assignment cannot change while time entries reference the shift"),
    );

    expect(error.message).toBe(
      "shift assignment cannot change while time entries reference the shift",
    );
  });

  it("passes the other hand-authored shift refusals through", () => {
    expect(
      shiftWriteError(pgError("55000", "Shift duration cannot exceed 16 hours.")).message,
    ).toBe("Shift duration cannot exceed 16 hours.");
    expect(
      shiftWriteError(pgError("55000", "shift date must fall inside the rota week")).message,
    ).toBe("shift date must fall inside the rota week");
  });

  it("never leaks raw driver detail, and hands back a reference instead", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = shiftWriteError(pgError("42703", "column shifts.nonsense does not exist"));

    expect(error.message).not.toContain("column");
    expect(error.message).toContain("The shift could not be saved.");
    expect(error.message).toMatch(/Reference: err-[0-9a-f-]+$/);
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("refuses to trust 55000 text that reads like internal detail", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    // Same passthrough code, but the message names a constraint — the safety
    // net that stops a careless `raise exception` reaching a customer.
    const error = shiftWriteError(
      pgError("55000", 'duplicate key value violates constraint "shifts_pkey"'),
    );

    expect(error.message).not.toContain("shifts_pkey");
    expect(logged).toHaveBeenCalled();
  });

  it("maps a permission failure to its known safe wording", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = shiftWriteError(pgError("42501", "permission denied for table shifts"));

    expect(error.message).toBe("You do not have permission to do that.");
    expect(error.message).not.toContain("permission denied for table");
    // Codes with a known safe mapping resolve without a reference id and
    // without a server-side log, exactly as the publish path already treats
    // them — there is nothing to look up that the message does not say.
    expect(error.message).not.toContain("Reference:");
    expect(logged).not.toHaveBeenCalled();
  });
});
