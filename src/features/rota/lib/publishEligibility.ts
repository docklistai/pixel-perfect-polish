import type { LiveWeekStatus } from "../api/rotaLiveData";

export type PublishState =
  | "draft"
  | "unpublished-changes"
  | "ready"
  | "published"
  | "published-issues";

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
  if (input.plannedShiftCount === 0) {
    return {
      canPublish: false,
      blockedReason: "Add at least one shift before publishing.",
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
  published,
  hasUnpublishedChanges,
  hasReadinessIssues,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  hasReadinessIssues: boolean;
}): PublishState {
  if (published) {
    if (hasUnpublishedChanges) return "unpublished-changes";
    return hasReadinessIssues ? "published-issues" : "published";
  }
  return hasReadinessIssues ? "draft" : "ready";
}

export function publishStateLabel(state: PublishState): string {
  switch (state) {
    case "draft":
      return "Draft";
    case "unpublished-changes":
      return "Unpublished changes";
    case "ready":
      return "Ready to publish";
    case "published":
      return "Published";
    case "published-issues":
      return "Published with issues";
  }
}
