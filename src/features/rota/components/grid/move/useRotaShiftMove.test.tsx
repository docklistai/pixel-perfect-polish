import * as React from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRotaShiftMove } from "./useRotaShiftMove";
import { makeCell, makeShift } from "../bulk/bulkTestFactories";
import type { RotaCellKey } from "../selection/rotaSelectionModel";
import type {
  DraftShift,
  RotaDayIndex,
  RotaGridOpenRow,
  RotaGridStaffRow,
  StaffMember,
} from "../../../types";

/**
 * The state machine every input method shares.
 *
 * These assert the contract that matters downstream: one completed move is
 * exactly ONE `onShiftUpdate` call, because the history hook records one undo
 * entry per call. A move that wrote twice — or wrote when it should have done
 * nothing — would cost the manager two presses of Undo to put right.
 */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function member(id: string, name: string): StaffMember {
  return { id, name, role: "Bar", hrs: "40h", img: 1, tone: "info" };
}

const ADA = member("ada", "Ada");
const BO = member("bo", "Bo");
const GONE = member("gone", "Former Employee");

const MOVED = makeShift({ id: "shift-1", staffId: "ada", dayIndex: 1 as RotaDayIndex });

function staffRow(
  staff: StaffMember,
  shiftsByDay: Record<number, DraftShift[]> = {},
): RotaGridStaffRow {
  return {
    kind: "staff",
    staff,
    cells: DAY_LABELS.map((_, day) => makeCell(shiftsByDay[day] ?? [])),
  };
}

const OPEN_ROW: RotaGridOpenRow = { kind: "open", cells: DAY_LABELS.map(() => makeCell()) };

function setup(overrides: { mutationPending?: boolean; pointerCapable?: boolean } = {}) {
  const onShiftUpdate = vi.fn().mockResolvedValue(undefined);
  const announce = vi.fn();
  const gridRef = { current: null } as React.RefObject<HTMLDivElement | null>;

  const rendered = renderHook(
    (props: { resetKey: string }) =>
      useRotaShiftMove({
        staffRows: [staffRow(ADA, { 1: [MOVED] }), staffRow(BO), staffRow(GONE)],
        openRow: OPEN_ROW,
        dayLabels: DAY_LABELS,
        assignableStaff: [ADA, BO],
        readOnly: false,
        weekIsEditable: true,
        mutationPending: overrides.mutationPending ?? false,
        pointerCapable: overrides.pointerCapable ?? true,
        gridRef,
        announce,
        onShiftUpdate,
        resetKey: props.resetKey,
      }),
    { initialProps: { resetKey: "week-1" } },
  );

  const source: RotaCellKey = { row: "staff:ada", day: 1 };
  const arm = () => act(() => rendered.result.current.move.arm(MOVED, source, 1));
  const commitTo = (cell: RotaCellKey) => act(() => rendered.result.current.move.commitTo(cell));
  const key = (k: string, cell: RotaCellKey) => {
    const event = { key: k, preventDefault: vi.fn() };
    let consumed = false;
    act(() => {
      consumed = rendered.result.current.handleCellKeyDown(
        event as unknown as React.KeyboardEvent<HTMLDivElement>,
        cell,
      );
    });
    return { consumed, event };
  };

  return { ...rendered, onShiftUpdate, announce, source, arm, commitTo, key };
}

describe("useRotaShiftMove — committing", () => {
  it("writes a day move once, with only the day in the patch", async () => {
    const t = setup();
    t.arm();
    await act(async () => t.commitTo({ row: "staff:ada", day: 4 }));

    expect(t.onShiftUpdate).toHaveBeenCalledTimes(1);
    expect(t.onShiftUpdate).toHaveBeenCalledWith("shift-1", { dayIndex: 4 });
  });

  it("writes a reassignment once, with only the assignment in the patch", async () => {
    const t = setup();
    t.arm();
    await act(async () => t.commitTo({ row: "staff:bo", day: 1 }));

    expect(t.onShiftUpdate).toHaveBeenCalledTimes(1);
    expect(t.onShiftUpdate).toHaveBeenCalledWith("shift-1", { staffId: "bo" });
  });

  it("writes a diagonal move as one call carrying both dimensions", async () => {
    const t = setup();
    t.arm();
    await act(async () => t.commitTo({ row: "staff:bo", day: 5 }));

    expect(t.onShiftUpdate).toHaveBeenCalledTimes(1);
    expect(t.onShiftUpdate).toHaveBeenCalledWith("shift-1", { dayIndex: 5, staffId: "bo" });
  });

  it("unassigns onto the open row", async () => {
    const t = setup();
    t.arm();
    await act(async () => t.commitTo({ row: "open", day: 1 }));

    expect(t.onShiftUpdate).toHaveBeenCalledWith("shift-1", { staffId: null });
  });

  it("disarms after a completed move", async () => {
    const t = setup();
    t.arm();
    expect(t.result.current.move.armedShiftId).toBe("shift-1");
    await act(async () => t.commitTo({ row: "staff:bo", day: 1 }));
    expect(t.result.current.move.armedShiftId).toBeNull();
  });

  it("announces the outcome only once the write has settled", async () => {
    const t = setup();
    t.arm();
    await act(async () => t.commitTo({ row: "staff:bo", day: 5 }));

    expect(t.announce).toHaveBeenCalledWith(expect.stringContaining("Moved Bar shift to Bo, Sat"));
  });
});

