import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useWorkspaceSelector, useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import { markAllPortalNotificationsRead } from "@/features/demo/store/workspaceActions";
import { fetchPortalNotifications } from "../api/portalLiveData";
import { markPortalNotificationsReadFn } from "../api/portalActions";
import type { PortalNotification } from "../types";

const portalRouteApi = getRouteApi("/portal");

export type PortalNotifications = {
  items: PortalNotification[];
  unreadCount: number;
  /** Where the list came from: the live deliveries view or the demo store. */
  source: "live" | "demo";
  markAllRead: () => void;
};

/**
 * The signed-in staff member's notifications. Prefers a live, staff-safe read
 * of `staff_portal_notifications` (own deliveries only) and marks read through
 * a server function; falls back to the demo WorkspaceStore when Supabase is
 * unconfigured, the caller is signed out, or the read fails.
 */
export function usePortalNotifications(): PortalNotifications {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const store = useWorkspaceStore();
  const demoItems = useWorkspaceSelector((state) => state.portalNotifications);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(auth.staffMemberId);

  const queryKey = ["portal", "notifications", workspaceId];
  const query = useQuery({
    queryKey,
    queryFn: () => fetchPortalNotifications(workspaceId!),
    enabled,
    staleTime: 30_000,
  });

  const isLive = enabled && query.isSuccess;

  if (!isLive) {
    return {
      items: demoItems,
      unreadCount: demoItems.filter((n) => n.unread).length,
      source: "demo",
      markAllRead: () => markAllPortalNotificationsRead(store),
    };
  }

  const items = query.data ?? [];
  return {
    items,
    unreadCount: items.filter((n) => n.unread).length,
    source: "live",
    markAllRead: () => {
      void markPortalNotificationsReadFn({ data: { workspaceId: workspaceId! } }).then(() =>
        queryClient.invalidateQueries({ queryKey }),
      );
    },
  };
}
