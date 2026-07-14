import { ActionButton, DashboardCard, StatusBadge } from "@/components/dl";
import { usePortalOpenShifts } from "../hooks/usePortalOpenShifts";

/**
 * Published open shifts the signed-in staff member can request. Requesting
 * never self-assigns: the manager reviews applicants and the assignment only
 * lands when the rota is republished. Renders nothing in demo mode or when
 * there is nothing to request, and keeps read failures visible and retryable.
 */
export function OpenShiftsCard() {
  const open = usePortalOpenShifts();

  if (!open.enabled || open.isLoading) return null;
  if (open.isError) {
    return (
      <DashboardCard className="p-4">
        <div role="alert">
          <p className="text-sm font-medium">Open shifts are unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">Try loading them again.</p>
          <ActionButton className="mt-2" variant="secondary" size="sm" onClick={open.retry}>
            Try again
          </ActionButton>
        </div>
      </DashboardCard>
    );
  }
  if (open.openShifts.length === 0) return null;

  return (
    <DashboardCard className="p-4">
      <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
        Open shifts
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Request a shift and your manager will pick from the applicants. It lands on your rota only
        after the next rota update.
      </p>
      <ul className="mt-3 space-y-2">
        {open.openShifts.map((shift) => {
          const request = open.requestFor(shift.publishedShiftId);
          const pending = request?.status === "pending";
          const selected = request?.status === "selected";
          const terminal =
            request && !pending && !selected && request.status !== "withdrawn" ? request : null;
          return (
            <li
              key={shift.publishedShiftId}
              className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  {shift.dayLabel} · {shift.start} – {shift.end}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{shift.role}</div>
              </div>
              {terminal ? (
                <StatusBadge tone={terminal.status === "declined" ? "danger" : "muted"}>
                  {terminal.status === "declined"
                    ? "Declined"
                    : terminal.status === "filled"
                      ? "Filled"
                      : terminal.status === "confirmed"
                        ? "Confirmed"
                        : "No longer available"}
                </StatusBadge>
              ) : selected ? (
                <StatusBadge tone="info">Selected — awaiting rota update</StatusBadge>
              ) : pending ? (
                <div className="flex items-center gap-2">
                  <StatusBadge tone="warning">Requested</StatusBadge>
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    disabled={open.busy}
                    onClick={() => open.withdraw(request!.requestId)}
                  >
                    Withdraw
                  </ActionButton>
                </div>
              ) : (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  disabled={open.busy}
                  onClick={() => open.request(shift.publishedShiftId)}
                >
                  Request
                </ActionButton>
              )}
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}
