import * as React from "react";
import { AlertTriangle, Copy, Edit3, MoreHorizontal, Plus, Trash2, UserMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toneStyles } from "../data/mockData";
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
    <div className="flex min-h-16 flex-col gap-1">
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
  const isOpen = shift.staffId === null;
  const isConflict = shift.status === "conflict";
  const heightClass = compact ? "min-h-[36px] py-1" : "h-16 py-1.5";
  const pillTone = isConflict
    ? "border-warning/70 bg-warning-soft/80 text-foreground shadow-[inset_3px_0_0_hsl(var(--warning))]"
    : isOpen
      ? "border-2 border-dashed border-warning/80 bg-warning-soft/80 text-warning-700"
      : toneStyles[shift.tone];

  if (isOpen) {
    return (
      <div className="group relative">
        <button
          type="button"
          onClick={() => onOpen(shift.id)}
          aria-label={`Open shift, ${shift.role}, ${formatShiftTime(shift.start, shift.end)}`}
          className={`flex w-full flex-col justify-center rounded-[10px] border px-2.5 pr-8 text-xs transition hover:bg-warning-soft/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${pillTone} ${heightClass}`}
        >
          <div className="font-semibold text-warning-700">Open shift</div>
          <div className="flex items-center gap-1 text-[11px] text-warning-700/90">
            {shift.role} <Plus className="h-3 w-3" aria-hidden />
          </div>
        </button>
        <ShiftActionMenu
          shift={shift}
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
        aria-label={`${shift.role}, ${formatShiftTime(shift.start, shift.end)}${isConflict ? ", conflict" : ""}`}
        className={`relative flex w-full flex-col justify-between rounded-[10px] border px-2.5 pr-8 text-left transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${pillTone} ${heightClass}`}
      >
        <div className="text-xs font-semibold tracking-tight">
          {formatShiftTime(shift.start, shift.end)}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {isConflict && <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />}
          <span>{shift.role}</span>
        </div>
      </button>
      <ShiftActionMenu
        shift={shift}
        onEdit={onOpen}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onMarkOpen={onMarkOpen}
      />
    </div>
  );
}

function ShiftActionMenu({
  shift,
  onEdit,
  onDuplicate,
  onRemove,
  onMarkOpen,
}: {
  shift: DraftShift;
  onEdit: (shiftId: DraftShift["id"]) => void;
  onDuplicate: (shiftId: DraftShift["id"]) => void;
  onRemove: (shiftId: DraftShift["id"]) => void;
  onMarkOpen: (shiftId: DraftShift["id"]) => void;
}) {
  const isOpen = shift.staffId === null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${shift.role} shift`}
          className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-80 transition hover:bg-background/80 hover:text-foreground focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onEdit(shift.id)}>
          <Edit3 className="h-4 w-4" aria-hidden />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(shift.id)}>
          <Copy className="h-4 w-4" aria-hidden />
          Duplicate as open
        </DropdownMenuItem>
        {!isOpen && (
          <DropdownMenuItem onSelect={() => onMarkOpen(shift.id)}>
            <UserMinus className="h-4 w-4" aria-hidden />
            Mark as open
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onSelect={() => onRemove(shift.id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Remove shift
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
