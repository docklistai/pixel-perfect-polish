import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RotaGridCell } from "./RotaGridCell";
import { makeCell, makeShift } from "./bulk/bulkTestFactories";
import type { RotaMoveApi } from "./move/rotaMoveApi";
import type { RotaCellSelectionApi, RotaGridDay, ShiftActionHandlers } from "./types";
import type { RotaDayIndex, RotaGridCell as RotaGridCellData } from "../../types";

/**
 * The cell's side of a move, and the interactions it must not have broken.
 *
 * The focus assertion is the one worth being careful about. A shift pill is
 * never meant to hold focus while desktop selection is on, because Delete and
 * the fill shortcuts are addressed to the cell. That used to be enforced by the
 * pill preventing its own mousedown default — which also cancelled the cell's
 * native drag, so a shift could never be picked up by grabbing it. The cell now
 * reclaims focus a frame later instead, and this test is what holds that
 * guarantee in place.
 */

const DAY: RotaGridDay = { d: "Wed", h: "6", c: "", tone: "muted", isToday: false };

function makeMove(overrides: Partial<RotaMoveApi> = {}): RotaMoveApi {
  return {
    pointerReady: true,
    armedShiftId: null,
    isSourceCell: () => false,
    targetTone: () => "none",
    acceptsDrop: () => false,
    arm: vi.fn(),
    proposeTarget: vi.fn(),
    commitTo: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}

function makeSelection(enabled = true): RotaCellSelectionApi {
  return {
    enabled,
    isSelected: () => false,
    isAnchor: () => false,
    onCellMouseDown: vi.fn(),
    onCellFocus: vi.fn(),
    onCellKeyDown: () => false,
  };
}

function makeHandlers(overrides: Partial<ShiftActionHandlers> = {}): ShiftActionHandlers {
  return {
    readOnly: false,
    serverBacked: true,
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
    ...overrides,
  };
}

function renderCell({
  cell = makeCell([makeShift({ id: "shift-1", dayIndex: 2 as RotaDayIndex })]),
  move = makeMove(),
  selection = makeSelection(),
  handlers = makeHandlers(),
}: {
  cell?: RotaGridCellData;
  move?: RotaMoveApi;
  selection?: RotaCellSelectionApi;
  handlers?: ShiftActionHandlers;
} = {}) {
  const result = render(
    <div data-rota-grid>
      <RotaGridCell
        cell={cell}
        day={DAY}
        context="staff"
        cellLabel="Ada, Wed"
        handlers={handlers}
        selection={selection}
        move={move}
        rowKey="staff:ada"
        staffId="ada"
        staffRole="Bar"
        dayIndex={2}
        rowIndex={0}
        isTabStop
        onFocus={vi.fn()}
      />
    </div>,
  );
  const gridcell = screen.getByRole("gridcell");
  return { ...result, gridcell, move, handlers, selection };
}

describe("RotaGridCell — pointer drag", () => {
  it("offers a cell holding one shift as a drag source", () => {
    expect(renderCell().gridcell).toHaveAttribute("draggable", "true");
  });

  it("refuses to drag a cell holding a split shift", () => {
    const cell = makeCell([makeShift({ id: "a" }), makeShift({ id: "b" })]);
    expect(renderCell({ cell }).gridcell).not.toHaveAttribute("draggable");
  });

  it("refuses to drag an empty cell", () => {
    expect(renderCell({ cell: makeCell([]) }).gridcell).not.toHaveAttribute("draggable");
  });

  it("withholds drag entirely on a touch viewport", () => {
    const move = makeMove({ pointerReady: false });
    expect(renderCell({ move }).gridcell).not.toHaveAttribute("draggable");
  });
});

describe("RotaGridCell — focus stays on the cell", () => {
  it("reclaims focus from a shift pill while selection is on", async () => {
    const user = userEvent.setup();
    const { gridcell, container } = renderCell();
    const pill = container.querySelector<HTMLElement>(".rota-shift-pill");

    await user.click(pill!);

    // The button may take focus for a frame; the cell must end up with it, or
    // the next Delete would reach nothing.
    await waitFor(() => expect(gridcell).toHaveFocus());
  });
});

describe("RotaGridCell — arming a move", () => {
  it("offers Move shift… in the shift menu and arms the shift", async () => {
    const user = userEvent.setup();
    const move = makeMove();
    const { gridcell } = renderCell({ move });

    gridcell.focus();
    await user.keyboard("m");
    await user.click(await screen.findByRole("menuitem", { name: /Move shift/ }));

    // Menu actions run a frame after the menu closes, so that focus is back on
    // the cell before anything an action opens can capture it.
    await waitFor(() => expect(move.arm).toHaveBeenCalledTimes(1));
    expect(move.arm).toHaveBeenCalledWith(
      expect.objectContaining({ id: "shift-1" }),
      { row: "staff:ada", day: 2 },
      1,
    );
  });

  it("disables the move for a cell holding more than one shift, and says why", async () => {
    const user = userEvent.setup();
    const move = makeMove();
    const cell = makeCell([makeShift({ id: "a" }), makeShift({ id: "b" })]);
    const { gridcell } = renderCell({ cell, move });

    gridcell.focus();
    await user.keyboard("m");

    const item = await screen.findByRole("menuitem", { name: /Move shift/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("more than one shift");
  });

  // B1. An overlay opened by a menu item mounts while the item still holds
  // focus and is about to unmount, so it captured a doomed element and stranded
  // focus on <body> when it closed. Every action now hands focus back to the
  // cell first, which is the persistent element an overlay can return to.
  it("returns focus to the owning cell before a menu action runs", async () => {
    const user = userEvent.setup();
    const onShiftOpen = vi.fn();
    const { gridcell } = renderCell({ handlers: makeHandlers({ onShiftOpen }) });

    gridcell.focus();
    await user.keyboard("m");
    await user.click(await screen.findByRole("menuitem", { name: /Open details/ }));

    await waitFor(() => expect(onShiftOpen).toHaveBeenCalledWith("shift-1"));
    // The assertion that matters: focus is on a persistent grid cell, never on
    // the menu item that is about to be torn down.
    await waitFor(() => expect(gridcell).toHaveFocus());
  });

  it("returns focus to the owning cell when the menu closes without a selection", async () => {
    const user = userEvent.setup();
    const { gridcell } = renderCell();

    gridcell.focus();
    await user.keyboard("m");
    await screen.findByRole("menuitem", { name: /Open details/ });
    await user.keyboard("{Escape}");

    await waitFor(() => expect(gridcell).toHaveFocus());
  });

  it("disables the move while the rota is read-only", async () => {
    const user = userEvent.setup();
    const { gridcell } = renderCell({ handlers: makeHandlers({ readOnly: true }) });

    gridcell.focus();
    await user.keyboard("m");

    expect(await screen.findByRole("menuitem", { name: /Move shift/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("RotaGridCell — placing an armed move", () => {
  it("commits to this cell when it is tapped, which is the mobile path", async () => {
    const user = userEvent.setup();
    const move = makeMove({ armedShiftId: "shift-9" });
    const { gridcell, handlers } = renderCell({ move, selection: makeSelection(false) });

    await user.click(gridcell);

    expect(move.commitTo).toHaveBeenCalledWith({ row: "staff:ada", day: 2 });
    // A tap that places a shift must not also open the drawer behind it.
    expect(handlers.onShiftOpen).not.toHaveBeenCalled();
  });

  // B2. Occupied destinations are a supported move target, and on touch the pill
  // sitting in one still opens the detail drawer on its own click. Placing a
  // shift there used to do both: commit the move AND open a drawer over it.
  it("tapping the pill of an OCCUPIED destination places the shift and opens nothing", async () => {
    const user = userEvent.setup();
    const move = makeMove({ armedShiftId: "shift-9" });
    const occupied = makeCell([makeShift({ id: "already-here", dayIndex: 2 as RotaDayIndex })]);
    const {
      container,
      move: api,
      handlers,
    } = renderCell({
      cell: occupied,
      move,
      // Touch: the pill's own open action is live, unlike on desktop.
      selection: makeSelection(false),
    });

    await user.click(container.querySelector<HTMLElement>(".rota-shift-pill")!);

    expect(api.commitTo).toHaveBeenCalledTimes(1);
    expect(api.commitTo).toHaveBeenCalledWith({ row: "staff:ada", day: 2 });
    expect(handlers.onShiftOpen).not.toHaveBeenCalled();
  });

  it("leaves an occupied cell's ordinary tap-to-open behaviour alone when nothing is armed", async () => {
    const user = userEvent.setup();
    const occupied = makeCell([makeShift({ id: "already-here", dayIndex: 2 as RotaDayIndex })]);
    const {
      container,
      move: api,
      handlers,
    } = renderCell({
      cell: occupied,
      move: makeMove(),
      selection: makeSelection(false),
    });

    await user.click(container.querySelector<HTMLElement>(".rota-shift-pill")!);

    expect(handlers.onShiftOpen).toHaveBeenCalledWith("already-here");
    expect(api.commitTo).not.toHaveBeenCalled();
  });

  it("still places onto an EMPTY destination without opening an editor", async () => {
    const user = userEvent.setup();
    const move = makeMove({ armedShiftId: "shift-9" });
    const { gridcell, move: api } = renderCell({
      cell: makeCell([]),
      move,
      selection: makeSelection(false),
    });

    await user.click(gridcell);

    expect(api.commitTo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("proposes itself as the destination when arrow keys move focus onto it", () => {
    const move = makeMove({ armedShiftId: "shift-9" });
    const { gridcell } = renderCell({ move });

    gridcell.focus();

    expect(move.proposeTarget).toHaveBeenCalledWith({ row: "staff:ada", day: 2 });
  });

  it("proposes nothing while no move is armed", () => {
    const move = makeMove();
    renderCell({ move }).gridcell.focus();

    expect(move.proposeTarget).not.toHaveBeenCalled();
  });

  it("names the armed state in its accessible name", () => {
    const move = makeMove({ armedShiftId: "shift-9", targetTone: () => "valid" });
    expect(renderCell({ move }).gridcell).toHaveAccessibleName(
      expect.stringContaining("Press Enter to move the shift here") as unknown as string,
    );
  });
});

describe("RotaGridCell — existing behaviour preserved", () => {
  it("still opens the shift drawer on Enter", async () => {
    const user = userEvent.setup();
    const { gridcell, handlers } = renderCell();

    gridcell.focus();
    await user.keyboard("{Enter}");

    expect(handlers.onShiftOpen).toHaveBeenCalledWith("shift-1");
  });

  it("still opens the inline editor on F2", async () => {
    const user = userEvent.setup();
    const { gridcell } = renderCell();

    gridcell.focus();
    await user.keyboard("{F2}");

    expect(await screen.findByRole("textbox")).toBeInTheDocument();
  });

  it("still opens the shift menu on M", async () => {
    const user = userEvent.setup();
    const { gridcell } = renderCell();

    gridcell.focus();
    await user.keyboard("m");

    expect(await screen.findByRole("menuitem", { name: /Open details/ })).toBeInTheDocument();
  });

  it("does not open an editor for an empty cell while a move is armed", async () => {
    const user = userEvent.setup();
    const move = makeMove({ armedShiftId: "shift-9" });
    const { gridcell } = renderCell({ cell: makeCell([]), move, selection: makeSelection(false) });

    await user.click(gridcell);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(move.commitTo).toHaveBeenCalled();
  });
});
