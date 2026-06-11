/**
 * Notification drawer — aligned with prototype: filter tabs, per-item mark-read,
 * action links, clear-all footer, and restore-defaults empty state.
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { DrawerShell, ActionButton } from "@/components/dl";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./NotificationItem";
import { type MockNotification, type NotificationFilter } from "./notificationData";
import { useWorkspaceSelector, useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import {
  clearManagerNotifications,
  markAllManagerNotificationsRead,
  markManagerNotificationRead,
  restoreManagerNotifications,
} from "@/features/demo/store/notificationActions";

export function NotificationDrawer({
  open,
  onOpenChange,
  onUnreadCountChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const navigate = useNavigate();
  const store = useWorkspaceStore();
  const items = useWorkspaceSelector((state) => state.managerNotifications);
  const [filter, setFilter] = React.useState<NotificationFilter>("all");

  const unreadCount = items.filter((i) => !i.read).length;
  const alertCount = items.filter((i) => i.tone === "amber" || i.tone === "red").length;

  React.useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  React.useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", closeOnEscape, true);
    return () => document.removeEventListener("keydown", closeOnEscape, true);
  }, [onOpenChange, open]);

  const visible =
    filter === "unread"
      ? items.filter((i) => !i.read)
      : filter === "alerts"
        ? items.filter((i) => i.tone === "amber" || i.tone === "red")
        : items;

  const markRead = (id: string) => markManagerNotificationRead(store, id);
  const markAllRead = () => markAllManagerNotificationsRead(store);
  const clearAll = () => clearManagerNotifications(store);
  const restoreDefaults = () => restoreManagerNotifications(store);

  const openItem = (n: MockNotification) => {
    markRead(n.id);
    onOpenChange(false);
    navigate({ to: n.to });
  };

  const tabs: { key: NotificationFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: items.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "alerts", label: "Alerts", count: alertCount },
  ];

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} unread` : "You’re up to date"}
      meta={
        <ActionButton variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all read
        </ActionButton>
      }
      footer={
        items.length > 0 ? (
          <>
            <ActionButton variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </ActionButton>
            <span className="flex-1" />
            <span className="text-xs" style={{ color: "var(--ink-400)" }}>
              {items.length} total
            </span>
          </>
        ) : (
          <>
            <span className="flex-1" />
            <ActionButton variant="ghost" size="sm" onClick={restoreDefaults}>
              Restore defaults
            </ActionButton>
          </>
        )
      }
    >
      {/* Filter tabs */}
      <div className="tabs mb-3">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            className={cn("tab", filter === key && "active")}
            onClick={() => setFilter(key)}
          >
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "badge ml-1.5",
                  key === "alerts" ? "red" : key === "unread" ? "amber" : "teal",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="empty">
          <div className="ill">
            {filter === "unread" ? (
              <CheckCircle className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <h4>
            {filter === "unread"
              ? "All caught up"
              : filter === "alerts"
                ? "No active alerts"
                : "Inbox is empty"}
          </h4>
          <p className="muted txt-sm">
            {filter === "all"
              ? "New notifications will appear here."
              : filter === "unread"
                ? "Nothing unread — check back later."
                : "No high-priority alerts right now."}
          </p>
        </div>
      ) : (
        <div className="col gap-2">
          {visible.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={() => openItem(notification)}
              onMarkRead={() => markRead(notification.id)}
            />
          ))}
        </div>
      )}
    </DrawerShell>
  );
}
