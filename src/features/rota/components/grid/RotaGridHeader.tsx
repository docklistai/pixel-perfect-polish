import { Clock, Target } from "lucide-react";
import { SearchField } from "@/components/dl";
import type { RotaGridDay } from "./types";

export function RotaGridHeader({
  days,
  staffCount,
  visibleStaffCount,
  staffSearch,
  onStaffSearchChange,
}: {
  days: RotaGridDay[];
  staffCount: number;
  visibleStaffCount: number;
  staffSearch: string;
  onStaffSearchChange: (value: string) => void;
}) {
  return (
    <>
      <StaffSearchHeader
        staffCount={staffCount}
        visibleStaffCount={visibleStaffCount}
        staffSearch={staffSearch}
        onStaffSearchChange={onStaffSearchChange}
      />
      {days.map((day) => (
        <DayHeader key={day.d} day={day} />
      ))}
    </>
  );
}

function StaffSearchHeader({
  staffCount,
  visibleStaffCount,
  staffSearch,
  onStaffSearchChange,
}: {
  staffCount: number;
  visibleStaffCount: number;
  staffSearch: string;
  onStaffSearchChange: (value: string) => void;
}) {
  return (
    <div className="rota-staff-header border-b border-border px-4 py-3">
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
          value={staffSearch}
          onChange={(event) => onStaffSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function DayHeader({ day }: { day: RotaGridDay }) {
  return (
    <div
      className={`rota-day-header border-b border-l px-3 py-3 ${
        day.isToday ? "border-brand/30 bg-brand-soft/25" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>{day.d}</span>
        {day.isToday && (
          <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
            Today
          </span>
        )}
      </div>
      <div className="rota-day-metric mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" aria-hidden />
        <span>{day.h}</span>
      </div>
      <div
        className={`rota-day-metric mt-1 flex items-center gap-1.5 text-[11px] ${
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
