import * as React from "react";
import { Clock, Target, Plus } from "lucide-react";
import { SearchField, ActionButton } from "@/components/dl";
import { ShiftCell } from "./ShiftCell";
import type { ShiftDetail, StaffMember } from "../types";

type DayEntry = { d: string; h: string; c: string; tone: string };

export function RotaGrid({
  days,
  staff,
  weekLabel,
  scheduleTitleId,
  scheduleDescId,
  onShiftOpen,
  onAddStaff,
}: {
  days: DayEntry[];
  staff: StaffMember[];
  weekLabel: string;
  scheduleTitleId: string;
  scheduleDescId: string;
  onShiftOpen: (detail: ShiftDetail) => void;
  onAddStaff: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <section
        role="region"
        aria-labelledby={scheduleTitleId}
        aria-describedby={scheduleDescId}
        className="min-w-[1100px]"
        style={{
          display: "grid",
          gridTemplateColumns: "240px repeat(7, minmax(120px, 1fr))",
        }}
      >
        <h2 id={scheduleTitleId} className="sr-only">
          Weekly rota matrix
        </h2>
        <p id={scheduleDescId} className="sr-only">
          Interactive schedule grid for the week of {weekLabel}. Each shift tile includes the staff
          member, day, role, and status so screen readers can understand open shifts, conflicts, and
          days off.
        </p>

        {/* Column header — staff */}
        <div className="border-b border-border px-4 py-4">
          <div className="text-sm font-semibold">
            Staff <span className="font-normal text-muted-foreground">({staff.length})</span>
          </div>
          <div className="mt-2">
            <SearchField placeholder="Search staff..." aria-label="Search staff in rota" />
          </div>
        </div>

        {/* Column headers — days */}
        {days.map((d) => (
          <div key={d.d} className="border-b border-l border-border px-3 py-4">
            <div className="text-sm font-semibold tracking-tight">{d.d}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              <span>{d.h}</span>
            </div>
            <div
              className={`mt-1 flex items-center gap-1.5 text-xs ${
                d.tone === "danger"
                  ? "text-danger"
                  : d.tone === "warning"
                    ? "text-warning"
                    : "text-muted-foreground"
              }`}
            >
              <Target className="h-3 w-3" aria-hidden />
              <span>{d.c}</span>
            </div>
          </div>
        ))}

        {/* Staff rows */}
        {staff.map((s) => (
          <React.Fragment key={s.name}>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <img
                src={`https://i.pravatar.cc/64?img=${s.img}`}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {s.role} · {s.hrs}
                </div>
                <div className="text-[10px] text-muted-foreground">Contracted</div>
              </div>
            </div>
            {s.shifts.map((sh, i) => (
              <div key={i} className="border-b border-l border-border px-2 py-2">
                <ShiftCell
                  s={sh}
                  onOpen={() => onShiftOpen({ ...sh, staff: s.name, day: days[i].d })}
                  ariaLabel={`${s.name}, ${days[i].d}: ${sh.time === "—" ? "Day off" : `${sh.time}, ${sh.role}`}${sh.flag === "open" ? ", open shift" : sh.flag === "conflict" ? ", conflict" : ""}`}
                />
              </div>
            ))}
          </React.Fragment>
        ))}

        {/* Footer — add staff */}
        <div className="border-b border-border px-4 py-3.5">
          <ActionButton variant="secondary" size="sm" icon={Plus} onClick={onAddStaff}>
            Add staff
          </ActionButton>
        </div>

        {/* Footer — day hours */}
        {days.map((d) => (
          <div
            key={`footer-${d.d}`}
            className="border-b border-l border-border px-3 py-4 text-xs text-muted-foreground"
          >
            {d.h}
          </div>
        ))}
      </section>
    </div>
  );
}
