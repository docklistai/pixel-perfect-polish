import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { DashboardCard } from "@/components/dl";
import { addIsoDays, dateIsoInTimezone } from "@/features/rota/lib/liveRotaDates";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchPortalOwnPayRate } from "../api/portalPayData";
import { estimatePortalPay, formatEstimateAmount } from "../lib/portalPayEstimate";
import { usePortalTimezone } from "../hooks/usePortalTimezone";
import type { PortalShift } from "../types";

const portalRouteApi = getRouteApi("/portal");

/**
 * Rough next-7-days pay estimate for the signed-in staff member. Renders
 * nothing unless a live staff session exists AND a manager has recorded an
 * hourly rate — no fabricated figures, no demo variant.
 */
export function PortalPayEstimateCard({ upcoming }: { upcoming: PortalShift[] }) {
  const { auth } = portalRouteApi.useRouteContext();
  const timezone = usePortalTimezone();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const rateQuery = useQuery({
    queryKey: ["portal", "own-pay-rate", workspaceId, staffMemberId],
    queryFn: () => fetchPortalOwnPayRate(workspaceId!, staffMemberId!),
    enabled,
    staleTime: 300_000,
  });

  const rate = rateQuery.data ?? null;
  if (!enabled || !timezone || rate === null) return null;

  const today = dateIsoInTimezone(new Date(), timezone);
  const estimate = estimatePortalPay(upcoming, rate, today, addIsoDays(today, 6));
  if (estimate.shiftCount === 0) return null;

  return (
    <DashboardCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
          <Coins className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tabular-nums">
            ≈ {formatEstimateAmount(estimate.amountPence)} next 7 days
          </div>
          <div className="text-xs text-muted-foreground">
            {estimate.shiftCount} shift{estimate.shiftCount === 1 ? "" : "s"} ·{" "}
            {Math.round(estimate.hours * 10) / 10}h paid · estimate before tax
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
