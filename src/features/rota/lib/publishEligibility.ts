import type { LiveWeekStatus } from "../api/rotaLiveData";

export type PublishState = "empty-week" | "review" | "ready" | "published" | "unpublished-changes";

export type RotaPublishEligibility = {
  canPublish: boolean;
  blockedReason: string | null;
};

type PublishEligibilityInput = {
  readOnly: boolean;
  mutationPending: boolean;
  mutationFailed: boolean;
  plannedShiftCount: number;
  weekStatus: LiveWeekStatus | null;
  published: boolean;
  hasUnpublishedChanges: boolean;
};

export function getRotaPublishEligibility(input: PublishEligibilityInput): RotaPublishEligibility {
  if (input.readOnly) return { canPublish: false, blockedReason: "This rota is read-only." };
  if (input.mutationPending) {
    return {
      canPublish: false,
      blockedReason: "Wait for the current rota save before publishing.",
    };
  }
  if (input.mutationFailed) {
    return {
      canPublish: false,
      blockedReason: "Resolve the failed save before publishing.",
    };
  }
  if (input.weekStatus === "archived") {
    return { canPublish: false, blockedReason: "Archived rota weeks cannot be published." };
  }
  if (input.published && !input.hasUnpublishedChanges) {
    return {
      canPublish: false,
      blockedReason: "This rota is already published with no unpublished changes.",
    };
  }
  return { canPublish: true, blockedReason: null };
}

export function openPublishIfEligible(
  eligibility: RotaPublishEligibility,
  open: () => void,
  onBlocked: (reason: string) => void,
): boolean {
  if (!eligibility.canPublish) {
    onBlocked(eligibility.blockedReason ?? "Publishing is unavailable.");
    return false;
  }
  open();
  return true;
}

export function getPublishState({
  plannedShiftCount = 0,
  hasReadinessIssues = false,
  published = false,
  hasUnpublishedChanges = false,
}: {
  plannedShiftCount?: number;
  hasReadinessIssues?: boolean;
  published?: boolean;
  hasUnpublishedChanges?: boolean;
}): PublishState {
  if (published && !hasUnpublishedChanges) {
    return "published";
  }
  if (published && hasUnpublishedChanges) {
    if (plannedShiftCount === 0) return "empty-week";
    return hasReadinessIssues ? "review" : "unpublished-changes";
  }
  if (plannedShiftCount === 0) {
    return "empty-week";
  }
  return hasReadinessIssues ? "review" : "ready";
}

/** Header status pill tone + label from the live-load state and publish state. */
export function getRotaHeaderStatus(input: {
  readOnly: boolean;
  isLive: boolean;
  isLiveError: boolean;
  isLiveLoading: boolean;
  hasLiveWeek: boolean;
  publishState: PublishState;
}): { tone: "success" | "warning"; label: string } {
  const tone: "success" | "warning" =
    input.readOnly && !input.isLive
      ? "warning"
      : input.publishState === "published" || input.publishState === "ready"
        ? "success"
        : "warning";
  const label = input.isLiveError
    ? "Live unavailable"
    : input.isLiveLoading
      ? "Loading live rota"
      : input.isLive && !input.hasLiveWeek
        ? "No saved rota"
        : publishStateLabel(input.publishState);
  return { tone, label };
}

export function publishStateLabel(state: PublishState): string {
  switch (state) {
    case "empty-week":
      return "Empty week";
    case "review":
      return "Review before publishing";
    case "ready":
      return "Ready to publish";
    case "published":
      return "Published";
    case "unpublished-changes":
      return "Unpublished changes";
  }
}
