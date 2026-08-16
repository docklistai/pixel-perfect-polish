import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchPublishedWeekSnapshotFn } from "../api/publishedWeekSnapshot";
import { buildPublishDiff, draftShiftToDiffShift, type PublishDiff } from "../lib/publishDiff";
import type { DraftShift, StaffMember } from "../types";

const rotaRouteApi = getRouteApi("/rota");

export const publishDiffKey = (workspaceId: string | null, rotaWeekId: string | null) => [
  "rota",
  "publish-diff",
  workspaceId,
  rotaWeekId,
];

export type PublishDiffStatus = "unavailable" | "loading" | "error" | "ready";

export interface PublishDiffState {
  status: PublishDiffStatus;
  diff: PublishDiff | null;
  retry: () => void;
}

/**
 * The change review shown in the publish dialog.
 *
 * Fetches only while `enabled` — the dialog being open — so opening a rota week
 * costs nothing. The diff itself is computed here from data the page already
 * holds (draft shifts, staff, day labels) plus the fetched snapshot, and is
 * pure: it never writes, and it is not consulted by publish eligibility.
 */
export function usePublishDiff({
  rotaWeekId,
  enabled,
  draftShifts,
  staff,
  dayLabels,
}: {
  rotaWeekId: string | null;
  enabled: boolean;
  draftShifts: readonly DraftShift[];
  staff: readonly StaffMember[];
  dayLabels: readonly string[];
}): PublishDiffState {
  const { auth } = rotaRouteApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const queryEnabled =
    enabled &&
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager") &&
    Boolean(rotaWeekId);

  const query = useQuery({
    queryKey: publishDiffKey(workspaceId, rotaWeekId),
    queryFn: () => fetchPublishedWeekSnapshotFn({ data: { rotaWeekId: rotaWeekId! } }),
    enabled: queryEnabled,
    staleTime: 15_000,
  });

  const staffNames = React.useMemo(
    () => new Map(staff.map((member) => [member.id as string, member.name])),
    [staff],
  );

  const diff = React.useMemo(() => {
    if (!query.data) return null;
    return buildPublishDiff({
      draft: draftShifts.map((shift) => draftShiftToDiffShift(shift, staffNames)),
      published: query.data.shifts,
      isFirstPublish: query.data.publishedAt === null,
      dayLabels,
    });
  }, [query.data, draftShifts, staffNames, dayLabels]);

  const status: PublishDiffStatus = !queryEnabled
    ? "unavailable"
    : query.isError
      ? "error"
      : diff
        ? "ready"
        : "loading";

  return { status, diff, retry: () => void query.refetch() };
}
