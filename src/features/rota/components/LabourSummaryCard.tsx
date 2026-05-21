import { Card, StatusBadge, ActionButton } from "@/components/dl";

const RING_RADIUS = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 226

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
  const dashOffset = RING_CIRCUMFERENCE * (1 - clampedPct / 100);
  const scheduledLabel = `${Math.round(scheduledHours)}h`;
  const targetLabel = `${Math.round(targetHours)}h`;
  const coverageStatus =
    coveragePct > 110 ? "Over target" : coveragePct >= 95 ? "On target" : "Under target";
  const coverageTone = coveragePct > 110 ? "warning" : coveragePct >= 95 ? "success" : "warning";

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Scheduled vs target</div>
        <StatusBadge tone={coverageTone}>{coverageStatus}</StatusBadge>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              stroke="oklch(0.92 0.01 240)"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-[24px] font-semibold tracking-tight">{scheduledLabel}</div>
            <div className="text-[10px] text-muted-foreground">of target</div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Total scheduled</div>
            <div className="text-[18px] font-semibold">{scheduledLabel}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Weekly target</div>
            <div className="text-[18px] font-semibold text-foreground">{targetLabel}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Schedule load</div>
            <div className="text-[18px] font-semibold text-brand">{coveragePct}%</div>
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand" style={{ width: `${clampedPct}%` }} />
      </div>
      <ActionButton
        variant="ghost"
        size="sm"
        className="mt-3 px-0 text-xs font-semibold text-brand"
        onClick={onViewCoverageDetails}
      >
        View coverage details
      </ActionButton>
    </Card>
  );
}
