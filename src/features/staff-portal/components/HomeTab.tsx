import { Calendar, CalendarDays, Clock, MapPin, MessageSquare } from "lucide-react";
import { DashboardCard, StatusBadge } from "@/components/dl";
import { usePortalRota } from "../hooks/usePortalRota";
import { usePortalProfile } from "../hooks/usePortalProfile";
import { noUpcomingShiftsCopy } from "../lib/portalShiftCopy";
import type { PortalTab } from "../types";

export function HomeTab({ onNavigate }: { onNavigate: (tab: PortalTab) => void }) {
  const { hasPublished, nextShift, upcoming, weekDays } = usePortalRota();
  const { data: profile } = usePortalProfile();
  const publishedDates = new Set(upcoming.map((shift) => shift.date));
  const emptyCopy = noUpcomingShiftsCopy(hasPublished);

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
            <div className="mt-4 text-[11px] font-medium text-white/80">
              From your published rota
            </div>
            <button
              type="button"
              onClick={() => onNavigate("shifts")}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-brand font-semibold shadow-[var(--shadow-card)] hover:bg-white/95"
            >
              <Clock className="h-4 w-4" />
              View shift details
            </button>
          </div>
        </DashboardCard>
      ) : (
        <DashboardCard className="p-5">
          <div className="text-sm font-semibold">{emptyCopy.title}</div>
          <p className="mt-1 text-xs text-muted-foreground">{emptyCopy.description}</p>
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
          {weekDays.map((day) => {
            const active = publishedDates.has(day.iso);
            return (
              <div
                key={day.iso}
                className={`rounded-2xl border px-0 py-3 text-center ${active ? "border-brand/20 bg-brand-soft/70" : "border-border bg-muted/60"}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {day.letter}
                </div>
                <div className={`mt-1 text-sm font-semibold ${active ? "text-brand" : ""}`}>
                  {day.dayNum}
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
        </div>
        <DashboardCard className="p-5 text-center">
          <div className="text-sm font-semibold">Nothing here yet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Team announcements and documents will appear here.
          </p>
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
              icon: CalendarDays,
              tone: "info",
              tab: "shifts" as PortalTab,
            },
            {
              title: "Contact manager",
              description: profile?.manager.name ?? "Manager",
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
