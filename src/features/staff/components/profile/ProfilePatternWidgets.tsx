import * as React from "react";
import { ProfileCard } from "./ProfileCard";

export function PatternMetricCard({
  icon: Icon,
  title,
  metric,
  metricSub,
  rows,
  tone = "teal",
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  metric: string;
  metricSub: string;
  rows: Array<[string, string]>;
  tone?: "teal" | "green" | "amber";
}) {
  const bubble =
    tone === "amber"
      ? "bg-[var(--st-amber-bg)] text-[var(--st-amber-ink)]"
      : tone === "green"
        ? "bg-[var(--st-green-bg)] text-[var(--st-green-ink)]"
        : "bg-[var(--st-teal-bg)] text-[var(--st-teal-ink)]";

  return (
    <ProfileCard title={title} className="p-4">
      <div className="flex items-start gap-3">
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${bubble}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none tabular-nums">{metric}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{metricSub}</div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border/40 pt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-right">{value}</span>
          </div>
        ))}
      </div>
    </ProfileCard>
  );
}

export function SignalRow({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: "green" | "amber";
  label: string;
  value: string;
  sub: string;
}) {
  const token =
    tone === "amber"
      ? "bg-[var(--st-amber-bg)] text-[var(--st-amber-ink)]"
      : "bg-[var(--st-green-bg)] text-[var(--st-green-ink)]";

  return (
    <div className="flex items-start gap-3 rounded-[10px] bg-[var(--bg-raised)] p-3">
      <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${token}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{value}</span>
          {" · "}
          {sub}
        </div>
      </div>
    </div>
  );
}
