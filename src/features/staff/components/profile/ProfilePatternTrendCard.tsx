import * as React from "react";
import { ProfileCard } from "./ProfileCard";

const HOURS_TREND = [28, 31, 26, 33, 36, 30, 29, 32];
const TREND_LABELS = ["W10", "W11", "W12", "W13", "W14", "W15", "W16", "W17"];

export function ProfilePatternTrendCard({ contractedHours }: { contractedHours: string }) {
  return (
    <ProfileCard
      title="Hours trend"
      action={
        <div className="flex rounded-[10px] border border-border/40 bg-[var(--bg-raised)] p-0.5 text-[11px] font-semibold">
          {["8 wk", "12 wk", "26 wk"].map((range, index) => (
            <button
              key={range}
              type="button"
              className={`rounded-[7px] px-2.5 py-1.5 ${
                index === 0
                  ? "bg-[var(--bg-card)] text-foreground shadow-[var(--shadow-1)]"
                  : "text-muted-foreground"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid h-[140px] grid-cols-8 items-end gap-2">
        {HOURS_TREND.map((hours, index) => {
          const pct = hours / 40;
          const over = hours > 32;
          return (
            <div
              key={`${TREND_LABELS[index]}-${hours}`}
              className="flex h-full flex-col items-center justify-end gap-1"
            >
              <div
                className="w-full rounded-md"
                style={{
                  height: `${pct * 100}%`,
                  background: over ? "var(--amber-500)" : "var(--teal-500)",
                  opacity: index === HOURS_TREND.length - 1 ? 1 : 0.72,
                }}
              />
              <div className="font-mono text-[11px] font-semibold">{hours}</div>
              <div className="text-[10px] text-muted-foreground">{TREND_LABELS[index]}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-[3px] bg-[var(--teal-500)]" />
          Within contract
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-[3px] bg-[var(--amber-500)]" />
          Overtime
        </span>
        <span className="ml-auto font-mono">Contract: {contractedHours}</span>
      </div>
    </ProfileCard>
  );
}
