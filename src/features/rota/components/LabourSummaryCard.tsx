import { Link, useNavigate } from "@tanstack/react-router";
import { Info, Settings } from "lucide-react";
import { ActionButton, Card, IconButton } from "@/components/dl";
import type { LabourCostView } from "../lib/labourCost";
import { buildLabourSummaryView, formatMoneyPence, formatPct } from "../lib/labourSummaryView";

/** Demo figures for the prototype rail — used only when the demo dataset is shown. */
const DEMO_FORECAST_SALES_PENCE = 1_780_000;
const DEMO_BLENDED_RATE_PENCE = 1_400;
const DEMO_LABOUR_TARGET_PCT = 30;

const TONE_TEXT = {
  ok: "text-brand",
  warning: "text-warning",
  danger: "text-danger",
} as const;

const TONE_BAR = {
  ok: "bg-brand",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

export function LabourSummaryCard({
  source,
  scheduledHours,
  contractedHours,
  coveragePct,
  labour,
  onViewCoverageDetails,
}: {
  source: "live" | "demo";
  scheduledHours: number;
  contractedHours: number;
  coveragePct?: number;
  /** Live cost estimate; null while demo data or settings are on screen. */
  labour: LabourCostView | null;
  onViewCoverageDetails: () => void;
}) {
  const navigate = useNavigate();

  const isLiveEstimate = source === "live" && labour !== null;
  const view = isLiveEstimate
    ? buildLabourSummaryView({ scheduledHours, contractedHours, labour })
    : {
        budgetHours: contractedHours,
        budgetSource: "budget" as const,
        estCostLabel: formatMoneyPence(scheduledHours * DEMO_BLENDED_RATE_PENCE),
        labourPctLabel: formatPct(
          ((scheduledHours * DEMO_BLENDED_RATE_PENCE) / DEMO_FORECAST_SALES_PENCE) * 100,
        ),
        targetPctLabel: `${DEMO_LABOUR_TARGET_PCT}%`,
        statusTone: scheduledHours <= contractedHours ? ("ok" as const) : ("warning" as const),
        statusLabel: scheduledHours <= contractedHours ? "Within budget" : "Over budget",
        hint: null,
      };

  const budgetRatio = view.budgetHours > 0 ? scheduledHours / view.budgetHours : 0;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Labour summary</span>
          <span
            className="badge"
            title={
              isLiveEstimate
                ? "Cost estimate from your labour targets and staff rates. Hours and coverage are live."
                : "Demo figures. Scheduled hours and coverage reflect the grid."
            }
          >
            {isLiveEstimate ? "Estimate" : "Demo figures"}
          </span>
        </div>
        <IconButton
          icon={Settings}
          label="Edit labour targets in Settings"
          size="sm"
          variant="ghost"
          onClick={() => navigate({ to: "/settings", search: { tab: "rota" } })}
        />
      </div>

      <div className="flex items-center gap-3">
        <div>
          <div className="font-display text-[22px] font-semibold leading-tight tracking-tight tabular-nums">
            {Math.round(scheduledHours)}h
          </div>
          <div className="text-[11px] text-muted-foreground">
            of {Math.round(view.budgetHours)}h{" "}
            {view.budgetSource === "budget" ? "weekly budget" : "contracted hours"}
          </div>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div
            className={`font-display text-[22px] font-semibold leading-tight tracking-tight tabular-nums ${TONE_TEXT[view.statusTone]}`}
          >
            {view.labourPctLabel ?? "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {view.targetPctLabel ? `vs ${view.targetPctLabel} target` : "labour % target unset"}
          </div>
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${TONE_BAR[view.statusTone]}`}
          style={{ width: `${Math.min(100, budgetRatio * 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className={`font-semibold ${TONE_TEXT[view.statusTone]}`}>{view.statusLabel}</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {view.estCostLabel ? `${view.estCostLabel} est. cost` : "no cost estimate"}
        </span>
      </div>

      {view.hint && (
        <Link
          to="/settings"
          className="mt-3 flex items-start gap-1.5 border-t border-border/60 pt-2.5 text-left text-[11px] leading-snug text-brand hover:underline"
        >
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>{view.hint}</span>
        </Link>
      )}

      <ActionButton
        variant="ghost"
        size="sm"
        className="mt-2 px-0 text-xs font-semibold text-brand"
        onClick={onViewCoverageDetails}
      >
        View shift assignment
      </ActionButton>
    </Card>
  );
}
