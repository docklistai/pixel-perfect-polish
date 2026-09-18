import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RotaGridToolbar } from "./RotaGridToolbar";

/**
 * Undo/redo is already wired to `useRotaHistory` through the route. These tests
 * pin the toolbar half of that contract so the controls cannot be disconnected,
 * left permanently enabled, or lose their shortcut hint without a failure.
 */

function renderToolbar(overrides: Partial<Parameters<typeof RotaGridToolbar>[0]> = {}) {
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  render(
    <RotaGridToolbar
      conflictCount={0}
      openShiftCount={0}
      workingTimeAlertCount={0}
      onFilter={vi.fn()}
      onBuildWeek={vi.fn()}
      onAddShift={vi.fn()}
      onViewConflicts={vi.fn()}
      onViewWorkingTime={vi.fn()}
      onCopyLastWeek={vi.fn()}
      onUndo={onUndo}
      onRedo={onRedo}
      canUndo
      canRedo
      {...overrides}
    />,
  );
  return {
    onUndo,
    onRedo,
    undo: screen.getByRole("button", { name: /undo/i }),
    redo: screen.getByRole("button", { name: /redo/i }),
  };
}

describe("RotaGridToolbar undo/redo", () => {
  it("renders both controls with accessible names", () => {
    const { undo, redo } = renderToolbar();

    expect(undo).toBeInTheDocument();
    expect(redo).toBeInTheDocument();
  });

  it("calls the history handlers on click", async () => {
    const user = userEvent.setup();
    const { onUndo, onRedo, undo, redo } = renderToolbar();

    await user.click(undo);
    await user.click(redo);

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it("disables undo when there is nothing to undo", async () => {
    const user = userEvent.setup();
    const { onUndo, undo } = renderToolbar({ canUndo: false });

    expect(undo).toBeDisabled();
    await user.click(undo);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it("disables redo when there is nothing to redo", async () => {
    const user = userEvent.setup();
    const { onRedo, redo } = renderToolbar({ canRedo: false });

    expect(redo).toBeDisabled();
    await user.click(redo);
    expect(onRedo).not.toHaveBeenCalled();
  });

  it("disables each control independently", () => {
    const { undo, redo } = renderToolbar({ canUndo: true, canRedo: false });

    expect(undo).toBeEnabled();
    expect(redo).toBeDisabled();
  });

  it("advertises the keyboard shortcut on both controls", () => {
    const { undo, redo } = renderToolbar();

    expect(undo).toHaveAttribute("title", expect.stringContaining("Ctrl/Cmd+Z"));
    expect(redo).toHaveAttribute("title", expect.stringContaining("Ctrl/Cmd+Shift+Z"));
  });
});

describe("RotaGridToolbar assignment facts", () => {
  it("renders 'No shifts planned' on an empty week with no percentage", () => {
    renderToolbar({ plannedShiftCount: 0, openShiftCount: 0 });
    expect(screen.getByText("No shifts planned")).toBeInTheDocument();
    expect(screen.queryByText(/% coverage/i)).not.toBeInTheDocument();
  });

  it("renders assignment composition on a partial week with open shifts", () => {
    renderToolbar({
      plannedShiftCount: 8,
      assignedShiftCount: 6,
      openShiftCount: 2,
    });
    expect(screen.getByText("6 of 8 assigned · 2 open")).toBeInTheDocument();
    expect(screen.queryByText(/% coverage/i)).not.toBeInTheDocument();
  });

  it("renders 'All shifts assigned' only when planned > 0 and open = 0", () => {
    renderToolbar({
      plannedShiftCount: 5,
      assignedShiftCount: 5,
      openShiftCount: 0,
    });
    expect(screen.getByText("All shifts assigned")).toBeInTheDocument();
    expect(screen.queryByText(/% coverage/i)).not.toBeInTheDocument();
  });
});
