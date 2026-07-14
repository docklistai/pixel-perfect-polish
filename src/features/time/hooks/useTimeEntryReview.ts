import { useQuery } from "@tanstack/react-query";
import { fetchTimeEntryReviewFn } from "../api/timeEntryReview";
import { timeQueryKeys } from "../lib/timeQueryRange";

export function useTimeEntryReview(workspaceId: string | null, timeEntryId: string | null) {
  return useQuery({
    queryKey: timeQueryKeys.review(workspaceId, timeEntryId),
    queryFn: () =>
      fetchTimeEntryReviewFn({ data: { workspaceId: workspaceId!, timeEntryId: timeEntryId! } }),
    enabled: Boolean(workspaceId && timeEntryId),
    staleTime: 15_000,
  });
}
