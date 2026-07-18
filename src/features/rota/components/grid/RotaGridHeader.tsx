import { Clock, Target } from "lucide-react";
import { SearchField } from "@/components/dl";
import type { RotaGridDay } from "./types";

export function RotaGridHeader({
  days,
  staffCount,
  visibleStaffCount,
  staffSearch,
  onStaffSearchChange,
  searchIsTabStop,
  onSearchFocus,
  onEnterGrid,
  descriptionId,
}: {
  days: RotaGridDay[];
  staffCount: number;
  visibleStaffCount: number;
  staffSearch: string;
  onStaffSearchChange: (value: string) => void;
  searchIsTabStop: boolean;
  onSearchFocus: () => void;
  onEnterGrid: () => void;
  descriptionId: string;
}) {
  return (
    <div role="row" aria-rowindex={1} className="contents">
      <StaffSearchHeader
        staffCount={staffCount}
        visibleStaffCount={visibleStaffCount}
        staffSearch={staffSearch}
        onStaffSearchChange={onStaffSearchChange}
        searchIsTabStop={searchIsTabStop}
        onSearchFocus={onSearchFocus}
        onEnterGrid={onEnterGrid}
        descriptionId={descriptionId}
      />
      {days.map((day, dayIndex) => (
        <DayHeader key={day.d} day={day} dayIndex={dayIndex} />
      ))}
    </div>
  );
}

function StaffSearchHeader({
  staffCount,
  visibleStaffCount,
  staffSearch,
  onStaffSearchChange,
  searchIsTabStop,
  onSearchFocus,
  onEnterGrid,
  descriptionId,
}: {
  staffCount: number;
  visibleStaffCount: number;
  staffSearch: string;
  onStaffSearchChange: (value: string) => void;
  searchIsTabStop: boolean;
  onSearchFocus: () => void;
  onEnterGrid: () => void;
  descriptionId: string;
}) {
  return (
    <div
      role="columnheader"
      aria-colindex={1}
      className="rota-staff-header sticky top-0 left-0 z-30 bg-background border-b border-border px-4 py-3"
    >
      <div className="text-xs font-semibold uppercase text-muted-foreground">
        Staff{" "}
        <span className="font-mono font-normal tabular-nums">
          ({visibleStaffCount}
          {visibleStaffCount !== staffCount ? ` of ${staffCount}` : ""})
        </span>
      </div>
      <div className="mt-2">
        <SearchField
          placeholder="Search..."
          aria-label="Search staff in rota"
          aria-describedby={descriptionId}
          value={staffSearch}
          onChange={(event) => onStaffSearchChange(event.target.value)}
          tabIndex={searchIsTabStop ? 0 : -1}
          onFocus={onSearchFocus}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown") return;
            event.preventDefault();
            onEnterGrid();
          }}
        />
      </div>
    </div>
  );
}

function DayHeader({ day, dayIndex }: { day: RotaGridDay; dayIndex: number }) {
  return (
    <div
      role="columnheader"
      aria-colindex={dayIndex + 2}
      className={`rota-day-header sticky top-0 z-20 border-b border-l bg-background px-3 py-3 ${
        day.isToday ? "border-brand/30" : "border-border"
      }`}
    >
      {day.isToday && <div className="pointer-events-none absolute inset-0 bg-brand-soft/25" />}
      <div className="relative z-10 flex items-center gap-2 text-sm font-semibold">
        <span>{day.d}</span>
        {day.isToday && (
          <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
            Today
          </span>
        )}
      </div>
      <div className="relative z-10 rota-day-metric mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" aria-hidden />
        <span>{day.h}</span>
      </div>
      <div
        className={`relative z-10 rota-day-metric mt-1 flex items-center gap-1.5 text-[11px] ${
          day.tone === "danger"
            ? "text-danger"
            : day.tone === "warning"
              ? "text-warning"
              : "text-muted-foreground"
        }`}
      >
        <Target className="h-3 w-3" aria-hidden />
        <span>{day.c}</span>
      </div>
    </div>
  );
}
