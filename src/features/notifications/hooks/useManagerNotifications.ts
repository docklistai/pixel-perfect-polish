import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AuthState } from "@/features/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  fetchManagerNotificationsFn,
  fetchManagerUnreadCountFn,
  MANAGER_NOTIFICATION_LIMIT,
  markAllManagerNotificationsReadFn,
  markManagerNotificationReadFn,
} from "../api/managerNotifications";
import { presentManagerNotification } from "../lib/managerNotificationPresentation";

export const managerNotificationKeys = {
  all: (workspaceId: string | null) => ["manager-notifications", workspaceId] as const,
  count: (workspaceId: string | null) =>
    ["manager-notifications", workspaceId, "unread-count"] as const,
  list: (workspaceId: string | null) =>
    ["manager-notifications", workspaceId, "list", MANAGER_NOTIFICATION_LIMIT] as const,
};

export function useManagerNotifications(auth: AuthState, drawerOpen: boolean) {
  const queryClient = useQueryClient();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const countQuery = useQuery({
    queryKey: managerNotificationKeys.count(workspaceId),
    queryFn: () => fetchManagerUnreadCountFn(),
    enabled,
    staleTime: 15_000,
  });
  const listQuery = useQuery({
    queryKey: managerNotificationKeys.list(workspaceId),
    queryFn: () => fetchManagerNotificationsFn({ data: { limit: MANAGER_NOTIFICATION_LIMIT } }),
    enabled: enabled && drawerOpen,
    staleTime: 15_000,
  });
  const refetchCount = countQuery.refetch;

  React.useEffect(() => {
    if (enabled && drawerOpen) void refetchCount();
  }, [drawerOpen, enabled, refetchCount]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: managerNotificationKeys.all(workspaceId) });
  const mutation = useMutation({
    mutationFn: async (notificationId: string | null) => {
      const result = notificationId
        ? await markManagerNotificationReadFn({ data: { notificationId } })
        : await markAllManagerNotificationsReadFn();
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: () => void invalidate(),
    onError: (error: Error) =>
      toast.error("Notifications not updated", { description: error.message }),
  });

  return {
    enabled,
    unreadCount: enabled
      ? Math.max(
          countQuery.data ?? 0,
          (listQuery.data ?? []).filter((item) => item.readAt === null).length,
        )
      : 0,
    items: (listQuery.data ?? []).map(presentManagerNotification),
    isLoading: enabled && drawerOpen && listQuery.isLoading,
    isError: enabled && drawerOpen && (listQuery.isError || countQuery.isError),
    retry: () => void Promise.all([countQuery.refetch(), listQuery.refetch()]),
    markRead: (notificationId: string) => mutation.mutate(notificationId),
    markAllRead: () => mutation.mutate(null),
  };
}
