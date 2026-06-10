/**
 * Notification drawer — aligned with prototype: filter tabs, per-item mark-read,
 * action links, clear-all footer, and restore-defaults empty state.
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  AlertCircle,
  CalendarOff,
  CheckCircle,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { DrawerShell, ActionButton } from "@/components/dl";
import { cn } from "@/lib/utils";

type NotifTone = "amber" | "red" | "green" | "purple" | "blue";

interface MockNotification {
  id: string;
  icon: LucideIcon;
  tone: NotifTone;
  title: string;
  body: string;
  action: string;
  time: string;
  read: boolean;
  to: "/rota" | "/leave" | "/time" | "/team" | "/ops";
}

const SEED: MockNotification[] = [
  {
    id: "n1",
    icon: AlertTriangle,
    tone: "amber",
    title: "3 shifts still unassigned",
    body: "Resolve before Friday 16:00 to publish on time.",
    action: "Open rota",
    time: "14:02",
    read: false,
    to: "/rota",
  },
  {
    id: "n2",
    icon: CalendarOff,
    tone: "purple",
    title: "Priya Patel requested leave",
    body: "31 May – 2 Jun. High coverage impact.",
    action: "Review",
    time: "13:35",
    read: false,
    to: "/leave",
  },
  {
    id: "n3",
    icon: AlertCircle,
    tone: "red",
    title: "Liam O’Connor — schedule conflict",
    body: "Wed 14 May, Bar overlaps with Events.",
    action: "Resolve",
    time: "11:20",
    read: false,
    to: "/rota",
  },
  {
    id: "n4",
    icon: CheckCircle,
    tone: "green",
    title: "Last week’s timesheets approved",
    body: "All 8 entries · Ready to export approved hours.",
    action: "Export",
    time: "09:50",
    read: true,
    to: "/time",
  },
  {
    id: "n5",
    icon: MessageSquare,
    tone: "blue",
    title: "Daniel posted a kitchen briefing",
    body: "Today 08:15 — Read 6 of 9",
    action: "Open",
    time: "08:15",
    read: true,
    to: "/team",
  },
];

const TONE_CLASSES: Record<NotifTone, string> = {
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  green: "bg-success-soft text-success",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  blue: "bg-info-soft text-info",
};

type Filter = "all" | "unread" | "alerts";

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
  const [items, setItems] = React.useState<MockNotification[]>(SEED);
  const [filter, setFilter] = React.useState<Filter>("all");

  const unreadCount = items.filter((i) => !i.read).length;
  const alertCount = items.filter((i) => i.tone === "amber" || i.tone === "red").length;

  React.useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  const visible =
    filter === "unread"
      ? items.filter((i) => !i.read)
      : filter === "alerts"
        ? items.filter((i) => i.tone === "amber" || i.tone === "red")
        : items;

  const markRead = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  const markAllRead = () => setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  const clearAll = () => setItems([]);
  const restoreDefaults = () => setItems(SEED);

  const openItem = (n: MockNotification) => {
    markRead(n.id);
    onOpenChange(false);
    navigate({ to: n.to });
  };

  const TABS: { key: Filter; label: string; count: number }[] = [
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
        {TABS.map(({ key, label, count }) => (
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
          {visible.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "row gap-3 rounded-[10px] border p-3 cursor-pointer transition-opacity",
                  n.read ? "opacity-70" : "opacity-100",
                )}
                style={{
                  borderColor: "var(--border-faint)",
                  background: n.read ? "var(--bg-card)" : "var(--bg-raised)",
                  alignItems: "flex-start",
                }}
                onClick={() => openItem(n)}
                onKeyDown={(e) => e.key === "Enter" && openItem(n)}
              >
                {/* Icon bubble */}
                <div className={cn("bubble relative h-8 w-8 shrink-0", TONE_CLASSES[n.tone])}>
                  <Icon className="h-3.5 w-3.5" />
                  {!n.read && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2"
                      style={{
                        background: "var(--teal-500)",
                        borderColor: "var(--bg-overlay)",
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="grow min-w-0">
                  <div className="strong txt-md">{n.title}</div>
                  <div className="muted txt-sm mt-1" style={{ lineHeight: 1.45 }}>
                    {n.body}
                  </div>
                  <div className="row gap-2 mt-2" style={{ alignItems: "center" }}>
                    <span className="link txt-sm">
                      {n.action}{" "}
                      <span aria-hidden style={{ fontSize: 11 }}>
                        →
                      </span>
                    </span>
                    <span className="flex-1" />
                    {!n.read && (
                      <button
                        type="button"
                        className="link txt-xs"
                        style={{ color: "var(--ink-400)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(n.id);
                        }}
                      >
                        Mark read
                      </button>
                    )}
                    <span className="muted txt-xs mono">{n.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DrawerShell>
  );
}
