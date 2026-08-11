import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TeamMutationResult } from "../api/teamRpcResult";

export const teamQueryKey = (workspaceId: string | null) => ["team", workspaceId] as const;

/**
 * One pending flag and one invalidation policy for every Team write. Only Team
 * and the manager notification badge are invalidated — a Team action never
 * refetches the whole app, and never closes the drawer the manager is in.
 */
export function useTeamActions(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(false);

  const runForResult = React.useCallback(
    async (
      operation: () => Promise<TeamMutationResult>,
      successMessage: string,
    ): Promise<TeamMutationResult | null> => {
      setPending(true);
      try {
        const result = await operation();
        if (!result.ok) {
          toast.error(result.message);
          return null;
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: teamQueryKey(workspaceId) }),
          queryClient.invalidateQueries({ queryKey: ["manager-notifications", workspaceId] }),
        ]);
        toast.success(successMessage);
        return result;
      } catch {
        toast.error("We couldn't update Team. Please try again.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [queryClient, workspaceId],
  );

  const run = React.useCallback(
    async (operation: () => Promise<TeamMutationResult>, successMessage: string) =>
      (await runForResult(operation, successMessage)) !== null,
    [runForResult],
  );

  return { pending, run, runForResult };
}
