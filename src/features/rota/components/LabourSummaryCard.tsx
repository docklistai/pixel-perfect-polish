import { ActionButton } from "@/components/dl";
import { Card } from "@/components/dl";

const RING_R = 18;
const RING_C = 2 * Math.PI * RING_R;

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
  const ringDash = (clampedPct / 100) * RING_C;
  const scheduledLabel = `${Math.round(scheduledHours)}h`;
  const targetLabel = `${Math.round(targetHours)}h`;
  const isOnTarget = coveragePct >= 95 && coveragePct <= 110;
  const ringColor = isOnTarget ? "var(--brand)" : "var(--warning)";
  const barClass = isOnTarget ? "bg-brand" : "bg-warning";
  const pctClass = isOnTarget ? "text-brand" : "text-warning";

  return (
    <Card className="p-4">
      <div className="mb-3 text-sm font-semibold">Labour summary</div>
      <div className="flex items-center gap-3">
        <div>
          <div className="font-mono text-[22px] font-semibold leading-tight tracking-tight tabular-nums">
            {scheduledLabel}
          </div>
          <div className="text-[11px] text-muted-foreground">Scheduled</div>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div
            className={`text-[22px] font-semibold leading-tight tracking-tight tabular-nums ${pctClass}`}
          >
            {coveragePct}%
          </div>
          <div className="text-[11px] text-muted-foreground">Coverage</div>
        </div>
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
          <circle
            cx="22"
            cy="22"
            r={RING_R}
            fill="none"
            stroke="oklch(0.92 0.01 240)"
            strokeWidth="4"
          />
          <circle
            cx="22"
            cy="22"
            r={RING_R}
            fill="none"
            stroke={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${ringDash} ${RING_C}`}
            transform="rotate(-90 22 22)"
          />
        </svg>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
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
