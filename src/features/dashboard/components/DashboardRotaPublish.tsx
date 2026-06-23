import { Link, useNavigate } from "@tanstack/react-router";
import { Calendar, Send } from "lucide-react";
import { Card } from "@/components/dl";
import { useIntents } from "@/lib/interactionIntents";
import { getNextPublishWeekLabel } from "../lib/nextPublishWeek";

// Targets the upcoming rota week, derived from the shared week helper.
export function DashboardRotaPublish() {
  const navigate = useNavigate();
  const { requestIntent } = useIntents();
  const weekCommencing = getNextPublishWeekLabel();
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="dock-section-eyebrow">Next publish</div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
            <Calendar className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Week commencing</div>
            <div className="text-[22px] font-semibold tracking-tight">{weekCommencing}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Next week's rota</span>
            <span className="font-semibold text-warning">Not yet published</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        <Link
          to="/rota"
          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-center text-xs font-semibold transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Open rota
        </Link>
        <button
          type="button"
          onClick={() => {
            navigate({ to: "/rota" });
            requestIntent("rota.publish");
          }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Send className="h-3 w-3" aria-hidden />
          Review & publish
        </button>
      </div>
    </Card>
  );
}
