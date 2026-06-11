import { Calendar, Clock, MapPin, MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { DashboardCard, StatusBadge } from "@/components/dl";
import { mockNotices, mockProfile } from "../data/mockPortalData";
import { portalPublishedNextShift } from "../data/publishedRotaPortalData";
import type { PortalTab } from "../types";

export function HomeTab({ onNavigate }: { onNavigate: (tab: PortalTab) => void }) {
  const nextShift = portalPublishedNextShift;

  return (
    <div className="space-y-4">
      {nextShift ? (
        <DashboardCard className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0B7A78_0%,#0EA5A2_100%)] text-white shadow-[0_20px_48px_-24px_rgba(14,165,162,.75)]">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-white/75 uppercase">
                Your next shift
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
                {nextShift.status === "changed" ? "Changed" : "Confirmed"}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-white/80">{nextShift.dayLabel}</div>
            <div className="mt-1 text-[30px] font-bold tracking-tight leading-none">
              {nextShift.start} – {nextShift.end}
            </div>
            <div className="mt-3 space-y-1 text-sm text-white/90">
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-white/75" /> {nextShift.role}
              </div>
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-white/75" /> {nextShift.station}
              </div>
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-white/20">
                <div className="h-full w-[32%] rounded-full bg-white" />
              </div>
              <span className="text-[11px] font-medium text-white/80">Published rota</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("time")}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-brand font-semibold shadow-[var(--shadow-card)] hover:bg-white/95"
            >
              <Clock className="h-4 w-4" />
              Clock in
            </button>
            <button
              type="button"
              onClick={() => onNavigate("shifts")}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-white/85 hover:text-white"
            >
              View published rota <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </DashboardCard>
      ) : (
        <DashboardCard className="p-5">
          <div className="text-sm font-semibold">No published rota yet.</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Once your manager publishes the rota, your next shift will appear here.
          </p>
        </DashboardCard>
      )}

      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            This week
          </div>
          <button
            type="button"
            onClick={() => onNavigate("shifts")}
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            View rota
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
            const active = i < 5;
            const day = [8, 9, 10, 11, 12, 13, 14][i];
            return (
              <div
                key={day}
                className={`rounded-2xl border px-0 py-3 text-center ${active ? "border-brand/20 bg-brand-soft/70" : "border-border bg-muted/60"}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {d}
                </div>
                <div className={`mt-1 text-sm font-semibold ${active ? "text-brand" : ""}`}>
                  {day}
                </div>
                {active && <div className="mx-auto mt-2 h-1.5 w-1.5 rounded-full bg-brand" />}
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Latest from your team
          </div>
          <button
            type="button"
            onClick={() => onNavigate("more")}
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            See all
          </button>
        </div>
        <DashboardCard className="p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent-purple-soft text-accent-purple flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Summer menu launches Monday</div>
              <div className="text-[11px] text-muted-foreground">From Alex · needs ack</div>
            </div>
            <StatusBadge tone="warning">New</StatusBadge>
          </div>
        </DashboardCard>
        <DashboardCard className="p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-warning-soft text-warning flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Food safety refresher due</div>
              <div className="text-[11px] text-muted-foreground">By 21 Jun</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </DashboardCard>
      </div>

      <div className="space-y-2">
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Quick actions
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              title: "Request leave",
              description: "Book holiday",
              icon: Calendar,
              tone: "purple",
              tab: "leave" as PortalTab,
            },
            {
              title: "View shifts",
              description: "Upcoming rota",
              icon: Sparkles,
              tone: "info",
              tab: "shifts" as PortalTab,
            },
            {
              title: "Contact manager",
              description: mockProfile.manager.name,
              icon: MessageSquare,
              tone: "success",
              tab: "more" as PortalTab,
            },
          ].map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => onNavigate(action.tab)}
              className="flex min-h-[102px] flex-col items-start gap-2 rounded-2xl border border-border bg-card p-3 text-left shadow-[var(--shadow-card)] hover:bg-muted/40"
            >
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                  action.tone === "purple"
                    ? "bg-accent-purple-soft text-accent-purple"
                    : action.tone === "success"
                      ? "bg-success-soft text-success"
                      : "bg-info-soft text-info"
                }`}
              >
                <action.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold leading-tight">{action.title}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">
                {action.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
