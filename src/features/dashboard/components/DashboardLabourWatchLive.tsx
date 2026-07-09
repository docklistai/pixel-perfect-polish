import { Link } from "@tanstack/react-router";
import { ArrowRight, PiggyBank } from "lucide-react";
import { Card } from "@/components/dl";
import { estimateLabourCost } from "@/features/rota/lib/labourCost";
import { formatMoneyPence } from "@/features/rota/lib/labourSummaryView";
import { totalScheduledHours } from "@/features/rota/lib/rotaSummaries";
import { useWorkspaceLabourSettings } from "@/features/settings/hooks/useWorkspaceLabourSettings";
import { useStaffPayRates } from "@/features/staff/hooks/useStaffPayRates";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { DraftShift } from "@/features/rota/types";
import { DashboardLabourWatch } from "./DashboardLabourWatch";

/**
 * Live wrapper for the labour watch card. Demo workspaces keep the sample
 * figures; live workspaces get a real estimate from this week's draft, staff
 * rates, and saved labour targets — or an honest setup nudge instead of
 * fabricated numbers.
 */
export function DashboardLabourWatchLive({
  source,
  weekShifts,
}: {
  source: "live" | "demo";
  weekShifts: DraftShift[];
}) {
  const settings = useWorkspaceLabourSettings();
  const payRates = useStaffPayRates();

  if (source !== "live") {
    return (
      <DashboardLabourWatch
        labourCost={`£${DEMO_WORLD.labour.labourCost.toLocaleString("en-GB")}`}
        projectedSales={`£${DEMO_WORLD.labour.projectedSales.toLocaleString("en-GB")}`}
        labourPct={DEMO_WORLD.labour.labourPercent}
        sample
      />
    );
  }

  const labour = estimateLabourCost({
    shifts: weekShifts,
    scheduledHours: totalScheduledHours(weekShifts),
    rates: payRates.rates,
    settings: settings.settings,
  });
  const forecast = settings.settings?.forecastWeeklySalesPence ?? null;
  const target = labour.targetLabourPct;

  if (labour.estCostPence === null || forecast === null || forecast === 0 || target === null) {
    return (
      <Card className="flex flex-col justify-between p-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="dock-section-eyebrow">Labour watch</div>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <PiggyBank className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">
              Set a sales forecast, labour % target, and hourly cost to watch this week&apos;s
              labour spend against your plan.
            </p>
          </div>
        </div>
        <Link
          to="/settings"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          Set labour targets <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </Card>
    );
  }

  return (
    <DashboardLabourWatch
      labourCost={formatMoneyPence(labour.estCostPence)}
      projectedSales={formatMoneyPence(forecast)}
      labourPct={labour.labourPct ?? 0}
      targetPct={target}
    />
  );
}
