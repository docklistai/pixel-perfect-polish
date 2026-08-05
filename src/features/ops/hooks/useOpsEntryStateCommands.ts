import * as React from "react";
import { assignOpsEntryFn, pinOpsEntryFn, setOpsEntryStatusFn } from "../api/opsEntryMutations";
import type { OpsEntry, OpsStatus } from "../types";
import { updateOpsEntrySnapshot } from "../lib/opsOptimistic";
import type { useOpsActions } from "./useOpsActions";

type OptimisticRunner = ReturnType<typeof useOpsActions>["runOptimistic"];
const requestId = () => crypto.randomUUID();

export function useOpsEntryStateCommands(runOptimistic: OptimisticRunner) {
  const status = React.useCallback(
    (entryId: string, value: OpsStatus) => {
      if (value === "archived") return Promise.resolve(false);
      return runOptimistic(
        () =>
          setOpsEntryStatusFn({
            data: {
              requestId: requestId(),
              entryId,
              status: value,
              resolutionNote:
                value === "resolved" ? "Resolved by manager from the operational log." : null,
            },
          }),
        `Entry marked ${value.replace("_", " ")}`,
        (page) => updateOpsEntrySnapshot(page, entryId, { status: value }),
      );
    },
    [runOptimistic],
  );
  const assign = React.useCallback(
    (entryId: string, staffMemberId: string | null) =>
      runOptimistic(
        () => assignOpsEntryFn({ data: { requestId: requestId(), entryId, staffMemberId } }),
        staffMemberId ? "Entry assigned" : "Entry unassigned",
        (page) => updateOpsEntrySnapshot(page, entryId, { assignedStaffMemberId: staffMemberId }),
      ),
    [runOptimistic],
  );
  const pin = React.useCallback(
    (entry: OpsEntry) =>
      runOptimistic(
        () =>
          pinOpsEntryFn({
            data: {
              requestId: requestId(),
              entryId: entry.id,
              pinned: !entry.pinned,
            },
          }),
        entry.pinned ? "Entry unpinned" : "Entry pinned",
        (page) => updateOpsEntrySnapshot(page, entry.id, { pinned: !entry.pinned }),
      ),
    [runOptimistic],
  );
  return { status, assign, pin };
}
