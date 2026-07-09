import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { ShiftActionMenu } from "./grid/ShiftActionMenu";
import { useRoleColoursConfig } from "./grid/roleColoursContext";
import { resolveShiftChipClasses } from "../lib/deptColours";
import { formatShiftTime } from "../lib/draftRota";
import type { ShiftMenuHandlers } from "./grid/types";
import type { DraftShift, ShiftId } from "../types";

type CellContext = "staff" | "open";

export function ShiftCell({
  shifts,
  context,
  menuHandlers,
  openMenuShiftId,
  onMenuOpenChange,
  emptyAriaLabel,
}: {
  shifts: DraftShift[];
  context: CellContext;
  menuHandlers: ShiftMenuHandlers;
  openMenuShiftId: ShiftId | null;
  onMenuOpenChange: (shiftId: ShiftId, open: boolean) => void;
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
        handlers={menuHandlers}
        menuOpen={openMenuShiftId === shifts[0]!.id}
        onMenuOpenChange={onMenuOpenChange}
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
          handlers={menuHandlers}
          menuOpen={openMenuShiftId === shift.id}
          onMenuOpenChange={onMenuOpenChange}
          compact
        />
      ))}
    </div>
  );
}

function ShiftPill({
  shift,
  handlers,
  menuOpen,
  onMenuOpenChange,
  compact,
}: {
  shift: DraftShift;
  handlers: ShiftMenuHandlers;
  menuOpen: boolean;
  onMenuOpenChange: (shiftId: ShiftId, open: boolean) => void;
  compact: boolean;
}) {
  const roleColours = useRoleColoursConfig();
  const isOpen = shift.staffId === null;
  const isConflict = shift.status === "conflict";
  const hasOverride = Boolean(shift.colourOverride || shift.deptOverride);
  const roleLabel = shift.deptOverride ?? shift.role;
  const minH = compact ? "min-h-[31px] py-1" : "min-h-[48px] py-1.5";
  const pillTone = isConflict
    ? "border-warning/70 bg-warning-soft/80 text-foreground shadow-[inset_3px_0_0_hsl(var(--warning))]"
    : isOpen
      ? "border-2 border-dashed border-warning/80 bg-warning-soft/60 text-warning-700"
      : resolveShiftChipClasses(roleLabel, shift.colourOverride, roleColours);

  const indicator = isConflict ? (
    <span
      className="absolute right-1.5 top-1.5"
      title="Schedule conflict — resolve before publishing"
    >
      <AlertTriangle className="h-3 w-3 text-danger" aria-hidden />
    </span>
  ) : shift.edited ? (
    <span
      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning"
      title="Edited in draft"
      aria-hidden
    />
  ) : hasOverride ? (
    <span className="absolute right-1.5 top-1.5" title="Manual colour override · Reset from menu">
      <Pencil className="h-2.5 w-2.5 opacity-70" aria-hidden />
    </span>
  ) : null;

  const ariaState = `${isConflict ? ", conflict" : ""}${shift.edited ? ", edited in draft" : ""}`;

  if (isOpen) {
    return (
      <div className="group relative">
        <button
          type="button"
          onClick={() => handlers.onOpen(shift.id)}
          onDoubleClick={(event) => event.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            onMenuOpenChange(shift.id, true);
          }}
          aria-label={`Open shift, ${roleLabel}, ${formatShiftTime(shift.start, shift.end)}${ariaState}`}
          className={`rota-shift-pill relative flex w-full flex-col justify-center rounded-lg border px-2 pr-7 text-xs transition hover:bg-warning-soft/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${pillTone} ${minH}`}
        >
          <div className="font-semibold leading-snug text-warning-700">Open shift</div>
          <div className="font-mono text-xs font-semibold leading-snug text-warning-700">
            {formatShiftTime(shift.start, shift.end)}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-warning-700/80">
            <span className="truncate">{roleLabel}</span>
            <Plus className="h-2.5 w-2.5" aria-hidden />
          </div>
          {shift.edited && (
            <span
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning"
              title="Edited in draft"
              aria-hidden
            />
          )}
        </button>
        <ShiftActionMenu
          shift={shift}
          open={menuOpen}
          onOpenChange={(open) => onMenuOpenChange(shift.id, open)}
          handlers={handlers}
        />
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => handlers.onOpen(shift.id)}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenuOpenChange(shift.id, true);
        }}
        aria-label={`${roleLabel}, ${formatShiftTime(shift.start, shift.end)}${ariaState}`}
        className={`rota-shift-pill relative flex w-full flex-col justify-center rounded-lg border px-2 pr-7 text-left transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${pillTone} ${minH}`}
      >
        <div className="font-mono text-xs font-semibold leading-snug tracking-tight">
          {formatShiftTime(shift.start, shift.end)}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="truncate">{roleLabel}</span>
        </div>
        {indicator}
      </button>
      <ShiftActionMenu
        shift={shift}
        open={menuOpen}
        onOpenChange={(open) => onMenuOpenChange(shift.id, open)}
        handlers={handlers}
      />
    </div>
  );
}
