import * as React from "react";
import { Bell, Calendar, Clock, FileText, Home, Megaphone, User } from "lucide-react";
import { FeedbackBanner, IconButton } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { PortalTab } from "../types";
import { mockProfile } from "../data/mockPortalData";

const TABS: Array<{ id: PortalTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "clock", label: "Clock", icon: Clock },
  { id: "requests", label: "Requests", icon: FileText },
  { id: "notices", label: "Notices", icon: Megaphone },
  { id: "profile", label: "Profile", icon: User },
];

export function PortalShell({
  activeTab,
  onTabChange,
  unreadNotices,
  showStaleBanner,
  children,
}: {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  unreadNotices: number;
  showStaleBanner?: boolean;
  children: React.ReactNode;
}) {
  const greeting = getGreeting();

  return (
    <div className="min-h-[100dvh] bg-muted/30 text-foreground flex">
      {/* Desktop side nav */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-border bg-card">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-lg font-semibold tracking-tight">Docklist</div>
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mt-1">
            STAFF PORTAL
          </div>
        </div>
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar initials={mockProfile.initials} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{mockProfile.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{mockProfile.role}</div>
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
                    ? "bg-brand-soft text-brand"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{t.label}</span>
                {t.id === "notices" && unreadNotices > 0 && (
                  <span className="rounded-full bg-brand text-brand-foreground text-[10px] font-bold px-1.5 py-0.5">
                    {unreadNotices}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-border text-[11px] text-muted-foreground">
          All times Europe/London
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile + tablet header */}
        <header className="md:hidden sticky top-0 z-20 bg-card border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">{greeting}</div>
              <div className="text-base font-semibold truncate">{mockProfile.name}</div>
            </div>
            <div className="relative">
              <IconButton
                icon={Bell}
                label="Notices"
                variant="ghost"
                onClick={() => onTabChange("notices")}
              />
              {unreadNotices > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold px-1.5 py-0.5"
                >
                  {unreadNotices}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Desktop header strip */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-border bg-card">
          <div>
            <div className="text-[11px] text-muted-foreground">{greeting}</div>
            <h1 className="text-xl font-semibold tracking-tight">{mockProfile.name}</h1>
          </div>
          <div className="relative">
            <IconButton
              icon={Bell}
              label="Notices"
              variant="ghost"
              onClick={() => onTabChange("notices")}
            />
            {unreadNotices > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold px-1.5 py-0.5"
              >
                {unreadNotices}
              </span>
            )}
          </div>
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
          className="flex-1 px-4 md:px-8 py-4 md:py-6 pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-10 focus:outline-none"
        >
          <div className="mx-auto w-full max-w-[720px]">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          aria-label="Portal sections"
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="grid grid-cols-6">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onTabChange(t.id)}
                    className={cn(
                      "w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium relative",
                      active ? "text-brand" : "text-muted-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{t.label}</span>
                    {t.id === "notices" && unreadNotices > 0 && (
                      <span
                        aria-hidden
                        className="absolute top-1 right-[18%] rounded-full bg-brand text-brand-foreground text-[9px] font-bold px-1 py-0"
                      >
                        {unreadNotices}
                      </span>
                    )}
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

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      aria-hidden
      className="h-10 w-10 rounded-full bg-brand-soft text-brand flex items-center justify-center text-sm font-semibold"
    >
      {initials}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
