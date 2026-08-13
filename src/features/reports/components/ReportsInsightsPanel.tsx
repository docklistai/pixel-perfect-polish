import { CheckCircle2, Clock3, Lightbulb, Plane, TriangleAlert } from "lucide-react";
import { Card } from "@/components/dl";
import { buildReviewPoints } from "../lib/reportsPresentation";
import type { ReportsDetailKey, ReportsPageData, ReportsTone } from "../types";

const ICONS = {
  coverage: TriangleAlert,
  leave: Plane,
  time: Clock3,
  contracts: TriangleAlert,
  published: CheckCircle2,
};
const TONES: Record<ReportsTone, string> = {
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

export function ReportsInsightsPanel({
  data,
  onOpenDetail,
}: {
  data: ReportsPageData;
  onOpenDetail: (detail: ReportsDetailKey) => void;
}) {
  const points = buildReviewPoints(data);
  return (
    <Card className="p-4 lg:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="size-4 text-warning" aria-hidden />
        <span className="text-sm font-semibold">Manager review points</span>
      </div>
      {points.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl bg-success-soft/40 p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <div>
            <div className="text-sm font-medium">No current review points</div>
            <div className="text-xs text-muted-foreground">
              No open published work, leave impact, pending time review, or current-week contract
              comparison is flagged.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {points.map((point) => {
            const Icon = ICONS[point.detail];
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => onOpenDetail(point.detail)}
                className="flex w-full gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${TONES[point.tone]}`}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{point.title}</span>
                  <span className="block text-xs text-muted-foreground">{point.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        Exact operational facts · manager decides what to action
      </div>
    </Card>
  );
}
