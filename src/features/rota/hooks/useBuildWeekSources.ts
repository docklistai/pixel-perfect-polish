import { useQuery } from "@tanstack/react-query";
import { buildWeekSourcesFn, type PreviousPatternAvailability } from "../api/buildWeekSources";

/**
 * Whether each demand source can be used, fetched when the Build drawer opens.
 *
 * Kept apart from `useBuildWeekProposal`, which owns the proposal lifecycle: this
 * only describes what is offerable, and must not be confused with what has been
 * proposed. Fetching is gated on `enabled` so opening the Rota costs nothing —
 * the question is only asked once a manager is actually choosing a source.
 */

export const buildWeekSourcesKey = (locationId: string | null, weekOffset: number) => [
  "rota",
  "build-week-sources",
  locationId,
  weekOffset,
];

export type BuildWeekSourcesState = {
  previousPattern: PreviousPatternAvailability | null;
  isLoading: boolean;
};

export function useBuildWeekSources({
  weekOffset,
  locationId,
  enabled,
}: {
  weekOffset: number;
  locationId: string | null;
  enabled: boolean;
}): BuildWeekSourcesState {
  const query = useQuery({
    queryKey: buildWeekSourcesKey(locationId, weekOffset),
    queryFn: () =>
      buildWeekSourcesFn({
        data: { weekOffset, ...(locationId ? { locationId } : {}) },
      }),
    enabled,
    // Short: a manager who has just filled in last week expects Build to notice.
    staleTime: 10_000,
  });

  const result = query.data;
  return {
    previousPattern: result && result.ok ? result.previousPattern : null,
    isLoading: query.isLoading,
  };
}
