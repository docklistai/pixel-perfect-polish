import * as React from "react";
import { Bell, Calendar, Clock, Home, MoreHorizontal, Plane } from "lucide-react";
import { FeedbackBanner } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { PortalTab } from "../types";
import { mockProfile } from "../data/mockPortalData";

const TABS: Array<{
  id: PortalTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "home", label: "Home", icon: Home },
  { id: "shifts", label: "Shifts", icon: Calendar },
  { id: "time", label: "Time", icon: Clock },
  { id: "leave", label: "Leave", icon: Plane },
  { id: "more", label: "More", icon: MoreHorizontal },
];

const TITLES: Record<PortalTab, string> = {
  home: "Docklist",
  shifts: "Shifts",
  time: "Time",
  leave: "Leave & Requests",
  more: "More",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function PortalShell({
  activeTab,
  onTabChange,
  unreadNotifications,
  showStaleBanner,
  onOpenNotifications,
  children,
}: {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  unreadNotifications: number;
  showStaleBanner?: boolean;
  onOpenNotifications: () => void;
  children: React.ReactNode;
}) {
  const greeting = getGreeting();
  const isHome = activeTab === "home";

  return (
    <div className="min-h-[100dvh] bg-[oklch(0.96_0.008_240)] text-foreground flex">
      {/* Desktop side rail (kept light, mirrors mobile structure) */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
        <div className="px-6 py-6">
          <div className="text-base font-semibold tracking-tight text-white">Docklist</div>
          <div className="text-[11px] font-semibold tracking-[0.2em] text-[var(--sidebar-muted)] mt-1">
            STAFF PORTAL
          </div>
        </div>
        <div className="px-6 pb-5">
          <div className="flex items-center gap-3">
            <Avatar initials={mockProfile.initials} dark />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate text-white">{mockProfile.name}</div>
              <div className="text-[11px] text-[var(--sidebar-muted)] truncate">
                {mockProfile.role}
              </div>
            </div>
          </div>
        </div>
        <nav aria-label="Portal sections" className="flex-1 p-3 space-y-1">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-foreground)]"
                    : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-4 text-[11px] text-[var(--sidebar-muted)]">
          All times Europe/London
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile + tablet header — dark navy */}
        <header className="md:hidden sticky top-0 z-20 bg-[var(--sidebar)] text-white shadow-[var(--shadow-elevated)]">
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-3.5">
            <button
              type="button"
              onClick={() => onTabChange("more")}
              aria-label="Open menu"
              className="p-2 -ml-2 rounded-lg hover:bg-white/10"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <div className="text-base font-semibold tracking-tight">{TITLES[activeTab]}</div>
            <NotificationBell count={unreadNotifications} onClick={onOpenNotifications} dark />
          </div>
          {isHome && (
            <div className="px-4 pb-4">
              <div className="text-[1.15rem] font-bold leading-tight text-balance">
                {greeting}, {mockProfile.name.split(" ")[0]}
              </div>
              <div className="mt-0.5 text-[11px] leading-5 text-white/70">
                {mockProfile.role} · {mockProfile.department.split(" · ")[0]}
              </div>
            </div>
          )}
        </header>

        {/* Desktop header strip */}
        <header className="hidden md:flex items-center justify-between border-b border-border/80 bg-card px-8 py-5">
          <div>
            <div className="text-[11px] text-muted-foreground">{greeting}</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isHome ? mockProfile.name : TITLES[activeTab]}
            </h1>
          </div>
          <NotificationBell count={unreadNotifications} onClick={onOpenNotifications} />
        </header>

        {showStaleBanner && (
          <div className="px-4 md:px-8 pt-3">
            <FeedbackBanner
              tone="warning"
              title="Showing offline data"
              description="You're offline. Information may be a few minutes out of date."
            />
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 md:px-8 py-4 md:py-6 pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-10 focus:outline-none"
        >
          <div className="mx-auto w-full max-w-[430px] md:max-w-[620px] lg:max-w-[760px] xl:max-w-[880px]">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          aria-label="Portal sections"
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_-18px_oklch(0.20_0.04_250/0.2)]"
        >
          <ul className="grid grid-cols-5">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onTabChange(t.id)}
                    className={cn(
                      "w-full flex flex-col items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors",
                      active ? "text-brand" : "text-muted-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                    <span>{t.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function NotificationBell({
  count,
  onClick,
  dark,
}: {
  count: number;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Notifications (${count} unread)`}
      className={cn(
        "relative p-2 -mr-2 rounded-lg transition-colors",
        dark ? "hover:bg-white/10" : "hover:bg-muted/60",
      )}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-brand text-brand-foreground text-[10px] font-bold px-1 flex items-center justify-center"
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Avatar({ initials, dark }: { initials: string; dark?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
        dark ? "bg-white/10 text-white" : "bg-brand-soft text-brand",
      )}
    >
      {initials}
    </div>
  );
}
