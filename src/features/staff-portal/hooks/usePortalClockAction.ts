import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { staffClockEventFn } from "../api/portalActions";
import type { PortalClockEventType } from "../api/portalLiveData";
import { createSingleFlightAction } from "../lib/singleFlightAction";

interface ClockActionInput {
  eventType: PortalClockEventType;
  timeEntryId: string | null;
}

export function usePortalClockAction({
  workspaceId,
  refresh,
}: {
  workspaceId: string | null;
  refresh: () => Promise<unknown>;
}) {
  const gateRef = React.useRef(createSingleFlightAction());
  const mutation = useMutation({
    mutationFn: async (input: ClockActionInput) => {
      if (!workspaceId) {
        return { ok: false, message: "Your staff session is unavailable. Sign in again." } as const;
      }
      return staffClockEventFn({ data: { workspaceId, ...input } });
    },
    onSuccess: async (result) => {
      if (result.ok) await refresh();
    },
  });

  const run = React.useCallback(
    (eventType: PortalClockEventType, timeEntryId: string | null) => {
      if (!workspaceId || gateRef.current.isPending()) return;
      void gateRef.current
        .run(async () => {
          await mutation.mutateAsync({ eventType, timeEntryId });
        })
        .catch(() => undefined);
    },
    [mutation, workspaceId],
  );

  const retry = React.useCallback(() => {
    if (mutation.variables) run(mutation.variables.eventType, mutation.variables.timeEntryId);
  }, [mutation.variables, run]);

  return {
    run,
    isPending: mutation.isPending,
    error: mutation.isError
      ? "We couldn't reach the staff clock. Check your connection and try again."
      : mutation.data && !mutation.data.ok
        ? mutation.data.message
        : null,
    retry,
  };
}
