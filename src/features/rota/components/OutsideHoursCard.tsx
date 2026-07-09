import { Clock } from "lucide-react";
import { Card } from "@/components/dl";
import type { OutsideHoursShift } from "../lib/outsideOpeningHours";

/**
 * Flags shifts that clearly fall outside the business's trading hours. Renders
 * nothing when opening hours are unconfigured or no shift is out of hours. The
 * underlying check is conservative — overnight venues/shifts are never flagged.
 */
export function OutsideHoursCard({
  shifts,
  onReviewShift,
}: {
  shifts: OutsideHoursShift[];
  onReviewShift: (shiftId: string) => void;
}) {
  if (shifts.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-4 w-4 text-warning" aria-hidden />
        <span className="text-sm font-semibold">Shifts outside hours</span>
        <span className="badge">{shifts.length}</span>
      </div>
      <p className="mb-2.5 text-[11px] text-muted-foreground">
        Scheduled before you open or after you close. Adjust the times if that&apos;s not intended.
      </p>
      <ul className="space-y-1.5">
        {shifts.map((shift) => (
          <li key={shift.shiftId} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate font-medium">{shift.role}</span>
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
