import * as React from "react";
import { AlertTriangle, Plane } from "lucide-react";

type LeaveRecord = {
  type: "Annual" | "Sick" | "Unpaid";
  status: "approved" | "requested" | "logged";
};

export function BalanceBar({
  label,
  used,
  total,
  tone = "teal",
}: {
  label: string;
  used: number;
  total: number;
  tone?: "teal" | "amber" | "purple";
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const fill =
    tone === "amber"
      ? "var(--amber-500)"
      : tone === "purple"
        ? "var(--purple-500)"
        : "var(--teal-500)";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs font-semibold tabular-nums">
          {used} / {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fill }} />
      </div>
    </div>
  );
}

export function LeaveBadge({ status }: { status: LeaveRecord["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
        Approved
      </span>
    );
  }
  if (status === "requested") {
    return (
      <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
        Requested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-accent-purple-soft px-2 py-0.5 text-[10px] font-semibold text-accent-purple">
      Logged
    </span>
  );
}

export function LeaveTypeIcon({ type }: { type: LeaveRecord["type"] }) {
  const tone =
    type === "Sick"
      ? { bg: "var(--st-red-bg)", color: "var(--st-red-ink)" }
      : type === "Unpaid"
        ? { bg: "var(--st-purple-bg)", color: "var(--st-purple-ink)" }
        : { bg: "var(--st-teal-bg)", color: "var(--st-teal-ink)" };
  const icon = type === "Sick" ? AlertTriangle : Plane;

  return (
    <div
      className="flex size-7 items-center justify-center rounded-full"
      style={{ background: tone.bg, color: tone.color }}
    >
      {React.createElement(icon, { className: "h-3 w-3", "aria-hidden": true })}
    </div>
  );
}
