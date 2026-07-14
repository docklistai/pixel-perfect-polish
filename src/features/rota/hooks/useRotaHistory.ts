import * as React from "react";
import type { useRotaDraftController } from "./useRotaDraftController";
import type { DraftShift, DraftShiftInput, ShiftId } from "../types";
import { captureInversePatch, patchChangesShift } from "../lib/rotaHistory";
import { shiftToInput } from "../lib/rotaHistoryInput";

type RotaController = ReturnType<typeof useRotaDraftController>;

type HistoryEntry = { undo: () => Promise<void> | void; redo: () => Promise<void> | void };

const MAX_HISTORY = 50;

/**
 * Undo/redo for single-shift rota edits. Wraps the controller's mutating actions
 * so each records a precise inverse: an edit/mark-open reverses id-stably via
 * captureInversePatch; add and remove match by content at undo/redo time (when
 * state has settled — so there is no async-timing hazard). Bulk ops and week
 * changes reset the history. The mutation layer validates every write, so a
 * stale inverse fails cleanly rather than corrupting data.
 */
export function useRotaHistory(controller: RotaController) {
  const [undoStack, setUndoStack] = React.useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = React.useState<HistoryEntry[]>([]);

  // Always-current snapshot so content matching at undo/redo time sees live data.
  const shiftsRef = React.useRef(controller.draftShifts);
  shiftsRef.current = controller.draftShifts;

  const reset = React.useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // A new week, demo/live switch, or location change invalidates every
  // recorded inverse — an undo captured against another location's rota must
  // never replay onto this one.
  React.useEffect(() => {
    reset();
  }, [controller.weekLabel, controller.source, controller.liveLocationId, reset]);

  // A bulk change (copy/clear week, copy-day, template) moves the count by >1 — its inverses aren't tracked, so drop history.
  const prevLenRef = React.useRef(controller.draftShifts.length);
  React.useEffect(() => {
    const len = controller.draftShifts.length;
    if (Math.abs(len - prevLenRef.current) > 1) reset();
    prevLenRef.current = len;
  }, [controller.draftShifts, reset]);

  const push = React.useCallback((entry: HistoryEntry) => {
    setUndoStack((stack) => [...stack, entry].slice(-MAX_HISTORY));
    setRedoStack([]);
  }, []);

  const findByContent = (input: DraftShiftInput): DraftShift | undefined =>
    shiftsRef.current.find(
      (shift) =>
        shift.dayIndex === input.dayIndex &&
        shift.staffId === input.staffId &&
        shift.role === input.role &&
        shift.start === input.start &&
        shift.end === input.end,
    );

  const updateShift = React.useCallback(
    async (id: ShiftId, patch: Partial<DraftShift>) => {
      const shift = shiftsRef.current.find((s) => s.id === id);
      if (!shift || !patchChangesShift(shift, patch)) return controller.updateShift(id, patch);
      const inverse = captureInversePatch(shift, patch);
      await controller.updateShift(id, patch);
      push({
        undo: () => controller.updateShift(id, inverse),
        redo: () => controller.updateShift(id, patch),
      });
    },
    [controller, push],
  );

  const markShiftOpen = React.useCallback(
    async (id: ShiftId) => {
      const shift = shiftsRef.current.find((s) => s.id === id);
      const before = shift
        ? { staffId: shift.staffId, status: shift.status, tone: shift.tone }
        : null;
      await controller.markShiftOpen(id);
      if (before) {
        push({
          undo: () => controller.updateShift(id, before),
          redo: () => controller.markShiftOpen(id),
        });
      }
    },
    [controller, push],
  );

  const removeShiftNow = React.useCallback(
    async (id: ShiftId) => {
      const shift = shiftsRef.current.find((s) => s.id === id);
      await controller.removeShiftNow(id);
      if (shift) {
        const input = shiftToInput(shift);
        push({
          undo: () => controller.addShift(input),
          redo: async () => {
            const match = findByContent(input);
            if (match) await controller.removeShiftNow(match.id);
          },
        });
      }
    },
    [controller, push],
  );

  const addShift = React.useCallback(
    async (input: DraftShiftInput) => {
      await controller.addShift(input);
      push({
        undo: async () => {
          const match = findByContent(input);
          if (match) await controller.removeShiftNow(match.id);
        },
        redo: () => controller.addShift(input),
      });
    },
    [controller, push],
  );

  const undo = React.useCallback(async () => {
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    await entry.undo();
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, entry]);
  }, [undoStack]);

  const redo = React.useCallback(async () => {
    const entry = redoStack[redoStack.length - 1];
    if (!entry) return;
    await entry.redo();
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, entry]);
  }, [redoStack]);

  // Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo — but never while typing in a field
  // (the inline cell editor and search own their own undo).
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      event.preventDefault();
      if (event.shiftKey) void redo();
      else void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const wrappedController = React.useMemo(
    () => ({ ...controller, addShift, updateShift, removeShiftNow, markShiftOpen }),
    [controller, addShift, updateShift, removeShiftNow, markShiftOpen],
  );

  return {
    controller: wrappedController,
    undo,
    redo,
    reset,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
