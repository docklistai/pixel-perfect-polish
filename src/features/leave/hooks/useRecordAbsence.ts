import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { recordAbsenceFn, type RecordedAbsence } from "../api/recordAbsence";
import { leaveQueryKeys } from "../lib/leaveQueryRange";
import { describeAbsenceConflicts } from "../lib/absenceConflicts";

export interface RecordAbsenceInput {
  staffMemberId: string;
  leaveType: RecordedAbsence["leave_type"];
  startDate: string;
  endDate: string;
  reason: string;
}

/**
 * The single manager-absence action. Leave, Rota and the staff profile all call
 * this — there is one write path, one invalidation set and one confirmation.
 *
 * Overlapping shifts are surfaced in the success toast rather than changed: the
 * RPC deliberately leaves the rota alone so the manager decides what to do.
 */
export function useRecordAbsence(workspaceId: string | null, onRecorded?: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: RecordAbsenceInput): Promise<RecordedAbsence> => {
      const result = await recordAbsenceFn({
        data: {
          workspaceId: workspaceId!,
          staffMemberId: input.staffMemberId,
          leaveType: input.leaveType,
          startDate: input.startDate,
          endDate: input.endDate,
          reason: input.reason,
        },
      });
      if (!result.ok) throw new Error(result.message);
      return result.absence;
    },
    onSuccess: async (absence) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leaveQueryKeys.all(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: ["manager-notifications", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "profile-rota", workspaceId] }),
      ]);
      const conflicts = describeAbsenceConflicts(absence);
      if (conflicts) {
        toast.warning("Absence recorded — rota needs review", { description: conflicts });
      } else {
        toast.success("Absence recorded", {
          description: `${absence.staff_display_name} is marked away. Nothing is published.`,
        });
      }
      onRecorded?.();
    },
    onError: (error: Error) => {
      toast.error("Couldn't record absence", { description: error.message });
    },
  });

  return {
    recordAbsence: mutation.mutate,
    recording: mutation.isPending,
    canRecord: Boolean(workspaceId),
  };
}
