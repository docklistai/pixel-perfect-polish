import { CalendarOff } from "lucide-react";
import { Card } from "@/components/dl";
import type { ClosedDayShift } from "../lib/closedDayShifts";

/**
 * Flags shifts scheduled on a day the business is marked closed. Renders nothing
 * when opening days are unconfigured or every shift is on an open day.
 */
export function ClosedDayShiftsCard({
  shifts,
  onReviewShift,
}: {
  shifts: ClosedDayShift[];
  onReviewShift: (shiftId: string) => void;
}) {
  if (shifts.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <CalendarOff className="h-4 w-4 text-warning" aria-hidden />
        <span className="text-sm font-semibold">Shifts on closed days</span>
        <span className="badge">{shifts.length}</span>
      </div>
      <p className="mb-2.5 text-[11px] text-muted-foreground">
        Scheduled on a day marked closed in your opening days. Move or clear before publishing.
      </p>
      <ul className="space-y-1.5">
        {shifts.map((shift) => (
          <li key={shift.shiftId} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              <span className="font-medium">{shift.dayLabel}</span> · {shift.role}
            </span>
            <button
              type="button"
              onClick={() => onReviewShift(shift.shiftId)}
              className="shrink-0 font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded px-1"
            >
              Review
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
