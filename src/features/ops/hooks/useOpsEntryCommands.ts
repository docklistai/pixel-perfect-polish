import * as React from "react";
import {
  addOpsEntryNoteFn,
  archiveOpsEntryFn,
  createOpsEntryFn,
  exportOpsEntriesFn,
  updateOpsEntryFn,
  type OpsEntryDraft,
} from "../api/opsEntryMutations";
import type { OpsEntry } from "../types";
import { downloadOpsCsv } from "../lib/opsExport";
import type { useOpsActions } from "./useOpsActions";
import { useOpsEntryStateCommands } from "./useOpsEntryStateCommands";

type Runner = ReturnType<typeof useOpsActions>["run"];
type OptimisticRunner = ReturnType<typeof useOpsActions>["runOptimistic"];
const requestId = () => crypto.randomUUID();

export function useOpsEntryCommands(run: Runner, runOptimistic: OptimisticRunner) {
  const save = React.useCallback(
    (draft: OpsEntryDraft, addFollowUp: boolean, edit: OpsEntry | null) =>
      run(
        async () => {
          if (edit)
            return updateOpsEntryFn({
              data: {
                requestId: requestId(),
                entryId: edit.id,
                title: draft.title,
                description: draft.description,
                area: draft.area,
                departmentId: draft.departmentId,
                rotaWeekId: draft.rotaWeekId,
                shiftId: draft.shiftId,
                subjectStaffMemberId: draft.subjectStaffMemberId,
                leaveRequestId: draft.leaveRequestId,
                assignedStaffMemberId: draft.assignedStaffMemberId,
                dueAt: draft.dueAt,
                priority: draft.priority,
                severity: draft.severity,
                immediateAction: draft.immediateAction,
              },
            });
          return createOpsEntryFn({
            data: { ...draft, requestId: requestId(), createFollowUp: addFollowUp },
          });
        },
        edit ? "Operational entry updated" : "Operational entry logged",
      ),
    [run],
  );
  const state = useOpsEntryStateCommands(runOptimistic);
  const archive = React.useCallback(
    (entryId: string, reason: string) =>
      run(
        () =>
          archiveOpsEntryFn({
            data: {
              requestId: requestId(),
              entryId,
              reason,
            },
          }),
        "Entry archived",
      ),
    [run],
  );
  const note = React.useCallback(
    (entryId: string, value: string) =>
      run(
        () =>
          addOpsEntryNoteFn({
            data: {
              requestId: requestId(),
              entryId,
              note: value,
            },
          }),
        "Manager update appended",
      ),
    [run],
  );
  const exportCsv = React.useCallback(
    (locationId: string | null) =>
      run(async () => {
        const result = await exportOpsEntriesFn({ data: { requestId: requestId(), locationId } });
        if (result.ok)
          downloadOpsCsv(
            (result.data.entries ?? []) as Array<Record<string, unknown>>,
            String(result.data.exportedAt ?? new Date().toISOString()),
          );
        return result;
      }, "Operational log exported"),
    [run],
  );
  return { save, ...state, archive, note, exportCsv };
}
