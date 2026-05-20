import { Link } from "@tanstack/react-router";
import { Calendar, ArrowRight } from "lucide-react";
import { Card } from "@/components/dl";

// Next rota: week of Mon 25 May 2026. Due by Fri 22 May 12:00 (2 days from Wed 20 May).
export function DashboardRotaPublish() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-4 pt-5">
        <div className="dock-section-eyebrow">Upcoming rota publish</div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Week commencing</div>
            <div className="text-[22px] font-semibold tracking-tight">25 May 2026</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs text-muted-foreground">Rota due by</div>
          <div className="text-[15px] font-semibold">Fri, 22 May 12:00</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 bg-brand" />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">2 days remaining</div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-3">
        <Link
          to="/rota"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          Go to Rota <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
