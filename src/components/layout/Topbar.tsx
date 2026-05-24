import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Briefcase,
  Calendar,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { SearchField } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { toast } from "sonner";

/**
 * Returns the week range label anchored to Europe/London time, offset by the given number of weeks.
 * Monday is the first day of the working week.
 */
function getWeekLabelForOffset(offset: number = 0): string {
  const now = new Date();

  // Parse the current date in London timezone.
  const londonStr = now.toLocaleDateString("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = londonStr.split("-").map(Number);

  // Shift days by offset * 7
  const londonDate = new Date(y, m - 1, d + offset * 7);
  const weekday = londonDate.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;

  const monday = new Date(
    londonDate.getFullYear(),
    londonDate.getMonth(),
    londonDate.getDate() + diffToMonday,
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const endYear = sunday.getFullYear();
  const shortMonth = (date: Date) => date.toLocaleString("en-GB", { month: "short" });

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay}–${endDay} ${shortMonth(sunday)} ${endYear}`;
  }
  return `${startDay} ${shortMonth(monday)}–${endDay} ${shortMonth(sunday)} ${endYear}`;
}

export function Topbar({
  searchPlaceholder = "Search staff, shifts, leave...",
}: {
  searchPlaceholder?: string;
}) {
  const { openPalette, openShortcuts, openNotifications, unreadCount } = useOverlays();
  const [weekOffset, setWeekOffset] = useState(0);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Theme State & Synchronization
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("docklist.theme") as "light" | "dark") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("docklist.theme", theme);

    const handler = () => {
      const nextTheme = (localStorage.getItem("docklist.theme") as "light" | "dark") || "dark";
      setTheme(nextTheme);
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("docklist.theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("theme-change"));
  };

  // Close dropdowns on outside clicks
  useEffect(() => {
    if (!workspaceOpen && !userOpen) return;
    const clickHandler = (e: MouseEvent) => {
      if (
        workspaceOpen &&
        workspaceRef.current &&
        !workspaceRef.current.contains(e.target as Node)
      ) {
        setWorkspaceOpen(false);
      }
      if (userOpen && userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWorkspaceOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener("click", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("click", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [workspaceOpen, userOpen]);

  const weekLabel = getWeekLabelForOffset(weekOffset);

  const getWeekSubtitle = (offset: number) => {
    if (offset === 0) return "Current week";
    if (offset === 1) return "Next week";
    if (offset === -1) return "Previous week";
    return offset > 0 ? `+${offset} weeks` : `${offset} weeks`;
  };

  return (
    <header
      className="dock-topbar flex items-center justify-between"
      aria-label="Workspace toolbar"
    >
      {/* Workspace display & dropdown */}
      <div className="relative" ref={workspaceRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setWorkspaceOpen((prev) => !prev);
          }}
          className="dock-topbar-pill flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border border-border bg-card rounded-lg"
          aria-haspopup="listbox"
          aria-expanded={workspaceOpen}
        >
          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">Harbour View Hotel</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {workspaceOpen && (
          <div className="absolute top-[44px] left-0 z-50 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-2.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Workspaces
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-accent text-foreground font-medium text-xs">
              <span>Harbour View Hotel</span>
              <span className="h-2 w-2 rounded-full bg-brand" />
            </div>
            <button
              type="button"
              onClick={() => {
                setWorkspaceOpen(false);
                toast.info("The Anchor Inn is coming soon!");
              }}
              className="w-full mt-1 flex items-center justify-between px-2.5 py-2 rounded-lg text-muted-foreground hover:bg-accent/50 text-left text-xs"
            >
              <span>The Anchor Inn</span>
              <span className="text-[9px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded font-semibold">
                Soon
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceOpen(false);
                toast.info("Riverside Brasserie is coming soon!");
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-muted-foreground hover:bg-accent/50 text-left text-xs"
            >
              <span>Riverside Brasserie</span>
              <span className="text-[9px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded font-semibold">
                Soon
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Week Navigation controls (Display-only) */}
      <div className="hidden flex-1 justify-center items-center gap-1.5 md:flex select-none">
        <button
          type="button"
          onClick={() => setWeekOffset((prev) => prev - 1)}
          className="dock-topbar-arrow flex items-center justify-center cursor-pointer border border-border bg-card hover:bg-accent rounded-lg"
          title="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="dock-topbar-pill dock-topbar-date pointer-events-none select-none flex items-center gap-3">
          <Calendar className="h-4 w-4 text-brand" aria-hidden />
          <div className="dock-topbar-date-stack flex flex-col items-center">
            {/* suppressHydrationWarning: date is time-dependent; server/client may differ at week boundary */}
            <div className="text-sm font-semibold" suppressHydrationWarning>
              {weekLabel}
            </div>
            <div className="dock-topbar-date-sub text-[11px] text-muted-foreground">
              {getWeekSubtitle(weekOffset)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setWeekOffset((prev) => prev + 1)}
          className="dock-topbar-arrow flex items-center justify-center cursor-pointer border border-border bg-card hover:bg-accent rounded-lg"
          title="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Search Bar Affordance */}
      <button
        type="button"
        onClick={openPalette}
        className="dock-topbar-search w-full text-left md:w-auto flex items-center justify-between"
        aria-label="Search Docklist (Ctrl or Cmd K)"
      >
        <SearchField
          placeholder={searchPlaceholder}
          variant="inline"
          containerClassName="border-0 bg-transparent px-0 py-0 shadow-none pointer-events-none flex-1 min-w-0"
          tabIndex={-1}
          readOnly
        />
        <span className="dock-topbar-shortcuts hidden lg:inline-flex gap-1 pl-2">
          <kbd className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-md border border-border bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            ⌘
          </kbd>
          <kbd className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-md border border-border bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            K
          </kbd>
        </span>
      </button>

      <div className="flex items-center gap-2">
        <ConnectionStatus className="hidden 2xl:inline-flex" />

        {/* Sparkles Ask button */}
        <button
          type="button"
          onClick={() =>
            toast.info("AI manager support is coming soon", {
              description:
                "DocklistAI assistant will help you draft rotas, resolve conflicts, and answer workforce policy questions.",
              icon: <Sparkles className="h-4 w-4 text-brand" />,
            })
          }
          className="flex items-center gap-1.5 px-3 py-2 bg-brand text-brand-foreground hover:bg-brand/90 transition-colors rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
          aria-label="Ask AI Assistant"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Ask</span>
        </button>

        {/* Keyboard Shortcuts Info trigger */}
        <button
          type="button"
          onClick={openShortcuts}
          className="dock-topbar-icon hidden 2xl:inline-grid cursor-pointer"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle className="h-4 w-4" aria-hidden />
        </button>

        {/* Light/Dark Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="dock-topbar-icon cursor-pointer"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Drawer bell */}
        <button
          type="button"
          onClick={openNotifications}
          className="dock-topbar-icon relative cursor-pointer"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning text-[10px] font-bold text-white flex items-center justify-center"
              aria-hidden
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* General Manager Identity Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUserOpen((prev) => !prev);
            }}
            className="dock-topbar-user flex items-center gap-2.5 p-1.5 pr-2.5 border border-border bg-card rounded-xl hover:bg-accent/40 cursor-pointer text-left"
            aria-haspopup="listbox"
            aria-expanded={userOpen}
          >
            <div
              className="dock-topbar-avatar flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground text-[11px] font-bold tracking-wide border border-white/10"
              aria-hidden
            >
              AT
            </div>
            <div className="dock-topbar-user-copy text-left hidden 2xl:flex flex-col">
              <div className="dock-topbar-user-name text-xs font-semibold text-foreground">
                Alex Thompson
              </div>
              <div className="dock-topbar-user-sub text-[10px] text-muted-foreground">
                General Manager
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden 2xl:block" />
          </button>

          {userOpen && (
            <div className="absolute top-[48px] right-0 z-50 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                General Manager
              </div>
              <div className="px-2.5 py-1 text-xs font-semibold text-foreground">Alex Thompson</div>
              <div className="h-px bg-border my-1.5" />

              <button
                type="button"
                onClick={() => {
                  setUserOpen(false);
                  toast.info("Profile settings are coming soon!");
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs text-foreground hover:bg-accent cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserOpen(false);
                  toast.info("Account settings are coming soon!");
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs text-foreground hover:bg-accent cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Account settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserOpen(false);
                  toast.info("Help & feedback is coming soon!");
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs text-foreground hover:bg-accent cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Help & feedback</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserOpen(false);
                  toggleTheme();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs text-foreground hover:bg-accent cursor-pointer"
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>Toggle theme</span>
              </button>

              <div className="h-px bg-border my-1.5" />

              <button
                type="button"
                onClick={() => {
                  setUserOpen(false);
                  toast.info("Sign out is a demo state in this prototype.");
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
