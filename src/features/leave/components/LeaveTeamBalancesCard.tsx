import { Card, StatusBadge } from "@/components/dl";
import { Link } from "@tanstack/react-router";
import type { LeaveSource } from "../types";
import { teamLeaveBalances } from "../lib/leaveCards";
import { useLeaveBalances } from "../hooks/useLeaveBalances";
import {
  CALENDAR_DAYS_LABEL,
  NOT_RECORDED_SHORT,
  formatPendingSummary,
  remainingTone,
} from "../lib/leaveBalancePresentation";
import type { StaffLeaveBalance } from "../api/leaveEntitlements";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

const AVATAR_TONES = ["av-c1", "av-c2", "av-c3", "av-c4"] as const;

/**
 * Read-only team balances. The single editable authority for an individual's
 * entitlement is their staff profile, so each row links there rather than
 * offering a second place to edit the same number.
 */
function LiveBalanceRow({ balance, index }: { balance: StaffLeaveBalance; index: number }) {
  const pending = formatPendingSummary(balance);
  return (
    <Link
      to="/staff/$staffId"
      params={{ staffId: balance.staffMemberId }}
      search={{ tab: "leave" as const }}
      className="row gap-3 txt-sm rounded-lg px-1 py-1 transition-colors hover:bg-muted/40"
    >
      <div className={`av ${AVATAR_TONES[index % AVATAR_TONES.length]} xs`}>
        {initials(balance.displayName)}
      </div>
      <span className="grow min-w-0 truncate">{balance.displayName}</span>
      {balance.recorded ? (
        <>
          {pending && <span className="mono muted txt-xs hidden sm:inline">{pending} pending</span>}
          <span className="mono muted">
            {balance.booked}/{balance.entitlementDays}
          </span>
          <StatusBadge tone={remainingTone(balance)}>{balance.remaining} left</StatusBadge>
        </>
      ) : (
        <span className="mono muted txt-xs">{NOT_RECORDED_SHORT}</span>
      )}
    </Link>
  );
}

function LiveTeamBalances() {
  const { enabled, isLoading, isError, result } = useLeaveBalances();

  if (!enabled || isLoading) {
    return <div className="mt-2 text-sm text-muted-foreground">Loading balances…</div>;
  }

  if (isError || !result) {
    return (
      <div className="mt-2 text-sm text-muted-foreground">
        Couldn&apos;t load leave balances right now. Refresh to try again.
      </div>
    );
  }

  if (!result.configured) {
    return (
      <div className="mt-2 text-sm text-muted-foreground">
        <div className="strong txt-sm text-foreground">Leave year not set</div>
        <p className="mt-1 txt-xs">
          Set the month your leave year starts in Settings → Leave to track entitlement and
          balances.
        </p>
      </div>
    );
  }

  if (result.balances.length === 0) {
    return (
      <div className="mt-2 text-sm text-muted-foreground">
        No active team members to show balances for.
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      {result.balances.map((balance, index) => (
        <LiveBalanceRow key={balance.staffMemberId} balance={balance} index={index} />
      ))}
    </div>
  );
}

function DemoTeamBalances() {
  const balances = teamLeaveBalances("demo");
  if (!balances) return null;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {balances.map((b) => {
        const pct = Math.round((b.used / b.total) * 100);
        return (
          <div key={b.name} className="row gap-3 txt-sm">
            <div className={`av ${b.tone} xs`}>{initials(b.name)}</div>
            <span className="grow truncate">{b.name}</span>
            <span className="bar" style={{ width: 90 }}>
              <i
                style={{
                  width: `${pct}%`,
                  background: pct > 80 ? "var(--amber-500)" : "var(--teal-500)",
                }}
              />
            </span>
            <span className="mono muted">
              {b.used}/{b.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Team leave balances for the Leave page.
 *
 * Demo keeps its existing sample rows unchanged. Live now shows real recorded
 * entitlement instead of the previous "not tracked yet" copy — and shows
 * "Not recorded" for anyone the manager has not recorded, never the workspace
 * default, so this card and the staff portal always agree.
 */
export function LeaveTeamBalancesCard({ source }: { source: LeaveSource }) {
  const isLive = source === "live";
  return (
    <Card className="card-pad">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="section-label">Team leave balances</div>
        <span className="badge" title="Balances count calendar dates inside leave requests">
          {CALENDAR_DAYS_LABEL}
        </span>
      </div>
      {isLive ? <LiveTeamBalances /> : <DemoTeamBalances />}
    </Card>
  );
}
