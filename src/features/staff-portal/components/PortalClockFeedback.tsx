import { ActionButton, FeedbackBanner } from "@/components/dl";
import type { PortalClock } from "../hooks/usePortalClock";

export function PortalClockFeedback({ clock }: { clock: PortalClock }) {
  return (
    <>
      {clock.isLoading && (
        <div role="status" className="text-sm text-muted-foreground">
          Loading your clock…
        </div>
      )}
      {(clock.isError || clock.actionError) && (
        <FeedbackBanner
          tone="warning"
          title={clock.isError ? "Your clock is unavailable" : "Clock action not recorded"}
          description={clock.actionError ?? "Try again before clocking in or changing a break."}
          action={
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={clock.isError ? clock.retry : clock.retryAction}
            >
              Try again
            </ActionButton>
          }
        />
      )}
    </>
  );
}
