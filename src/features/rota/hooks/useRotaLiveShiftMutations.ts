import * as React from "react";
import { toast } from "sonner";
import type { DraftShift, DraftShiftInput, ShiftId } from "../types";
import type { RotaMutationRunner } from "./useRotaMutationRunner";
import {
  createLiveRotaShiftFn,
  duplicateLiveRotaShiftFn,
  markLiveRotaShiftOpenFn,
  removeLiveRotaShiftFn,
  updateLiveRotaShiftFn,
} from "../api/rotaLiveMutations";
import {
  validateLiveRotaRemoveResult,
  validateLiveRotaShiftResult,
} from "../api/rotaLiveMutationResult";

/**
 * Only the fields the update server-fn accepts; anything else is draft-only.
 *
 * Exported for its own test: a field that is silently dropped here fails in the
 * quietest possible way — the write succeeds, reports success, and changes
 * nothing — so the mapping is worth asserting directly rather than through a
 * hook.
 */
export function toUpdatePatch(patch: Partial<DraftShift>) {
  return {
    ...(patch.staffId !== undefined ? { staffId: patch.staffId } : {}),
    // Moving the shift to another day of the same rota week.
    ...(patch.dayIndex !== undefined ? { dayIndex: patch.dayIndex } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.start !== undefined ? { start: patch.start } : {}),
    ...(patch.end !== undefined ? { end: patch.end } : {}),
    ...(patch.breakMinutes !== undefined ? { breakMinutes: patch.breakMinutes } : {}),
    // Moving the shift between real workspace departments. Null is not a
    // meaningful value here — a shift always has a department — so only a
    // concrete id is forwarded.
    ...(patch.departmentId ? { departmentId: patch.departmentId } : {}),
    // Key presence (not value) signals intent; undefined → null clears it.
    ...("colourOverride" in patch ? { colourOverride: patch.colourOverride ?? null } : {}),
    ...("deptOverride" in patch ? { deptOverride: patch.deptOverride ?? null } : {}),
  };
}

/**
 * Single-shift writes against the live rota.
 *
 * Each action exists twice. The plain form is what the grid and drawers have
 * always used: it toasts on success and refetches the authoritative week before
 * returning. The `silent` form does neither, because a bulk run must not fire
 * one toast and one full week refetch per cell — the bulk executor refetches
 * once at the end and reports a single outcome.
 *
 * Both forms go through the same server functions and the same runner, so a
 * bulk write is never a privileged path: it cannot skip validation, department
 * authority, or the approved-leave publish guard.
 */
export function useRotaLiveShiftMutations(
  runMutation: RotaMutationRunner,
  liveWeekInput: () => { weekOffset: number; locationId?: string },
) {
  const addShift = React.useCallback(
    async (input: DraftShiftInput) => {
      await runMutation("Shift not saved", async () =>
        validateLiveRotaShiftResult(
          await createLiveRotaShiftFn({ data: { ...liveWeekInput(), shift: input } }),
        ),
      );
      toast.success("Shift saved", { description: "Saved to the live draft." });
    },
    [liveWeekInput, runMutation],
  );

  const updateShift = React.useCallback(
    async (shiftId: ShiftId, patch: Partial<DraftShift>) => {
      await runMutation("Shift not saved", async () =>
        validateLiveRotaShiftResult(
          await updateLiveRotaShiftFn({ data: { shiftId, patch: toUpdatePatch(patch) } }),
        ),
      );
      toast.success("Shift saved", { description: "Saved to the live draft." });
    },
    [runMutation],
  );

  const removeShiftNow = React.useCallback(
    async (shiftId: ShiftId) => {
      await runMutation("Shift not removed", async () =>
        validateLiveRotaRemoveResult(await removeLiveRotaShiftFn({ data: { shiftId } })),
      );
      toast.success("Shift removed", { description: "Saved to the live draft." });
    },
    [runMutation],
  );

  const markShiftOpen = React.useCallback(
    async (shiftId: ShiftId) => {
      await runMutation("Shift not opened", async () =>
        validateLiveRotaShiftResult(await markLiveRotaShiftOpenFn({ data: { shiftId } })),
      );
      toast.success("Shift opened", { description: "Saved to the live draft." });
    },
    [runMutation],
  );

  const duplicateShiftToNextDay = React.useCallback(
    async (shiftId: ShiftId): Promise<ShiftId | null> => {
      const result = await runMutation("Shift not duplicated", async () =>
        validateLiveRotaShiftResult(await duplicateLiveRotaShiftFn({ data: { shiftId } })),
      );
      toast.success("Shift duplicated", { description: "Saved to the live draft." });
      return result.shiftId;
    },
    [runMutation],
  );

  const silent = React.useMemo(() => {
    const bulk = { silent: true } as const;
    return {
      addShift: async (input: DraftShiftInput) => {
        await runMutation(
          "Shift not saved",
          async () =>
            validateLiveRotaShiftResult(
              await createLiveRotaShiftFn({ data: { ...liveWeekInput(), shift: input } }),
            ),
          bulk,
        );
      },
      updateShift: async (shiftId: ShiftId, patch: Partial<DraftShift>) => {
        await runMutation(
          "Shift not saved",
          async () =>
            validateLiveRotaShiftResult(
              await updateLiveRotaShiftFn({ data: { shiftId, patch: toUpdatePatch(patch) } }),
            ),
          bulk,
        );
      },
      removeShift: async (shiftId: ShiftId) => {
        await runMutation(
          "Shift not removed",
          async () =>
            validateLiveRotaRemoveResult(await removeLiveRotaShiftFn({ data: { shiftId } })),
          bulk,
        );
      },
    };
  }, [liveWeekInput, runMutation]);

  return {
    addShift,
    updateShift,
    removeShiftNow,
    markShiftOpen,
    duplicateShiftToNextDay,
    silent,
  };
}
