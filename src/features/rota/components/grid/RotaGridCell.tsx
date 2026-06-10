import * as React from "react";
import { ShiftCell } from "../ShiftCell";
import type { RotaGridDay, ShiftActionHandlers } from "./types";
import type { RotaGridCell as RotaGridCellData, DraftShift, RotaDayIndex } from "../../types";
import { toast } from "sonner";

interface InlineCellEditorProps {
  initial: string;
  onCommit: (val: string) => void;
  onCancel: () => void;
}

function InlineCellEditor({ initial, onCommit, onCancel }: InlineCellEditorProps) {
  const [val, setVal] = React.useState(initial);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const commit = () => {
    const trimmed = (val || "").trim();
    if (!trimmed) onCommit("off");
    else if (/^off$/i.test(trimmed) || /^day off$/i.test(trimmed)) onCommit("off");
    else if (/^open/i.test(trimmed) || /^unassigned/i.test(trimmed)) onCommit("open");
    else onCommit(trimmed);
  };

  return (
    <div className="rounded-lg border-2 border-brand bg-card p-1.5 shadow-md">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="09:00 - 17:00 or OFF / Open"
        className="w-full bg-transparent border-0 outline-none p-0.5 font-mono text-xs font-semibold text-foreground focus:ring-0"
      />
      <div className="text-[9px] text-muted-foreground mt-1 px-0.5 flex justify-between">
        <span>↵ save</span>
        <span>esc cancel</span>
      </div>
    </div>
  );
}

function parseTimePart(t: string): string | null {
  const match = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = parseInt(match[1]!, 10);
  const min = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3]?.toLowerCase();
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseTimeRange(input: string): { start: string; end: string } | null {
  const parts = input.split(/[-–—]|to/i);
  if (parts.length !== 2) return null;
  const startStr = parseTimePart(parts[0]!);
  let endStr = parseTimePart(parts[1]!);
  if (!startStr || !endStr) return null;

  // Smart heuristic: if start is e.g. "09:00" and end is "05:00", convert end to "17:00" (5pm)
  const startHr = parseInt(startStr.split(":")[0]!, 10);
  let endHr = parseInt(endStr.split(":")[0]!, 10);
  if (endHr < startHr && endHr < 12) {
    endHr += 12;
    endStr = `${String(endHr).padStart(2, "0")}:${endStr.split(":")[1]}`;
  }
  return { start: startStr, end: endStr };
}

export function RotaGridCell({
  cell,
  day,
  context,
  emptyAriaLabel,
  openRow = false,
  handlers,
  staffId,
  staffRole,
  dayIndex,
}: {
  cell: RotaGridCellData;
  day: RotaGridDay | undefined;
  context: "staff" | "open";
  emptyAriaLabel: string;
  openRow?: boolean;
  handlers: ShiftActionHandlers;
  staffId?: string | null;
  staffRole?: string;
  dayIndex: number;
}) {
  const [isEditing, setIsEditing] = React.useState(false);

  const todayClass = openRow
    ? "border-brand/20 bg-warning-soft/20"
    : "border-brand/20 bg-brand-soft/10";
  const defaultClass = openRow ? "border-border bg-warning-soft/10" : "border-border";

  const firstShift = cell.shifts[0];
  const initialValue = firstShift
    ? firstShift.status === "open"
      ? "OPEN"
      : `${firstShift.start} - ${firstShift.end}`
    : "OFF";

  const handleCommit = (val: string) => {
    setIsEditing(false);
    if (val === "off") {
      if (cell.shifts.length > 0) {
        cell.shifts.forEach((s) => handlers.onShiftRemove(s.id));
        toast.success("Shift removed");
      }
    } else if (val === "open") {
      if (cell.shifts.length > 0) {
        cell.shifts.forEach((s) => handlers.onShiftMarkOpen(s.id));
        toast.success("Shift set to open");
      } else {
        handlers.onShiftAdd?.({
          dayIndex: dayIndex as RotaDayIndex,
          staffId: null,
          role: staffRole || "FOH",
          start: "09:00",
          end: "17:00",
          status: "open",
          tone: "open",
        });
        toast.success("Open shift created");
      }
    } else {
      const parsed = parseTimeRange(val);
      if (!parsed) {
        toast.error("Invalid format", {
          description: "Use e.g. 09:00 - 17:00, 9am - 5pm, or 9-5",
        });
        return;
      }
      if (cell.shifts.length > 0) {
        cell.shifts.forEach((s) => {
          handlers.onShiftUpdate?.(s.id, {
            start: parsed.start,
            end: parsed.end,
            status: staffId ? "scheduled" : "open",
            tone: staffId ? "info" : "open",
          });
        });
        toast.success("Shift time updated");
      } else {
        handlers.onShiftAdd?.({
          dayIndex: dayIndex as RotaDayIndex,
          staffId: staffId || null,
          role: staffRole || "FOH",
          start: parsed.start,
          end: parsed.end,
          status: staffId ? "scheduled" : "open",
          tone: staffId ? "info" : "open",
        });
        toast.success("Shift created");
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onDoubleClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "F2") {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      className={`border-b border-l px-2 py-2 select-none outline-none focus-within:ring-2 focus-within:ring-brand/40 ${
        day?.isToday ? todayClass : defaultClass
      }`}
    >
      {isEditing ? (
        <InlineCellEditor
          initial={initialValue}
          onCommit={handleCommit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ShiftCell
          shifts={cell.shifts}
          context={context}
          onOpenShift={handlers.onShiftOpen}
          onDuplicateShift={handlers.onShiftDuplicate}
          onRemoveShift={handlers.onShiftRemove}
          onMarkOpenShift={handlers.onShiftMarkOpen}
          emptyAriaLabel={emptyAriaLabel}
        />
      )}
    </div>
  );
}
