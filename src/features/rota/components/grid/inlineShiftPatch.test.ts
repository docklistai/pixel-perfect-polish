import { describe, expect, it } from "vitest";
import type { DraftShift } from "../../types";
import { buildShiftPatch, ROLE_REQUIRED_MESSAGE, shiftPatchToInput } from "./inlineShiftPatch";
import type { ParsedInlineShift } from "./inlineCellParsing";

function parsed(overrides: Partial<ParsedInlineShift> = {}): ParsedInlineShift {
  return {
    start: "09:00",
    end: "17:00",
    role: null,
    breakMinutes: null,
    open: false,
    ...overrides,
  };
}

function existing(role: string): DraftShift {
  return {
    id: "existing",
    dayIndex: 0,
    staffId: "staff-a",
    role,
    start: "10:00",
    end: "18:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
  };
}

describe("role precedence", () => {
  it("uses the typed role first", () => {
    const result = buildShiftPatch({
      parsed: parsed({ role: "Bar" }),
      staffRole: "Waiter",
      source: existing("Kitchen"),
      staffId: "staff-a",
      openRow: false,
    });
    expect(result.ok && result.patch.role).toBe("Bar");
  });

  it("falls back to the target staff member's own role", () => {
    const result = buildShiftPatch({
      parsed: parsed(),
      staffRole: "Waiter",
      staffId: "staff-a",
      openRow: false,
    });
    expect(result.ok && result.patch.role).toBe("Waiter");
  });

  it("falls back to the role already on the shift being replaced", () => {
    const result = buildShiftPatch({
      parsed: parsed(),
      source: existing("Kitchen"),
      staffId: "staff-a",
      openRow: false,
    });
    expect(result.ok && result.patch.role).toBe("Kitchen");
  });
});

describe("no role is ever invented", () => {
  it("refuses instead of falling back to a hardcoded FOH", () => {
    // An open-row cell has no staff member to take a role from. This used to
    // produce a shift labelled "FOH" — a role that in most workspaces nobody
    // holds, and which exact eligibility could therefore never staff.
    const result = buildShiftPatch({ parsed: parsed(), openRow: true });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toBe(ROLE_REQUIRED_MESSAGE);
  });

  it("refuses for an unassigned cell with no typed role and nothing to inherit", () => {
    const result = buildShiftPatch({ parsed: parsed(), staffId: null, openRow: false });
    expect(result.ok).toBe(false);
  });

  it("accepts an open-row shift when the role is typed", () => {
    const result = buildShiftPatch({ parsed: parsed({ role: "Bar" }), openRow: true });
    expect(result.ok).toBe(true);
    expect(result.ok && result.patch.role).toBe("Bar");
    expect(result.ok && result.patch.staffId).toBeNull();
    expect(result.ok && result.patch.status).toBe("open");
  });
});

describe("assignment and status", () => {
  it("forces an open-row shift unassigned even when a staff id is supplied", () => {
    const result = buildShiftPatch({
      parsed: parsed({ role: "Bar" }),
      staffId: "staff-a",
      openRow: true,
    });
    expect(result.ok && result.patch.staffId).toBeNull();
    expect(result.ok && result.patch.tone).toBe("open");
  });

  it("marks a shift open when the text said open", () => {
    const result = buildShiftPatch({
      parsed: parsed({ role: "Bar", open: true }),
      staffId: "staff-a",
      openRow: false,
    });
    expect(result.ok && result.patch.staffId).toBeNull();
    expect(result.ok && result.patch.status).toBe("open");
  });

  it("keeps the break out of the patch when none was written", () => {
    const result = buildShiftPatch({
      parsed: parsed({ role: "Bar" }),
      staffId: "staff-a",
      openRow: false,
    });
    expect(result.ok && "breakMinutes" in result.patch).toBe(false);
  });

  it("carries an explicit zero break", () => {
    const result = buildShiftPatch({
      parsed: parsed({ role: "Bar", breakMinutes: 0 }),
      staffId: "staff-a",
      openRow: false,
    });
    expect(result.ok && result.patch.breakMinutes).toBe(0);
  });
});

describe("shiftPatchToInput", () => {
  it("carries every field a create needs", () => {
    const result = buildShiftPatch({
      parsed: parsed({ role: "Bar", breakMinutes: 45 }),
      staffId: "staff-a",
      openRow: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(shiftPatchToInput(result.patch, 3)).toEqual({
      dayIndex: 3,
      staffId: "staff-a",
      role: "Bar",
      start: "09:00",
      end: "17:00",
      breakMinutes: 45,
      status: "scheduled",
      tone: "info",
    });
  });
});
