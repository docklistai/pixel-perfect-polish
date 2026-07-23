import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RotaLiveData } from "./useRotaLiveData";
import { useRotaMutationRunner } from "./useRotaMutationRunner";
import { useRotaLiveShiftMutations } from "./useRotaLiveShiftMutations";
import {
  clearLiveRotaWeekFn,
  copyPreviousLiveRotaWeekFn,
  previewCopyPreviousLiveRotaWeekFn,
  publishLiveRotaWeekFn,
} from "../api/rotaLiveMutations";

export function useRotaLivePersistence(live: RotaLiveData, weekOffset: number) {
  const queryClient = useQueryClient();
  const { runMutation, pendingCountRef, pendingCount, lastMutationFailed } = useRotaMutationRunner(
    live.refetchWeek,
    live.locationId,
  );

  const liveWeekInput = React.useCallback(() => {
    if (!live.isLive) throw new Error("Live rota is not available.");
    return {
      weekOffset,
      ...(live.locationId ? { locationId: live.locationId } : {}),
    };
  }, [live.isLive, live.locationId, weekOffset]);

  const shifts = useRotaLiveShiftMutations(runMutation, liveWeekInput);

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

  const publish = React.useCallback(
    async (acknowledgeConstraints = false) => {
      const blockPublish = (message: string) => {
        toast.error("Rota not published", { description: message });
        throw new Error(message);
      };

      if (lastMutationFailed) blockPublish("Resolve the failed save before publishing.");
      if (pendingCountRef.current > 0)
        blockPublish("Wait for the current rota save before publishing.");
      if (!live.rotaWeekId) blockPublish("Save at least one shift before publishing.");
      if (live.weekStatus === "archived") blockPublish("Archived rota weeks cannot be published.");
      if (live.shifts.length === 0)
        blockPublish("Cannot publish a rota week with no saved shifts.");

      const result = await runMutation("Rota not published", async () =>
        publishLiveRotaWeekFn({ data: { ...liveWeekInput(), acknowledgeConstraints } }),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["portal", "published-shifts"] }),
        queryClient.invalidateQueries({ queryKey: ["portal", "notifications"] }),
        // Republishing finalises open-shift requests and reshapes the open list.
        queryClient.invalidateQueries({ queryKey: ["portal", "team-shifts"] }),
        queryClient.invalidateQueries({ queryKey: ["portal", "open-shifts"] }),
        queryClient.invalidateQueries({ queryKey: ["portal", "open-shift-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["portal", "shift-release-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["rota", "open-shift-applicants"] }),
        queryClient.invalidateQueries({ queryKey: ["rota", "shift-release-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["rota", "operational-issues"] }),
      ]);
      return result;
    },
    [lastMutationFailed, live, liveWeekInput, pendingCountRef, queryClient, runMutation],
  );

  return {
    isMutationPending: pendingCount > 0,
    lastMutationFailed,
    addShift: shifts.addShift,
    updateShift: shifts.updateShift,
    removeShiftNow: shifts.removeShiftNow,
    markShiftOpen: shifts.markShiftOpen,
    duplicateShiftToNextDay: shifts.duplicateShiftToNextDay,
    /** Toast-free, refetch-free writes for the bulk executor. */
    bulkRunners: { ...shifts.silent, refetch: live.refetchWeek },
    previewCopyPreviousWeek,
    copyPreviousWeek,
    clearWeek,
    publish,
  };
}
