import { ActionButton, Card } from "@/components/dl";

function formatPct(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function LabourSummaryCard({
  scheduledHours,
  targetHours,
  coveragePct,
  onViewCoverageDetails,
}: {
  scheduledHours: number;
  targetHours: number;
  coveragePct: number;
  onViewCoverageDetails: () => void;
}) {
  const clampedPct = Math.min(100, Math.max(0, coveragePct));
  const scheduledLabel = `${Math.round(scheduledHours)}h`;
  const targetLabel = `${Math.round(targetHours)}h`;
  const isOnTarget = coveragePct >= 95 && coveragePct <= 110;
  const gaugeColor = isOnTarget ? "var(--brand)" : "var(--warning)";
  const gaugeTrack = "var(--border)";
  const barClass = isOnTarget ? "bg-brand" : "bg-warning";
  const pctClass = isOnTarget ? "text-brand" : "text-warning";

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Labour summary</div>
        <span className="text-xs text-muted-foreground">This week</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-[10px] text-muted-foreground">Scheduled</div>
            <div className="font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums">
              {scheduledLabel}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted-foreground">Coverage</div>
            <div
              className={`text-[22px] font-semibold leading-none tracking-tight tabular-nums ${pctClass}`}
            >
              {formatPct(coveragePct)}
            </div>
          </div>
        </div>

        <div className="relative shrink-0" style={{ width: 152, height: 96 }}>
          <svg width="152" height="96" viewBox="0 0 152 96" aria-hidden>
            <path
              d="M 16 76 A 60 60 0 0 1 136 76"
              fill="none"
              stroke={gaugeTrack}
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 16 76 A 60 60 0 0 1 136 76"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="12"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${clampedPct} 100`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
            <div className="text-[20px] font-semibold leading-none tracking-tight tabular-nums">
              {formatPct(coveragePct)}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Coverage</div>
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Target 100%</span>
        <span className="font-mono">{targetLabel} budget</span>
      </div>
      <ActionButton
        variant="ghost"
        size="sm"
        className="mt-2 px-0 text-xs font-semibold text-brand"
        onClick={onViewCoverageDetails}
      >
        View coverage details
      </ActionButton>
    </Card>
  );
}
