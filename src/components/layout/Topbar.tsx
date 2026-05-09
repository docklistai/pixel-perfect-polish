import { Bell, Briefcase, ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { SearchField } from "@/components/dl";

export function Topbar({
  searchPlaceholder = "Search staff, shifts, leave...",
}: {
  searchPlaceholder?: string;
}) {
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

      <SearchField
        placeholder={searchPlaceholder}
        variant="card"
        containerClassName="w-72"
        aria-label="Search Docklist"
      />

      <button
        type="button"
        className="relative rounded-xl border border-border bg-card p-2.5 shadow-[var(--shadow-card)] hover:bg-muted/40 transition"
        aria-label="Notifications (3 unread)"
      >
        <Bell className="h-4 w-4" aria-hidden />
        <span
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning text-[10px] font-bold text-white flex items-center justify-center"
          aria-hidden
        >
          3
        </span>
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
