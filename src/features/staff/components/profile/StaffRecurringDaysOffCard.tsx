import { toast } from "sonner";
import { Check, RotateCcw, X } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { ProfileCard } from "./ProfileCard";
import { useStaffRecurringDaysOff } from "../../hooks/useStaffRecurringDaysOff";
import { weekdayLabel } from "@/features/staff-portal/lib/recurringDaysOff";
import type {
  DecideRecurringDayOffInput,
  ManagerRecurringDayOff,
} from "../../api/recurringDaysOff";

const STATUS_TONE: Record<ManagerRecurringDayOff["status"], Tone> = {
  pending: "warning",
  approved: "success",
  declined: "danger",
};

const STATUS_LABEL: Record<ManagerRecurringDayOff["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

function RowActions({
  request,
  disabled,
  onDecide,
}: {
  request: ManagerRecurringDayOff;
  disabled: boolean;
  onDecide: (input: DecideRecurringDayOffInput) => void;
}) {
  const btn =
    "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50";
  if (request.status === "pending") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDecide({ requestId: request.id, status: "approved", note: null })}
          className={`${btn} border-success/40 text-success hover:bg-success-soft/50`}
        >
          <Check className="h-3 w-3" aria-hidden /> Approve
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDecide({ requestId: request.id, status: "declined", note: null })}
          className={`${btn} border-danger/40 text-danger hover:bg-danger-soft/40`}
        >
          <X className="h-3 w-3" aria-hidden /> Decline
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onDecide({ requestId: request.id, status: "pending", note: null })}
      className={`${btn} border-border text-muted-foreground hover:bg-muted/50`}
    >
      <RotateCcw className="h-3 w-3" aria-hidden /> Reopen
    </button>
  );
}

/**
 * Manager approval surface for one staff member's standing day-off requests.
 * Renders nothing for demo profiles or when the member has no requests, so it
 * never adds an empty card to a profile that has nothing to review.
 */
export function StaffRecurringDaysOffCard({
  staffMemberId,
  firstName,
}: {
  staffMemberId: string;
  firstName: string;
}) {
  const state = useStaffRecurringDaysOff();
  const requests = state.requests.filter((request) => request.staffMemberId === staffMemberId);

  if (!state.enabled || (requests.length === 0 && !state.isLoading)) return null;

  const decide = async (input: DecideRecurringDayOffInput) => {
    const result = await state.decide(input);
    if (!result.ok) {
      toast.error("Couldn't save", { description: result.message });
      return;
    }
    toast.success(
      input.status === "approved"
        ? "Day off approved"
        : input.status === "declined"
          ? "Day off declined"
          : "Request reopened",
    );
  };

  return (
    <ProfileCard title="Regular days off">
      <p className="mb-3 text-xs text-muted-foreground">
        {firstName}&apos;s standing day-off requests. Approved days recur every week — factor them
        in when planning the rota.
      </p>
      <ul className="space-y-2">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {weekdayLabel(request.weekday)}
                <StatusBadge tone={STATUS_TONE[request.status]}>
                  {STATUS_LABEL[request.status]}
                </StatusBadge>
              </div>
              {request.note && (
                <div className="truncate text-xs text-muted-foreground">{request.note}</div>
              )}
            </div>
            <RowActions request={request} disabled={state.isDeciding} onDecide={decide} />
          </li>
        ))}
      </ul>
    </ProfileCard>
  );
}
