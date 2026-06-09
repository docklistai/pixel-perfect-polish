import * as React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { ShiftActionMenu } from "./grid/ShiftActionMenu";
import { resolveShiftChipClasses } from "../lib/deptColours";
import { formatShiftTime } from "../lib/draftRota";
import type { DraftShift } from "../types";

type CellContext = "staff" | "open";

export function ShiftCell({
  shifts,
  context,
  onOpenShift,
  onDuplicateShift,
  onRemoveShift,
  onMarkOpenShift,
  emptyAriaLabel,
}: {
  shifts: DraftShift[];
  context: CellContext;
  onOpenShift: (shiftId: DraftShift["id"]) => void;
  onDuplicateShift: (shiftId: DraftShift["id"]) => void;
  onRemoveShift: (shiftId: DraftShift["id"]) => void;
  onMarkOpenShift: (shiftId: DraftShift["id"]) => void;
  emptyAriaLabel: string;
}) {
  if (shifts.length === 0) {
    if (context === "open") {
      return (
        <div className="rota-empty-cell flex min-h-[48px] items-center justify-center text-xs text-muted-foreground">
          <span aria-hidden>—</span>
          <span className="sr-only">{emptyAriaLabel}</span>
        </div>
      );
    }
    return (
      <div className="rota-empty-cell flex min-h-[48px] items-center justify-center text-[11px] text-muted-foreground/60">
        <span aria-hidden>—</span>
        <span className="sr-only">{emptyAriaLabel}</span>
      </div>
    );
  }

  if (shifts.length === 1) {
    return (
      <ShiftPill
        shift={shifts[0]!}
        onOpen={onOpenShift}
        onDuplicate={onDuplicateShift}
        onRemove={onRemoveShift}
        onMarkOpen={onMarkOpenShift}
        compact={false}
      />
    );
  }

  return (
    <div className="flex min-h-[48px] flex-col gap-1">
      {shifts.map((shift) => (
        <ShiftPill
          key={shift.id}
          shift={shift}
          onOpen={onOpenShift}
          onDuplicate={onDuplicateShift}
          onRemove={onRemoveShift}
          onMarkOpen={onMarkOpenShift}
          compact
        />
      ))}
    </div>
  );
}

function ShiftPill({
  shift,
  onOpen,
  onDuplicate,
  onRemove,
  onMarkOpen,
  compact,
}: {
  shift: DraftShift;
  onOpen: (shiftId: DraftShift["id"]) => void;
  onDuplicate: (shiftId: DraftShift["id"]) => void;
  onRemove: (shiftId: DraftShift["id"]) => void;
  onMarkOpen: (shiftId: DraftShift["id"]) => void;
  compact: boolean;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isOpen = shift.staffId === null;
  const isConflict = shift.status === "conflict";
  const minH = compact ? "min-h-[31px] py-1" : "min-h-[48px] py-1.5";
  const pillTone = isConflict
    ? "border-warning/70 bg-warning-soft/80 text-foreground shadow-[inset_3px_0_0_hsl(var(--warning))]"
    : isOpen
      ? "border-2 border-dashed border-warning/80 bg-warning-soft/60 text-warning-700"
      : resolveShiftChipClasses(shift.role);

  if (isOpen) {
    return (
      <div className="group relative">
        <button
          type="button"
          onClick={() => onOpen(shift.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(true);
          }}
          aria-label={`Open shift, ${shift.role}, ${formatShiftTime(shift.start, shift.end)}`}
          className={`rota-shift-pill flex w-full flex-col justify-center rounded-lg border px-2 pr-7 text-xs transition hover:bg-warning-soft/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${pillTone} ${minH}`}
        >
          <div className="font-semibold leading-snug text-warning-700">Open shift</div>
          <div className="flex items-center gap-1 text-[10px] text-warning-700/80">
            <span className="truncate">{shift.role}</span>
            <Plus className="h-2.5 w-2.5" aria-hidden />
          </div>
        </button>
        <ShiftActionMenu
          shift={shift}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onEdit={onOpen}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onMarkOpen={onMarkOpen}
        />
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(shift.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
        aria-label={`${shift.role}, ${formatShiftTime(shift.start, shift.end)}${isConflict ? ", conflict" : ""}`}
        className={`rota-shift-pill relative flex w-full flex-col justify-center rounded-lg border px-2 pr-7 text-left transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${pillTone} ${minH}`}
      >
        <div className="font-mono text-xs font-semibold leading-snug tracking-tight">
          {formatShiftTime(shift.start, shift.end)}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {isConflict && <AlertTriangle className="h-3 w-3 text-warning" aria-hidden />}
          <span className="truncate">{shift.role}</span>
        </div>
      </button>
      <ShiftActionMenu
        shift={shift}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onEdit={onOpen}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onMarkOpen={onMarkOpen}
      />
    </div>
  );
}
