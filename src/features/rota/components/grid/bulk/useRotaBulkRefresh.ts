import * as React from "react";
import type { RotaBulkOutcome, RotaBulkRunners } from "./runRotaBulkPlan";

/** Reloads the authoritative week without altering the completed write ledger. */
export function useRotaBulkRefresh(
  runners: RotaBulkRunners,
  setOutcome: React.Dispatch<React.SetStateAction<RotaBulkOutcome | null>>,
  setRunning: React.Dispatch<React.SetStateAction<boolean>>,
  announce: (message: string) => void,
) {
  return React.useCallback(async () => {
    setRunning(true);
    try {
      await runners.refetch();
      setOutcome((current) => (current ? { ...current, refreshError: undefined } : current));
      announce("Rota refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The refreshed rota could not be loaded.";
      setOutcome((current) => (current ? { ...current, refreshError: message } : current));
      announce("Rota refresh failed. The visible grid may be out of date.");
    } finally {
      setRunning(false);
    }
  }, [announce, runners, setOutcome, setRunning]);
}
