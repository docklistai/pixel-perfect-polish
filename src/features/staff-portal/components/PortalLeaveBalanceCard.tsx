import { DashboardCard } from "@/components/dl";
import {
  CALENDAR_DAYS_EXPLAINER,
  CALENDAR_DAYS_LABEL,
  NOT_RECORDED_LABEL,
} from "@/features/leave/lib/leaveBalancePresentation";
import { usePortalLeaveBalance } from "../hooks/usePortalLeaveBalance";

function Figure({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="px-2 py-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-bold tabular-nums ${tone === "danger" ? "text-danger" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * The staff member's own annual leave balance (§8.6).
 *
 * Reads the entitlement the manager recorded for this person and nothing else —
 * no workspace default is substituted — so this card and the manager's view can
 * never disagree. When no entitlement has been recorded the card states that
 * honestly using canonical copy.
 */
export function PortalLeaveBalanceCard() {
  const { isLoading, isError, balance, leaveYearLabel } = usePortalLeaveBalance();

  return (
    <DashboardCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          LEAVE BALANCE
        </div>
        <span className="text-[11px] text-muted-foreground">
          {leaveYearLabel ?? NOT_RECORDED_LABEL}
        </span>
      </div>

      {balance ? (
        <>
          <div className="mt-3 grid grid-cols-4 divide-x divide-border rounded-2xl border border-border">
            <Figure label="Entitlement" value={balance.entitlementDays ?? 0} />
            <Figure label="Approved" value={balance.booked} />
            <Figure label="Pending" value={balance.pending} />
            <Figure
              label="Remaining"
              value={balance.remaining ?? 0}
              tone={balance.remaining !== null && balance.remaining < 0 ? "danger" : undefined}
            />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {CALENDAR_DAYS_LABEL}. {CALENDAR_DAYS_EXPLAINER} Pending leave is not deducted until it
            is approved.
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-2xl border border-border bg-muted/40 px-3 py-4 text-center">
          <div className="text-sm font-semibold text-muted-foreground">
            {isLoading ? "Loading…" : NOT_RECORDED_LABEL}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isError
              ? "We couldn't load your balance. Pull to refresh to try again."
              : isLoading
                ? "Checking your recorded entitlement."
                : "Your manager has not recorded a leave entitlement for this leave year."}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
