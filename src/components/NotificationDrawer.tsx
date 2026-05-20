/**
 * Notification drawer with a sample feed of recent rota, time, leave and
 * operations updates. Frontend-only — read/unread state is per session.
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarOff,
  Clock,
  MessageSquare,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { DrawerShell, ActionButton, StatusBadge, type Tone } from "@/components/dl";
import { cn } from "@/lib/utils";

interface MockNotification {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  to?: "/rota" | "/leave" | "/time" | "/team" | "/ops";
}

const SEED: MockNotification[] = [
  {
    id: "n1",
    icon: AlertTriangle,
    tone: "warning",
    title: "Rota conflict — Front of House",
    body: "Sara Patel is double-booked on Saturday 17 May, 18:00–22:00.",
    time: "Just now",
    unread: true,
    to: "/rota",
  },
  {
    id: "n2",
    icon: CalendarOff,
    tone: "info",
    title: "New leave request",
    body: "Tom Holloway has requested 3 days off (24–26 May).",
    time: "12 min ago",
    unread: true,
    to: "/leave",
  },
  {
    id: "n3",
    icon: Clock,
    tone: "danger",
    title: "Missed clock-in",
    body: "Eva Marković did not clock in for the 07:00 breakfast shift.",
    time: "38 min ago",
    unread: true,
    to: "/time",
  },
  {
    id: "n4",
    icon: MessageSquare,
    tone: "success",
    title: "Announcement acknowledged",
    body: "9 of 12 staff have read the new uniform policy.",
    time: "2 h ago",
    unread: false,
    to: "/team",
  },
  {
    id: "n5",
    icon: Wrench,
    tone: "muted",
    title: "Operations follow-up",
    body: "Maintenance task “Bar fridge temp check” is awaiting sign-off.",
    time: "Yesterday",
    unread: false,
    to: "/ops",
  },
];

export function NotificationDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<MockNotification[]>(SEED);
  const unread = items.filter((i) => i.unread).length;

  const markAllRead = () => setItems((prev) => prev.map((i) => ({ ...i, unread: false })));

  const open_ = (n: MockNotification) => {
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, unread: false } : i)));
    if (n.to) {
      onOpenChange(false);
      navigate({ to: n.to });
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description="Notification preview for recent rota and team updates."
      meta={
        unread > 0 ? (
          <StatusBadge tone="warning">{unread} unread</StatusBadge>
        ) : (
          <StatusBadge tone="muted">All caught up</StatusBadge>
        )
      }
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={markAllRead}>
            Mark all as read
          </ActionButton>
          <ActionButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
        </>
      }
    >
      <ul className="-mx-1 divide-y divide-border">
        {items.map((n) => {
          const Icon = n.icon;
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open_(n)}
                className={cn(
                  "w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-muted/40 transition",
                  n.unread && "bg-muted/20",
                )}
              >
                <span
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    n.tone === "warning" && "bg-warning-soft text-warning",
                    n.tone === "info" && "bg-info-soft text-info",
                    n.tone === "danger" && "bg-danger-soft text-danger",
                    n.tone === "success" && "bg-success-soft text-success",
                    n.tone === "muted" && "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{n.title}</span>
                    {n.unread && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label="unread" />
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{n.body}</span>
                  <span className="block text-[11px] text-muted-foreground mt-1">{n.time}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </DrawerShell>
  );
}
