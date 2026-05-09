import { Bell, Briefcase, ChevronDown, ChevronLeft, ChevronRight, Calendar, HelpCircle } from "lucide-react";
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
    <header
      className="sticky top-0 z-20 flex items-center gap-4 px-8 py-4 bg-background/80 backdrop-blur border-b border-border/60"
      aria-label="Workspace toolbar"
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-[var(--shadow-card)] hover:bg-muted/40 transition"
        aria-label="Switch workspace"
      >
        <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Harbour View Hotel</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>

      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-[var(--shadow-card)]">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <Calendar className="h-4 w-4 text-brand" aria-hidden />
          <div className="text-center leading-tight">
            <div className="text-sm font-semibold">12 – 18 May 2025</div>
            <div className="text-[11px] text-muted-foreground">This week</div>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openPalette}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-[var(--shadow-card)] hover:bg-muted/40 transition w-72 text-left"
        aria-label="Search Docklist (Ctrl or Cmd K)"
      >
        <SearchField
          placeholder={searchPlaceholder}
          variant="inline"
          containerClassName="border-0 px-0 py-0 pointer-events-none flex-1"
          tabIndex={-1}
          readOnly
        />
        <span className="hidden lg:inline-flex items-center gap-1 shrink-0">
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
        className="rounded-xl border border-border bg-card p-2.5 shadow-[var(--shadow-card)] hover:bg-muted/40 transition"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={openNotifications}
        className="relative rounded-xl border border-border bg-card p-2.5 shadow-[var(--shadow-card)] hover:bg-muted/40 transition"
        aria-label={
          unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
        }
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

      <button
        type="button"
        className="flex items-center gap-2.5 rounded-xl border border-border bg-card pl-1.5 pr-3 py-1.5 shadow-[var(--shadow-card)] hover:bg-muted/40 transition"
        aria-label="Open account menu"
      >
        <img
          src="https://i.pravatar.cc/64?img=12"
          className="h-8 w-8 rounded-lg object-cover"
          alt=""
        />
        <div className="leading-tight text-left">
          <div className="text-sm font-semibold">Alex Thompson</div>
          <div className="text-[11px] text-muted-foreground">General Manager</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>
    </header>
  );
}
