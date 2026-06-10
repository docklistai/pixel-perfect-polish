import { Link, useNavigate } from "@tanstack/react-router";
import { Info, Settings } from "lucide-react";
import { ActionButton, Card, IconButton } from "@/components/dl";

/** Demo figures for the labour breakdown — frontend-only, mirrors the prototype rail. */
const DEMO_FORECAST_SALES = 17800;
const DEMO_BLENDED_RATE = 14;
const DEMO_LABOUR_TARGET_PCT = 30;

function formatPct(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatMoney(value: number) {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function Ring({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r={r} stroke="var(--border)" strokeWidth="4" fill="none" />
      <circle
        cx="22"
        cy="22"
        r={r}
        stroke="var(--brand)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
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
  const navigate = useNavigate();
  const clampedPct = Math.min(100, Math.max(0, coveragePct));
  const withinBudget = scheduledHours <= targetHours;
  const estCost = scheduledHours * DEMO_BLENDED_RATE;
  const labourPct = (estCost / DEMO_FORECAST_SALES) * 100;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Labour summary</div>
        <IconButton
          icon={Settings}
          label="Edit labour targets in Settings"
          size="sm"
          variant="ghost"
          onClick={() => navigate({ to: "/settings" })}
        />
      </div>

      <div className="flex items-center gap-3">
        <div>
          <div className="font-display text-[22px] font-semibold leading-tight tracking-tight tabular-nums">
            {Math.round(scheduledHours)}h
          </div>
          <div className="text-[11px] text-muted-foreground">
            of {Math.round(targetHours)}h weekly budget
          </div>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div className="font-display text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-brand">
            {formatPct(labourPct)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            vs {DEMO_LABOUR_TARGET_PCT}% target
          </div>
        </div>
        <Ring pct={clampedPct} />
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${withinBudget ? "bg-brand" : "bg-warning"}`}
          style={{ width: `${Math.min(100, (scheduledHours / Math.max(1, targetHours)) * 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className={`font-semibold ${withinBudget ? "text-brand" : "text-warning"}`}>
          {withinBudget ? "Within budget" : "Over budget"}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {formatMoney(estCost)} est. cost
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-border/60 pt-2.5">
        {[
          ["Forecast sales", formatMoney(DEMO_FORECAST_SALES)],
          ["Projected labour %", formatPct(labourPct)],
          ["Labour % target", `${DEMO_LABOUR_TARGET_PCT}%`],
          ["Hours budget", `${Math.round(targetHours)}h / week`],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <span className="font-mono text-[11px] font-semibold tabular-nums">{value}</span>
          </div>
        ))}
        <Link
          to="/settings"
          className="mt-1 flex items-start gap-1.5 text-left text-[11px] leading-snug text-brand hover:underline"
        >
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            Labour % is based on forecast sales set in Settings → Rota &amp; scheduling. Edit labour
            targets →
          </span>
        </Link>
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
