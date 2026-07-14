import * as React from "react";
import { toast } from "sonner";
import type { RotaPublishEligibility } from "../lib/publishEligibility";

export function useRotaPublishAction({
  eligibility,
  source,
  publish,
  closeDialog,
  openStaffView,
}: {
  eligibility: RotaPublishEligibility;
  source: "live" | "demo";
  publish: (acknowledgeConstraints: boolean) => Promise<unknown> | unknown;
  closeDialog: () => void;
  openStaffView: () => void;
}) {
  return React.useCallback(
    async (acknowledgeConstraints = false) => {
      if (!eligibility.canPublish) {
        toast.info("Publish unavailable", {
          description: eligibility.blockedReason ?? "Publishing is unavailable.",
        });
        return;
      }
      try {
        await publish(acknowledgeConstraints);
        closeDialog();
        toast.success("Rota published", {
          description:
            source === "live"
              ? "Staff see the published snapshot next time they open the app. Affected staff are notified."
              : "The demo snapshot is now visible in the demo staff portal.",
          action: { label: "Open staff view", onClick: openStaffView },
        });
      } catch (error) {
        if (source !== "live") {
          toast.error("Rota not published", {
            description:
              error instanceof Error ? error.message : "The rota could not be published.",
          });
        }
      }
    },
    [closeDialog, eligibility, openStaffView, publish, source],
  );
}
