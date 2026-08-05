import * as React from "react";
import {
  createOpsChecklistTemplateFn,
  reviewOpsChecklistRunFn,
  setOpsChecklistTemplateActiveFn,
  setOpsChecklistRunItemFn,
  startOpsChecklistRunFn,
} from "../api/opsChecklistMutations";
import type { useOpsActions } from "./useOpsActions";

type Runner = ReturnType<typeof useOpsActions>["run"];
type ResultRunner = ReturnType<typeof useOpsActions>["runForResult"];
const requestId = () => crypto.randomUUID();
interface TemplateInput {
  name: string;
  locationId?: string | null;
  departmentId?: string | null;
  shiftType?: "opening" | "day" | "closing" | "overnight" | "other" | null;
  daypart?: "morning" | "afternoon" | "evening" | "overnight" | null;
  items: Array<{ label: string; requiresNote: boolean }>;
}
interface StartInput {
  templateId: string;
  locationId: string;
  runDate: string;
  assignedStaffMemberId?: string | null;
}

export function useOpsChecklistCommands(run: Runner, runForResult: ResultRunner) {
  const createTemplate = React.useCallback(
    (value: TemplateInput) =>
      run(
        () => createOpsChecklistTemplateFn({ data: { ...value, requestId: requestId() } }),
        "Checklist template created",
      ),
    [run],
  );
  const startRun = React.useCallback(
    async (value: StartInput) => {
      const result = await runForResult(
        () => startOpsChecklistRunFn({ data: { ...value, requestId: requestId() } }),
        "Checklist run started",
      );
      return result?.ok && typeof result.data.run_id === "string" ? result.data.run_id : null;
    },
    [runForResult],
  );
  const setTemplateActive = React.useCallback(
    (templateId: string, active: boolean) =>
      run(
        () =>
          setOpsChecklistTemplateActiveFn({
            data: { requestId: requestId(), templateId, active },
          }),
        active ? "Checklist template activated" : "Checklist template deactivated",
      ),
    [run],
  );
  const setItem = React.useCallback(
    (runItemId: string, state: "pending" | "done" | "exception", note: string | null) =>
      run(
        () =>
          setOpsChecklistRunItemFn({ data: { requestId: requestId(), runItemId, state, note } }),
        state === "exception"
          ? "Exception recorded and linked task created"
          : "Checklist item updated",
      ),
    [run],
  );
  const review = React.useCallback(
    (runId: string) =>
      run(
        () =>
          reviewOpsChecklistRunFn({
            data: {
              requestId: requestId(),
              runId,
            },
          }),
        "Checklist reviewed",
      ),
    [run],
  );
  return { createTemplate, setTemplateActive, startRun, setItem, review };
}
