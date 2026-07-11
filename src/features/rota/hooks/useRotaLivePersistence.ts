import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DraftShift, DraftShiftInput, ShiftId } from "../types";
import type { RotaLiveData } from "./useRotaLiveData";
import {
  clearLiveRotaWeekFn,
  copyPreviousLiveRotaWeekFn,
  createLiveRotaShiftFn,
  duplicateLiveRotaShiftFn,
  markLiveRotaShiftOpenFn,
  previewCopyPreviousLiveRotaWeekFn,
  publishLiveRotaWeekFn,
  removeLiveRotaShiftFn,
  updateLiveRotaShiftFn,
} from "../api/rotaLiveMutations";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The live rota could not be saved.";
}

export function useRotaLivePersistence(live: RotaLiveData, weekOffset: number) {
  const queryClient = useQueryClient();
  const pendingCountRef = React.useRef(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [lastMutationFailed, setLastMutationFailed] = React.useState(false);

  const liveWeekInput = React.useCallback(() => {
    if (!live.isLive) throw new Error("Live rota is not available.");
    return {
      weekOffset,
      ...(live.locationId ? { locationId: live.locationId } : {}),
    };
  }, [live.isLive, live.locationId, weekOffset]);

  const runMutation = React.useCallback(
    async <T>(label: string, operation: () => Promise<T>): Promise<T> => {
      if (pendingCountRef.current > 0) {
        const error = new Error("Wait for the current rota save to finish.");
        toast.info("Rota save in progress", { description: error.message });
        throw error;
      }

      pendingCountRef.current += 1;
      setPendingCount(pendingCountRef.current);
      setLastMutationFailed(false);
      try {
        const result = await operation();
        await live.refetchWeek();
        setLastMutationFailed(false);
        return result;
      } catch (error) {
        setLastMutationFailed(true);
        toast.error(label, { description: errorMessage(error) });
        throw error;
      } finally {
        pendingCountRef.current -= 1;
        setPendingCount(pendingCountRef.current);
      }
    },
    [live],
  );

  const addShift = React.useCallback(
    async (input: DraftShiftInput) => {
      await runMutation("Shift not saved", async () =>
        createLiveRotaShiftFn({ data: { ...liveWeekInput(), shift: input } }),
      );
      toast.success("Shift saved", { description: "Saved to the live draft." });
    },
    [liveWeekInput, runMutation],
  );

  const updateShift = React.useCallback(
    async (shiftId: ShiftId, patch: Partial<DraftShift>) => {
      await runMutation("Shift not saved", async () =>
        updateLiveRotaShiftFn({
          data: {
            shiftId,
            patch: {
              ...(patch.staffId !== undefined ? { staffId: patch.staffId } : {}),
              ...(patch.role !== undefined ? { role: patch.role } : {}),
              ...(patch.start !== undefined ? { start: patch.start } : {}),
              ...(patch.end !== undefined ? { end: patch.end } : {}),
              ...(patch.breakMinutes !== undefined ? { breakMinutes: patch.breakMinutes } : {}),
              // Key presence (not value) signals intent; undefined → null clears it.
              ...("colourOverride" in patch
                ? { colourOverride: patch.colourOverride ?? null }
                : {}),
              ...("deptOverride" in patch ? { deptOverride: patch.deptOverride ?? null } : {}),
            },
          },
        }),
      );
      toast.success("Shift saved", { description: "Saved to the live draft." });
    },
    [runMutation],
  );

  const removeShiftNow = React.useCallback(
    async (shiftId: ShiftId) => {
      await runMutation("Shift not removed", async () =>
        removeLiveRotaShiftFn({ data: { shiftId } }),
      );
      toast.success("Shift removed", { description: "Saved to the live draft." });
    },
    [runMutation],
  );

  const markShiftOpen = React.useCallback(
    async (shiftId: ShiftId) => {
      await runMutation("Shift not opened", async () =>
        markLiveRotaShiftOpenFn({ data: { shiftId } }),
      );
      toast.success("Shift opened", { description: "Saved to the live draft." });
    },
    [runMutation],
  );

  const duplicateShiftToNextDay = React.useCallback(
    async (shiftId: ShiftId): Promise<ShiftId | null> => {
      const result = await runMutation("Shift not duplicated", async () =>
        duplicateLiveRotaShiftFn({ data: { shiftId } }),
      );
      toast.success("Shift duplicated", { description: "Saved to the live draft." });
      return result.shiftId;
    },
    [runMutation],
  );

  const clearWeek = React.useCallback(async () => {
    await runMutation("Week not cleared", async () =>
      clearLiveRotaWeekFn({ data: liveWeekInput() }),
    );
    toast.success("Week cleared", { description: "Saved to the live draft." });
  }, [liveWeekInput, runMutation]);

  const copyPreviousWeek = React.useCallback(async () => {
    const result = await runMutation("Previous week not copied", async () =>
      copyPreviousLiveRotaWeekFn({ data: liveWeekInput() }),
    );
    toast.success("Previous week copied", {
      description: `${result.shiftCount} shifts saved to this live draft. Review before publishing.`,
    });
  }, [liveWeekInput, runMutation]);

  const previewCopyPreviousWeek = React.useCallback(
    () =>
      runMutation("Previous week not previewed", async () =>
        previewCopyPreviousLiveRotaWeekFn({ data: liveWeekInput() }),
      ),
    [liveWeekInput, runMutation],
  );

  const publish = React.useCallback(async () => {
    const blockPublish = (message: string) => {
      toast.error("Rota not published", { description: message });
      throw new Error(message);
    };

    if (lastMutationFailed) blockPublish("Resolve the failed save before publishing.");
    if (pendingCountRef.current > 0)
      blockPublish("Wait for the current rota save before publishing.");
    if (!live.rotaWeekId) blockPublish("Save at least one shift before publishing.");
    if (live.weekStatus === "archived") blockPublish("Archived rota weeks cannot be published.");
    if (live.shifts.length === 0) blockPublish("Cannot publish a rota week with no saved shifts.");

    const result = await runMutation("Rota not published", async () =>
      publishLiveRotaWeekFn({ data: liveWeekInput() }),
    );
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["portal", "published-shifts"] }),
      queryClient.invalidateQueries({ queryKey: ["portal", "notifications"] }),
    ]);
    return result;
  }, [lastMutationFailed, live, liveWeekInput, queryClient, runMutation]);

  return {
    isMutationPending: pendingCount > 0,
    lastMutationFailed,
    addShift,
    updateShift,
    removeShiftNow,
    markShiftOpen,
    duplicateShiftToNextDay,
    previewCopyPreviousWeek,
    copyPreviousWeek,
    clearWeek,
    publish,
  };
}
