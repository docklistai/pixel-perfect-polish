import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { OpsMutationResult } from "../api/opsRpcResult";
import type { OpsPageData } from "../types";

export function useOpsActions(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(false);

  const runForResult = React.useCallback(
    async (
      operation: () => Promise<OpsMutationResult>,
      successMessage: string,
    ): Promise<OpsMutationResult | null> => {
      setPending(true);
      try {
        const result = await operation();
        if (!result.ok) {
          toast.error(result.message);
          return null;
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["ops", workspaceId] }),
          queryClient.invalidateQueries({ queryKey: ["manager-notifications", workspaceId] }),
        ]);
        toast.success(successMessage);
        return result;
      } catch {
        toast.error("We couldn't update Ops. Please try again.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [queryClient, workspaceId],
  );
  const run = React.useCallback(
    async (operation: () => Promise<OpsMutationResult>, successMessage: string) =>
      (await runForResult(operation, successMessage)) !== null,
    [runForResult],
  );
  const runOptimistic = React.useCallback(
    async (
      operation: () => Promise<OpsMutationResult>,
      successMessage: string,
      update: (page: OpsPageData) => OpsPageData,
    ) => {
      const key = ["ops", workspaceId];
      await queryClient.cancelQueries({ queryKey: key });
      const snapshots = queryClient.getQueriesData<OpsPageData>({ queryKey: key });
      queryClient.setQueriesData<OpsPageData>({ queryKey: key }, (page) =>
        page ? update(page) : page,
      );
      const result = await runForResult(operation, successMessage);
      if (!result)
        snapshots.forEach(([queryKey, page]) => queryClient.setQueryData(queryKey, page));
      return result !== null;
    },
    [queryClient, runForResult, workspaceId],
  );

  return { pending, run, runForResult, runOptimistic };
}
