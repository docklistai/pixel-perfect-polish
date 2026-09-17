import * as React from "react";
import { CalendarDays, Check } from "lucide-react";
import { ActionButton, DashboardCard } from "@/components/dl";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { PortalLeaveRequestDrawer } from "./PortalLeaveRequestDrawer";
import { PortalRecurringDaysOffCard } from "./PortalRecurringDaysOffCard";
import { PortalOneOffUnavailabilityCard } from "./PortalOneOffUnavailabilityCard";
import { usePortalLeaveRequests } from "../hooks/usePortalLeaveRequests";
import { PortalLeaveHistory } from "./PortalLeaveHistory";
import { PortalLeaveBalanceCard } from "./PortalLeaveBalanceCard";
import type { PortalLeaveRequest } from "../api/portalLiveData";

export function LeaveTab() {
  const [open, setOpen] = React.useState(false);

  const {
    isLive,
    isLoading,
    isError,
    isWithdrawing,
    retry,
    withdraw,
    approvedLeave: liveApproved,
    requestHistory: liveHistory,
  } = usePortalLeaveRequests();

  const demoLeaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const demoOliviaRequests: PortalLeaveRequest[] = React.useMemo(() => {
    return demoLeaveRequests
      .filter((r) => r.staffId === "olivia-bennett")
      .map((r) => ({
        id: r.id,
        type: r.type,
        date: r.date,
        startIso: r.startIso,
        endIso: r.endIso,
        days: r.days,
        reason: r.reason,
        status: r.state as "pending" | "approved" | "declined" | "cancelled",
        submittedAt: r.submitted.slice(0, 11),
        decisionReason: r.state === "declined" ? "Peak coverage required" : undefined,
      }));
  }, [demoLeaveRequests]);

  const approvedLeave = isLive
    ? liveApproved
    : demoOliviaRequests.filter((r) => r.status === "approved");
  const requestHistory = isLive ? liveHistory : demoOliviaRequests;

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <PortalLeaveBalanceCard />

      <ActionButton
        icon={CalendarDays}
        className="w-full justify-center"
        onClick={() => setOpen(true)}
      >
        Request time off
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
