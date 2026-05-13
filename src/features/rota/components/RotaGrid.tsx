import * as React from "react";
import { Clock, Target, Plus, AlertTriangle } from "lucide-react";
import { SearchField, ActionButton } from "@/components/dl";
import { ShiftCell } from "./ShiftCell";
import type { RotaGridOpenRow, RotaGridStaffRow, ShiftId } from "../types";

type DayEntry = { d: string; h: string; c: string; tone: string };

export function RotaGrid({
  days,
  staffRows,
  openRow,
  staffCount,
  visibleStaffCount,
  weekLabel,
  staffSearch,
  scheduleTitleId,
  scheduleDescId,
  onStaffSearchChange,
  onShiftOpen,
  onAddStaff,
}: {
  days: DayEntry[];
  staffRows: RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  staffCount: number;
  visibleStaffCount: number;
  weekLabel: string;
  staffSearch: string;
  scheduleTitleId: string;
  scheduleDescId: string;
  onStaffSearchChange: (value: string) => void;
  onShiftOpen: (shiftId: ShiftId) => void;
  onAddStaff: () => void;
}) {
  const totalOpenShifts = openRow.cells.reduce((acc, cell) => acc + cell.shifts.length, 0);

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
            Staff{" "}
            <span className="font-normal text-muted-foreground">
              ({visibleStaffCount}
              {visibleStaffCount !== staffCount ? ` of ${staffCount}` : ""})
            </span>
          </div>
          <div className="mt-2">
            <SearchField
              placeholder="Search staff or role..."
              aria-label="Search staff in rota"
              value={staffSearch}
              onChange={(event) => onStaffSearchChange(event.target.value)}
            />
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

        {staffRows.length > 0 ? (
          staffRows.map((row) => (
            <React.Fragment key={row.staff.id}>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                <img
                  src={`https://i.pravatar.cc/64?img=${row.staff.img}`}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{row.staff.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.staff.role} · {row.staff.hrs}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Contracted</div>
                </div>
              </div>
              {row.cells.map((cell, dayIndex) => (
                <div
                  key={`${row.staff.id}-${dayIndex}`}
                  className="border-b border-l border-border px-2 py-2"
                >
                  <ShiftCell
                    shifts={cell.shifts}
                    context="staff"
                    onOpenShift={onShiftOpen}
                    emptyAriaLabel={`${row.staff.name}, ${days[dayIndex]?.d ?? ""}: day off`}
                  />
                </div>
              ))}
            </React.Fragment>
          ))
        ) : (
          <div
            className="border-b border-border px-4 py-10 text-center"
            style={{ gridColumn: "1 / -1" }}
          >
            <div className="text-sm font-semibold">No staff match this view</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust the staff search or rota filters to show schedule rows.
            </p>
            {staffSearch && (
              <ActionButton
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => onStaffSearchChange("")}
              >
                Clear search
              </ActionButton>
            )}
          </div>
        )}

        {/* Open shifts row */}
        <div className="flex items-center gap-3 border-b border-border bg-warning-soft/20 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">Open shifts</div>
            <div className="text-[11px] text-muted-foreground">
              {totalOpenShifts === 0
                ? "All shifts assigned"
                : `${totalOpenShifts} unassigned this week`}
            </div>
            <div className="text-[10px] text-muted-foreground">Unassigned</div>
          </div>
        </div>
        {openRow.cells.map((cell, dayIndex) => (
          <div
            key={`open-${dayIndex}`}
            className="border-b border-l border-border bg-warning-soft/10 px-2 py-2"
          >
            <ShiftCell
              shifts={cell.shifts}
              context="open"
              onOpenShift={onShiftOpen}
              emptyAriaLabel={`Open shifts, ${days[dayIndex]?.d ?? ""}: none`}
            />
          </div>
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
