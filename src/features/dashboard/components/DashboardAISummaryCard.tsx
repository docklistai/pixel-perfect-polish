import { Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

interface Props {
  onDismiss: () => void;
}

export function DashboardAISummaryCard({ onDismiss }: Props) {
  return (
    <div className="relative rounded-xl border border-brand/20 bg-brand-soft/30 px-4 py-4 dark:bg-brand-soft/20">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">3 things worth your attention today</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Friday has 2 open shifts — fill them before 16:00 to publish on time. Last week&apos;s
            timesheets need approval before Friday&apos;s payroll run. Saturday Bar is your busiest
            session this week.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                toast.info("AI manager review", {
                  description: "Manager review assistant is on the roadmap.",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              Open assistant
            </button>
            <Link
              to="/rota"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-semibold transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Open rota
            </Link>
            <Link
              to="/time"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-semibold transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Review timesheets
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss AI summary"
          className="rounded-md p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
