import { UserRoundMinus } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import { shiftReleaseStatusPresentation } from "@/features/staff-portal/lib/shiftReleaseRequests";
import { useShiftReleaseRequests } from "../hooks/useShiftReleaseRequests";

export function ShiftReleaseRequestsCard({
  rotaWeekId,
  onReviewShift,
}: {
  rotaWeekId: string | null;
  onReviewShift: (shiftId: string) => void;
}) {
  const state = useShiftReleaseRequests(rotaWeekId);
  if (!state.enabled || (!state.isLoading && !state.isError && state.requests.length === 0)) {
    return null;
  }
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <UserRoundMinus className="size-4 text-warning" aria-hidden />
        <span className="text-sm font-semibold">Shift release requests</span>
        <span className="badge">{state.requests.length}</span>
      </div>
      <p className="mb-2.5 text-[11px] text-muted-foreground">
        Review the exact published shift and reason. Approval reopens only the draft.
      </p>
      {state.isLoading && <p className="text-xs text-muted-foreground">Loading requests…</p>}
      {state.isError && (
        <div role="alert" className="text-xs text-danger">
          Requests could not be loaded.{" "}
          <button type="button" onClick={state.retry} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}
      <ul className="space-y-1.5">
        {state.requests.map((request) => {
          const status = shiftReleaseStatusPresentation(request.status);
          return (
            <li key={request.requestId} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">
                <span className="font-medium">{request.staffName}</span> · {request.dayLabel}
              </span>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <button
                type="button"
                onClick={() => onReviewShift(request.sourceShiftId)}
                className="shrink-0 rounded px-1 font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Review
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
