import * as React from "react";
import { toast } from "sonner";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The live rota could not be saved.";
}

/** Serialises live rota writes and refreshes the authoritative week after each success. */
export function useRotaMutationRunner(refetchWeek: () => Promise<void>, resetKey: string | null) {
  const pendingCountRef = React.useRef(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [lastMutationFailed, setLastMutationFailed] = React.useState(false);

  React.useEffect(() => setLastMutationFailed(false), [resetKey]);

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
        await refetchWeek();
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
    [refetchWeek],
  );

  return { runMutation, pendingCountRef, pendingCount, lastMutationFailed };
}
