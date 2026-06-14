import * as React from "react";
import { Bell } from "lucide-react";
import { DrawerShell, EmptyState, StatusBadge } from "@/components/dl";
import type { NotificationCategory, PortalNotification } from "../types";
import { cn } from "@/lib/utils";

const TABS: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "important", label: "Important" },
];

export function NotificationDrawer({
  open,
  onClose,
  items,
  markAllRead,
}: {
  open: boolean;
  onClose: () => void;
  items: PortalNotification[];
  markAllRead: () => void;
}) {
  const [tab, setTab] = React.useState<NotificationCategory>("all");

  const filtered = items.filter((n) => {
    if (tab === "unread") return n.unread;
    if (tab === "important") return n.important;
    return true;
  });

  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Notifications"
      description="Updates about your shifts, leave and team."
      width="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-xl bg-muted p-1 grid grid-cols-3 text-xs font-medium flex-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              const unreadCount = items.filter((n) => n.unread).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "py-1.5 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5",
                    active
                      ? "bg-card text-foreground shadow-[var(--shadow-card)]"
                      : "text-muted-foreground",
                  )}
                  aria-pressed={active}
                >
                  {t.label}
                  {t.id === "unread" && unreadCount > 0 && (
                    <span className="rounded-full bg-brand text-brand-foreground text-[10px] font-bold px-1.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            className="text-[11px] font-semibold text-brand hover:underline whitespace-nowrap"
          >
            Mark all read
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing here" description="You're all caught up." />
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border border-border bg-card p-3.5",
                  n.unread && "ring-1 ring-brand/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      {kindLabel(n.kind)}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">{n.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{n.body}</div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">{n.postedAt}</div>
                  </div>
                  {n.badge && <StatusBadge tone={n.badge.tone}>{n.badge.label}</StatusBadge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DrawerShell>
  );
}

function kindLabel(k: PortalNotification["kind"]) {
  switch (k) {
    case "shift-changed":
      return "Shift change";
    case "rota-published":
      return "Rota";
    case "leave-approved":
    case "leave-declined":
      return "Leave";
    case "announcement":
      return "Announcement";
    case "timesheet-reminder":
      return "Timesheet";
  }
}