describe("useRotaShiftMove — refusing to write", () => {
  it("writes nothing when dropped back on its own cell", async () => {
    const t = setup();
    t.arm();
    await act(async () => t.commitTo(t.source));

    expect(t.onShiftUpdate).not.toHaveBeenCalled();
    expect(t.announce).toHaveBeenCalledWith("Move cancelled.");
    expect(t.result.current.move.armedShiftId).toBeNull();
  });

  it("writes nothing for a staff member who has left, and stays armed", async () => {
    const t = setup();
    t.arm();
    await act(async () => t.commitTo({ row: "staff:gone", day: 2 }));

    expect(t.onShiftUpdate).not.toHaveBeenCalled();
    expect(t.announce).toHaveBeenCalledWith(
      "That team member is not active, so a shift cannot be moved to them.",
    );
    // Still holding the shift: they picked a cell that cannot take it, not a
    // cell they meant to abandon it on.
    expect(t.result.current.move.armedShiftId).toBe("shift-1");
  });

  it("refuses to arm at all while another rota write is in flight", () => {
    const t = setup({ mutationPending: true });
    t.arm();

    expect(t.result.current.move.armedShiftId).toBeNull();
    expect(t.announce).toHaveBeenCalledWith("Wait for the current rota save to finish.");
  });

  it("abandons an armed move when the week changes underneath it", () => {
    const t = setup();
    t.arm();
    t.rerender({ resetKey: "week-2" });

    expect(t.result.current.move.armedShiftId).toBeNull();
  });

  it("reports a failed write without claiming the shift moved", async () => {
    const t = setup();
    t.onShiftUpdate.mockRejectedValueOnce(new Error("nope"));
    t.arm();
    await act(async () => t.commitTo({ row: "staff:bo", day: 1 }));

    expect(t.announce).toHaveBeenCalledWith("The shift was not moved.");
    expect(t.announce).not.toHaveBeenCalledWith(expect.stringContaining("Moved"));
  });
});

describe("useRotaShiftMove — keyboard", () => {
  it("claims Enter to place the shift", async () => {
    const t = setup();
    t.arm();
    const { consumed } = t.key("Enter", { row: "staff:bo", day: 3 });

    expect(consumed).toBe(true);
    await act(async () => {});
    expect(t.onShiftUpdate).toHaveBeenCalledWith("shift-1", { dayIndex: 3, staffId: "bo" });
  });

  it("claims Space to place the shift", async () => {
    const t = setup();
    t.arm();
    t.key(" ", { row: "staff:bo", day: 3 });

    await act(async () => {});
    expect(t.onShiftUpdate).toHaveBeenCalledTimes(1);
  });

  it("claims Escape to cancel, writing nothing", () => {
    const t = setup();
    t.arm();
    const { consumed } = t.key("Escape", { row: "staff:bo", day: 3 });

    expect(consumed).toBe(true);
    expect(t.onShiftUpdate).not.toHaveBeenCalled();
    expect(t.result.current.move.armedShiftId).toBeNull();
    expect(t.announce).toHaveBeenCalledWith("Move cancelled.");
  });

  it("leaves arrows to the grid's own navigation", () => {
    const t = setup();
    t.arm();
    expect(t.key("ArrowRight", { row: "staff:ada", day: 1 }).consumed).toBe(false);
  });

  it("claims nothing at all when no move is armed", () => {
    const t = setup();
    for (const k of ["Enter", " ", "Escape"]) {
      expect(t.key(k, { row: "staff:ada", day: 1 }).consumed).toBe(false);
    }
    expect(t.onShiftUpdate).not.toHaveBeenCalled();
  });
});

describe("useRotaShiftMove — proposed target", () => {
  it("tones a legal destination as valid and the source as itself", () => {
    const t = setup();
    t.arm();
    act(() => t.result.current.move.proposeTarget({ row: "staff:bo", day: 2 }));

    expect(t.result.current.move.targetTone({ row: "staff:bo", day: 2 })).toBe("valid");
    expect(t.result.current.move.isSourceCell(t.source)).toBe(true);
    expect(t.result.current.move.acceptsDrop({ row: "staff:bo", day: 2 })).toBe(true);
  });

  it("tones a departed team member's row as invalid and refuses the drop", () => {
    const t = setup();
    t.arm();
    act(() => t.result.current.move.proposeTarget({ row: "staff:gone", day: 2 }));

    expect(t.result.current.move.targetTone({ row: "staff:gone", day: 2 })).toBe("invalid");
    expect(t.result.current.move.acceptsDrop({ row: "staff:gone", day: 2 })).toBe(false);
  });

  it("says nothing about cells that are not the current target", () => {
    const t = setup();
    t.arm();
    act(() => t.result.current.move.proposeTarget({ row: "staff:bo", day: 2 }));

    expect(t.result.current.move.targetTone({ row: "staff:bo", day: 6 })).toBe("none");
  });
});

describe("useRotaShiftMove — pointer capability", () => {
  it("offers pointer drag on a fine-pointer viewport", () => {
    expect(setup().result.current.move.pointerReady).toBe(true);
  });

  it("withholds pointer drag on touch, where the menu path takes over", () => {
    expect(setup({ pointerCapable: false }).result.current.move.pointerReady).toBe(false);
  });

  it("withholds pointer drag while a write is in flight", () => {
    expect(setup({ mutationPending: true }).result.current.move.pointerReady).toBe(false);
  });
});
