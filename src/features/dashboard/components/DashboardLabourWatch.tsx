import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/dl";

interface Props {
  labourCost: string;
  projectedSales: string;
  labourPct: number;
  targetPct?: number;
  /** Flags the figures as illustrative demo data, not a live labour feed. */
  demo?: boolean;
}

function formatPct(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function LabourGauge({ value, targetPct }: { value: number; targetPct: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const isHealthy = value <= targetPct;
  const gaugeColor = isHealthy ? "var(--brand)" : "var(--warning)";
  const gaugeTrack = "var(--border)";

  return (
    <div className="relative shrink-0" style={{ width: 152, height: 96 }}>
      <svg width="152" height="96" viewBox="0 0 152 96" aria-hidden="true">
        <path
          d="M 16 76 A 60 60 0 0 1 136 76"
          stroke={gaugeTrack}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 16 76 A 60 60 0 0 1 136 76"
          stroke={gaugeColor}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${pct} 100`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
        <div className="font-display text-[20px] font-semibold leading-none tracking-tight">
          {formatPct(value)}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">Target {targetPct}%</div>
      </div>
    </div>
  );
}

export function DashboardLabourWatch({
  labourCost,
  projectedSales,
  labourPct,
  targetPct = 30,
  demo = false,
}: Props) {
  const isHealthy = labourPct <= targetPct;
  const barClass = isHealthy ? "bg-brand" : "bg-warning";
  const pctClass = isHealthy ? "text-brand" : "text-warning";

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="dock-section-eyebrow">Labour watch</div>
            {demo && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Demo
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">vs {targetPct}% target</span>
        </div>
        <div className="mt-3 flex items-center gap-5">
          <LabourGauge value={labourPct} targetPct={targetPct} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {(
              [
                ["Labour cost", labourCost],
                ["Projected sales", projectedSales],
                ["Labour %", formatPct(labourPct)],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-muted-foreground">{k}</div>
                <div className={`text-[15px] font-semibold ${k === "Labour %" ? pctClass : ""}`}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${barClass}`}
            style={{ width: `${Math.min(100, labourPct)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Target 100%</span>
          <span className="font-mono">{targetPct}% target</span>
        </div>
        <Link
          to="/reports"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          Open labour report <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
