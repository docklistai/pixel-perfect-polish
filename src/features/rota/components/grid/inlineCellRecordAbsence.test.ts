import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftShift, RotaGridCell } from "../../types";
import type { ShiftActionHandlers } from "./types";
import { commitInlineCellEdit } from "./inlineCellCommit";

// commitInlineCellEdit reaches for sonner directly; the toasts are incidental here.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

/**
 * The rota inline `sick` path, end to end through the real commit function.
 *
 * This is the deterministic counterpart to the browser check: it proves the
 * typed command reaches `onRecordAbsence` with the right person, day and leave
 * type, and — the part that actually matters for trust — that committing it
 * writes nothing to the cell. Recording an absence must never edit the rota.
 */

const SHIFT: DraftShift = {
  id: "shift-1",
  dayIndex: 2,
  staffId: "staff-a",
  role: "Chef",
  start: "09:00",
  end: "17:00",
  breakMinutes: 30,
  tone: "info",
  status: "scheduled",
};

function cellWithShift(): RotaGridCell {
  return { shifts: [{ ...SHIFT }] };
}

function handlers(overrides: Partial<ShiftActionHandlers> = {}): ShiftActionHandlers {
  return {
    readOnly: false,
    serverBacked: true,
    workspaceRoles: ["Chef", "FOH"],
    duplicateBlockedReason: () => null,
    onReadOnlyAttempt: vi.fn(),
    onShiftOpen: vi.fn(),
    onShiftDuplicate: vi.fn(),
    onShiftRemove: vi.fn(),
    onShiftClear: vi.fn(),
    onShiftMarkOpen: vi.fn(),
    onShiftSetDept: vi.fn(),
    onShiftSetColour: vi.fn(),
    onShiftResetColour: vi.fn(),
    onShiftAdd: vi.fn(),
    onShiftUpdate: vi.fn(),
    onRecordAbsence: vi.fn(),
    ...overrides,
  };
}

describe("rota inline record-absence command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The four spellings the grid accepts, each on a different day of the week.
  it.each([
    ["sick", 0],
    ["off sick", 2],
    ["sickness", 4],
    ["absent", 6],
  ])(
    "%s on day %i reaches onRecordAbsence with the right staff, day and type",
    async (value, dayIndex) => {
      const h = handlers();
      const cell = cellWithShift();

      await commitInlineCellEdit({
        value,
        cell,
        handlers: h,
        staffId: "staff-a",
        staffRole: "Chef",
        openRow: false,
        dayIndex,
      });

      expect(h.onRecordAbsence).toHaveBeenCalledTimes(1);
      expect(h.onRecordAbsence).toHaveBeenCalledWith({
        staffId: "staff-a",
        dayIndex,
        leaveType: "sick",
      });
    },
  );

  it("leaves the existing shift and cell completely unmodified", async () => {
    const h = handlers();
    const cell = cellWithShift();
    const before = structuredClone(cell);

    await commitInlineCellEdit({
      value: "off sick",
      cell,
      handlers: h,
      staffId: "staff-a",
      staffRole: "Chef",
      openRow: false,
      dayIndex: 2,
    });

    // Nothing was written through any mutation handler...
    expect(h.onShiftUpdate).not.toHaveBeenCalled();
    expect(h.onShiftAdd).not.toHaveBeenCalled();
    expect(h.onShiftClear).not.toHaveBeenCalled();
    expect(h.onShiftRemove).not.toHaveBeenCalled();
    expect(h.onShiftMarkOpen).not.toHaveBeenCalled();
    // ...and the cell object itself is byte-identical to its pre-commit snapshot.
    expect(cell).toEqual(before);
    expect(cell.shifts).toHaveLength(1);
    expect(cell.shifts[0]).toEqual(SHIFT);
  });

  it("does nothing on the open-shifts row, where there is nobody to record against", async () => {
    const h = handlers();
    const cell = cellWithShift();
    const before = structuredClone(cell);

    await commitInlineCellEdit({
      value: "sick",
      cell,
      handlers: h,
      staffId: null,
      openRow: true,
      dayIndex: 1,
    });

    expect(h.onRecordAbsence).not.toHaveBeenCalled();
    expect(h.onShiftUpdate).not.toHaveBeenCalled();
    expect(h.onShiftAdd).not.toHaveBeenCalled();
    expect(cell).toEqual(before);
  });

  it("does nothing in demo mode, where no onRecordAbsence handler is wired", async () => {
    const h = handlers({ onRecordAbsence: undefined });
    const cell = cellWithShift();
    const before = structuredClone(cell);

    await commitInlineCellEdit({
      value: "sick",
      cell,
      handlers: h,
      staffId: "staff-a",
      staffRole: "Chef",
      openRow: false,
      dayIndex: 3,
    });

    expect(h.onShiftUpdate).not.toHaveBeenCalled();
    expect(h.onShiftAdd).not.toHaveBeenCalled();
    expect(cell).toEqual(before);
  });

  it("still treats annual leave as blocked rather than routing it to absence", async () => {
    const h = handlers();
    const cell = cellWithShift();

    await commitInlineCellEdit({
      value: "annual leave",
      cell,
      handlers: h,
      staffId: "staff-a",
      staffRole: "Chef",
      openRow: false,
      dayIndex: 2,
    });

    expect(h.onRecordAbsence).not.toHaveBeenCalled();
    expect(h.onShiftUpdate).not.toHaveBeenCalled();
  });

  it("does not hijack an ordinary shift edit on the same cell", async () => {
    const h = handlers();
    const cell = cellWithShift();

    await commitInlineCellEdit({
      value: "10:00-16:00",
      cell,
      handlers: h,
      staffId: "staff-a",
      staffRole: "Chef",
      openRow: false,
      dayIndex: 2,
    });

    expect(h.onRecordAbsence).not.toHaveBeenCalled();
    expect(h.onShiftUpdate).toHaveBeenCalledTimes(1);
  });
});
