import * as React from "react";
import { Clock, Target, AlertTriangle } from "lucide-react";
import { SearchField, ActionButton } from "@/components/dl";
import { ShiftCell } from "./ShiftCell";
import type { RotaGridOpenRow, RotaGridStaffRow, ShiftId } from "../types";

type DayEntry = { d: string; h: string; c: string; tone: string; isToday: boolean };

export function RotaGrid({
  days,
  staffRows,
  openRow,
  staffCount,
  visibleStaffCount,
  weekLabel,
  staffSearch,
  hasActiveFilters,
  scheduleTitleId,
  scheduleDescId,
  onStaffSearchChange,
  onClearFilters,
  onShiftOpen,
  onShiftDuplicate,
  onShiftRemove,
  onShiftMarkOpen,
}: {
  days: DayEntry[];
  staffRows: RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  staffCount: number;
  visibleStaffCount: number;
  weekLabel: string;
  staffSearch: string;
  hasActiveFilters: boolean;
  scheduleTitleId: string;
  scheduleDescId: string;
  onStaffSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onShiftOpen: (shiftId: ShiftId) => void;
  onShiftDuplicate: (shiftId: ShiftId) => void;
  onShiftRemove: (shiftId: ShiftId) => void;
  onShiftMarkOpen: (shiftId: ShiftId) => void;
}) {
  const totalOpenShifts = openRow.cells.reduce((acc, cell) => acc + cell.shifts.length, 0);
  const visuallyHidden = {
    clip: "rect(0, 0, 0, 0)",
    clipPath: "inset(50%)",
  } as const;

  return (
    <section
      role="region"
      aria-labelledby={scheduleTitleId}
      aria-describedby={scheduleDescId}
      className="w-full min-w-0"
    >
      <h2
        id={scheduleTitleId}
        className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 -m-px"
        style={visuallyHidden}
      >
        Weekly rota matrix
      </h2>
      <p
        id={scheduleDescId}
        className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 -m-px"
        style={visuallyHidden}
      >
        Interactive schedule grid for the week of {weekLabel}. Each shift tile includes the staff
        member, day, role, and status so screen readers can understand open shifts, conflicts, and
        days off.
      </p>

      <div className="w-full max-w-full min-w-0 overflow-hidden [contain:layout_paint]">
        <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain">
          <div className="grid min-w-[720px] w-max grid-cols-[160px_repeat(7,80px)] md:min-w-[1080px] md:grid-cols-[240px_repeat(7,120px)] xl:w-full xl:grid-cols-[240px_repeat(7,minmax(120px,1fr))]">
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
              <div
                key={d.d}
                className={`border-b border-l px-3 py-4 ${
                  d.isToday ? "border-brand/30 bg-brand-soft/25" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <span>{d.d}</span>
                  {d.isToday && (
                    <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                      Today
                    </span>
                  )}
                </div>
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
                      className={`border-b border-l px-2 py-2 ${
                        days[dayIndex]?.isToday
                          ? "border-brand/20 bg-brand-soft/10"
                          : "border-border"
                      }`}
                    >
                      <ShiftCell
                        shifts={cell.shifts}
                        context="staff"
                        onOpenShift={onShiftOpen}
                        onDuplicateShift={onShiftDuplicate}
                        onRemoveShift={onShiftRemove}
                        onMarkOpenShift={onShiftMarkOpen}
                        emptyAriaLabel={`${row.staff.name}, ${days[dayIndex]?.d ?? ""}: no shift`}
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
                <div className="text-sm font-semibold">
                  No staff match the current search or filters
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open shifts still appear below. Clear the search or filters to bring staff rows
                  back.
                </p>
                {(staffSearch || hasActiveFilters) && (
                  <ActionButton
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={onClearFilters}
                  >
                    Clear search and filters
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
                className={`border-b border-l px-2 py-2 ${
                  days[dayIndex]?.isToday
                    ? "border-brand/20 bg-warning-soft/20"
                    : "border-border bg-warning-soft/10"
                }`}
              >
                <ShiftCell
                  shifts={cell.shifts}
                  context="open"
                  onOpenShift={onShiftOpen}
                  onDuplicateShift={onShiftDuplicate}
                  onRemoveShift={onShiftRemove}
                  onMarkOpenShift={onShiftMarkOpen}
                  emptyAriaLabel={`Open shifts, ${days[dayIndex]?.d ?? ""}: none`}
                />
              </div>
            ))}

            {/* Footer — staff note */}
            <div className="border-b border-border px-4 py-3.5">
              <div className="text-xs text-muted-foreground">
                Staff list managed outside this rota.
              </div>
            </div>

            {/* Footer — day hours */}
            {days.map((d) => (
              <div
                key={`footer-${d.d}`}
                className={`border-b border-l px-3 py-4 text-xs text-muted-foreground ${
                  d.isToday ? "border-brand/20 bg-brand-soft/10" : "border-border"
                }`}
              >
                {d.h}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
