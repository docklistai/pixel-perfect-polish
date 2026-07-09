import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clearRotaDayFn,
  copyRotaDayFn,
  type ClearRotaDayResult,
  type CopyRotaDayResult,
} from "../api/copyRotaDay";

/** Copy or clear a rota day; refreshes the live grid on success. */
export function useCopyRotaDay() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week"] });

  const copyMutation = useMutation({
    mutationFn: (vars: { rotaWeekId: string; fromWeekday: number; toWeekdays: number[] }) =>
      copyRotaDayFn({ data: vars }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const clearMutation = useMutation({
    mutationFn: (vars: { rotaWeekId: string; weekday: number }) => clearRotaDayFn({ data: vars }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  return {
    isCopying: copyMutation.isPending,
    isClearing: clearMutation.isPending,
    copy: (
      rotaWeekId: string,
      fromWeekday: number,
      toWeekdays: number[],
    ): Promise<CopyRotaDayResult> =>
      copyMutation.mutateAsync({ rotaWeekId, fromWeekday, toWeekdays }),
    clear: (rotaWeekId: string, weekday: number): Promise<ClearRotaDayResult> =>
      clearMutation.mutateAsync({ rotaWeekId, weekday }),
  };
}
