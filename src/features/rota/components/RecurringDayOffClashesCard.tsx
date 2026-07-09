import { CalendarX } from "lucide-react";
import { Card } from "@/components/dl";
import type { RecurringDayOffClash } from "../lib/recurringDayOffClashes";

/**
 * Surfaces rota shifts that fall on a staff member's approved standing day off,
 * so a manager can reassign or clear them before publishing. Renders nothing
 * when there are no clashes.
 */
export function RecurringDayOffClashesCard({
  clashes,
  onReviewShift,
}: {
  clashes: RecurringDayOffClash[];
  onReviewShift: (shiftId: string) => void;
}) {
  if (clashes.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <CalendarX className="h-4 w-4 text-warning" aria-hidden />
        <span className="text-sm font-semibold">Regular day-off clashes</span>
        <span className="badge">{clashes.length}</span>
      </div>
      <p className="mb-2.5 text-[11px] text-muted-foreground">
        Scheduled on an approved standing day off. Reassign or clear before publishing.
      </p>
      <ul className="space-y-1.5">
        {clashes.map((clash) => (
          <li key={clash.shiftId} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              <span className="font-medium">{clash.staffName}</span> · {clash.dayLabel}
            </span>
            <button
              type="button"
              onClick={() => onReviewShift(clash.shiftId)}
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
