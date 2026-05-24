import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/dl";

interface Props {
  scheduledHours: number;
  labourCost: string;
  coveragePct: number;
}

function CoverageGauge({ value }: { value: number }) {
  // Semi-circle: M 12 60 A 48 48 0 0 1 108 60 — arc length = π * 48 ≈ 150.8
  const arcLen = Math.PI * 48;
  const filled = (value / 100) * arcLen;
  return (
    <div className="relative shrink-0" style={{ width: 120, height: 72 }}>
      <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden="true">
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          stroke="var(--color-muted)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          stroke="var(--color-brand)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <div className="text-[20px] font-bold tracking-tight leading-none">{value}%</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">Coverage</div>
      </div>
    </div>
  );
}

export function DashboardLabourWatch({ scheduledHours, labourCost, coveragePct }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="dock-section-eyebrow">Scheduled labour</div>
          <span className="text-xs text-muted-foreground">vs 100% target</span>
        </div>
        <div className="mt-3 flex items-center gap-5">
          <CoverageGauge value={coveragePct} />
          <div className="flex flex-col gap-3">
            {(
              [
                ["Labour cost", labourCost],
                ["Scheduled hours", `${scheduledHours.toLocaleString()}h`],
                ["Coverage", `${coveragePct}%`],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-muted-foreground">{k}</div>
                <div className="text-[15px] font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-3">
        <Link
          to="/reports"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          Open labour report <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
