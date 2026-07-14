import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { toast } from "sonner";
import { useWorkspaceSelector, useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import { markAllPortalNotificationsRead } from "@/features/demo/store/workspaceActions";
import { fetchPortalNotifications } from "../api/portalLiveData";
import { markPortalNotificationsReadFn } from "../api/portalActions";
import type { PortalNotification } from "../types";
import { usePortalTimezone } from "./usePortalTimezone";

const portalRouteApi = getRouteApi("/portal");

export type PortalNotifications = {
  items: PortalNotification[];
  unreadCount: number;
  /** Where the list came from: the live deliveries view or the demo store. */
  source: "live" | "demo";
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
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
  const timezone = usePortalTimezone();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(auth.staffMemberId);
  const queryEnabled = enabled && Boolean(timezone);

  const queryKey = ["portal", "notifications", workspaceId, timezone];
  const query = useQuery({
    queryKey,
    queryFn: () => fetchPortalNotifications(workspaceId!, timezone!),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  const isLive = queryEnabled && query.isSuccess;

  if (enabled && !isLive) {
    return {
      items: [],
      unreadCount: 0,
      source: "live",
      isLoading: !query.isError,
      isError: query.isError,
      retry: () => void query.refetch(),
      markAllRead: () => undefined,
    };
  }

  if (!enabled) {
    return {
      items: demoItems,
      unreadCount: demoItems.filter((n) => n.unread).length,
      source: "demo",
      isLoading: false,
      isError: false,
      retry: () => undefined,
      markAllRead: () => markAllPortalNotificationsRead(store),
    };
  }

  const items = query.data ?? [];
  return {
    items,
    unreadCount: items.filter((n) => n.unread).length,
    source: "live",
    isLoading: false,
    isError: false,
    retry: () => void query.refetch(),
    markAllRead: () => {
      void markPortalNotificationsReadFn({ data: { workspaceId: workspaceId! } })
        .then((result) => {
          if (!result.ok) throw new Error(result.message);
          return queryClient.invalidateQueries({ queryKey });
        })
        .catch((error: unknown) => {
          toast.error("Notifications not updated", {
            description: error instanceof Error ? error.message : "Please try again.",
          });
        });
    },
  };
}
