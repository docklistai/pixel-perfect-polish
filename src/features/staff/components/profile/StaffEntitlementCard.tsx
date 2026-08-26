import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { ActionButton, StatusBadge } from "@/components/dl";
import { ProfileCard } from "./ProfileCard";
import { useStaffEntitlement } from "@/features/leave/hooks/useStaffEntitlement";
import {
  CALENDAR_DAYS_EXPLAINER,
  CALENDAR_DAYS_LABEL,
  NOT_RECORDED_LABEL,
  remainingTone,
} from "@/features/leave/lib/leaveBalancePresentation";
import type { StaffLeaveBalance } from "@/features/leave/api/leaveEntitlements";

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "muted" | "success" | "warning" | "danger";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border px-3 py-2.5">
      <div className="dock-section-eyebrow">{label}</div>
      <div
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === "danger"
            ? "text-danger"
            : tone === "warning"
              ? "text-warning"
              : tone === "success"
                ? "text-success"
                : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function BalanceFigures({ balance }: { balance: StaffLeaveBalance }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Figure
        label="Entitlement"
        value={balance.recorded ? balance.entitlementDays : <span className="text-sm">—</span>}
      />
      <Figure label="Booked" value={balance.booked} />
      <Figure label="Pending" value={balance.pending} />
      <Figure
        label="Remaining"
        value={balance.recorded ? balance.remaining : <span className="text-sm">—</span>}
        tone={remainingTone(balance)}
      />
    </div>
  );
}

/**
 * The one place a manager records an individual's leave entitlement.
 *
 * Deliberately the single editable authority: the Leave page team-balance card
 * and the staff portal both read the row this card writes, so there is never a
 * second place stating a competing number.
 */
export function StaffEntitlementCard({ staffMemberId }: { staffMemberId: string }) {
  const { isLoading, isError, result, isSaving, save } = useStaffEntitlement(staffMemberId);
  const [draft, setDraft] = React.useState<string | null>(null);

  const balance = result?.balance ?? null;
  const isEditing = draft !== null;

  const beginEdit = () => {
    // Pre-fill with the recorded figure, falling back to the workspace default
    // only as a STARTING POINT for this edit. Nothing is stored until save.
    const prefill = balance?.recorded
      ? balance.entitlementDays
      : (result?.defaultAnnualLeaveDays ?? null);
    setDraft(prefill === null ? "" : String(prefill));
  };

  const commit = () => {
    const trimmed = (draft ?? "").trim();
    if (!/^\d+$/.test(trimmed) || Number(trimmed) > 366) return;
    save(Number(trimmed));
    setDraft(null);
  };

  const usingDefaultPrefill =
    isEditing && !balance?.recorded && result?.defaultAnnualLeaveDays !== null;

  if (isLoading) {
    return (
      <ProfileCard title="Annual leave">
        <p className="text-xs text-muted-foreground">Loading entitlement…</p>
      </ProfileCard>
    );
  }

  if (isError || !result) {
    return (
      <ProfileCard title="Annual leave">
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load entitlement right now. Refresh to try again.
        </p>
      </ProfileCard>
    );
  }

  if (!result.configured || !balance) {
    return (
      <ProfileCard title="Annual leave">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Set the month your leave year starts in{" "}
          <Link to="/settings" className="font-semibold text-brand hover:underline">
            Settings → Leave
          </Link>{" "}
          before recording entitlement.
        </p>
      </ProfileCard>
    );
  }

  return (
    <ProfileCard
      title="Annual leave"
      action={
        !isEditing && (
          <button
            type="button"
            onClick={beginEdit}
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            {balance.recorded ? "Edit entitlement" : "Record entitlement"}
          </button>
        )
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {result.leaveYear && <StatusBadge tone="info">{result.leaveYear.label}</StatusBadge>}
        <span className="badge">{CALENDAR_DAYS_LABEL}</span>
        {!balance.recorded && !isEditing && (
          <span className="text-xs text-muted-foreground">{NOT_RECORDED_LABEL}</span>
        )}
      </div>

      <BalanceFigures balance={balance} />

      {isEditing && (
        <div className="mt-3 space-y-2">
          <label className="space-y-1.5 block">
            <span className="dock-section-eyebrow">Entitlement for this leave year</span>
            <div className="flex max-w-xs overflow-hidden rounded-xl border border-border">
              <input
                value={draft ?? ""}
                inputMode="numeric"
                autoFocus
                aria-label="Entitlement in calendar days"
                disabled={isSaving}
                onChange={(event) => setDraft(event.target.value)}
                className="w-full border-0 bg-background px-3 py-2.5 text-sm outline-none"
              />
              <span className="flex shrink-0 items-center bg-muted px-3 text-xs font-semibold text-muted-foreground">
                calendar days
              </span>
            </div>
          </label>
          {usingDefaultPrefill && (
            <p className="text-xs text-muted-foreground">
              Pre-filled with the workspace default. It is not recorded for this person until you
              save.
            </p>
          )}
          <div className="flex gap-2">
            <ActionButton size="sm" onClick={commit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {isSaving ? "Saving…" : "Save entitlement"}
            </ActionButton>
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => setDraft(null)}
              disabled={isSaving}
            >
              Cancel
            </ActionButton>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {CALENDAR_DAYS_EXPLAINER} Pending leave is shown separately and does not reduce remaining.
      </p>
    </ProfileCard>
  );
}
