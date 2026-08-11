import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  fetchPortalTeamAnnouncements,
  needsAcknowledgement,
  type PortalTeamAnnouncement,
} from "../api/portalTeamAnnouncements";
import {
  acknowledgePortalAnnouncementFn,
  markPortalAnnouncementReadFn,
} from "../api/portalActions";

const portalRouteApi = getRouteApi("/portal");

export type PortalTeamAnnouncements = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  items: PortalTeamAnnouncement[];
  /** Announcements this recipient still owes an acknowledgement for. */
  awaitingCount: number;
  unreadCount: number;
  busy: boolean;
  retry: () => void;
  markRead: (announcementId: string) => void;
  acknowledge: (announcementId: string) => Promise<boolean>;
};

/**
 * The signed-in staff member's Team announcements. There is deliberately no
 * demo fallback: when a live staff session cannot read, the surface renders
 * empty or errors honestly rather than showing sample updates.
 */
export function usePortalTeamAnnouncements(): PortalTeamAnnouncements {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(auth.status === "member" ? auth.staffMemberId : null);

  const queryKey = React.useMemo(
    () => ["portal", "team-announcements", workspaceId] as const,
    [workspaceId],
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPortalTeamAnnouncements(workspaceId!),
    enabled,
    staleTime: 30_000,
  });

  const items = React.useMemo(() => query.data ?? [], [query.data]);

  const refresh = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  const run = React.useCallback(
    async (
      label: string,
      operation: () => Promise<{ ok: true } | { ok: false; message: string }>,
    ): Promise<boolean> => {
      setBusy(true);
      try {
        const result = await operation();
        if (!result.ok) {
          toast.error(label, { description: result.message });
          return false;
        }
        await refresh();
        return true;
      } catch {
        toast.error(label, { description: "Please try again." });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    enabled,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
    items,
    awaitingCount: items.filter(needsAcknowledgement).length,
    unreadCount: items.filter((item) => item.readAt === null).length,
    busy,
    retry: () => void refresh(),
    markRead: (announcementId: string) => {
      // Fire-and-forget: opening an announcement should never block the drawer
      // or surface an error toast for a background read receipt.
      if (!workspaceId) return;
      const already = items.find((item) => item.id === announcementId)?.readAt !== null;
      if (already) return;
      void markPortalAnnouncementReadFn({ data: { workspaceId, announcementId } })
        .then(() => refresh())
        .catch(() => undefined);
    },
    acknowledge: (announcementId: string) =>
      run("Not confirmed", () =>
        acknowledgePortalAnnouncementFn({ data: { workspaceId: workspaceId!, announcementId } }),
      ).then((ok) => {
        if (ok) toast.success("Thanks — that's confirmed.");
        return ok;
      }),
  };
}
