import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarClock, CheckCircle2, Clock, Info } from "lucide-react";
import { Card } from "@/components/dl";
import { buildScheduledVsWorkedSummary } from "../lib/reportsPresentation";
import type { ReportsPageData } from "../types";

export function ReportsScheduledVsWorkedCard({ data }: { data: ReportsPageData }) {
  const summary = buildScheduledVsWorkedSummary(data);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <div className="text-sm font-semibold">Scheduled versus approved worked hours</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Factual comparison between published rotas and approved timesheets for this period.
          </p>
        </div>
        <Link
          to="/time"
          search={{ start: data.meta.periodStart }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Manage timesheets
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {!summary.hasPublishedWeek ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
            <div className="text-xs text-muted-foreground leading-relaxed">
              No published rotas exist in this period. Published scheduled hours and approved worked
              hours appear once a rota week has been published.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4 text-brand" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider">
                Published scheduled
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-display tracking-tight">
              {summary.scheduledHours}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">From published rota snapshots only</p>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider">Approved worked</span>
            </div>
            <div className="mt-2 text-2xl font-bold font-display tracking-tight">
              {summary.approvedWorkedHours}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.approvedEntriesCount} approved time{" "}
              {summary.approvedEntriesCount === 1 ? "entry" : "entries"}
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-warning" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider">Pending review</span>
            </div>
            <div className="mt-2 text-2xl font-bold font-display tracking-tight">
              {summary.awaitingReviewCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.awaitingReviewCount === 1
                ? "Timesheet awaiting review"
                : "Timesheets awaiting review"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
