import { Bell, Briefcase, ChevronDown, ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";

export function Topbar({ searchPlaceholder = "Search staff, shifts, leave..." }: { searchPlaceholder?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-8 py-4 bg-background/80 backdrop-blur border-b border-border/60">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-[var(--shadow-card)]">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Harbour View Hotel</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-[var(--shadow-card)]">
          <button className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
          <Calendar className="h-4 w-4 text-brand" />
          <div className="text-center leading-tight">
            <div className="text-sm font-semibold">12 – 18 May 2025</div>
            <div className="text-[11px] text-muted-foreground">This week</div>
          </div>
          <button className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 w-72 rounded-xl border border-border bg-card px-3.5 py-2 shadow-[var(--shadow-card)]">
        <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder={searchPlaceholder} />
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>

      <button className="relative rounded-xl border border-border bg-card p-2.5 shadow-[var(--shadow-card)]">
        <Bell className="h-4 w-4" />
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning text-[10px] font-bold text-white flex items-center justify-center">3</span>
      </button>

      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card pl-1.5 pr-3 py-1.5 shadow-[var(--shadow-card)]">
        <img src="https://i.pravatar.cc/64?img=12" className="h-8 w-8 rounded-lg object-cover" alt="" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">Alex Thompson</div>
          <div className="text-[11px] text-muted-foreground">General Manager</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </header>
  );
}
