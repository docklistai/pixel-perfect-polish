import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTimeEntryFn } from "../api/createTimeEntry";
import { TIME_QUERY_KEY } from "./useWorkspaceTime";
import type { ManualEntryPayload } from "../lib/manualEntry";

/**
 * Saves a validated manual time entry through `createTimeEntryFn` and refreshes
 * the live timesheet read so the new pending row appears immediately. Live mode
 * only — the caller renders the Add Entry surface only with a live workspace.
 */
export function useAddTimeEntry(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = React.useState(false);

  const save = async (payload: ManualEntryPayload, staffName: string): Promise<boolean> => {
    if (!workspaceId || isSaving) return false;
    setIsSaving(true);
    try {
      const result = await createTimeEntryFn({ data: payload });
      if (!result.ok) {
        toast.error("Couldn't record time entry", { description: result.message });
        return false;
      }
      await queryClient.invalidateQueries({ queryKey: ["time", TIME_QUERY_KEY, workspaceId] });
      toast.success("Time entry recorded", {
        description: `${staffName}'s hours for ${payload.workDate} are pending review.`,
      });
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  return { save, isSaving };
}
