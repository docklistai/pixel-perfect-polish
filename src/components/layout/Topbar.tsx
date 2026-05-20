import {
  Bell,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  HelpCircle,
} from "lucide-react";
import { SearchField } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { ConnectionStatus } from "@/components/ConnectionStatus";

export function Topbar({
  searchPlaceholder = "Search staff, shifts, leave...",
}: {
  searchPlaceholder?: string;
}) {
  const { openPalette, openShortcuts, openNotifications, unreadCount } = useOverlays();
  return (
    <header className="dock-topbar" aria-label="Workspace toolbar">
      <button
        type="button"
        className="dock-topbar-pill dock-topbar-workspace hidden md:flex"
        aria-label="Switch workspace"
      >
        <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Harbour View Hotel</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>

      <div className="hidden flex-1 justify-center md:flex">
        <div className="dock-topbar-pill dock-topbar-date">
          <button type="button" className="dock-topbar-arrow" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <Calendar className="h-4 w-4 text-brand" aria-hidden />
          <div className="dock-topbar-date-stack">
            <div className="text-sm font-semibold">18 – 24 May 2026</div>
            <div className="dock-topbar-date-sub">This week</div>
          </div>
          <button type="button" className="dock-topbar-arrow" aria-label="Next week">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
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

      <button type="button" className="dock-topbar-user" aria-label="Open account menu">
        <img src="https://i.pravatar.cc/64?img=12" className="dock-topbar-avatar" alt="" />
        <div className="dock-topbar-user-copy text-left">
          <div className="dock-topbar-user-name">Alex Thompson</div>
          <div className="dock-topbar-user-sub">General Manager</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>
    </header>
  );
}
