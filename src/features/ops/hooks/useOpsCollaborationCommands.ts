import * as React from "react";
import {
  acknowledgeOpsBriefingFn,
  acknowledgeOpsHandoverFn,
  createOpsBriefingFn,
  createOpsHandoverFn,
  markOpsBriefingReadFn,
} from "../api/opsCollaborationMutations";
import type { useOpsActions } from "./useOpsActions";

type Runner = ReturnType<typeof useOpsActions>["run"];
const requestId = () => crypto.randomUUID();
interface HandoverInput {
  locationId: string;
  handoverDate: string;
  rotaWeekId?: string | null;
  notes: string;
  recipientMembershipIds: string[];
  entryIds: string[];
}
interface BriefingInput {
  locationId: string;
  briefingDate: string;
  title: string;
  summary: string;
  recipientMembershipIds: string[];
  entryIds: string[];
}

export function useOpsCollaborationCommands(run: Runner) {
  const handover = React.useCallback(
    (value: HandoverInput) =>
      run(
        () => createOpsHandoverFn({ data: { ...value, requestId: requestId() } }),
        "Handover issued",
      ),
    [run],
  );
  const acknowledgeHandover = React.useCallback(
    (handoverId: string) =>
      run(
        () =>
          acknowledgeOpsHandoverFn({
            data: { requestId: requestId(), handoverId },
          }),
        "Handover acknowledged",
      ),
    [run],
  );
  const briefing = React.useCallback(
    (value: BriefingInput) =>
      run(
        () => createOpsBriefingFn({ data: { ...value, requestId: requestId() } }),
        "Operational briefing created",
      ),
    [run],
  );
  const readBriefing = React.useCallback(
    (briefingId: string) =>
      run(
        () =>
          markOpsBriefingReadFn({
            data: { requestId: requestId(), briefingId },
          }),
        "Briefing marked read",
      ),
    [run],
  );
  const acknowledgeBriefing = React.useCallback(
    (briefingId: string) =>
      run(
        () =>
          acknowledgeOpsBriefingFn({
            data: { requestId: requestId(), briefingId },
          }),
        "Briefing acknowledged",
      ),
    [run],
  );
  return { handover, acknowledgeHandover, briefing, readBriefing, acknowledgeBriefing };
}
