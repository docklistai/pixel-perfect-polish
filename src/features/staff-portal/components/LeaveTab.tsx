import * as React from "react";
import { CalendarDays, Check } from "lucide-react";
import { ActionButton, DashboardCard } from "@/components/dl";
import { PortalLeaveRequestDrawer } from "./PortalLeaveRequestDrawer";
import { PortalRecurringDaysOffCard } from "./PortalRecurringDaysOffCard";
import { PortalOneOffUnavailabilityCard } from "./PortalOneOffUnavailabilityCard";
import { usePortalLeaveRequests } from "../hooks/usePortalLeaveRequests";
import { PortalLeaveHistory } from "./PortalLeaveHistory";
import { PortalLeaveBalanceCard } from "./PortalLeaveBalanceCard";

export function LeaveTab() {
  const [open, setOpen] = React.useState(false);

  const {
    enabled,
    isLive,
    isLoading,
    isError,
    isWithdrawing,
    retry,
    withdraw,
    approvedLeave: liveApproved,
    requestHistory: liveHistory,
  } = usePortalLeaveRequests();

  // Phase 13 connects these to live data.
  const approvedLeave = isLive ? liveApproved : [];
  const requestHistory = isLive ? liveHistory : [];

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <PortalLeaveBalanceCard />

      <ActionButton
        icon={CalendarDays}
        className={
          enabled ? "w-full justify-center" : "w-full justify-center opacity-50 cursor-not-allowed"
        }
        onClick={() => {
          if (enabled) setOpen(true);
        }}
      >
        {enabled ? "Request time off" : "Request time off (not available here)"}
      </ActionButton>

      {/* Upcoming approved leave */}
      {approvedLeave.length > 0 && (
        <DashboardCard className="p-5">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            UPCOMING APPROVED LEAVE
          </div>
          <ul className="mt-3 space-y-2">
            {approvedLeave.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-2xl border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CalendarDays className="h-4 w-4 text-brand shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{l.date}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {l.type} · {l.days} days
                    </div>
                  </div>
                </div>
                <Check className="h-4 w-4 text-success" />
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      {/* Regular days off — live standing day-off requests */}
      <PortalRecurringDaysOffCard />

      <PortalOneOffUnavailabilityCard />

      <PortalLeaveHistory
        requests={requestHistory}
        isLoading={isLoading}
        isError={isError}
        isWithdrawing={isWithdrawing}
        onRetry={retry}
        onWithdraw={withdraw}
      />

      <PortalLeaveRequestDrawer open={open} onOpenChange={setOpen} />
    </div>
  );
}
