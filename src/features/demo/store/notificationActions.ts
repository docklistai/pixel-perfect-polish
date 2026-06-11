import { NOTIFICATION_SEED } from "@/components/notificationData";
import type { WorkspaceStore } from "./createWorkspaceStore";

export function markManagerNotificationRead(store: WorkspaceStore, id: string): void {
  store.setState((state) => ({
    ...state,
    managerNotifications: state.managerNotifications.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    ),
  }));
}

export function markAllManagerNotificationsRead(store: WorkspaceStore): void {
  store.setState((state) => ({
    ...state,
    managerNotifications: state.managerNotifications.map((item) => ({ ...item, read: true })),
  }));
}

export function clearManagerNotifications(store: WorkspaceStore): void {
  store.setState((state) => ({ ...state, managerNotifications: [] }));
}

export function restoreManagerNotifications(store: WorkspaceStore): void {
  store.setState((state) => ({ ...state, managerNotifications: NOTIFICATION_SEED }));
}
