import { Bell, Briefcase, Calendar, HelpCircle } from "lucide-react";
import { SearchField } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { ConnectionStatus } from "@/components/ConnectionStatus";

/**
 * Returns the current week range label anchored to Europe/London time.
 * Monday is the first day of the working week.
 * Example: "18–24 May 2026" or "28 Apr–4 May 2026" for cross-month weeks.
 */
function getCurrentWeekLabel(): string {
  const now = new Date();

  // Parse the current date in London timezone to avoid UTC/BST edge cases.
  const londonStr = now.toLocaleDateString("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = londonStr.split("-").map(Number);

  // Build a plain local-date for day-of-week arithmetic (no timezone offset needed).
  const londonDate = new Date(y, m - 1, d);
  const weekday = londonDate.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;

  const monday = new Date(y, m - 1, d + diffToMonday);
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
  const weekLabel = getCurrentWeekLabel();

  return (
    <header className="dock-topbar" aria-label="Workspace toolbar">
      {/* Workspace display — non-interactive until workspace switching is built */}
      <div className="dock-topbar-pill dock-topbar-workspace hidden md:flex pointer-events-none select-none">
        <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Harbour View Hotel</span>
      </div>

      {/* Current-week label — read-only, computed from London time */}
      <div className="hidden flex-1 justify-center md:flex">
        <div className="dock-topbar-pill dock-topbar-date pointer-events-none select-none">
          <Calendar className="h-4 w-4 text-brand" aria-hidden />
          <div className="dock-topbar-date-stack">
            {/* suppressHydrationWarning: date is time-dependent; server/client may differ at week boundary */}
            <div className="text-sm font-semibold" suppressHydrationWarning>
              {weekLabel}
            </div>
            <div className="dock-topbar-date-sub">Current week</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openPalette}
        className="dock-topbar-search w-full text-left md:w-auto"
        aria-label="Search Docklist (Ctrl or Cmd K)"
      >
        <SearchField
          placeholder={searchPlaceholder}
          variant="inline"
          containerClassName="border-0 bg-transparent px-0 py-0 shadow-none pointer-events-none flex-1 min-w-0"
          tabIndex={-1}
          readOnly
        />
        <span className="dock-topbar-shortcuts hidden lg:inline-flex">
          <kbd className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-md border border-border bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            ⌘
          </kbd>
          <kbd className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-md border border-border bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            K
          </kbd>
        </span>
      </button>

      <ConnectionStatus className="hidden md:inline-flex" />

      <button
        type="button"
        onClick={openShortcuts}
        className="dock-topbar-icon hidden lg:inline-grid"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={openNotifications}
        className="dock-topbar-icon relative"
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

      {/* User identity display — non-interactive until account menu is built */}
      <div className="dock-topbar-user pointer-events-none select-none">
        <div
          className="dock-topbar-avatar flex items-center justify-center bg-sidebar text-sidebar-foreground text-[11px] font-bold tracking-wide"
          aria-hidden
        >
          AT
        </div>
        <div className="dock-topbar-user-copy text-left">
          <div className="dock-topbar-user-name">Alex Thompson</div>
          <div className="dock-topbar-user-sub">General Manager</div>
        </div>
      </div>
    </header>
  );
}
