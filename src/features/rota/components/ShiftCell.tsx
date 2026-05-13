import * as React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { toneStyles } from "../data/mockData";
import { formatShiftTime } from "../lib/draftRota";
import type { DraftShift } from "../types";

type CellContext = "staff" | "open";

export function ShiftCell({
  shifts,
  context,
  onOpenShift,
  emptyAriaLabel,
}: {
  shifts: DraftShift[];
  context: CellContext;
  onOpenShift: (shiftId: DraftShift["id"]) => void;
  emptyAriaLabel: string;
}) {
  if (shifts.length === 0) {
    if (context === "open") {
      return (
        <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
          <span aria-hidden>—</span>
          <span className="sr-only">{emptyAriaLabel}</span>
        </div>
      );
    }
    return (
      <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
        <span aria-hidden>— Day off</span>
        <span className="sr-only">{emptyAriaLabel}</span>
      </div>
    );
  }

  if (shifts.length === 1) {
    return <ShiftPill shift={shifts[0]!} onOpen={onOpenShift} compact={false} />;
  }

  return (
    <div className="flex min-h-16 flex-col gap-1">
      {shifts.map((shift) => (
        <ShiftPill key={shift.id} shift={shift} onOpen={onOpenShift} compact />
      ))}
    </div>
  );
}

function ShiftPill({
  shift,
  onOpen,
  compact,
}: {
  shift: DraftShift;
  onOpen: (shiftId: DraftShift["id"]) => void;
  compact: boolean;
}) {
  const isOpen = shift.staffId === null;
  const isConflict = shift.status === "conflict";
  const heightClass = compact ? "min-h-[36px] py-1" : "h-16 py-1.5";

  if (isOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(shift.id)}
        aria-label={`Open shift, ${shift.role}, ${formatShiftTime(shift.start, shift.end)}`}
        className={`flex w-full flex-col justify-center rounded-[10px] border-2 px-2.5 text-xs transition hover:bg-warning-soft/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${toneStyles.open} ${heightClass}`}
      >
        <div className="font-semibold text-warning-700">Open shift</div>
        <div className="flex items-center gap-1 text-[11px] text-warning-700/80">
          {shift.role} <Plus className="h-3 w-3" aria-hidden />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(shift.id)}
      aria-label={`${shift.role}, ${formatShiftTime(shift.start, shift.end)}${isConflict ? ", conflict" : ""}`}
      className={`relative flex w-full flex-col justify-between rounded-[10px] border px-2.5 text-left transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${toneStyles[shift.tone]} ${heightClass}`}
    >
      <div className="text-xs font-semibold tracking-tight">
        {formatShiftTime(shift.start, shift.end)}
      </div>
      <div className="text-[11px] text-muted-foreground">{shift.role}</div>
      {isConflict && (
        <AlertTriangle
          className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-warning"
          aria-hidden
        />
      )}
    </button>
  );
}
