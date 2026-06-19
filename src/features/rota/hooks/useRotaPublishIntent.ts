import * as React from "react";
import { toast } from "sonner";
import type { RotaOverlayKey } from "./useRotaOverlays";
import type { RotaPublishEligibility } from "../lib/publishEligibility";
import { openPublishIfEligible } from "../lib/publishEligibility";

export type RotaPublishIntentOutcome = {
  action: "idle" | "queue" | "open" | "blocked";
  nextQueued: boolean;
  blockedReason: string | null;
};

export function resolveRotaPublishIntent(
  queued: boolean,
  isLoading: boolean,
  eligibility: RotaPublishEligibility,
): RotaPublishIntentOutcome {
  if (isLoading) {
    return { action: queued ? "idle" : "queue", nextQueued: true, blockedReason: null };
  }
  if (eligibility.canPublish) {
    return { action: "open", nextQueued: false, blockedReason: null };
  }
  return {
    action: "blocked",
    nextQueued: false,
    blockedReason: eligibility.blockedReason ?? "Publishing is unavailable.",
  };
}

export function useRotaPublishIntent({
  isLoading,
  eligibility,
  openOverlay,
}: {
  isLoading: boolean;
  eligibility: RotaPublishEligibility;
  openOverlay: (key: RotaOverlayKey) => void;
}) {
  const [queued, setQueued] = React.useState(false);

  const openOrBlock = React.useCallback(
    (nextQueued: boolean, outcome: RotaPublishIntentOutcome) => {
      setQueued(nextQueued);
      if (outcome.action === "open") {
        openOverlay("publish");
        return;
      }
      if (outcome.action === "blocked") {
        toast.info("Publish unavailable", {
          description: outcome.blockedReason ?? "Publishing is unavailable.",
        });
      }
    },
    [openOverlay],
  );

  const requestPublish = React.useCallback(() => {
    const outcome = resolveRotaPublishIntent(false, isLoading, eligibility);
    if (outcome.action === "queue") {
      setQueued(true);
      return;
    }
    openPublishIfEligible(
      eligibility,
      () => openOverlay("publish"),
      (description) => toast.info("Publish unavailable", { description }),
    );
  }, [eligibility, isLoading, openOverlay]);

  React.useEffect(() => {
    if (!queued) return;
    const outcome = resolveRotaPublishIntent(true, isLoading, eligibility);
    if (outcome.action === "idle" || outcome.action === "queue") return;
    openOrBlock(outcome.nextQueued, outcome);
  }, [eligibility, isLoading, openOrBlock, queued]);

  return { requestPublish };
}
